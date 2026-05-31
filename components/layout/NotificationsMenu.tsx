'use client';

import { useQuery } from '@tanstack/react-query';
import { Bell, CheckSquare, Users, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { formatRelative } from '@/lib/utils';
import { getNotifications } from '@/lib/db/actions/email';
import type { NotificationItem } from '@/lib/db/actions/email';

const icons: Record<string, React.ReactNode> = {
  overdue_task: <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />,
  stale_lead: <Users className="mt-0.5 h-4 w-4 shrink-0 text-warning" />,
  invoice_due: <Receipt className="mt-0.5 h-4 w-4 shrink-0 text-info" />,
  invoice_overdue: <Receipt className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />,
};

export default function NotificationsMenu() {
  const router = useRouter();

  const { data: notifications = [] } = useQuery<NotificationItem[]>({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    refetchInterval: 300_000,
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground relative" aria-label={`Notifications${notifications.length > 0 ? ` (${notifications.length})` : ''}`}>
          <Bell className="h-4 w-4" />
          {notifications.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-medium text-destructive-foreground">
              {notifications.length > 9 ? '9+' : notifications.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No new notifications
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.slice(0, 10).map((n) => (
              <button
                key={n.id}
                className="flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                onClick={() => router.push(n.entity_href)}
              >
                {icons[n.type] || <Bell className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatRelative(n.created_at)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
