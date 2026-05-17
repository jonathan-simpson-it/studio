'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getClientDetail } from '@/lib/db/actions/details';
import { updateClient, deleteClient } from '@/lib/db/actions/clients';
import { createProject } from '@/lib/db/actions/projects';
import { createInvoice, createProposal } from '@/lib/db/actions/invoices';
import { createNote } from '@/lib/db/actions/notes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { MarkdownPreview } from '@/components/shared/MarkdownPreview';
import { formatDate, formatCurrency } from '@/lib/utils';
import { ArrowLeft, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { Client, Project, Invoice, Proposal, Note, FileRecord, ActivityLog } from '@/types';

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { id } = use(params);
  const [showDelete, setShowDelete] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [showNewProposal, setShowNewProposal] = useState(false);
  const [showNewNote, setShowNewNote] = useState(false);

  const { data: client } = useQuery({
    queryKey: ['client', id],
    queryFn: () => getClientDetail(id),
  });

  const projects = (client?.projects ?? []) as Project[];
  const invoices = (client?.invoices ?? []) as Invoice[];
  const proposals = (client?.proposals ?? []) as Proposal[];
  const notes = (client?.notes ?? []) as Note[];
  const files = (client?.files ?? []) as FileRecord[];
  const activities = (client?.activity ?? []) as ActivityLog[];

  async function handleSave(field: string, value: unknown) {
    if (!client) return;
    try {
      await updateClient(client.id, { [field]: value });
      queryClient.setQueryData(['client', id], { ...client, [field]: value } as Client);
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

  async function handleCreateProject(data: Record<string, unknown>) {
    if (!client) return;
    try {
      await createProject({ ...data, client_id: client.id });
      toast.success('Project created');
      setShowNewProject(false);
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create project');
    }
  }

  async function handleCreateInvoice(data: Record<string, unknown>) {
    if (!client) return;
    try {
      await createInvoice({ ...data, client_id: client.id });
      toast.success('Invoice created');
      setShowNewInvoice(false);
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create invoice');
    }
  }

  async function handleCreateProposal(data: Record<string, unknown>) {
    if (!client) return;
    try {
      await createProposal({ ...data, client_id: client.id });
      toast.success('Proposal created');
      setShowNewProposal(false);
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create proposal');
    }
  }

  async function handleCreateNote(note: string) {
    if (!client || !note.trim()) return;
    const userId = session?.user?.id;
    if (!userId) return;
    try {
      await createNote({
        title: note.slice(0, 60),
        body: note,
        client_id: client.id,
        author_id: userId,
      } as Record<string, unknown>);
      toast.success('Note created');
      setShowNewNote(false);
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create note');
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

        <TabsContent value="projects" className="space-y-4">
          <div className="flex justify-end">
            <Sheet open={showNewProject} onOpenChange={setShowNewProject}>
              <SheetTrigger asChild>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" /> New Project</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader><SheetTitle>New Project</SheetTitle><SheetDescription className="sr-only">Create a new project for this client</SheetDescription></SheetHeader>
                <ProjectForm onSubmit={handleCreateProject} />
              </SheetContent>
            </Sheet>
          </div>
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

        <TabsContent value="invoices" className="space-y-4">
          <div className="flex justify-end">
            <Sheet open={showNewInvoice} onOpenChange={setShowNewInvoice}>
              <SheetTrigger asChild>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" /> New Invoice</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader><SheetTitle>New Invoice</SheetTitle><SheetDescription className="sr-only">Create a new invoice for this client</SheetDescription></SheetHeader>
                <InvoiceForm onSubmit={handleCreateInvoice} />
              </SheetContent>
            </Sheet>
          </div>
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

        <TabsContent value="proposals" className="space-y-4">
          <div className="flex justify-end">
            <Sheet open={showNewProposal} onOpenChange={setShowNewProposal}>
              <SheetTrigger asChild>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" /> New Proposal</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader><SheetTitle>New Proposal</SheetTitle><SheetDescription className="sr-only">Create a new proposal for this client</SheetDescription></SheetHeader>
                <ProposalForm onSubmit={handleCreateProposal} />
              </SheetContent>
            </Sheet>
          </div>
          <ProposalsList proposals={proposals} />
        </TabsContent>
        <TabsContent value="notes" className="space-y-4">
          <div className="flex justify-end">
            <Sheet open={showNewNote} onOpenChange={setShowNewNote}>
              <SheetTrigger asChild>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" /> New Note</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader><SheetTitle>New Note</SheetTitle><SheetDescription className="sr-only">Create a new note for this client</SheetDescription></SheetHeader>
                <ClientNoteForm onSubmit={(body) => handleCreateNote(body)} />
              </SheetContent>
            </Sheet>
          </div>
          <NotesList notes={notes} />
        </TabsContent>
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
                {n.body && (
                  <MarkdownPreview value={n.body} className="max-h-16 overflow-hidden text-xs text-muted-foreground mt-1" />
                )}
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

function ProjectForm({ onSubmit }: { onSubmit: (data: Record<string, unknown>) => Promise<void> }) {
  const [form, setForm] = useState({ name: '', billing_type: 'One-off', budget: '' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, budget: form.budget ? parseFloat(form.budget) : null }); }} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Project Name</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label>Billing Type</Label>
        <Select value={form.billing_type} onValueChange={(v) => setForm({ ...form, billing_type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {['One-off', 'Retainer', 'Commission'].map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Budget</Label>
        <Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
      </div>
      <Button type="submit" className="w-full">Create Project</Button>
    </form>
  );
}

function InvoiceForm({ onSubmit }: { onSubmit: (data: Record<string, unknown>) => Promise<void> }) {
  const [form, setForm] = useState({ invoice_number: '', total: '', due_date: '', status: 'Draft' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, total: form.total ? parseFloat(form.total) : 0 }); }} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Invoice Number</Label>
        <Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label>Total</Label>
        <Input type="number" step="0.01" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Due Date</Label>
        <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {['Draft', 'Sent', 'Paid', 'Overdue'].map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full">Create Invoice</Button>
    </form>
  );
}

function ProposalForm({ onSubmit }: { onSubmit: (data: Record<string, unknown>) => Promise<void> }) {
  const [form, setForm] = useState({ proposal_number: '', total: '', status: 'Draft' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, total: form.total ? parseFloat(form.total) : 0 }); }} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Proposal Number</Label>
        <Input value={form.proposal_number} onChange={(e) => setForm({ ...form, proposal_number: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label>Total</Label>
        <Input type="number" step="0.01" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {['Draft', 'Sent', 'Accepted', 'Declined'].map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full">Create Proposal</Button>
    </form>
  );
}

function ClientNoteForm({ onSubmit }: { onSubmit: (body: string) => Promise<void> }) {
  const [body, setBody] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(body); setBody(''); }} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Note</Label>
        <textarea
          className="w-full rounded-md border bg-transparent p-3 text-sm"
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full">Create Note</Button>
    </form>
  );
}
