import { NextRequest, NextResponse } from "next/server"
import { connect } from "@/lib/db/connect"
import { Project } from "@/lib/db/models/projects"
import { validateApiKey } from "@/lib/auth/api-key"
import { toPlain } from "@/lib/db/to-plain"

export async function GET(request: NextRequest) {
  const apiKey = await validateApiKey(request, "read")
  if (!apiKey.valid) {
    return NextResponse.json({ error: apiKey.error }, { status: 401 })
  }

  await connect()

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const client_id = searchParams.get("client_id")

  const query: Record<string, unknown> = {}
  if (status) query.status = status
  if (client_id) query.client_id = client_id

  const projects = toPlain(
    await Project.find(query).sort({ created_at: -1 }).lean({ virtuals: true })
  )

  return NextResponse.json({ projects })
}

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

  const { name, client_id, status, description, billing_type, currency, budget } = body

  if (!name || !client_id) {
    return NextResponse.json(
      { error: "name and client_id are required" },
      { status: 400 }
    )
  }

  await connect()

  const { createProject } = await import("@/lib/db/actions/projects")
  try {
    const project = await createProject({
      name: name as string,
      client_id: client_id as string,
      status: (status as string) || "Planning",
      description: (description as string) || null,
      billing_type: (billing_type as string) || null,
      currency: (currency as string) || "HKD",
      budget: budget != null ? Number(budget) : null,
    })

    return NextResponse.json({ success: true, project }, { status: 201 })
  } catch (error) {
    console.error("Failed to create project:", error)
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
  }
}
