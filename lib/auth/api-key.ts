import { createServer } from "@/lib/supabase/server"
import crypto from "crypto"

export async function validateApiKey(
  request: Request,
  requiredScope: "read" | "write" | "full" = "write"
): Promise<{ valid: true; keyId: string } | { valid: false; error: string }> {
  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { valid: false, error: "Missing or invalid Authorization header" }
  }

  const rawKey = authHeader.slice(7)

  const supabase = await createServer()

  const { data: keys, error } = await supabase
    .from("api_keys")
    .select("id, key_hash, scope, is_active")

  if (error || !keys) {
    return { valid: false, error: "Failed to validate API key" }
  }

  for (const key of keys) {
    const hash = crypto.createHash("sha256").update(rawKey).digest("hex")

    if (key.key_hash === hash) {
      if (!key.is_active) {
        return { valid: false, error: "API key is deactivated" }
      }

      const scopeOrder = ["read", "write", "full"]
      if (scopeOrder.indexOf(key.scope) < scopeOrder.indexOf(requiredScope)) {
        return { valid: false, error: `Insufficient scope. Requires ${requiredScope}, has ${key.scope}` }
      }

      await supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id)

      return { valid: true, keyId: key.id }
    }
  }

  return { valid: false, error: "Invalid API key" }
}
