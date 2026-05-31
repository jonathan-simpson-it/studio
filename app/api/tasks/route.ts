import { NextRequest, NextResponse } from "next/server"
import { connect } from "@/lib/db/connect"
import { Task } from "@/lib/db/models/projects"
import { validateApiKey } from "@/lib/auth/api-key"
import { toPlain } from "@/lib/db/to-plain"

export async function GET(request: NextRequest) {
  const apiKey = await validateApiKey(request, "read")
  if (!apiKey.valid) {
    return NextResponse.json({ error: apiKey.error }, { status: 401 })
  }

  await connect()

  const { searchParams } = new URL(request.url)
  const project_id = searchParams.get("project_id")
  const status = searchParams.get("status")
  const assignee_id = searchParams.get("assignee_id")

  const query: Record<string, unknown> = {}
  if (project_id) query.project_id = project_id
  if (status) query.status = status
  if (assignee_id) query.assignee_ids = assignee_id

  const tasks = toPlain(
    await Task.find(query).sort({ created_at: -1 }).lean({ virtuals: true })
  )

  return NextResponse.json({ tasks })
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

  const {
    title,
    project_id,
    client_id,
    description,
    priority,
    status,
    assignee_ids,
    due_date,
    est_hours,
  } = body

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 })
  }

  if (!project_id && !client_id) {
    return NextResponse.json(
      { error: "project_id or client_id is required" },
      { status: 400 }
    )
  }

  await connect()

  const { createTask } = await import("@/lib/db/actions/projects")
  try {
    const task = await createTask({
      title: title as string,
      project_id: (project_id as string) || null,
      client_id: (client_id as string) || null,
      description: (description as string) || null,
      priority: (priority as string) || "Medium",
      status: (status as string) || "Todo",
      assignee_ids: Array.isArray(assignee_ids) ? assignee_ids : [],
      due_date: due_date ? new Date(due_date as string) : null,
      est_hours: est_hours != null ? Number(est_hours) : null,
      created_by: "api",
    })

    return NextResponse.json({ success: true, task }, { status: 201 })
  } catch (error) {
    console.error("Failed to create task:", error)
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 })
  }
}
