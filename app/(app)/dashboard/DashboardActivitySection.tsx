import { createServer } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatRelative } from "@/lib/utils"

function ActivityItem({ entry }: { entry: { id: string; action: string; entity_type: string; created_at: string; actor?: { full_name?: string } } }) {
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
  )
}

export async function DashboardActivitySection() {
  const supabase = await createServer()

  const { data: activity } = await supabase
    .from("activity_log")
    .select("id, entity_type, action, created_at, actor_id, actor:users(full_name)")
    .order("created_at", { ascending: false })
    .limit(10)

  const typed = (activity || []) as { id: string; entity_type: string; action: string; created_at: string; actor?: { full_name?: string } }[]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          {typed.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
          ) : (
            typed.map((entry) => <ActivityItem key={entry.id} entry={entry} />)
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
