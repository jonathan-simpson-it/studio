'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface MobileStageListProps<T> {
  stages: readonly string[] | string[]
  items: T[]
  getItemStage: (item: T) => string
  renderCard: (item: T) => React.ReactNode
  stageColors?: Record<string, string>
  emptyMessage?: string
  stageEmptyMessage?: string
}

export function MobileStageList<T>({
  stages,
  items,
  getItemStage,
  renderCard,
  stageColors,
  emptyMessage = 'No items',
  stageEmptyMessage = 'No items in this stage',
}: MobileStageListProps<T>) {
  const [activeStage, setActiveStage] = useState(stages[0]);

  const filtered = items.filter((item) => getItemStage(item) === activeStage);

  const stageCounts: Record<string, number> = {};
  for (const stage of stages) {
    stageCounts[stage as string] = items.filter((item) => getItemStage(item) === stage).length;
  }

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex gap-1.5 overflow-x-auto px-4 py-3 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
        {stages.map((stage) => (
          <button
            key={stage}
            onClick={() => setActiveStage(stage)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors min-h-[32px]',
              activeStage === stage
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {stage}
            <span className={cn('ml-1 text-xs', activeStage === stage ? 'opacity-80' : '')}>
              ({stageCounts[stage] || 0})
            </span>
          </button>
        ))}
      </div>

      <div className="divide-y divide-border">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {stageEmptyMessage}
          </div>
        ) : (
          filtered.map((item, i) => (
            <div key={i} className="px-4 py-3">
              {renderCard(item)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
