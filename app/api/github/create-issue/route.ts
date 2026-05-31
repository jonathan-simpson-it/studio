import { NextRequest, NextResponse } from "next/server"
import { validateApiKey } from "@/lib/auth/api-key"
import { createIssue } from "@/lib/github"

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

  const { repo, title, issueBody, labels, assignees } = body

  if (!repo || !title) {
    return NextResponse.json(
      { error: "repo and title are required" },
      { status: 400 }
    )
  }

  try {
    const issue = await createIssue(repo as string, {
      title: title as string,
      body: (issueBody as string) || undefined,
      labels: (labels as string[]) || undefined,
      assignees: (assignees as string[]) || undefined,
    })

    return NextResponse.json({ success: true, issue }, { status: 201 })
  } catch (error) {
    console.error("Failed to create GitHub issue:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create issue" },
      { status: 500 }
    )
  }
}
