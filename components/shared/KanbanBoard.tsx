'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  useDroppable,
  PointerSensor,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface KanbanBoardProps<T> {
  columns: readonly string[] | string[]
  items: T[]
  getItemId: (item: T) => string
  getItemStatus: (item: T) => string
  onStatusChange?: (itemId: string, newStatus: string) => void
  renderCard: (item: T, isDragOverlay?: boolean) => React.ReactNode
  renderColumnExtra?: (column: string) => React.ReactNode
  columnColors?: Record<string, string>
  emptyMessage?: string
}

function BoardColumn<T>({
  column,
  items,
  getItemId,
  getItemStatus,
  renderCard,
  renderColumnExtra,
  columnColors,
  emptyMessage,
}: {
  column: string
  items: T[]
  getItemId: (item: T) => string
  getItemStatus: (item: T) => string
  renderCard: (item: T, isDragOverlay?: boolean) => React.ReactNode
  renderColumnExtra?: (column: string) => React.ReactNode
  columnColors?: Record<string, string>
  emptyMessage?: string
}) {
  const itemIds = items.map(getItemId);
  const { isOver, setNodeRef } = useDroppable({ id: column });

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className={cn('h-2 w-2 rounded-full', columnColors?.[column] || 'bg-zinc-500')} />
        <h3 className="text-sm font-semibold">{column}</h3>
        <Badge variant="secondary" className="text-[10px] ml-auto">
          {items.length}
        </Badge>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 space-y-3 min-h-[200px] rounded-lg bg-muted/30 p-3 transition-colors',
          isOver && 'ring-2 ring-primary/40 bg-accent/50'
        )}
      >
        <SortableContext items={itemIds} strategy={rectSortingStrategy}>
          {items.map((item) => (
            <KanbanCard key={getItemId(item)} id={getItemId(item)} data={{ status: getItemStatus(item), item }}>
              {renderCard(item)}
            </KanbanCard>
          ))}
        </SortableContext>
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">{emptyMessage}</p>
        )}
        {renderColumnExtra?.(column)}
      </div>
    </div>
  );
}

export function KanbanBoard<T>({
  columns,
  items,
  getItemId,
  getItemStatus,
  onStatusChange,
  renderCard,
  renderColumnExtra,
  columnColors,
  emptyMessage = 'No items',
}: KanbanBoardProps<T>) {
  const [activeItem, setActiveItem] = useState<T | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const item = event.active.data.current?.item as T | undefined;
    if (item) setActiveItem(item);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveItem(null);
      const { active, over } = event;
      if (!over) return;

      const activeStatus = active.data.current?.status as string | undefined;
      if (!activeStatus) return;

      const overId = over.id as string;
      let targetStatus: string | null = null;

      if ((columns as readonly string[]).includes(overId)) {
        targetStatus = overId;
      } else {
        const overStatus = over.data.current?.status as string | undefined;
        if (overStatus) {
          targetStatus = overStatus;
        }
      }

      const activeId = active.id as string;
      if (targetStatus && targetStatus !== activeStatus) {
        onStatusChange?.(activeId, targetStatus);
      }
    },
    [columns, onStatusChange]
  );

  const itemsByColumn = useMemo(() => {
    const map: Record<string, T[]> = {};
    for (const col of columns) {
      map[col] = items.filter((item) => getItemStatus(item) === col);
    }
    return map;
  }, [columns, items, getItemStatus]);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <BoardColumn
            key={col}
            column={col}
            items={itemsByColumn[col] || []}
            getItemId={getItemId}
            getItemStatus={getItemStatus}
            renderCard={renderCard}
            renderColumnExtra={renderColumnExtra}
            columnColors={columnColors}
            emptyMessage={emptyMessage}
          />
        ))}
      </div>

      <DragOverlay>
        {activeItem ? (
          <div className="w-72">
            {renderCard(activeItem, true)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
