import { auth } from "@/auth"
import { getProjectStats } from "@/lib/db/actions/projects"
import { getUserTasks } from "@/lib/db/actions/projects"
import { getLeadStats } from "@/lib/db/actions/leads"
import { getOutstandingInvoices } from "@/lib/db/actions/invoices"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckSquare, Users, Receipt, FolderKanban } from "lucide-react"
import Link from "next/link"

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  href: string
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
  )
}

export async function DashboardStatCards() {
  const session = await auth()

  const [projectStats, userTasks, staleLeads, outstandingInvoices] = await Promise.all([
    getProjectStats(),
    getUserTasks(session?.user?.id || ''),
    getLeadStats(),
    getOutstandingInvoices(),
  ])

  const overdueTasks = userTasks.filter((t: any) => t.due_date && new Date(t.due_date) < new Date())

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <StatCard
        title="Active Projects"
        value={projectStats.activeCount}
        subtitle={projectStats.inProgressCount + ' in progress'}
        icon={FolderKanban}
        href="/projects"
      />
      <StatCard
        title="My Tasks"
        value={userTasks.length}
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
        value={outstandingInvoices.total.toLocaleString('en-US', { style: 'currency', currency: 'HKD', minimumFractionDigits: 0 })}
        subtitle={outstandingInvoices.invoices.length + ' unpaid'}
        icon={Receipt}
        href="/invoices"
      />
    </div>
  )
}
