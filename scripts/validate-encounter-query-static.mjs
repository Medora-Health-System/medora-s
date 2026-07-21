#!/usr/bin/env node
/**
 * Static CI: fail when Encounter Prisma usage can emit unapplied D3B columns.
 * MEDORA.P0.ENCOUNTER_SHARED_QUERY_HARDENING
 *
 * Detects (in apps/api/src, excluding specs / D3 allowlist services):
 * - prisma.encounter.(find*|create|update|upsert|delete) without select:
 * - encounter: true
 * - encounter: { include:
 * - hospitalEpisodeId / hospitalEpisode in shared contracts file incorrectly
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "apps/api/src");

const ALLOWLIST_FILES = new Set([
  "encounters/hospital-episode.service.ts",
  "encounters/hospital-episode.service.spec.ts",
  "encounters/internal-placement.service.ts",
  "encounters/internal-placement.service.spec.ts",
  "trackboard/trackboard-encounter-select.ts",
  "trackboard/trackboard.service.ts",
  "prisma/schema-compatibility.ts",
  "common/logging/prisma-error-sanitizer.ts",
  "encounters/encounter-query-contracts.ts",
]);

const SKIP_NAME = /\.(spec|test)\.ts$/;

/** @type {{ file: string, line: number, kind: string, snippet: string }[]} */
const findings = [];

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === "dist") continue;
      walk(full);
      continue;
    }
    if (!ent.name.endsWith(".ts")) continue;
    if (SKIP_NAME.test(ent.name)) continue;
    scanFile(full);
  }
}

function rel(file) {
  return path.relative(SRC, file).replaceAll("\\", "/");
}

function scanFile(file) {
  const relative = rel(file);
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;
    const trimmed = line.trimStart();
    const isComment =
      trimmed.startsWith("//") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("/*") ||
      trimmed.startsWith("*/");

    if (isComment) continue;

    if (/\bencounter\s*:\s*true\b/.test(line)) {
      findings.push({
        file: relative,
        line: lineNo,
        kind: "encounter:true",
        snippet: line.trim(),
      });
    }

    if (/\bencounter\s*:\s*\{\s*include\s*:/.test(line)) {
      findings.push({
        file: relative,
        line: lineNo,
        kind: "encounter:include",
        snippet: line.trim(),
      });
    }

    if (!ALLOWLIST_FILES.has(relative) && /\bhospitalEpisode(Id)?\b/.test(line)) {
      findings.push({
        file: relative,
        line: lineNo,
        kind: "hospitalEpisode-ref",
        snippet: line.trim(),
      });
    }
  }

  // Heuristic: prisma.encounter ops without select in the same call block
  const opRe =
    /(this\.)?prisma\.encounter\.(findUnique|findFirst|findMany|update|upsert|create|delete)\(/g;
  let m;
  while ((m = opRe.exec(text)) !== null) {
    const start = m.index;
    let depth = 0;
    let j = start + m[0].length - 1;
    while (j < text.length && j < start + 5000) {
      const ch = text[j];
      if (ch === "(") depth++;
      else if (ch === ")") {
        depth--;
        if (depth === 0) break;
      }
      j++;
    }
    const block = text.slice(start, j + 1);
    if (!/\bselect\s*:/.test(block)) {
      const lineNo = text.slice(0, start).split("\n").length;
      findings.push({
        file: relative,
        line: lineNo,
        kind: "encounter-query-missing-select",
        snippet: m[0],
      });
    }
  }
}

walk(SRC);

if (findings.length > 0) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        incident: "MEDORA.P0.ENCOUNTER_SHARED_QUERY_HARDENING",
        findingCount: findings.length,
        findings,
      },
      null,
      2
    )
  );
  process.exit(1);
}

console.log(
  JSON.stringify({
    ok: true,
    incident: "MEDORA.P0.ENCOUNTER_SHARED_QUERY_HARDENING",
    findingCount: 0,
    note: "No unsafe Encounter Prisma patterns detected in apps/api/src (non-spec).",
  })
);
