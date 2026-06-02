'use client';

import { Search, LayoutGrid, Table2, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface FilterOption {
  label: string
  value: string
}

interface FilterConfig {
  key: string
  label: string
  placeholder: string
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
}

interface BoardToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  view: 'kanban' | 'table'
  onViewChange: (view: 'kanban' | 'table') => void
  filters?: FilterConfig[]
  createButton?: React.ReactNode
  onExport?: () => void
}

export function BoardToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search...',
  view,
  onViewChange,
  filters,
  createButton,
  onExport,
}: BoardToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2 md:gap-4">
        {onExport && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={onExport} aria-label="Export to CSV">
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export to CSV</TooltipContent>
          </Tooltip>
        )}
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full sm:w-64 pl-9"
          />
        </div>
        {filters?.map((filter) => (
          <Select key={filter.key} value={filter.value} onValueChange={filter.onChange}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder={filter.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {filter.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
        <div className="flex items-center rounded-lg border p-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={view === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange('kanban')}
                aria-label="Kanban view"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Kanban view</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={view === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange('table')}
                aria-label="Table view"
              >
                <Table2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Table view</TooltipContent>
          </Tooltip>
        </div>
      </div>
      {createButton}
    </div>
  );
}
