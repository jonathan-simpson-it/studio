import { NextRequest, NextResponse } from "next/server"
import { connect } from "@/lib/db/connect"
import { VerificationCode } from "@/lib/db/models/core"
import { getTicketsByEmail } from "@/lib/db/actions/tickets"

export async function POST(request: NextRequest) {
  let body: { email?: string; code?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { email, code } = body
  if (!email || !code) {
    return NextResponse.json({ error: "Email and code are required" }, { status: 400 })
  }

  await connect()

  const lowerEmail = email.toLowerCase()

  const existing = await VerificationCode.findOne({ email: lowerEmail, used: false })
    .sort({ created_at: -1 })
    .lean()

  if (!existing) {
    return NextResponse.json({ error: "No verification code found. Request a new one." }, { status: 400 })
  }

  const doc = existing as any

  if (new Date() > new Date(doc.expires_at)) {
    return NextResponse.json({ error: "Code has expired. Request a new one." }, { status: 400 })
  }

  if (doc.attempts >= 5) {
    return NextResponse.json({ error: "Too many failed attempts. Request a new code." }, { status: 400 })
  }

  if (doc.code !== code) {
    await VerificationCode.findByIdAndUpdate(doc._id, { $inc: { attempts: 1 } })
    const remaining = 4 - doc.attempts
    const msg =
      remaining > 0
        ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
        : "Too many failed attempts. Request a new code."
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  await VerificationCode.findByIdAndUpdate(doc._id, { used: true })

  try {
    const data = await getTicketsByEmail(lowerEmail)
    return NextResponse.json(data)
  } catch (err) {
    console.error("Failed to fetch portal data:", err)
    return NextResponse.json({ error: "Failed to load portal data." }, { status: 500 })
  }
}
