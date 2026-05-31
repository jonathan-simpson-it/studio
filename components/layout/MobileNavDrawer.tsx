'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getInboxStats } from '@/lib/db/actions/email';
import {
  LayoutDashboard, Users, Briefcase, FolderKanban, CheckSquare,
  StickyNote, FileText, Receipt, DollarSign, Settings,
  Search, Calendar, Inbox, GitPullRequestArrow,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/issues', label: 'Issues', icon: GitPullRequestArrow },
  { href: '/clients', label: 'Clients', icon: Briefcase },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/notes', label: 'Notes', icon: StickyNote },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/proposals', label: 'Proposals', icon: FileText },
  { href: '/invoices', label: 'Invoices', icon: Receipt },
  { href: '/finance', label: 'Finance', icon: DollarSign },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface MobileNavDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch?: () => void;
}

export function MobileNavDrawer({ open, onOpenChange, onSearch }: MobileNavDrawerProps) {
  const pathname = usePathname();
  const { data: stats } = useQuery({
    queryKey: ['inbox-stats'],
    queryFn: getInboxStats,
    staleTime: 10 * 60 * 1000,
  });
  const unreadCount = stats?.unread ?? 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-left text-sm font-semibold">Studio</SheetTitle>
        </SheetHeader>

        <div className="px-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={() => { onSearch?.(); onOpenChange(false); }}
          >
            <Search className="h-4 w-4" />
            <span>Search</span>
            <kbd className="ml-auto inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-xs font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </Button>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-2" aria-label="Mobile navigation">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} onClick={() => onOpenChange(false)}>
                <span
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent min-h-[44px]',
                    isActive
                      ? 'bg-accent text-accent-foreground border-l-2 border-primary pl-[10px]'
                      : 'text-muted-foreground pl-3'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                  {item.href === '/inbox' && unreadCount > 0 && (
                    <Badge variant="default" className="ml-auto h-5 min-w-5 px-1.5 text-xs">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </span>
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
