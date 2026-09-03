/**
 * Read-only builders for initial nursing assessment (`nursingEvalV1`) in ED Summary / ER packet.
 * Preserves saved free text exactly; only UI labels are localized.
 */

import { parseNursingAssessmentSectionsForChart } from "@/components/patient-chart/patientChartHelpers";
import { productUiBcp47Tag, type SupportedLanguage } from "@/i18n/config";
import { readDischargeSortieExecutionFromEncounter } from "./emergencyDispositionV1";
import { erTriageT } from "./erTriageI18nLookup";
import type { VisitSummaryTextBlock } from "./emergencyVisitSummaryModel";

function vs(locale: SupportedLanguage, key: string): string {
  return erTriageT(locale, `erTriage.visitSummary.${key}`);
}

function interpolate(template: string, vars: Record<string, string>): string {
  let s = template;
  for (const [k, v] of Object.entries(vars)) {
    s = s.split(`{${k}}`).join(v);
  }
  return s;
}

function formatIsoForLocale(iso: string, locale: SupportedLanguage): string {
  try {
    const tag = productUiBcp47Tag(locale);
    return new Date(iso).toLocaleString(tag, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

export type InitialNursingEvalSignature = {
  documentedBy: string;
  documentedAtIso: string;
  roleTitle: string | null;
};

/** Signature metadata from `nursingEvalV1.signature` only (not reassessment). */
export function readInitialNursingEvalSignature(raw: unknown): InitialNursingEvalSignature | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const inner = (raw as Record<string, unknown>).nursingEvalV1;
  if (!inner || typeof inner !== "object" || Array.isArray(inner)) return null;
  const sig = (inner as Record<string, unknown>).signature;
  if (!sig || typeof sig !== "object" || Array.isArray(sig)) return null;
  const at = (sig as { savedAt?: unknown }).savedAt;
  const by = (sig as { savedByDisplayName?: unknown }).savedByDisplayName;
  const role = (sig as { savedByRoleTitle?: unknown }).savedByRoleTitle;
  if (typeof at !== "string" || typeof by !== "string" || !by.trim()) return null;
  const roleTitle =
    typeof role === "string" && role.trim() ? role.trim() : null;
  return {
    documentedBy: by.trim(),
    documentedAtIso: at,
    roleTitle,
  };
}

export function hasInitialNursingAssessmentContent(raw: unknown): boolean {
  return parseNursingAssessmentSectionsForChart(raw, "en").length > 0;
}

export type ErPrintInitialNursingSection = {
  documentedBy: string;
  documentedAt: string;
  roleTitle: string | null;
  sections: Array<{ label: string; text: string }>;
};

export type ErPrintNursingDischargeSection = {
  documentedBy: string;
  documentedAt: string;
  executionNote: string | null;
};

function performerMetaLine(
  sig: InitialNursingEvalSignature,
  locale: SupportedLanguage
): string {
  const nameWithRole = sig.roleTitle
    ? `${sig.documentedBy} (${sig.roleTitle})`
    : sig.documentedBy;
  return interpolate(vs(locale, "signatureTimeJoin"), {
    name: nameWithRole,
    time: formatIsoForLocale(sig.documentedAtIso, locale),
  });
}

/** ED Summary block for initial nursing assessment — excludes procedures (shown elsewhere). */
export function buildInitialNursingAssessmentSummaryBlock(
  raw: unknown,
  locale: SupportedLanguage
): VisitSummaryTextBlock | null {
  const sections = parseNursingAssessmentSectionsForChart(raw, locale);
  if (sections.length === 0) return null;

  const lines: string[] = [];
  const sig = readInitialNursingEvalSignature(raw);
  if (sig) {
    lines.push(performerMetaLine(sig, locale));
  }

  for (const sec of sections) {
    if (lines.length > 0) lines.push("");
    lines.push(interpolate(vs(locale, "sectionHeader"), { title: sec.label }));
    for (const ln of sec.text.split("\n")) {
      const trimmed = ln.trimEnd();
      if (trimmed) lines.push(trimmed);
    }
  }

  if (lines.length === 0) return null;
  return {
    title: vs(locale, "initialNursingBlockTitle"),
    lines,
  };
}

export function buildInitialNursingAssessmentPrintSection(
  raw: unknown,
  locale: SupportedLanguage
): ErPrintInitialNursingSection | null {
  const sections = parseNursingAssessmentSectionsForChart(raw, locale);
  if (sections.length === 0) return null;
  const sig = readInitialNursingEvalSignature(raw);
  return {
    documentedBy: sig?.documentedBy ?? "—",
    documentedAt: sig ? formatIsoForLocale(sig.documentedAtIso, locale) : "—",
    roleTitle: sig?.roleTitle ?? null,
    sections: sections.map((s) => ({ label: s.label, text: s.text })),
  };
}

/** Nursing discharge execution note — separate from disposition summary to avoid duplication. */
export function buildNursingDischargeDocumentationBlock(
  raw: unknown,
  locale: SupportedLanguage
): VisitSummaryTextBlock | null {
  const exec = readDischargeSortieExecutionFromEncounter(raw);
  if (!exec) return null;

  const lines: string[] = [
    interpolate(vs(locale, "signatureTimeJoin"), {
      name: exec.dischargeSortieCompletedByDisplayName.trim(),
      time: formatIsoForLocale(exec.dischargeSortieCompletedAt, locale),
    }),
  ];
  const note = exec.dischargeSortieExecutionNote?.trim();
  if (note) {
    lines.push("");
    lines.push(interpolate(vs(locale, "nursingDischargeNoteLine"), { text: note }));
  }

  return {
    title: vs(locale, "nursingDischargeBlockTitle"),
    lines,
  };
}

export function buildNursingDischargePrintSection(
  raw: unknown,
  locale: SupportedLanguage
): ErPrintNursingDischargeSection | null {
  const exec = readDischargeSortieExecutionFromEncounter(raw);
  if (!exec) return null;
  return {
    documentedBy: exec.dischargeSortieCompletedByDisplayName.trim(),
    documentedAt: formatIsoForLocale(exec.dischargeSortieCompletedAt, locale),
    executionNote: exec.dischargeSortieExecutionNote?.trim() || null,
  };
}
