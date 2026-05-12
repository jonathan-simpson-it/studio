'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';

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
  const supabase = createClient();
  const { data: session } = useSession();
  const [user, setUser] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [profileForm, setProfileForm] = useState({ full_name: '', timezone: 'Asia/Hong_Kong', default_hourly_rate: '0' });
  const [agencyForm, setAgencyForm] = useState({ agency_name: 'Jonathon Simpson & Co.', agency_address: '', default_currency: 'HKD' });
  const [integrations, setIntegrations] = useState<Record<string, any>>({});
  const [templateForm, setTemplateForm] = useState({ invoice_default_terms: '', proposal_default_terms: '', proposal_default_scope_template: '' });
  const [modelMap, setModelMap] = useState<Record<string, { modelKey: string; modelName: string }>>({});
  const [modelLatencies, setModelLatencies] = useState<Record<string, number | null>>({});
  const [testingModel, setTestingModel] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
        setProfileForm({
          full_name: data.user.user_metadata?.full_name || session?.user?.name || '',
          timezone: data.user.user_metadata?.timezone || 'Asia/Hong_Kong',
          default_hourly_rate: data.user.user_metadata?.default_hourly_rate?.toString() || '0',
        });
      }
    });

    supabase.from('agency_settings').select('*').single().then(({ data }) => {
      if (data) {
        setSettings(data);
        setAgencyForm({ agency_name: data.agency_name, agency_address: data.agency_address, default_currency: data.default_currency });
        setTemplateForm({ invoice_default_terms: data.invoice_default_terms, proposal_default_terms: data.proposal_default_terms, proposal_default_scope_template: data.proposal_default_scope_template });
      }
    });

    supabase.from('integrations').select('*').then(({ data }) => {
      if (data) {
        const map: Record<string, any> = {};
        data.forEach((i) => { map[i.service] = i; });
        setIntegrations(map);
      }
    });

    fetch('/api/ai/models').then((r) => r.json()).then((data) => {
      if (data.actions) setModelMap(data.actions);
    });
  }, []);

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
    const { error } = await supabase.auth.updateUser({
      data: { full_name: profileForm.full_name, timezone: profileForm.timezone, default_hourly_rate: parseFloat(profileForm.default_hourly_rate) },
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Profile updated');
  }

  async function updateAgency() {
    const { error } = await supabase.from('agency_settings').update(agencyForm).eq('id', settings?.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Agency settings updated');
  }

  async function updateIntegration(service: string, key: string) {
    const encrypted = btoa(key);
    const { error } = await supabase.from('integrations').upsert(
      { service, encrypted_key: encrypted, extra_config: integrations[service]?.extra_config || {} },
      { onConflict: 'service' }
    );
    if (error) { toast.error(error.message); return; }
    toast.success(`${service} key saved`);
  }

  async function updateTemplates() {
    const { error } = await supabase.from('agency_settings').update(templateForm).eq('id', settings?.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Templates updated');
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-xl font-semibold">Settings</h2>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="agency">Agency</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardContent className="p-6 space-y-4">
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

        <TabsContent value="agency">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Agency Name</Label>
                <Input value={agencyForm.agency_name} onChange={(e) => setAgencyForm({ ...agencyForm, agency_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Address (for invoices/proposals)</Label>
                <textarea className="w-full rounded-md border bg-transparent p-3 text-sm" rows={3} value={agencyForm.agency_address} onChange={(e) => setAgencyForm({ ...agencyForm, agency_address: e.target.value })} />
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
                <IntegrationField
                  title="GitHub"
                  service="github"
                  currentKey={integrations.github?.encrypted_key ? '••••••••' : ''}
                  onSave={(key) => updateIntegration('github', key)}
                  extraFields={integrations.github?.extra_config as any}
                />
                <IntegrationField
                  title="Resend"
                  service="resend"
                  currentKey={integrations.resend?.encrypted_key ? '••••••••' : ''}
                  onSave={(key) => updateIntegration('resend', key)}
                />
                <IntegrationField
                  title="OpenRouter"
                  service="openrouter"
                  currentKey={integrations.openrouter?.encrypted_key ? '••••••••' : ''}
                  onSave={(key) => updateIntegration('openrouter', key)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">AI Models</CardTitle></CardHeader>
              <CardContent className="p-0">
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
                    {Object.entries(modelMap).map(([action, config]) => (
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
                <textarea className="w-full rounded-md border bg-transparent p-3 text-sm" rows={3} value={templateForm.invoice_default_terms} onChange={(e) => setTemplateForm({ ...templateForm, invoice_default_terms: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Default Proposal Payment Terms</Label>
                <textarea className="w-full rounded-md border bg-transparent p-3 text-sm" rows={3} value={templateForm.proposal_default_terms} onChange={(e) => setTemplateForm({ ...templateForm, proposal_default_terms: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Default Proposal Scope Template</Label>
                <textarea className="w-full rounded-md border bg-transparent p-3 text-sm" rows={5} value={templateForm.proposal_default_scope_template} onChange={(e) => setTemplateForm({ ...templateForm, proposal_default_scope_template: e.target.value })} />
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
                <p className="text-sm text-muted-foreground">Founders are managed via the Supabase Auth dashboard.</p>
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
      </Tabs>
    </div>
  );
}

function IntegrationField({
  title,
  service,
  currentKey,
  onSave,
  extraFields,
}: {
  title: string;
  service: string;
  currentKey: string;
  onSave: (key: string) => void;
  extraFields?: { org?: string };
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
      {service === 'github' && (
        <Input
          placeholder="GitHub Org Name"
          className="text-sm"
          value={extraFields?.org || ''}
          onChange={(e) => {
            // Save org name
          }}
        />
      )}
    </div>
  );
}
