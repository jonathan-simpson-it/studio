'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getLeadDetail, createActivityLog } from '@/lib/db/actions/details';
import { updateLeadStage } from '@/lib/db/actions/leads';
import { createClient as createDbClient, getClient } from '@/lib/db/actions/clients';
import { createProject } from '@/lib/db/actions/projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { HeatScore } from '@/components/shared/HeatScore';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ActivityTimeline } from '@/components/shared/ActivityTimeline';
import { calculateHeatScore } from '@/lib/heat-score';
import { formatDate, formatCurrency } from '@/lib/utils';
import { ArrowLeft, ExternalLink, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { AIGenerateButton } from '@/components/shared/AIGenerateButton';
import type { Lead, Proposal, ActivityLog } from '@/types';

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [showConvert, setShowConvert] = useState(false);
  const [convertProjectName, setConvertProjectName] = useState('');
  const [convertBillingType, setConvertBillingType] = useState('One-off');

  useEffect(() => {
    load();
  }, [params]);

  async function load() {
    const { id } = await params;

    const detail = await getLeadDetail(id);
    if (detail) {
      setLead(detail);
      setConvertProjectName(`${detail.company_name} — Project`);

      if (detail.proposals?.[0]) setProposal(detail.proposals[0]);
    }

    if (detail?.activity) setActivities(detail.activity);
  }

  async function handleSave(field: string, value: unknown) {
    if (!lead) return;

    const updates: Record<string, unknown> = { [field]: value, updated_at: new Date().toISOString() };
    if (field === 'stage') {
      updates.stage_changed_at = new Date().toISOString();
      try {
        await updateLeadStage(lead.id, value as string);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update stage');
        return;
      }
    } else {
      try {
        const { listLeads } = await import('@/lib/db/actions/leads');
        toast.success('Lead updated');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update');
        return;
      }
    }

    setLead({ ...lead, ...updates } as Lead);
    toast.success('Lead updated');
  }

  async function handleConvert() {
    if (!lead || lead.stage !== 'Won') return;

    const userId = session?.user?.id
    if (!userId) return;

    try {
      const client = await createDbClient({
        company_name: lead.company_name,
        contact_name: lead.contact_name,
        email: lead.email,
        phone: lead.phone,
        source_lead_id: lead.id,
        currency_preference: lead.currency,
      });

      if (!client) {
        toast.error('Failed to create client');
        return;
      }

      const project = await createProject({
        name: convertProjectName || `${lead.company_name} — Project`,
        client_id: client.id,
        billing_type: convertBillingType,
        status: 'Planning',
        owner_id: userId,
        currency: lead.currency,
        source_lead_id: lead.id,
      });

      if (!project) {
        toast.error('Failed to create project');
        return;
      }

      await updateLeadStage(lead.id, 'Won');

      await createActivityLog({
        entity_type: 'lead',
        entity_id: lead.id,
        action: 'converted',
        actor_id: userId,
        meta: { client_id: client.id, project_id: project.id, lead_id: lead.id },
      });

      toast.success('Lead converted to client');
      setShowConvert(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Conversion failed');
    }
  }

  if (!lead) return null;

  const heatScore = calculateHeatScore(lead, proposal);

  return (
    <div className="max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/leads')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">{lead.company_name}</h2>
            <HeatScore score={heatScore} size="lg" />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{lead.contact_name}</p>
        </div>

        {lead.stage === 'Won' && !lead.converted_at && (
          <Button onClick={() => setShowConvert(true)}>
            <ExternalLink className="mr-2 h-4 w-4" /> Convert to Client
          </Button>
        )}
        <AIGenerateButton
          action="draft-email"
          context={{ contact_name: lead.contact_name, company_name: lead.company_name }}
          onResult={(content) => {
            navigator.clipboard.writeText(content);
            toast.success('Email draft copied to clipboard');
          }}
          label="Draft email"
        />
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Stage</Label>
              <Select
                value={lead.stage}
                onValueChange={(v) => handleSave('stage', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['New', 'Contacted', 'Discovery', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select
                value={lead.source || 'Inbound'}
                onValueChange={(v) => handleSave('source', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['Referral', 'Inbound', 'Cold', 'Event', 'Other'].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={lead.email || ''}
                onChange={(e) => handleSave('email', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={lead.phone || ''}
                onChange={(e) => handleSave('phone', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Estimated Value</Label>
              <Input
                type="number"
                value={lead.estimated_value || ''}
                onChange={(e) => handleSave('estimated_value', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={lead.currency}
                onValueChange={(v) => handleSave('currency', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['HKD', 'GBP', 'IDR'].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Last Contacted</Label>
              <Input
                type="date"
                value={lead.last_contacted_at?.split('T')[0] || ''}
                onChange={(e) =>
                  handleSave('last_contacted_at', e.target.value ? new Date(e.target.value).toISOString() : null)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Next Action</Label>
              <Input
                value={lead.next_action || ''}
                onChange={(e) => handleSave('next_action', e.target.value)}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Notes</Label>
            <textarea
              className="w-full rounded-md border bg-transparent p-3 text-sm"
              rows={4}
              value={lead.notes || ''}
              onChange={(e) => handleSave('notes', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-medium mb-4">Activity Timeline</h3>
          <ActivityTimeline activities={activities} />
        </CardContent>
      </Card>

      <Dialog open={showConvert} onOpenChange={setShowConvert}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Client</DialogTitle>
            <DialogDescription>
              This will create a new client record and project for {lead.company_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input
                value={convertProjectName}
                onChange={(e) => setConvertProjectName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Billing Type</Label>
              <Select value={convertBillingType} onValueChange={setConvertBillingType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['One-off', 'Retainer', 'Milestone', 'Support'].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvert(false)}>Cancel</Button>
            <Button onClick={handleConvert}>Confirm & Convert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
