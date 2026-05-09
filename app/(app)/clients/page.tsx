'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  Search,
  Plus,
  SwitchCamera,
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import type { Client } from '@/types';

export default function ClientsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [clients, setClients] = useState<(Client & { active_projects?: number; total_revenue?: number; outstanding?: number })[]>([]);
  const [search, setSearch] = useState('');
  const [showInternal, setShowInternal] = useState(false);
  const [showNewSheet, setShowNewSheet] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    let query = supabase.from('clients').select('*');
    if (!showInternal) query = query.eq('is_internal', false);
    query = query.order('created_at', { ascending: false });

    const { data } = await query;
    if (!data) return;

    const enriched = await Promise.all(
      data.map(async (c) => {
        const { count: active } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', c.id)
          .neq('status', 'Completed');

        const { data: invoices } = await supabase
          .from('invoices')
          .select('status, total')
          .eq('client_id', c.id);

        const paid = invoices?.filter((i) => i.status === 'Paid').reduce((s, i) => s + i.total, 0) || 0;
        const outstanding = invoices?.filter((i) => ['Sent', 'Overdue'].includes(i.status)).reduce((s, i) => s + i.total, 0) || 0;

        return {
          ...c,
          active_projects: active || 0,
          total_revenue: paid,
          outstanding,
        };
      })
    );

    setClients(enriched);
  }

  async function handleCreate(data: Partial<Client>) {
    const { error } = await supabase.from('clients').insert(data);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Client created');
    setShowNewSheet(false);
    load();
  }

  const filtered = clients.filter(
    (c) =>
      c.company_name.toLowerCase().includes(search.toLowerCase()) ||
      c.contact_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setShowInternal(!showInternal); load(); }}
          >
            <SwitchCamera className="mr-2 h-4 w-4" />
            {showInternal ? 'Hide Internal' : 'Show Internal'}
          </Button>
        </div>

        <Sheet open={showNewSheet} onOpenChange={setShowNewSheet}>
          <SheetTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Client</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader><SheetTitle>New Client</SheetTitle></SheetHeader>
            <ClientForm onSubmit={handleCreate} />
          </SheetContent>
        </Sheet>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Primary Contact</th>
                <th className="px-4 py-3 font-medium">Active Projects</th>
                <th className="px-4 py-3 font-medium">Revenue</th>
                <th className="px-4 py-3 font-medium">Outstanding</th>
                <th className="px-4 py-3 font-medium">Services</th>
                <th className="px-4 py-3 font-medium">Since</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-b text-sm transition-colors hover:bg-accent/50 cursor-pointer"
                  onClick={() => router.push(`/clients/${c.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.company_name}</span>
                      {c.is_internal && (
                        <Badge variant="outline" className="text-[10px]">Internal</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.contact_name}</td>
                  <td className="px-4 py-3">{c.active_projects}</td>
                  <td className="px-4 py-3">{formatCurrency(c.total_revenue || 0, c.currency_preference)}</td>
                  <td className="px-4 py-3">{formatCurrency(c.outstanding || 0, c.currency_preference)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {c.services?.slice(0, 2).map((s) => (
                        <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function ClientForm({ onSubmit }: { onSubmit: (data: Partial<Client>) => Promise<void> }) {
  const [form, setForm] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    currency_preference: 'HKD',
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form as Partial<Client>); }} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Company Name</Label>
        <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label>Contact Name</Label>
        <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Phone</Label>
        <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Currency</Label>
        <Select value={form.currency_preference} onValueChange={(v) => setForm({ ...form, currency_preference: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {['HKD', 'GBP', 'IDR'].map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full">Create Client</Button>
    </form>
  );
}
