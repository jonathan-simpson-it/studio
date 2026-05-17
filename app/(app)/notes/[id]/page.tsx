'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getNote, updateNote, deleteNote } from '@/lib/db/actions/notes';
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
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog';
import { MarkdownEditor } from '@/components/shared/MarkdownEditor';
import { AIGenerateButton } from '@/components/shared/AIGenerateButton';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, Lock, Globe, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Note } from '@/types';

export default function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = use(params);
  const [showDelete, setShowDelete] = useState(false);

  const { data: note } = useQuery({
    queryKey: ['note', id],
    queryFn: () => getNote(id),
  });

  async function handleSave(field: string, value: unknown) {
    if (!note) return;
    try {
      await updateNote(note.id, { [field]: value } as Record<string, unknown>);
      queryClient.setQueryData(['note', id], { ...note, [field]: value } as Note);
      toast.success('Note updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    }
  }

  async function handleDelete() {
    if (!note) return;
    try {
      await deleteNote(note.id);
      toast.success('Note deleted');
      router.push('/notes');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete note');
    }
  }

  if (!note) return null;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push('/notes')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Input
          value={note.title}
          onChange={(e) => handleSave('title', e.target.value)}
          className="text-xl font-semibold border-0 px-0 focus-visible:ring-0"
        />
        {note.visibility === 'private' && <Lock className="h-4 w-4 text-muted-foreground" />}
        {note.visibility === 'internal' && <Globe className="h-4 w-4 text-muted-foreground" />}
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>Created {formatDate(note.created_at)}</span>
        {note.updated_at !== note.created_at && <span>Edited {formatDate(note.updated_at)}</span>}
        <Select value={note.visibility} onValueChange={(v) => handleSave('visibility', v)}>
          <SelectTrigger className="w-28 h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="internal">Internal</SelectItem>
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="client-safe">Client-safe</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex justify-end mb-2">
            <AIGenerateButton
              action="autofill-note"
              context={{ title: note.title, existing_body: note.body || '' }}
              onResult={(content) => handleSave('body', content)}
              label="Auto-fill with AI"
            />
          </div>
          <MarkdownEditor
            value={note.body || ''}
            onChange={(v) => handleSave('body', v)}
            minHeight={400}
          />
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        entityName={note.title}
        entityType="Note"
        onConfirm={handleDelete}
      />
    </div>
  );
}
