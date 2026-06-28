import type { SupportedLanguage } from "@/i18n/config";
import { resolveMarAdministrationHistoryLabel } from "@/features/mar/marAdministrationHistoryLabel";
import { getOrderItemDisplayLabelForLanguage } from "@/lib/orderItemDisplayFr";
import {
  getMedicationFrequencyDefinition,
  isInvalidTechnicalOrderDisplayLabel,
  isOrderDisplayLabelUnavailable,
  normalizeMedicationRoute,
} from "@medora/shared";

export type MedicationOrderGovernanceHeaderItem = Parameters<
  typeof getOrderItemDisplayLabelForLanguage
>[0] & {
  route?: string | null;
  frequencyCode?: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when a string is a raw database identifier — must never appear in clinician UI. */
export function isClinicianFacingUuid(value: string | null | undefined): boolean {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 && UUID_RE.test(trimmed);
}

function labelContainsToken(label: string, token: string): boolean {
  return label.toLowerCase().includes(token.toLowerCase());
}

function formatGovernanceRouteToken(route: string | null | undefined): string | null {
  const raw = route?.trim();
  if (!raw) return null;
  const normalized = normalizeMedicationRoute(raw);
  return (normalized ?? raw).toUpperCase();
}

function formatGovernanceFrequencyToken(
  frequencyCode: string | null | undefined,
  language: SupportedLanguage
): string | null {
  const code = frequencyCode?.trim().toUpperCase();
  if (!code) return null;
  if (/^Q\d+H$/.test(code)) return code.toLowerCase();
  const def = getMedicationFrequencyDefinition(code);
  if (def) return language === "fr" ? def.displayNameFr : def.displayNameEn;
  return code;
}

function resolveMedicationBaseLabel(input: {
  orderItem: MedicationOrderGovernanceHeaderItem;
  language: SupportedLanguage;
  t: (key: string) => string;
}): string | null {
  const fromHistory = resolveMarAdministrationHistoryLabel({
    orderItem: input.orderItem,
    language: input.language,
    t: input.t,
  }).trim();

  if (
    fromHistory &&
    !isClinicianFacingUuid(fromHistory) &&
    !isOrderDisplayLabelUnavailable(fromHistory) &&
    !isInvalidTechnicalOrderDisplayLabel(fromHistory, "MEDICATION")
  ) {
    return fromHistory;
  }

  return null;
}

function appendStrengthRouteFrequency(
  base: string,
  orderItem: MedicationOrderGovernanceHeaderItem,
  language: SupportedLanguage
): string {
  const tokens: string[] = [base.trim()];
  const strength =
    orderItem.strength?.trim() ||
    orderItem.catalogMedication?.strength?.trim() ||
    null;
  if (strength && !labelContainsToken(base, strength)) {
    tokens.push(strength);
  }

  const route = formatGovernanceRouteToken(orderItem.route ?? null);
  if (route && !labelContainsToken(tokens.join(" "), route)) {
    tokens.push(route);
  }

  const frequency = formatGovernanceFrequencyToken(orderItem.frequencyCode ?? null, language);
  if (frequency && !labelContainsToken(tokens.join(" "), frequency)) {
    tokens.push(frequency);
  }

  return tokens.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Clinician-facing medication order line for governance dialog headers.
 * Never returns raw order / order-item UUIDs.
 */
export function resolveMedicationOrderGovernanceClinicalHeader(input: {
  orderItem: MedicationOrderGovernanceHeaderItem;
  language: SupportedLanguage;
  t: (key: string) => string;
  medicationLabel?: string | null;
}): string {
  const fallback = input.t("medicationOrderLifecycle.clinicalHeaderFallback");

  const explicit = input.medicationLabel?.trim();
  if (
    explicit &&
    !isClinicianFacingUuid(explicit) &&
    !isInvalidTechnicalOrderDisplayLabel(explicit, "MEDICATION") &&
    !isOrderDisplayLabelUnavailable(explicit)
  ) {
    return appendStrengthRouteFrequency(explicit, input.orderItem, input.language);
  }

  const manual = input.orderItem.manualLabel?.trim();
  if (
    manual &&
    !isClinicianFacingUuid(manual) &&
    !isInvalidTechnicalOrderDisplayLabel(manual, "MEDICATION")
  ) {
    return appendStrengthRouteFrequency(manual, input.orderItem, input.language);
  }

  const base = resolveMedicationBaseLabel(input);
  if (!base) return fallback;

  return appendStrengthRouteFrequency(base, input.orderItem, input.language);
}
