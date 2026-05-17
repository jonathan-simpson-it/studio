'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listInvoices, processOverdueChecks } from '@/lib/db/actions/invoices';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency } from '@/lib/utils';
import { Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { Invoice } from '@/types';

export default function InvoicesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: listInvoices,
  });
  const [search, setSearch] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    processOverdueChecks().catch(() => {});
  }, []);

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

  const filtered = invoices.filter((i) =>
    i.invoice_number.toLowerCase().includes(search.toLowerCase())
  );

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

      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64 pl-9" />
        </div>
        <Button variant="outline" size="sm" onClick={handleCheckOverdue} disabled={checking}>
          <RefreshCw className={`mr-2 h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Checking...' : 'Check Overdue'}
        </Button>
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
