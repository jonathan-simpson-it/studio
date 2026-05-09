'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Search, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { Proposal } from '@/types';

export default function ProposalsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [search, setSearch] = useState('');
  const [showNewSheet, setShowNewSheet] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('proposals').select('*').order('created_at', { ascending: false });
    if (data) setProposals(data);
  }

  const filtered = proposals.filter((p) =>
    p.proposal_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search proposals..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64 pl-9" />
        </div>
        <Button onClick={() => setShowNewSheet(true)}><Plus className="mr-2 h-4 w-4" /> New Proposal</Button>
      </div>

      <Card>
        <CardContent className="p-0">
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
    </div>
  );
}
