'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProposal, updateProposal, createInvoice, getInvoiceNumber, deleteProposal } from '@/lib/db/actions/invoices';
import { listClients } from '@/lib/db/actions/clients';
import { createProject } from '@/lib/db/actions/projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog';
import { MarkdownEditor } from '@/components/shared/MarkdownEditor';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { AIGenerateButton } from '@/components/shared/AIGenerateButton';
import { SmartFillButton } from '@/components/shared/SmartFillButton';
import { formatCurrency } from '@/lib/utils';
import { sendProposalWithEmail } from '@/lib/db/actions/email';
import { ArrowLeft, Plus, Trash2, Send, Check, X, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Proposal, Client, LineItem } from '@/types';

export default function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { id } = use(params);
  const [showAccept, setShowAccept] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendSubject, setSendSubject] = useState('');
  const [sendBody, setSendBody] = useState('');
  const [sending, setSending] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  const { data: proposal } = useQuery({
    queryKey: ['proposal', id],
    queryFn: () => getProposal(id),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => listClients(),
  });

  useEffect(() => {
    if (proposal && lineItems.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLineItems(proposal.line_items as LineItem[] || []);
    }
  }, [proposal]);

  function addLineItem() {
    setLineItems([...lineItems, { service: '', description: '', quantity: 1, unit_price: 0, total: 0 }]);
  }

  function updateLineItem(i: number, field: keyof LineItem, value: string | number) {
    const items = [...lineItems];
    // @ts-expect-error
    items[i][field] = value;
    if (field === 'quantity' || field === 'unit_price') {
      items[i].total = items[i].quantity * items[i].unit_price;
    }
    setLineItems(items);
  }

  function removeLineItem(i: number) {
    setLineItems(lineItems.filter((_, idx) => idx !== i));
  }

  const subtotal = lineItems.reduce((s, i) => s + i.total, 0);
  const discount = (proposal?.discount_percent || 0) / 100 * subtotal;
  const total = subtotal - discount;

  async function handleSave() {
    if (!proposal) return;
    try {
      await updateProposal(proposal.id, { line_items: lineItems, subtotal, total } as Record<string, unknown>);
      toast.success('Proposal saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  async function handleSend() {
    if (!proposal) return;
    await handleSave();
    const client = (proposal as any).client as Client | undefined;
    setSendSubject(`Proposal ${proposal.proposal_number} from Jonathan Simpson & Co.`);
    setSendBody(`Dear ${client?.contact_name || 'Client'},

Please find attached proposal ${proposal.proposal_number} from Jonathan Simpson & Co.

Total: ${formatCurrency(proposal.total, proposal.currency)}

We look forward to the opportunity to work with you.

— Jonathan Simpson & Co.`);
    setShowSendDialog(true);
  }

  async function handleSendConfirm() {
    if (!proposal) return;
    setSending(true);
    try {
      const result = await sendProposalWithEmail(proposal.id, sendSubject, sendBody);
      if (result.status === 'sent') {
        toast.success('Proposal sent via email');
        setShowSendDialog(false);
        queryClient.invalidateQueries({ queryKey: ['proposal', id] });
      } else {
        toast.error(`Failed to send: ${result.errorMessage}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  async function handleAccept() {
    if (!proposal) return;
    const userId = session?.user?.id;

    try {
      await updateProposal(proposal.id, { status: 'Accepted', accepted_at: new Date().toISOString() } as Record<string, unknown>);

      if (!proposal.project_id) {
        await createProject({
          name: `Project from ${proposal.proposal_number}`,
          client_id: proposal.client_id,
          billing_type: 'One-off',
          status: 'Planning',
          owner_id: userId,
          currency: proposal.currency,
          source_proposal_id: proposal.id,
        });
      }

      const invoiceNumber = await getInvoiceNumber();
      await createInvoice({
        invoice_number: invoiceNumber,
        client_id: proposal.client_id,
        project_id: proposal.project_id,
        status: 'Draft',
        currency: proposal.currency,
        line_items: lineItems,
        subtotal,
        total,
        created_by: userId,
      });

      toast.success('Proposal accepted. Invoice draft created.');
      setShowAccept(false);
      queryClient.invalidateQueries({ queryKey: ['proposal', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to accept');
    }
  }

  async function handleDelete() {
    if (!proposal) return;
    try {
      await deleteProposal(proposal.id);
      toast.success('Proposal deleted');
      router.push('/proposals');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  if (!proposal) return null;

  const totalDisplay = total;

  return (
    <div className="max-w-4xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/proposals')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">{proposal.proposal_number}</h2>
            <StatusBadge status={proposal.status} />
          </div>
          <p className="text-sm text-muted-foreground">{formatCurrency(totalDisplay, proposal.currency)}</p>
        </div>

        <div className="flex items-center gap-2">
          <SmartFillButton
            action="parse-proposal"
            context={{
              proposal_number: proposal.proposal_number,
              currency: proposal.currency,
              client_name: clients.find((c) => c.id === proposal.client_id)?.company_name || null,
            }}
            onFill={(fields) => {
              if (fields.scope_of_work) handleField('scope_of_work', fields.scope_of_work as string);
              if (fields.timeline) handleField('timeline', fields.timeline as string);
              if (fields.payment_terms) handleField('payment_terms', fields.payment_terms as string);
              if (fields.line_items) {
                const items = fields.line_items as Array<{ service: string; description: string; quantity: number; unit_price: number }>;
                if (items.length > 0) setLineItems(items.map((item) => ({
                  service: item.service || '',
                  description: item.description || '',
                  quantity: item.quantity || 1,
                  unit_price: item.unit_price || 0,
                  total: (item.quantity || 1) * (item.unit_price || 0),
                })));
              }
            }}
            label="Smart Fill"
            entityLabel="proposal"
          />
          <AIGenerateButton
            action="generate-proposal"
            context={{ proposal_number: proposal.proposal_number, currency: proposal.currency, line_items: lineItems }}
            onResult={(content) => handleField('scope_of_work', content)}
          />
          <Button onClick={handleSave} variant="outline">Save Draft</Button>
          {proposal.status === 'Draft' && <Button onClick={handleSend}><Send className="mr-2 h-4 w-4" /> Send</Button>}
          {proposal.status === 'Sent' && (
            <Button onClick={() => setShowAccept(true)}>
              <Check className="mr-2 h-4 w-4" /> Mark Accepted
            </Button>
          )}
          {proposal.status === 'Sent' && (
            <Button variant="outline" onClick={async () => {
              await updateProposal(proposal.id, { status: 'Rejected' } as Record<string, unknown>);
              toast.success('Proposal rejected');
              queryClient.invalidateQueries({ queryKey: ['proposal', id] });
              queryClient.invalidateQueries({ queryKey: ['proposals'] });
            }}>
              <X className="mr-2 h-4 w-4" /> Reject
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={proposal.client_id} onValueChange={(v) => handleField('client_id', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={proposal.currency} onValueChange={(v) => handleField('currency', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['HKD', 'GBP', 'IDR'].map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input type="date" value={proposal.expires_at?.split('T')[0] || ''} onChange={(e) => handleField('expires_at', e.target.value || null)} />
            </div>
            <div className="space-y-2">
              <Label>Discount (%)</Label>
              <Input type="number" value={proposal.discount_percent} onChange={(e) => handleField('discount_percent', parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Line Items</Label>
              <Button variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </div>
            <div className="space-y-2">
              {lineItems.map((item, i) => (
                <div key={i} className="flex items-start gap-2 rounded-md border p-3">
                  <div className="flex-1 space-y-2">
                    <Input placeholder="Service name" value={item.service} onChange={(e) => updateLineItem(i, 'service', e.target.value)} />
                    <Input placeholder="Description" value={item.description} onChange={(e) => updateLineItem(i, 'description', e.target.value)} />
                  </div>
                  <div className="w-20 space-y-2">
                    <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateLineItem(i, 'quantity', parseInt(e.target.value) || 0)} />
                    <Input type="number" placeholder="Price" value={item.unit_price} onChange={(e) => updateLineItem(i, 'unit_price', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="w-24 pt-6 text-sm text-right">
                    {formatCurrency(item.total, proposal.currency)}
                  </div>
                  <Button variant="ghost" size="icon" className="mt-6" onClick={() => removeLineItem(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <div className="w-48 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal, proposal.currency)}</span></div>
                {proposal.discount_percent > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Discount ({proposal.discount_percent}%)</span><span>-{formatCurrency(discount, proposal.currency)}</span></div>
                )}
                <div className="flex justify-between font-semibold border-t pt-1"><span>Total</span><span>{formatCurrency(total, proposal.currency)}</span></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {(proposal.cover_note !== null || proposal.scope_of_work !== null || proposal.timeline !== null || proposal.payment_terms !== null) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Cover Note</CardTitle></CardHeader>
            <CardContent><MarkdownEditor value={proposal.cover_note || ''} onChange={(v) => handleField('cover_note', v)} minHeight={150} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Scope of Work</CardTitle></CardHeader>
            <CardContent><MarkdownEditor value={proposal.scope_of_work || ''} onChange={(v) => handleField('scope_of_work', v)} minHeight={150} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Timeline</CardTitle></CardHeader>
            <CardContent><MarkdownEditor value={proposal.timeline || ''} onChange={(v) => handleField('timeline', v)} minHeight={150} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Payment Terms</CardTitle></CardHeader>
            <CardContent><MarkdownEditor value={proposal.payment_terms || ''} onChange={(v) => handleField('payment_terms', v)} minHeight={150} /></CardContent>
          </Card>
        </div>
      )}

      <Dialog open={showAccept} onOpenChange={setShowAccept}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Proposal</DialogTitle>
            <DialogDescription>
              Accepting will mark the proposal as accepted and create an invoice draft.
              {!proposal.project_id && ' A new project will also be created.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAccept(false)}>Cancel</Button>
            <Button onClick={handleAccept}>Confirm & Accept</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Send Proposal</DialogTitle>
            <DialogDescription>Review the email before sending to the client.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>To</Label>
              <Input
                value={((proposal as any)?.client as any)?.email || ''}
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Subject</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 text-xs"
                  onClick={async () => {
                    const { generateAIContent } = await import('@/lib/ai');
                    const ai = await generateAIContent('draft-email', {
                      purpose: 'proposal_sending',
                      proposal_number: proposal?.proposal_number,
                      total: proposal?.total,
                      currency: proposal?.currency,
                    });
                    if (ai) {
                      const lines = ai.trim().split('\n');
                      const subjLine = lines.find(l => l.toLowerCase().startsWith('subject'));
                      if (subjLine) setSendSubject(subjLine.replace(/^subject:\s*/i, ''));
                    }
                  }}
                >
                  <Sparkles className="h-3 w-3" /> AI Subject
                </Button>
              </div>
              <Input value={sendSubject} onChange={(e) => setSendSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Body</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 text-xs"
                  onClick={async () => {
                    const { generateAIContent } = await import('@/lib/ai');
                    const ai = await generateAIContent('draft-email', {
                      purpose: 'proposal_sending',
                      proposal_number: proposal?.proposal_number,
                      total: proposal?.total,
                      currency: proposal?.currency,
                      client_name: ((proposal as any)?.client as any)?.contact_name || 'Client',
                    });
                    if (ai) setSendBody(ai.replace(/^subject:.*\n/i, '').trim());
                  }}
                >
                  <Sparkles className="h-3 w-3" /> AI Improve
                </Button>
              </div>
              <textarea
                className="w-full rounded-md border bg-transparent p-3 text-sm min-h-[180px]"
                value={sendBody}
                onChange={(e) => setSendBody(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>Cancel</Button>
            <Button onClick={handleSendConfirm} disabled={sending}>
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        entityName={proposal.proposal_number}
        entityType="Proposal"
        onConfirm={handleDelete}
      />
    </div>
  );

  async function handleField(field: string, value: unknown) {
    if (!proposal) return;
    queryClient.setQueryData(['proposal', id], { ...proposal, [field]: value } as Proposal);
    await updateProposal(proposal.id, { [field]: value } as Record<string, unknown>);
  }
}
