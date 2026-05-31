#!/usr/bin/env node

import mongoose from "mongoose";
import { createHash, randomBytes } from "crypto";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const paths = [
    resolve(__dirname, "..", ".env.local"),
    resolve(__dirname, "..", ".env.production"),
    resolve(__dirname, "..", ".env"),
  ];
  for (const p of paths) {
    if (existsSync(p)) {
      for (const line of readFileSync(p, "utf-8").split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("Error: MONGODB_URI not found in env or .env.local");
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log("\n=== Studio API Key Generator (CLI) ===\n");

  const email = (await ask("User email (who owns this key): ")).trim();
  const name = (await ask("Key name (e.g. 'mcp-perplexity'): ")).trim();
  const scopeRaw = (await ask("Scope (read / write / full) [write]: ")).trim();
  const scope = ["read", "write", "full"].includes(scopeRaw) ? scopeRaw : "write";

  if (!email || !name) {
    console.error("Error: email and name are required");
    rl.close();
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);

  // Register schemas inline so Mongoose models exist before queries
  const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    full_name: { type: String, required: true, default: "" },
    avatar_url: { type: String, default: null },
    avatar_provider: { type: String, enum: ["github", "google"], default: null },
    github_id: { type: String, default: null },
    github_username: { type: String, default: null },
    google_id: { type: String, default: null },
    google_email: { type: String, default: null },
    google_refresh_token: { type: String, default: null },
    role: { type: String, enum: ["founder", "client"], default: "founder" },
    timezone: { type: String, default: "Asia/Hong_Kong" },
    default_hourly_rate: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now },
  });

  const apiKeySchema = new mongoose.Schema({
    name: { type: String, required: true },
    key_hash: { type: String, required: true, unique: true },
    key_prefix: { type: String, required: true },
    scope: { type: String, enum: ["read", "write", "full"], default: "write" },
    is_active: { type: Boolean, default: true },
    created_by: { type: String, required: true },
    last_used_at: { type: Date, default: null },
    created_at: { type: Date, default: Date.now },
  });

  const User = mongoose.models.User || mongoose.model("User", userSchema);
  const ApiKey = mongoose.models.ApiKey || mongoose.model("ApiKey", apiKeySchema);

  const user = await User.findOne({ email });
  if (!user) {
    console.error(`Error: no user found with email "${email}"`);
    rl.close();
    process.exit(1);
  }

  const rawKey = `jsc_studio_${randomBytes(24).toString("hex")}`;
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 19) + "...";

  await ApiKey.create({
    name,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    scope,
    created_by: user._id.toString(),
    is_active: true,
    created_at: new Date(),
  });

  console.log("\n=== KEY CREATED ===");
  console.log(`  Name:    ${name}`);
  console.log(`  Scope:   ${scope}`);
  console.log(`  Owner:   ${email}`);
  console.log(`\n  Raw key (copy this now — it won't be shown again):`);
  console.log(`  ${rawKey}`);
  console.log("\n  Add to ~/.studio-mcp.json:");
  console.log(`  {\n    "studioBaseUrl": "https://studio.jonathansimpson.co",\n    "studioApiKey": "${rawKey}"\n  }\n`);

  rl.close();
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  rl.close();
  process.exit(1);
});
