/**
 * Phase 19Y / 19Y.1A — read-only builders for provider discharge documentation in Summary / ER packet / export.
 */

import { getLocalizedDiagnosisDisplayLabel } from "./diagnosisFrenchDisplayLabels";
import type { SupportedLanguage } from "@/i18n/config";
import { i18nMessage } from "@/lib/i18nMessagesLookup";
import type { ErDispositionPreviewSection } from "./emergencyDispositionV1";
import type { VisitSummaryTextBlock } from "./emergencyVisitSummaryModel";
import {
  getSelectedDiagnosisDocs,
  hydrateProviderDischargeDocumentationForm,
  readProviderDischargeDocumentationMeta,
  type ProviderDischargeDiagnosisCard,
  type ProviderDischargeDocumentationForm,
  type ProviderDischargeFollowUpRow,
} from "./providerDischargeDocumentationModel";
import {
  extractTemplateIdsFromDiagnosisCards,
  resolvePatientSpecificDischargeAdditions,
  type PatientSpecificDischargeAddition,
  type PatientSpecificDischargeContext,
} from "./providerDischargePatientSpecificAdditions";
import { readNursingDischargeExecutionStored } from "./nursingDischargeExecutionModel";

export type ProviderDischargeDocumentationRenderOptions = {
  /** When omitted, patient-specific additions are not rendered (conservative default). */
  patientContext?: PatientSpecificDischargeContext;
};

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

function localizedDiagnosisLine(
  code: string,
  englishLabel: string,
  locale: SupportedLanguage,
  primarySuffix: string
): string {
  return `${code} — ${getLocalizedDiagnosisDisplayLabel({ code, description: englishLabel }, locale)}${primarySuffix}`;
}

function appendPatientSpecificInstructionLines(
  lines: string[],
  selectedDocs: ProviderDischargeDiagnosisCard[],
  locale: SupportedLanguage,
  options?: ProviderDischargeDocumentationRenderOptions
) {
  if (!options?.patientContext) return;
  const templateIds = extractTemplateIdsFromDiagnosisCards(selectedDocs);
  const additions = resolvePatientSpecificDischargeAdditions({
    templateIds,
    context: options.patientContext,
    locale,
  });
  if (!additions.length) return;
  lines.push("");
  lines.push(p(locale, "patientSpecificInstructionsSection"));
  for (const addition of additions) {
    lines.push(`• ${addition.text}`);
  }
}

function buildPatientSpecificPreviewSection(
  selectedDocs: ProviderDischargeDiagnosisCard[],
  locale: SupportedLanguage,
  options?: ProviderDischargeDocumentationRenderOptions
): ErDispositionPreviewSection | null {
  if (!options?.patientContext) return null;
  const templateIds = extractTemplateIdsFromDiagnosisCards(selectedDocs);
  const additions = resolvePatientSpecificDischargeAdditions({
    templateIds,
    context: options.patientContext,
    locale,
  });
  if (!additions.length) return null;
  return {
    id: "providerPatientSpecific",
    title: p(locale, "patientSpecificInstructionsSection"),
    lines: additions.map((a) => `• ${a.text}`),
  };
}

export function getPatientSpecificDischargeAdditionsForForm(
  form: ProviderDischargeDocumentationForm,
  locale: SupportedLanguage,
  options?: ProviderDischargeDocumentationRenderOptions
): PatientSpecificDischargeAddition[] {
  if (!options?.patientContext) return [];
  const selectedDocs = getSelectedDiagnosisDocs(form);
  return resolvePatientSpecificDischargeAdditions({
    templateIds: extractTemplateIdsFromDiagnosisCards(selectedDocs),
    context: options.patientContext,
    locale,
  });
}

function appendDiagnosisCardLines(lines: string[], doc: ProviderDischargeDiagnosisCard, locale: SupportedLanguage) {
  const primarySuffix = doc.isPrimaryDiagnosis ? ` (${p(locale, "primary")})` : "";
  lines.push("");
  lines.push(localizedDiagnosisLine(doc.code, doc.displayName, locale, primarySuffix));
  pushLine(lines, p(locale, "description"), doc.description);
  pushLine(lines, p(locale, "diagnosisInstructions"), doc.diagnosisInstructions);
  pushLine(lines, p(locale, "medicationTreatment"), doc.medicationTreatment);
}

function appendSharedPlanningLines(
  lines: string[],
  form: ReturnType<typeof hydrateProviderDischargeDocumentationForm>,
  locale: SupportedLanguage
) {
  const hasPlanning =
    Boolean(form.returnPrecautions.trim()) ||
    Boolean(form.returnWorkSchool.trim()) ||
    form.followUps.some((r) => r.providerOrFacility.trim() || r.timing.trim());

  if (!hasPlanning) return;

  lines.push("");
  lines.push(p(locale, "dischargePlanningSection"));
  pushLine(lines, p(locale, "returnPrecautions"), form.returnPrecautions);
  pushLine(lines, p(locale, "workSchool"), form.returnWorkSchool);
  if (form.followUps.length) {
    lines.push(p(locale, "followUp"));
    for (const row of form.followUps) {
      lines.push(`• ${formatFollowUpRow(row, locale)}`);
    }
  }
}

export function buildProviderDischargeDocumentationSummaryBlock(
  dischargeSummaryJson: unknown,
  locale: SupportedLanguage,
  options?: ProviderDischargeDocumentationRenderOptions
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
    lines.push("");
    lines.push(p(locale, "diagnosisDocumentationSection"));
    for (const doc of selectedDocs) {
      appendDiagnosisCardLines(lines, doc, locale);
    }
    appendPatientSpecificInstructionLines(lines, selectedDocs, locale, options);
    appendSharedPlanningLines(lines, form, locale);
  } else if (form.diagnosisDocs.length === 1) {
    lines.push("");
    lines.push(p(locale, "diagnosisDocumentationSection"));
    appendDiagnosisCardLines(lines, form.diagnosisDocs[0]!, locale);
    appendPatientSpecificInstructionLines(lines, [form.diagnosisDocs[0]!], locale, options);
    appendSharedPlanningLines(lines, form, locale);
  } else {
    appendSharedPlanningLines(lines, form, locale);
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

function previewPushLine(lines: string[], label: string, value: string | null | undefined) {
  const v = (value ?? "").trim();
  if (!v) return;
  lines.push(`${label} : ${v.length > 500 ? `${v.slice(0, 500)}…` : v}`);
}

/** Right-side disposition preview — provider 19Y documentation without governance metadata. */
export function buildProviderDischargeDocumentationPreviewSections(
  providerForm: ProviderDischargeDocumentationForm,
  dischargeSummaryJson: unknown,
  locale: SupportedLanguage,
  options?: ProviderDischargeDocumentationRenderOptions
): ErDispositionPreviewSection[] {
  const meta = readProviderDischargeDocumentationMeta(dischargeSummaryJson);
  const selectedDocs = getSelectedDiagnosisDocs(providerForm);
  const sections: ErDispositionPreviewSection[] = [];

  const metaLines: string[] = [];
  if (meta.documentedByDisplayName && meta.documentedAt) {
    const title = meta.documentedByTitle?.trim();
    const who = title ? `${meta.documentedByDisplayName} (${title})` : meta.documentedByDisplayName;
    metaLines.push(`${p(locale, "documentedBy")} : ${who} — ${formatIso(meta.documentedAt, locale)}`);
  }
  if (providerForm.patientLeftEdAt.trim()) {
    previewPushLine(metaLines, p(locale, "patientLeftEd"), formatIso(providerForm.patientLeftEdAt, locale));
  }
  if (metaLines.length) {
    sections.push({ id: "providerMeta", title: p(locale, "summaryBlockTitle"), lines: metaLines });
  }

  if (selectedDocs.length) {
    const docLines: string[] = [];
    for (const doc of selectedDocs) {
      const primarySuffix = doc.isPrimaryDiagnosis ? ` (${p(locale, "primary")})` : "";
      docLines.push(localizedDiagnosisLine(doc.code, doc.displayName, locale, primarySuffix));
      previewPushLine(docLines, p(locale, "description"), doc.description);
      previewPushLine(docLines, p(locale, "diagnosisInstructions"), doc.diagnosisInstructions);
      previewPushLine(docLines, p(locale, "medicationTreatment"), doc.medicationTreatment);
      if (doc !== selectedDocs[selectedDocs.length - 1]) docLines.push("");
    }
    sections.push({
      id: "providerDoc",
      title: p(locale, "diagnosisDocumentationSection"),
      lines: docLines,
    });
  }

  const patientSpecificSection = buildPatientSpecificPreviewSection(selectedDocs, locale, options);
  if (patientSpecificSection) sections.push(patientSpecificSection);

  const planningLines: string[] = [];
  previewPushLine(planningLines, p(locale, "returnPrecautions"), providerForm.returnPrecautions);
  previewPushLine(planningLines, p(locale, "workSchool"), providerForm.returnWorkSchool);
  if (providerForm.followUps.length) {
    planningLines.push(p(locale, "followUp"));
    for (const row of providerForm.followUps) {
      planningLines.push(`• ${formatFollowUpRow(row, locale)}`);
    }
  }
  if (planningLines.length) {
    sections.push({
      id: "providerPlanning",
      title: p(locale, "dischargePlanningSection"),
      lines: planningLines,
    });
  }

  return sections;
}
