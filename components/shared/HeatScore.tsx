'use client';

import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeatScoreProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

const colors: Record<number, string> = {
  1: 'text-zinc-700',
  2: 'text-zinc-500',
  3: 'text-zinc-400',
  4: 'text-amber-500',
  5: 'text-red-500',
};

const sizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function HeatScore({ score, size = 'sm' }: HeatScoreProps) {
  const clamped = Math.max(1, Math.min(5, score));
  const color = colors[clamped] || 'text-zinc-500';
  const dimension = sizes[size];

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Flame
          key={i}
          className={cn(
            dimension,
            i < clamped ? color : 'text-zinc-700',
            'transition-colors'
          )}
          fill={i < clamped ? 'currentColor' : 'none'}
        />
      ))}
    </div>
  );
}
