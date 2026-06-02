'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { EmailComposer } from '@/components/shared/EmailComposer';
import { getAgencySettings } from '@/lib/db/actions/settings';
import { composeAndSendEmail } from '@/lib/db/actions/email';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Send, Loader2, Save } from 'lucide-react';

const DEFAULT_SENDER_PROFILES = [
  { id: 'profile_1', display_name: 'John Smith', email_prefix: 'john', is_default: true },
  { id: 'profile_2', display_name: 'Budi Hartono', email_prefix: 'budi', is_default: false },
  { id: 'profile_3', display_name: 'Chan Tai Man', email_prefix: 'chantaiman', is_default: false },
  { id: 'profile_4', display_name: 'Juan dela Cruz', email_prefix: 'juan', is_default: false },
  { id: 'profile_5', display_name: 'Arjun Patel', email_prefix: 'arjun', is_default: false },
];

export default function ComposePage() {
  const router = useRouter();
  const [selectedProfile, setSelectedProfile] = useState('profile_1');
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [sending, setSending] = useState(false);
  const [showCc, setShowCc] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['agency-settings'],
    queryFn: getAgencySettings,
  });

  const profiles = (settings as any)?.sender_profiles?.length
    ? (settings as any).sender_profiles
    : DEFAULT_SENDER_PROFILES;

  async function handleSend() {
    if (!to.trim()) {
      toast.error('Please enter a recipient email');
      return;
    }
    if (!subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }
    if (!bodyHtml.trim()) {
      toast.error('Please write an email body');
      return;
    }

    setSending(true);
    try {
      const result = await composeAndSendEmail({
        profileId: selectedProfile,
        to: to.trim(),
        cc: cc.trim() || undefined,
        subject: subject.trim(),
        bodyHtml,
      });

      if (result.status === 'sent') {
        toast.success('Email sent');
        router.push('/inbox');
      } else {
        toast.error(`Failed to send: ${result.errorMessage}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Compose</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/inbox')}>
            <Save className="h-4 w-4 mr-1" />
            Save Draft
          </Button>
          <Button size="sm" onClick={handleSend} disabled={sending}>
            {sending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-1" />
            )}
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label>From</Label>
            <Select value={selectedProfile} onValueChange={setSelectedProfile}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.display_name} &lt;{p.email_prefix}@mail.jonathansimpson.co&gt;
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>To</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setShowCc(!showCc)}
              >
                {showCc ? 'Hide Cc' : '+ Cc'}
              </Button>
            </div>
            <Input
              placeholder="client@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          {showCc && (
            <div className="space-y-2">
              <Label>Cc</Label>
              <Input
                placeholder="cc@example.com"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              placeholder="Email subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Body</Label>
            <EmailComposer
              value={bodyHtml}
              onChange={setBodyHtml}
              minHeight={300}
              placeholder="Write your email..."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
