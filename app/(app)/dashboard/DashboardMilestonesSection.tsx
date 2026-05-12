import { createServer } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    Open: 'bg-zinc-500',
    'In Progress': 'bg-blue-500',
    Completed: 'bg-emerald-500',
  }
  return colors[status] || 'bg-zinc-500'
}

export async function DashboardMilestonesSection() {
  const supabase = await createServer()

  const { data: milestones } = await supabase
    .from("milestones")
    .select("id, title, due_date, status")
    .gte("due_date", new Date().toISOString().split("T")[0])
    .neq("status", "Completed")

  if (!milestones || milestones.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Upcoming Milestones</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4 text-center">No upcoming milestones</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Upcoming Milestones</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  )
}
