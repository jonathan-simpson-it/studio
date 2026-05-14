import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getFileStream, getFileInfo } from "@/lib/storage/gridfs"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "Missing file id" }, { status: 400 })
  }

  const info = await getFileInfo(id)
  if (!info) {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }

  const stream = await getFileStream(id)
  const fileInfo = info as any & { filename: string; metadata?: { contentType?: string } }

  return new NextResponse(stream as any, {
    headers: {
      "Content-Type": fileInfo.metadata?.contentType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${fileInfo.filename}"`,
    },
  })
}
