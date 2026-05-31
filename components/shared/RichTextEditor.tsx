'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import { Markdown } from 'tiptap-markdown';
import { SlashCommand } from '@/components/extensions/SlashCommand';
import { MentionExtension } from '@/components/extensions/MentionExtension';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  minHeight?: number;
  placeholder?: string;
}

export function RichTextEditor({
  value,
  onChange,
  minHeight = 400,
  placeholder = 'Start writing…',
}: RichTextEditorProps) {
  const isExternalUpdate = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const debouncedOnChange = useCallback(
    (mdValue: string) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        onChange(mdValue);
      }, 500);
    },
    [onChange]
  );

  const editor = useEditor({
    content: value,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Highlight,
      Typography,
      Markdown,
      SlashCommand,
      MentionExtension,
    ],
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
        style: `min-height: ${minHeight}px`,
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) continue;
            const reader = new FileReader();
            reader.onload = (e) => {
              const url = e.target?.result as string;
              editor?.chain().focus().setImage({ src: url }).run();
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
      handleDrop: (_view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        for (const file of Array.from(files)) {
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            const reader = new FileReader();
            reader.onload = (e) => {
              const url = e.target?.result as string;
              editor?.chain().focus().setImage({ src: url }).run();
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (isExternalUpdate.current) {
        isExternalUpdate.current = false;
        return;
      }
      try {
        const mdValue = (ed.storage as any).markdown.getMarkdown();
        debouncedOnChange(mdValue);
      } catch {}
    },
  });

  useEffect(() => {
    if (!editor) return;
    try {
      const currentMd = (editor.storage as any).markdown?.getMarkdown?.() ?? '';
      const normalizedCurrent = currentMd.trim().replace(/\r\n/g, '\n');
      const normalizedValue = value.trim().replace(/\r\n/g, '\n');
      if (normalizedCurrent !== normalizedValue) {
        isExternalUpdate.current = true;
        editor.commands.setContent(value);
      }
    } catch {}
  }, [value, editor]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  if (!editor) return null;

  return (
    <div className="relative">
      <EditorContent editor={editor} />
    </div>
  );
}
