'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { searchEntities } from '@/lib/db/actions/search';
import { FolderKanban, Building2, FileText, Loader2 } from 'lucide-react';
import type { SearchEntityResult } from '@/lib/db/actions/search';

interface MentionPickerProps {
  search: string;
  onSelect: (insertion: string) => void;
  onClose: () => void;
}

type EntityGroup = keyof SearchEntityResult;

interface ResultItem {
  type: EntityGroup;
  label: string;
  insertion: string;
}

const groupMeta: Record<EntityGroup, { icon: React.ReactNode; label: string }> = {
  projects: { icon: <FolderKanban className="h-4 w-4" />, label: 'Project' },
  clients: { icon: <Building2 className="h-4 w-4" />, label: 'Client' },
  notes: { icon: <FileText className="h-4 w-4" />, label: 'Note' },
};

export function MentionPicker({ search, onSelect, onClose }: MentionPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery<SearchEntityResult>({
    queryKey: ['search-entities', search],
    queryFn: () => searchEntities(search),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const results = useMemo(() => {
    if (!data) return [];
    const items: ResultItem[] = [];
    for (const group of ['projects', 'clients', 'notes'] as EntityGroup[]) {
      for (const entity of (data as SearchEntityResult)[group]) {
        const name = 'name' in entity ? (entity as { name: string }).name : (entity as { title: string }).title;
        items.push({
          type: group,
          label: name,
          insertion: `[${groupMeta[group].label}: ${name}](${entity.path})`,
        });
      }
    }
    return items;
  }, [data]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search, results.length]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if ((e.key === 'Enter' || e.key === 'Tab') && results[selectedIndex]) {
        e.preventDefault();
        onSelect(results[selectedIndex].insertion);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [results, selectedIndex, onSelect]);

  useEffect(() => {
    const item = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (isLoading) {
    return (
      <div className="z-50 w-72 rounded-lg border bg-popover p-3 shadow-md">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Searching…
        </div>
      </div>
    );
  }

  return (
    <div className="z-50 w-72 rounded-lg border bg-popover p-1 shadow-md">
      <ScrollArea className="max-h-64">
        <div ref={listRef} className="space-y-0.5">
          {results.length === 0 && (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">No results</div>
          )}
          {results.map((item, i) => (
            <button
              key={`${item.type}-${item.label}-${i}`}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left ${
                i === selectedIndex ? 'bg-accent text-accent-foreground' : 'text-popover-foreground'
              }`}
              onMouseEnter={() => setSelectedIndex(i)}
              onMouseDown={(e) => { e.preventDefault(); onSelect(item.insertion); }}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded bg-secondary text-secondary-foreground">
                {groupMeta[item.type].icon}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">{item.label}</span>
                <span className="text-xs text-muted-foreground">{groupMeta[item.type].label}</span>
              </div>
            </button>
          ))}
          <div className="border-t mt-1 pt-1">
            <div className="px-2 py-1 text-xs text-muted-foreground">
              Type @ to search projects, clients, and notes
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
