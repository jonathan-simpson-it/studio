'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { listNotes, createNote, deleteNote, getAllTags } from '@/lib/db/actions/notes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog';
import { MarkdownPreview } from '@/components/shared/MarkdownPreview';
import { useIsMobile } from '@/hooks/useIsMobile';
import { formatDate } from '@/lib/utils';
import {
  Search, Plus, Lock, Globe, MoreHorizontal, Trash2,
  Pin, PinOff, Loader2, Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Note } from '@/types';

export default function NotesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['notes', 'list', debouncedSearch, sort, activeTags],
    queryFn: ({ pageParam }) =>
      listNotes({ cursor: pageParam, query: debouncedSearch || undefined, sort: sort as 'newest' | 'oldest' | 'title', tags: activeTags.length ? activeTags : undefined }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled: status === 'authenticated',
  });

  // Infinite scroll observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // All tags for suggestions
  const { data: allTags = [] } = useQuery({
    queryKey: ['all-tags'],
    queryFn: getAllTags,
    staleTime: 60_000,
    enabled: status === 'authenticated',
  });

  const pinned = useMemo(() => data?.pages[0]?.pinned ?? [], [data]);
  const notes = useMemo(() => data?.pages.flatMap((p) => p.notes) ?? [], [data]);

  const handleDelete = useCallback(async (note: Note) => {
    try {
      await deleteNote(note.id);
      toast.success('Note deleted');
      setDeleteTarget(null);
      queryClient.setQueryData(['notes', 'list', debouncedSearch, sort, activeTags], (old: typeof data) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((p) => ({
            ...p,
            notes: p.notes.filter((n) => n.id !== note.id),
            pinned: p.pinned.filter((n) => n.id !== note.id),
          })),
        };
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete note');
    }
  }, [queryClient, debouncedSearch, sort, activeTags]);

  const toggleTag = useCallback((tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9"
            />
          </div>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="title">Title A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          disabled={isCreating}
          onClick={async () => {
            if (isCreating || !session?.user?.id) return;
            setIsCreating(true);
            try {
              const note = await createNote({ title: 'Untitled', author_id: session.user.id } as Record<string, unknown>);
              router.push(`/notes/${note.id}`);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Failed to create note');
              setIsCreating(false);
            }
          }}
        >
          {isCreating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          New Note
        </Button>
      </div>

      {/* Tag filter bar */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Tag key="tag-filter-icon" className="h-4 w-4 text-muted-foreground" />
          {allTags.filter(Boolean).map((tag) => (
            <Badge
              key={tag}
              variant={activeTags.includes(tag) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Pinned notes */}
      {pinned.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
            <PinOff className="h-3 w-3" /> Pinned
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pinned.map((n) => (
              <NoteCard key={n.id} note={n} onDelete={setDeleteTarget} />
            ))}
          </div>
          {notes.length > 0 && (
            <hr className="border-muted-foreground/20" />
          )}
        </div>
      )}

      {/* Notes grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {notes.map((n) => (
          <NoteCard key={n.id} note={n} onDelete={setDeleteTarget} />
        ))}
      </div>

      {/* Loading / sentinel */}
      <div ref={sentinelRef} className="flex justify-center py-4">
        {isFetchingNextPage && (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        )}
        {!hasNextPage && notes.length > 0 && (
          <p className="text-xs text-muted-foreground">All notes loaded</p>
        )}
        {!isFetching && notes.length === 0 && !debouncedSearch && (
          <p className="text-sm text-muted-foreground">No notes yet. Create one!</p>
        )}
        {!isFetching && notes.length === 0 && debouncedSearch && (
          <p className="text-sm text-muted-foreground">No notes match your search.</p>
        )}
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

function NoteCard({ note, onDelete }: { note: Note; onDelete: (n: Note) => void }) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-accent/50"
      onClick={() => router.push(`/notes/${note.id}`)}
    >
      <CardContent className="p-4 space-y-2 relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {note.is_pinned && <Pin className="h-3 w-3 text-muted-foreground shrink-0" />}
            <p className="text-sm font-medium truncate">{note.title}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {note.visibility === 'private' && <Lock className="h-3 w-3 text-muted-foreground" />}
            {note.visibility === 'internal' && <Globe className="h-3 w-3 text-muted-foreground" />}
            {isMobile ? (
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="p-4" onClick={(e) => e.stopPropagation()}>
                  <SheetHeader><SheetTitle className="sr-only">Note options</SheetTitle></SheetHeader>
                  <button
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={() => { onDelete(note); setSheetOpen(false); }}
                  >
                    <Trash2 className="h-4 w-4" /> Delete Note
                  </button>
                </SheetContent>
              </Sheet>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem className="text-destructive" onClick={() => onDelete(note)}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        {note.body && (
          <MarkdownPreview value={note.body} className="max-h-20 overflow-hidden text-xs text-muted-foreground" />
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {note.tags.filter(Boolean).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
              {tag}
            </Badge>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">{formatDate(note.created_at)}</p>
      </CardContent>
    </Card>
  );
}


