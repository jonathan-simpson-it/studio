import { NextRequest, NextResponse } from "next/server"
import { connect } from "@/lib/db/connect"
import { Project, Milestone, Task, ProjectRepo, SyncedGithubIssue } from "@/lib/db/models/projects"
import { Proposal, Invoice, FileRecord, Cost } from "@/lib/db/models/docs"
import { validateApiKey } from "@/lib/auth/api-key"
import { toPlain } from "@/lib/db/to-plain"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKey = await validateApiKey(_request, "read")
  if (!apiKey.valid) {
    return NextResponse.json({ error: apiKey.error }, { status: 401 })
  }

  await connect()
  const { id } = await params

  const project = await Project.findById(id).lean({ virtuals: true })
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const [milestones, tasks, files, repos, syncedIssues, proposals, invoices, costs] =
    await Promise.all([
      Milestone.find({ project_id: id }).sort({ due_date: 1 }).lean({ virtuals: true }),
      Task.find({ project_id: id }).sort({ created_at: -1 }).lean({ virtuals: true }),
      FileRecord.find({ project_id: id }).sort({ created_at: -1 }).lean({ virtuals: true }),
      ProjectRepo.find({ project_id: id }).lean({ virtuals: true }),
      SyncedGithubIssue.find({ project_id: id })
        .sort({ updated_at_github: -1 })
        .lean({ virtuals: true }),
      Proposal.find({ project_id: id }).sort({ created_at: -1 }).lean({ virtuals: true }),
      Invoice.find({ project_id: id }).sort({ created_at: -1 }).lean({ virtuals: true }),
      Cost.find({ project_id: id }).lean({ virtuals: true }),
    ])

  const result = toPlain({
    ...project,
    milestones,
    tasks,
    files,
    repos,
    syncedIssues,
    proposals,
    invoices,
    costs,
  })

  return NextResponse.json({ project: result })
}
