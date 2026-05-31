'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createLead, updateLeadStage, getLeadsWithHeatScores, deleteLead } from '@/lib/db/actions/leads';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { HeatScore } from '@/components/shared/HeatScore';
import { KanbanBoard } from '@/components/shared/KanbanBoard';
import { BoardToolbar } from '@/components/shared/BoardToolbar';
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
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  Plus,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Lead } from '@/types';

const stages = ['New', 'Contacted', 'Proposal Sent', 'Won', 'Lost'];

const columnColors: Record<string, string> = {
  New: 'bg-blue-500',
  Contacted: 'bg-zinc-500',
  'Proposal Sent': 'bg-purple-500',
  Won: 'bg-emerald-500',
  Lost: 'bg-red-500',
};

const legacyStageMap: Record<string, string> = {
  Discovery: 'Proposal Sent',
  Negotiation: 'Proposal Sent',
};

function mapStage(stage: string): string {
  return legacyStageMap[stage] || stage;
}

function LeadCardContent({ lead }: { lead: Lead }) {
  const router = useRouter();

  return (
    <Card
      className="transition-colors hover:bg-accent/50 cursor-pointer"
      onClick={() => router.push(`/leads/${lead.id}`)}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium">{lead.company_name}</p>
            <p className="text-xs text-muted-foreground">{lead.contact_name}</p>
          </div>
          <HeatScore score={lead.heat_score || 0} />
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
          {lead.stage === 'Won' && lead.converted_at && (
            <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-500 font-medium">
              ✓ Client
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LeadTable({ leads, onDelete }: { leads: Lead[]; onDelete: (lead: Lead) => void }) {
  const router = useRouter();

  return (
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
            {leads.map((lead) => (
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
                  <HeatScore score={lead.heat_score || 0} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{lead.source || '—'}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="text-destructive" onClick={() => onDelete(lead)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {lead.last_contacted_at ? formatDate(lead.last_contacted_at) : '—'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{lead.next_action || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: getLeadsWithHeatScores,
  });
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [filterStage, setFilterStage] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [showNewSheet, setShowNewSheet] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);

  const filtered = leads.filter((l) => {
    if (filterStage && filterStage !== '_all' && mapStage(l.stage) !== filterStage) return false;
    if (filterSource && filterSource !== '_all' && l.source !== filterSource) return false;
    return (
      l.company_name.toLowerCase().includes(search.toLowerCase()) ||
      l.contact_name.toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleStatusChange = useCallback(
    async (leadId: string, newStage: string) => {
      queryClient.setQueryData<Lead[]>(['leads'], (prev) =>
        (prev ?? []).map((l) =>
          l.id === leadId ? { ...l, stage: newStage as Lead['stage'], stage_changed_at: new Date().toISOString() } : l
        )
      );
      try {
        await updateLeadStage(leadId, newStage);
        if (newStage === 'Won') {
          toast.success('Lead marked as Won. Open the detail to convert to client.');
        } else {
          toast.success(`Lead moved to ${newStage}`);
        }
      } catch (err) {
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        toast.error(err instanceof Error ? err.message : 'Failed to update stage');
      }
    },
    [queryClient]
  );

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

  const sources = [...new Set(leads.map((l) => l.source).filter(Boolean))] as string[];

  return (
    <div className="space-y-6">
      <BoardToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search leads..."
        view={view}
        onViewChange={setView}
        filters={[
          {
            key: 'stage',
            label: 'Stage',
            placeholder: 'Stage',
            options: [
              { label: 'All', value: '_all' },
              { label: 'New', value: 'New' },
              { label: 'Contacted', value: 'Contacted' },
              { label: 'Proposal Sent', value: 'Proposal Sent' },
              { label: 'Won', value: 'Won' },
              { label: 'Lost', value: 'Lost' },
            ],
            value: filterStage,
            onChange: setFilterStage,
          },
          {
            key: 'source',
            label: 'Source',
            placeholder: 'Source',
            options: [
              { label: 'All', value: '_all' },
              ...sources.map((s) => ({ label: s, value: s })),
            ],
            value: filterSource,
            onChange: setFilterSource,
          },
        ]}
        createButton={
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
        }
      />

      {view === 'kanban' ? (
        <KanbanBoard
          columns={stages}
          items={filtered}
          getItemId={(l) => l.id}
          getItemStatus={(l) => mapStage(l.stage)}
          onStatusChange={handleStatusChange}
          renderCard={(lead) => <LeadCardContent lead={lead} />}
          columnColors={columnColors}
          emptyMessage="No leads"
        />
      ) : (
        <LeadTable leads={filtered} onDelete={(lead) => setDeleteTarget(lead)} />
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
    stage: 'New',
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
