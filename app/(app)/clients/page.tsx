'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listClients, createClient, deleteClient } from '@/lib/db/actions/clients';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog';
import { MobileCardList } from '@/components/mobile/MobileCardList';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  Search,
  Plus,
  SwitchCamera,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import type { Client } from '@/types';

export default function ClientsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showInternal, setShowInternal] = useState(false);
  const [showNewSheet, setShowNewSheet] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const isMobile = useIsMobile();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', showInternal],
    queryFn: () => listClients(showInternal),
  });

  async function handleCreate(data: Partial<Client>) {
    try {
      await createClient(data as Record<string, unknown>);
      toast.success('Client created');
      setShowNewSheet(false);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create client');
    }
  }

  async function handleDelete(client: Client) {
    try {
      await deleteClient(client.id);
      toast.success('Client deleted');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete client');
    }
  }

  const filtered = clients.filter(
    (c) =>
      c.company_name.toLowerCase().includes(search.toLowerCase()) ||
      c.contact_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4 flex-wrap w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInternal(!showInternal)}
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

      {isMobile ? (
        <MobileCardList
          items={filtered}
          keyExtractor={(c) => c.id}
          onItemClick={(c) => router.push(`/clients/${c.id}`)}
          renderCard={(c) => (
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{c.company_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{c.contact_name}</span>
                  {c.is_internal && <Badge variant="outline" className="text-[10px]">Internal</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {c.active_projects} project{c.active_projects !== 1 ? 's' : ''} · {formatCurrency(c.total_revenue || 0, c.currency_preference)}
                </p>
              </div>
            </div>
          )}
          emptyMessage="No clients found"
        />
      ) : (
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Projects</th>
                <th className="px-4 py-3 font-medium">Revenue</th>
                <th className="px-4 py-3 font-medium">Internal</th>
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
                      {c.services?.slice(0, 2).map((s: string) => (
                        <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(c.created_at)}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(c)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        entityName={deleteTarget?.company_name || ''}
        entityType="Client"
        onConfirm={() => deleteTarget ? handleDelete(deleteTarget) : Promise.resolve()}
      />
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
