import fs from "fs";
import path from "path";
import { ZipArchive } from "archiver";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EXCLUDE = new Set(["node_modules", ".next", ".git", ".env", "drizzle"]);

function collect(dir: string, base = ""): { rel: string; abs: string }[] {
  const out: { rel: string; abs: string }[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (EXCLUDE.has(e.name) || e.name.startsWith(".")) continue;
    const abs = path.join(dir, e.name);
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...collect(abs, rel));
    else out.push({ rel, abs });
  }
  return out;
}

export async function GET() {
  const root = process.cwd();
  const files = collect(root);

  const archive = new ZipArchive({ zlib: { level: 9 } });
  const chunks: Buffer[] = [];
  archive.on("data", (c: Buffer) => chunks.push(c));

  for (const f of files) {
    archive.file(f.abs, { name: `gymlog/${f.rel}` });
  }

  await archive.finalize();
  const buf = Buffer.concat(chunks);

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="gymlog.zip"',
    },
  });
}
