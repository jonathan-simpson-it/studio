import { NextRequest, NextResponse } from "next/server"
import { connect } from "@/lib/db/connect"
import { VerificationCode } from "@/lib/db/models/core"
import { sendVerificationCode } from "@/lib/resend"

export async function POST(request: NextRequest) {
  let body: { email?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { email } = body
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
  }

  await connect()

  const rateLimitMinutes = 15
  const maxRequests = 3
  const since = new Date(Date.now() - rateLimitMinutes * 60 * 1000)
  const recentCount = await VerificationCode.countDocuments({
    email: email.toLowerCase(),
    created_at: { $gte: since },
  })

  if (recentCount >= maxRequests) {
    return NextResponse.json(
      { error: `Too many requests. Please try again in ${rateLimitMinutes} minutes.` },
      { status: 429 }
    )
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString()

  await VerificationCode.create({
    email: email.toLowerCase(),
    code,
    expires_at: new Date(Date.now() + 15 * 60 * 1000),
    used: false,
    attempts: 0,
  })

  try {
    await sendVerificationCode(email, code)
  } catch (err) {
    console.error("Failed to send verification email:", err)
    return NextResponse.json({ error: "Failed to send email. Please try again." }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
