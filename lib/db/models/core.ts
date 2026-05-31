import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  full_name: string;
  avatar_url: string | null;
  avatar_provider: 'github' | 'google' | null;
  github_id: string | null;
  github_username: string | null;
  google_id: string | null;
  google_email: string | null;
  google_refresh_token: string | null;
  role: 'founder' | 'client';
  timezone: string;
  default_hourly_rate: number;
  created_at: Date;
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  full_name: { type: String, required: true, default: '' },
  avatar_url: { type: String, default: null },
  avatar_provider: { type: String, enum: ['github', 'google'], default: null },
  github_id: { type: String, default: null },
  github_username: { type: String, default: null },
  google_id: { type: String, default: null },
  google_email: { type: String, default: null },
  google_refresh_token: { type: String, default: null },
  role: { type: String, enum: ['founder', 'client'], default: 'founder' },
  timezone: { type: String, default: 'Asia/Hong_Kong' },
  default_hourly_rate: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
});

export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

export interface IAgencySettings extends Document {
  agency_name: string;
  agency_address: string;
  logo_url: string | null;
  default_currency: string;
  invoice_default_terms: string;
  proposal_default_terms: string;
  proposal_default_scope_template: string;
}

const agencySettingsSchema = new Schema<IAgencySettings>({
  agency_name: { type: String, default: 'Jonathan Simpson & Co.' },
  agency_address: { type: String, default: '' },
  logo_url: { type: String, default: null },
  default_currency: { type: String, default: 'HKD' },
  invoice_default_terms: { type: String, default: '' },
  proposal_default_terms: { type: String, default: '' },
  proposal_default_scope_template: { type: String, default: '' },
});

export const AgencySettings = mongoose.models.AgencySettings || mongoose.model<IAgencySettings>('AgencySettings', agencySettingsSchema);

export interface IIntegration extends Document {
  service: string;
  encrypted_key: string;
  extra_config: Record<string, unknown>;
}

const integrationSchema = new Schema<IIntegration>({
  service: { type: String, required: true, unique: true },
  encrypted_key: { type: String, default: '' },
  extra_config: { type: Schema.Types.Mixed, default: {} },
});

export const Integration = mongoose.models.Integration || mongoose.model<IIntegration>('Integration', integrationSchema);

export interface IApiKey extends Document {
  name: string;
  key_hash: string;
  key_prefix: string;
  scope: 'read' | 'write' | 'full';
  is_active: boolean;
  created_by: string;
  last_used_at: Date | null;
  created_at: Date;
}

const apiKeySchema = new Schema<IApiKey>({
  name: { type: String, required: true },
  key_hash: { type: String, required: true, unique: true },
  key_prefix: { type: String, required: true },
  scope: { type: String, enum: ['read', 'write', 'full'], default: 'write' },
  is_active: { type: Boolean, default: true },
  created_by: { type: String, required: true },
  last_used_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
});

export const ApiKey = mongoose.models.ApiKey || mongoose.model<IApiKey>('ApiKey', apiKeySchema);

export interface IVerificationCode extends Document {
  email: string;
  code: string;
  expires_at: Date;
  used: boolean;
  attempts: number;
  created_at: Date;
}

const verificationCodeSchema = new Schema<IVerificationCode>({
  email: { type: String, required: true },
  code: { type: String, required: true },
  expires_at: { type: Date, required: true },
  used: { type: Boolean, default: false },
  attempts: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
});

verificationCodeSchema.index({ email: 1, created_at: -1 });

export const VerificationCode = mongoose.models.VerificationCode || mongoose.model<IVerificationCode>('VerificationCode', verificationCodeSchema);
