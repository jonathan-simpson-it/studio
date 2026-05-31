'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  MessageSquare,
  DollarSign,
} from 'lucide-react';
import Fuse from 'fuse.js';

interface SearchItem {
  id: string;
  label: string;
  description?: string;
  searchText: string;
  href: string;
  icon: React.ReactNode;
  type: string;
  sortKey: number;
}

interface EntityConfig {
  queryKeys: (string | boolean)[][];
  type: string;
  sortKey: number;
  icon: React.ReactNode;
  labelFields: string[];
  descriptionFields: string[];
  extraSearchFields: string[];
  linkPattern: string;
}

const MAX_PER_TYPE = 8;
const MAX_TOTAL = 40;

const pageItems: SearchItem[] = [
  { id: 'nav-dashboard', label: 'Dashboard', searchText: '', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" />, type: 'Pages', sortKey: 0 },
  { id: 'nav-leads', label: 'Leads', searchText: '', href: '/leads', icon: <Users className="h-4 w-4" />, type: 'Pages', sortKey: 1 },
  { id: 'nav-clients', label: 'Clients', searchText: '', href: '/clients', icon: <Briefcase className="h-4 w-4" />, type: 'Pages', sortKey: 2 },
  { id: 'nav-projects', label: 'Projects', searchText: '', href: '/projects', icon: <FolderKanban className="h-4 w-4" />, type: 'Pages', sortKey: 3 },
  { id: 'nav-tasks', label: 'Tasks', searchText: '', href: '/tasks', icon: <CheckSquare className="h-4 w-4" />, type: 'Pages', sortKey: 4 },
  { id: 'nav-notes', label: 'Notes', searchText: '', href: '/notes', icon: <StickyNote className="h-4 w-4" />, type: 'Pages', sortKey: 5 },
  { id: 'nav-calendar', label: 'Calendar', searchText: '', href: '/calendar', icon: <Calendar className="h-4 w-4" />, type: 'Pages', sortKey: 6 },
  { id: 'nav-proposals', label: 'Proposals', searchText: '', href: '/proposals', icon: <FileText className="h-4 w-4" />, type: 'Pages', sortKey: 7 },
  { id: 'nav-invoices', label: 'Invoices', searchText: '', href: '/invoices', icon: <Receipt className="h-4 w-4" />, type: 'Pages', sortKey: 8 },
  { id: 'nav-finance', label: 'Finance', searchText: '', href: '/finance', icon: <DollarSign className="h-4 w-4" />, type: 'Pages', sortKey: 9 },
];

const entityConfigs: EntityConfig[] = [
  {
    queryKeys: [['leads']],
    type: 'Leads',
    sortKey: 10,
    icon: <Users className="h-4 w-4" />,
    labelFields: ['company_name', 'contact_name'],
    descriptionFields: ['contact_name', 'email', 'stage'],
    extraSearchFields: ['phone', 'notes', 'source'],
    linkPattern: '/leads/:id',
  },
  {
    queryKeys: [['clients'], ['clients', false], ['clients', true]],
    type: 'Clients',
    sortKey: 20,
    icon: <Briefcase className="h-4 w-4" />,
    labelFields: ['company_name', 'contact_name'],
    descriptionFields: ['contact_name', 'email'],
    extraSearchFields: ['phone', 'billing_name'],
    linkPattern: '/clients/:id',
  },
  {
    queryKeys: [['projects']],
    type: 'Projects',
    sortKey: 30,
    icon: <FolderKanban className="h-4 w-4" />,
    labelFields: ['name'],
    descriptionFields: ['status'],
    extraSearchFields: ['description'],
    linkPattern: '/projects/:id',
  },
  {
    queryKeys: [['tasks']],
    type: 'Tasks',
    sortKey: 40,
    icon: <CheckSquare className="h-4 w-4" />,
    labelFields: ['title'],
    descriptionFields: ['status', 'priority'],
    extraSearchFields: ['description'],
    linkPattern: '/tasks',
  },
  {
    queryKeys: [['notes']],
    type: 'Notes',
    sortKey: 50,
    icon: <StickyNote className="h-4 w-4" />,
    labelFields: ['title'],
    descriptionFields: [],
    extraSearchFields: ['body'],
    linkPattern: '/notes/:id',
  },
  {
    queryKeys: [['proposals']],
    type: 'Proposals',
    sortKey: 60,
    icon: <FileText className="h-4 w-4" />,
    labelFields: ['proposal_number'],
    descriptionFields: ['status'],
    extraSearchFields: ['cover_note', 'scope_of_work'],
    linkPattern: '/proposals/:id',
  },
  {
    queryKeys: [['invoices']],
    type: 'Invoices',
    sortKey: 70,
    icon: <Receipt className="h-4 w-4" />,
    labelFields: ['invoice_number'],
    descriptionFields: ['status'],
    extraSearchFields: ['payment_notes'],
    linkPattern: '/invoices/:id',
  },
  {
    queryKeys: [['inbox']],
    type: 'Messages',
    sortKey: 80,
    icon: <MessageSquare className="h-4 w-4" />,
    labelFields: ['subject', 'from_name', 'from_email'],
    descriptionFields: ['from_name', 'from_email'],
    extraSearchFields: ['snippet', 'ai_summary'],
    linkPattern: '/inbox',
  },
];

const typeOrder = ['Pages', ...entityConfigs.map((c) => c.type)];

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max).trimEnd() + '\u2026';
}

function buildSearchItems(queryClient: ReturnType<typeof useQueryClient>): SearchItem[] {
  const items = pageItems.map((p) => ({ ...p }));
  const seen = new Set<string>();

  for (const config of entityConfigs) {
    let count = 0;

    for (const queryKey of config.queryKeys) {
      if (count >= MAX_PER_TYPE) break;
      const data = queryClient.getQueryData(queryKey);
      if (!data) continue;
      const entities = Array.isArray(data) ? data : [data];

      for (const raw of entities) {
        if (count >= MAX_PER_TYPE) break;
        const entity = raw as Record<string, unknown>;
        const id = String(entity.id ?? entity._id ?? '');
        const prefixedId = `${config.type.toLowerCase()}-${id}`;
        if (!id || seen.has(prefixedId)) continue;
        seen.add(prefixedId);

        const label = entity[config.labelFields[0]] as string | undefined
          || entity[config.labelFields[1]] as string | undefined
          || config.type;
        const desc = config.descriptionFields
          .map((f) => entity[f])
          .filter((v): v is string => typeof v === 'string' && v.length > 0)
          .join(' \u00b7 ');
        const extra = config.extraSearchFields
          .map((f) => {
            const v = entity[f];
            return Array.isArray(v) ? (v as string[]).join(' ') : String(v ?? '');
          })
          .filter(Boolean)
          .join(' ');

        items.push({
          id: prefixedId,
          label: truncate(label, 80),
          description: desc ? truncate(desc, 120) : undefined,
          searchText: extra,
          href: config.linkPattern.includes(':id')
            ? config.linkPattern.replace(':id', id)
            : config.linkPattern,
          icon: config.icon,
          type: config.type,
          sortKey: config.sortKey,
        });
        count++;
      }
    }
  }

  items.sort((a, b) => {
    if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
    return a.label.localeCompare(b.label);
  });

  return items;
}

function renderGroupedResults(
  results: SearchItem[],
  selectedIndex: number,
  onSelect: (item: SearchItem) => void,
  onHover: (index: number) => void,
) {
  const groups: { type: string; items: SearchItem[] }[] = [];
  let lastType = '';
  for (const item of results) {
    if (item.type !== lastType) {
      groups.push({ type: item.type, items: [item] });
      lastType = item.type;
    } else {
      groups[groups.length - 1].items.push(item);
    }
  }

  const nodes: React.ReactNode[] = [];
  let flatIndex = 0;

  for (const group of groups) {
    nodes.push(
      <div key={`hdr-${group.type}`} className="flex items-center gap-2 px-3 py-1.5">
        <span className="text-xs font-semibold text-muted-foreground/70">{group.type}</span>
        <div className="flex-1 border-t" />
      </div>,
    );
    for (const item of group.items) {
      const idx = flatIndex++;
      nodes.push(
        <button
          key={item.id}
          className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
            idx === selectedIndex ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
          }`}
          onClick={() => onSelect(item)}
          onMouseEnter={() => onHover(idx)}
        >
          {item.icon}
          <span className="truncate">{item.label}</span>
          {item.description && (
            <span className="ml-auto truncate text-xs text-muted-foreground/60 max-w-[180px]">
              {item.description}
            </span>
          )}
        </button>,
      );
    }
  }

  return nodes;
}

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const searchItems = useMemo(() => {
    if (!open) return pageItems;
    return buildSearchItems(queryClient);
  }, [open, queryClient]);

  const fuse = useMemo(
    () =>
      new Fuse(searchItems, {
        keys: [
          { name: 'label', weight: 2 },
          { name: 'description', weight: 1 },
          { name: 'searchText', weight: 0.5 },
        ],
        threshold: 0.4,
      }),
    [searchItems],
  );

  const results = useMemo(() => {
    if (!query.trim()) return searchItems;

    const fuseResults = fuse.search(query);

    const byType = new Map<string, SearchItem[]>();
    for (const r of fuseResults) {
      const t = r.item.type;
      if (!byType.has(t)) byType.set(t, []);
      const arr = byType.get(t)!;
      if (arr.length < MAX_PER_TYPE) arr.push(r.item);
    }

    const flat: SearchItem[] = [];
    for (const type of typeOrder) {
      const items = byType.get(type);
      if (items) flat.push(...items);
    }

    return flat.slice(0, MAX_TOTAL);
  }, [query, fuse, searchItems]);

  const navigate = useCallback(
    (item: SearchItem) => {
      onOpenChange(false);
      router.push(item.href);
    },
    [router, onOpenChange],
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setQuery('');
          setSelectedIndex(0);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="top-[15%] translate-y-0 max-w-lg">
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <DialogDescription className="sr-only">Search pages and records</DialogDescription>
        <div className="space-y-2">
          <div className="flex items-center border-b pb-2">
            <Input
              placeholder="Search pages, leads, clients, projects\u2026"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              className="border-0 shadow-none focus-visible:ring-0"
              autoFocus
            />
          </div>
          <div className="max-h-80 overflow-y-auto space-y-0.5">
            {results.length > 0
              ? renderGroupedResults(results, selectedIndex, navigate, setSelectedIndex)
              : (
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
