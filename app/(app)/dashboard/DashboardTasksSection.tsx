import { getUserTasks } from "@/lib/db/actions/projects"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    Todo: 'bg-zinc-500',
    'In Progress': 'bg-blue-500',
    Bottlenecked: 'bg-amber-500',
    Done: 'bg-emerald-500',
  }
  return colors[status] || 'bg-zinc-500'
}

export async function DashboardTasksSection({ userId }: { userId?: string }) {
  const tasks = await getUserTasks(userId || '')

  if (!tasks || tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">My Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4 text-center">No pending tasks</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">My Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {tasks.slice(0, 5).map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-md p-2">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${getStatusColor(t.status)}`} />
                <p className="text-sm">{t.title}</p>
              </div>
              <span className="text-xs text-muted-foreground">{t.priority}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
