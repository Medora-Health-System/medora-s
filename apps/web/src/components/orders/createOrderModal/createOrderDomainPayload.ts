import type { OrderCreateDto, OrderItemCreateDto } from "@medora/shared";
import {
  OXYGEN_THERAPY_PROCEDURE_CODE,
  buildEnterpriseOrderSetProvenance,
  resolveMedicationOrderItemFrequencyCode,
  validateEnterpriseOrderSetApplication,
  type EnterpriseOrderSetApplyContext,
  type EnterpriseOrderSetProvenance,
  type EnterpriseOrderSetSkippedItem,
  type EnterpriseOrderSetVerbalOrderAttestation,
} from "@medora/shared";
import { resolveClinicalTimeZone } from "@/lib/clinicalTimeDisplay";
import { resolveMedicationOrderItemIntendedUtcForSubmit } from "./createOrderMedicationDraft";
import type { CreateOrderLineItem, OrderModalTab } from "./types";
import type { OrderSetSkippedItem } from "./resolveEnterpriseOrderSetItems";

export const CATALOG_ITEM_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCatalogItemUuid(value: string | undefined | null): value is string {
  const trimmed = value?.trim();
  return Boolean(trimmed && CATALOG_ITEM_UUID_PATTERN.test(trimmed));
}

export type OrderAuthorityPayloadFields = {
  orderSource?: "PROVIDER_ORDER" | "VERBAL_ORDER" | "NURSING_PROTOCOL";
  readbackConfirmed?: boolean;
  protocolName?: string;
};

export function toEnterpriseOrderSetSkippedItems(
  skipped: readonly OrderSetSkippedItem[],
  selectedItemKeys: readonly string[]
): EnterpriseOrderSetSkippedItem[] {
  const selected = new Set(selectedItemKeys);
  return skipped
    .filter((item) => selected.has(item.key))
    .map((item) => ({ key: item.key, reason: item.reason }));
}

export function buildLabOrderItemDto(line: CreateOrderLineItem): OrderItemCreateDto {
  const manualLabel = (line.manualLabel ?? line._label).trim();
  const catalogItemId = line.catalogItemId?.trim();
  if (!line.isManual && isCatalogItemUuid(catalogItemId)) {
    return {
      catalogItemId,
      catalogItemType: "LAB_TEST",
      ...(line._label?.trim() ? { displayLabelFr: line._label.trim() } : {}),
    };
  }
  return {
    catalogItemId: null,
    catalogItemType: "LAB_TEST",
    manualLabel,
    notes: line.notes?.trim() || undefined,
  };
}

export function buildImagingOrderItemDto(line: CreateOrderLineItem): OrderItemCreateDto {
  const manualLabel = (line.manualLabel ?? line._label).trim();
  const catalogItemId = line.catalogItemId?.trim();
  if (!line.isManual && isCatalogItemUuid(catalogItemId)) {
    return {
      catalogItemId,
      catalogItemType: "IMAGING_STUDY",
      ...(line._label?.trim() ? { displayLabelFr: line._label.trim() } : {}),
    };
  }
  return {
    catalogItemId: null,
    catalogItemType: "IMAGING_STUDY",
    manualLabel,
    manualSecondaryText: line.manualSecondaryText?.trim() || undefined,
    notes: line.notes?.trim() || undefined,
  };
}

export function buildCareOrderItemDto(line: CreateOrderLineItem): OrderItemCreateDto {
  const explicit = line._enterpriseProcedureId?.trim();
  const fromQuickKey =
    line._careQuickKey === "ekg_workflow"
      ? "ekg_ecg"
      : line._careQuickKey === "laceration_kit"
        ? "laceration_repair"
        : line._careQuickKey === "oxygen_therapy"
          ? OXYGEN_THERAPY_PROCEDURE_CODE
          : null;
  const enterpriseProcedureId = explicit || fromQuickKey || undefined;

  return {
    catalogItemId: null,
    catalogItemType: "CARE",
    manualLabel: (line.manualLabel ?? line._label).trim(),
    ...(enterpriseProcedureId ? { enterpriseProcedureId } : {}),
    notes: line.notes?.trim() || undefined,
  };
}

export function resolveOrderSetProvenanceForSubmit(input: {
  applyContext: EnterpriseOrderSetApplyContext | null;
  orderSetReviewActive: boolean;
  orderType: OrderModalTab;
  items: CreateOrderLineItem[];
  canPrescribe: boolean;
  hasRnStandingOrderAuthority: boolean;
  roleCodes: readonly string[];
  userId?: string;
  verbalOrderAttestation?: EnterpriseOrderSetVerbalOrderAttestation;
}): EnterpriseOrderSetProvenance | undefined {
  if (!input.applyContext || !input.orderSetReviewActive) return undefined;

  const placedItemKeys = input.items
    .map((item) => item._enterpriseOrderSetItemKey?.trim())
    .filter((key): key is string => Boolean(key));

  if (placedItemKeys.length === 0 || placedItemKeys.length !== input.items.length) {
    return undefined;
  }

  const provenance = buildEnterpriseOrderSetProvenance({
    applyContext: input.applyContext,
    orderType: input.orderType,
    placedItemKeys,
    ...(input.verbalOrderAttestation ? { verbalOrderAttestation: input.verbalOrderAttestation } : {}),
  });

  const validation = validateEnterpriseOrderSetApplication({
    provenance,
    itemCount: input.items.length,
    roleCodes: input.roleCodes,
    canPrescribe: input.canPrescribe,
    hasRnStandingOrderAuthority: input.hasRnStandingOrderAuthority,
    currentUserId: input.userId,
  });

  if (!validation.ok) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[orderSetSubmit] omitting provenance", validation);
    }
    return undefined;
  }

  return provenance;
}

export function buildCreateOrderDomainPayload(input: {
  type: OrderModalTab;
  priority: "ROUTINE" | "URGENT" | "STAT";
  notes: string;
  prescriberName: string;
  prescriberLicense: string;
  prescriberContact: string;
  items: CreateOrderLineItem[];
  authority?: OrderAuthorityPayloadFields;
  safetyAcknowledgedMedicationAllergies?: boolean;
  facilityTimeZone?: string | null;
  enterpriseOrderSetProvenance?: OrderCreateDto["enterpriseOrderSetProvenance"];
}): OrderCreateDto {
  const {
    type,
    priority,
    notes,
    prescriberName,
    prescriberLicense,
    prescriberContact,
    items,
    authority,
    safetyAcknowledgedMedicationAllergies,
    facilityTimeZone,
    enterpriseOrderSetProvenance,
  } = input;

  const rootNotes = notes.trim() || undefined;
  const provenanceField = enterpriseOrderSetProvenance ? { enterpriseOrderSetProvenance } : {};
  const authorityFields = {
    ...(authority?.orderSource ? { orderSource: authority.orderSource } : {}),
    ...(authority?.readbackConfirmed != null ? { readbackConfirmed: authority.readbackConfirmed } : {}),
    ...(authority?.protocolName?.trim() ? { protocolName: authority.protocolName.trim() } : {}),
  };

  if (type === "LAB") {
    return {
      type: "LAB",
      priority,
      notes: rootNotes,
      ...provenanceField,
      items: items.map((line) => buildLabOrderItemDto(line)),
    };
  }

  if (type === "IMAGING") {
    return {
      type: "IMAGING",
      priority,
      notes: rootNotes,
      ...provenanceField,
      items: items.map((line) => buildImagingOrderItemDto(line)),
    };
  }

  if (type === "CARE") {
    return {
      type: "CARE",
      priority,
      notes: rootNotes,
      ...provenanceField,
      ...(prescriberName.trim() ? { prescriberName: prescriberName.trim() } : {}),
      ...(prescriberLicense.trim() ? { prescriberLicense: prescriberLicense.trim() } : {}),
      ...(prescriberContact.trim() ? { prescriberContact: prescriberContact.trim() } : {}),
      ...authorityFields,
      items: items.map((line) => buildCareOrderItemDto(line)),
    };
  }

  return {
    type: "MEDICATION",
    priority,
    notes: rootNotes,
    ...provenanceField,
    prescriberName: prescriberName.trim(),
    prescriberLicense: prescriberLicense.trim() || undefined,
    prescriberContact: prescriberContact.trim() || undefined,
    ...authorityFields,
    ...(safetyAcknowledgedMedicationAllergies === true
      ? { safetyAcknowledgedMedicationAllergies: true }
      : {}),
    items: items.map((line) => {
      const resolvedFrequencyCode = resolveMedicationOrderItemFrequencyCode({
        directionsSig: line.notes?.trim(),
      });
      const intendedDate = resolveMedicationOrderItemIntendedUtcForSubmit({
        intendedAdministrationAtLocal: line.intendedAdministrationAt,
        plannedAdminAtTouched: line._plannedAdminAtTouched,
        frequencyCode: resolvedFrequencyCode,
        directionsSig: line.notes?.trim(),
        facilityTimeZone: resolveClinicalTimeZone({ facilityTimeZone }),
      });
      const frequencyField =
        resolvedFrequencyCode != null ? { frequencyCode: resolvedFrequencyCode } : {};
      const baseManual = {
        catalogItemId: null,
        catalogItemType: "MEDICATION" as const,
        manualLabel: (line.manualLabel ?? line._label).trim(),
        quantity: line.quantity!,
        notes: line.notes?.trim() || undefined,
        strength: line.strength?.trim() || undefined,
        route: line.route,
        refillCount: line.refillCount != null && line.refillCount >= 0 ? line.refillCount : undefined,
        medicationFulfillmentIntent: line.medicationFulfillmentIntent ?? "PHARMACY_DISPENSE",
        ...(intendedDate ? { intendedAdministrationAt: intendedDate } : {}),
        ...frequencyField,
      };
      const catalogItemId = line.catalogItemId?.trim();
      if (!line.isManual && isCatalogItemUuid(catalogItemId)) {
        return {
          catalogItemId,
          catalogItemType: "MEDICATION" as const,
          quantity: line.quantity!,
          notes: line.notes?.trim() || undefined,
          strength: line.strength?.trim() || undefined,
          route: line.route,
          refillCount: line.refillCount != null && line.refillCount >= 0 ? line.refillCount : undefined,
          medicationFulfillmentIntent: line.medicationFulfillmentIntent ?? "PHARMACY_DISPENSE",
          ...(intendedDate ? { intendedAdministrationAt: intendedDate } : {}),
          ...frequencyField,
        };
      }
      return baseManual;
    }),
  };
}
