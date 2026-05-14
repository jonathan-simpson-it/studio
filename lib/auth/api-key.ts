import { connect } from "@/lib/db/connect"
import { ApiKey } from "@/lib/db/models/core"
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

  await connect()

  const keys = await ApiKey.find().lean()

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

      await ApiKey.findByIdAndUpdate(key._id, { last_used_at: new Date() })

      return { valid: true, keyId: key._id.toString() }
    }
  }

  return { valid: false, error: "Invalid API key" }
}
