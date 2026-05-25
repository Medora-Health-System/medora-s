/**
 * Phase 19Y — read-only builders for provider discharge documentation in Summary / ER packet / export.
 */

import type { SupportedLanguage } from "@/i18n/config";
import { i18nMessage } from "@/lib/i18nMessagesLookup";
import type { VisitSummaryTextBlock } from "./emergencyVisitSummaryModel";
import {
  hydrateProviderDischargeDocumentationForm,
  readProviderDischargeDocumentationMeta,
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
  const parts = [specialtyLabel !== `providerDischargeDocumentation19Y.followUpSpecialty.${row.specialty}` ? specialtyLabel : row.specialty];
  if (row.providerOrFacility.trim()) parts.push(row.providerOrFacility.trim());
  if (row.timing.trim()) parts.push(row.timing.trim());
  if (row.phone.trim()) parts.push(row.phone.trim());
  if (row.address.trim()) parts.push(row.address.trim());
  if (row.comments.trim()) parts.push(row.comments.trim());
  return parts.join(" · ");
}

export function buildProviderDischargeDocumentationSummaryBlock(
  dischargeSummaryJson: unknown,
  locale: SupportedLanguage
): VisitSummaryTextBlock | null {
  const form = hydrateProviderDischargeDocumentationForm(dischargeSummaryJson);
  const meta = readProviderDischargeDocumentationMeta(dischargeSummaryJson);

  const hasContent =
    Boolean(form.patientLeftEdAt.trim()) ||
    form.diagnosisRefs.length > 0 ||
    Boolean(form.description.trim()) ||
    Boolean(form.diagnosisInstructions.trim()) ||
    Boolean(form.medicationTreatmentText.trim()) ||
    form.medicationLines.length > 0 ||
    Boolean(form.returnPrecautions.trim()) ||
    Boolean(form.workSchoolNote.trim()) ||
    form.followUpRows.length > 0;

  if (!hasContent && !meta.documentedAt) return null;

  const lines: string[] = [];

  if (meta.documentedByDisplayName && meta.documentedAt) {
    const title = meta.documentedByTitle?.trim();
    const who = title ? `${meta.documentedByDisplayName} (${title})` : meta.documentedByDisplayName;
    lines.push(`${p(locale, "documentedBy")}: ${who} — ${formatIso(meta.documentedAt, locale)}`);
  }

  pushLine(lines, p(locale, "patientLeftEd"), form.patientLeftEdAt ? formatIso(form.patientLeftEdAt, locale) : "");

  if (form.diagnosisRefs.length) {
    lines.push("");
    lines.push(p(locale, "dischargeDiagnoses"));
    for (const dx of form.diagnosisRefs) {
      const primary = dx.isPrimary ? ` (${p(locale, "primary")})` : "";
      lines.push(`• ${dx.code} — ${dx.label}${primary}`);
    }
  }

  pushLine(lines, p(locale, "description"), form.description);
  pushLine(lines, p(locale, "diagnosisInstructions"), form.diagnosisInstructions);
  pushLine(lines, p(locale, "medicationTreatment"), form.medicationTreatmentText);
  pushLine(lines, p(locale, "returnPrecautions"), form.returnPrecautions);
  pushLine(lines, p(locale, "workSchool"), form.workSchoolNote);

  if (form.followUpRows.length) {
    lines.push("");
    lines.push(p(locale, "followUp"));
    for (const row of form.followUpRows) {
      lines.push(`• ${formatFollowUpRow(row, locale)}`);
    }
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
    pushLine(lines, p(locale, "nursingDestinationLabel"), label.startsWith("providerDischargeDocumentation19Y.") ? exec.nursingDestination : label);
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
