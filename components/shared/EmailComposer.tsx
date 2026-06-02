'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bold, Italic, Link, Palette, Code, Eye, EyeOff } from 'lucide-react';

interface EmailComposerProps {
  value: string;
  onChange: (html: string) => void;
  minHeight?: number;
  placeholder?: string;
}

const TEXT_COLORS = [
  { label: 'White', value: '#fafafa' },
  { label: 'Muted', value: '#a1a1aa' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Teal', value: '#4f98a3' },
];

export function EmailComposer({ value, onChange, minHeight = 200, placeholder = 'Write your email...' }: EmailComposerProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showHtml, setShowHtml] = useState(false);
  const [htmlSource, setHtmlSource] = useState(value);
  const isInternalUpdate = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
      editorRef.current.innerHTML = value || '';
    }
  }, []);

  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  }, []);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      isInternalUpdate.current = true;
      onChange(html);
      requestAnimationFrame(() => { isInternalUpdate.current = false; });
    }
  }, [onChange]);

  const handleHtmlChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setHtmlSource(val);
    isInternalUpdate.current = true;
    onChange(val);
    requestAnimationFrame(() => { isInternalUpdate.current = false; });
  }, [onChange]);

  const toggleHtml = useCallback(() => {
    if (showHtml) {
      if (editorRef.current) {
        editorRef.current.innerHTML = htmlSource;
      }
    } else {
      setHtmlSource(editorRef.current?.innerHTML || '');
    }
    setShowHtml(!showHtml);
  }, [showHtml, htmlSource]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 p-1 rounded-md border bg-muted/50">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => exec('bold')}
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => exec('italic')}
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Text color">
              <Palette className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            <div className="grid grid-cols-7 gap-1">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c.value}
                  className="h-7 w-7 rounded-md border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: c.value }}
                  onClick={() => exec('foreColor', c.value)}
                  title={c.label}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => {
            const url = window.prompt('Enter link URL:');
            if (url) exec('createLink', url);
          }}
          title="Insert link"
        >
          <Link className="h-3.5 w-3.5" />
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={toggleHtml}
        >
          {showHtml ? <EyeOff className="h-3 w-3" /> : <Code className="h-3 w-3" />}
          {showHtml ? 'WYSIWYG' : 'HTML'}
        </Button>
      </div>

      {showHtml ? (
        <textarea
          className="w-full rounded-md border bg-transparent p-3 text-sm font-mono leading-relaxed resize-y"
          style={{ minHeight: `${minHeight}px` }}
          value={htmlSource}
          onChange={handleHtmlChange}
          placeholder={placeholder}
        />
      ) : (
        <div
          ref={editorRef}
          className="w-full rounded-md border bg-transparent p-3 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring cursor-text overflow-y-auto [&:empty:before]:text-muted-foreground [&:empty:before]:content-[attr(data-placeholder)]"
          style={{ minHeight: `${minHeight}px` }}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          onInput={handleInput}
        />
      )}
    </div>
  );
}
