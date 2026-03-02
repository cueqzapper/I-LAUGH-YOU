import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { NextResponse } from "next/server";

type LegacyColorsMap = Record<string, [number, number, number][]>;

export const runtime = "nodejs";

let cachedColors: LegacyColorsMap | null = null;

function parseLegacyColorsSource(source: string): LegacyColorsMap {
  const sandbox: { colors?: unknown } = {};
  vm.runInNewContext(source, sandbox, { timeout: 2500 });

  const parsed = sandbox.colors;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid legacy colors payload.");
  }

  return parsed as LegacyColorsMap;
}

async function loadLegacyColors(): Promise<LegacyColorsMap> {
  if (cachedColors) {
    return cachedColors;
  }

  const legacyColorsPath = path.resolve(
    process.cwd(),
    "public",
    "legacy-colors.js"
  );

  const source = await readFile(legacyColorsPath, "utf8");
  cachedColors = parseLegacyColorsSource(source);
  return cachedColors;
}

export async function GET() {
  try {
    const colors = await loadLegacyColors();
    return NextResponse.json(colors, {
      headers: {
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load legacy color data." },
      { status: 500 }
    );
  }
}
