'use client';

import { Button } from '@/components/ui/button';
import { Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

interface BulkActionBarProps {
  count: number;
  onClear: () => void;
  onDelete?: () => Promise<void>;
  actions?: { label: string; onClick: () => Promise<void> }[];
}

export function BulkActionBar({ count, onClear, onDelete, actions }: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center border-t bg-background px-4 py-3 shadow-lg md:left-60 md:bottom-auto md:top-14 md:border-b md:border-t-0">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{count} selected</span>
        <Button variant="ghost" size="sm" onClick={onClear} aria-label="Clear selection">
          <X className="h-4 w-4 mr-1" /> Clear
        </Button>
        <div className="flex items-center gap-2">
          {actions?.map((action) => (
            <Button key={action.label} variant="secondary" size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          ))}
          {onDelete && (
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
