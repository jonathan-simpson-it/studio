"use client"

import dynamic from "next/dynamic"
import { Timer, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"

const UserMenu = dynamic(() => import("./UserMenu"), { ssr: false })
const NotificationsMenu = dynamic(() => import("./NotificationsMenu"), { ssr: false })

interface TopBarProps {
  title: string
  onMenuClick?: () => void
}

export function TopBar({ title, onMenuClick }: TopBarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden text-muted-foreground" onClick={onMenuClick} aria-label="Open navigation menu">
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-sm font-medium">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground" aria-label="Time tracking">
                <Timer className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Time tracking</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <NotificationsMenu />
        <UserMenu />
      </div>
    </header>
  )
}
