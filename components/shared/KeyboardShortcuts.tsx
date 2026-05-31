'use client';

import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const shortcuts = [
  { keys: ['⌘K', 'Ctrl+K'], description: 'Open command palette' },
  { keys: ['N'], description: 'Create new task' },
  { keys: ['L'], description: 'Create new lead' },
  { keys: ['P'], description: 'Create new project' },
  { keys: ['?'], description: 'Show keyboard shortcuts' },
  { keys: ['Esc'], description: 'Close modal or drawer' },
];

interface KeyboardShortcutsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcuts({ open, onOpenChange }: KeyboardShortcutsProps) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate faster
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {shortcuts.map((s) => (
            <div key={s.description} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.description}</span>
              <kbd className="inline-flex items-center gap-1 rounded border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                {s.keys.map((k) => (
                  <span key={k}>{k}</span>
                ))}
              </kbd>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => {
              onOpenChange(false);
              router.push('/shortcuts');
            }}
          >
            See all shortcuts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
