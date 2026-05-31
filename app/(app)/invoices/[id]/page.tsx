'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getInvoice, updateInvoice, deleteInvoice } from '@/lib/db/actions/invoices';
import { listClients } from '@/lib/db/actions/clients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
import { StatusBadge } from '@/components/shared/StatusBadge';
import { AIGenerateButton } from '@/components/shared/AIGenerateButton';
import { SmartFillButton } from '@/components/shared/SmartFillButton';
import { MarkdownEditor } from '@/components/shared/MarkdownEditor';
import { Switch } from '@/components/ui/switch';
import { formatCurrency } from '@/lib/utils';
import { sendInvoiceWithEmail, sendProposalWithEmail } from '@/lib/db/actions/email';
import { ArrowLeft, Plus, Trash2, Send, CheckCircle, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Invoice, Client, LineItem } from '@/types';

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = use(params);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [showPaid, setShowPaid] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendSubject, setSendSubject] = useState('');
  const [sendBody, setSendBody] = useState('');
  const [sending, setSending] = useState(false);

  const { data: invoice } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(id),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => listClients(),
  });

  useEffect(() => {
    if (invoice) {
      if (lineItems.length === 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLineItems(invoice.line_items as LineItem[] || []);
      }
      if (!paymentNotes) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPaymentNotes(invoice.payment_notes || '');
      }
    }
  }, [invoice]);

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
  const discount = (invoice?.discount_percent || 0) / 100 * subtotal;
  const tax = (invoice?.tax_percent || 0) / 100 * (subtotal - discount);
  const total = subtotal - discount + tax;

  async function handleSave() {
    if (!invoice) return;
    try {
      await updateInvoice(invoice.id, { line_items: lineItems, subtotal, total } as Record<string, unknown>);
      toast.success('Invoice saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  async function handleSend() {
    if (!invoice) return;
    await handleSave();
    const client = (invoice as any).client as Client | undefined;
    setSendSubject(`Invoice ${invoice.invoice_number} from Jonathan Simpson & Co.`);
    setSendBody(`Dear ${client?.contact_name || 'Client'},

Please find attached invoice ${invoice.invoice_number} from Jonathan Simpson & Co.

Total: ${formatCurrency(invoice.total, invoice.currency)}
Due: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-GB') : 'Upon receipt'}

Please don't hesitate to reach out if you have any questions.

Thank you for your business.

— Jonathan Simpson & Co.`);
    setShowSendDialog(true);
  }

  async function handleSendConfirm() {
    if (!invoice) return;
    setSending(true);
    try {
      const result = await sendInvoiceWithEmail(invoice.id, sendSubject, sendBody);
      if (result.status === 'sent') {
        toast.success('Invoice sent via email');
        setShowSendDialog(false);
        queryClient.invalidateQueries({ queryKey: ['invoice', id] });
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
      } else {
        toast.error(`Failed to send: ${result.errorMessage}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  async function handleMarkPaid() {
    if (!invoice) return;
    try {
      await updateInvoice(invoice.id, { status: 'Paid', paid_at: new Date().toISOString(), payment_notes: paymentNotes } as Record<string, unknown>);
      toast.success('Invoice marked as paid');
      setShowPaid(false);
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark paid');
    }
  }

  async function handleDelete() {
    if (!invoice) return;
    try {
      await deleteInvoice(invoice.id);
      toast.success('Invoice deleted');
      router.push('/invoices');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  if (!invoice) return null;

  return (
    <div className="max-w-4xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/invoices')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">{invoice.invoice_number}</h2>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="text-sm text-muted-foreground">{formatCurrency(total, invoice.currency)}</p>
        </div>

          <div className="flex items-center gap-2">
          <SmartFillButton
            action="parse-invoice"
            context={{
              invoice_number: invoice.invoice_number,
              currency: invoice.currency,
              client_name: clients.find((c) => c.id === invoice.client_id)?.company_name || null,
            }}
            onFill={(fields) => {
              if (fields.payment_terms) handleField('payment_terms', fields.payment_terms as string);
              if (fields.payment_notes) {
                setPaymentNotes(fields.payment_notes as string);
                handleField('payment_notes', fields.payment_notes as string);
              }
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
            entityLabel="invoice"
          />
          <AIGenerateButton
            action="generate-invoice"
            context={{ invoice_number: invoice.invoice_number, currency: invoice.currency }}
            onResult={(content) => handleField('payment_terms', content)}
          />
          <Button onClick={handleSave} variant="outline">Save Draft</Button>
          {['Draft', 'Overdue'].includes(invoice.status) && <Button onClick={() => handleSend()}><Send className="mr-2 h-4 w-4" /> Send</Button>}
          {['Sent', 'Overdue'].includes(invoice.status) && (
            <Button onClick={() => setShowPaid(true)}>
              <CheckCircle className="mr-2 h-4 w-4" /> Mark Paid
            </Button>
          )}
          {['Draft', 'Sent'].includes(invoice.status) && (
            <Button variant="outline" onClick={async () => {
              await updateInvoice(invoice.id, { status: 'Cancelled' } as Record<string, unknown>);
              toast.success('Invoice cancelled');
              queryClient.invalidateQueries({ queryKey: ['invoice', id] });
              queryClient.invalidateQueries({ queryKey: ['invoices'] });
              queryClient.invalidateQueries({ queryKey: ['finance'] });
            }}>
              Cancel
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
              <Select value={invoice.client_id} onValueChange={(v) => handleField('client_id', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={invoice.currency} onValueChange={(v) => handleField('currency', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['HKD', 'GBP', 'IDR'].map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Issue Date</Label>
              <Input type="date" value={invoice.issue_date} onChange={(e) => handleField('issue_date', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={invoice.due_date || ''} onChange={(e) => handleField('due_date', e.target.value || null)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Discount (%)</Label>
              <Input type="number" value={invoice.discount_percent} onChange={(e) => handleField('discount_percent', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Tax Label</Label>
              <Input value={invoice.tax_label || ''} onChange={(e) => handleField('tax_label', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tax (%)</Label>
              <Input type="number" value={invoice.tax_percent} onChange={(e) => handleField('tax_percent', parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payment Terms</Label>
            <MarkdownEditor value={invoice.payment_terms || ''} onChange={(v) => handleField('payment_terms', v)} minHeight={100} placeholder="Payment terms..." />
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
                  <div className="w-24 pt-6 text-sm text-right">{formatCurrency(item.total, invoice.currency)}</div>
                  <Button variant="ghost" size="icon" className="mt-6" onClick={() => removeLineItem(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <div className="w-48 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal, invoice.currency)}</span></div>
                {invoice.discount_percent > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Discount ({invoice.discount_percent}%)</span><span>-{formatCurrency(discount, invoice.currency)}</span></div>
                )}
                {invoice.tax_percent > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">{invoice.tax_label || 'Tax'} ({invoice.tax_percent}%)</span><span>{formatCurrency(tax, invoice.currency)}</span></div>
                )}
                <div className="flex justify-between font-semibold border-t pt-1"><span>Total</span><span>{formatCurrency(total, invoice.currency)}</span></div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Switch
              checked={invoice.is_recurring}
              onCheckedChange={(v: boolean) => handleField('is_recurring', v)}
            />
            <Label>Recurring</Label>
            {invoice.is_recurring && (
              <>
                <Select value={invoice.recurring_frequency || ''} onValueChange={(v) => handleField('recurring_frequency', v)}>
                  <SelectTrigger className="w-32"><SelectValue placeholder="Frequency" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
                <div className="space-y-1">
                  <Label className="text-xs">Next Issue</Label>
                  <Input type="date" value={invoice.next_issue_date || ''} onChange={(e) => handleField('next_issue_date', e.target.value || null)} />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {invoice.status === 'Paid' && (
        <Card>
          <CardContent className="p-6">
            <Label>Payment Notes</Label>
            <textarea className="w-full rounded-md border bg-transparent p-3 text-sm mt-2" rows={3} value={paymentNotes} onChange={(e) => {
              setPaymentNotes(e.target.value);
              handleField('payment_notes', e.target.value);
            }} />
          </CardContent>
        </Card>
      )}

      <Dialog open={showPaid} onOpenChange={setShowPaid}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Paid</DialogTitle>
            <DialogDescription>Record payment for this invoice. Optionally add payment notes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label>Payment Notes (optional)</Label>
            <textarea className="w-full rounded-md border bg-transparent p-3 text-sm" rows={3} value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaid(false)}>Cancel</Button>
            <Button onClick={handleMarkPaid}>Confirm Paid</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Send Invoice</DialogTitle>
            <DialogDescription>Review the email before sending to the client.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>To</Label>
              <Input
                value={((invoice as any)?.client as any)?.email || ''}
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
                      purpose: 'invoice_sending',
                      invoice_number: invoice?.invoice_number,
                      total: invoice?.total,
                      currency: invoice?.currency,
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
                      purpose: 'invoice_sending',
                      invoice_number: invoice?.invoice_number,
                      total: invoice?.total,
                      currency: invoice?.currency,
                      client_name: ((invoice as any)?.client as any)?.contact_name || 'Client',
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
        entityName={invoice.invoice_number}
        entityType="Invoice"
        onConfirm={handleDelete}
      />
    </div>
  );

  async function handleField(field: string, value: unknown) {
    if (!invoice) return;
    queryClient.setQueryData(['invoice', id], { ...invoice, [field]: value } as Invoice);
    await updateInvoice(invoice.id, { [field]: value } as Record<string, unknown>);
  }
}
