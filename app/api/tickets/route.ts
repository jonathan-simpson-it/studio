import { NextRequest, NextResponse } from "next/server"
import { connect } from "@/lib/db/connect"
import { Ticket } from "@/lib/db/models/tickets"
import { Client } from "@/lib/db/models/crm"
import { validateApiKey } from "@/lib/auth/api-key"
import { createTicket } from "@/lib/db/actions/tickets"

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

  const { contact_email, contact_name, title, description, original_message, source, priority } = body

  if (!contact_email || !contact_name || !title) {
    return NextResponse.json(
      { error: "contact_email, contact_name, and title are required" },
      { status: 400 }
    )
  }

  try {
    const ticket = await createTicket({
      contact_email: contact_email as string,
      contact_name: contact_name as string,
      title: title as string,
      description: (description as string) || undefined,
      original_message: (original_message as string) || undefined,
      source: (source as string) || "support-form",
      priority: (priority as string) || "Medium",
    })

    return NextResponse.json({ success: true, ticket }, { status: 201 })
  } catch (error) {
    console.error("Failed to create ticket:", error)
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const apiKey = await validateApiKey(request, "read")
  if (!apiKey.valid) {
    return NextResponse.json({ error: apiKey.error }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")

  if (!email) {
    return NextResponse.json({ error: "email query parameter required" }, { status: 400 })
  }

  await connect()

  const tickets = await Ticket.find({ contact_email: email })
    .sort({ created_at: -1 })
    .lean({ virtuals: true })

  const client = await Client.findOne({ email })
    .select("company_name contact_name ticket_package remaining_tickets")
    .lean({ virtuals: true })

  const data = {
    tickets,
    client: client
      ? {
          company_name: (client as any).company_name,
          contact_name: (client as any).contact_name,
          ticket_package: (client as any).ticket_package,
          remaining_tickets: (client as any).remaining_tickets,
        }
      : null,
  }

  return NextResponse.json(data)
}
