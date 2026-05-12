"use client"

import dynamic from "next/dynamic"
import { Timer } from "lucide-react"
import { Button } from "@/components/ui/button"

const UserMenu = dynamic(() => import("./UserMenu"), { ssr: false })
const NotificationsMenu = dynamic(() => import("./NotificationsMenu"), { ssr: false })

interface TopBarProps {
  title: string
}

export function TopBar({ title }: TopBarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <div>
        <h1 className="text-sm font-medium">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Timer className="h-4 w-4" />
        </Button>

        <NotificationsMenu />
        <UserMenu />
      </div>
    </header>
  )
}
