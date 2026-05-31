'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { MarkdownPreview } from '@/components/shared/MarkdownPreview';
import { SlashCommandMenu } from '@/components/notes/SlashCommandMenu';
import { MentionPicker } from '@/components/notes/MentionPicker';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  minHeight?: number;
  placeholder?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  minHeight = 200,
  placeholder = 'Start writing…',
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState(false);
  const [menu, setMenu] = useState<'slash' | 'mention' | null>(null);
  const [triggerPos, setTriggerPos] = useState(0);
  const [search, setSearch] = useState('');

  const detectTrigger = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBefore = textarea.value.slice(0, cursorPos);
    const match = textBefore.match(/(?:^|\s)([/@])(\w*)$/);

    if (match) {
      const trigger = match[1];
      const searchText = match[2];
      const triggerIndex = textBefore.lastIndexOf(trigger);
      setMenu(trigger === '@' ? 'mention' : 'slash');
      setSearch(searchText);
      setTriggerPos(triggerIndex);
    } else {
      setMenu(null);
      setSearch('');
    }
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      setTimeout(detectTrigger, 0);
    },
    [onChange, detectTrigger]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (menu) {
        if (e.key === 'Escape') {
          setMenu(null);
          e.preventDefault();
        }
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = value.slice(0, start) + '  ' + value.slice(end);
        onChange(newValue);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        });
      }
    },
    [menu, value, onChange]
  );

  const insertAtCursor = useCallback(
    (insertion: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart;
      const newValue = value.slice(0, triggerPos) + insertion + value.slice(cursorPos);
      onChange(newValue);
      setMenu(null);

      const newPos = triggerPos + insertion.length;
      requestAnimationFrame(() => {
        textarea.setSelectionRange(newPos, newPos);
        textarea.focus();
      });
    },
    [value, triggerPos, onChange]
  );

  // Close menus on click outside
  useEffect(() => {
    if (!menu) return;
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenu(null);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menu]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  if (preview) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPreview(false)}
            className="text-muted-foreground"
          >
            <EyeOff className="mr-1 h-3 w-3" /> Edit
          </Button>
        </div>
        <div className="rounded-md border p-4">
          <MarkdownPreview value={value} />
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setPreview(true)}
          className="text-muted-foreground"
        >
          <Eye className="mr-1 h-3 w-3" /> Preview
        </Button>
      </div>
      <div className="relative rounded-md border">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full resize-y bg-transparent p-4 font-mono text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
          style={{ minHeight: `${minHeight}px` }}
        />
        {menu && (
          <div className="absolute left-2 z-50" style={{ top: 8 }}>
            {menu === 'slash' && (
              <SlashCommandMenu
                search={search}
                onSelect={insertAtCursor}
                onClose={() => setMenu(null)}
              />
            )}
            {menu === 'mention' && (
              <MentionPicker
                search={search}
                onSelect={insertAtCursor}
                onClose={() => setMenu(null)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
