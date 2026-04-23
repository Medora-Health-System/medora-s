import { createHash } from "crypto";
import type { Prisma } from "@prisma/client";

export type AckKindDetected = "999" | "277CA";

/** Normalize line endings and trim for stable dedupe / comparison. */
export function normalizeAckRawText(raw: string): string {
  return raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

/** Compute stable idempotency key for duplicate detection (no DB column required). */
export function computeAckDedupeKey(facilityId: string, kind: AckKindDetected, rawNormalized: string): string {
  return createHash("sha256").update(`${facilityId}\n${kind}\n${rawNormalized}`, "utf8").digest("hex");
}

/**
 * Detect 999 vs 277 from ST segment (X12 transaction envelope).
 */
export function detectAckKindFromRaw(raw: string): AckKindDetected | null {
  const upper = raw.toUpperCase();
  const segs = raw.split("~").map((s) => s.trim());
  const st = segs.find((s) => s.startsWith("ST*"));
  if (!st) {
    if (upper.includes("*ST*999*") || upper.includes("ST*999*")) return "999";
    if (upper.includes("*ST*277*") || upper.includes("ST*277*")) return "277CA";
    return null;
  }
  const parts = st.split("*");
  const st02 = (parts[2] ?? "").trim();
  if (st02 === "999") return "999";
  if (st02 === "277" || st02.startsWith("277")) return "277CA";
  return null;
}

/** GS-06 group control number (best-effort) for batch-level correlation. */
export function extractGsGroupControl(raw: string): string | null {
  const line = raw.split(/[~]/).find((s) => s.startsWith("GS*"));
  if (!line) return null;
  const p = line.split("*");
  const gs6 = (p[6] ?? "").trim();
  return gs6.length > 0 ? gs6 : null;
}

/** ISA-13 interchange control number (best-effort split on *). */
export function extractIsaInterchangeControl(raw: string): string | null {
  const line = raw.split(/[~]/).find((s) => s.startsWith("ISA*"));
  if (!line) return null;
  const p = line.split("*");
  if (p.length < 14) return null;
  const isa13 = (p[13] ?? "").trim();
  return isa13.length > 0 ? isa13 : null;
}

/** AK2*837*<transaction control ST02> */
export function extractAk2TransactionControl(raw: string): string | null {
  const line = raw.split(/[~]/).find((s) => s.startsWith("AK2*"));
  if (!line) return null;
  const p = line.split("*");
  const st02 = (p[3] ?? p[2] ?? "").trim();
  return st02.length > 0 ? st02 : null;
}

/** TRN*qualifier*reference — use reference (3rd field) for claim correlation. */
export function extractTrnReference(raw: string): string | null {
  const line = raw.split(/[~]/).find((s) => s.startsWith("TRN*"));
  if (!line) return null;
  const p = line.split("*");
  const ref = (p[3] ?? p[2] ?? "").trim();
  return ref.length > 0 ? ref : null;
}

/** UI / API: `vendorMeta.source` from persisted `parsedJson`. */
export function displayAckSourceFromParsedJson(parsedJson: Prisma.JsonValue | null): string | null {
  if (!parsedJson || typeof parsedJson !== "object" || Array.isArray(parsedJson)) return null;
  const vm = (parsedJson as Record<string, unknown>).vendorMeta;
  if (!vm || typeof vm !== "object" || Array.isArray(vm)) return null;
  const s = (vm as Record<string, unknown>).source;
  return typeof s === "string" ? s : null;
}
