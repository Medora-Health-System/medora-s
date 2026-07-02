import type { CSSProperties } from "react";
import type { ClinicalRecordAttribution } from "@medora/shared";
import { isClinicalRecordAttributionEmpty } from "@medora/shared";
import type { SupportedLanguage } from "@/i18n/config";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";

export type AttributionLabelKey =
  | "documentedBy"
  | "signedBy"
  | "savedBy"
  | "orderedBy"
  | "resultedBy"
  | "reviewedBy"
  | "administeredBy"
  | "performedBy"
  | "notRecorded";

const ATTRIBUTION_I18N: Record<AttributionLabelKey, string> = {
  documentedBy: "encounterClinicalRecordSummary.attrDocumentedBy",
  signedBy: "encounterClinicalRecordSummary.attrSignedBy",
  savedBy: "encounterClinicalRecordSummary.attrSavedBy",
  orderedBy: "encounterClinicalRecordSummary.attrOrderedBy",
  resultedBy: "encounterClinicalRecordSummary.attrResultedBy",
  reviewedBy: "encounterClinicalRecordSummary.attrReviewedBy",
  administeredBy: "encounterClinicalRecordSummary.attrAdministeredBy",
  performedBy: "encounterClinicalRecordSummary.attrPerformedBy",
  notRecorded: "encounterClinicalRecordSummary.attrNotRecorded",
};

export function formatClinicalRecordAttributionPart(
  labelKey: AttributionLabelKey,
  attr: ClinicalRecordAttribution | null | undefined,
  t: (key: string) => string,
  language: SupportedLanguage
): string | null {
  if (isClinicalRecordAttributionEmpty(attr)) return null;
  const label = t(ATTRIBUTION_I18N[labelKey]);
  const name = attr?.name?.trim() || t(ATTRIBUTION_I18N.notRecorded);
  const role = attr?.role?.trim();
  const at = attr?.at ? formatEncounterChromeDateTime(attr.at, language) : null;
  const nameWithRole = role ? `${name} (${role})` : name;
  return at ? `${label} ${nameWithRole} · ${at}` : `${label} ${nameWithRole}`;
}

export function joinAttributionParts(parts: Array<string | null | undefined>): string {
  return parts.filter((p): p is string => Boolean(p?.trim())).join(" · ");
}

export const attributionLineStyle: CSSProperties = {
  margin: "4px 0 0 0",
  fontSize: 11,
  color: "#64748b",
  lineHeight: 1.4,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

// Avoid importing React in a non-component module — duplicate style object without React type in tests
export const ATTRIBUTION_LINE_STYLE = {
  margin: "4px 0 0 0",
  fontSize: 11,
  color: "#64748b",
  lineHeight: 1.4,
  overflowWrap: "anywhere" as const,
  wordBreak: "break-word" as const,
};
