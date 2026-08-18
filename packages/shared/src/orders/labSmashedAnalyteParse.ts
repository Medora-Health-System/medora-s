/**
 * Recover smashed lab panel blobs (name+value+range+unit, no delimiters)
 * into parseable analyte rows. Display/recovery only — does not persist a second engine.
 */

export type RecoveredLabAnalyteRow = {
  label: string;
  value: string;
  ref: string;
  units: string;
};

function isNumericToken(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  if (t.startsWith(".")) return Number.isFinite(Number(`0${t}`));
  return Number.isFinite(Number(t));
}

function numericValue(raw: string): number | null {
  const t = raw.trim().startsWith(".") ? `0${raw.trim()}` : raw.trim();
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function splitValueAndLow(concat: string, high: number): { value: string; low: string } | null {
  const candidates: Array<{ value: string; low: string; score: number }> = [];
  for (let i = 1; i < concat.length; i++) {
    const value = concat.slice(0, i);
    const low = concat.slice(i);
    if (!isNumericToken(value) || !isNumericToken(low)) continue;
    const v = numericValue(value);
    const l = numericValue(low);
    if (v == null || l == null) continue;
    let score = 0;
    if (l <= high) score += 3;
    if (v >= l && v <= high) score += 4;
    if (Math.abs(Math.log10(Math.max(Math.abs(l), 0.001)) - Math.log10(Math.max(Math.abs(high), 0.001))) < 1.5) {
      score += 2;
    }
    if (value.includes(".") || low.includes(".")) score += 1;
    candidates.push({ value, low, score });
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  return { value: best.value, low: best.low };
}

function parseSmashedAnalytePart(part: string): RecoveredLabAnalyteRow | null {
  const text = part.trim();
  if (!text) return null;
  const nameMatch = text.match(/^([A-Za-z][A-Za-z0-9 +/%-]{0,48}?)(?=-?\d|\.)(.*)$/);
  if (!nameMatch) return null;
  const label = nameMatch[1].trim();
  const rest = nameMatch[2].trim();
  const rangeMatch = rest.match(
    /^(.*)[\u2013\u2014-](-?\d+(?:\.\d+)?)([A-Za-zµμ/%0-9.^]+)$/
  );
  if (!rangeMatch) return null;
  const left = rangeMatch[1];
  const highRaw = rangeMatch[2];
  const units = rangeMatch[3].trim();
  const high = numericValue(highRaw);
  if (high == null || !left) return null;
  const split = splitValueAndLow(left, high);
  if (!split) return null;
  const lowNorm = split.low.startsWith(".") ? `0${split.low}` : split.low;
  return {
    label,
    value: split.value,
    ref: `${lowNorm}–${highRaw}`,
    units,
  };
}

/** True when text looks like smashed CMP-style concatenation (no colons/newlines). */
export function looksLikeSmashedLabAnalyteBlob(raw: string): boolean {
  const text = String(raw ?? "").trim();
  if (!text || text.includes("\n") || text.includes(":")) return false;
  if (!/[\u2013\u2014-]/.test(text)) return false;
  return /[A-Za-z][A-Za-z]+-?\d/.test(text) && /[A-Za-zµμ/%]/.test(text);
}

export function recoverSmashedLabAnalyteRows(raw: string): RecoveredLabAnalyteRow[] {
  const text = String(raw ?? "").trim();
  if (!text) return [];
  const parts = text
    .split(/\u2014/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2 && !looksLikeSmashedLabAnalyteBlob(text)) return [];
  const rows: RecoveredLabAnalyteRow[] = [];
  for (const part of parts.length > 1 ? parts : [text]) {
    const row = parseSmashedAnalytePart(part);
    if (row) rows.push(row);
  }
  return rows;
}

export function serializeRadiologyReportFields(fields: {
  indication?: string;
  technique?: string;
  contrast?: string;
  comparison?: string;
  findings?: string;
  impression?: string;
  remainder?: string;
}): string {
  const blocks: string[] = [];
  const push = (heading: string, body?: string) => {
    const b = String(body ?? "").trim();
    if (!b) return;
    blocks.push(`${heading}:\n${b}`);
  };
  push("Indication", fields.indication);
  push("Technique", fields.technique);
  push("Contrast", fields.contrast);
  push("Comparison", fields.comparison);
  push("Findings", fields.findings);
  push("Impression", fields.impression);
  const rem = String(fields.remainder ?? "").trim();
  if (rem) blocks.push(rem);
  return blocks.join("\n\n");
}

export function serializeLabAnalyteRows(rows: readonly RecoveredLabAnalyteRow[]): string {
  return rows
    .filter((r) => r.label.trim())
    .map((r) => {
      const value = [r.value.trim(), r.units.trim()].filter(Boolean).join(" ");
      const ref = r.ref.trim();
      if (ref) return `${r.label.trim()}: ${value} (${ref})`.trim();
      return `${r.label.trim()}: ${value}`.trim();
    })
    .join("\n");
}

/** Insert newlines before known radiology headings glued into a wall of text. */
export function recoverJammedRadiologyHeadings(raw: string): string {
  let text = String(raw ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const headings = [
    "Indication clinique",
    "Clinical indication",
    "Exam Type",
    "Type d'examen",
    "Compte rendu",
    "Comparison",
    "Comparaison",
    "Indication",
    "Technique",
    "Contrast",
    "Contraste",
    "Constatations",
    "Findings",
    "Impression",
    "Conclusion",
    "Report",
  ].sort((a, b) => b.length - a.length);
  for (const heading of headings) {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${escaped})(?=\\s*:|[A-ZÀ-Ü])`, "gi");
    text = text.replace(re, (match, _group, offset, src: string) => {
      const after = src.slice(offset + match.length);
      const alreadyColon = /^\s*:/.test(after);
      const gluedNextHeading = !alreadyColon && /^[A-ZÀ-Ü]/.test(after);
      const prefix = offset > 0 && src[offset - 1] !== "\n" ? "\n" : "";
      const suffix = gluedNextHeading ? ":\n" : "";
      return `${prefix}${match}${suffix}`;
    });
  }
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

/** Persist smashed lab blobs as the existing Name: value (range) text contract. */
export function normalizeLabResultTextForPersist(raw: string): string {
  const text = String(raw ?? "");
  const recovered = recoverSmashedLabAnalyteRows(text);
  if (recovered.length === 0) return text;
  return serializeLabAnalyteRows(recovered);
}
