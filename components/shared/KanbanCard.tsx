'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data,
  });

  if (isDragOverlay) {
    return (
      <div className={cn('cursor-grab shadow-lg rotate-2', className)} onClick={onClick}>
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
      {...attributes}
      {...listeners}
      className={cn('cursor-grab active:cursor-grabbing', className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
