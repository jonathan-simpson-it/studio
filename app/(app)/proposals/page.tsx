'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { listProposals } from '@/lib/db/actions/invoices';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { MobileCardList } from '@/components/mobile/MobileCardList';
import { useIsMobile } from '@/hooks/useIsMobile';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Search, Plus } from 'lucide-react';

export default function ProposalsPage() {
  const router = useRouter();
  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals'],
    queryFn: listProposals,
  });
  const [search, setSearch] = useState('');
  const isMobile = useIsMobile();

  const filtered = proposals.filter((p) =>
    p.proposal_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search proposals..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-64 pl-9" />
        </div>
        <Button onClick={() => router.push('/proposals')}><Plus className="mr-2 h-4 w-4" /> New Proposal</Button>
      </div>

      {isMobile ? (
        <MobileCardList
          items={filtered}
          keyExtractor={(p) => p.id}
          onItemClick={(p) => router.push(`/proposals/${p.id}`)}
          renderCard={(p) => (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-mono text-muted-foreground">{p.proposal_number}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusBadge status={p.status} />
                <span className="text-xs font-medium">{formatCurrency(p.total, p.currency)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{formatDate(p.created_at)}</p>
            </div>
          )}
          emptyMessage="No proposals found"
        />
      ) : (
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Number</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Sent</th>
                <th className="px-4 py-3 font-medium">Expiry</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b text-sm cursor-pointer hover:bg-accent/50" onClick={() => router.push(`/proposals/${p.id}`)}>
                  <td className="px-4 py-3 font-medium">{p.proposal_number}</td>
                  <td className="px-4 py-3 text-muted-foreground">{/* client name */}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3">{formatCurrency(p.total, p.currency)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.sent_at ? formatDate(p.sent_at) : '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.expires_at ? formatDate(p.expires_at) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
