'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
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
import { StatusBadge } from '@/components/shared/StatusBadge';
import { AIGenerateButton } from '@/components/shared/AIGenerateButton';
import { Switch } from '@/components/ui/switch';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, Plus, Trash2, Send, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Invoice, Client, LineItem } from '@/types';

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [showPaid, setShowPaid] = useState(false);
  const [paymentNotes, setPaymentNotes] = useState('');

  useEffect(() => { load(); }, [params]);

  async function load() {
    const { id } = await params;
    const { data: inv } = await supabase.from('invoices').select('*').eq('id', id).single();
    if (inv) {
      setInvoice(inv);
      setLineItems(inv.line_items as LineItem[] || []);
      setPaymentNotes(inv.payment_notes || '');
    }
    const { data: cl } = await supabase.from('clients').select('*');
    if (cl) setClients(cl);
  }

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
    const { error } = await supabase
      .from('invoices')
      .update({ line_items: lineItems, subtotal, total, updated_at: new Date().toISOString() })
      .eq('id', invoice.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Invoice saved');
  }

  async function handleSend() {
    if (!invoice) return;
    await handleSave();
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'Sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', invoice.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Invoice marked as sent');
    load();
  }

  async function handleMarkPaid() {
    if (!invoice) return;
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'Paid', paid_at: new Date().toISOString(), payment_notes: paymentNotes, updated_at: new Date().toISOString() })
      .eq('id', invoice.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Invoice marked as paid');
    setShowPaid(false);
    load();
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
          <AIGenerateButton
            action="generate-invoice"
            context={{ invoice_number: invoice.invoice_number, currency: invoice.currency }}
            onResult={(content) => toast.success('Invoice content generated')}
          />
          <Button onClick={handleSave} variant="outline">Save Draft</Button>
          {['Draft', 'Overdue'].includes(invoice.status) && <Button onClick={handleSend}><Send className="mr-2 h-4 w-4" /> Send</Button>}
          {['Sent', 'Overdue'].includes(invoice.status) && (
            <Button onClick={() => setShowPaid(true)}>
              <CheckCircle className="mr-2 h-4 w-4" /> Mark Paid
            </Button>
          )}
          {['Draft', 'Sent'].includes(invoice.status) && (
            <Button variant="outline" onClick={async () => {
              await supabase.from('invoices').update({ status: 'Cancelled', updated_at: new Date().toISOString() }).eq('id', invoice.id);
              toast.success('Invoice cancelled');
              load();
            }}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
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

          <div className="grid grid-cols-3 gap-4">
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
            <textarea className="w-full rounded-md border bg-transparent p-3 text-sm" rows={2} value={invoice.payment_terms || ''} onChange={(e) => handleField('payment_terms', e.target.value)} />
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
    </div>
  );

  async function handleField(field: string, value: unknown) {
    if (!invoice) return;
    setInvoice({ ...invoice, [field]: value } as Invoice);
    await supabase.from('invoices').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', invoice.id);
  }
}
