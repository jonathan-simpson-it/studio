'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listInvoices, processOverdueChecks, createInvoice, getInvoiceNumber } from '@/lib/db/actions/invoices';
import { listClients } from '@/lib/db/actions/clients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency } from '@/lib/utils';
import { exportToCSV } from '@/lib/export-csv';
import { Search, RefreshCw, Plus, Download } from 'lucide-react';
import { toast } from 'sonner';
import type { Invoice } from '@/types';

export default function InvoicesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: listInvoices,
  });
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => listClients(),
  });
  const [search, setSearch] = useState('');
  const [checking, setChecking] = useState(false);
  const [showNewSheet, setShowNewSheet] = useState(false);
  const [newInvoice, setNewInvoice] = useState({ client_id: '', currency: 'HKD', total: 0 });
  const [creating, setCreating] = useState(false);

  async function handleCheckOverdue() {
    setChecking(true);
    try {
      const result = await processOverdueChecks();
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      if (result.overdue > 0 || result.recurring_generated > 0) {
        toast.success(`${result.overdue} overdue, ${result.recurring_generated} recurring generated`);
      } else {
        toast.success('Check complete — no changes');
      }
    } catch {
      toast.error('Overdue check failed');
    } finally {
      setChecking(false);
    }
  }

  const outstandingTotal = invoices
    .filter((i) => ['Sent', 'Overdue'].includes(i.status))
    .reduce((s, i) => s + i.total, 0);

  const clientMap = Object.fromEntries(clients.map((c: any) => [c.id, c.company_name || '']));
  const filtered = invoices.filter((i) => {
    const q = search.toLowerCase();
    return (
      i.invoice_number.toLowerCase().includes(q) ||
      i.status.toLowerCase().includes(q) ||
      String(i.total).includes(q) ||
      (clientMap[i.client_id] || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Outstanding Total</p>
            <p className="text-2xl font-bold">
              {formatCurrency(outstandingTotal, 'HKD')}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {invoices.filter((i) => ['Sent', 'Overdue'].includes(i.status)).length} unpaid invoices
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4 flex-wrap w-full">
          <div className="relative flex-1 sm:flex-none min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-64 pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    exportToCSV(
                      filtered.map((i) => ({
                        number: i.invoice_number,
                        status: i.status,
                        amount: i.total,
                        currency: i.currency,
                        issued: i.issue_date || '',
                        due: i.due_date || '',
                      })),
                      [
                        { key: 'number', label: 'Invoice Number' },
                        { key: 'status', label: 'Status' },
                        { key: 'amount', label: 'Amount' },
                        { key: 'currency', label: 'Currency' },
                        { key: 'issued', label: 'Issue Date' },
                        { key: 'due', label: 'Due Date' },
                      ],
                      `invoices-${new Date().toISOString().split('T')[0]}`
                    )
                  }
                  aria-label="Export to CSV"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export to CSV</TooltipContent>
            </Tooltip>
            <Button variant="outline" size="sm" onClick={handleCheckOverdue} disabled={checking}>
              <RefreshCw className={`mr-2 h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'Checking...' : 'Check Overdue'}
            </Button>
          </div>
        </div>

        <Sheet open={showNewSheet} onOpenChange={setShowNewSheet}>
          <SheetTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Invoice
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>New Invoice</SheetTitle>
              <SheetDescription>Create a new invoice for a client</SheetDescription>
            </SheetHeader>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newInvoice.client_id) { toast.error('Select a client'); return; }
                setCreating(true);
                try {
                  const invoiceNumber = await getInvoiceNumber();
                  await createInvoice({
                    invoice_number: invoiceNumber,
                    client_id: newInvoice.client_id,
                    currency: newInvoice.currency,
                    total: newInvoice.total,
                    subtotal: newInvoice.total,
                    status: 'Draft',
                    created_by: session?.user?.id,
                  } as Record<string, unknown>);
                  toast.success('Invoice created');
                  setShowNewSheet(false);
                  queryClient.invalidateQueries({ queryKey: ['invoices'] });
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Failed to create invoice');
                } finally {
                  setCreating(false);
                }
              }}
              className="space-y-4 pt-4"
            >
              <div className="space-y-2">
                <Label>Client</Label>
                <Select
                  value={newInvoice.client_id}
                  onValueChange={(v) => setNewInvoice({ ...newInvoice, client_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={newInvoice.currency}
                  onValueChange={(v) => setNewInvoice({ ...newInvoice, currency: v })}
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
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={newInvoice.total || ''}
                  onChange={(e) => setNewInvoice({ ...newInvoice, total: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? 'Creating...' : 'Create Invoice'}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Number</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Issued</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Paid</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} className="border-b text-sm cursor-pointer hover:bg-accent/50" onClick={() => router.push(`/invoices/${inv.id}`)}>
                  <td className="px-4 py-3 font-medium">{inv.invoice_number}</td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                  <td className="px-4 py-3">{formatCurrency(inv.total, inv.currency)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{inv.issue_date}</td>
                  <td className="px-4 py-3 text-muted-foreground">{inv.due_date || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
