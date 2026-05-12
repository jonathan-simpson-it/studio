'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { formatRelative } from '@/lib/utils';
import {
  CheckSquare,
  Users,
  Receipt,
  FolderKanban,
  Flag,
  Activity,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import type { Task, Lead, Invoice, Project, Milestone, ActivityLog } from '@/types';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    Todo: 'bg-zinc-500',
    'In Progress': 'bg-blue-500',
    Bottlenecked: 'bg-amber-500',
    Done: 'bg-emerald-500',
    Sent: 'bg-blue-500',
    Overdue: 'bg-red-500',
    Paid: 'bg-emerald-500',
    Planning: 'bg-zinc-500',
    'Waiting on Client': 'bg-amber-500',
    Review: 'bg-purple-500',
    Completed: 'bg-emerald-500',
    New: 'bg-blue-500',
    Contacted: 'bg-zinc-500',
    Discovery: 'bg-purple-500',
    'Proposal Sent': 'bg-amber-500',
    Negotiation: 'bg-orange-500',
    Won: 'bg-emerald-500',
    Lost: 'bg-red-500',
  };
  return colors[status] || 'bg-zinc-500';
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}

function ActivityItem({ entry }: { entry: ActivityLog & { actor?: { full_name?: string } } }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
        {entry.actor?.full_name?.slice(0, 2).toUpperCase() || 'UN'}
      </div>
      <div className="flex-1 space-y-0.5">
        <p className="text-sm">
          <span className="font-medium">{entry.actor?.full_name || 'Someone'}</span>{' '}
          <span className="text-muted-foreground">
            {entry.action.replace(/_/g, ' ')} {entry.entity_type}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">{formatRelative(entry.created_at)}</p>
      </div>
    </div>
  );
}

interface DashboardClientProps {
  user: { id?: string; email?: string | null; name?: string | null } | null;
  tasks: Task[];
  leads: Lead[];
  invoices: Invoice[];
  projects: Project[];
  milestones: Milestone[];
  activity: (ActivityLog & { actor?: { full_name?: string } })[];
}

export function DashboardClient({
  user,
  tasks,
  leads,
  invoices,
  projects,
  milestones,
  activity,
}: DashboardClientProps) {
  const name = user?.name || user?.email?.split('@')[0] || 'Founder';
  const greeting = getGreeting();

  const overdueTasks = tasks.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'Done');
  const staleLeads = leads.filter(
    (l) => !l.last_contacted_at || new Date(l.last_contacted_at) < new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  );
  const invoiceTotal = invoices.reduce((sum, inv) => sum + inv.total, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {greeting}, {name}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening across your agency.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard
          title="Active Projects"
          value={projects.length}
          subtitle={projects.filter((p) => p.status === 'In Progress').length + ' in progress'}
          icon={FolderKanban}
          href="/projects"
        />
        <StatCard
          title="My Tasks"
          value={tasks.filter((t) => t.status !== 'Done').length}
          subtitle={overdueTasks.length + ' overdue'}
          icon={CheckSquare}
          href="/tasks"
        />
        <StatCard
          title="Stale Leads"
          value={staleLeads.length}
          subtitle="Untouched for 14+ days"
          icon={Users}
          href="/leads"
        />
        <StatCard
          title="Outstanding Invoices"
          value={invoiceTotal.toLocaleString('en-US', { style: 'currency', currency: 'HKD', minimumFractionDigits: 0 })}
          subtitle={invoices.length + ' unpaid'}
          icon={Receipt}
          href="/invoices"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <div className="lg:col-span-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Upcoming Milestones</CardTitle>
            </CardHeader>
            <CardContent>
              {milestones.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No upcoming milestones</p>
              ) : (
                <div className="space-y-3">
                  {milestones.slice(0, 5).map((m) => (
                    <div key={m.id} className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{m.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.due_date ? new Date(m.due_date).toLocaleDateString() : 'No due date'}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`${getStatusColor(m.status)} text-white border-0 text-[10px]`}
                      >
                        {m.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                {activity.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
                ) : (
                  activity.map((entry) => <ActivityItem key={entry.id} entry={entry} />)
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No active projects</p>
              ) : (
                <div className="space-y-3">
                  {projects.slice(0, 5).map((p) => (
                    <Link key={p.id} href={`/projects/${p.id}`}>
                      <div className="flex items-center justify-between rounded-md p-2 hover:bg-accent transition-colors cursor-pointer">
                        <p className="text-sm font-medium">{p.name}</p>
                        <Badge
                          variant="outline"
                          className={`${getStatusColor(p.status)} text-white border-0 text-[10px]`}
                        >
                          {p.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">My Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.filter((t) => t.status !== 'Done').length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No pending tasks</p>
              ) : (
                <div className="space-y-2">
                  {tasks
                    .filter((t) => t.status !== 'Done')
                    .slice(0, 5)
                    .map((t) => (
                      <div key={t.id} className="flex items-center justify-between rounded-md p-2">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${getStatusColor(t.status)}`} />
                          <p className="text-sm">{t.title}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{t.priority}</span>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
