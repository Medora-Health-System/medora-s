/**
 * ER packet — read-only clinical documentation cards (EDOC legal chart entries).
 * Mirrors Summary dashboard + PatientChartPrintLayout summary rendering.
 */

import type { SupportedLanguage } from "@/i18n/config";
import { printT } from "@/lib/printI18n";
import {
  appendBloodProductPatientSummaryLines,
  EDOC7_BLOOD_PRODUCT_DOCUMENTATION_CARD_IDS,
  selectClinicalDocumentationPayloadSummary,
} from "@medora/shared";

export type ErPrintClinicalDocumentationEntry = {
  id: string;
  cardId: string;
  cardTitleEn: string;
  cardTitleFr: string;
  authorDisplayName: string;
  authorRoleTitle: string;
  createdAt: string;
  payloadJson: Record<string, unknown>;
  payloadSummary?: Array<{ key: string; value: string }>;
  payloadSummaryEn?: Array<{ key: string; value: string }>;
  payloadSummaryFr?: Array<{ key: string; value: string }>;
  voidedAt?: string | null;
  requiresWitnessSignature?: boolean;
  witnessedAt?: string | null;
  witnessDisplayName?: string | null;
  witnessRoleTitle?: string | null;
};

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtIso(iso: string | null | undefined, loc: string): string {
  if (!iso?.trim()) return "";
  try {
    return new Date(iso).toLocaleString(loc);
  } catch {
    return "";
  }
}

function summaryLinesForEntry(
  entry: ErPrintClinicalDocumentationEntry,
  language: SupportedLanguage
): Array<{ key: string; value: string }> {
  const summaryLocale = language === "en" ? "en" : "fr";
  if ((EDOC7_BLOOD_PRODUCT_DOCUMENTATION_CARD_IDS as readonly string[]).includes(entry.cardId)) {
    return appendBloodProductPatientSummaryLines(entry.cardId, entry.payloadJson ?? {}, summaryLocale, {
      witnessDisplayName: entry.witnessDisplayName ?? null,
      witnessStatus: entry.witnessedAt
        ? "WITNESSED"
        : entry.requiresWitnessSignature
          ? "PENDING_WITNESS"
          : undefined,
    });
  }
  return selectClinicalDocumentationPayloadSummary(entry, summaryLocale);
}

/** Appends the clinical documentation section when entries exist. */
export function appendClinicalDocumentationEntriesBlock(
  body: string[],
  language: SupportedLanguage,
  loc: string,
  entries: ErPrintClinicalDocumentationEntry[] | null | undefined
): void {
  if (!Array.isArray(entries) || entries.length === 0) return;

  body.push(
    `<h2 style="font-size: 15px; margin: 20px 0 10px 0; font-weight: 700; border-bottom: 1px solid #000; padding-bottom: 4px;">${esc(
      printT(language, "printOutput.erPacket.sectionClinicalDocumentation")
    )}</h2>`
  );

  for (const entry of entries) {
    const title = language === "en" ? entry.cardTitleEn : entry.cardTitleFr;
    const summaryLines = summaryLinesForEntry(entry, language);
    const summaryHtml =
      summaryLines.length > 0
        ? `<ul style="margin: 4px 0 0 18px; font-size: 13px; color: #475569;">${summaryLines
            .map((line) => `<li><strong>${esc(line.key)}</strong>: ${esc(line.value)}</li>`)
            .join("")}</ul>`
        : "";

    const voidTag = entry.voidedAt
      ? ` <span style="color: #b91c1c;">[${esc(printT(language, "clinicalDocumentation.entryVoided"))}]</span>`
      : "";
    const witnessPending =
      entry.requiresWitnessSignature && !entry.witnessedAt && !entry.voidedAt
        ? ` <span style="color: #a16207;">[${esc(printT(language, "clinicalDocumentation.badgePendingWitness"))}]</span>`
        : "";
    const witnessTag =
      entry.witnessedAt && entry.witnessDisplayName
        ? ` — ${esc(
            printT(language, "clinicalDocumentation.witnessLine")
              .replace("{name}", entry.witnessDisplayName)
              .replace("{role}", entry.witnessRoleTitle ?? "—")
              .replace("{when}", fmtIso(entry.witnessedAt, loc))
          )}`
        : "";

    body.push(
      `<div style="margin: 0 0 12px 0; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px;">` +
        `<p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 600;">${esc(title)} — ${esc(
          entry.authorDisplayName ?? "—"
        )}${voidTag}${witnessPending}</p>` +
        `<p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;">${esc(
          entry.authorRoleTitle ?? "—"
        )} — ${esc(fmtIso(entry.createdAt, loc))}${witnessTag}</p>` +
        `${summaryHtml}` +
        `</div>`
    );
  }
}
