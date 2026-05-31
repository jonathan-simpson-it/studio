'use client';

import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeatScoreProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

const scoreColors: Record<number, string> = {
  1: 'text-zinc-500',
  2: 'text-zinc-400',
  3: 'text-amber-500',
  4: 'text-orange-500',
  5: 'text-red-500',
};

const scoreBg: Record<number, string> = {
  1: 'bg-zinc-500/10',
  2: 'bg-zinc-400/10',
  3: 'bg-amber-500/10',
  4: 'bg-orange-500/10',
  5: 'bg-red-500/10',
};

const sizes = {
  sm: { icon: 'h-3 w-3', text: 'text-[10px]', badge: 'h-5 w-5' },
  md: { icon: 'h-3.5 w-3.5', text: 'text-xs', badge: 'h-6 w-6' },
  lg: { icon: 'h-4 w-4', text: 'text-sm', badge: 'h-7 w-7' },
};

export function HeatScore({ score, size = 'sm' }: HeatScoreProps) {
  const clamped = Math.max(1, Math.min(5, Math.round(score)));
  const color = scoreColors[clamped] || 'text-zinc-500';
  const bg = scoreBg[clamped] || 'bg-zinc-500/10';
  const dims = sizes[size];

  return (
    <div
      className={cn('inline-flex items-center justify-center gap-1 rounded-full', dims.badge, bg, color)}
      aria-label={`Heat score: ${clamped} out of 5`}
    >
      <Flame className={dims.icon} fill="currentColor" />
      <span className={cn('font-semibold leading-none', dims.text)}>{clamped}</span>
    </div>
  );
}
