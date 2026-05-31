'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Heading1, Heading2, Heading3, Bold, Italic, Strikethrough,
  List, ListOrdered, CheckSquare, Quote, Code, Minus, Table,
  Link2, Image,
} from 'lucide-react';

interface SlashCommand {
  id: string;
  label: string;
  description: string;
  insertion: string;
  icon: React.ReactNode;
}

const commands: SlashCommand[] = [
  { id: 'h1', label: 'Heading 1', description: 'Large heading', insertion: '# ', icon: <Heading1 className="h-4 w-4" /> },
  { id: 'h2', label: 'Heading 2', description: 'Medium heading', insertion: '## ', icon: <Heading2 className="h-4 w-4" /> },
  { id: 'h3', label: 'Heading 3', description: 'Small heading', insertion: '### ', icon: <Heading3 className="h-4 w-4" /> },
  { id: 'bold', label: 'Bold', description: '**bold text**', insertion: '**bold**', icon: <Bold className="h-4 w-4" /> },
  { id: 'italic', label: 'Italic', description: '_italic text_', insertion: '_italic_', icon: <Italic className="h-4 w-4" /> },
  { id: 'strikethrough', label: 'Strikethrough', description: '~~strikethrough~~', insertion: '~~strikethrough~~', icon: <Strikethrough className="h-4 w-4" /> },
  { id: 'bullet', label: 'Bullet list', description: '- list item', insertion: '- ', icon: <List className="h-4 w-4" /> },
  { id: 'number', label: 'Numbered list', description: '1. list item', insertion: '1. ', icon: <ListOrdered className="h-4 w-4" /> },
  { id: 'checklist', label: 'Checklist', description: '- [ ] task', insertion: '- [ ] ', icon: <CheckSquare className="h-4 w-4" /> },
  { id: 'quote', label: 'Blockquote', description: '> quote', insertion: '> ', icon: <Quote className="h-4 w-4" /> },
  { id: 'code', label: 'Code block', description: '```code```', insertion: '```\n\n```', icon: <Code className="h-4 w-4" /> },
  { id: 'divider', label: 'Divider', description: '---', insertion: '\n---\n', icon: <Minus className="h-4 w-4" /> },
  { id: 'table', label: 'Table', description: '| col | col |', insertion: '| Header | Header |\n|--------|--------|\n| Cell | Cell |', icon: <Table className="h-4 w-4" /> },
  { id: 'link', label: 'Link', description: '[text](url)', insertion: '[text](url)', icon: <Link2 className="h-4 w-4" /> },
  { id: 'image', label: 'Image', description: '![alt](url)', insertion: '![alt](url)', icon: <Image className="h-4 w-4" /> },
];

interface SlashCommandMenuProps {
  search: string;
  onSelect: (insertion: string) => void;
  onClose: () => void;
}

export function SlashCommandMenu({ search, onSelect, onClose }: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => commands.filter((c) => c.id.includes(search.toLowerCase()) || c.label.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filtered[selectedIndex]) onSelect(filtered[selectedIndex].insertion);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [filtered, selectedIndex, onSelect]);

  useEffect(() => {
    const item = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (filtered.length === 0) return null;

  return (
    <div className="z-50 w-64 rounded-lg border bg-popover p-1 shadow-md">
      <ScrollArea className="max-h-64">
        <div ref={listRef} className="space-y-0.5">
          {filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left ${
                i === selectedIndex ? 'bg-accent text-accent-foreground' : 'text-popover-foreground'
              }`}
              onMouseEnter={() => setSelectedIndex(i)}
              onMouseDown={(e) => { e.preventDefault(); onSelect(cmd.insertion); }}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded bg-secondary text-secondary-foreground">{cmd.icon}</span>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{cmd.label}</span>
                <span className="text-xs text-muted-foreground">{cmd.description}</span>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
