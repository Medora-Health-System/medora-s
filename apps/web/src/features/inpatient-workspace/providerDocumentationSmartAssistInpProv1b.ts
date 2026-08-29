/**
 * INP.PROV.1B — Neutral documentation Smart Assist suggestions from canonical chart facts.
 * Never auto-inserts. No diagnoses, coding, or invented findings.
 *
 * Suggestions always carry insertable text: "section is empty" completeness hints belong to
 * the Review tab, not to a suggestion card with nothing to insert.
 */

import type { ProgressSoapSections } from "./providerProgressNoteSoapInpProv1b";

export type ProviderSmartAssistSuggestion = {
  id: string;
  title: string;
  rationale: string;
  /** Non-empty text to insert only when provider clicks Insert. */
  insertText: string;
  kind: "lab" | "order" | "problem";
};

export type ProviderSmartAssistReviewItem = {
  id: string;
  code: string;
  message: string;
  severity: "info" | "warn";
};

type SynthesisLite = {
  overview?: {
    primaryDiagnosis?: string | null;
    attending?: string | null;
    codeStatus?: string | null;
    isolation?: string | null;
  } | null;
  laboratories?: {
    trending?: Array<{
      label: string;
      current: string | null;
      previous: string | null;
      direction: string;
    }>;
    abnormal?: Array<{ label: string; current: string | null; direction: string }>;
  } | null;
  problems?: Array<{
    displayLabel: string;
    status: string;
    assessment?: string | null;
    plan?: string | null;
  }> | null;
};

type OrderLite = {
  id: string;
  status?: string;
  items?: Array<{
    id: string;
    status?: string;
    displayLabel?: string;
    catalogItemType?: string;
  }>;
};

function arrow(direction: string | null | undefined): string {
  const d = String(direction ?? "").toUpperCase();
  if (d.includes("DOWN") || d === "DECREASING" || d === "↓") return "↓";
  if (d.includes("UP") || d === "INCREASING" || d === "↑") return "↑";
  return "";
}

export function buildProviderSmartAssistSuggestions(input: {
  sections: ProgressSoapSections;
  synthesis: SynthesisLite | null;
  orders: OrderLite[];
  noteStatus: string | null;
}): ProviderSmartAssistSuggestion[] {
  const out: ProviderSmartAssistSuggestion[] = [];
  const synth = input.synthesis;
  const trending = synth?.laboratories?.trending ?? [];
  for (const row of trending.slice(0, 3)) {
    const label = (row.label ?? "").trim();
    const current = (row.current ?? "").trim();
    if (!label || !current) continue;
    const a = arrow(row.direction);
    out.push({
      id: `lab-${label}`,
      title: `Include recent labs`,
      rationale: `${label} ${current}${a ? ` ${a}` : ""}${row.previous ? ` (prev ${row.previous})` : ""}`,
      insertText: `${label}: ${current}${a ? ` ${a}` : ""}${row.previous ? ` (previous ${row.previous})` : ""}.`,
      kind: "lab",
    });
  }

  const primary = (synth?.overview?.primaryDiagnosis ?? "").trim();
  if (primary && !(input.sections.ASSESSMENT ?? "").toLowerCase().includes(primary.toLowerCase())) {
    out.push({
      id: "dx-not-discussed",
      title: "Address primary diagnosis",
      rationale: `Primary diagnosis “${primary}” is not mentioned in Assessment.`,
      insertText: `Primary diagnosis: ${primary}.`,
      kind: "problem",
    });
  }

  for (const order of input.orders.slice(0, 8)) {
    for (const item of order.items ?? []) {
      const label = (item.displayLabel ?? "").trim();
      const status = String(item.status ?? order.status ?? "").toUpperCase();
      if (!label) continue;
      if (!["ACTIVE", "IN_PROGRESS", "ORDERED", "PENDING", "COLLECTED"].includes(status)) continue;
      if ((input.sections.PLAN ?? "").toLowerCase().includes(label.toLowerCase())) continue;
      out.push({
        id: `order-${item.id}`,
        title: "Link related order",
        rationale: `${label} · ${status}`,
        insertText: `Continue ${label} (${status}).`,
        kind: "order",
      });
      if (out.filter((s) => s.kind === "order").length >= 2) break;
    }
    if (out.filter((s) => s.kind === "order").length >= 2) break;
  }

  return out.filter((s) => s.insertText.trim().length > 0).slice(0, 8);
}

export function buildProviderSmartAssistReview(input: {
  sections: ProgressSoapSections;
  noteStatus: string | null;
  noteType: "PROGRESS" | "HP";
}): ProviderSmartAssistReviewItem[] {
  const items: ProviderSmartAssistReviewItem[] = [];
  if (input.noteType === "PROGRESS") {
    for (const [key, label] of [
      ["SUBJECTIVE", "Subjective"],
      ["OBJECTIVE", "Objective"],
      ["ASSESSMENT", "Assessment"],
      ["PLAN", "Plan"],
    ] as const) {
      if (!(input.sections[key] ?? "").trim()) {
        items.push({
          id: `empty-${key}`,
          code: `${key}_EMPTY`,
          message: `${label} empty`,
          severity: "warn",
        });
      }
    }
  }
  const st = String(input.noteStatus ?? "").toUpperCase();
  if (st === "DRAFT" || st === "REVIEW" || !st) {
    items.push({
      id: "unsigned-draft",
      code: "UNSIGNED_DRAFT",
      message: "Unsigned draft",
      severity: "info",
    });
  }
  return items;
}

export function projectRecentLabsFromSynthesis(synthesis: SynthesisLite | null): Array<{
  label: string;
  value: string;
  trend: string;
  when: string | null;
}> {
  const trending = synthesis?.laboratories?.trending ?? [];
  const abnormal = synthesis?.laboratories?.abnormal ?? [];
  const rows = [...trending, ...abnormal.map((a) => ({ ...a, previous: null as string | null }))];
  const seen = new Set<string>();
  const out: Array<{ label: string; value: string; trend: string; when: string | null }> = [];
  for (const row of rows) {
    const label = (row.label ?? "").trim();
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push({
      label,
      value: (row.current ?? "").trim() || "—",
      trend: arrow(row.direction),
      when: null,
    });
    if (out.length >= 4) break;
  }
  return out;
}
