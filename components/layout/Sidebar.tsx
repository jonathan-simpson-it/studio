'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FolderKanban,
  CheckSquare,
  StickyNote,
  FileText,
  Receipt,
  DollarSign,
  Settings,
  Search,
  Calendar,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/clients', label: 'Clients', icon: Briefcase },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/notes', label: 'Notes', icon: StickyNote },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
];

const navItemsSecondary = [
  { href: '/proposals', label: 'Proposals', icon: FileText },
  { href: '/invoices', label: 'Invoices', icon: Receipt },
  { href: '/finance', label: 'Finance', icon: DollarSign },
];

export function Sidebar({ onCmdK }: { onCmdK?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-full w-60 flex-col border-r bg-background">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Image src="/JSC-logo.svg" alt="JSC" width={24} height={24} className="h-6 w-6 rounded" />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">Studio</span>
          <span className="text-[9px] text-muted-foreground">Jonathan Simpson &amp; Co.</span>
        </div>
      </div>

      <div className="px-2 pt-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={onCmdK}
        >
          <Search className="h-4 w-4" />
          <span>Search</span>
          <kbd className="ml-auto inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </Button>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-2">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <span
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
                pathname.startsWith(item.href)
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </span>
          </Link>
        ))}
      </nav>

      <Separator />

      <nav className="space-y-1 px-2 py-2">
        {navItemsSecondary.map((item) => (
          <Link key={item.href} href={item.href}>
            <span
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
                pathname.startsWith(item.href)
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </span>
          </Link>
        ))}
      </nav>

      <Separator />

      <div className="px-2 py-2">
        <Link href="/settings">
          <span
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
              pathname.startsWith('/settings')
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground'
            )}
          >
            <Settings className="h-4 w-4" />
            Settings
          </span>
        </Link>
      </div>
    </aside>
  );
}
