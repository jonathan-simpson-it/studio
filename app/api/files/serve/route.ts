import { NextRequest, NextResponse } from "next/server"
import { createServer } from "@/lib/supabase/server"
import { auth } from "@/auth"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const storagePath = searchParams.get("path")

  if (!storagePath || !storagePath.startsWith("storage://")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 })
  }

  const supabase = await createServer()
  const actualPath = storagePath.slice(9)

  const { data } = await supabase.storage
    .from("studio-files")
    .createSignedUrl(actualPath, 3600)

  if (!data?.signedUrl) {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }

  return NextResponse.redirect(data.signedUrl)
}
