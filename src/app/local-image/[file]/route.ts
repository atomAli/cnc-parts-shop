import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ file: string }> }
) {
  const dir = process.env.LOCAL_IMAGES_DIR;
  if (!dir) return new NextResponse("not found", { status: 404 });

  const { file } = await params;
  const safe = file.replace(/[^\w.\-]/g, "");
  if (!safe) return new NextResponse("not found", { status: 404 });

  try {
    const buf = await readFile(join(dir, safe));
    const isPng = safe.toLowerCase().endsWith(".png");
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "content-type": isPng ? "image/png" : "image/jpeg",
        "cache-control": "no-store",
      },
    });
  } catch {
    return new NextResponse("not found", { status: 404 });
  }
}