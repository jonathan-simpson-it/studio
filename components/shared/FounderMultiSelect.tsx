'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listFounders } from '@/lib/db/actions/settings';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChevronsUpDown, Sparkles } from 'lucide-react';

interface FounderMultiSelectProps {
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function FounderMultiSelect({ value, onChange, placeholder = 'Assign founders...', disabled }: FounderMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const { data: founders = [] } = useQuery({
    queryKey: ['founders'],
    queryFn: listFounders,
  });

  const selectedFounders = founders.filter((f) => value.includes(f.id));

  function toggleFounder(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            'h-auto min-h-9 w-full justify-between gap-2 px-3 py-2',
            !selectedFounders.length && 'text-muted-foreground'
          )}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            {selectedFounders.length === 0 && (
              <span className="text-sm">{placeholder}</span>
            )}
            {selectedFounders.length > 0 && (
              <div className="flex -space-x-2">
                {selectedFounders.slice(0, 4).map((f) => (
                  <Avatar key={f.id} className="h-6 w-6 border-2 border-background">
                    <AvatarImage src={f.avatar_url || undefined} alt={f.name} />
                    <AvatarFallback className="text-[9px]">
                      {f.name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {selectedFounders.length > 4 && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium border-2 border-background">
                    +{selectedFounders.length - 4}
                  </span>
                )}
              </div>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="space-y-1">
          {founders.map((f) => (
            <label
              key={f.id}
              className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
            >
              <Checkbox
                checked={value.includes(f.id)}
                onCheckedChange={() => toggleFounder(f.id)}
              />
              <Avatar className="h-7 w-7">
                <AvatarImage src={f.avatar_url || undefined} alt={f.name} />
                <AvatarFallback className="text-xs">
                  {f.name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm leading-tight">{f.name}</span>
                <span className="text-xs text-muted-foreground">{f.email}</span>
              </div>
            </label>
          ))}
          <div className="border-t pt-1 mt-1">
            <div className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm opacity-50 cursor-not-allowed">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">AI Agent</span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 ml-auto">Coming soon</Badge>
            </div>
          </div>
          {selectedFounders.length > 0 && (
            <div className="border-t pt-1 mt-1">
              <button
                className="w-full text-left px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-sm"
                onClick={() => onChange([])}
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
