'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AIActionType } from '@/types';

interface SmartFillButtonProps {
  action: AIActionType;
  onFill: (fields: Record<string, string | string[] | object[]>) => void;
  context?: Record<string, unknown>;
  label?: string;
  entityLabel?: string;
}

export function SmartFillButton({
  action,
  onFill,
  context = {},
  label = 'Smart Fill',
  entityLabel = 'form',
}: SmartFillButtonProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'quick' | 'braindump'>('quick');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFill() {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          context: {
            ...context,
            input: input.trim(),
            mode: mode === 'braindump'
              ? 'extract all relevant fields from the longer text provided'
              : 'extract fields precisely from this short phrase',
          },
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Smart fill failed');
      }

      const data = await response.json();
      let content = data.content;

      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        content = jsonMatch[1];
      }

      const fields = JSON.parse(content);
      onFill(fields);

      const fieldCount = Object.keys(fields).filter((k) => {
        const v = fields[k];
        return v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
      }).length;

      toast.success(`Filled ${fieldCount} field${fieldCount !== 1 ? 's' : ''}`);
      setOpen(false);
      setInput('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Smart fill failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Sparkles className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Smart Fill {entityLabel}</p>
            <div className="flex items-center gap-1 rounded-md border p-0.5">
              <button
                type="button"
                onClick={() => setMode('quick')}
                className={`rounded px-2 py-0.5 text-xs ${mode === 'quick' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
              >
                Quick
              </button>
              <button
                type="button"
                onClick={() => setMode('braindump')}
                className={`rounded px-2 py-0.5 text-xs ${mode === 'braindump' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
              >
                Brain Dump
              </button>
            </div>
          </div>

          <Textarea
            placeholder={mode === 'quick' ? 'e.g. Fix login bug in auth module, high priority' : 'Paste detailed notes or context...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={mode === 'quick' ? 2 : 5}
          />

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={handleFill}
              disabled={loading || !input.trim()}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Filling...</>
              ) : (
                <><Sparkles className="mr-2 h-3 w-3" />Fill Form</>
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
