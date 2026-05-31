'use client';

import { useState } from 'react';
import { getTicketsByEmail, updateTicket } from '@/lib/db/actions/tickets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowRight,
  Mail,
  Ticket as TicketIcon,
  Plus,
  ExternalLink,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Ticket } from '@/types';

const priorityOrder = ['Low', 'Medium', 'High', 'Urgent'] as const;
const predefinedTags = [
  'UI/UX', 'Database', 'API', 'DevOps', 'Frontend', 'Backend',
  'Content/Copy', 'SEO', 'Performance', 'Bug Fix', 'Feature Request',
  'Security', 'Infrastructure', 'Mobile', 'Analytics', 'Automation',
  'Email', 'Hosting/DNS', 'Documentation', 'Billing', 'Other',
];

export default function PortalPage() {
  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ tickets: Ticket[]; client: any } | null>(null);
  const [error, setError] = useState('');
  const [showNewTicket, setShowNewTicket] = useState(false);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await getTicketsByEmail(email.trim());
      setData(result as any);
      setSubmittedEmail(email.trim());
    } catch {
      setError('Failed to look up tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRaisePriority(ticket: Ticket) {
    const currentIdx = priorityOrder.indexOf(ticket.priority as typeof priorityOrder[number]);
    if (currentIdx < priorityOrder.length - 1) {
      const newPriority = priorityOrder[currentIdx + 1];
      try {
        await updateTicket(ticket.id, { priority: newPriority });
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            tickets: prev.tickets.map((t) =>
              t.id === ticket.id ? { ...t, priority: newPriority as Ticket['priority'] } : t
            ),
          };
        });
        toast.success(`Priority raised to ${newPriority}`);
      } catch {
        toast.error('Failed to update priority');
      }
    } else {
      toast.info('Already at highest priority');
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-14 items-center border-b px-6">
        <div className="flex items-center gap-3">
          <Image src="/JSC-logo.svg" alt="JSC" width={24} height={24} className="h-6 w-6 rounded" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">Client Portal</span>
            <span className="text-[9px] text-muted-foreground">Jonathan Simpson &amp; Co.</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl p-6 space-y-6">
        {!data ? (
          <>
            <div className="text-center space-y-2 pt-12">
              <div className="mx-auto rounded-full bg-primary/10 p-3 w-fit">
                <TicketIcon className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-xl font-semibold">View Your Tickets</h1>
              <p className="text-sm text-muted-foreground">
                Enter your email to see your support tickets and remaining ticket balance.
              </p>
              {process.env.NODE_ENV === 'development' && (
                <p className="text-xs text-muted-foreground/60 pt-1">
                  Dev mode: use <code className="text-foreground/70">test@jsco.dev</code> for sample tickets
                </p>
              )}
            </div>

            <Card>
              <CardContent className="p-6">
                <form onSubmit={handleLookup} className="flex gap-3">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="mr-2 h-4 w-4" />
                    )}
                    {loading ? 'Looking up...' : 'Look up'}
                  </Button>
                </form>
                {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  {data.client?.company_name || 'Your Tickets'}
                </h2>
                <p className="text-sm text-muted-foreground">{submittedEmail}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setData(null); setEmail(''); }}
              >
                Change email
              </Button>
            </div>

            {data.client && (
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <TicketIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">
                        {data.tickets.filter((t) => t.status !== 'Closed' && t.status !== 'Resolved').length}
                      </p>
                      <p className="text-xs text-muted-foreground">Active Tickets</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="rounded-lg bg-amber-500/10 p-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">
                        {data.client.remaining_tickets !== null && data.client.remaining_tickets !== undefined
                          ? data.client.remaining_tickets
                          : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">Remaining Tickets</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {data.client && data.client.remaining_tickets !== null && data.client.remaining_tickets <= 2 && (
              <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {data.client.remaining_tickets === 0
                  ? 'You have no remaining tickets. Please contact us to purchase more.'
                  : `You only have ${data.client.remaining_tickets} ticket${data.client.remaining_tickets === 1 ? '' : 's'} remaining.`}
              </div>
            )}

            <div className="flex justify-end">
              <Dialog open={showNewTicket} onOpenChange={setShowNewTicket}>
                <DialogTrigger asChild>
                  <Button
                    disabled={
                      data.client !== null &&
                      data.client.remaining_tickets !== null &&
                      data.client.remaining_tickets !== undefined &&
                      data.client.remaining_tickets <= 0
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" /> New Ticket
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New Ticket</DialogTitle>
                  </DialogHeader>
                  <NewTicketForm
                    email={submittedEmail}
                    onSuccess={() => {
                      setShowNewTicket(false);
                      getTicketsByEmail(submittedEmail).then((r) => setData(r as any)).catch(() => {});
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Ticket</th>
                      <th className="px-4 py-3 font-medium">Title</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Priority</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tickets.map((t) => (
                      <tr key={t.id} className="border-b text-sm hover:bg-accent/30">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{t.ticket_number}</td>
                        <td className="px-4 py-3 font-medium">{t.title}</td>
                        <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] cursor-pointer ${
                              t.priority === 'Urgent' ? 'border-red-500 text-red-500' :
                              t.priority === 'High' ? 'border-orange-500 text-orange-500' :
                              t.priority === 'Medium' ? 'border-amber-500 text-amber-500' :
                              'border-zinc-400 text-zinc-400'
                            }`}
                            onClick={() => handleRaisePriority(t)}
                          >
                            {t.priority}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(t.created_at)}</td>
                        <td className="px-4 py-3">
                          {t.created_issue_url && (
                            <a
                              href={t.created_issue_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              View <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                    {data.tickets.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                          No tickets found for this email.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

function NewTicketForm({
  email,
  onSuccess,
}: {
  email: string;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !name.trim()) return;
    setSubmitting(true);
    try {
      const { createTicket } = await import('@/lib/db/actions/tickets');
      await createTicket({
        contact_email: email,
        contact_name: name.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        source: 'support-form',
        priority: 'Medium',
      });
      toast.success('Ticket submitted');
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Your Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Brief summary of your request"
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <textarea
          className="w-full rounded-md border bg-transparent p-3 text-sm min-h-[100px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what you need..."
        />
      </div>
      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex items-center gap-1.5 flex-wrap">
          {predefinedTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`text-xs rounded-md border px-2 py-1 transition-colors ${
                selectedTags.includes(tag)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-input hover:bg-accent'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit Ticket'}
      </Button>
    </form>
  );
}
