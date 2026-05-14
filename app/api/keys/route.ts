import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { connect } from "@/lib/db/connect"
import { ApiKey } from "@/lib/db/models/core"
import crypto from "crypto"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await connect()

  const data = await ApiKey.find()
    .select("id name key_prefix scope is_active last_used_at created_at")
    .sort({ created_at: -1 })
    .lean({ virtuals: true })

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { name?: string; scope?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { name, scope } = body

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  const validScopes = ["read", "write", "full"] as const
  const keyScope = scope && validScopes.includes(scope as "read" | "write" | "full") ? scope : "write"

  const rawKey = `jsc_studio_${crypto.randomBytes(24).toString("hex")}`
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex")
  const keyPrefix = rawKey.slice(0, 19) + "..."

  await connect()

  const data = await ApiKey.create({
    name: name.trim(),
    key_hash: keyHash,
    key_prefix: keyPrefix,
    scope: keyScope,
    created_by: session.user.id,
  })

  const result = data.toObject({ virtuals: true })

  return NextResponse.json({ ...result, raw_key: rawKey }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { id?: string; is_active?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { id, is_active } = body

  if (!id || typeof is_active !== "boolean") {
    return NextResponse.json({ error: "id and is_active required" }, { status: 400 })
  }

  await connect()
  await ApiKey.findByIdAndUpdate(id, { is_active })

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = request.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id query param required" }, { status: 400 })

  await connect()
  await ApiKey.findByIdAndDelete(id)

  return NextResponse.json({ success: true })
}
