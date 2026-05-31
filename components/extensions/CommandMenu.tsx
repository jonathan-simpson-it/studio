'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare, Quote, Code, Minus, Table,
  Image,
} from 'lucide-react';
import type { SuggestionKeyDownProps } from '@tiptap/suggestion';

export interface CommandItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: (props: { editor: import('@tiptap/core').Editor }) => void;
}

const commandItems: CommandItem[] = [
  {
    title: 'Heading 1',
    description: 'Large section heading',
    icon: <Heading1 className="h-4 w-4" />,
    command: ({ editor }) => editor.chain().focus().setNode('heading', { level: 1 }).run(),
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: <Heading2 className="h-4 w-4" />,
    command: ({ editor }) => editor.chain().focus().setNode('heading', { level: 2 }).run(),
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    icon: <Heading3 className="h-4 w-4" />,
    command: ({ editor }) => editor.chain().focus().setNode('heading', { level: 3 }).run(),
  },
  {
    title: 'Bullet List',
    description: 'Create a bullet list',
    icon: <List className="h-4 w-4" />,
    command: ({ editor }) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: 'Numbered List',
    description: 'Create a numbered list',
    icon: <ListOrdered className="h-4 w-4" />,
    command: ({ editor }) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: 'Checklist',
    description: 'Create a task list',
    icon: <CheckSquare className="h-4 w-4" />,
    command: ({ editor }) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    title: 'Blockquote',
    description: 'Insert a quote',
    icon: <Quote className="h-4 w-4" />,
    command: ({ editor }) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    title: 'Code Block',
    description: 'Insert a code block',
    icon: <Code className="h-4 w-4" />,
    command: ({ editor }) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: 'Divider',
    description: 'Insert a horizontal rule',
    icon: <Minus className="h-4 w-4" />,
    command: ({ editor }) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    title: 'Table',
    description: 'Insert a 3x3 table',
    icon: <Table className="h-4 w-4" />,
    command: ({ editor }) =>
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    title: 'Image',
    description: 'Insert an image',
    icon: <Image className="h-4 w-4" />,
    command: ({ editor }) => {
      const url = window.prompt('Image URL');
      if (url) editor.chain().focus().setImage({ src: url }).run();
    },
  },
];

export function getSlashCommandItems(): CommandItem[] {
  return commandItems;
}

interface CommandMenuProps {
  items: CommandItem[];
  command: (item: CommandItem) => void;
}

export const CommandMenu = forwardRef<{ onKeyDown: (props: SuggestionKeyDownProps) => boolean }, CommandMenuProps>(
  function CommandMenu({ items, command }, ref) {
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

    if (items.length === 0) return null;

    return (
      <div className="z-50 w-64 rounded-lg border bg-popover p-1 shadow-md">
        <ScrollArea className="max-h-64">
          <div ref={listRef} className="space-y-0.5">
            {items.map((item, i) => (
              <button
                key={item.title}
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
                  {item.icon}
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{item.title}</span>
                  <span className="text-xs text-muted-foreground">{item.description}</span>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }
);
