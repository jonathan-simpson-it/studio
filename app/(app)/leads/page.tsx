'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listLeads, createLead, updateLeadStage, getLeadsWithHeatScores, deleteLead } from '@/lib/db/actions/leads';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog';
import {
  LayoutGrid,
  Table2,
  Plus,
  Search,
  GripVertical,
  User,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { HeatScore } from '@/components/shared/HeatScore';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { calculateHeatScore } from '@/lib/heat-score';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import type { Lead, Proposal } from '@/types';

const stages = ['New', 'Contacted', 'Discovery', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];

export default function LeadsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: getLeadsWithHeatScores,
  });
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [search, setSearch] = useState('');
  const [showNewSheet, setShowNewSheet] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);

  const proposalsMap = useMemo(() => {
    const pmap: Record<string, Proposal | null> = {};
    for (const lead of leads) {
      if (lead.stage === 'Proposal Sent') {
        pmap[lead.id] = null;
      }
    }
    return pmap;
  }, [leads]);

  async function handleStageChange(leadId: string, newStage: string) {
    try {
      await updateLeadStage(leadId, newStage);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update stage');
      return;
    }

    queryClient.setQueryData<Lead[]>(['leads'], (prev) =>
      (prev ?? []).map((l) =>
        l.id === leadId ? { ...l, stage: newStage as Lead['stage'], stage_changed_at: new Date().toISOString() } : l
      )
    );
    toast.success('Lead stage updated');
  }

  async function handleDelete(lead: Lead) {
    try {
      await deleteLead(lead.id);
      toast.success('Lead deleted');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete lead');
    }
  }

  const filtered = leads.filter(
    (l) =>
      l.company_name.toLowerCase().includes(search.toLowerCase()) ||
      l.contact_name.toLowerCase().includes(search.toLowerCase())
  );

  const leadsByStage = stages.reduce(
    (acc, stage) => {
      acc[stage] = filtered.filter((l) => l.stage === stage);
      return acc;
    },
    {} as Record<string, Lead[]>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 pl-9"
            />
          </div>
          <div className="flex items-center rounded-lg border p-0.5">
            <Button
              variant={view === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('kanban')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('table')}
            >
              <Table2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Sheet open={showNewSheet} onOpenChange={setShowNewSheet}>
          <SheetTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Lead
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>New Lead</SheetTitle>
            </SheetHeader>
            <LeadForm
              onSubmit={async (data) => {
                try {
                  await createLead(data as Record<string, unknown>);
                  toast.success('Lead created');
                  setShowNewSheet(false);
                  queryClient.invalidateQueries({ queryKey: ['leads'] });
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Failed to create lead');
                }
              }}
            />
          </SheetContent>
        </Sheet>
      </div>

      {view === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <div key={stage} className="min-w-[240px] flex-shrink-0">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium">{stage}</h3>
                <Badge variant="secondary" className="text-[10px]">
                  {leadsByStage[stage].length}
                </Badge>
              </div>
              <div className="space-y-2">
                {leadsByStage[stage].map((lead) => {
                  const heatScore = calculateHeatScore(lead, proposalsMap[lead.id]);
                  return (
                    <Card
                      key={lead.id}
                      className="cursor-pointer transition-colors hover:bg-accent/50"
                      onClick={() => router.push(`/leads/${lead.id}`)}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium">{lead.company_name}</p>
                            <p className="text-xs text-muted-foreground">{lead.contact_name}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <HeatScore score={heatScore} />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(lead)}>
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {lead.estimated_value > 0
                              ? formatCurrency(lead.estimated_value, lead.currency)
                              : '—'}
                          </span>
                          <span>{lead.last_contacted_at ? formatDate(lead.last_contacted_at) : 'New'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={lead.stage} />
                          {lead.source && <span className="text-[10px] text-muted-foreground">{lead.source}</span>}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Value</th>
                  <th className="px-4 py-3 font-medium">Stage</th>
                  <th className="px-4 py-3 font-medium">Heat</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 w-10"></th>
                  <th className="px-4 py-3 font-medium">Last Contact</th>
                  <th className="px-4 py-3 font-medium">Next Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b text-sm transition-colors hover:bg-accent/50 cursor-pointer"
                    onClick={() => router.push(`/leads/${lead.id}`)}
                  >
                    <td className="px-4 py-3 font-medium">{lead.company_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.contact_name}</td>
                    <td className="px-4 py-3">
                      {lead.estimated_value > 0 ? formatCurrency(lead.estimated_value, lead.currency) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lead.stage} />
                    </td>
                    <td className="px-4 py-3">
                      <HeatScore score={calculateHeatScore(lead, proposalsMap[lead.id])} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.source || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {lead.last_contacted_at ? formatDate(lead.last_contacted_at) : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.next_action || '—'}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(lead)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        entityName={deleteTarget?.company_name || ''}
        entityType="Lead"
        onConfirm={() => deleteTarget ? handleDelete(deleteTarget) : Promise.resolve()}
      />
    </div>
  );
}

function LeadForm({ onSubmit }: { onSubmit: (data: Partial<Lead>) => Promise<void> }) {
  const [form, setForm] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    source: 'Inbound',
    estimated_value: 0,
    currency: 'HKD',
    stage: 'New' as const,
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form as Partial<Lead>);
      }}
      className="space-y-4 pt-4"
    >
      <div className="space-y-2">
        <Label>Company Name</Label>
        <Input
          value={form.company_name}
          onChange={(e) => setForm({ ...form, company_name: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Contact Name</Label>
        <Input
          value={form.contact_name}
          onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Phone</Label>
        <Input
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Source</Label>
          <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
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
          <Label>Currency</Label>
          <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
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
      </div>
      <div className="space-y-2">
        <Label>Estimated Value</Label>
        <Input
          type="number"
          value={form.estimated_value || ''}
          onChange={(e) => setForm({ ...form, estimated_value: parseFloat(e.target.value) || 0 })}
        />
      </div>
      <Button type="submit" className="w-full">Create Lead</Button>
    </form>
  );
}
