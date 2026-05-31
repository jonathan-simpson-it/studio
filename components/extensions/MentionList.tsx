'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FolderKanban, Building2, FileText, Loader2 } from 'lucide-react';
import type { SuggestionKeyDownProps } from '@tiptap/suggestion';

interface MentionItem {
  id: string;
  label: string;
  type: string;
}

interface MentionListProps {
  items: MentionItem[];
  command: (item: MentionItem) => void;
}

const typeMeta: Record<string, { icon: React.ReactNode; label: string }> = {
  projects: { icon: <FolderKanban className="h-4 w-4" />, label: 'Project' },
  clients: { icon: <Building2 className="h-4 w-4" />, label: 'Client' },
  notes: { icon: <FileText className="h-4 w-4" />, label: 'Note' },
};

export const MentionList = forwardRef<{ onKeyDown: (props: SuggestionKeyDownProps) => boolean }, MentionListProps>(
  function MentionList({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: SuggestionKeyDownProps) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((i) => (i - 1 + items.length) % items.length);
          return true;
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
          if (items[selectedIndex]) {
            command(items[selectedIndex]);
          }
          return true;
        }
        return false;
      },
    }));

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useEffect(() => {
      const child = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
      child?.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex]);

    return (
      <div className="z-50 w-72 rounded-lg border bg-popover p-1 shadow-md">
        <ScrollArea className="max-h-64">
          <div ref={listRef} className="space-y-0.5">
            {items.length === 0 && (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                No results found
              </div>
            )}
            {items.map((item, i) => {
              const meta = typeMeta[item.type] ?? { icon: <FileText className="h-4 w-4" />, label: 'Note' };
              return (
                <button
                  key={item.id}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left ${
                    i === selectedIndex ? 'bg-accent text-accent-foreground' : 'text-popover-foreground'
                  }`}
                  onMouseEnter={() => setSelectedIndex(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    command(item);
                  }}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-secondary text-secondary-foreground">
                    {meta.icon}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{meta.label}</span>
                  </div>
                </button>
              );
            })}
            {items.length > 0 && (
              <div className="border-t mt-1 pt-1">
                <div className="px-2 py-1 text-xs text-muted-foreground">
                  Type @ to search projects, clients, and notes
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }
);
