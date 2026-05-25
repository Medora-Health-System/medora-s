/**
 * Read-only provider documentation summary for ED Summary / ER packet.
 * Preserves saved text; only UI labels and status lines are localized.
 */

import type { SupportedLanguage } from "@/i18n/config";
import {
  buildProviderDocumentationDisplayModel,
  type ProviderDocumentationDisplayModel,
} from "@/lib/providerDocumentationModel";
import {
  buildErProviderMsePreviewModel,
  erProviderMseFormFromEncounter,
} from "./emergencyProviderMseV1";
import { erTriageT } from "./erTriageI18nLookup";
import type { VisitSummaryTextBlock } from "./emergencyVisitSummaryModel";

const MAX_ADDENDUM = 240;

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
    const tag = locale === "en" ? "en-US" : "fr-FR";
    return new Date(iso).toLocaleString(tag, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

export type VisitSummaryProviderDocumentationBlock = {
  title: string;
  statusLine: string;
  savedBy: string | null;
  savedAt: string | null;
  signedBy: string | null;
  signedAt: string | null;
  sections: Array<{ label: string; text: string }>;
  addenda: Array<{ at: string; by: string | null; text: string }>;
};

export type ErPrintProviderDocumentationSection = {
  title: string;
  statusLine: string;
  savedLine: string | null;
  signedLine: string | null;
  sections: Array<{ label: string; text: string }>;
  addenda: Array<{ at: string; by: string; text: string }>;
};

type ProviderAddendumInput = {
  text?: unknown;
  createdAt?: unknown;
  createdByDisplayFr?: unknown;
};

function resolveProviderStatus(
  docStatus: string,
  locale: SupportedLanguage
): "signed" | "saved" | "draft" {
  const s = docStatus.trim().toUpperCase();
  if (s === "SIGNED") return "signed";
  if (s === "SAVED" || s === "FINALIZED") return "saved";
  return "draft";
}

function statusLabel(status: "signed" | "saved" | "draft", locale: SupportedLanguage): string {
  const key =
    status === "signed"
      ? "providerStatusSigned"
      : status === "saved"
        ? "providerStatusSaved"
        : "providerStatusDraft";
  return vs(locale, key);
}

function readLegacyProviderSections(
  nursingAssessment: unknown,
  locale: SupportedLanguage
): Array<{ label: string; text: string }> {
  const form = erProviderMseFormFromEncounter(nursingAssessment);
  const preview = buildErProviderMsePreviewModel(form, locale);
  const out: Array<{ label: string; text: string }> = [];
  for (const sec of preview.sections) {
    if (sec.id === "empty") continue;
    const text = sec.lines.map((l) => l.trim()).filter(Boolean).join("\n");
    if (!text) continue;
    out.push({ label: sec.title, text });
  }
  const nar = preview.oneLineSummary?.trim() ?? "";
  if (nar && out.length === 0) {
    out.push({ label: vs(locale, "providerNarrativeOnlyTitle"), text: nar });
  }
  return out;
}

export function buildVisitSummaryProviderDocumentationBlock(input: {
  nursingAssessment: unknown;
  locale: SupportedLanguage;
  providerDocumentationStatus?: string | null;
  providerDocumentationSignedAt?: string | null;
  providerDocumentationSignedByDisplayFr?: string | null;
  providerAddenda?: ProviderAddendumInput[] | null;
}): VisitSummaryProviderDocumentationBlock | null {
  const locale = input.locale;
  const workspace = buildProviderDocumentationDisplayModel({
    nursingAssessment: input.nursingAssessment,
    locale: locale === "en" ? "en" : "fr",
  });
  const sections = workspace
    ? workspace.sections.map((s) => ({ label: s.label, text: s.text }))
    : readLegacyProviderSections(input.nursingAssessment, locale);
  if (sections.length === 0) return null;

  const docStatus = (input.providerDocumentationStatus ?? "").trim();
  const status = resolveProviderStatus(docStatus, locale);
  const signedAt =
    status === "signed" && input.providerDocumentationSignedAt
      ? formatIsoForLocale(input.providerDocumentationSignedAt, locale)
      : null;
  const signedBy =
    status === "signed" ? (input.providerDocumentationSignedByDisplayFr ?? "").trim() || null : null;
  const savedAt =
    workspace?.savedAt && status !== "signed"
      ? formatIsoForLocale(workspace.savedAt, locale)
      : null;
  const savedBy =
    workspace?.savedBy && status !== "signed" ? workspace.savedBy.trim() || null : null;

  const addendaRaw = Array.isArray(input.providerAddenda) ? input.providerAddenda : [];
  const addenda = addendaRaw
    .map((a) => {
      const text = typeof a.text === "string" ? a.text.trim() : "";
      if (!text) return null;
      return {
        at: formatIsoForLocale(typeof a.createdAt === "string" ? a.createdAt : "", locale),
        by: typeof a.createdByDisplayFr === "string" ? a.createdByDisplayFr.trim() || null : null,
        text: text.length > MAX_ADDENDUM ? `${text.slice(0, MAX_ADDENDUM)}…` : text,
      };
    })
    .filter((a): a is NonNullable<typeof a> => a != null);

  return {
    title: workspace?.title ?? vs(locale, "providerFlattenTitle"),
    statusLine: statusLabel(status, locale),
    savedBy,
    savedAt,
    signedBy,
    signedAt,
    sections,
    addenda,
  };
}

export function providerDocumentationToVisitSummaryBlock(
  block: VisitSummaryProviderDocumentationBlock,
  locale: SupportedLanguage
): VisitSummaryTextBlock {
  const lines: string[] = [block.statusLine];
  if (block.signedAt) {
    lines.push(
      block.signedBy
        ? interpolate(vs(locale, "providerSignedLine"), { name: block.signedBy, time: block.signedAt })
        : interpolate(vs(locale, "providerSignedAtLine"), { time: block.signedAt })
    );
  } else if (block.savedAt) {
    lines.push(
      block.savedBy
        ? interpolate(vs(locale, "providerSavedLine"), { name: block.savedBy, time: block.savedAt })
        : interpolate(vs(locale, "providerSavedAtLine"), { time: block.savedAt })
    );
  }
  for (const sec of block.sections) {
    lines.push("");
    lines.push(interpolate(vs(locale, "sectionHeader"), { title: sec.label }));
    for (const ln of sec.text.split("\n")) {
      const t = ln.trimEnd();
      if (t) lines.push(t);
    }
  }
  for (const add of block.addenda) {
    lines.push("");
    lines.push(
      add.by
        ? interpolate(vs(locale, "providerAddendumLine"), {
            name: add.by,
            time: add.at,
            text: add.text,
          })
        : interpolate(vs(locale, "providerAddendumAtLine"), { time: add.at, text: add.text })
    );
  }
  return { title: block.title, lines };
}

export function buildProviderDocumentationPrintSection(
  block: VisitSummaryProviderDocumentationBlock,
  locale: SupportedLanguage
): ErPrintProviderDocumentationSection {
  const savedLine =
    block.savedAt && !block.signedAt
      ? block.savedBy
        ? interpolate(vs(locale, "providerSavedLine"), { name: block.savedBy, time: block.savedAt })
        : interpolate(vs(locale, "providerSavedAtLine"), { time: block.savedAt })
      : null;
  const signedLine =
    block.signedAt
      ? block.signedBy
        ? interpolate(vs(locale, "providerSignedLine"), { name: block.signedBy, time: block.signedAt })
        : interpolate(vs(locale, "providerSignedAtLine"), { time: block.signedAt })
      : null;
  return {
    title: block.title,
    statusLine: block.statusLine,
    savedLine,
    signedLine,
    sections: block.sections,
    addenda: block.addenda.map((a) => ({
      at: a.at,
      by: a.by ?? "—",
      text: a.text,
    })),
  };
}

export function hasProviderDocumentationContent(
  nursingAssessment: unknown,
  providerDocumentationStatus?: string | null
): boolean {
  const block = buildVisitSummaryProviderDocumentationBlock({
    nursingAssessment,
    locale: "en",
    providerDocumentationStatus,
  });
  return block != null;
}

export type { ProviderDocumentationDisplayModel };
