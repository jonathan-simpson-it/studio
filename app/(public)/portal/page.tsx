'use client';

import { useState, useRef, useEffect } from 'react';
import { getTicketsByEmail, updateTicket } from '@/lib/db/actions/tickets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate, formatCurrency } from '@/lib/utils';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Mail,
  Ticket as TicketIcon,
  Briefcase,
  Receipt,
  Plus,
  ExternalLink,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  ArrowLeft,
  Check,
  RefreshCw,
  KeyRound,
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
  const [step, setStep] = useState<'email' | 'code' | 'data'>('email');
  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<{ tickets: Ticket[]; client: any; projects: { id: string; name: string; status: string }[]; invoices: any[] } | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [codeDigits, setCodeDigits] = useState<string[]>(Array(6).fill(''));
  const [resendCooldown, setResendCooldown] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  const codeInputRefs = useRef<(HTMLInputElement | null)[]>(Array(6).fill(null));

  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (resendCooldown > 0) {
      resendTimerRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            if (resendTimerRef.current) clearInterval(resendTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (resendTimerRef.current) clearInterval(resendTimerRef.current);
      };
    }
  }, [resendCooldown]);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/portal/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to send code');
        return;
      }
      setSubmittedEmail(email.trim());
      setCodeDigits(Array(6).fill(''));
      setRemainingAttempts(null);
      setStep('code');
      setResendCooldown(60);
      toast.success('Code sent — check your inbox');
    } catch {
      setError('Failed to send code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    const code = codeDigits.join('');
    if (code.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/portal/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: submittedEmail, code }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Invalid code');

        const match = json.error?.match(/(\d+)\s*attempt/);
        if (match) {
          setRemainingAttempts(parseInt(match[1], 10));
        }

        if (json.error?.includes('expired') || json.error?.includes('Too many failed')) {
          setStep('email');
        }
        return;
      }
      setData(json);
      setStep('data');
      toast.success('Verified successfully');
    } catch {
      setError('Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleResend() {
    if (resendCooldown > 0) return;
    setLoading(true);
    setError('');
    setCodeDigits(Array(6).fill(''));
    setRemainingAttempts(null);
    fetch('/api/portal/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: submittedEmail }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setResendCooldown(60);
        toast.success('New code sent');
      })
      .catch(() => {
        toast.error('Failed to resend code');
      })
      .finally(() => setLoading(false));
  }

  function handleCodeInput(value: string, index: number) {
    const digit = value.replace(/\D/g, '').slice(0, 1);
    const newDigits = [...codeDigits];
    newDigits[index] = digit;
    setCodeDigits(newDigits);

    if (digit && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }

    const code = newDigits.join('');
    if (code.length === 6) {
      setCodeDigits(newDigits);
    }
  }

  function handleCodeKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      const newDigits = [...codeDigits];
      newDigits[index - 1] = '';
      setCodeDigits(newDigits);
      codeInputRefs.current[index - 1]?.focus();
    }
  }

  function handleCodePaste(e: React.ClipboardEvent, index: number) {
    if (index !== 0) return;
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const newDigits = pasted.split('').concat(Array(6).fill('')).slice(0, 6);
    setCodeDigits(newDigits);
    const lastFilled = newDigits.findLastIndex((d) => d !== '');
    const focusIndex = lastFilled < 5 ? lastFilled + 1 : 5;
    codeInputRefs.current[focusIndex]?.focus();
  }

  function handleBackToEmail() {
    setStep('email');
    setError('');
    setCodeDigits(Array(6).fill(''));
    setRemainingAttempts(null);
  }

  function handleChangeEmail() {
    setData(null);
    setStep('email');
    setEmail('');
    setSubmittedEmail('');
    setError('');
    setCodeDigits(Array(6).fill(''));
    setRemainingAttempts(null);
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
        {step === 'email' && (
          <EmailStep
            email={email}
            setEmail={setEmail}
            loading={loading}
            error={error}
            onSubmit={handleSendCode}
          />
        )}

        {step === 'code' && (
          <CodeStep
            email={submittedEmail}
            codeDigits={codeDigits}
            loading={loading}
            error={error}
            remainingAttempts={remainingAttempts}
            resendCooldown={resendCooldown}
            onCodeInput={handleCodeInput}
            onCodeKeyDown={handleCodeKeyDown}
            onCodePaste={handleCodePaste}
            onVerify={handleVerifyCode}
            onResend={handleResend}
            onBack={handleBackToEmail}
            onChangeEmail={handleChangeEmail}
            codeInputRefs={codeInputRefs}
          />
        )}

        {step === 'data' && data && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-emerald-500/10 p-1">
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                  <h2 className="text-xl font-semibold">
                    {data.client?.company_name || 'Your Tickets'}
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{submittedEmail}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleChangeEmail}>
                Sign out
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

            <Tabs defaultValue="tickets">
              <TabsList>
                <TabsTrigger value="tickets" className="flex items-center gap-2">
                  <TicketIcon className="h-4 w-4" /> Tickets
                </TabsTrigger>
                <TabsTrigger value="projects" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" /> Projects
                </TabsTrigger>
                <TabsTrigger value="invoices" className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" /> Invoices
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tickets" className="space-y-4 pt-4">
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
                        projects={data?.projects || []}
                        onSuccess={() => {
                          setShowNewTicket(false);
                          getTicketsByEmail(submittedEmail).then((r) => setData(r as any)).catch(() => {});
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                </div>

                <Card>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full min-w-[500px]">
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
                                className={`text-xs cursor-pointer ${
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
              </TabsContent>

              <TabsContent value="projects" className="pt-4">
                <Card>
                  <CardContent className="p-0">
                    {data.projects?.length > 0 ? (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b text-left text-xs text-muted-foreground">
                            <th className="px-4 py-3 font-medium">Project</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.projects.map((p: any) => (
                            <tr key={p.id} className="border-b text-sm">
                              <td className="px-4 py-3 font-medium">{p.name}</td>
                              <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        No active projects
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="invoices" className="pt-4">
                <Card>
                  <CardContent className="p-0">
                    {data.invoices?.length > 0 ? (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b text-left text-xs text-muted-foreground">
                            <th className="px-4 py-3 font-medium">Invoice</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Amount</th>
                            <th className="px-4 py-3 font-medium">Due</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.invoices.map((inv: any) => (
                            <tr key={inv.id} className="border-b text-sm">
                              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{inv.invoice_number}</td>
                              <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                              <td className="px-4 py-3">{formatCurrency(inv.total, inv.currency)}</td>
                              <td className="px-4 py-3 text-muted-foreground text-xs">{inv.due_date || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        No invoices yet
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}

function EmailStep({
  email,
  setEmail,
  loading,
  error,
  onSubmit,
}: {
  email: string;
  setEmail: (v: string) => void;
  loading: boolean;
  error: string;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <>
      <div className="text-center space-y-2 pt-12">
        <div className="mx-auto rounded-full bg-primary/10 p-3 w-fit">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-xl font-semibold">Access Your Client Portal</h1>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Enter your email and we&apos;ll send you a one-time code to access your tickets, projects, and invoices.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <p className="text-xs text-muted-foreground/60 pt-1">
            Dev mode: use <code className="text-foreground/70">test@jsco.dev</code> for sample tickets
          </p>
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="portal-email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="portal-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                  autoFocus
                  autoComplete="email"
                />
              </div>
            </div>
            {error && (
              <p className="text-sm text-destructive flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending code...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Send me a code
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

function CodeStep({
  email,
  codeDigits,
  loading,
  error,
  remainingAttempts,
  resendCooldown,
  onCodeInput,
  onCodeKeyDown,
  onCodePaste,
  onVerify,
  onResend,
  onBack,
  onChangeEmail,
  codeInputRefs,
}: {
  email: string;
  codeDigits: string[];
  loading: boolean;
  error: string;
  remainingAttempts: number | null;
  resendCooldown: number;
  onCodeInput: (value: string, index: number) => void;
  onCodeKeyDown: (e: React.KeyboardEvent, index: number) => void;
  onCodePaste: (e: React.ClipboardEvent, index: number) => void;
  onVerify: () => void;
  onResend: () => void;
  onBack: () => void;
  onChangeEmail: () => void;
  codeInputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
}) {
  const codeComplete = codeDigits.every((d) => d !== '');

  return (
    <>
      <div className="text-center space-y-2 pt-12">
        <div className="mx-auto rounded-full bg-primary/10 p-3 w-fit">
          <KeyRound className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-xl font-semibold">Check your email</h1>
        <p className="text-sm text-muted-foreground">
          We sent a 6-digit code to{' '}
          <span className="text-foreground font-medium">{email}</span>
        </p>
        <button
          type="button"
          onClick={onChangeEmail}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
        >
          Change email
        </button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-3">
            <Label className="text-center block">Verification code</Label>
            <div className="flex items-center justify-center gap-2">
              {codeDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { codeInputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => onCodeInput(e.target.value, i)}
                  onKeyDown={(e) => onCodeKeyDown(e, i)}
                  onPaste={(e) => onCodePaste(e, i)}
                  className="w-12 h-14 md:w-10 md:h-12 text-center text-lg font-mono font-semibold rounded-lg border border-input bg-transparent focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all"
                  autoFocus={i === 0}
                  aria-label={`Digit ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive text-center flex items-center justify-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}

          {remainingAttempts !== null && !error && (
            <p className="text-xs text-muted-foreground text-center">
              {remainingAttempts} attempt{remainingAttempts === 1 ? '' : 's'} remaining
            </p>
          )}

          <Button
            className="w-full"
            onClick={onVerify}
            disabled={loading || !codeComplete}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Verify &amp; View
              </>
            )}
          </Button>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Back
            </button>
            <button
              type="button"
              onClick={onResend}
              disabled={resendCooldown > 0 || loading}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              <RefreshCw className="h-3 w-3" />
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
            </button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function NewTicketForm({
  email,
  projects,
  onSuccess,
}: {
  email: string;
  projects: { id: string; name: string; status: string }[];
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('_none');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !name.trim()) return;
    setSubmitting(true);
    try {
      const { createTicket } = await import('@/lib/db/actions/tickets');
      const result = await createTicket({
        contact_email: email,
        contact_name: name.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        source: 'support-form',
        priority: 'Medium',
        project_id: selectedProject === '_none' ? null : selectedProject,
      }) as { created_issue_url: string | null; github_sync_error: string | null };
      toast.success('Ticket submitted');
      if (result.github_sync_error) {
        toast.warning(`GitHub sync note: ${result.github_sync_error}`);
      }
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
      {projects.length > 0 && (
        <div className="space-y-2">
          <Label>Project <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <div className="relative">
            <select
              className="w-full appearance-none rounded-md border bg-transparent px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="_none">General / No Project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <p className="text-xs text-muted-foreground">
            Select a project to link this ticket to its GitHub repository.
          </p>
        </div>
      )}
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
