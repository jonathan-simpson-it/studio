'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
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
import { MarkdownEditor } from '@/components/shared/MarkdownEditor';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, Lock, Globe } from 'lucide-react';
import { toast } from 'sonner';
import type { Note } from '@/types';

export default function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient();
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);

  useEffect(() => { load(); }, [params]);

  async function load() {
    const { id } = await params;
    const { data } = await supabase.from('notes').select('*').eq('id', id).single();
    if (data) setNote(data);
  }

  async function handleSave(field: string, value: unknown) {
    if (!note) return;
    const { error } = await supabase.from('notes').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', note.id);
    if (error) { toast.error(error.message); return; }
    setNote({ ...note, [field]: value } as Note);
    toast.success('Note updated');
  }

  if (!note) return null;

  return (
    <div className="max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/notes')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

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
          <MarkdownEditor
            value={note.body || ''}
            onChange={(v) => handleSave('body', v)}
            minHeight={400}
          />
        </CardContent>
      </Card>
    </div>
  );
}
