'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { CurrencyBadge } from '@/components/shared/CurrencyBadge';
import { formatCurrency } from '@/lib/utils';
import {
  Plus,
  DollarSign,
  TrendingUp,
  Landmark,
  AlertTriangle,
  Receipt,
  PiggyBank,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Invoice, Cost, Client } from '@/types';

export default function FinancePage() {
  const supabase = createClient();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showCostSheet, setShowCostSheet] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const [invRes, costRes, clRes] = await Promise.all([
      supabase.from('invoices').select('*'),
      supabase.from('costs').select('*').order('date', { ascending: false }),
      supabase.from('clients').select('*'),
    ]);
    if (invRes.data) setInvoices(invRes.data);
    if (costRes.data) setCosts(costRes.data);
    if (clRes.data) setClients(clRes.data);
  }

  const paidInvoices = invoices.filter((i) => i.status === 'Paid');
  const outstandingInvoices = invoices.filter((i) => ['Sent', 'Overdue'].includes(i.status));
  const totalRevenue = paidInvoices.reduce((s, i) => s + i.total, 0);
  const collectedCash = totalRevenue;
  const outstandingTotal = outstandingInvoices.reduce((s, i) => s + i.total, 0);
  const totalCosts = costs.reduce((s, c) => s + c.amount, 0);

  const thisQuarter = Math.floor((new Date().getMonth()) / 3) + 1;
  const quarterRevenue = paidInvoices
    .filter((i) => {
      if (!i.paid_at) return false;
      const d = new Date(i.paid_at);
      const q = Math.floor(d.getMonth() / 3) + 1;
      return q === thisQuarter && d.getFullYear() === new Date().getFullYear();
    })
    .reduce((s, i) => s + i.total, 0);

  const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalCosts) / totalRevenue) * 100 : 0;

  const byClient = clients
    .filter((c) => !c.is_internal)
    .map((c) => {
      const clientInvoices = invoices.filter((i) => i.client_id === c.id);
      const collected = clientInvoices.filter((i) => i.status === 'Paid').reduce((s, i) => s + i.total, 0);
      const outstanding = clientInvoices.filter((i) => ['Sent', 'Overdue'].includes(i.status)).reduce((s, i) => s + i.total, 0);
      const invoiced = clientInvoices.reduce((s, i) => s + i.total, 0);
      const clientCosts = costs.filter((cst) => cst.client_id === c.id).reduce((s, cst) => s + cst.amount, 0);
      const margin = collected - clientCosts;
      const marginPct = collected > 0 ? (margin / collected) * 100 : 0;
      return { client: c, invoiced, collected, outstanding, costs: clientCosts, margin, marginPct };
    });

  const quarters = [1, 2, 3, 4].map((q) => {
    const rev = paidInvoices
      .filter((i) => {
        if (!i.paid_at) return false;
        const d = new Date(i.paid_at);
        const qtr = Math.floor(d.getMonth() / 3) + 1;
        return qtr === q && d.getFullYear() === new Date().getFullYear();
      })
      .reduce((s, i) => s + i.total, 0);
    const cst = costs
      .filter((c) => {
        const d = new Date(c.date);
        const qtr = Math.floor(d.getMonth() / 3) + 1;
        return qtr === q && d.getFullYear() === new Date().getFullYear();
      })
      .reduce((s, c) => s + c.amount, 0);
    return { quarter: `Q${q}`, revenue: rev, costs: cst, margin: rev - cst };
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" /> Total Revenue</CardTitle></CardHeader><CardContent><p className="text-xl font-bold">{formatCurrency(totalRevenue, 'HKD')}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Revenue This Quarter</CardTitle></CardHeader><CardContent><p className="text-xl font-bold">{formatCurrency(quarterRevenue, 'HKD')}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Landmark className="h-3 w-3" /> Collected Cash</CardTitle></CardHeader><CardContent><p className="text-xl font-bold">{formatCurrency(collectedCash, 'HKD')}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Outstanding</CardTitle></CardHeader><CardContent><p className="text-xl font-bold">{formatCurrency(outstandingTotal, 'HKD')}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Receipt className="h-3 w-3" /> Total Costs</CardTitle></CardHeader><CardContent><p className="text-xl font-bold">{formatCurrency(totalCosts, 'HKD')}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><PiggyBank className="h-3 w-3" /> Gross Margin</CardTitle></CardHeader><CardContent><p className="text-xl font-bold">{totalRevenue > 0 ? `${grossMargin.toFixed(1)}%` : '—'}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quarterly Breakdown ({new Date().getFullYear()})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {quarters.map((q) => (
              <div key={q.quarter} className="flex items-center gap-4">
                <span className="text-sm font-medium w-8">{q.quarter}</span>
                <div className="flex-1 h-6 rounded bg-muted relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-primary/60 rounded"
                    style={{ width: `${Math.min(100, (q.revenue / (Math.max(...quarters.map((x) => x.revenue), 1)) * 100))}%` }}
                  />
                </div>
                <div className="w-24 text-right text-xs text-muted-foreground">
                  Rev: {formatCurrency(q.revenue, 'HKD')}
                </div>
                <div className="w-24 text-right text-xs text-muted-foreground">
                  Cost: {formatCurrency(q.costs, 'HKD')}
                </div>
                <div className="w-24 text-right text-xs font-medium">
                  {formatCurrency(q.margin, 'HKD')}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">By Client</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Invoiced</th>
                <th className="px-4 py-3 font-medium">Collected</th>
                <th className="px-4 py-3 font-medium">Outstanding</th>
                <th className="px-4 py-3 font-medium">Costs</th>
                <th className="px-4 py-3 font-medium">Margin</th>
                <th className="px-4 py-3 font-medium">Margin %</th>
              </tr>
            </thead>
            <tbody>
              {byClient.map(({ client, invoiced, collected, outstanding, costs: cst, margin, marginPct }) => (
                <tr key={client.id} className="border-b text-sm">
                  <td className="px-4 py-3 font-medium">{client.company_name}</td>
                  <td className="px-4 py-3">{formatCurrency(invoiced, 'HKD')}</td>
                  <td className="px-4 py-3">{formatCurrency(collected, 'HKD')}</td>
                  <td className="px-4 py-3">{formatCurrency(outstanding, 'HKD')}</td>
                  <td className="px-4 py-3">{formatCurrency(cst, 'HKD')}</td>
                  <td className="px-4 py-3">{formatCurrency(margin, 'HKD')}</td>
                  <td className="px-4 py-3">{collected > 0 ? `${marginPct.toFixed(1)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Costs</CardTitle>
            <Sheet open={showCostSheet} onOpenChange={setShowCostSheet}>
              <SheetTrigger asChild>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Cost</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader><SheetTitle>Add Cost</SheetTitle></SheetHeader>
                <CostForm clients={clients} onSubmit={async (data) => {
                  const { data: { user } } = await supabase.auth.getUser();
                  const { error } = await supabase.from('costs').insert({ ...data, created_by: user?.id });
                  if (error) { toast.error(error.message); return; }
                  toast.success('Cost added');
                  setShowCostSheet(false);
                  load();
                }} />
              </SheetContent>
            </Sheet>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {costs.map((c) => (
                <tr key={c.id} className="border-b text-sm">
                  <td className="px-4 py-3"><span className="text-xs bg-muted px-2 py-0.5 rounded">{c.category}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{c.description}</td>
                  <td className="px-4 py-3">{formatCurrency(c.amount, c.currency)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function CostForm({ clients, onSubmit }: { clients: Client[]; onSubmit: (data: Partial<Cost>) => Promise<void> }) {
  const [form, setForm] = useState({ category: 'Software', description: '', amount: 0, currency: 'HKD', date: new Date().toISOString().split('T')[0], client_id: '_none' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, client_id: form.client_id === '_none' ? null : form.client_id } as Partial<Cost>); }} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {['Software', 'API', 'Contractor', 'Domain', 'Hosting', 'Travel', 'Other'].map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Amount</Label>
          <Input type="number" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} required />
        </div>
        <div className="space-y-2">
          <Label>Currency</Label>
          <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['HKD', 'GBP', 'IDR'].map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Date</Label>
        <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label>Client (optional)</Label>
        <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
          <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">None</SelectItem>
            {clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full">Add Cost</Button>
    </form>
  );
}
