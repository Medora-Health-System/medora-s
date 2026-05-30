/**
 * Extract cardId → payloadJson from clinical-documentation.spec.ts createEntry calls.
 * Output: scripts/clinical-documentation-spec-runtime-payloads.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const specPath = join(root, "apps/api/src/encounters/clinical-documentation.spec.ts");
const source = readFileSync(specPath, "utf8");

/** @type {Record<string, Record<string, unknown>>} */
const payloads = {};

/** @type {Record<string, string>} */
const constPayloads = {};

function extractObjectAt(startIdx) {
  let i = startIdx;
  while (i < source.length && source[i] !== "{") i++;
  if (i >= source.length) return null;
  let depth = 0;
  let inString = false;
  let stringChar = "";
  let escape = false;
  const start = i;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === stringChar) inString = false;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const raw = source.slice(start, i + 1);
        try {
          // eslint-disable-next-line no-new-func
          return Function(`"use strict"; return (${raw});`)();
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

// const NAME = { ... };
const constRe = /const\s+(\w+)\s*=\s*(\{[\s\S]*?\n\s*\});/g;
let m;
while ((m = constRe.exec(source)) !== null) {
  const name = m[1];
  const objStart = source.indexOf("{", m.index);
  const obj = extractObjectAt(objStart);
  if (obj && typeof obj === "object") {
    constPayloads[name] = JSON.stringify(obj);
  }
}

// createEntry blocks: cardId then payloadJson (or spread const)
const entryRe = /createEntry\s*\([\s\S]*?cardId:\s*([A-Z_][A-Z0-9_]*|\w+_CARD_ID|\w+),\s*payloadJson:\s*/g;
while ((m = entryRe.exec(source)) !== null) {
  let cardId = m[1];
  if (cardId.endsWith("_CARD_ID")) continue;
  const after = m.index + m[0].length;
  const tail = source.slice(after, after + 80).trimStart();
  if (tail.startsWith("{")) {
    const obj = extractObjectAt(after + source.slice(after).search(/\{/));
    if (obj) payloads[cardId] = obj;
  } else {
    const spread = tail.match(/^(\.\.\.)?(\w+)/);
    if (spread) {
      const constName = spread[2];
      if (constPayloads[constName]) {
        const base = JSON.parse(constPayloads[constName]);
        if (spread[1]) {
          const restStart = after + tail.indexOf("{");
          if (restStart > after && source[restStart] === "{") {
            const extra = extractObjectAt(restStart);
            if (extra) payloads[cardId] = { ...base, ...extra };
            else payloads[cardId] = base;
          } else {
            payloads[cardId] = base;
          }
        } else {
          payloads[cardId] = base;
        }
      }
    }
  }
}

// cardId: IDENTIFIER (imported constant) — resolve from imports in spec
const importCardIds = new Map();
const importRe = /import\s*\{([^}]+)\}\s*from\s*"@medora\/shared"/g;
while ((m = importRe.exec(source)) !== null) {
  for (const part of m[1].split(",")) {
    const name = part.trim().split(/\s+as\s+/)[0]?.trim();
    if (name?.endsWith("_CARD_ID")) {
      importCardIds.set(name, name);
    }
  }
}

// Second pass: cardId: STROKE_NIHSS_CARD_ID style with payloadJson object
const cardConstRe =
  /cardId:\s*([A-Z][A-Z0-9_]*_CARD_ID|[a-z][a-z0-9_]*),\s*\n\s*payloadJson:\s*(\{|\w+)/g;
while ((m = cardConstRe.exec(source)) !== null) {
  const sym = m[1];
  const payloadStart = m.index + m[0].length - m[2].length;
  const tail = source.slice(payloadStart).trimStart();
  if (tail.startsWith("{")) {
    const obj = extractObjectAt(payloadStart + source.slice(payloadStart).search(/\{/));
    if (!obj) continue;
    // Resolve symbol at runtime via shared — stored as symbolic key for builder
    payloads[`__SYM__${sym}`] = obj;
  } else if (constPayloads[tail.match(/^(\w+)/)?.[1] ?? ""]) {
    payloads[`__SYM__${sym}`] = JSON.parse(constPayloads[tail.match(/^(\w+)/)[1]]);
  }
}

const outPath = join(root, "scripts/clinical-documentation-spec-runtime-payloads.mjs");
const lines = Object.entries(payloads)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v, null, 2).replace(/\n/g, "\n  ")},`)
  .join("\n");

writeFileSync(
  outPath,
  `/** Auto-generated from clinical-documentation.spec.ts — do not edit by hand */\nexport const SPEC_RUNTIME_PAYLOADS = {\n${lines}\n};\nexport default SPEC_RUNTIME_PAYLOADS;\n`
);

console.log(`Extracted ${Object.keys(payloads).length} spec payload entries → ${outPath}`);
