import { Suspense } from "react"
import { auth } from "@/auth"
import { CronTasks } from "./CronTasks"
import { DashboardStatCards } from "./DashboardStatCards"
import { DashboardMilestonesSection } from "./DashboardMilestonesSection"
import { DashboardActivitySection } from "./DashboardActivitySection"
import { DashboardProjectsSection } from "./DashboardProjectsSection"
import { DashboardTasksSection } from "./DashboardTasksSection"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = {
  title: "Dashboard — Studio",
}

function StatCardsFallback() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-3 w-20 mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function CardFallback() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-36" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default async function DashboardPage() {
  const session = await auth()
  const name = session?.user?.name || session?.user?.email?.split('@')[0] || 'Founder'

  return (
    <div className="space-y-6">
      <CronTasks />
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {name}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening across your agency.
        </p>
      </div>

      <Suspense fallback={<StatCardsFallback />}>
        <DashboardStatCards />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-7">
        <div className="lg:col-span-4 space-y-4">
          <Suspense fallback={<CardFallback />}>
            <DashboardMilestonesSection />
          </Suspense>
          <Suspense fallback={<CardFallback />}>
            <DashboardActivitySection />
          </Suspense>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <Suspense fallback={<CardFallback />}>
            <DashboardProjectsSection />
          </Suspense>
          <Suspense fallback={<CardFallback />}>
            <DashboardTasksSection userId={session?.user?.id} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
