import type { SupportedLanguage } from "@/i18n/config";
import { getOrderItemDisplayLabelForLanguage } from "@/lib/orderItemDisplayFr";
import {
  isIncompleteMedicationOrderDisplayLabel,
  isOrderDisplayLabelUnavailable,
  medicationOrderStrengthCandidates,
  resolveMedicationOrderIdentity,
} from "@medora/shared";

export type MarAdministrationHistoryOrderItem = Parameters<
  typeof getOrderItemDisplayLabelForLanguage
>[0];

const PLACEHOLDER_DASHES = new Set(["—", "–", "-", "–"]);

function isPlaceholderDash(label: string | null | undefined): boolean {
  const t = (label ?? "").trim();
  return !t || PLACEHOLDER_DASHES.has(t);
}

function strengthCandidatesForOrderItem(
  orderItem: MarAdministrationHistoryOrderItem | null | undefined,
  snapshotLabel?: string | null
): string[] {
  if (!orderItem) {
    return medicationOrderStrengthCandidates({ snapshotLabel: snapshotLabel ?? null });
  }
  return medicationOrderStrengthCandidates({
    catalogMedication: orderItem.catalogMedication ?? null,
    orderLine: {
      catalogItemType: "MEDICATION",
      manualLabel: orderItem.manualLabel ?? null,
      manualSecondaryText: orderItem.manualSecondaryText ?? null,
      strength:
        typeof orderItem.strength === "number"
          ? String(orderItem.strength)
          : orderItem.strength ?? null,
    },
  });
}

function isUsableMedicationHistoryLabel(
  label: string | null | undefined,
  strengthCandidates: string[]
): boolean {
  const t = (label ?? "").trim();
  if (isPlaceholderDash(t)) return false;
  return !isIncompleteMedicationOrderDisplayLabel(t, {
    strengthCandidates,
    catalogItemType: "MEDICATION",
  });
}

function medicationUnavailableFallback(
  language: SupportedLanguage,
  t: (key: string) => string
): string {
  return language === "fr"
    ? "Médicament (libellé indisponible)"
    : t("patientChartUi.orderDisplayFallback.medication");
}

/**
 * M1.7B.4 — Resolve MAR administration history medication label using the same
 * identity fallback chain as orders / summary (snapshot → order item → catalog → INN).
 */
export function resolveMarAdministrationHistoryLabel(input: {
  medicationLabelSnapshot?: string | null;
  orderItem?: MarAdministrationHistoryOrderItem | null;
  language: SupportedLanguage;
  t: (key: string) => string;
}): string {
  const snapshot = input.medicationLabelSnapshot?.trim() ?? "";
  const orderItem = input.orderItem ?? null;
  const strengthCandidates = strengthCandidatesForOrderItem(orderItem, snapshot);

  if (isUsableMedicationHistoryLabel(snapshot, strengthCandidates)) {
    return snapshot;
  }

  if (orderItem && String(orderItem.catalogItemType ?? "") === "MEDICATION") {
    const enriched = getOrderItemDisplayLabelForLanguage(orderItem, input.language, input.t);
    if (isUsableMedicationHistoryLabel(enriched, strengthCandidates)) {
      return enriched;
    }

    const identity = resolveMedicationOrderIdentity({
      catalogMedication: orderItem.catalogMedication ?? null,
      orderLine: {
        catalogItemType: "MEDICATION",
        manualLabel: orderItem.manualLabel ?? null,
        manualSecondaryText: orderItem.manualSecondaryText ?? null,
        strength:
          typeof orderItem.strength === "number"
            ? String(orderItem.strength)
            : orderItem.strength ?? null,
      },
      snapshotLabel: snapshot || null,
    });
    const localized =
      input.language === "fr" ? identity.displayLabelFr : identity.displayLabelEn;
    if (
      isUsableMedicationHistoryLabel(localized, strengthCandidates) &&
      !isOrderDisplayLabelUnavailable(localized)
    ) {
      return localized;
    }
  }

  if (isUsableMedicationHistoryLabel(snapshot, strengthCandidates)) {
    return snapshot;
  }

  return medicationUnavailableFallback(input.language, input.t);
}
