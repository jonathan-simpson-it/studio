'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, ChevronsUpDown, HelpCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { listFounders } from '@/lib/db/actions/settings';

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#e11d48',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
];

interface Founder {
  id: string;
  name: string;
  email: string;
}

interface GoogleCal {
  id: string;
  summary: string;
  backgroundColor?: string;
}

interface CreateCalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateCalendarDialog({ open, onOpenChange, onCreated }: CreateCalendarDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [type, setType] = useState<'personal' | 'shared'>('personal');
  const [syncToGoogle, setSyncToGoogle] = useState(true);
  const [founders, setFounders] = useState<Founder[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [googleCals, setGoogleCals] = useState<GoogleCal[]>([]);
  const [selectedGoogleCal, setSelectedGoogleCal] = useState<string>('');
  const [createNewGoogleCal, setCreateNewGoogleCal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);

  useEffect(() => {
    if (open) {
      listFounders().then(setFounders).catch(() => {});
      fetchGoogleCals();
    }
  }, [open]);

  async function fetchGoogleCals() {
    try {
      const res = await fetch('/api/google/calendars');
      if (res.ok) {
        const data = await res.json();
        setGoogleCals(data);
      }
    } catch {}
  }

  function toggleMember(id: string) {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  function addAllFounders() {
    setSelectedMembers(founders.map((f) => f.id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name is required'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          color,
          type,
          member_ids: type === 'shared' ? selectedMembers : undefined,
          sync_to_google: syncToGoogle,
          google_calendar_id: syncToGoogle && !createNewGoogleCal ? selectedGoogleCal : undefined,
          create_new_google_calendar: syncToGoogle && createNewGoogleCal,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create calendar');
      }

      toast.success('Calendar created');
      onOpenChange(false);
      onCreated();
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create calendar');
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setName('');
    setColor('#3b82f6');
    setType('personal');
    setSyncToGoogle(true);
    setSelectedMembers([]);
    setSelectedGoogleCal('');
    setCreateNewGoogleCal(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>New Calendar</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Team Events" />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex items-center gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cn(
                    'h-6 w-6 rounded-full border-2 transition-all',
                    color === c ? 'border-foreground scale-110' : 'border-transparent'
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as 'personal' | 'shared')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="shared">Shared</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === 'shared' && (
            <div className="space-y-2">
              <Label>Members</Label>
              <Popover open={memberOpen} onOpenChange={setMemberOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between">
                    {selectedMembers.length === 0
                      ? 'Select members...'
                      : `${selectedMembers.length} member${selectedMembers.length > 1 ? 's' : ''} selected`}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-2">
                  <div className="space-y-1">
                    <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={addAllFounders}>
                      <Check className="mr-2 h-3 w-3" />
                      All founders
                    </Button>
                    <div className="h-px bg-border my-1" />
                    {founders.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                        onClick={() => toggleMember(f.id)}
                      >
                        <div className={cn(
                          'flex h-4 w-4 items-center justify-center rounded-sm border',
                          selectedMembers.includes(f.id) ? 'bg-foreground border-foreground' : 'border-input'
                        )}>
                          {selectedMembers.includes(f.id) && <Check className="h-3 w-3 text-background" />}
                        </div>
                        <span>{f.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{f.email}</span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {founders.filter((f) => selectedMembers.includes(f.id)).map((f) => (
                    <span key={f.id} className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs">
                      {f.name.split(' ')[0]}
                      <button type="button" onClick={() => toggleMember(f.id)}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="cursor-pointer">Google Calendar Sync</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger type="button">
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      Events will be pushed to your Google Calendar
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch checked={syncToGoogle} onCheckedChange={setSyncToGoogle} />
            </div>

            {syncToGoogle && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="create-new"
                    checked={createNewGoogleCal}
                    onChange={(e) => setCreateNewGoogleCal(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor="create-new" className="text-sm cursor-pointer">Create a new Google Calendar</Label>
                </div>

                {!createNewGoogleCal && (
                  <Select value={selectedGoogleCal} onValueChange={setSelectedGoogleCal}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a Google Calendar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {googleCals.map((gcal) => (
                        <SelectItem key={gcal.id} value={gcal.id}>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: gcal.backgroundColor || '#3b82f6' }} />
                            {gcal.summary}
                          </div>
                        </SelectItem>
                      ))}
                      {googleCals.length === 0 && (
                        <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                          No Google Calendars found. Connect Google in Settings.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                )}

                {createNewGoogleCal && (
                  <p className="text-xs text-muted-foreground">
                    A new Google Calendar named &ldquo;{name || 'Untitled'}&rdquo; will be created.
                    {type === 'shared' && ' It will be shared with all selected members.'}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); reset(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating...' : 'Create Calendar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
