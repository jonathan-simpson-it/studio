import { auth } from "@/auth"
import { createServer } from "@/lib/supabase/server"
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
  const supabase = await createServer()

  const [projectsResult, tasksResult, leadsResult, invoicesResult] = await Promise.all([
    supabase.from("projects").select("status").neq("status", "Completed"),
    supabase.from("tasks").select("status, due_date").eq("assignee_id", session?.user?.id).neq("status", "Done"),
    supabase.from("leads").select("last_contacted_at").not("stage", "in", '("Won","Lost")'),
    supabase.from("invoices").select("total, status").in("status", ["Sent", "Overdue"]),
  ])

  const projects = projectsResult.data || []
  const tasks = tasksResult.data || []
  const leads = leadsResult.data || []
  const invoices = invoicesResult.data || []

  const overdueTasks = tasks.filter((t) => t.due_date && new Date(t.due_date) < new Date())
  const staleLeads = leads.filter(
    (l) => !l.last_contacted_at || new Date(l.last_contacted_at) < new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  )
  const invoiceTotal = invoices.reduce((sum, inv) => sum + inv.total, 0)

  return (
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
  )
}
