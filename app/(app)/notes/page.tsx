'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { listNotes, createNote } from '@/lib/db/actions/notes';
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
import { MarkdownEditor } from '@/components/shared/MarkdownEditor';
import { formatDate } from '@/lib/utils';
import { Search, Plus, Lock, Globe } from 'lucide-react';
import { toast } from 'sonner';
import type { Note } from '@/types';

export default function NotesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [showNewSheet, setShowNewSheet] = useState(false);

  useEffect(() => {
    if (session?.user?.id) load();
  }, [session]);

  async function load() {
    if (!session?.user?.id) return;

    const data = await listNotes();
    if (data) setNotes(data);
  }

  const filtered = notes.filter((n) => {
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !n.body?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterClient && n.client_id !== filterClient) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search notes..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-72 pl-9" />
          </div>
        </div>

        <Sheet open={showNewSheet} onOpenChange={setShowNewSheet}>
          <SheetTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Note</Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-lg">
            <SheetHeader><SheetTitle>New Note</SheetTitle></SheetHeader>
            <NoteForm onSubmit={async (data) => {
              const userId = session?.user?.id;
              try {
                await createNote({ ...data, author_id: userId } as Record<string, unknown>);
                toast.success('Note created');
                setShowNewSheet(false);
                load();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Failed to create note');
              }
            }} />
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((n) => (
          <Card
            key={n.id}
            className="cursor-pointer transition-colors hover:bg-accent/50"
            onClick={() => router.push(`/notes/${n.id}`)}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium">{n.title}</p>
                {n.visibility === 'private' && <Lock className="h-3 w-3 text-muted-foreground" />}
                {n.visibility === 'internal' && <Globe className="h-3 w-3 text-muted-foreground" />}
              </div>
              {n.body && (
                <p className="text-xs text-muted-foreground line-clamp-3">{n.body.slice(0, 200)}</p>
              )}
              <p className="text-[10px] text-muted-foreground">{formatDate(n.created_at)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function NoteForm({ onSubmit }: { onSubmit: (data: Partial<Note>) => Promise<void> }) {
  const [form, setForm] = useState({ title: '', body: '', visibility: 'internal' });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form as Partial<Note>); }} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label>Body (markdown)</Label>
        <MarkdownEditor value={form.body} onChange={(v) => setForm({ ...form, body: v })} minHeight={200} />
      </div>
      <div className="space-y-2">
        <Label>Visibility</Label>
        <Select value={form.visibility} onValueChange={(v) => setForm({ ...form, visibility: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="internal">Internal</SelectItem>
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="client-safe">Client-safe</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full">Create Note</Button>
    </form>
  );
}
