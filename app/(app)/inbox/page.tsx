'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getInboxMessages, markMessageRead, archiveMessage, syncInboxNow, getThreadMessages, repairInbox } from '@/lib/db/actions/google';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Archive, Clock, CheckCheck, ChevronDown, Search, MessageSquare } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import Fuse from 'fuse.js';


type FilterTab = 'all' | 'unread' | 'high' | 'action';
type ReadStatus = 'unread' | 'all';
type DateRange = 'today' | '7d' | '14d' | '30d';

interface FetchOption {
  label: string;
  readStatus: ReadStatus;
  dateRange: DateRange;
}

const FETCH_OPTIONS: FetchOption[] = [
  { label: 'Unread today', readStatus: 'unread', dateRange: 'today' },
  { label: 'All today', readStatus: 'all', dateRange: 'today' },
  { label: 'Unread (7 days)', readStatus: 'unread', dateRange: '7d' },
  { label: 'All (7 days)', readStatus: 'all', dateRange: '7d' },
  { label: 'Unread (14 days)', readStatus: 'unread', dateRange: '14d' },
  { label: 'All (14 days)', readStatus: 'all', dateRange: '14d' },
  { label: 'Unread (30 days)', readStatus: 'unread', dateRange: '30d' },
  { label: 'All (30 days)', readStatus: 'all', dateRange: '30d' },
];

interface InboxMessageData {
  _id: string;
  user_id: string;
  google_message_id: string;
  thread_id: string;
  from_name: string;
  from_email: string;
  subject: string;
  snippet: string;
  body_plain: string;
  body_html: string;
  ai_summary: string;
  importance: string;
  action_needed: boolean;
  action_description: string | null;
  is_read: boolean;
  is_archived: boolean;
  received_at: string;
}

const AVATAR_COLORS = [
  'bg-rose-100 text-rose-600 dark:bg-rose-900 dark:text-rose-200',
  'bg-sky-100 text-sky-600 dark:bg-sky-900 dark:text-sky-200',
  'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-200',
  'bg-violet-100 text-violet-600 dark:bg-violet-900 dark:text-violet-200',
  'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-200',
  'bg-cyan-100 text-cyan-600 dark:bg-cyan-900 dark:text-cyan-200',
  'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-200',
  'bg-lime-100 text-lime-600 dark:bg-lime-900 dark:text-lime-200',
];

const priorityBarColor: Record<string, string> = {
  high: 'bg-destructive',
  medium: 'bg-amber-400',
  low: 'bg-muted-foreground/30',
};

function avatarColor(name: string): string {
  let hash = 0;
  const str = name || '';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function avatarInitial(name: string): string {
  return (name || '?').trim().charAt(0).toUpperCase();
}

function cleanSubject(subject: string): string {
  return subject.replace(/\s*\(duplicate\)\s*/gi, '').trim() || '(No subject)';
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return formatDistanceToNow(date, { addSuffix: true });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: diffDays > 365 ? 'numeric' : undefined,
  });
}

export default function InboxPage() {
  const queryClient = useQueryClient();
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['inbox'],
    queryFn: () => getInboxMessages({ limit: 50 }),
  });

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncMsg, setLastSyncMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openedIds, setOpenedIds] = useState<Set<string>>(new Set());
  const [threadMessages, setThreadMessages] = useState<Record<string, InboxMessageData[]>>({});
  const isFirstMount = useRef(true);
  const lastSyncTime = useRef<number>(0);

  const fuse = useMemo(
    () =>
      new Fuse(messages, {
        keys: ['subject', 'from_name', 'from_email', 'ai_summary'],
        threshold: 0.4,
      }),
    [messages]
  );

  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    return fuse.search(searchQuery).map((r) => r.item) as InboxMessageData[];
  }, [searchQuery, fuse, messages]);

  const filteredMessages = useMemo(() => {
    return filteredBySearch.filter((msg) => {
      switch (activeTab) {
        case 'unread':
          return !msg.is_read;
        case 'high':
          return msg.importance === 'high';
        case 'action':
          return msg.action_needed;
        default:
          return true;
      }
    });
  }, [filteredBySearch, activeTab]);

  const groupedMessages = useMemo(() => {
    const seen = new Map<string, { msg: InboxMessageData; count: number }>();
    for (const msg of filteredMessages) {
      const key = `${msg.from_email}|${msg.subject}`;
      const item = seen.get(key);
      if (item) {
        item.count++;
      } else {
        seen.set(key, { msg, count: 1 });
      }
    }
    return Array.from(seen.values());
  }, [filteredMessages]);

  function handleTabChange(tab: FilterTab) {
    setActiveTab(tab);
    setExpandedId(null);
  }

  const doSync = useCallback(
    async (showToast: boolean, fetchOpts?: { readStatus: ReadStatus; dateRange: DateRange }) => {
      setIsSyncing(true);
      try {
        const opts = fetchOpts || { readStatus: 'unread', dateRange: '7d' };
        const result = await syncInboxNow(opts);
        if (result.errors.length > 0) {
          if (showToast) {
            toast.error(result.errors[0]);
          }
        }
        if (result.totalSynced > 0) {
          const label = FETCH_OPTIONS.find(
            (o) => o.readStatus === opts.readStatus && o.dateRange === opts.dateRange
          );
          setLastSyncMsg(`${result.totalSynced} new · ${label?.label || 'synced'}`);
          if (showToast) {
            toast.success(`${result.totalSynced} new message${result.totalSynced > 1 ? 's' : ''} synced`);
          }
        } else if (result.errors.length === 0) {
          setLastSyncMsg('Up to date');
        }
        lastSyncTime.current = Date.now();
        queryClient.invalidateQueries({ queryKey: ['inbox'] });
        queryClient.invalidateQueries({ queryKey: ['inbox-stats'] });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Sync failed');
      } finally {
        setIsSyncing(false);
      }
    },
    [queryClient]
  );

  async function handleRepair() {
    setIsSyncing(true);
    try {
      await repairInbox();
      toast.success('Inbox cleared. Re-syncing...');
      await doSync(true, { readStatus: 'unread', dateRange: '30d' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Repair failed');
    } finally {
      setIsSyncing(false);
    }
  }

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      doSync(false);
    }
  }, [doSync]);

  useEffect(() => {
    const interval = setInterval(() => doSync(true), 120000);
    return () => clearInterval(interval);
  }, [doSync]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastSyncTime.current;
        if (elapsed > 120000) {
          doSync(false);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [doSync]);

  async function handleRead(id: string) {
    setOpenedIds((prev) => new Set(prev).add(id));
  }

  async function toggleExpand(msg: InboxMessageData) {
    if (!msg.is_read && !openedIds.has(msg._id)) {
      handleRead(msg._id);
      markMessageRead(msg._id);
    }
    if (expandedId === msg._id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(msg._id);

    const threadKey = msg.thread_id;
    if (threadKey && !threadMessages[threadKey]) {
      try {
        const siblings = await getThreadMessages(threadKey);
        setThreadMessages((prev) => ({ ...prev, [threadKey]: siblings }));
      } catch {
        //
      }
    }
  }

  async function handleArchive(id: string) {
    await archiveMessage(id);
    queryClient.setQueryData(['inbox'], (old: InboxMessageData[] | undefined) =>
      old?.filter((m) => m._id !== id)
    );
  }

  function handleSnooze(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    toast.info('Snooze coming soon');
  }

  async function handleMarkDone(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    await archiveMessage(id);
    queryClient.setQueryData(['inbox'], (old: InboxMessageData[] | undefined) =>
      old?.filter((m) => m._id !== id)
    );
  }

  const threadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const msg of messages) {
      const tid = (msg as InboxMessageData).thread_id;
      if (tid) counts[tid] = (counts[tid] || 0) + 1;
    }
    return counts;
  }, [messages]);

  function threadCount(msg: InboxMessageData): number {
    return threadCounts[msg.thread_id] || 0;
  }

  function otherThreadMessages(msg: InboxMessageData): InboxMessageData[] {
    const siblings = threadMessages[msg.thread_id] as InboxMessageData[] | undefined;
    if (!siblings) return [];
    return siblings.filter((s) => s._id !== msg._id);
  }

  const unreadCount = filteredBySearch.filter(
    (m: InboxMessageData) => !m.is_read
  ).length;

  const FILTER_TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'high', label: 'High Priority' },
    { key: 'action', label: 'Action Needed' },
  ];

  return (
    <div className="space-y-5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">Inbox</h2>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {lastSyncMsg && (
            <span className="text-xs text-muted-foreground truncate max-w-32">{lastSyncMsg}</span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isSyncing}>
                {isSyncing ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <ChevronDown className="h-3 w-3 mr-1" />
                )}
                {isSyncing ? 'Syncing...' : 'Fetch'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Fetch options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {FETCH_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.label}
                  onClick={() => doSync(true, { readStatus: opt.readStatus, dateRange: opt.dateRange })}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={handleRepair}
              >
                Reset & Re-sync
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search sender or subject..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTER_TABS.map((tab) => {
          const tabCount = activeTab === tab.key
            ? filteredMessages.length
            : tab.key === 'unread'
              ? filteredBySearch.filter((m: InboxMessageData) => !m.is_read).length
              : filteredBySearch.filter((m: InboxMessageData) => {
                  if (tab.key === 'high') return m.importance === 'high';
                  if (tab.key === 'action') return m.action_needed;
                  return true;
                }).length;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs ${isActive ? 'opacity-80' : ''}`}>({tabCount})</span>
            </button>
          );
        })}
      </div>

      {/* Messages */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredMessages.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            {searchQuery
              ? 'No messages match your search.'
              : activeTab !== 'all'
              ? `No ${FILTER_TABS.find((t) => t.key === activeTab)?.label.toLowerCase()} messages.`
              : 'No messages yet. Connect Google in Settings \u2192 Connections and enable inbox sync.'}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-hidden">
          {groupedMessages.map(({ msg, count }: { msg: InboxMessageData; count: number }) => {
            const threadSiblings = otherThreadMessages(msg);
            const read = msg.is_read || openedIds.has(msg._id);
            const senderName = msg.from_name || msg.from_email;
            return (
              <div key={msg._id}>
                <div
                  role="button"
                  tabIndex={0}
                  className="flex items-center h-16 px-0 border-b border-border group hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => toggleExpand(msg)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleExpand(msg); }}
                >
                  {/* Priority bar - 3px vertical left edge */}
                  <div className={`w-[3px] h-full shrink-0 ${priorityBarColor[msg.importance] || priorityBarColor.low}`} />

                  {/* Unread dot zone */}
                  <div className="w-6 flex justify-center items-center shrink-0">
                    {!read && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </div>

                  {/* Avatar - 36px circle */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-semibold shrink-0 ${avatarColor(senderName)}`}>
                    {avatarInitial(senderName)}
                  </div>

                  {/* Center: sender + subject + preview */}
                  <div className="flex-1 min-w-0 ml-3 mr-4">
                    {/* Sender line */}
                    <div className="flex items-center gap-1.5 leading-tight">
                      <span className={`text-sm truncate ${read ? 'font-normal' : 'font-semibold'}`}>
                        {decodeHtmlEntities(senderName)}
                      </span>
                      {count > 1 && (
                        <span className="text-xs text-muted-foreground shrink-0">&middot; {count}</span>
                      )}
                      {msg.action_needed && (
                        <span className="text-[10px] px-1.5 py-px rounded border border-amber-400 text-amber-700 dark:text-amber-300 shrink-0 leading-tight">
                          Action
                        </span>
                      )}
                    </div>
                    {/* Subject */}
                    <p className={`text-sm truncate leading-tight ${read ? 'font-normal' : 'font-semibold'}`}>
                      {cleanSubject(decodeHtmlEntities(msg.subject))}
                    </p>
                    {/* Preview - 1 line max */}
                    <p className="text-xs text-muted-foreground truncate leading-tight">
                      {decodeHtmlEntities(msg.ai_summary || msg.snippet || '')}
                    </p>
                  </div>

                  {/* Right: thread count + timestamp / hover actions */}
                  <div className="shrink-0 flex items-center gap-2 pr-4 relative min-w-[90px]">
                    {msg.thread_id && threadCount(msg) > 1 && (
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {threadCount(msg)}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground group-hover:opacity-0 transition-opacity duration-150">
                      {relativeTime(msg.received_at)}
                    </span>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); handleArchive(msg._id); }}
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => handleSnooze(e, msg._id)}
                      >
                        <Clock className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => handleMarkDone(e, msg._id)}
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded content */}
                {expandedId === msg._id && (
                  <div className="px-4 py-4 border-b border-border bg-muted/20">
                    {/* Body */}
                    {msg.body_html ? (
                      <div
                        className="text-sm leading-relaxed break-words
                          [&_a]:text-blue-600 [&_a]:underline [&_a]:break-all
                          [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:ml-5 [&_li]:my-0.5
                          [&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-3 [&_blockquote]:my-1.5 [&_blockquote]:text-muted-foreground
                          [&_h1]:text-base [&_h1]:font-semibold [&_h1]:my-2
                          [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:my-1.5
                          [&_h3]:text-sm [&_h3]:font-medium [&_h3]:my-1
                          [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded
                          [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:text-xs [&_pre]:my-2
                          [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_code]:text-xs
                          [&_table]:w-full [&_table]:border-collapse [&_table]:my-2
                          [&_th]:border [&_th]:p-2 [&_th]:text-left [&_th]:bg-muted [&_th]:text-xs [&_th]:font-semibold
                          [&_td]:border [&_td]:p-2 [&_td]:text-xs
                          [&_br]:my-1"
                        dangerouslySetInnerHTML={{ __html: msg.body_html }}
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">
                        {decodeHtmlEntities(msg.body_plain?.slice(0, 50000) || msg.snippet || '')}
                      </p>
                    )}

                    {msg.action_description && (
                      <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                        <span className="font-medium">Suggested action:</span> {decodeHtmlEntities(msg.action_description)}
                      </p>
                    )}

                    {/* Thread messages */}
                    {threadSiblings.length > 0 && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5" />
                          Thread ({threadCount(msg)} messages)
                        </p>
                        {threadSiblings.map((sibling: InboxMessageData) => (
                          <div key={sibling._id} className="bg-muted/50 rounded-lg p-3 text-sm">
                            <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="font-medium text-xs">
                                    {decodeHtmlEntities(sibling.from_name || sibling.from_email)}
                                  </span>
                              <span className="text-[10px] text-muted-foreground">
                                {relativeTime(sibling.received_at)}
                              </span>
                            </div>
                                  {sibling.ai_summary && (
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                      {decodeHtmlEntities(sibling.ai_summary)}
                                    </p>
                                  )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
