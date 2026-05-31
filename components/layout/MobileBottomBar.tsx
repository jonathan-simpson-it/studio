'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Calendar, CheckSquare, Inbox, Ellipsis } from 'lucide-react';

const tabs = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '#menu', label: 'More', icon: Ellipsis },
];

export function MobileBottomBar({ onMoreClick }: { onMoreClick?: () => void }) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-around border-t bg-background md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Bottom navigation"
    >
      {tabs.map((tab) => {
        const isActive = tab.href !== '#menu' && pathname.startsWith(tab.href);
        if (tab.href === '#menu') {
          return (
            <button
              key={tab.href}
              onClick={onMoreClick}
              className="flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[44px] text-muted-foreground hover:text-foreground transition-colors"
              aria-label="More navigation options"
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        }
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[44px] transition-colors',
              isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
