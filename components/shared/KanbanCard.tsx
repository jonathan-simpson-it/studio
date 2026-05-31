'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KanbanCardProps {
  id: string
  data?: Record<string, unknown>
  children: React.ReactNode
  isDragOverlay?: boolean
  onClick?: (e: React.MouseEvent) => void
  className?: string
}

export function KanbanCard({ id, data, children, isDragOverlay, onClick, className }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, setActivatorNodeRef } = useSortable({
    id,
    data,
  });

  if (isDragOverlay) {
    return (
      <div className={cn('shadow-lg rotate-2', className)} onClick={onClick}>
        {children}
      </div>
    );
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('group relative', className)}
      onClick={onClick}
    >
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="absolute -left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-accent cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      {children}
    </div>
  );
}
