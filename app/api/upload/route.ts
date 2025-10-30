import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function POST(req: Request) {
  const formData = await req.formData()
  const cameraName = (formData.get("cameraName") as string || "unknown").replace(/\s+/g, "_")
  const files = formData.getAll("files") as File[]

  const uploadDir = path.join(process.cwd(), "public", "uploads", cameraName)
  fs.mkdirSync(uploadDir, { recursive: true })

  const urls: string[] = []

  for (const file of files) {
    const bytes = Buffer.from(await file.arrayBuffer())
    const filePath = path.join(uploadDir, file.name)
    fs.writeFileSync(filePath, bytes)
    urls.push(`/uploads/${cameraName}/${file.name}`)
  }

  return NextResponse.json({ urls })
}

export async function DELETE(req: Request) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: "Thiếu URL ảnh" }, { status: 400 })

    const fullPath = path.join(process.cwd(), "public", url)
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath)
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: "Ảnh không tồn tại" }, { status: 404 })
  } catch (err) {
    console.error("Lỗi xóa ảnh:", err)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
