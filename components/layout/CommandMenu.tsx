'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Users,
  Briefcase,
  FolderKanban,
  CheckSquare,
  StickyNote,
  FileText,
  Receipt,
  LayoutDashboard,
  Calendar,
} from 'lucide-react';
import Fuse from 'fuse.js';

interface SearchItem {
  id: string;
  label: string;
  description?: string;
  href: string;
  icon: React.ReactNode;
}

const defaultItems: SearchItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'leads', label: 'Leads', href: '/leads', icon: <Users className="h-4 w-4" /> },
  { id: 'clients', label: 'Clients', href: '/clients', icon: <Briefcase className="h-4 w-4" /> },
  { id: 'projects', label: 'Projects', href: '/projects', icon: <FolderKanban className="h-4 w-4" /> },
  { id: 'tasks', label: 'Tasks', href: '/tasks', icon: <CheckSquare className="h-4 w-4" /> },
  { id: 'notes', label: 'Notes', href: '/notes', icon: <StickyNote className="h-4 w-4" /> },
  { id: 'proposals', label: 'Proposals', href: '/proposals', icon: <FileText className="h-4 w-4" /> },
  { id: 'invoices', label: 'Invoices', href: '/invoices', icon: <Receipt className="h-4 w-4" /> },
  { id: 'calendar', label: 'Calendar', href: '/calendar', icon: <Calendar className="h-4 w-4" /> },
  { id: 'finance', label: 'Finance', href: '/finance', icon: <Receipt className="h-4 w-4" /> },
];

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchItem[]>(defaultItems);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const fuse = new Fuse(defaultItems, {
    keys: ['label', 'description'],
    threshold: 0.4,
  });

  useEffect(() => {
    if (query.trim()) {
      setResults(fuse.search(query).map((r) => r.item));
    } else {
      setResults(defaultItems);
    }
    setSelectedIndex(0);
  }, [query]);

  const navigate = useCallback(
    (item: SearchItem) => {
      onOpenChange(false);
      setQuery('');
      router.push(item.href);
    },
    [router, onOpenChange]
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!open) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        navigate(results[selectedIndex]);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, results, selectedIndex, navigate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[15%] translate-y-0 max-w-lg">
        <div className="space-y-2">
          <div className="flex items-center border-b pb-2">
            <Input
              placeholder="Search pages…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-0.5">
            {results.map((item, i) => (
              <button
                key={item.id}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  i === selectedIndex ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
                }`}
                onClick={() => navigate(item)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.description && (
                  <span className="ml-auto text-xs text-muted-foreground">{item.description}</span>
                )}
              </button>
            ))}
            {results.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No results found
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
