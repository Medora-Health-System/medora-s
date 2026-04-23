/**
 * ER-3 — Idempotent medication billing catalog loader (NDC-aware).
 *
 * Expected CSV columns:
 *   code, name, ndc, billing_unit_type
 *
 * Optional:
 *   billing_code_default, route, strength, is_active
 *
 * The bundled CSV is development-only and not production-complete.
 */
import "reflect-metadata";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { normalizeNdc } from "@medora/shared";

const API_PACKAGE_ROOT = resolve(__dirname, "..");

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseBool(raw: string | undefined, defaultTrue: boolean): boolean {
  const t = raw?.trim().toLowerCase();
  if (!t) return defaultTrue;
  if (t === "0" || t === "false" || t === "no") return false;
  if (t === "1" || t === "true" || t === "yes") return true;
  return defaultTrue;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const fileArg = process.argv.find((a) => a.startsWith("--file="))?.split("=", 2)[1]?.trim();
  if (!fileArg) {
    console.error("Missing --file=/path/to/medication-billing.csv");
    process.exit(1);
  }
  const rel = fileArg.trim();
  const candidates = [resolve(process.cwd(), rel), resolve(API_PACKAGE_ROOT, rel)];
  if (rel.startsWith("apps/api/")) {
    const stripped = rel.slice("apps/api/".length);
    candidates.push(resolve(process.cwd(), stripped), resolve(API_PACKAGE_ROOT, stripped));
  }
  const filePath = candidates.find((p) => existsSync(p));
  if (!filePath) {
    console.error(`File not found. Tried:\n  ${candidates.join("\n  ")}`);
    process.exit(1);
  }
  const raw = readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    console.error("CSV must include a header row and at least one data row.");
    process.exit(1);
  }
  const header = parseCsvLine(lines[0]!);
  const idx = (name: string) => header.findIndex((h) => h.trim().toLowerCase().replace(/-/g, "_") === name);
  const iCode = idx("code");
  const iName = idx("name");
  const iNdc = idx("ndc");
  const iUnit = idx("billing_unit_type");
  if (iCode < 0 || iName < 0 || iNdc < 0 || iUnit < 0) {
    console.error("CSV must include columns: code, name, ndc, billing_unit_type");
    process.exit(1);
  }
  const iBillingCode = idx("billing_code_default");
  const iRoute = idx("route");
  const iStrength = idx("strength");
  const iActive = idx("is_active");

  const prisma = new PrismaClient();
  let upserted = 0;
  try {
    for (let r = 1; r < lines.length; r++) {
      const cells = parseCsvLine(lines[r]!);
      const code = cells[iCode]?.trim();
      const name = cells[iName]?.trim();
      const ndcRaw = cells[iNdc]?.trim();
      const billingUnitType = cells[iUnit]?.trim();
      if (!code || !name || !ndcRaw || !billingUnitType) continue;
      const ndc = normalizeNdc(ndcRaw);
      if (!ndc.ok) {
        console.warn(`Skip row ${r + 1}: invalid ndc "${ndcRaw}"`);
        continue;
      }
      const billingCodeDefault = iBillingCode >= 0 && cells[iBillingCode]?.trim() ? cells[iBillingCode]!.trim() : null;
      const route = iRoute >= 0 && cells[iRoute]?.trim() ? cells[iRoute]!.trim() : null;
      const strength = iStrength >= 0 && cells[iStrength]?.trim() ? cells[iStrength]!.trim() : null;
      const isActive = iActive >= 0 ? parseBool(cells[iActive], true) : true;

      const data = {
        name: name.slice(0, 512),
        ndc11: ndc.ndc11,
        ndcDisplay: ndc.ndcDisplay,
        billingUnitType: billingUnitType.slice(0, 32),
        billingCodeDefault: billingCodeDefault?.slice(0, 32) ?? null,
        route: route?.slice(0, 128) ?? null,
        strength: strength?.slice(0, 128) ?? null,
        isActive,
      };
      if (dryRun) {
        console.log("[dry-run]", code, data.ndc11, data.billingUnitType);
        upserted++;
        continue;
      }
      await prisma.catalogMedication.upsert({
        where: { code: code.slice(0, 128) },
        create: { code: code.slice(0, 128), ...data },
        update: data,
      });
      upserted++;
    }
    console.log(dryRun ? `Dry run: ${upserted} rows` : `Upserted ${upserted} CatalogMedication rows`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
