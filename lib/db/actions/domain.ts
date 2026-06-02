'use server';

import { Resend } from 'resend';
import { connect } from '@/lib/db/connect';
import { AgencySettings } from '@/lib/db/models/core';
import { auth } from '@/auth';
import { toPlain } from '@/lib/db/to-plain';

function getClient(): Resend {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function createDomain(name: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const resend = getClient();
  const { data, error } = await resend.domains.create({ name });
  if (error) throw new Error(error.message);

  await connect();
  const settings = await AgencySettings.findOne().lean({ virtuals: true });
  if (settings) {
    await AgencySettings.findByIdAndUpdate(settings._id, {
      custom_domain_id: data?.id || null,
      custom_domain_name: name,
      custom_domain_verified: false,
      custom_domain_verification_status: 'pending',
    });
  }

  return data;
}

export async function getDomainInfo() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();
  const settings = await AgencySettings.findOne().lean({ virtuals: true });
  if (!settings?.custom_domain_id) return null;

  const resend = getClient();
  try {
    const { data, error } = await resend.domains.get(settings.custom_domain_id);
    if (error) throw new Error(error.message);
    return data;
  } catch {
    if (!settings.custom_domain_name) return null;

    const { data: domains, error: listError } = await resend.domains.list();
    if (listError) throw new Error(listError.message);

    const match = (domains as any)?.data?.find((d: any) => d.name === settings.custom_domain_name);
    if (!match) return null;

    const settingsDoc = await AgencySettings.findOne();
    if (settingsDoc) {
      settingsDoc.custom_domain_id = match.id;
      await settingsDoc.save();
    }

    return match;
  }
}

export async function verifyDomain() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();
  const settings = await AgencySettings.findOne().lean({ virtuals: true });
  if (!settings?.custom_domain_id) throw new Error('No domain configured');

  const resend = getClient();
  const { error } = await resend.domains.verify(settings.custom_domain_id);
  if (error) throw new Error(error.message);

  const { data: domainData } = await resend.domains.get(settings.custom_domain_id);
  const verified = domainData?.status === 'verified';
  await AgencySettings.findByIdAndUpdate(settings._id, {
    custom_domain_verified: verified,
    custom_domain_verification_status: domainData?.status || 'pending',
  });

  return domainData;
}

export async function updateDomainTracking(openTracking: boolean, clickTracking: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();
  const settings = await AgencySettings.findOne().lean({ virtuals: true });
  if (!settings?.custom_domain_id) throw new Error('No domain configured');

  const resend = getClient();
  const { data, error } = await resend.domains.update({
    id: settings.custom_domain_id,
    openTracking,
    clickTracking,
  });
  if (error) throw new Error(error.message);

  await AgencySettings.findByIdAndUpdate(settings._id, {
    email_open_tracking: openTracking,
    email_click_tracking: clickTracking,
  });

  return data;
}

export async function listDomains() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const resend = getClient();
  const { data, error } = await resend.domains.list();
  if (error) throw new Error(error.message);
  return data;
}

export async function removeDomain() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();
  const settings = await AgencySettings.findOne().lean({ virtuals: true });
  if (!settings?.custom_domain_id) throw new Error('No domain configured');

  const resend = getClient();
  const { data, error } = await resend.domains.remove(settings.custom_domain_id);
  if (error) throw new Error(error.message);

  await AgencySettings.findByIdAndUpdate(settings._id, {
    custom_domain_id: null,
    custom_domain_name: null,
    custom_domain_verified: false,
    custom_domain_verification_status: null,
  });

  return data;
}

export async function addSenderProfile(profile: { id: string; display_name: string; email_prefix: string }) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();
  const settings = await AgencySettings.findOne().lean({ virtuals: true });
  if (!settings) throw new Error('Settings not found');

  const senderProfiles = (settings as any).sender_profiles || [];
  const isFirst = senderProfiles.length === 0;

  const newProfile = {
    id: profile.id,
    display_name: profile.display_name,
    email_prefix: profile.email_prefix,
    is_default: isFirst,
  };

  const result = await AgencySettings.findByIdAndUpdate(
    settings._id,
    { $push: { sender_profiles: newProfile } },
    { returnDocument: 'after' }
  ).lean({ virtuals: true });

  return toPlain(result);
}

export async function updateSenderProfile(id: string, data: { display_name?: string; email_prefix?: string; is_default?: boolean }) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();
  const settings = await AgencySettings.findOne().lean({ virtuals: true });
  if (!settings) throw new Error('Settings not found');

  const update: Record<string, unknown> = {};
  if (data.display_name !== undefined) update['sender_profiles.$.display_name'] = data.display_name;
  if (data.email_prefix !== undefined) update['sender_profiles.$.email_prefix'] = data.email_prefix;

  if (data.is_default) {
    await AgencySettings.updateMany(
      {},
      { $set: { 'sender_profiles.$[].is_default': false } }
    );
  }

  if (data.is_default !== undefined) update['sender_profiles.$.is_default'] = data.is_default;

  await AgencySettings.findOneAndUpdate(
    { 'sender_profiles.id': id },
    { $set: update }
  );

  return toPlain(await AgencySettings.findOne().lean({ virtuals: true }));
}

export async function removeSenderProfile(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();
  const result = await AgencySettings.findOneAndUpdate(
    {},
    { $pull: { sender_profiles: { id } } },
    { returnDocument: 'after' }
  ).lean({ virtuals: true });

  return toPlain(result);
}

export async function setDefaultSenderProfile(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await connect();

  await AgencySettings.updateMany(
    {},
    { $set: { 'sender_profiles.$[].is_default': false } }
  );

  await AgencySettings.findOneAndUpdate(
    { 'sender_profiles.id': id },
    { $set: { 'sender_profiles.$.is_default': true } }
  );

  return toPlain(await AgencySettings.findOne().lean({ virtuals: true }));
}
