'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCurrentUser, updateUserProfile, getAgencySettings, updateAgencySettings, getIntegrations, upsertIntegration } from '@/lib/db/actions/settings';
import { getGoogleCalendars, toggleGoogleCalendar, fetchAndStoreGoogleCalendars, getGoogleInboxes, toggleGoogleInbox, fetchAndStoreGoogleLabels } from '@/lib/db/actions/google';
import { setInboxSource } from '@/lib/db/actions/inbound';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Loader2,
  Sparkles,
  Key,
  Copy,
  Check,
  CheckCircle2,
  Server,
  Trash2,
  Plus,
  Link,
  Unlink,
  Mail,
  RefreshCw,
} from 'lucide-react';

const TIMEZONES = [
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Asia/Dubai',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Pacific/Auckland',
  'Australia/Sydney',
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [profileForm, setProfileForm] = useState({ full_name: '', timezone: 'Asia/Hong_Kong', default_hourly_rate: '0' });
  const [agencyForm, setAgencyForm] = useState({ agency_name: 'Jonathan Simpson & Co.', agency_address: '', default_currency: 'HKD' });
  const [templateForm, setTemplateForm] = useState({ invoice_default_terms: '', proposal_default_terms: '', proposal_default_scope_template: '' });
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    handler: () => Promise<void>;
  } | null>(null);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [newKeyForm, setNewKeyForm] = useState({ name: '', scope: 'write' });
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [fetchingCalendars, setFetchingCalendars] = useState(false);
  const [fetchingInboxes, setFetchingInboxes] = useState(false);
  const [modelLatencies, setModelLatencies] = useState<Record<string, number | null>>({});
  const [domainInfo, setDomainInfo] = useState<any>(null);
  const [domainLoading, setDomainLoading] = useState(false);
  const [domainTracking, setDomainTracking] = useState({ openTracking: true, clickTracking: true });
  const [editingProfile, setEditingProfile] = useState<{ id: string; display_name: string; email_prefix: string } | null>(null);
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [newProfile, setNewProfile] = useState({ display_name: '', email_prefix: '' });
  const [showCreateDomain, setShowCreateDomain] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: getCurrentUser,
  });

  const { data: settings } = useQuery({
    queryKey: ['agency-settings'],
    queryFn: getAgencySettings,
  });

  const { data: integrations } = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const data = await getIntegrations();
      if (!data) return {};
      const map: Record<string, any> = {};
      data.forEach((i: any) => { map[i.service] = i; });
      return map;
    },
    initialData: {},
  });

  const { data: modelMap = {} as Record<string, { modelKey: string; modelName: string }> } = useQuery<Record<string, { modelKey: string; modelName: string }>>({
    queryKey: ['ai-models'],
    queryFn: () => fetch('/api/ai/models').then((r) => r.json()).then((data) => data.actions || {}),
  });

  const { data: apiKeys = [] } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => fetch('/api/keys').then((r) => r.json()).then((data) => Array.isArray(data) ? data : []),
  });

  const { data: googleCalendars = [] } = useQuery({
    queryKey: ['google-calendars'],
    queryFn: getGoogleCalendars,
    enabled: !!user?.google_id,
  });

  const { data: googleInboxes = [] } = useQuery({
    queryKey: ['google-inboxes'],
    queryFn: getGoogleInboxes,
    enabled: !!user?.google_id,
  });

  useEffect(() => {
    if (user) {
      setProfileForm({
        full_name: user.full_name || session?.user?.name || '',
        timezone: user.timezone || 'Asia/Hong_Kong',
        default_hourly_rate: user.default_hourly_rate?.toString() || '0',
      });
    }
  }, [user?.id]);

  useEffect(() => {
    if (settings) {
      setAgencyForm({ agency_name: settings.agency_name, agency_address: settings.agency_address, default_currency: settings.default_currency });
      setTemplateForm({ invoice_default_terms: settings.invoice_default_terms, proposal_default_terms: settings.proposal_default_terms, proposal_default_scope_template: settings.proposal_default_scope_template });
    }
  }, [settings?.id]);

  async function testModel(modelKey: string) {
    setTestingModel(modelKey);
    try {
      const res = await fetch('/api/ai/test-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelKey }),
      });
      const data = await res.json();
      setModelLatencies((prev) => ({ ...prev, [modelKey]: data.latencyMs || null }));
      if (data.ok) {
        toast.success(`${modelKey} responded in ${data.latencyMs}ms`);
      } else {
        toast.error(`${modelKey} test failed`);
      }
    } catch {
      toast.error('Test request failed');
    } finally {
      setTestingModel(null);
    }
  }

  async function updateProfile() {
    if (!user) return;
    try {
      await updateUserProfile(user.id, { full_name: profileForm.full_name, timezone: profileForm.timezone, default_hourly_rate: parseFloat(profileForm.default_hourly_rate) || 0 } as Record<string, unknown>);
      toast.success('Profile updated');
      queryClient.invalidateQueries({ queryKey: ['user'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    }
  }

  async function updateAgency() {
    if (!settings) return;
    try {
      await updateAgencySettings(settings.id, agencyForm as Record<string, unknown>);
      toast.success('Agency settings updated');
      queryClient.invalidateQueries({ queryKey: ['agency-settings'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    }
  }

  async function updateIntegration(service: string, key: string, orgName?: string) {
    try {
      await upsertIntegration(service, key, orgName ? { org_name: orgName } as Record<string, unknown> : undefined);
      toast.success(`${service} integration saved`);
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  async function loadDomainInfo() {
    setDomainLoading(true);
    try {
      const { getDomainInfo } = await import('@/lib/db/actions/domain');
      const info = await getDomainInfo();
      setDomainInfo(info);
      if (info) {
        setDomainTracking({
          openTracking: (info as any).open_tracking !== false,
          clickTracking: (info as any).click_tracking !== false,
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load domain info');
    } finally {
      setDomainLoading(false);
    }
  }

  useEffect(() => {
    if (integrations.resend?.encrypted_key) {
      loadDomainInfo();
    }
  }, [integrations.resend?.encrypted_key]);

  async function handleVerifyDomain() {
    try {
      const { verifyDomain } = await import('@/lib/db/actions/domain');
      await verifyDomain();
      toast.success('Domain verification requested');
      await loadDomainInfo();
      queryClient.invalidateQueries({ queryKey: ['agency-settings'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Verification failed');
    }
  }

  async function handleCreateDomain() {
    const name = newDomainName.trim();
    if (!name) return;
    setDomainLoading(true);
    try {
      const { createDomain } = await import('@/lib/db/actions/domain');
      await createDomain(name);
      toast.success(`Domain "${name}" created in Resend`);
      setShowCreateDomain(false);
      setNewDomainName('');
      await loadDomainInfo();
      queryClient.invalidateQueries({ queryKey: ['agency-settings'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create domain');
    } finally {
      setDomainLoading(false);
    }
  }

  async function handleUpdateTracking(open: boolean, click: boolean) {
    try {
      const { updateDomainTracking } = await import('@/lib/db/actions/domain');
      await updateDomainTracking(open, click);
      setDomainTracking({ openTracking: open, clickTracking: click });
      toast.success('Tracking settings updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update tracking');
    }
  }

  async function handleAddProfile() {
    if (!newProfile.display_name.trim() || !newProfile.email_prefix.trim()) return;
    try {
      const { addSenderProfile } = await import('@/lib/db/actions/domain');
      await addSenderProfile({
        id: `profile_${Date.now()}`,
        display_name: newProfile.display_name.trim(),
        email_prefix: newProfile.email_prefix.trim(),
      });
      setNewProfile({ display_name: '', email_prefix: '' });
      setShowAddProfile(false);
      queryClient.invalidateQueries({ queryKey: ['agency-settings'] });
      toast.success('Sender profile added');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add profile');
    }
  }

  async function handleRemoveProfile(id: string) {
    try {
      const { removeSenderProfile } = await import('@/lib/db/actions/domain');
      await removeSenderProfile(id);
      queryClient.invalidateQueries({ queryKey: ['agency-settings'] });
      toast.success('Profile removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove profile');
    }
  }

  async function handleSetDefaultProfile(id: string) {
    try {
      const { setDefaultSenderProfile } = await import('@/lib/db/actions/domain');
      await setDefaultSenderProfile(id);
      queryClient.invalidateQueries({ queryKey: ['agency-settings'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to set default');
    }
  }

  async function updateTemplates() {
    if (!settings) return;
    try {
      await updateAgencySettings(settings.id, templateForm as Record<string, unknown>);
      toast.success('Templates updated');
      queryClient.invalidateQueries({ queryKey: ['agency-settings'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update templates');
    }
  }


  async function generateKey() {
    if (!newKeyForm.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKeyForm),
      });
      const data = await res.json();
      if (data.raw_key) {
        setGeneratedKey(data.raw_key);
        setNewKeyForm({ name: '', scope: 'write' });
        setShowNewKeyDialog(false);
        queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      } else {
        toast.error(data.error || 'Failed to create key');
      }
    } catch {
      toast.error('Failed to create API key');
    } finally {
      setCreating(false);
    }
  }

  async function toggleKey(id: string, is_active: boolean) {
    const res = await fetch('/api/keys', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active }),
    });
    if (res.ok) {
      queryClient.setQueryData(['api-keys'], (prev: any[]) =>
        (prev ?? []).map((k: any) => (k.id === id ? { ...k, is_active } : k))
      );
      toast.success(is_active ? 'Key activated' : 'Key deactivated');
    } else {
      const data = await res.json();
      toast.error(data.error || 'Failed to update key');
    }
  }

  async function deleteKey(id: string) {
    const res = await fetch(`/api/keys?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      queryClient.setQueryData(['api-keys'], (prev: any[]) =>
        (prev ?? []).filter((k: any) => k.id !== id)
      );
      toast.success('Key deleted');
    } else {
      const data = await res.json();
      toast.error(data.error || 'Failed to delete key');
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-xl font-semibold">Settings</h2>

      <Tabs defaultValue="profile">
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="agency">Agency</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-4 pb-2">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user?.avatar_url || undefined} alt={profileForm.full_name} />
                  <AvatarFallback className="text-lg bg-muted">
                    {profileForm.full_name.slice(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{profileForm.full_name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">
                    {user?.github_id || user?.google_id
                      ? [user?.github_id && 'GitHub', user?.google_id && 'Google'].filter(Boolean).join(', ') + ' connected'
                      : 'No accounts linked'}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={profileForm.timezone} onValueChange={(v) => setProfileForm({ ...profileForm, timezone: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (<SelectItem key={tz} value={tz}>{tz}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Default Hourly Rate</Label>
                <Input type="number" value={profileForm.default_hourly_rate} onChange={(e) => setProfileForm({ ...profileForm, default_hourly_rate: e.target.value })} />
              </div>
              <Button onClick={updateProfile}>Save Profile</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connections">
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium">GitHub</p>
                      <p className="text-xs text-muted-foreground">
                        {user?.github_id
                          ? `Connected as @${user.github_username || user.github_id}`
                          : 'Connect for login and profile picture'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={user?.github_id ? 'outline' : 'default'}
                    size="sm"
                    onClick={async () => {
                      if (user?.github_id) {
                        setConfirmAction({
                          title: 'Disconnect GitHub',
                          message: 'Are you sure you want to disconnect GitHub from your account?',
                          handler: async () => {
                            const res = await fetch('/api/auth/disconnect-github', { method: 'POST' });
                            if (res.ok) {
                              queryClient.setQueryData(['user'], (prev: any) => ({ ...prev, github_id: null, github_username: null }));
                              toast.success('GitHub disconnected');
                            } else {
                              toast.error('Failed to disconnect');
                            }
                          },
                        });
                      } else {
                        await signIn('github', { redirect: true });
                      }
                    }}
                  >
                    {user?.github_id ? 'Disconnect' : 'Connect'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <div>
                      <p className="text-sm font-medium">Google</p>
                      <p className="text-xs text-muted-foreground">
                        {user?.google_id
                          ? `Connected as ${user.google_email || user.google_id}`
                          : 'Connect for Calendar sync, Gmail inbox, and login'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={user?.google_id ? 'outline' : 'default'}
                    size="sm"
                    onClick={async () => {
                      if (user?.google_id) {
                        setConfirmAction({
                          title: 'Disconnect Google',
                          message: 'Are you sure? This will remove all synced calendars and inboxes.',
                          handler: async () => {
                            const res = await fetch('/api/auth/disconnect-google', { method: 'POST' });
                            if (res.ok) {
                              queryClient.setQueryData(['user'], (prev: any) => ({ ...prev, google_id: null, google_email: null }));
                              queryClient.setQueryData(['google-calendars'], []);
                              queryClient.setQueryData(['google-inboxes'], []);
                              toast.success('Google disconnected');
                            } else {
                              toast.error('Failed to disconnect');
                            }
                          },
                        });
                      } else {
                        await signIn('google', { redirect: true });
                      }
                    }}
                  >
                    {user?.google_id ? 'Disconnect' : 'Connect'}
                  </Button>
                </div>

                {user?.google_id && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Google Calendars</p>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={fetchingCalendars}
                          onClick={async () => {
                            setFetchingCalendars(true);
                            try {
                              await fetchAndStoreGoogleCalendars();
                              queryClient.invalidateQueries({ queryKey: ['google-calendars'] });
                              toast.success('Calendars fetched');
                            } catch (err) {
                              toast.error(err instanceof Error ? err.message : 'Failed to fetch');
                            } finally {
                              setFetchingCalendars(false);
                            }
                          }}
                        >
                          {fetchingCalendars ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                          Fetch Calendars
                        </Button>
                      </div>
                      {googleCalendars.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Click "Fetch Calendars" to discover your Google Calendars.</p>
                      ) : (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {googleCalendars.map((cal: any) => (
                            <div key={cal._id} className="flex items-center justify-between rounded-md border px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cal.color || '#3b82f6' }} />
                                <span className="text-sm">{cal.name}</span>
                              </div>
                              <Switch
                                checked={cal.is_active}
                                onCheckedChange={async (checked) => {
                                  await toggleGoogleCalendar(cal._id, checked);
                                  queryClient.setQueryData(['google-calendars'], (prev: any[]) =>
                                    (prev ?? []).map((c: any) => c._id === cal._id ? { ...c, is_active: checked } : c)
                                  );
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Gmail Inboxes</p>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={fetchingInboxes}
                          onClick={async () => {
                            setFetchingInboxes(true);
                            try {
                              await fetchAndStoreGoogleLabels();
                              queryClient.invalidateQueries({ queryKey: ['google-inboxes'] });
                              toast.success('Labels fetched');
                            } catch (err) {
                              toast.error(err instanceof Error ? err.message : 'Failed to fetch');
                            } finally {
                              setFetchingInboxes(false);
                            }
                          }}
                        >
                          {fetchingInboxes ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                          Fetch Labels
                        </Button>
                      </div>
                      {googleInboxes.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Click "Fetch Labels" to discover your Gmail labels.</p>
                      ) : (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {googleInboxes.map((inbox: any) => (
                            <div key={inbox._id} className="flex items-center justify-between rounded-md border px-3 py-2">
                              <span className="text-sm">{inbox.name}</span>
                              <Switch
                                checked={inbox.is_active}
                                onCheckedChange={async (checked) => {
                                  await toggleGoogleInbox(inbox._id, checked);
                                  queryClient.setQueryData(['google-inboxes'], (prev: any[]) =>
                                    (prev ?? []).map((i: any) => i._id === inbox._id ? { ...i, is_active: checked } : i)
                                  );
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        <TabsContent value="agency">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Agency Name</Label>
                <Input value={agencyForm.agency_name} onChange={(e) => setAgencyForm({ ...agencyForm, agency_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Address (for invoices/proposals)</Label>
                <Textarea className="min-h-[80px]" value={agencyForm.agency_address} onChange={(e) => setAgencyForm({ ...agencyForm, agency_address: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Default Currency</Label>
                <Select value={agencyForm.default_currency} onValueChange={(v) => setAgencyForm({ ...agencyForm, default_currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['HKD', 'GBP', 'IDR'].map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={updateAgency}>Save Agency Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between rounded-md border p-4">
                  <div className="flex items-center gap-3">
                    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium">GitHub Account</p>
                      <p className="text-xs text-muted-foreground">
                        {user?.github_id
                          ? `Connected as @${user.github_username || user.github_id}`
                          : 'Connect GitHub to set your profile picture and enable GitHub login'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={user?.github_id ? 'outline' : 'default'}
                    size="sm"
                    onClick={async () => {
                      if (user?.github_id) {
                        setConfirmAction({
                          title: 'Disconnect GitHub',
                          message: 'Are you sure? You will need to reconnect to log in with GitHub.',
                          handler: async () => {
                            const res = await fetch('/api/auth/disconnect-github', { method: 'POST' });
                            if (res.ok) {
                              queryClient.setQueryData(['user'], (prev: any) => ({ ...prev, github_id: null, github_username: null }));
                              toast.success('GitHub disconnected');
                            } else {
                              toast.error('Failed to disconnect GitHub');
                            }
                          },
                        });
                      } else {
                        await signIn('github', { redirect: true });
                      }
                    }}
                  >
                    {user?.github_id ? (
                      <><Unlink className="h-4 w-4 mr-1" /> Disconnect</>
                    ) : (
                      <><Link className="h-4 w-4 mr-1" /> Connect</>
                    )}
                  </Button>
                </div>
                <GitHubAppStatusCard />
                <IntegrationField
                  title="Resend"
                  currentKey={integrations.resend?.encrypted_key ? '••••••••' : ''}
                  onSave={(key) => updateIntegration('resend', key)}
                />
                <IntegrationField
                  title="OpenRouter"
                  currentKey={integrations.openrouter?.encrypted_key ? '••••••••' : ''}
                  onSave={(key) => updateIntegration('openrouter', key)}
                />

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <h4 className="text-sm font-medium">Email Domain</h4>
                    </div>
                    <Button variant="outline" size="sm" onClick={loadDomainInfo} disabled={domainLoading}>
                      <RefreshCw className={`h-3 w-3 mr-1 ${domainLoading ? 'animate-spin' : ''}`} />
                      {domainLoading ? 'Loading...' : 'Refresh'}
                    </Button>
                  </div>

                  {domainInfo ? (
                    <div className="space-y-3 rounded-md border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{(domainInfo as any).name}</p>
                          <Badge
                            variant={(domainInfo as any).status === 'verified' ? 'default' : (domainInfo as any).status === 'pending' ? 'secondary' : 'destructive'}
                            className="mt-1 text-[10px]"
                          >
                            {(domainInfo as any).status || 'unknown'}
                          </Badge>
                        </div>
                        {(domainInfo as any).status !== 'verified' && (
                          <Button variant="outline" size="sm" onClick={handleVerifyDomain}>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Verify
                          </Button>
                        )}
                      </div>

                      {(domainInfo as any).records?.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">DNS Records</p>
                          <div className="space-y-1">
                            {(domainInfo as any).records.map((rec: any, i: number) => (
                              <div key={i} className="flex items-start gap-2 text-xs font-mono bg-muted rounded p-2">
                                <span className="text-muted-foreground shrink-0 w-8 uppercase">{rec.type}</span>
                                <span className="break-all">{rec.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-4 pt-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-muted-foreground">Open Tracking</label>
                          <Switch
                            checked={domainTracking.openTracking}
                            onCheckedChange={(checked) => handleUpdateTracking(checked, domainTracking.clickTracking)}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-muted-foreground">Click Tracking</label>
                          <Switch
                            checked={domainTracking.clickTracking}
                            onCheckedChange={(checked) => handleUpdateTracking(domainTracking.openTracking, checked)}
                          />
                        </div>
                      </div>
                    </div>
                  ) : integrations.resend?.encrypted_key ? (
                    <div className="space-y-3">
                      {showCreateDomain ? (
                        <div className="rounded-md border p-3 space-y-3">
                          <div className="space-y-2">
                            <Label className="text-xs">Domain Name</Label>
                            <Input
                              placeholder="mail.jonathansimpson.co"
                              value={newDomainName}
                              onChange={(e) => setNewDomainName(e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleCreateDomain} disabled={domainLoading || !newDomainName.trim()}>
                              {domainLoading ? 'Creating...' : 'Create'}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setShowCreateDomain(false)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">No domain configured.</p>
                          <Button variant="outline" size="sm" onClick={() => setShowCreateDomain(true)}>
                            <Plus className="h-3 w-3 mr-1" />
                            Create
                          </Button>
                          <Button variant="outline" size="sm" onClick={loadDomainInfo} disabled={domainLoading}>
                            <RefreshCw className={`h-3 w-3 mr-1 ${domainLoading ? 'animate-spin' : ''}`} />
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Save your Resend API key above to configure your sending domain.
                    </p>
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Sender Profiles</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddProfile(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>

                  {showAddProfile && (
                    <div className="rounded-md border p-3 space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Display Name</Label>
                        <Input
                          placeholder="e.g. John Smith"
                          value={newProfile.display_name}
                          onChange={(e) => setNewProfile({ ...newProfile, display_name: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Email Prefix</Label>
                        <Input
                          placeholder="e.g. john"
                          value={newProfile.email_prefix}
                          onChange={(e) => setNewProfile({ ...newProfile, email_prefix: e.target.value })}
                          className="h-8 text-sm"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Will send as {newProfile.email_prefix || '{prefix}'}@mail.jonathansimpson.co
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddProfile}>Add</Button>
                        <Button variant="outline" size="sm" onClick={() => setShowAddProfile(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    {(settings as any)?.sender_profiles?.length > 0 ? (
                      (settings as any).sender_profiles.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                          <div className="flex items-center gap-3">
                            <button
                              className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${p.is_default ? 'border-primary' : 'border-muted-foreground'}`}
                              onClick={() => handleSetDefaultProfile(p.id)}
                            >
                              {p.is_default && <div className="h-2 w-2 rounded-full bg-primary" />}
                            </button>
                            <div>
                              <p className="text-sm">{p.display_name}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {p.email_prefix}@mail.jonathansimpson.co
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {p.is_default && (
                              <span className="text-[10px] text-muted-foreground mr-2">Default</span>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveProfile(p.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground py-2">
                        No sender profiles configured. Default profiles will be used.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">AI Models</CardTitle></CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Action</th>
                      <th className="px-4 py-3 font-medium">Model Key</th>
                      <th className="px-4 py-3 font-medium">Model Name</th>
                      <th className="px-4 py-3 font-medium">Latency</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(modelMap as Record<string, { modelKey: string; modelName: string }>).map(([action, config]) => (
                      <tr key={action} className="border-b text-sm">
                        <td className="px-4 py-3 capitalize">
                          {action.replace(/-/g, ' ')}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                          {config.modelKey}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                          {config.modelName}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {modelLatencies[config.modelKey] !== undefined
                            ? `${modelLatencies[config.modelKey]}ms`
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => testModel(config.modelKey)}
                            disabled={testingModel === config.modelKey}
                          >
                            {testingModel === config.modelKey ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3" />
                            )}
                            <span className="ml-1 text-xs">Ping</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Default Invoice Payment Terms</Label>
                <Textarea className="min-h-[80px]" value={templateForm.invoice_default_terms} onChange={(e) => setTemplateForm({ ...templateForm, invoice_default_terms: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Default Proposal Payment Terms</Label>
                <Textarea className="min-h-[80px]" value={templateForm.proposal_default_terms} onChange={(e) => setTemplateForm({ ...templateForm, proposal_default_terms: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Default Proposal Scope Template</Label>
                <Textarea className="min-h-[120px]" value={templateForm.proposal_default_scope_template} onChange={(e) => setTemplateForm({ ...templateForm, proposal_default_scope_template: e.target.value })} />
              </div>
              <Button onClick={updateTemplates}>Save Templates</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Founders</Label>
                <p className="text-sm text-muted-foreground">New founders can register with the invite code from the login page.</p>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-sm text-muted-foreground">Invite new team members</p>
                <Button variant="outline" size="sm" className="mt-2" disabled>
                  Invite via Email — Coming Soon
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-keys">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">API Keys</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Keys used to authenticate external requests to the Studio API (e.g. creating leads from your portfolio site).
                  </p>
                </div>
                <Button onClick={() => { setGeneratedKey(null); setShowNewKeyDialog(true); }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Generate Key
                </Button>
              </div>

              {apiKeys.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No API keys yet. Generate one to get started.
                </p>
              ) : (
                <div className="space-y-2">
                  {apiKeys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Key className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">{key.name}</span>
                          <Badge
                            variant={key.scope === 'full' ? 'default' : key.scope === 'write' ? 'secondary' : 'outline'}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {key.scope}
                          </Badge>
                          <Badge
                            variant={key.is_active ? 'default' : 'destructive'}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {key.is_active ? 'Active' : 'Disabled'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">
                          {key.key_prefix}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Created {new Date(key.created_at).toLocaleDateString()}
                          {key.last_used_at ? ` · Last used ${new Date(key.last_used_at).toLocaleDateString()}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={key.is_active}
                          onCheckedChange={(checked) => toggleKey(key.id, checked)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteKey(key.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for authenticating external requests.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Key Name</Label>
              <Input
                placeholder="e.g. Portfolio Site"
                value={newKeyForm.name}
                onChange={(e) => setNewKeyForm({ ...newKeyForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select
                value={newKeyForm.scope}
                onValueChange={(v) => setNewKeyForm({ ...newKeyForm, scope: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['read', 'write', 'full'] as const).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === 'read' ? 'Read — only read data' : s === 'write' ? 'Write — create and update data' : 'Full — all permissions'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generateKey} disabled={creating || !newKeyForm.name.trim()} className="w-full">
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Generate
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!generatedKey}
        onOpenChange={(open) => { if (!open) setGeneratedKey(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Generated</DialogTitle>
            <DialogDescription>
              Copy this key now. You will not be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <textarea
                className="w-full rounded-md border bg-muted p-3 text-xs font-mono"
                rows={3}
                readOnly
                value={generatedKey || ''}
              />
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => {
                  if (generatedKey) {
                    navigator.clipboard.writeText(generatedKey);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Store this key securely. For example, add it as <code className="text-xs bg-muted px-1 py-0.5 rounded">CRM_API_KEY</code> in your portfolio site&apos;s environment variables.
            </p>
            <Button variant="default" className="w-full" onClick={() => setGeneratedKey(null)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!confirmAction}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmAction?.title}</DialogTitle>
            <DialogDescription>{confirmAction?.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await confirmAction?.handler();
                setConfirmAction(null);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GitHubAppStatusCard() {
  const [info, setInfo] = useState<{
    appId: number;
    org: string;
    installationId: number;
    tokenExpiresIn: number;
    repos: number;
  } | { error: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { getAppInfo } = await import('@/lib/github');
        const result = await getAppInfo();
        setInfo(result);
      } catch {
        setInfo({ error: 'Failed to verify connection' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const isError = info && 'error' in info;
  const isConnected = info && !isError;

  return (
    <div className="rounded-md border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Server className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">GitHub App</p>
            <p className="text-xs text-muted-foreground">Automated issue syncing via GitHub App</p>
          </div>
        </div>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : isConnected ? (
          <Badge variant="default" className="bg-green-600/20 text-green-500 border-green-500/30 text-[10px]">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        ) : (
          <Badge variant="destructive" className="text-[10px]">
            Disconnected
          </Badge>
        )}
      </div>

      {loading && (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 w-48 rounded bg-muted" />
          <div className="h-3 w-32 rounded bg-muted" />
        </div>
      )}

      {isConnected && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground">App ID</p>
            <p className="font-mono mt-0.5">{info.appId}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Installation</p>
            <p className="font-mono mt-0.5">@{info.org}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Accessible Repos</p>
            <p className="font-mono mt-0.5">{info.repos}</p>
          </div>
        </div>
      )}

      {isError && (
        <div className="space-y-2">
          <p className="text-xs text-destructive">{info.error}</p>
          <p className="text-xs text-muted-foreground">
            Ensure <code className="bg-muted px-1 rounded text-[10px]">GITHUB_APP_ID</code> and{' '}
            <code className="bg-muted px-1 rounded text-[10px]">GITHUB_APP_PRIVATE_KEY</code> are set.
          </p>
        </div>
      )}
    </div>
  );
}

function IntegrationField({
  title,
  currentKey,
  onSave,
}: {
  title: string;
  currentKey: string;
  onSave: (key: string) => void;
}) {
  const [key, setKey] = useState('');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{title}</h4>
        {currentKey && <span className="text-xs text-muted-foreground">Saved</span>}
      </div>
      <div className="flex gap-2">
        <Input
          type="password"
          placeholder={`${title} API Key`}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="flex-1"
        />
        <Button onClick={() => onSave(key)} disabled={!key}>Save</Button>
      </div>
    </div>
  );
}
