'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

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
  const [preview, setPreview] = useState(false);

  return (
    <div className="space-y-2" data-color-mode="dark">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setPreview(!preview)}
          className="text-muted-foreground"
        >
          {preview ? (
            <>
              <EyeOff className="mr-1 h-3 w-3" /> Edit
            </>
          ) : (
            <>
              <Eye className="mr-1 h-3 w-3" /> Preview
            </>
          )}
        </Button>
      </div>
      <div className="rounded-md border">
        <MDEditor
          value={value}
          onChange={(v) => onChange(v || '')}
          preview={preview ? 'preview' : 'edit'}
          height={minHeight}
          textareaProps={{ placeholder }}
        />
      </div>
    </div>
  );
}
