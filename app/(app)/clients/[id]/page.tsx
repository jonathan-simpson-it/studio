'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getClientDetail } from '@/lib/db/actions/details';
import { updateClient, deleteClient } from '@/lib/db/actions/clients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate, formatCurrency } from '@/lib/utils';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Client, Project, Invoice, Proposal, Note, FileRecord, ActivityLog } from '@/types';

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => { load(); }, [params]);

  async function load() {
    const { id } = await params;

    const detail = await getClientDetail(id);
    if (!detail) return;

    setClient(detail);
    if (detail.projects) setProjects(detail.projects);
    if (detail.invoices) setInvoices(detail.invoices);
    if (detail.proposals) setProposals(detail.proposals);
    if (detail.notes) setNotes(detail.notes);
    if (detail.files) setFiles(detail.files);
    if (detail.activity) setActivities(detail.activity);
  }

  async function handleSave(field: string, value: unknown) {
    if (!client) return;
    try {
      await updateClient(client.id, { [field]: value });
      setClient({ ...client, [field]: value } as Client);
      toast.success('Client updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    }
  }

  async function handleDelete() {
    if (!client) return;
    try {
      await deleteClient(client.id);
      toast.success('Client deleted');
      router.push('/clients');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  if (!client) return null;

  return (
    <div className="max-w-4xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/clients')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">{client.company_name}</h2>
          <p className="text-sm text-muted-foreground mt-1">{client.contact_name}</p>
        </div>
        <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 grid grid-cols-2 gap-6 text-sm">
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input
              value={client.company_name || ''}
              onChange={(e) => handleSave('company_name', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Contact Name</Label>
            <Input
              value={client.contact_name || ''}
              onChange={(e) => handleSave('contact_name', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={client.email || ''}
              onChange={(e) => handleSave('email', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={client.phone || ''}
              onChange={(e) => handleSave('phone', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select
              value={client.currency_preference}
              onValueChange={(v) => handleSave('currency_preference', v)}
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
            <Label>Joined</Label>
            <p className="pt-1.5 text-muted-foreground">{formatDate(client.created_at)}</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="projects" className="w-full">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="projects">
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Billing</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id} className="border-b text-sm cursor-pointer hover:bg-accent/50" onClick={() => router.push(`/projects/${p.id}`)}>
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3 text-muted-foreground">{p.billing_type || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Number</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Issued</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b text-sm" onClick={() => router.push(`/invoices/${inv.id}`)}>
                      <td className="px-4 py-3 font-medium">{inv.invoice_number}</td>
                      <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                      <td className="px-4 py-3">{formatCurrency(inv.total, inv.currency)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{inv.issue_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proposals"><ProposalsList proposals={proposals} /></TabsContent>
        <TabsContent value="notes"><NotesList notes={notes} /></TabsContent>
        <TabsContent value="files"><FilesList files={files} /></TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardContent className="p-6">
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No activity</p>
              ) : (
                <div className="space-y-3">
                  {activities.map((a) => (
                    <div key={a.id} className="flex items-start gap-3 text-sm">
                      <span className="text-muted-foreground">{a.action.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(a.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        entityName={client.company_name}
        entityType="Client"
        onConfirm={handleDelete}
      />
    </div>
  );
}

function ProposalsList({ proposals }: { proposals: Proposal[] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Number</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {proposals.map((p) => (
              <tr key={p.id} className="border-b text-sm">
                <td className="px-4 py-3 font-medium">{p.proposal_number}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3">{formatCurrency(p.total, p.currency)}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(p.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function NotesList({ notes }: { notes: Note[] }) {
  return (
    <Card>
      <CardContent className="p-6">
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No notes</p>
        ) : (
          <div className="space-y-3">
            {notes.map((n) => (
              <div key={n.id} className="rounded-md border p-3">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatDate(n.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FilesList({ files }: { files: FileRecord[] }) {
  return (
    <Card>
      <CardContent className="p-6">
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No files</p>
        ) : (
          <div className="space-y-2">
            {files.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>{f.name}</span>
                <span className="text-xs text-muted-foreground">{f.mime_type}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
