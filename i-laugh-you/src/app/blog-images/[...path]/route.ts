import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { BLOG_IMAGES_ROOT } from "@/lib/blog-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;

  if (!segments || segments.length === 0) {
    return new Response("Not found", { status: 404 });
  }

  for (const seg of segments) {
    if (seg === ".." || seg === "." || seg.includes("/") || seg.includes("\\")) {
      return new Response("Bad request", { status: 400 });
    }
  }

  const rel = segments.join("/");
  const abs = path.resolve(BLOG_IMAGES_ROOT, rel);
  const rootAbs = path.resolve(BLOG_IMAGES_ROOT);

  if (!abs.startsWith(rootAbs + path.sep) && abs !== rootAbs) {
    return new Response("Bad request", { status: 400 });
  }

  const ext = path.extname(abs).toLowerCase();
  const mime = MIME_TYPES[ext];
  if (!mime) {
    return new Response("Unsupported media type", { status: 415 });
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(abs);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (!stat.isFile()) {
    return new Response("Not found", { status: 404 });
  }

  const buffer = fs.readFileSync(abs);
  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Length": String(stat.size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
