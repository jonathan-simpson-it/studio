'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getInboxMessages, markMessageRead, archiveMessage } from '@/lib/db/actions/google';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Archive, Mail, MailOpen, ChevronDown, ChevronUp } from 'lucide-react';
import type { MessageImportance } from '@/types';

const importanceColor: Record<MessageImportance, string> = {
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  low: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
};

export default function InboxPage() {
  const queryClient = useQueryClient();
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['inbox'],
    queryFn: () => getInboxMessages({ limit: 50 }),
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function handleRead(id: string) {
    await markMessageRead(id);
    queryClient.setQueryData(['inbox'], (old: any[]) =>
      old?.map((m: any) => (m._id === id ? { ...m, is_read: true } : m))
    );
  }

  async function handleArchive(id: string) {
    await archiveMessage(id);
    queryClient.setQueryData(['inbox'], (old: any[]) =>
      old?.filter((m: any) => m._id !== id)
    );
  }

  function toggleExpand(id: string) {
    if (!messages.find((m) => m._id === id)?.is_read) {
      handleRead(id);
    }
    setExpandedId(expandedId === id ? null : id);
  }

  const unreadCount = messages.filter((m: any) => !m.is_read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Inbox</h2>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['inbox'] })} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : messages.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            No messages yet. Connect Google in Settings → Connections and enable inbox sync.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {messages.map((msg: any) => (
            <Card
              key={msg._id}
              className={msg.is_read ? 'opacity-70' : ''}
            >
              <button
                className="w-full text-left"
                onClick={() => toggleExpand(msg._id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {msg.is_read ? (
                          <MailOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        ) : (
                          <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                        )}
                        <span className="text-sm font-medium truncate">{msg.subject || '(No subject)'}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {msg.from_name || msg.from_email}
                        <span className="mx-1">·</span>
                        {new Date(msg.received_at).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                      {msg.ai_summary && (
                        <p className="text-sm mt-2 text-foreground/80 line-clamp-2">{msg.ai_summary}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        className={`text-[10px] px-1.5 py-0.5 ${importanceColor[msg.importance as MessageImportance] || importanceColor.medium}`}
                      >
                        {msg.importance}
                      </Badge>
                      {msg.action_needed && (
                        <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700 dark:text-amber-300">
                          Action
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); handleArchive(msg._id); }}
                      >
                        <Archive className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {expandedId === msg._id && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      <p className="text-sm whitespace-pre-wrap">{msg.body_plain?.slice(0, 2000) || msg.snippet || ''}</p>
                      {msg.action_description && (
                        <Badge variant="secondary" className="text-xs">
                          Suggested action: {msg.action_description}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
