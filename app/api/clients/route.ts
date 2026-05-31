import { NextRequest, NextResponse } from "next/server"
import { connect } from "@/lib/db/connect"
import { Client } from "@/lib/db/models/crm"
import { validateApiKey } from "@/lib/auth/api-key"

export async function GET(request: NextRequest) {
  const apiKey = await validateApiKey(request, "read")
  if (!apiKey.valid) {
    return NextResponse.json({ error: apiKey.error }, { status: 401 })
  }

  await connect()

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")

  let query: Record<string, unknown> = {}
  if (search) {
    query = { company_name: { $regex: search, $options: "i" } }
  }

  const clients = await Client.find(query)
    .select("company_name contact_name email services currency_preference is_internal")
    .sort({ company_name: 1 })
    .lean({ virtuals: true })

  return NextResponse.json({ clients })
}
