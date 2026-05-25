/**
 * Phase 19Y / 19Y.1A — read-only builders for provider discharge documentation in Summary / ER packet / export.
 */

import type { SupportedLanguage } from "@/i18n/config";
import { i18nMessage } from "@/lib/i18nMessagesLookup";
import type { VisitSummaryTextBlock } from "./emergencyVisitSummaryModel";
import {
  getSelectedDiagnosisDocs,
  hydrateProviderDischargeDocumentationForm,
  readProviderDischargeDocumentationMeta,
  type ProviderDischargeDiagnosisDoc,
  type ProviderDischargeFollowUpRow,
} from "./providerDischargeDocumentationModel";
import { readNursingDischargeExecutionStored } from "./nursingDischargeExecutionModel";

function p(locale: SupportedLanguage, key: string): string {
  return i18nMessage(locale, `providerDischargeDocumentation19Y.${key}`);
}

function formatIso(iso: string, locale: SupportedLanguage): string {
  try {
    const tag = locale === "en" ? "en-US" : "fr-FR";
    return new Date(iso).toLocaleString(tag, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function pushLine(lines: string[], label: string, value: string | null | undefined) {
  const v = (value ?? "").trim();
  if (v) lines.push(`${label}: ${v}`);
}

function formatFollowUpRow(row: ProviderDischargeFollowUpRow, locale: SupportedLanguage): string {
  const specialtyLabel = p(locale, `followUpSpecialty.${row.specialty}`);
  const parts = [
    specialtyLabel !== `providerDischargeDocumentation19Y.followUpSpecialty.${row.specialty}` ?
      specialtyLabel
    : row.specialty,
  ];
  if (row.providerOrFacility.trim()) parts.push(row.providerOrFacility.trim());
  if (row.timing.trim()) parts.push(row.timing.trim());
  if (row.phone.trim()) parts.push(row.phone.trim());
  if (row.address.trim()) parts.push(row.address.trim());
  if (row.comments.trim()) parts.push(row.comments.trim());
  return parts.join(" · ");
}

function appendDiagnosisDocLines(lines: string[], doc: ProviderDischargeDiagnosisDoc, locale: SupportedLanguage) {
  const primarySuffix = "";
  lines.push("");
  lines.push(`${doc.code} — ${doc.displayName}${primarySuffix}`);
  pushLine(lines, p(locale, "description"), doc.description);
  pushLine(lines, p(locale, "diagnosisInstructions"), doc.diagnosisInstructions);
  pushLine(lines, p(locale, "medicationTreatment"), doc.medicationTreatment);
  pushLine(lines, p(locale, "returnPrecautions"), doc.returnPrecautions);
  pushLine(lines, p(locale, "workSchool"), doc.returnWorkSchool);
  if (doc.followUps.length) {
    lines.push(p(locale, "followUp"));
    for (const row of doc.followUps) {
      lines.push(`• ${formatFollowUpRow(row, locale)}`);
    }
  }
}

export function buildProviderDischargeDocumentationSummaryBlock(
  dischargeSummaryJson: unknown,
  locale: SupportedLanguage
): VisitSummaryTextBlock | null {
  const form = hydrateProviderDischargeDocumentationForm(dischargeSummaryJson);
  const meta = readProviderDischargeDocumentationMeta(dischargeSummaryJson);
  const selectedDocs = getSelectedDiagnosisDocs(form);

  const hasContent =
    Boolean(form.patientLeftEdAt.trim()) ||
    selectedDocs.length > 0 ||
    form.diagnosisRefs.length > 0;

  if (!hasContent && !meta.documentedAt) return null;

  const lines: string[] = [];

  if (meta.documentedByDisplayName && meta.documentedAt) {
    const title = meta.documentedByTitle?.trim();
    const who = title ? `${meta.documentedByDisplayName} (${title})` : meta.documentedByDisplayName;
    lines.push(`${p(locale, "documentedBy")}: ${who} — ${formatIso(meta.documentedAt, locale)}`);
  }

  pushLine(lines, p(locale, "patientLeftEd"), form.patientLeftEdAt ? formatIso(form.patientLeftEdAt, locale) : "");

  if (selectedDocs.length) {
    for (const doc of selectedDocs) {
      appendDiagnosisDocLines(lines, doc, locale);
    }
  } else if (form.diagnosisDocs.length === 1) {
    appendDiagnosisDocLines(lines, form.diagnosisDocs[0]!, locale);
  }

  if (lines.length === 0) return null;
  return { title: p(locale, "summaryBlockTitle"), lines };
}

export function buildNursingDischargeExecutionSummaryBlock19Y(
  nursingAssessment: unknown,
  locale: SupportedLanguage
): VisitSummaryTextBlock | null {
  const exec = readNursingDischargeExecutionStored(nursingAssessment);
  if (!exec) return null;

  const lines: string[] = [];
  const title = exec.dischargedByTitle?.trim();
  const who = title ?
    `${exec.dischargeSortieCompletedByDisplayName} (${title})`
  : exec.dischargeSortieCompletedByDisplayName;
  lines.push(`${p(locale, "nursingDischargedBy")}: ${who} — ${formatIso(exec.dischargeSortieCompletedAt, locale)}`);

  if (exec.nursingDestination) {
    const label = p(locale, `nursingDestination.${exec.nursingDestination}`);
    pushLine(
      lines,
      p(locale, "nursingDestinationLabel"),
      label.startsWith("providerDischargeDocumentation19Y.") ? exec.nursingDestination : label
    );
  }

  if (exec.nursingConditionAtDischarge) {
    const label = p(locale, `nursingCondition.${exec.nursingConditionAtDischarge}`);
    pushLine(
      lines,
      p(locale, "nursingConditionLabel"),
      label.startsWith("providerDischargeDocumentation19Y.") ? exec.nursingConditionAtDischarge : label
    );
  }

  if (exec.nursingTeachingReviewed?.length) {
    lines.push("");
    lines.push(p(locale, "nursingTeachingSectionLabel"));
    for (const item of exec.nursingTeachingReviewed) {
      const label = p(locale, `nursingTeaching.${item}`);
      lines.push(`• ${label.startsWith("providerDischargeDocumentation19Y.") ? item : label}`);
    }
  }

  pushLine(lines, p(locale, "nursingNote"), exec.dischargeSortieExecutionNote);

  return { title: p(locale, "nursingSummaryBlockTitle"), lines };
}
