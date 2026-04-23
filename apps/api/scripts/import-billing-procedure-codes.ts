/**
 * ER-2 — Idempotent CPT/HCPCS reference loader (Postgres `BillingProcedureCode`).
 *
 * Expected CSV columns (header row required):
 *   code, code_system, short_description
 *
 * Optional: long_description, effective_year, code_set_version, is_active (true/false/1/0)
 *
 * - `code_system` must be CPT or HCPCS (case-insensitive).
 * - `normalizedCode` is derived: CPT → digits only; HCPCS → uppercase alphanumeric.
 *
 * **The bundled sample CSV is for development only — not a complete licensed code set.**
 * For production, import from your licensed AMA CPT and CMS HCPCS distributions in a controlled process.
 *
 * Usage (DATABASE_URL set). Paths are resolved from **process.cwd()** (often `apps/api` when using pnpm filter):
 *   cd apps/api && pnpm run import:billing-procedure-codes -- --file=./prisma/data/billing-procedure-codes-sample-dev.csv
 *   pnpm --filter @medora/api run import:billing-procedure-codes -- --file=prisma/data/billing-procedure-codes-sample-dev.csv
 *   (cwd is usually `apps/api` under the filter) or `--file=apps/api/prisma/data/...` from repo root; absolute paths work.
 */
import "reflect-metadata";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const API_PACKAGE_ROOT = resolve(__dirname, "..");
import { randomUUID } from "node:crypto";
import { PrismaClient, BillingProcedureCodeSystem } from "@prisma/client";

function parseBool(raw: string | undefined, defaultTrue: boolean): boolean {
  const t = raw?.trim().toLowerCase();
  if (!t) return defaultTrue;
  if (t === "0" || t === "false" || t === "no") return false;
  if (t === "1" || t === "true" || t === "yes") return true;
  return defaultTrue;
}

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

function normalizeForRow(code: string, system: BillingProcedureCodeSystem): string {
  const t = code.trim().toUpperCase();
  if (system === BillingProcedureCodeSystem.CPT) {
    return t.replace(/\D/g, "");
  }
  return t.replace(/[^A-Z0-9]/g, "");
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const fileArg = process.argv.find((a) => a.startsWith("--file="))?.split("=", 2)[1]?.trim();
  if (!fileArg) {
    console.error("Missing --file=/path/to/procedures.csv");
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
  const iSys = idx("code_system");
  const iShort = idx("short_description");
  if (iCode < 0 || iSys < 0 || iShort < 0) {
    console.error("CSV must include columns: code, code_system, short_description");
    process.exit(1);
  }
  const iLong = idx("long_description");
  const iYear = idx("effective_year");
  const iVer = idx("code_set_version");
  const iAct = idx("is_active");

  const prisma = new PrismaClient();
  let upserted = 0;
  try {
    for (let r = 1; r < lines.length; r++) {
      const cells = parseCsvLine(lines[r]!);
      const code = cells[iCode]?.trim();
      if (!code) continue;
      const sysRaw = cells[iSys]?.trim().toUpperCase();
      if (sysRaw !== "CPT" && sysRaw !== "HCPCS") {
        console.warn(`Skip row ${r + 1}: invalid code_system "${sysRaw}"`);
        continue;
      }
      const codeSystem =
        sysRaw === "CPT" ? BillingProcedureCodeSystem.CPT : BillingProcedureCodeSystem.HCPCS;
      const shortDescription = cells[iShort]?.trim() ?? "";
      if (!shortDescription) continue;
      const longDescription = iLong >= 0 && cells[iLong]?.trim() ? cells[iLong]!.trim() : null;
      const effectiveYear =
        iYear >= 0 && cells[iYear]?.trim() ? Number.parseInt(cells[iYear]!.trim(), 10) : null;
      const codeSetVersion = iVer >= 0 && cells[iVer]?.trim() ? cells[iVer]!.trim().slice(0, 32) : null;
      const isActive = iAct >= 0 ? parseBool(cells[iAct], true) : true;
      const normalizedCode = normalizeForRow(code, codeSystem);
      if (!normalizedCode) continue;
      const searchText = [code, shortDescription, longDescription ?? ""].join(" ").toLowerCase();

      const data = {
        code: code.slice(0, 32),
        normalizedCode: normalizedCode.slice(0, 32),
        codeSystem,
        shortDescription: shortDescription.slice(0, 512),
        longDescription: longDescription ? longDescription.slice(0, 8000) : null,
        isActive,
        effectiveYear: effectiveYear != null && Number.isFinite(effectiveYear) ? effectiveYear : null,
        codeSetVersion,
        searchText,
      };

      if (dryRun) {
        console.log("[dry-run]", data.codeSystem, data.code, data.normalizedCode);
        upserted++;
        continue;
      }

      await prisma.billingProcedureCode.upsert({
        where: {
          codeSystem_normalizedCode: {
            codeSystem,
            normalizedCode: data.normalizedCode,
          },
        },
        create: {
          id: randomUUID(),
          ...data,
        },
        update: {
          code: data.code,
          shortDescription: data.shortDescription,
          longDescription: data.longDescription,
          isActive: data.isActive,
          effectiveYear: data.effectiveYear,
          codeSetVersion: data.codeSetVersion,
          searchText: data.searchText,
        },
      });
      upserted++;
    }
    console.log(dryRun ? `Dry run: ${upserted} rows` : `Upserted ${upserted} BillingProcedureCode rows`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
