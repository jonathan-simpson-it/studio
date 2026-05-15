'use server';

import { connect } from '@/lib/db/connect';
import { User, AgencySettings, Integration, IApiKey, ApiKey } from '@/lib/db/models/core';
import { hashPassword } from '@/lib/auth/password';
import { validateInviteCode } from '@/lib/auth/invite';
import { auth } from '@/auth';
import { toPlain } from '@/lib/db/to-plain';

export async function registerUser(data: {
  email: string;
  password: string;
  full_name: string;
  invite_code: string;
}) {
  if (!validateInviteCode(data.invite_code)) {
    throw new Error('Invalid invite code');
  }

  await connect();

  const existing = await User.findOne({ email: data.email });
  if (existing) {
    throw new Error('An account with this email already exists');
  }

  const passwordHash = await hashPassword(data.password);
  const user = await User.create({
    email: data.email,
    passwordHash,
    full_name: data.full_name || '',
    role: 'founder',
    timezone: 'Asia/Hong_Kong',
    default_hourly_rate: 0,
    created_at: new Date(),
  });
  return user.toObject({ virtuals: true });
}

export async function connectGitHubAccount(userId: string, githubId: string, githubUsername: string, avatarUrl: string | null) {
  await connect();
  return User.findByIdAndUpdate(userId, {
    github_id: githubId,
    github_username: githubUsername,
    avatar_url: avatarUrl,
  }, { returnDocument: 'after' }).lean({ virtuals: true });
}

export async function getUser(id: string) {
  await connect();
  return User.findById(id).lean({ virtuals: true });
}

export async function getUserByEmail(email: string) {
  await connect();
  return User.findOne({ email }).lean({ virtuals: true });
}

export async function createUser(data: {
  email: string;
  password: string;
  full_name?: string;
  role?: 'founder' | 'client';
}) {
  await connect();
  const passwordHash = await hashPassword(data.password);
  const user = await User.create({
    email: data.email,
    passwordHash,
    full_name: data.full_name || '',
    role: data.role || 'founder',
    timezone: 'Asia/Hong_Kong',
    default_hourly_rate: 0,
    created_at: new Date(),
  });
  return user.toObject({ virtuals: true });
}

export async function updateUserProfile(id: string, data: {
  full_name?: string;
  timezone?: string;
  default_hourly_rate?: number;
}) {
  await connect();
  return User.findByIdAndUpdate(id, data, { returnDocument: 'after' }).lean({ virtuals: true });
}

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  await connect();
  const user = await User.findById(session.user.id).lean({ virtuals: true });
  return user ? toPlain(user) : null;
}

export async function listFounders() {
  await connect();
  const users = await User.find({ role: 'founder' })
    .select('full_name email google_email')
    .sort({ full_name: 1 })
    .lean({ virtuals: true });
  return users.map((u: any) => ({
    id: u._id.toString(),
    name: u.full_name,
    email: u.email,
  }));
}

export async function getAgencySettings() {
  await connect();
  const settings = await AgencySettings.findOne().lean({ virtuals: true });
  if (!settings) {
    const created = await AgencySettings.create({
      agency_name: 'Jonathon Simpson & Co.',
      agency_address: '',
      default_currency: 'HKD',
      invoice_default_terms: '',
      proposal_default_terms: '',
      proposal_default_scope_template: '',
    });
    return toPlain(created.toObject({ virtuals: true }));
  }
  return toPlain(settings);
}

export async function updateAgencySettings(id: string, data: Record<string, unknown>) {
  await connect();
  return AgencySettings.findByIdAndUpdate(id, data, { returnDocument: 'after' }).lean({ virtuals: true });
}

export async function getIntegrations() {
  await connect();
  return toPlain(await Integration.find().lean({ virtuals: true }));
}

export async function upsertIntegration(service: string, encryptedKey: string, extraConfig: Record<string, unknown> = {}) {
  await connect();
  return Integration.findOneAndUpdate(
    { service },
    { encrypted_key: encryptedKey, extra_config: extraConfig },
    { upsert: true, returnDocument: 'after' }
  ).lean({ virtuals: true });
}

export async function getApiKeys() {
  await connect();
  return ApiKey.find().sort({ created_at: -1 }).lean({ virtuals: true });
}

export async function createApiKey(data: {
  name: string;
  key_hash: string;
  key_prefix: string;
  scope: string;
  created_by: string;
}) {
  await connect();
  const key = await ApiKey.create(data);
  return key.toObject({ virtuals: true });
}

export async function updateApiKey(id: string, data: Partial<IApiKey>) {
  await connect();
  return ApiKey.findByIdAndUpdate(id, data, { returnDocument: 'after' }).lean({ virtuals: true });
}

export async function deleteApiKey(id: string) {
  await connect();
  return ApiKey.findByIdAndDelete(id).lean({ virtuals: true });
}
