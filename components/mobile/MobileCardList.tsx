'use client';

import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileCardListItem<T> {
  id: string
  render: (item: T) => React.ReactNode
}

interface MobileCardListProps<T> {
  items: T[]
  keyExtractor: (item: T) => string
  onItemClick?: (item: T) => void
  renderCard: (item: T) => React.ReactNode
  className?: string
  emptyMessage?: string
}

export function MobileCardList<T>({
  items,
  keyExtractor,
  onItemClick,
  renderCard,
  className,
  emptyMessage = 'No items',
}: MobileCardListProps<T>) {
  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('divide-y divide-border', className)}>
      {items.map((item) => (
        <div
          key={keyExtractor(item)}
          className={cn(
            'flex items-center gap-3 px-4 py-3 min-h-[56px]',
            onItemClick && 'cursor-pointer active:bg-accent/50 transition-colors'
          )}
          onClick={() => onItemClick?.(item)}
        >
          <div className="flex-1 min-w-0">
            {renderCard(item)}
          </div>
          {onItemClick && (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </div>
      ))}
    </div>
  );
}
