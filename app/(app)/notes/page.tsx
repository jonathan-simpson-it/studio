'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listNotes, createNote, deleteNote } from '@/lib/db/actions/notes';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog';
import { MarkdownEditor } from '@/components/shared/MarkdownEditor';
import { MarkdownPreview } from '@/components/shared/MarkdownPreview';
import { SmartFillButton } from '@/components/shared/SmartFillButton';
import { formatDate } from '@/lib/utils';
import { Search, Plus, Lock, Globe, MoreHorizontal, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Note } from '@/types';

export default function NotesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const { data: notes = [] } = useQuery({
    queryKey: ['notes'],
    queryFn: listNotes,
    enabled: status === 'authenticated',
  });
  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [showNewSheet, setShowNewSheet] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);

  async function handleDelete(note: Note) {
    try {
      await deleteNote(note.id);
      toast.success('Note deleted');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete note');
    }
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
                queryClient.invalidateQueries({ queryKey: ['notes'] });
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
            <CardContent className="p-4 space-y-2 relative">
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium">{n.title}</p>
                <div className="flex items-center gap-1">
                  {n.visibility === 'private' && <Lock className="h-3 w-3 text-muted-foreground" />}
                  {n.visibility === 'internal' && <Globe className="h-3 w-3 text-muted-foreground" />}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(n)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              {n.body && (
                <MarkdownPreview value={n.body} className="max-h-20 overflow-hidden text-xs text-muted-foreground" />
              )}
              <p className="text-[10px] text-muted-foreground">{formatDate(n.created_at)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        entityName={deleteTarget?.title || ''}
        entityType="Note"
        onConfirm={() => deleteTarget ? handleDelete(deleteTarget) : Promise.resolve()}
      />
    </div>
  );
}

function NoteForm({ onSubmit }: { onSubmit: (data: Partial<Note>) => Promise<void> }) {
  const [form, setForm] = useState({ title: '', body: '', visibility: 'internal' });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form as Partial<Note>); }} className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <Label>Smart Fill</Label>
        <SmartFillButton
          action="autofill-note"
          onFill={(fields) => {
            if (fields.title) setForm((f) => ({ ...f, title: fields.title as string }));
            if (fields.body) setForm((f) => ({ ...f, body: fields.body as string }));
          }}
          label="Smart Fill"
          entityLabel="note"
        />
      </div>
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
