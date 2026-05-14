import { getActiveProjects } from "@/lib/db/actions/projects"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    Planning: 'bg-zinc-500',
    'In Progress': 'bg-blue-500',
    'Waiting on Client': 'bg-amber-500',
    Review: 'bg-purple-500',
    Completed: 'bg-emerald-500',
  }
  return colors[status] || 'bg-zinc-500'
}

export async function DashboardProjectsSection() {
  const projects = await getActiveProjects()

  if (!projects || projects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4 text-center">No active projects</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  )
}
