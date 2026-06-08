import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST — receives multipart/form-data from the OS share sheet (PWA Web Share Target).
// Saves the first image to SharedUpload and redirects to the log page.
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  try {
    const formData = await req.formData();
    const file = formData.get("images") as File | null
      ?? formData.get("image") as File | null;

    if (!file || !file.size) {
      return NextResponse.redirect(new URL("/fitness/log", req.url));
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mediaType = file.type || "image/jpeg";
    const name = file.name || "shared-image";

    const upload = await prisma.sharedUpload.create({
      data: { userId, data: base64, mediaType, name },
    });

    return NextResponse.redirect(
      new URL(`/fitness/log?shareId=${upload.id}`, req.url)
    );
  } catch (err) {
    console.error("[share-target POST]", err);
    return NextResponse.redirect(new URL("/fitness/log", req.url));
  }
}

// GET — retrieves a shared upload by id, deletes it (one-time use), returns JSON.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const upload = await prisma.sharedUpload.findUnique({ where: { id } });
  if (!upload) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete immediately — one-time retrieval
  await prisma.sharedUpload.delete({ where: { id } });

  return NextResponse.json({
    data: upload.data,
    mediaType: upload.mediaType,
    name: upload.name,
  });
}
