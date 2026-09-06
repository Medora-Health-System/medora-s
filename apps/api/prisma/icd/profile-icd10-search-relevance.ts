/**
 * EXPLAIN (ANALYZE, BUFFERS) profiler for SEARCH.1. Does not print DATABASE_URL.
 */
import { Prisma, PrismaClient } from "@prisma/client";
import { type ProductUiLanguage } from "@medora/shared";
import {
  buildIcd10CatalogSearchMatch,
  buildIcd10CatalogSearchSelectSql,
} from "../../src/diagnoses/icd10-catalog-search.query";

const PROBES: Array<{ q: string; locale: ProductUiLanguage }> = [
  { q: "dolor abdominal", locale: "es" },
  { q: "dolor torácico", locale: "es" },
  { q: "sangrado gastrointestinal", locale: "es" },
  { q: "náuseas", locale: "es" },
  { q: "abdominal pain", locale: "es" },
  { q: "R11.0", locale: "es" },
  { q: "uti", locale: "en" },
  { q: "shortness of breath", locale: "en" },
];

function toParameterized(sql: Prisma.Sql): { text: string; values: unknown[] } {
  const values: unknown[] = [];
  let text = "";
  for (let i = 0; i < sql.strings.length; i++) {
    text += sql.strings[i];
    if (i < sql.values.length) {
      values.push(sql.values[i]);
      text += `$${values.length}`;
    }
  }
  return { text, values };
}

function summarizePlan(lines: string[]) {
  const joined = lines.join("\n");
  const planning = joined.match(/Planning Time:\s+([\d.]+) ms/);
  const execution = joined.match(/Execution Time:\s+([\d.]+) ms/);
  const rows = [...joined.matchAll(/actual time=[\d.]+(?:\.\.[\d.]+)? rows=(\d+)/g)].map((m) => Number(m[1]));
  const sorts = [...joined.matchAll(/Sort Method:[^\n]+/g)].map((m) => m[0]);
  const indexes = [...joined.matchAll(/Index (?:Scan|Only Scan) using "([^"]+)"/g)].map((m) => m[1]);
  const seq = (joined.match(/Seq Scan/g) || []).length;
  const buffers = [...joined.matchAll(/Buffers:\s+([^\n]+)/g)].map((m) => m[1]);
  const jit = joined.match(/Timing:\s+([^\n]+)/);
  return {
    planningMs: planning ? Number(planning[1]) : null,
    executionMs: execution ? Number(execution[1]) : null,
    maxActualRows: rows.length ? Math.max(...rows) : 0,
    sorts,
    indexes: [...new Set(indexes)],
    seqScans: seq,
    buffersTop: buffers[0] ?? null,
    jit: jit?.[1] ?? null,
    planHead: lines.slice(0, 12),
  };
}

async function main() {
  const releaseVersion = (process.env.ICD10_SEARCH_RELEASE ?? "FY2026").trim();
  const prisma = new PrismaClient();
  const out: unknown[] = [];
  try {
    await prisma.$executeRaw`SELECT set_config('jit', 'off', false)`;
    for (const probe of PROBES) {
      const match = buildIcd10CatalogSearchMatch(probe.q, probe.locale);
      if (!match) {
        out.push({ q: probe.q, error: "NO_MATCH" });
        continue;
      }
      const select = buildIcd10CatalogSearchSelectSql(match, 25, {
        releaseVersion,
        locale: probe.locale,
      });
      const { text, values } = toParameterized(select);
      const rows = await prisma.$queryRawUnsafe<Array<Record<string, string>>>(
        `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${text}`,
        ...values,
      );
      const lines = rows.map((row) => String(Object.values(row)[0]));
      out.push({
        q: probe.q,
        locale: probe.locale,
        releaseVersion,
        intent: match.searchIntent,
        ...summarizePlan(lines),
      });
    }
    console.log(JSON.stringify({ releaseVersion, probes: out }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
