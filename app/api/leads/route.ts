import { NextRequest, NextResponse } from "next/server"
import { connect } from "@/lib/db/connect"
import { Lead } from "@/lib/db/models/crm"
import { validateApiKey } from "@/lib/auth/api-key"

export async function POST(request: NextRequest) {
  const apiKey = await validateApiKey(request, "write")
  if (!apiKey.valid) {
    return NextResponse.json({ error: apiKey.error }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { company_name, contact_name, email, phone, message, persona, interest } = body

  if (!contact_name && !email) {
    return NextResponse.json({ error: "contact_name or email required" }, { status: 400 })
  }

  await connect()
  const services = [persona, interest].filter(Boolean) as string[]

  try {
    const data = await Lead.create({
      company_name: (company_name as string) || (contact_name as string) || "Website Lead",
      contact_name: (contact_name as string) || email?.toString().split("@")[0] || "Unknown",
      email: (email as string) || null,
      phone: (phone as string) || null,
      source: "Inbound",
      services_interested: services.length > 0 ? services : [],
      notes: (message as string) || null,
      stage: "New",
    })

    const result = data.toObject({ virtuals: true })

    return NextResponse.json({ success: true, id: result._id, lead: result }, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code: number }).code === 11000) {
      return NextResponse.json({ error: "Lead with this email already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 })
  }
}
