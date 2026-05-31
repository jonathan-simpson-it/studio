'use client';

import { Search, LayoutGrid, Table2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
}

export function BoardToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search...',
  view,
  onViewChange,
  filters,
  createButton,
}: BoardToolbarProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-64 pl-9"
          />
        </div>
        {filters?.map((filter) => (
          <Select key={filter.key} value={filter.value} onValueChange={filter.onChange}>
            <SelectTrigger className="w-32">
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
          <Button
            variant={view === 'kanban' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('kanban')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('table')}
          >
            <Table2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {createButton}
    </div>
  );
}
