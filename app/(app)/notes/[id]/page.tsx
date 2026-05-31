'use client';

import { use, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getNote, updateNote, deleteNote, togglePin, getNoteBacklinks, getAllTags } from '@/lib/db/actions/notes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog';
import { AIGenerateButton } from '@/components/shared/AIGenerateButton';
import { formatDate } from '@/lib/utils';
import {
  ArrowLeft, Lock, Globe, Trash2, Pin, PinOff,
  PanelRightClose, PanelRightOpen, Tag, Link2, ListTree,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Note } from '@/types';

const RichTextEditor = dynamic(
  () => import('@/components/shared/RichTextEditor').then((m) => ({ default: m.RichTextEditor })),
  { ssr: false, loading: () => <Skeleton className="h-[400px] w-full rounded-md" /> }
);

export default function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = use(params);
  const [showDelete, setShowDelete] = useState(false);
  const [showToc, setShowToc] = useState(true);
  const [tagInput, setTagInput] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);

  const { data: note } = useQuery({
    queryKey: ['note', id],
    queryFn: () => getNote(id),
    enabled: !!id,
  });

  const { data: backlinks } = useQuery({
    queryKey: ['note-backlinks', id],
    queryFn: () => getNoteBacklinks(id),
    enabled: !!id,
  });

  const { data: allTags = [] } = useQuery({
    queryKey: ['all-tags'],
    queryFn: getAllTags,
    staleTime: 60_000,
  });

  const updateListCache = useCallback(
    (noteId: string, field: string, value: unknown) => {
      queryClient.setQueriesData({ queryKey: ['notes', 'list'], type: 'active' }, (old: unknown) => {
        if (!old || typeof old !== 'object') return old;
        const data = old as { pages: Array<{ notes: Note[]; pinned: Note[] }> };
        return {
          ...data,
          pages: data.pages.map((p) => ({
            ...p,
            notes: p.notes.map((n) => (n.id === noteId ? { ...n, [field]: value } : n)),
            pinned: p.pinned.map((n) => (n.id === noteId ? { ...n, [field]: value } : n)),
          })),
        };
      });
    },
    [queryClient]
  );

  async function handleSave(field: string, value: unknown) {
    if (!note) return;
    try {
      await updateNote(note.id, { [field]: value } as Record<string, unknown>);
      queryClient.setQueryData(['note', id], { ...note, [field]: value } as Note);
      updateListCache(note.id, field, value);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    }
  }

  async function handleTogglePin() {
    if (!note) return;
    try {
      const updated = await togglePin(note.id);
      if (updated) {
        queryClient.setQueryData(['note', id], updated);
        updateListCache(note.id, 'is_pinned', updated.is_pinned);
        toast.success(updated.is_pinned ? 'Note pinned' : 'Note unpinned');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function handleAddTag(tag: string) {
    if (!note || note.tags.includes(tag)) return;
    await handleSave('tags', [...note.tags, tag]);
  }

  async function handleRemoveTag(tag: string) {
    if (!note) return;
    await handleSave('tags', note.tags.filter((t) => t !== tag));
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

  const toc = useMemo(() => {
    if (!note?.body) return [];
    const regex = /^(#{1,6})\s+(.+)$/gm;
    const headings: Array<{ level: number; text: string }> = [];
    let match;
    while ((match = regex.exec(note.body)) !== null) {
      headings.push({ level: match[1].length, text: match[2] });
    }
    return headings;
  }, [note?.body]);

  const availableTags = useMemo(
    () => allTags.filter((t) => !note?.tags.includes(t)),
    [allTags, note?.tags]
  );

  if (!note) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-10 w-full max-w-xl" />
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-[400px] w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0 max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push('/notes')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTogglePin}
              className="text-muted-foreground"
            >
              {note.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Input
            value={note.title}
            onChange={(e) => handleSave('title', e.target.value)}
            className="text-xl font-semibold border-0 px-0 focus-visible:ring-0"
          />
          {note.visibility === 'private' && <Lock className="h-4 w-4 text-muted-foreground shrink-0" />}
          {note.visibility === 'internal' && <Globe className="h-4 w-4 text-muted-foreground shrink-0" />}
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
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

        <div className="flex items-center gap-2 flex-wrap">
          <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {note.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs gap-1">
              {tag}
              <button
                className="text-muted-foreground hover:text-foreground leading-none"
                onClick={() => handleRemoveTag(tag)}
              >
                &times;
              </button>
            </Badge>
          ))}
          <div className="relative">
            <input
              ref={tagInputRef}
              className="h-6 w-20 rounded-md border border-input bg-transparent px-1 text-xs outline-none focus:ring-1 focus:ring-ring"
              placeholder="+tag"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (tagInput.trim()) {
                    handleAddTag(tagInput.trim());
                    setTagInput('');
                  }
                }
              }}
              onBlur={() => {
                if (tagInput.trim()) {
                  handleAddTag(tagInput.trim());
                  setTagInput('');
                }
              }}
            />
            {tagInput && availableTags.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-40 rounded-md border bg-popover p-1 shadow-md z-10 max-h-32 overflow-y-auto">
                {availableTags
                  .filter((t) => t.toLowerCase().includes(tagInput.toLowerCase()))
                  .map((t) => (
                    <button
                      key={t}
                      className="block w-full text-left px-2 py-1 text-xs rounded hover:bg-accent"
                      onMouseDown={(e) => { e.preventDefault(); handleAddTag(t); setTagInput(''); }}
                    >
                      {t}
                    </button>
                  ))}
              </div>
            )}
          </div>
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
            <RichTextEditor
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

      <div className="hidden lg:block w-56 shrink-0">
        <div className="sticky top-20 space-y-4">
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setShowToc(!showToc)}
          >
            {showToc ? <PanelRightClose className="h-3 w-3" /> : <PanelRightOpen className="h-3 w-3" />}
            {showToc ? 'Hide TOC' : 'Show TOC'}
          </button>

          {showToc && (
            <>
              {toc.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                    <ListTree className="h-3 w-3" /> On this page
                  </h4>
                  <ScrollArea className="max-h-60">
                    <div className="space-y-0.5">
                      {toc.map((h, i) => (
                        <button
                          key={i}
                          className="block w-full text-left text-xs text-muted-foreground hover:text-foreground truncate rounded px-1 py-0.5 hover:bg-accent"
                          style={{ paddingLeft: `${(h.level - 1) * 12 + 4}px` }}
                          onClick={() => {
                            const headingId = h.text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
                            document.getElementById(headingId)?.scrollIntoView({ behavior: 'smooth' });
                          }}
                        >
                          {h.text}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {backlinks && backlinks.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                    <Link2 className="h-3 w-3" /> Linked from
                  </h4>
                  <div className="space-y-0.5">
                    {backlinks.slice(0, 10).map((bl) => (
                      <button
                        key={bl.id}
                        className="block w-full text-left text-xs text-muted-foreground hover:text-foreground truncate rounded px-1 py-0.5 hover:bg-accent"
                        onClick={() => router.push(`/notes/${bl.id}`)}
                      >
                        {bl.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {toc.length === 0 && (!backlinks || backlinks.length === 0) && (
                <p className="text-xs text-muted-foreground">
                  Use headings (#) to see a table of contents here.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
