import { cn } from '@/lib/utils';

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center rounded border bg-muted px-1.5 py-0.5 text-xs font-mono font-medium text-muted-foreground shadow-[0_1px_0_hsl(var(--border))]',
        className
      )}
    >
      {children}
    </kbd>
  );
}
