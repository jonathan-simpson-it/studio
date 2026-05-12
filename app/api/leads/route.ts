import { NextRequest, NextResponse } from "next/server"
import { createServer } from "@/lib/supabase/server"
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

  const supabase = await createServer()
  const services = [persona, interest].filter(Boolean) as string[]

  const { data, error } = await supabase
    .from("leads")
    .insert({
      company_name: (company_name as string) || (contact_name as string) || "Website Lead",
      contact_name: (contact_name as string) || email?.toString().split("@")[0] || "Unknown",
      email: (email as string) || null,
      phone: (phone as string) || null,
      source: "Inbound",
      services_interested: services.length > 0 ? services : null,
      notes: (message as string) || null,
      stage: "New",
    })
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Lead with this email already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, id: data.id, lead: data }, { status: 201 })
}
