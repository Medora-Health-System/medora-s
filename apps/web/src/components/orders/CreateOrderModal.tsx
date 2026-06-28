"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { apiFetch, asApiObject, parseApiResponse } from "@/lib/apiClient";
import { isEncounterMustBeOpenForOrderError, normalizeUserFacingError } from "@/lib/userFacingError";
import type { OrderCreateDto, OrderSource } from "@medora/shared";
import {
  computeAdvancedMedicationSafetyWarnings,
  filterEnterpriseProcedures,
  getEncounterAllergyDocumentationSummary,
  normalizeMedicationRoute,
  resolveEnterpriseProcedureDisplayName,
  resolveMedicationOrderItemFrequencyCode,
  enterpriseProcedureCategoryLabel,
  mapEnterpriseCategoryToCanonicalCareCategory,
  type EnterpriseProcedureDefinition,
  type EnterpriseProcedureCategory,
} from "@medora/shared";
import { SharedCatalogAutocomplete } from "@/components/catalog/SharedCatalogAutocomplete";
import { printRx } from "@/components/pharmacy/RxPrintLayout";
import { searchCatalog, searchProcedureCatalog } from "@/lib/catalogSearchApi";
import type { CatalogSearchItem, CatalogType } from "@/lib/catalogSearchTypes";
import {
  CANONICAL_CARE_PROCEDURE_CATEGORIES,
  canonicalCareProcedureCategoryLabel,
  type CanonicalCareProcedureCategory,
} from "@medora/shared";
import { catalogSearchItemFullDisplayLine } from "@/lib/catalogDisplayLabel";
import { fetchProviderDirectory, type ProviderDirectoryItem } from "@/lib/ordersApi";
import { OrderPriorityField } from "./createOrderModal/OrderPriorityField";
import { SelectedLabItems } from "./createOrderModal/SelectedLabItems";
import { SelectedImagingItems } from "./createOrderModal/SelectedImagingItems";
import { SelectedMedicationItems } from "./createOrderModal/SelectedMedicationItems";
import { ManualOrderEntry } from "./createOrderModal/ManualOrderEntry";
import type { CreateOrderLineItem, CreateOrderModalTab, MedicationRoute, OrderModalTab } from "./createOrderModal/types";
import { newOrderLineId } from "./createOrderModal/types";
import {
  applyDefaultPlannedAdministrationIfNeeded,
  prepareMedicationOrderLinePlannedAdmin,
  refreshUntouchedPlannedAdministrationLocal,
  patchMedicationLineWithPlannedAdminRules,
  isAdministerToPatientIntent,
  resolveMedicationOrderItemIntendedUtcForSubmit,
  stripMedicationFromOrderDraftPayload,
} from "./createOrderModal/createOrderMedicationDraft";
import { resolveClinicalTimeZone } from "@/lib/clinicalTimeDisplay";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import type { SupportedLanguage } from "@/i18n/config";
import { buildActiveCatalogDedupKeySetFromOrders } from "@/lib/encounterClinicalSafetyUi";
import {
  createOrderLineToAdvancedMedicationSafetyLine,
  encounterOrdersToAdvancedMedicationSafetyLines,
} from "@/lib/advancedMedicationSafetyLineMappers";
import { AdvancedMedicationSafetyPanel } from "@/components/medication/AdvancedMedicationSafetyPanel";
import { ClinicalLatestVitalsBanner } from "@/components/clinical/ClinicalLatestVitalsBanner";
import { MedicationAllergyOrderingBanner } from "@/components/mar/MedicationAllergyOrderingBanner";
import {
  buildClinicalDraftKey,
  clinicalDraftPayloadSignature,
  createClinicalDraft,
  readClinicalDraft,
  removeClinicalDraft,
  shouldRestoreClinicalDraft,
  writeClinicalDraft,
  type ClinicalDraftScope,
} from "@/lib/clinicalDraftStorage";
import { useClinicalBeforeUnloadWarning } from "@/lib/useClinicalBeforeUnloadWarning";

type OrderSetKey = "chestPain" | "abdominalPain" | "sepsis" | "trauma" | "respiratoryDistress";
type OrderSetItemType = "LAB" | "IMAGING" | "MEDICATION" | "CARE";
type OrderTypeKey = OrderModalTab;
type OrderSetItem = {
  key: string;
  type: OrderSetItemType;
  catalogType?: CatalogType;
  catalogCode?: string;
  catalogCodes?: string[];
  fallbackSearchQuery?: string;
  comingSoon?: boolean;
};
type OrderSetSkippedReason = "noMatch" | "ambiguous" | "nonPrescriber";
type OrderSetSkippedItem = { key: string; reason: OrderSetSkippedReason };
type ResolvedOrderSetItems = Record<OrderTypeKey, CreateOrderLineItem[]> & {
  skipped: OrderSetSkippedItem[];
};
type OrderAuthorityFormSource = OrderSource | "";
type OrderAuthorityPayloadFields = {
  orderSource?: OrderSource;
  readbackConfirmed?: boolean;
  protocolName?: string;
};
type MedicationOrderMode = "DEFAULT" | "ER_ADMINISTER_ONLY";
const ORDER_DRAFT_VERSION = "orders-drafting-v1";
const UNKNOWN_CLINICAL_DRAFT_USER_ID = "unknown-user";

type CreateOrderDraftPayload = {
  activeTab: CreateOrderModalTab;
  selectedOrderSet: OrderSetKey;
  selectedOrderSetItemKeys: string[];
  orderSetReviewActive: boolean;
  stagedItems: Record<OrderTypeKey, CreateOrderLineItem[]>;
  formData: {
    type: OrderTypeKey;
    priority: "ROUTINE" | "URGENT" | "STAT";
    notes: string;
    prescriberName: string;
    prescriberLicense: string;
    prescriberContact: string;
    orderSource: OrderAuthorityFormSource;
    readbackConfirmed: boolean;
    protocolName: string;
    items: CreateOrderLineItem[];
  };
};

function createOrderDraftSignature(payload: CreateOrderDraftPayload): string {
  return clinicalDraftPayloadSignature(payload);
}

function createOrderDraftHasContent(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Partial<CreateOrderDraftPayload>;
  const staged = p.stagedItems ?? {};
  const stagedHasItems = Object.values(staged).some((items) => Array.isArray(items) && items.length > 0);
  const form = p.formData;
  return Boolean(
    stagedHasItems ||
      (Array.isArray(form?.items) && form.items.length > 0) ||
      form?.notes?.trim() ||
      form?.prescriberName?.trim() ||
      form?.prescriberLicense?.trim() ||
      form?.prescriberContact?.trim() ||
      form?.protocolName?.trim() ||
      form?.readbackConfirmed ||
      p.orderSetReviewActive
  );
}

const ORDER_TYPE_REVIEW_ORDER: OrderTypeKey[] = ["LAB", "IMAGING", "MEDICATION", "CARE"];

const ORDER_SET_KEYS: OrderSetKey[] = [
  "chestPain",
  "abdominalPain",
  "sepsis",
  "trauma",
  "respiratoryDistress",
];

const ORDER_TYPE_REVIEW_ICON: Record<OrderTypeKey, string> = {
  LAB: "🧪",
  IMAGING: "🖼",
  MEDICATION: "💊",
  CARE: "🏥",
};

const ORDER_SET_ITEMS: Record<OrderSetKey, OrderSetItem[]> = {
  chestPain: [
    { key: "cbc", type: "LAB", catalogType: "LAB_TEST", catalogCode: "CBC", catalogCodes: ["ER_CBC"] },
    { key: "cmp", type: "LAB", catalogType: "LAB_TEST", catalogCode: "CMP", catalogCodes: ["ER_CMP"] },
    { key: "troponin", type: "LAB", catalogType: "LAB_TEST", catalogCode: "TROPONIN", catalogCodes: ["TROP", "ER_TROP"] },
    { key: "chestXray", type: "IMAGING", catalogType: "IMAGING_STUDY", catalogCode: "XR_CHEST" },
  ],
  abdominalPain: [
    { key: "cbc", type: "LAB", catalogType: "LAB_TEST", catalogCode: "CBC", catalogCodes: ["ER_CBC"] },
    { key: "cmp", type: "LAB", catalogType: "LAB_TEST", catalogCode: "CMP", catalogCodes: ["ER_CMP"] },
    { key: "lipase", type: "LAB", catalogType: "LAB_TEST", catalogCode: "LIPASE", catalogCodes: ["ER_LIP"] },
    { key: "urinalysis", type: "LAB", catalogType: "LAB_TEST", catalogCode: "UA", catalogCodes: ["ER_UA"] },
    {
      key: "ctAbdomenPelvis",
      type: "IMAGING",
      catalogType: "IMAGING_STUDY",
      catalogCode: "CT_ABDOMEN_PELVIS",
      catalogCodes: ["CT_ABD"],
    },
  ],
  sepsis: [
    { key: "cbc", type: "LAB", catalogType: "LAB_TEST", catalogCode: "CBC", catalogCodes: ["ER_CBC"] },
    { key: "cmp", type: "LAB", catalogType: "LAB_TEST", catalogCode: "CMP", catalogCodes: ["ER_CMP"] },
    { key: "lactate", type: "LAB", catalogType: "LAB_TEST", catalogCode: "LACTATE", catalogCodes: ["ER_LAC"] },
    { key: "bloodCulture", type: "LAB", catalogType: "LAB_TEST", catalogCode: "BLOOD_CULTURE", catalogCodes: ["ER_BC"] },
    { key: "chestXray", type: "IMAGING", catalogType: "IMAGING_STUDY", catalogCode: "XR_CHEST" },
  ],
  trauma: [
    { key: "cbc", type: "LAB", catalogType: "LAB_TEST", catalogCode: "CBC", catalogCodes: ["ER_CBC"] },
    { key: "typeScreen", type: "LAB", catalogType: "LAB_TEST", catalogCode: "TYPE_SCREEN", catalogCodes: ["ER_BLOOD_TYPE"] },
    {
      key: "ctHead",
      type: "IMAGING",
      catalogType: "IMAGING_STUDY",
      catalogCode: "CT_HEAD_WO_CONTRAST",
      catalogCodes: ["CT_HEAD"],
    },
    { key: "ctCervicalSpine", type: "IMAGING", catalogType: "IMAGING_STUDY", catalogCode: "CT_CERVICAL_SPINE" },
    { key: "chestXray", type: "IMAGING", catalogType: "IMAGING_STUDY", catalogCode: "XR_CHEST" },
  ],
  respiratoryDistress: [
    { key: "cbc", type: "LAB", catalogType: "LAB_TEST", catalogCode: "CBC", catalogCodes: ["ER_CBC"] },
    { key: "bmp", type: "LAB", catalogType: "LAB_TEST", catalogCode: "BMP", catalogCodes: ["ER_BMP"] },
    { key: "bnp", type: "LAB", catalogType: "LAB_TEST", catalogCode: "BNP", catalogCodes: ["ER_BNP"] },
    { key: "chestXray", type: "IMAGING", catalogType: "IMAGING_STUDY", catalogCode: "XR_CHEST" },
    { key: "covid", type: "LAB", catalogType: "LAB_TEST", catalogCode: "COVID", catalogCodes: ["ER_COVID"] },
    { key: "influenzaAb", type: "LAB", catalogType: "LAB_TEST", catalogCode: "INFLUENZA_AB", catalogCodes: ["ER_FLU"] },
    { key: "rsv", type: "LAB", catalogType: "LAB_TEST", catalogCode: "RSV", catalogCodes: ["ER_RSV"] },
  ],
};

function careLabelNorm(label: string): string {
  return label.trim().toLowerCase();
}

function careLabelExistsInItems(items: CreateOrderLineItem[], label: string): boolean {
  const n = careLabelNorm(label);
  return items.some((i) => careLabelNorm(i.manualLabel ?? i._label ?? "") === n);
}

type CareProcedurePickerRow = {
  code: string;
  displayNameEn: string;
  displayNameFr: string;
  categoryLabelEn: string;
  categoryLabelFr: string;
};

function checkedOrderSetItemKeys(orderSet: OrderSetKey): string[] {
  return ORDER_SET_ITEMS[orderSet].map((item) => item.key);
}

function isOrderTypeKey(tab: CreateOrderModalTab): tab is OrderTypeKey {
  return tab !== "ORDER_SET";
}

function emptyResolvedOrderSetItems(): ResolvedOrderSetItems {
  return {
    LAB: [],
    IMAGING: [],
    MEDICATION: [],
    CARE: [],
    skipped: [],
  };
}

function mapOrderCreateError(
  err: unknown,
  t: (k: string) => string,
  language: SupportedLanguage
): string {
  const msg = err instanceof Error ? err.message : "";
  return normalizeUserFacingError(msg.trim() || null, language) || t("createOrderModal.mapOrderCreateError");
}

function catalogLineLabel(
  item: CatalogSearchItem,
  language: SupportedLanguage,
  t: (key: string) => string
): string {
  return catalogSearchItemFullDisplayLine(item, language, t);
}

function isApprovedCatalogMatch(item: CatalogSearchItem, catalogType: CatalogType, approvedCodes: Set<string>): boolean {
  return item.type === catalogType && approvedCodes.has(item.code.toUpperCase());
}

function catalogItemToOrderLine(
  item: CatalogSearchItem,
  language: SupportedLanguage,
  t: (key: string) => string,
  medicationOrderMode: MedicationOrderMode = "DEFAULT",
  facilityTimeZone?: string | null
): CreateOrderLineItem | null {
  if (item.type === "LAB_TEST") {
    return {
      _lineId: newOrderLineId(),
      isManual: false,
      catalogItemId: item.id,
      catalogItemType: "LAB_TEST",
      _label: catalogLineLabel(item, language, t),
    };
  }

  if (item.type === "IMAGING_STUDY") {
    return {
      _lineId: newOrderLineId(),
      isManual: false,
      catalogItemId: item.id,
      catalogItemType: "IMAGING_STUDY",
      _label: catalogLineLabel(item, language, t),
      _modality: item.metadata?.modality,
      _bodyRegion: item.metadata?.bodyRegion,
    };
  }

  if (item.type === "MEDICATION") {
    const erAdministerOnly = medicationOrderMode === "ER_ADMINISTER_ONLY";
    return applyDefaultPlannedAdministrationIfNeeded({
      _lineId: newOrderLineId(),
      isManual: false,
      catalogItemId: item.id,
      catalogItemType: "MEDICATION",
      quantity: erAdministerOnly ? 1 : 30,
      notes: "",
      strength: item.metadata?.strength ?? undefined,
      route: normalizeMedicationRoute({
        route: item.metadata?.route,
        administrationType: item.metadata?.administrationType,
      }),
      _label: catalogLineLabel(item, language, t),
      _dosageForm: item.metadata?.dosageForm ?? undefined,
      _route: item.metadata?.route ?? undefined,
      _isControlled: item.metadata?.isControlled,
      _controlledSchedule: item.metadata?.controlledSchedule,
      _requiresWitness: item.metadata?.requiresWitness,
      _requiresDoubleSign: item.metadata?.requiresDoubleSign,
      refillCount: 0,
      medicationFulfillmentIntent: erAdministerOnly ? "ADMINISTER_CHART" : "PHARMACY_DISPENSE",
      _safetyCatalog: {
        code: item.code,
        name: item.name ?? null,
        displayName: item.displayNameEn?.trim() || item.displayNameFr?.trim() || item.name || null,
        genericName: item.metadata?.genericName,
        therapeuticClass: item.metadata?.therapeuticClass,
        commonAliases: item.metadata?.commonAliases,
      },
    }, facilityTimeZone);
  }

  return null;
}

function OrderSetPreview({
  selected,
  checkedItemKeys,
  onSelect,
  onToggleItem,
  onApply,
  canApply,
  applying,
  onOpenEkgDocumentation,
  t,
}: {
  selected: OrderSetKey;
  checkedItemKeys: string[];
  onSelect: (key: OrderSetKey) => void;
  onToggleItem: (itemKey: string) => void;
  onApply: () => void;
  canApply: boolean;
  applying: boolean;
  onOpenEkgDocumentation?: () => void;
  t: (key: string) => string;
}) {
  const items = ORDER_SET_ITEMS[selected];
  const checkedCount = checkedItemKeys.length;
  const totalCount = items.length;
  const checkedSet = new Set(checkedItemKeys);
  const selectedCountLabel = t("createOrderModal.orderSetsSelectedCount")
    .replace("{selected}", String(checkedCount))
    .replace("{total}", String(totalCount));
  const applyingBundleLabel = t("createOrderModal.orderSetsApplyingBundle").replace(
    "{bundle}",
    t(`createOrderModal.orderSets.${selected}.name`)
  );

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 8, textTransform: "uppercase" }}>
        {t("createOrderModal.orderSetsSectionTitle")}
      </div>
      <p style={{ margin: "0 0 10px", fontSize: 13, color: "#455a64", lineHeight: 1.4 }}>
        {t("createOrderModal.orderSetsIntro")}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(160px, 0.8fr) minmax(220px, 1fr)", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {ORDER_SET_KEYS.map((key) => {
            const active = key === selected;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelect(key)}
                style={{
                  padding: "9px 10px",
                  border: active ? "1px solid #1a1a1a" : "1px solid #d6d6d6",
                  borderRadius: 6,
                  background: active ? "#fff" : "#f8fafc",
                  color: "#1f2937",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 13,
                  fontWeight: active ? 700 : 600,
                }}
              >
                {t(`createOrderModal.orderSets.${key}.name`)}
              </button>
            );
          })}
        </div>
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            background: "#fff",
            padding: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              {t(`createOrderModal.orderSets.${selected}.name`)}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>{selectedCountLabel}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {items.map((item) => (
              <label
                key={item.key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "18px auto 1fr",
                  gap: 8,
                  alignItems: "center",
                  padding: "7px 8px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 6,
                  background: checkedSet.has(item.key) ? "#f8fafc" : "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "#334155",
                }}
              >
                <input
                  type="checkbox"
                  checked={checkedSet.has(item.key)}
                  onChange={() => onToggleItem(item.key)}
                  style={{ width: 14, height: 14, margin: 0 }}
                />
                <span
                  style={{
                    padding: "2px 6px",
                    borderRadius: 999,
                    background: item.type === "LAB" ? "#e3f2fd" : item.type === "IMAGING" ? "#e0f7fa" : "#f3e5f5",
                    color: item.type === "LAB" ? "#0d47a1" : item.type === "IMAGING" ? "#006064" : "#6a1b9a",
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: 0.3,
                  }}
                >
                  {t(`createOrderModal.orderSetType.${item.type}`)}
                </span>
                <span>
                  {t(`createOrderModal.orderSetItems.${item.key}`)}
                  {item.comingSoon ? (
                    <span style={{ marginLeft: 6, color: "#9a3412", fontSize: 12, fontWeight: 700 }}>
                      {t("createOrderModal.orderSetComingSoonBadge")}
                    </span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
          {selected === "chestPain" && onOpenEkgDocumentation ? (
            <div
              style={{
                marginBottom: 12,
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px dashed #93c5fd",
                background: "#f8fafc",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1e40af", marginBottom: 8 }}>
                {t("createOrderModal.orderSetEcgProcedureHint")}
              </div>
              <button
                type="button"
                onClick={onOpenEkgDocumentation}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: "1px solid #1d4ed8",
                  borderRadius: 6,
                  background: "#eff6ff",
                  color: "#1e3a8a",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {t("createOrderModal.orderSetDocumentEcgButton")}
              </button>
            </div>
          ) : null}
          {checkedCount === 0 ? (
            <p style={{ margin: "0 0 12px", color: "#b45309", fontSize: 12, fontWeight: 600 }}>
              {t("createOrderModal.orderSetsNoneSelectedWarning")}
            </p>
          ) : null}
          <div style={{ margin: "0 0 8px", color: "#0f172a", fontSize: 12, fontWeight: 700 }}>
            {applyingBundleLabel}
          </div>
          <button
            type="button"
            disabled={!canApply || applying}
            onClick={onApply}
            title={!canApply ? t("createOrderModal.orderSetsApplyDisabledHelp") : undefined}
            style={{
              width: "100%",
              padding: "9px 12px",
              border: canApply ? "1px solid #1a1a1a" : "1px solid #cbd5e1",
              borderRadius: 6,
              background: canApply ? "#1a1a1a" : "#eef2f7",
              color: canApply ? "#fff" : "#64748b",
              cursor: canApply && !applying ? "pointer" : "not-allowed",
              fontSize: 13,
              fontWeight: 700,
              opacity: applying ? 0.7 : 1,
            }}
          >
            {applying ? t("createOrderModal.orderSetsApplying") : t("createOrderModal.orderSetsApply")}
          </button>
        </div>
      </div>
    </div>
  );
}

function buildPayload(
  type: OrderModalTab,
  priority: "ROUTINE" | "URGENT" | "STAT",
  notes: string,
  prescriberName: string,
  prescriberLicense: string,
  prescriberContact: string,
  items: CreateOrderLineItem[],
  authority?: OrderAuthorityPayloadFields,
  safetyAcknowledgedMedicationAllergies?: boolean,
  facilityTimeZone?: string | null
): OrderCreateDto {
  const rootNotes = notes.trim() || undefined;
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
      items: items.map((it) =>
        it.isManual || !it.catalogItemId
          ? {
              catalogItemId: null,
              catalogItemType: "LAB_TEST" as const,
              manualLabel: (it.manualLabel ?? it._label).trim(),
              notes: it.notes?.trim() || undefined,
            }
          : {
              catalogItemId: it.catalogItemId,
              catalogItemType: "LAB_TEST" as const,
              ...(it._label?.trim() ? { displayLabelFr: it._label.trim() } : {}),
            }
      ),
    };
  }

  if (type === "IMAGING") {
    return {
      type: "IMAGING",
      priority,
      notes: rootNotes,
      items: items.map((it) =>
        it.isManual || !it.catalogItemId
          ? {
              catalogItemId: null,
              catalogItemType: "IMAGING_STUDY" as const,
              manualLabel: (it.manualLabel ?? it._label).trim(),
              manualSecondaryText: it.manualSecondaryText?.trim() || undefined,
              notes: it.notes?.trim() || undefined,
            }
          : {
              catalogItemId: it.catalogItemId,
              catalogItemType: "IMAGING_STUDY" as const,
              ...(it._label?.trim() ? { displayLabelFr: it._label.trim() } : {}),
            }
      ),
    };
  }

  if (type === "CARE") {
    return {
      type: "CARE",
      priority,
      notes: rootNotes,
      ...(prescriberName.trim() ? { prescriberName: prescriberName.trim() } : {}),
      ...(prescriberLicense.trim() ? { prescriberLicense: prescriberLicense.trim() } : {}),
      ...(prescriberContact.trim() ? { prescriberContact: prescriberContact.trim() } : {}),
      ...authorityFields,
      items: items.map((it) => ({
        catalogItemId: null,
        catalogItemType: "CARE" as const,
        manualLabel: (it.manualLabel ?? it._label).trim(),
        ...((): { enterpriseProcedureId?: string } => {
          const explicit = it._enterpriseProcedureId?.trim();
          if (explicit) return { enterpriseProcedureId: explicit };
          const fromQuickKey =
            it._careQuickKey === "ekg_workflow"
              ? "ekg_ecg"
              : it._careQuickKey === "laceration_kit"
                ? "laceration_repair"
                : null;
          return fromQuickKey ? { enterpriseProcedureId: fromQuickKey } : {};
        })(),
        notes: it.notes?.trim() || undefined,
      })),
    };
  }

  return {
    type: "MEDICATION",
    priority,
    notes: rootNotes,
    prescriberName: prescriberName.trim(),
    prescriberLicense: prescriberLicense.trim() || undefined,
    prescriberContact: prescriberContact.trim() || undefined,
    ...authorityFields,
    ...(safetyAcknowledgedMedicationAllergies === true
      ? { safetyAcknowledgedMedicationAllergies: true }
      : {}),
    items: items.map((it) => {
      const resolvedFrequencyCode = resolveMedicationOrderItemFrequencyCode({
        directionsSig: it.notes?.trim(),
      });
      const intendedDate = resolveMedicationOrderItemIntendedUtcForSubmit({
        intendedAdministrationAtLocal: it.intendedAdministrationAt,
        plannedAdminAtTouched: it._plannedAdminAtTouched,
        frequencyCode: resolvedFrequencyCode,
        directionsSig: it.notes?.trim(),
        facilityTimeZone: resolveClinicalTimeZone({ facilityTimeZone }),
      });
      const frequencyField =
        resolvedFrequencyCode != null ? { frequencyCode: resolvedFrequencyCode } : {};
      const baseManual = {
        catalogItemId: null,
        catalogItemType: "MEDICATION" as const,
        manualLabel: (it.manualLabel ?? it._label).trim(),
        quantity: it.quantity!,
        notes: it.notes?.trim() || undefined,
        strength: it.strength?.trim() || undefined,
        route: it.route,
        refillCount: it.refillCount != null && it.refillCount >= 0 ? it.refillCount : undefined,
        medicationFulfillmentIntent: it.medicationFulfillmentIntent ?? "PHARMACY_DISPENSE",
        ...(intendedDate ? { intendedAdministrationAt: intendedDate } : {}),
        ...frequencyField,
      };
      const baseCatalog = {
        catalogItemId: it.catalogItemId!,
        catalogItemType: "MEDICATION" as const,
        quantity: it.quantity!,
        notes: it.notes?.trim() || undefined,
        strength: it.strength?.trim() || undefined,
        route: it.route,
        refillCount: it.refillCount != null && it.refillCount >= 0 ? it.refillCount : undefined,
        medicationFulfillmentIntent: it.medicationFulfillmentIntent ?? "PHARMACY_DISPENSE",
        ...(intendedDate ? { intendedAdministrationAt: intendedDate } : {}),
        ...frequencyField,
      };
      return it.isManual || !it.catalogItemId ? baseManual : baseCatalog;
    }),
  };
}

export function CreateOrderModal({
  encounterId,
  facilityId,
  canPrescribe,
  canUseRnOrderAuthority = false,
  encounter,
  initialOrderTab = "LAB",
  onClose,
  onSuccess,
  /** Après constat serveur « consultation fermée », re-synchronise l’état parent (évite badge Ouverte obsolète). */
  onRefetchEncounter,
  /** Si onglet initial CARE : préremplit une ligne manuelle (ex. action rapide). */
  initialCareManualLabel,
  medicationOrderMode = "DEFAULT",
  /** When true, show RN-specific copy if medication/care tabs are hidden. */
  isRn = false,
  /** Opens structured ECG/EKG procedure documentation (no CARE order line). */
  onOpenEkgProcedureDocumentation,
}: {
  encounterId: string;
  facilityId: string;
  canPrescribe: boolean;
  canUseRnOrderAuthority?: boolean;
  isRn?: boolean;
  encounter?: {
    id?: string;
    status?: string | null;
    patient?: { firstName?: string; lastName?: string; mrn?: string };
    vitals?: unknown;
    nursingAssessment?: unknown;
    triage?: { vitalsJson?: unknown } | null;
  };
  initialOrderTab?: OrderModalTab;
  initialCareManualLabel?: string | null;
  medicationOrderMode?: MedicationOrderMode;
  onClose: () => void;
  onSuccess: () => void;
  onRefetchEncounter?: () => Promise<void>;
  onOpenEkgProcedureDocumentation?: () => void;
}) {
  const { language, t } = useI18n();
  const { facilityTimeZone, facilityClinicalTimeZoneReady } = useFacilityAndRoles();
  const plannedAdminFacilityTimeZone = facilityClinicalTimeZoneReady ? facilityTimeZone : null;
  const [carePickerQuery, setCarePickerQuery] = useState("");
  const [careCategoryFilter, setCareCategoryFilter] = useState<"" | CanonicalCareProcedureCategory>("");
  const [careApiMatches, setCareApiMatches] = useState<CareProcedurePickerRow[]>([]);
  const [careApiSearchLoading, setCareApiSearchLoading] = useState(false);
  const carePresets = useMemo(() => t("createOrderModal.carePresets").split("\n").filter(Boolean), [t]);
  const careOfflineMatches = useMemo(() => {
    const q = carePickerQuery.trim();
    if (q.length < 2) return [];
    const locale = language === "fr" ? "fr" : "en";
    return filterEnterpriseProcedures(q, locale)
      .filter((procedure) => {
        if (!careCategoryFilter) return true;
        const canonicalCategory = mapEnterpriseCategoryToCanonicalCareCategory(procedure.category);
        return canonicalCategory === careCategoryFilter;
      })
      .map((procedure) => ({
        code: procedure.id,
        displayNameEn: procedure.displayNameEn,
        displayNameFr: procedure.displayNameFr,
        categoryLabelEn: enterpriseProcedureCategoryLabel(procedure.category, "en"),
        categoryLabelFr: enterpriseProcedureCategoryLabel(procedure.category, "fr"),
      }));
  }, [carePickerQuery, language, careCategoryFilter]);
  const careCatalogMatches = useMemo(() => {
    if (careApiMatches.length > 0) return careApiMatches;
    if (careApiSearchLoading) return [];
    return careOfflineMatches;
  }, [careApiMatches, careApiSearchLoading, careOfflineMatches]);
  const canUseMedicationCareTabs = canPrescribe || canUseRnOrderAuthority;
  const careSearchActive =
    carePickerQuery.trim().length >= 2 || Boolean(careCategoryFilter);
  const erAdministerOnlyMedication = medicationOrderMode === "ER_ADMINISTER_ONLY";
  const firstTab: OrderModalTab =
    !canUseMedicationCareTabs && (initialOrderTab === "MEDICATION" || initialOrderTab === "CARE")
      ? "LAB"
      : initialOrderTab;

  const initialOrderItems = useMemo<CreateOrderLineItem[]>(() => {
    if (firstTab !== "CARE" || !initialCareManualLabel?.trim()) return [];
    const label = initialCareManualLabel.trim();
    return [
      {
        _lineId: newOrderLineId(),
        isManual: true,
        catalogItemType: "CARE",
        manualLabel: label,
        _label: label,
      },
    ];
  }, [firstTab, initialCareManualLabel]);

  const [activeTab, setActiveTab] = useState<CreateOrderModalTab>(firstTab);
  const [rxSuccess, setRxSuccess] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [selectedOrderSet, setSelectedOrderSet] = useState<OrderSetKey>("chestPain");
  const [selectedOrderSetItemKeys, setSelectedOrderSetItemKeys] = useState<string[]>(() =>
    checkedOrderSetItemKeys("chestPain")
  );
  const [orderSetApplying, setOrderSetApplying] = useState(false);
  const [orderSetWarning, setOrderSetWarning] = useState<{ count: number } | null>(null);
  const [orderSetReviewActive, setOrderSetReviewActive] = useState(false);
  const [nextStagedTabAfterSuccess, setNextStagedTabAfterSuccess] = useState<OrderTypeKey | null>(null);
  const [submittedOrderType, setSubmittedOrderType] = useState<OrderTypeKey | null>(null);
  const [createdOrder, setCreatedOrder] = useState<{
    id: string;
    createdAt: string;
    prescriberName?: string;
    prescriberLicense?: string;
    prescriberContact?: string;
    authority?: unknown;
    createdByDisplay?: unknown;
    lastActionDisplay?: unknown;
  } | null>(null);
  /** After multi-domain submit, RX success UI uses these lines instead of `formData.items` (active tab may differ). */
  const [rxIntentDisplayItems, setRxIntentDisplayItems] = useState<CreateOrderLineItem[] | null>(null);
  const [bulkCreateProgress, setBulkCreateProgress] = useState<string | null>(null);
  const [lastBatchAllStagedSuccess, setLastBatchAllStagedSuccess] = useState(false);
  const [stagedItems, setStagedItems] = useState<Record<OrderTypeKey, CreateOrderLineItem[]>>(() => ({
    LAB: [],
    IMAGING: [],
    MEDICATION: [],
    CARE: firstTab === "CARE" ? initialOrderItems : [],
  }));

  const [formData, setFormData] = useState({
    type: firstTab,
    priority: "ROUTINE" as "ROUTINE" | "URGENT" | "STAT",
    notes: "",
    prescriberName: "",
    prescriberLicense: "",
    prescriberContact: "",
    orderSource: (canPrescribe ? "PROVIDER_ORDER" : "") as OrderAuthorityFormSource,
    readbackConfirmed: false,
    protocolName: "",
    items: initialOrderItems,
  });

  const careHasEkgWorkflowLine = formData.items.some((i) => i._careQuickKey === "ekg_workflow");
  const careHasLacerationKitLine = formData.items.some((i) => i._careQuickKey === "laceration_kit");

  const orderTypes: CreateOrderModalTab[] = canUseMedicationCareTabs
    ? ["ORDER_SET", "LAB", "IMAGING", "MEDICATION", "CARE"]
    : ["ORDER_SET", "LAB", "IMAGING"];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queuedSync, setQueuedSync] = useState(false);
  const [providerDirectory, setProviderDirectory] = useState<ProviderDirectoryItem[]>([]);
  const [providerDirectoryLoaded, setProviderDirectoryLoaded] = useState(false);
  const [providerDirectoryFailed, setProviderDirectoryFailed] = useState(false);
  const [ivRouteConfirmations, setIvRouteConfirmations] = useState<Record<string, boolean>>({});
  const [erQuantityConfirmations, setErQuantityConfirmations] = useState<Record<string, boolean>>({});
  const [medicationAllergyDocSummary, setMedicationAllergyDocSummary] = useState<string | null>(null);
  const [medicationAllergySafetyAck, setMedicationAllergySafetyAck] = useState(false);
  const [activeCatalogKeys, setActiveCatalogKeys] = useState<Set<string>>(() => new Set());
  const [encounterOrdersSnapshot, setEncounterOrdersSnapshot] = useState<unknown[]>([]);
  const [customCareTaskDraft, setCustomCareTaskDraft] = useState("");
  const [careDuplicateHint, setCareDuplicateHint] = useState<string | null>(null);
  const [draftRestoredAt, setDraftRestoredAt] = useState<string | null>(null);
  const [draftSavedLocallyAt, setDraftSavedLocallyAt] = useState<string | null>(null);
  const prescriberPrefilled = useRef(false);
  const lastAppliedFacilityTzRef = useRef<string | null>(null);

  useEffect(() => {
    const q = carePickerQuery.trim();
    if (q.length < 2 && !careCategoryFilter) {
      setCareApiMatches([]);
      setCareApiSearchLoading(false);
      return;
    }
    let cancelled = false;
    setCareApiSearchLoading(true);
    void searchProcedureCatalog(facilityId, {
      q: q.length >= 2 ? q : "",
      limit: 25,
      ...(careCategoryFilter ? { category: careCategoryFilter } : {}),
    })
      .then((items) => {
        if (cancelled) return;
        setCareApiMatches(
          items.map((item) => ({
            code: item.code,
            displayNameEn: item.displayNameEn ?? item.name ?? item.code,
            displayNameFr: item.displayNameFr ?? item.displayNameEn ?? item.name ?? item.code,
            categoryLabelEn: item.metadata?.categoryLabelEn ?? item.metadata?.category ?? "",
            categoryLabelFr: item.metadata?.categoryLabelFr ?? item.metadata?.category ?? "",
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setCareApiMatches([]);
      })
      .finally(() => {
        if (!cancelled) setCareApiSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [carePickerQuery, careCategoryFilter, facilityId]);

  /** Re-default untouched planned administration when facility TZ loads (K.10B.3 / K.10B.4). */
  useEffect(() => {
    const tz = facilityTimeZone?.trim();
    if (!facilityClinicalTimeZoneReady || !tz || lastAppliedFacilityTzRef.current === tz) return;
    lastAppliedFacilityTzRef.current = tz;
    setFormData((fd) => ({
      ...fd,
      items: fd.items.map((it) =>
        it.catalogItemType === "MEDICATION" ? refreshUntouchedPlannedAdministrationLocal(it, tz) : it
      ),
    }));
    setStagedItems((current) => ({
      ...current,
      MEDICATION: current.MEDICATION.map((it) => refreshUntouchedPlannedAdministrationLocal(it, tz)),
    }));
  }, [facilityTimeZone, facilityClinicalTimeZoneReady]);

  const draftScope = useMemo<ClinicalDraftScope>(
    () => ({
      workflowType: "ORDERS_DRAFTING",
      encounterId,
      facilityId,
      userId: UNKNOWN_CLINICAL_DRAFT_USER_ID,
      version: ORDER_DRAFT_VERSION,
    }),
    [encounterId, facilityId]
  );
  const draftKey = useMemo(() => buildClinicalDraftKey(draftScope), [draftScope]);
  const draftPayload = useMemo<CreateOrderDraftPayload>(
    () => ({
      activeTab,
      selectedOrderSet,
      selectedOrderSetItemKeys,
      orderSetReviewActive,
      stagedItems,
      formData,
    }),
    [activeTab, formData, orderSetReviewActive, selectedOrderSet, selectedOrderSetItemKeys, stagedItems]
  );
  const initialDraftPayload = useMemo<CreateOrderDraftPayload>(
    () => ({
      activeTab: firstTab,
      selectedOrderSet: "chestPain",
      selectedOrderSetItemKeys: checkedOrderSetItemKeys("chestPain"),
      orderSetReviewActive: false,
      stagedItems: {
        LAB: [],
        IMAGING: [],
        MEDICATION: [],
        CARE: firstTab === "CARE" ? initialOrderItems : [],
      },
      formData: {
        type: firstTab,
        priority: "ROUTINE",
        notes: "",
        prescriberName: "",
        prescriberLicense: "",
        prescriberContact: "",
        orderSource: canPrescribe ? "PROVIDER_ORDER" : "",
        readbackConfirmed: false,
        protocolName: "",
        items: initialOrderItems,
      },
    }),
    [canPrescribe, firstTab, initialOrderItems]
  );
  const draftDirty = createOrderDraftSignature(draftPayload) !== createOrderDraftSignature(initialDraftPayload);
  const workflowEditable = encounter?.status == null || encounter.status === "OPEN";

  /** Préremplir le prescripteur pour le flux ordonnance (médecin / admin connecté). */
  useEffect(() => {
    let cancelled = false;
    void apiFetch(`/encounters/${encounterId}/orders`, { facilityId })
      .then((o) => {
        if (cancelled) return;
        const arr = Array.isArray(o) ? o : [];
        setActiveCatalogKeys(buildActiveCatalogDedupKeySetFromOrders(arr));
        setEncounterOrdersSnapshot(arr);
      })
      .catch(() => {
        if (!cancelled) {
          setActiveCatalogKeys(new Set());
          setEncounterOrdersSnapshot([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [encounterId, facilityId]);

  useEffect(() => {
    if (!canPrescribe || prescriberPrefilled.current) return;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? parseApiResponse(r) : Promise.resolve(null)))
      .then((me) => {
        const m = me && typeof me === "object" && !Array.isArray(me) ? (me as { fullName?: string }) : null;
        const name = typeof m?.fullName === "string" ? m.fullName.trim() : "";
        if (!name) return;
        prescriberPrefilled.current = true;
        setFormData((fd) => ({
          ...fd,
          prescriberName: fd.prescriberName.trim() ? fd.prescriberName : name,
        }));
      })
      .catch(() => {});
  }, [canPrescribe]);

  const currentStagedItems = isOrderTypeKey(activeTab)
    ? { ...stagedItems, [activeTab]: formData.items }
    : stagedItems;
  const stagedCounts = {
    LAB: currentStagedItems.LAB.length,
    IMAGING: currentStagedItems.IMAGING.length,
    MEDICATION: currentStagedItems.MEDICATION.length,
    CARE: currentStagedItems.CARE.length,
  };
  const hasStagedOrderSetItems = ORDER_TYPE_REVIEW_ORDER.some((tab) => stagedCounts[tab] > 0);
  const nextReviewTab =
    orderSetReviewActive && hasStagedOrderSetItems
      ? (ORDER_TYPE_REVIEW_ORDER.find((tab) => stagedCounts[tab] > 0) ?? null)
      : null;
  const domainLabel = (tab: OrderTypeKey): string =>
    tab === "LAB"
      ? t("encounterChrome.chartTabs.orderTypeLAB")
      : tab === "IMAGING"
        ? t("encounterChrome.chartTabs.orderTypeIMAGING")
        : tab === "MEDICATION"
          ? t("encounterChrome.chartTabs.orderTypeMEDICATION")
          : t("encounterChrome.chartTabs.orderTypeCARE");
  const tabLabel = (tab: CreateOrderModalTab): string => {
    const base =
      tab === "ORDER_SET"
        ? t("createOrderModal.tabOrderSets")
        : domainLabel(tab);
    return orderSetReviewActive && isOrderTypeKey(tab) ? `${base} (${stagedCounts[tab]})` : base;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const draft = readClinicalDraft<CreateOrderDraftPayload>(window.localStorage, draftKey);
    const canRestore = shouldRestoreClinicalDraft({
      draft,
      scope: draftScope,
      workflowEditable,
      encounterStatus: encounter?.status ?? null,
      hasPayloadContent: createOrderDraftHasContent,
    });
    if (canRestore && draft) {
      const restored = stripMedicationFromOrderDraftPayload(draft.payload);
      setActiveTab(restored.activeTab);
      setSelectedOrderSet(restored.selectedOrderSet);
      setSelectedOrderSetItemKeys(restored.selectedOrderSetItemKeys);
      setOrderSetReviewActive(restored.orderSetReviewActive);
      setStagedItems(restored.stagedItems);
      setFormData({ ...restored.formData, type: restored.formData.type });
      setDraftRestoredAt(draft.metadata.savedLocallyAt);
      setDraftSavedLocallyAt(draft.metadata.savedLocallyAt);
    } else if (draft && !canRestore) {
      removeClinicalDraft(window.localStorage, draftKey);
    }
    // Restore once on modal mount; subsequent state changes write new local drafts only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!workflowEditable) return;
    const persistPayload = stripMedicationFromOrderDraftPayload(draftPayload);
    const persistDirty =
      createOrderDraftSignature(persistPayload) !== createOrderDraftSignature(initialDraftPayload);
    if (!persistDirty || !createOrderDraftHasContent(persistPayload)) {
      if (typeof window !== "undefined") removeClinicalDraft(window.localStorage, draftKey);
      setDraftSavedLocallyAt(null);
      return;
    }
    if (typeof window === "undefined") return;
    const savedLocallyAt = new Date().toISOString();
    writeClinicalDraft(
      window.localStorage,
      draftKey,
      createClinicalDraft({
        scope: draftScope,
        payload: persistPayload,
        savedLocallyAt,
      })
    );
    setDraftSavedLocallyAt(savedLocallyAt);
  }, [draftDirty, draftKey, draftPayload, draftScope, initialDraftPayload, workflowEditable]);

  useClinicalBeforeUnloadWarning({
    dirty: draftDirty && Boolean(draftSavedLocallyAt),
    workflowEditable,
  });
  const orderSetReviewSections = ORDER_TYPE_REVIEW_ORDER.map((tab) => ({
    tab,
    icon: ORDER_TYPE_REVIEW_ICON[tab],
    label: domainLabel(tab),
    items: currentStagedItems[tab],
  })).filter((section) => section.items.length > 0);
  const stagedLineLabel = (item: CreateOrderLineItem): string =>
    item._label?.trim() || item.manualLabel?.trim() || t("common.dash");

  const stagedCatalogDuplicateActive = useMemo(() => {
    if (activeTab !== "LAB" && activeTab !== "IMAGING" && activeTab !== "MEDICATION") return false;
    for (const item of formData.items) {
      const cid = typeof item.catalogItemId === "string" ? item.catalogItemId.trim() : "";
      const ct = item.catalogItemType;
      if (!cid || !ct) continue;
      if (ct !== "LAB_TEST" && ct !== "IMAGING_STUDY" && ct !== "MEDICATION") continue;
      if (activeCatalogKeys.has(`${ct}:${cid}`)) return true;
    }
    return false;
  }, [activeTab, formData.items, activeCatalogKeys]);

  const advancedMedicationSafetyWarnings = useMemo(() => {
    if (activeTab !== "MEDICATION") return [];
    const stagedLines = formData.items
      .filter((i) => i.catalogItemType === "MEDICATION")
      .map(createOrderLineToAdvancedMedicationSafetyLine);
    const activeEncounterLines = encounterOrdersToAdvancedMedicationSafetyLines(encounterOrdersSnapshot);
    return computeAdvancedMedicationSafetyWarnings({ stagedLines, activeEncounterLines });
  }, [activeTab, formData.items, encounterOrdersSnapshot]);

  const orderingMedicationLabel = useMemo(() => {
    if (activeTab !== "MEDICATION") return null;
    for (const item of formData.items) {
      const label = (item.manualLabel ?? item._label)?.trim();
      if (label) return label;
    }
    return null;
  }, [activeTab, formData.items]);

  const changeTab = (tab: CreateOrderModalTab) => {
    const nextStagedItems = isOrderTypeKey(activeTab)
      ? { ...stagedItems, [activeTab]: formData.items }
      : stagedItems;

    setStagedItems(nextStagedItems);
    setActiveTab(tab);
    setFormData((fd) =>
      isOrderTypeKey(tab) ? { ...fd, type: tab, items: nextStagedItems[tab] } : { ...fd, items: [] }
    );
    setError(null);
  };

  const selectOrderSet = (key: OrderSetKey) => {
    setSelectedOrderSet(key);
    setSelectedOrderSetItemKeys(checkedOrderSetItemKeys(key));
    setError(null);
  };

  const toggleOrderSetItem = (itemKey: string) => {
    setSelectedOrderSetItemKeys((current) =>
      current.includes(itemKey) ? current.filter((key) => key !== itemKey) : [...current, itemKey]
    );
  };

  const selectedOrderSetItems = ORDER_SET_ITEMS[selectedOrderSet].filter((item) =>
    selectedOrderSetItemKeys.includes(item.key)
  );
  const canApplyOrderSet = selectedOrderSetItems.some((item) => !item.comingSoon);
  const isRnAuthorityTab =
    canUseRnOrderAuthority && (activeTab === "MEDICATION" || activeTab === "CARE");
  const rnAuthorityModeValid =
    (formData.orderSource === "VERBAL_ORDER" &&
      formData.prescriberName.trim().length > 0 &&
      formData.readbackConfirmed === true) ||
    (formData.orderSource === "NURSING_PROTOCOL" && formData.protocolName.trim().length > 0);
  const providerDirectoryDatalistId = `provider-directory-${encounterId}`;

  useEffect(() => {
    if (!isRnAuthorityTab || formData.orderSource !== "VERBAL_ORDER" || providerDirectoryLoaded) return;
    let cancelled = false;
    setProviderDirectoryFailed(false);
    fetchProviderDirectory(facilityId)
      .then((items) => {
        if (cancelled) return;
        setProviderDirectory(items);
        setProviderDirectoryLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setProviderDirectory([]);
        setProviderDirectoryLoaded(true);
        setProviderDirectoryFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [facilityId, formData.orderSource, isRnAuthorityTab, providerDirectoryLoaded]);

  useEffect(() => {
    const medStagedElsewhere = stagedItems.MEDICATION.length > 0;
    if ((!isOrderTypeKey(activeTab) || activeTab !== "MEDICATION") && !medStagedElsewhere) {
      setMedicationAllergyDocSummary(null);
      setMedicationAllergySafetyAck(false);
      return;
    }
    const fromProps = getEncounterAllergyDocumentationSummary({
      vitals: encounter?.vitals,
      nursingAssessment: encounter?.nursingAssessment,
      triageVitalsJson: encounter?.triage?.vitalsJson ?? null,
    });
    if (fromProps) {
      setMedicationAllergyDocSummary(fromProps);
      return;
    }
    let cancelled = false;
    void apiFetch(`/encounters/${encounterId}`, { facilityId })
      .then((raw) => {
        if (cancelled) return;
        const latest = asApiObject(raw) as {
          vitals?: unknown;
          nursingAssessment?: unknown;
          triage?: { vitalsJson?: unknown } | null;
        } | null;
        const s = getEncounterAllergyDocumentationSummary({
          vitals: latest?.vitals,
          nursingAssessment: latest?.nursingAssessment,
          triageVitalsJson: latest?.triage?.vitalsJson ?? null,
        });
        setMedicationAllergyDocSummary(s);
      })
      .catch(() => {
        if (!cancelled) setMedicationAllergyDocSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    encounterId,
    facilityId,
    encounter?.vitals,
    encounter?.nursingAssessment,
    encounter?.triage,
    stagedItems.MEDICATION.length,
  ]);

  const authorityPayloadFieldsForType = (orderType: OrderModalTab): OrderAuthorityPayloadFields | undefined => {
    if (canPrescribe && (orderType === "MEDICATION" || orderType === "CARE")) {
      return { orderSource: "PROVIDER_ORDER" };
    }
    if (canUseRnOrderAuthority && (orderType === "MEDICATION" || orderType === "CARE")) {
      if (formData.orderSource === "VERBAL_ORDER") {
        return { orderSource: "VERBAL_ORDER", readbackConfirmed: formData.readbackConfirmed };
      }
      if (formData.orderSource === "NURSING_PROTOCOL") {
        return { orderSource: "NURSING_PROTOCOL", protocolName: formData.protocolName };
      }
    }
    return undefined;
  };

  const authorityPayloadFields = (): OrderAuthorityPayloadFields | undefined =>
    authorityPayloadFieldsForType(formData.type);

  const validateRnAuthorityForSubmit = (): string | null => {
    if (!isRnAuthorityTab) return null;
    if (!formData.orderSource || formData.orderSource === "PROVIDER_ORDER") {
      return t("createOrderModal.rnAuthority.errors.sourceRequired");
    }
    if (formData.orderSource === "VERBAL_ORDER") {
      if (!formData.prescriberName.trim()) return t("createOrderModal.rnAuthority.errors.physicianRequired");
      if (formData.readbackConfirmed !== true) return t("createOrderModal.rnAuthority.errors.readbackRequired");
      return null;
    }
    if (formData.orderSource === "NURSING_PROTOCOL") {
      if (!formData.protocolName.trim()) return t("createOrderModal.rnAuthority.errors.protocolRequired");
      return null;
    }
    return t("createOrderModal.rnAuthority.errors.sourceRequired");
  };

  const getMergedStagedSnapshot = (): Record<OrderTypeKey, CreateOrderLineItem[]> => {
    const base: Record<OrderTypeKey, CreateOrderLineItem[]> = {
      LAB: [...stagedItems.LAB],
      IMAGING: [...stagedItems.IMAGING],
      MEDICATION: [...stagedItems.MEDICATION],
      CARE: [...stagedItems.CARE],
    };
    if (isOrderTypeKey(activeTab)) {
      base[activeTab] = [...formData.items];
    }
    return base;
  };

  const validateRnAuthorityForStagedBatch = (snap: Record<OrderTypeKey, CreateOrderLineItem[]>): string | null => {
    const batchTouchesMedOrCare =
      (snap.MEDICATION.length > 0 || snap.CARE.length > 0) && canUseRnOrderAuthority;
    if (!batchTouchesMedOrCare) return null;
    if (!formData.orderSource || formData.orderSource === "PROVIDER_ORDER") {
      return t("createOrderModal.rnAuthority.errors.sourceRequired");
    }
    if (formData.orderSource === "VERBAL_ORDER") {
      if (!formData.prescriberName.trim()) return t("createOrderModal.rnAuthority.errors.physicianRequired");
      if (formData.readbackConfirmed !== true) return t("createOrderModal.rnAuthority.errors.readbackRequired");
      return null;
    }
    if (formData.orderSource === "NURSING_PROTOCOL") {
      if (!formData.protocolName.trim()) return t("createOrderModal.rnAuthority.errors.protocolRequired");
      return null;
    }
    return t("createOrderModal.rnAuthority.errors.sourceRequired");
  };

  const validateDomainForOrder = (
    type: OrderTypeKey,
    items: CreateOrderLineItem[],
    summaryAtSubmit: string | null
  ): string | null => {
    if (items.length === 0) return t("createOrderModal.errSelectOne");

    if (type === "MEDICATION") {
      const rnNursingProtocol = canUseRnOrderAuthority && formData.orderSource === "NURSING_PROTOCOL";
      if (!rnNursingProtocol && !formData.prescriberName.trim()) {
        return t("createOrderModal.errPrescriberRequired");
      }
      const missingQty = items.some((it) => it.quantity == null || it.quantity < 1);
      if (missingQty) return t("createOrderModal.errQuantityRequired");
      const missingDirections = items.some((it) => !it.notes?.trim());
      if (missingDirections) return t("createOrderModal.errDirectionsRequired");
      const missingIvConfirmation = items.some(
        (it) => (it.route === "IVP" || it.route === "IVPB") && ivRouteConfirmations[it._lineId] !== true
      );
      if (missingIvConfirmation) return t("createOrderModal.errIvConfirmationRequired");
      const missingErQuantityConfirmation =
        erAdministerOnlyMedication &&
        items.some((it) => (it.quantity ?? 0) > 1 && erQuantityConfirmations[it._lineId] !== true);
      if (missingErQuantityConfirmation) return t("createOrderModal.errErQuantityConfirmationRequired");
      if (summaryAtSubmit && !medicationAllergySafetyAck) {
        return t("createOrderModal.errMedicationAllergyAckRequired");
      }
    }

    if (type === "LAB") {
      const catalogLineMissingId = items.some((it) => !it.isManual && !it.catalogItemId?.trim());
      if (catalogLineMissingId) {
        console.warn(
          "[CreateOrderModal] Lab line marked as catalog (not manual) but catalogItemId is missing — submit blocked",
          items.filter((it) => !it.isManual && !it.catalogItemId?.trim())
        );
        return t("createOrderModal.errLabCatalogIdMissing");
      }
    }

    if (type === "IMAGING") {
      const catalogLineMissingId = items.some((it) => !it.isManual && !it.catalogItemId?.trim());
      if (catalogLineMissingId) {
        console.warn(
          "[CreateOrderModal] Imaging line marked as catalog (not manual) but catalogItemId is missing — submit blocked",
          items.filter((it) => !it.isManual && !it.catalogItemId?.trim())
        );
        return t("createOrderModal.errImagingCatalogIdMissing");
      }
    }

    if (type === "CARE") {
      const missingLabel = items.some((it) => !(it.manualLabel ?? it._label)?.trim());
      if (missingLabel) return t("createOrderModal.errSelectOne");
    }

    return null;
  };

  type OrderCreateResponse = {
    id: string;
    createdAt: string;
    prescriberName?: string;
    prescriberLicense?: string;
    prescriberContact?: string;
    authority?: unknown;
    createdByDisplay?: unknown;
    lastActionDisplay?: unknown;
    queued?: boolean;
  };

  const postOrderDomainApi = async (
    type: OrderTypeKey,
    items: CreateOrderLineItem[],
    summaryAtSubmit: string | null
  ): Promise<OrderCreateResponse> => {
    const allergyAckForApi = type === "MEDICATION" && Boolean(summaryAtSubmit) && medicationAllergySafetyAck;
    const payload = buildPayload(
      type,
      formData.priority,
      formData.notes,
      formData.prescriberName,
      formData.prescriberLicense,
      formData.prescriberContact,
      erAdministerOnlyMedication && type === "MEDICATION"
        ? items.map((item) => ({ ...item, medicationFulfillmentIntent: "ADMINISTER_CHART" as const }))
        : items,
      authorityPayloadFieldsForType(type),
      allergyAckForApi ? true : undefined,
      facilityTimeZone
    );
    return (await apiFetch(`/encounters/${encounterId}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      facilityId,
    })) as OrderCreateResponse;
  };

  const resolveOrderSetItems = async (items: OrderSetItem[]): Promise<ResolvedOrderSetItems> => {
    const resolved = emptyResolvedOrderSetItems();

    for (const orderSetItem of items) {
      if (orderSetItem.comingSoon) continue;

      if (
        (orderSetItem.type === "MEDICATION" || orderSetItem.type === "CARE") &&
        !canPrescribe &&
        !(canUseRnOrderAuthority && rnAuthorityModeValid)
      ) {
        resolved.skipped.push({ key: orderSetItem.key, reason: "nonPrescriber" });
        continue;
      }

      if (orderSetItem.type === "CARE") {
        const label = t(`createOrderModal.orderSetItems.${orderSetItem.key}`);
        resolved.CARE.push({
          _lineId: newOrderLineId(),
          isManual: true,
          catalogItemType: "CARE",
          manualLabel: label,
          _label: label,
        });
        continue;
      }

      if (!orderSetItem.catalogType || !orderSetItem.catalogCode) {
        resolved.skipped.push({ key: orderSetItem.key, reason: "noMatch" });
        continue;
      }

      const acceptableCodes = new Set(
        [orderSetItem.catalogCode, ...(orderSetItem.catalogCodes ?? [])].map((code) => code.toUpperCase())
      );
      let catalogItem: CatalogSearchItem | null = null;
      try {
        const exactResults = await searchCatalog(facilityId, orderSetItem.catalogType, {
          q: orderSetItem.catalogCode,
          limit: 5,
        });
        catalogItem =
          exactResults.find((item) => isApprovedCatalogMatch(item, orderSetItem.catalogType!, acceptableCodes)) ?? null;

        if (!catalogItem && orderSetItem.fallbackSearchQuery) {
          const fallbackResults = await searchCatalog(facilityId, orderSetItem.catalogType, {
            q: orderSetItem.fallbackSearchQuery,
            limit: 5,
          });
          const exactFallbackResults = fallbackResults.filter((item) =>
            isApprovedCatalogMatch(item, orderSetItem.catalogType!, acceptableCodes)
          );

          if (exactFallbackResults.length === 1) {
            catalogItem = exactFallbackResults[0];
          } else if (exactFallbackResults.length > 1 || fallbackResults.length > 1) {
            resolved.skipped.push({ key: orderSetItem.key, reason: "ambiguous" });
            continue;
          }
        }
      } catch {
        resolved.skipped.push({ key: orderSetItem.key, reason: "noMatch" });
        continue;
      }

      if (!catalogItem) {
        resolved.skipped.push({ key: orderSetItem.key, reason: "noMatch" });
        continue;
      }

        const line = catalogItemToOrderLine(
          catalogItem,
          language,
          t,
          medicationOrderMode,
          plannedAdminFacilityTimeZone
        );
      if (!line) {
        resolved.skipped.push({ key: orderSetItem.key, reason: "noMatch" });
        continue;
      }

      if (orderSetItem.type === "LAB" && line.catalogItemType === "LAB_TEST") resolved.LAB.push(line);
      if (orderSetItem.type === "IMAGING" && line.catalogItemType === "IMAGING_STUDY") resolved.IMAGING.push(line);
      if (orderSetItem.type === "MEDICATION" && line.catalogItemType === "MEDICATION") resolved.MEDICATION.push(line);
    }

    return resolved;
  };

  const applyOrderSet = async () => {
    if (!canApplyOrderSet || orderSetApplying) return;

    setOrderSetApplying(true);
    setError(null);

    try {
      const resolved = await resolveOrderSetItems(selectedOrderSetItems);
      const nextStagedItems: Record<OrderTypeKey, CreateOrderLineItem[]> = {
        LAB: resolved.LAB,
        IMAGING: resolved.IMAGING,
        MEDICATION: resolved.MEDICATION,
        CARE: resolved.CARE,
      };
      const nextTab = (["LAB", "IMAGING", "MEDICATION", "CARE"] as OrderTypeKey[]).find(
        (tab) => nextStagedItems[tab].length > 0
      );

      setStagedItems(nextStagedItems);
      setOrderSetReviewActive(true);

      if (resolved.skipped.length > 0) {
        setOrderSetWarning({ count: resolved.skipped.length });
      } else {
        setOrderSetWarning(null);
      }

      if (!nextTab) {
        setError(t("ordersets.apply.noMatch"));
        return;
      }

      setActiveTab(nextTab);
      setFormData((fd) => ({ ...fd, type: nextTab, items: nextStagedItems[nextTab] }));

      if (resolved.skipped.length > 0) {
        const skippedLabels = resolved.skipped
          .map((item) => t(`createOrderModal.orderSetItems.${item.key}`))
          .join(", ");
        const hasNonPrescriber = resolved.skipped.some((item) => item.reason === "nonPrescriber");
        const hasAmbiguous = resolved.skipped.some((item) => item.reason === "ambiguous");
        const messageKey = hasNonPrescriber
          ? canUseRnOrderAuthority
            ? "ordersets.apply.rnAuthorityRequired"
            : "ordersets.apply.nonPrescriber"
          : hasAmbiguous
            ? "ordersets.apply.ambiguous"
            : "ordersets.apply.skipped";
        setError(t(messageKey).replace("{items}", skippedLabels));
      }
    } catch {
      setError(t("ordersets.apply.noMatch"));
    } finally {
      setOrderSetApplying(false);
    }
  };

  const goToStagedTabAfterSuccess = (tab: OrderTypeKey) => {
    setOrderSuccess(false);
    setRxSuccess(false);
    setQueuedSync(false);
    setCreatedOrder(null);
    setRxIntentDisplayItems(null);
    setLastBatchAllStagedSuccess(false);
    setNextStagedTabAfterSuccess(null);
    setSubmittedOrderType(null);
    setActiveTab(tab);
    setFormData((fd) => ({ ...fd, type: tab, items: stagedItems[tab] }));
    setError(null);
  };

  const catalogTypeForTab = (tab: OrderModalTab): "LAB_TEST" | "IMAGING_STUDY" | "MEDICATION" => {
    if (tab === "LAB") return "LAB_TEST";
    if (tab === "IMAGING") return "IMAGING_STUDY";
    return "MEDICATION";
  };

  const addCareLine = (
    label: string,
    options?: { quickKey?: "ekg_workflow" | "laceration_kit"; enterpriseProcedureId?: string }
  ) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    setFormData((fd) => {
      if (careLabelExistsInItems(fd.items, trimmed)) {
        queueMicrotask(() => setCareDuplicateHint(t("createOrderModal.careDuplicateAlreadySelected")));
        return fd;
      }
      queueMicrotask(() => setCareDuplicateHint(null));
      return {
        ...fd,
        items: [
          ...fd.items,
          {
            _lineId: newOrderLineId(),
            isManual: true,
            catalogItemType: "CARE",
            manualLabel: trimmed,
            _label: trimmed,
            ...(options?.quickKey ? { _careQuickKey: options.quickKey } : {}),
            // MEDPROC.2: persist enterpriseProcedureId on OrderItem; manualLabel stays display-only.
            ...(options?.enterpriseProcedureId ? { _enterpriseProcedureId: options.enterpriseProcedureId } : {}),
          },
        ],
      };
    });
  };

  const addCareCatalogProcedure = (procedure: CareProcedurePickerRow) => {
    const locale = language === "fr" ? "fr" : "en";
    const label = locale === "fr" ? procedure.displayNameFr : procedure.displayNameEn;
    const quickKey =
      procedure.code === "ekg_ecg"
        ? ("ekg_workflow" as const)
        : procedure.code === "laceration_repair"
          ? ("laceration_kit" as const)
          : undefined;
    addCareLine(label, { enterpriseProcedureId: procedure.code, quickKey });
    setCarePickerQuery("");
  };

  const addCustomCareTaskLine = () => {
    const label = customCareTaskDraft.trim();
    if (!label) return;
    addCareLine(label);
    setCustomCareTaskDraft("");
  };

  const handleSelectItem = (item: CatalogSearchItem) => {
    const tab = activeTab;
    if (tab === "CARE") return;
    if (tab === "LAB" || tab === "IMAGING") {
      const catalogItemType = tab === "LAB" ? "LAB_TEST" : "IMAGING_STUDY";
      setFormData((fd) => {
        if (fd.items.some((x) => x.catalogItemId && x.catalogItemId === item.id)) return fd;
        return {
          ...fd,
          items: [
            ...fd.items,
            {
              _lineId: newOrderLineId(),
              isManual: false,
              catalogItemId: item.id,
              catalogItemType,
              _label: catalogLineLabel(item, language, t),
              _modality: item.metadata?.modality,
              _bodyRegion: item.metadata?.bodyRegion,
            },
          ],
        };
      });
      return;
    }

    setFormData((fd) => {
      if (fd.items.some((x) => x.catalogItemId && x.catalogItemId === item.id)) return fd;
      const line = catalogItemToOrderLine(
        item,
        language,
        t,
        medicationOrderMode,
        plannedAdminFacilityTimeZone
      );
      if (!line) return fd;
      return {
        ...fd,
        items: [...fd.items, prepareMedicationOrderLinePlannedAdmin(line, plannedAdminFacilityTimeZone)],
      };
    });
  };

  const handleAddManualLine = (line: CreateOrderLineItem) => {
    let nextLine =
      erAdministerOnlyMedication && line.catalogItemType === "MEDICATION"
        ? { ...line, quantity: line.quantity ?? 1, medicationFulfillmentIntent: "ADMINISTER_CHART" as const }
        : line;
    if (nextLine.catalogItemType === "MEDICATION") {
      nextLine = prepareMedicationOrderLinePlannedAdmin(nextLine, plannedAdminFacilityTimeZone);
    }
    setFormData((fd) => ({ ...fd, items: [...fd.items, nextLine] }));
  };

  const removeItem = (idx: number) => {
    const lineId = formData.items[idx]?._lineId;
    if (lineId) {
      setIvRouteConfirmations((current) => {
        const { [lineId]: _removed, ...rest } = current;
        return rest;
      });
      setErQuantityConfirmations((current) => {
        const { [lineId]: _removed, ...rest } = current;
        return rest;
      });
    }
    setFormData((fd) => ({ ...fd, items: fd.items.filter((_, i) => i !== idx) }));
  };

  const patchMedItem = (idx: number, patch: Partial<CreateOrderLineItem>) => {
    setFormData((fd) => {
      const next = [...fd.items];
      let patched = patchMedicationLineWithPlannedAdminRules(
        next[idx],
        patch,
        plannedAdminFacilityTimeZone
      );
      if (erAdministerOnlyMedication) {
        patched = { ...patched, medicationFulfillmentIntent: "ADMINISTER_CHART" as const };
      }
      next[idx] = patched;
      return { ...fd, items: next };
    });
  };

  const clearMedicationOrderLocalState = () => {
    setStagedItems((current) => ({ ...current, MEDICATION: [] }));
    setFormData((fd) =>
      fd.type === "MEDICATION" || fd.items.some((it) => it.catalogItemType === "MEDICATION")
        ? { ...fd, items: fd.type === "MEDICATION" ? [] : fd.items.filter((it) => it.catalogItemType !== "MEDICATION") }
        : fd
    );
    setMedicationAllergySafetyAck(false);
    setIvRouteConfirmations({});
    setErQuantityConfirmations({});
    if (typeof window !== "undefined") {
      const existing = readClinicalDraft<CreateOrderDraftPayload>(window.localStorage, draftKey);
      if (existing) {
        const stripped = stripMedicationFromOrderDraftPayload(existing.payload);
        if (createOrderDraftHasContent(stripped)) {
          writeClinicalDraft(
            window.localStorage,
            draftKey,
            createClinicalDraft({
              scope: draftScope,
              payload: stripped,
              savedLocallyAt: existing.metadata.savedLocallyAt,
            })
          );
        } else {
          removeClinicalDraft(window.localStorage, draftKey);
        }
      }
    }
  };

  const handleClose = () => {
    clearMedicationOrderLocalState();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "ORDER_SET") {
      setError(t("createOrderModal.orderSetsApplyDisabledHelp"));
      return;
    }
    if (formData.items.length === 0) {
      setError(t("createOrderModal.errSelectOne"));
      return;
    }

    const rnAuthorityError = validateRnAuthorityForSubmit();
    if (rnAuthorityError) {
      setError(rnAuthorityError);
      return;
    }

    if (
      formData.type === "MEDICATION" &&
      formData.items.some((it) => isAdministerToPatientIntent(it.medicationFulfillmentIntent)) &&
      !facilityClinicalTimeZoneReady
    ) {
      setError(t("createOrderModal.errFacilityTimezoneNotReady"));
      return;
    }

    setLoading(true);
    setError(null);
    setBulkCreateProgress(null);
    setLastBatchAllStagedSuccess(false);

    try {
      type EncounterLatestForOrderSafety = {
        status?: string;
        vitals?: unknown;
        nursingAssessment?: unknown;
        triage?: { vitalsJson?: unknown } | null;
      };
      let latestForSafety: EncounterLatestForOrderSafety | null = null;
      try {
        const latestRaw = await apiFetch(`/encounters/${encounterId}`, { facilityId });
        latestForSafety = asApiObject(latestRaw) as EncounterLatestForOrderSafety;
        if (
          latestForSafety &&
          typeof latestForSafety.status === "string" &&
          latestForSafety.status !== "OPEN"
        ) {
          await onRefetchEncounter?.();
          setError(t("createOrderModal.errEncounterClosed"));
          return;
        }
      } catch {
        latestForSafety = null;
      }

      const summaryAtSubmit =
        latestForSafety != null
          ? getEncounterAllergyDocumentationSummary({
              vitals: latestForSafety.vitals,
              nursingAssessment: latestForSafety.nursingAssessment,
              triageVitalsJson: latestForSafety.triage?.vitalsJson ?? null,
            })
          : medicationAllergyDocSummary;

      const submittedType = formData.type as OrderTypeKey;
      const domainErr = validateDomainForOrder(submittedType, formData.items, summaryAtSubmit);
      if (domainErr) {
        setError(domainErr);
        return;
      }

      const res = await postOrderDomainApi(submittedType, formData.items, summaryAtSubmit);

      const nextStagedItems = { ...stagedItems, [submittedType]: [] };
      const nextReviewTab =
        orderSetReviewActive
          ? ORDER_TYPE_REVIEW_ORDER.find(
              (tab) => tab !== submittedType && orderTypes.includes(tab) && nextStagedItems[tab].length > 0
            ) ?? null
          : null;
      setStagedItems(nextStagedItems);
      setSubmittedOrderType(submittedType);
      setNextStagedTabAfterSuccess(nextReviewTab);
      if (submittedType === "MEDICATION") {
        setFormData((fd) => (fd.type === "MEDICATION" ? { ...fd, items: [] } : fd));
        setMedicationAllergySafetyAck(false);
      }
      if (!nextReviewTab) {
        setOrderSetReviewActive(false);
        if (typeof window !== "undefined") removeClinicalDraft(window.localStorage, draftKey);
        setDraftRestoredAt(null);
        setDraftSavedLocallyAt(null);
      }

      setRxIntentDisplayItems(null);
      if ((res as OrderCreateResponse)?.queued) {
        setQueuedSync(true);
        setOrderSuccess(true);
      } else if (submittedType === "MEDICATION") {
        setCreatedOrder(res);
        setRxSuccess(true);
      } else {
        setOrderSuccess(true);
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      if (isEncounterMustBeOpenForOrderError(raw)) {
        await onRefetchEncounter?.();
      }
      setError(mapOrderCreateError(err, t, language));
    } finally {
      setLoading(false);
      setBulkCreateProgress(null);
    }
  };

  const handleSubmitAllStagedOrders = async () => {
    if (loading) return;

    const snapshot = getMergedStagedSnapshot();
    const domainsToSubmit = ORDER_TYPE_REVIEW_ORDER.filter(
      (tab) => orderTypes.includes(tab) && snapshot[tab].length > 0
    );

    if (activeTab === "ORDER_SET" && domainsToSubmit.length === 0) {
      setError(t("createOrderModal.orderSetsApplyDisabledHelp"));
      return;
    }

    if (domainsToSubmit.length === 0) {
      setError(t("orders.noStagedOrders"));
      return;
    }

    const rnBatchErr = validateRnAuthorityForStagedBatch(snapshot);
    if (rnBatchErr) {
      setError(rnBatchErr);
      return;
    }

    setLoading(true);
    setError(null);
    setBulkCreateProgress(null);
    setLastBatchAllStagedSuccess(false);
    setRxIntentDisplayItems(null);

    type EncounterLatestForOrderSafety = {
      status?: string;
      vitals?: unknown;
      nursingAssessment?: unknown;
      triage?: { vitalsJson?: unknown } | null;
    };

    try {
      let latestForSafety: EncounterLatestForOrderSafety | null = null;
      try {
        const latestRaw = await apiFetch(`/encounters/${encounterId}`, { facilityId });
        latestForSafety = asApiObject(latestRaw) as EncounterLatestForOrderSafety;
        if (
          latestForSafety &&
          typeof latestForSafety.status === "string" &&
          latestForSafety.status !== "OPEN"
        ) {
          await onRefetchEncounter?.();
          setError(t("createOrderModal.errEncounterClosed"));
          return;
        }
      } catch {
        latestForSafety = null;
      }

      const summaryAtSubmit =
        latestForSafety != null
          ? getEncounterAllergyDocumentationSummary({
              vitals: latestForSafety.vitals,
              nursingAssessment: latestForSafety.nursingAssessment,
              triageVitalsJson: latestForSafety.triage?.vitalsJson ?? null,
            })
          : medicationAllergyDocSummary;

      for (const tab of domainsToSubmit) {
        const v = validateDomainForOrder(tab, snapshot[tab], summaryAtSubmit);
        if (v) {
          setError(v);
          return;
        }
      }

      const successfulTypes: OrderTypeKey[] = [];
      let anyQueued = false;
      let lastMedRes: OrderCreateResponse | null = null;
      let lastMedItemsSnapshot: CreateOrderLineItem[] | null = null;

      for (const tab of domainsToSubmit) {
        setBulkCreateProgress(t("orders.creatingDomain").replace("{type}", domainLabel(tab)));
        try {
          const res = await postOrderDomainApi(tab, snapshot[tab], summaryAtSubmit);
          successfulTypes.push(tab);
          if (res.queued) anyQueued = true;
          if (tab === "MEDICATION") {
            lastMedRes = res;
            lastMedItemsSnapshot = [...snapshot[tab]];
          }
        } catch (err) {
          const raw = err instanceof Error ? err.message : "";
          if (isEncounterMustBeOpenForOrderError(raw)) {
            await onRefetchEncounter?.();
          }
          const reason = mapOrderCreateError(err, t, language);
          const nextStaged: Record<OrderTypeKey, CreateOrderLineItem[]> = {
            LAB: successfulTypes.includes("LAB") ? [] : [...snapshot.LAB],
            IMAGING: successfulTypes.includes("IMAGING") ? [] : [...snapshot.IMAGING],
            MEDICATION: successfulTypes.includes("MEDICATION") ? [] : [...snapshot.MEDICATION],
            CARE: successfulTypes.includes("CARE") ? [] : [...snapshot.CARE],
          };
          setStagedItems(nextStaged);
          setActiveTab(tab);
          setFormData((fd) => ({ ...fd, type: tab, items: [...nextStaged[tab]] }));
          const createdLabels = successfulTypes.map((x) => domainLabel(x)).join(", ");
          const partial =
            successfulTypes.length > 0
              ? `${t("orders.createdDomainsPartial").replace("{types}", createdLabels)} `
              : "";
          const failedLine = t("orders.domainCreateFailed")
            .replace("{type}", domainLabel(tab))
            .replace("{reason}", reason);
          setError(`${partial}${failedLine} ${t("orders.remainingOrdersKept")}`.trim());
          return;
        }
      }

      const nextStagedItems: Record<OrderTypeKey, CreateOrderLineItem[]> = {
        LAB: [...snapshot.LAB],
        IMAGING: [...snapshot.IMAGING],
        MEDICATION: [...snapshot.MEDICATION],
        CARE: [...snapshot.CARE],
      };
      for (const t0 of successfulTypes) {
        nextStagedItems[t0] = [];
      }
      setStagedItems(nextStagedItems);
      setFormData((fd) => ({
        ...fd,
        items: isOrderTypeKey(activeTab) ? [...nextStagedItems[activeTab as OrderTypeKey]] : fd.items,
      }));
      if (successfulTypes.includes("MEDICATION")) {
        setMedicationAllergySafetyAck(false);
      }

      const nextReviewTab =
        orderSetReviewActive
          ? ORDER_TYPE_REVIEW_ORDER.find((tab) => orderTypes.includes(tab) && nextStagedItems[tab].length > 0) ??
            null
          : null;
      setSubmittedOrderType(successfulTypes[successfulTypes.length - 1] ?? null);
      setNextStagedTabAfterSuccess(nextReviewTab);
      if (!nextReviewTab) {
        setOrderSetReviewActive(false);
        if (typeof window !== "undefined") removeClinicalDraft(window.localStorage, draftKey);
        setDraftRestoredAt(null);
        setDraftSavedLocallyAt(null);
      }

      setLastBatchAllStagedSuccess(true);
      if (anyQueued) {
        setQueuedSync(true);
        setOrderSuccess(true);
      } else if (lastMedRes && lastMedItemsSnapshot?.length) {
        setCreatedOrder(lastMedRes);
        setRxIntentDisplayItems(lastMedItemsSnapshot);
        setRxSuccess(true);
      } else {
        setOrderSuccess(true);
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      if (isEncounterMustBeOpenForOrderError(raw)) {
        await onRefetchEncounter?.();
      }
      setError(mapOrderCreateError(err, t, language));
    } finally {
      setLoading(false);
      setBulkCreateProgress(null);
    }
  };

  const title = orderSuccess
    ? t("createOrderModal.titleOrderCreated")
    : rxSuccess
      ? t("createOrderModal.titlePrescription")
      : activeTab === "MEDICATION"
        ? t("createOrderModal.titlePrescription")
        : t("createOrderModal.titleCreate");

  const searchPlaceholder =
    activeTab === "LAB"
      ? t("createOrderModal.searchPlaceholderLab")
      : activeTab === "IMAGING"
        ? t("createOrderModal.searchPlaceholderImaging")
        : activeTab === "CARE"
          ? ""
          : t("createOrderModal.searchPlaceholderMed");
  const successMessage =
    orderSuccess && lastBatchAllStagedSuccess && !nextStagedTabAfterSuccess
      ? t("orders.allStagedCreated")
      : submittedOrderType && nextStagedTabAfterSuccess
        ? t("createOrderModal.successCreatedNext")
            .replace("{createdType}", domainLabel(submittedOrderType))
            .replace("{nextType}", domainLabel(nextStagedTabAfterSuccess))
        : queuedSync
          ? t("createOrderModal.successQueued")
          : t("createOrderModal.successOk");

  const mergedStagedForSubmitBar = getMergedStagedSnapshot();
  const stagedTabsWithItemsBar = ORDER_TYPE_REVIEW_ORDER.filter(
    (tab) => orderTypes.includes(tab) && mergedStagedForSubmitBar[tab].length > 0
  );
  const showMultiStagedSubmitBar = stagedTabsWithItemsBar.length >= 2 && !orderSuccess && !rxSuccess;
  const multiStagedSummaryLine = stagedTabsWithItemsBar
    .map((tab) => `${domainLabel(tab)} (${mergedStagedForSubmitBar[tab].length})`)
    .join(", ");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: "#fff",
          padding: "20px 22px",
          borderRadius: 6,
          maxWidth: 640,
          width: "92%",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: "0 0 14px", fontSize: 18, fontWeight: 700 }}>{title}</h2>

        {draftRestoredAt ? (
          <p style={{ margin: "0 0 10px", color: "#0369a1", fontSize: 12, fontWeight: 600 }}>
            {t("createOrderModal.localDraftRestored")}
          </p>
        ) : null}
        {draftSavedLocallyAt && !orderSuccess && !rxSuccess ? (
          <p style={{ margin: "0 0 10px", color: "#64748b", fontSize: 12 }}>
            {t("createOrderModal.localDraftSaved")}
          </p>
        ) : null}

        {orderSuccess && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 14, color: "#444", margin: "0 0 16px", lineHeight: 1.5 }}>
              {successMessage}
            </p>
            <button
              type="button"
              onClick={() => {
                if (nextStagedTabAfterSuccess) {
                  goToStagedTabAfterSuccess(nextStagedTabAfterSuccess);
                  return;
                }
                setOrderSuccess(false);
                setQueuedSync(false);
                setSubmittedOrderType(null);
                setLastBatchAllStagedSuccess(false);
                setRxIntentDisplayItems(null);
                onSuccess();
              }}
              style={{
                padding: "10px 18px",
                backgroundColor: "#1a1a1a",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              {t("createOrderModal.continue")}
            </button>
          </div>
        )}

        {rxSuccess && createdOrder && (
          <div style={{ marginBottom: 20 }}>
            {(() => {
              const items = rxIntentDisplayItems ?? formData.items;
              const intents = items.map(
                (it) => it.medicationFulfillmentIntent ?? "PHARMACY_DISPENSE"
              );
              const allAdminister =
                items.length > 0 && intents.every((x) => x === "ADMINISTER_CHART");
              const allPharmacy =
                items.length > 0 && intents.every((x) => x === "PHARMACY_DISPENSE");
              return (
                <>
                  <p style={{ fontSize: 15, color: "#1b5e20", margin: "0 0 16px" }}>
                    {allAdminister
                      ? t("createOrderModal.rxAllAdministerLine")
                      : allPharmacy
                        ? t("createOrderModal.rxAllPharmacyLine")
                        : t("createOrderModal.rxMixedLine")}
                  </p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  const patient = encounter?.patient ?? {};
                  printRx({
                    order: {
                      createdAt: createdOrder.createdAt,
                      prescriberName: formData.prescriberName || createdOrder.prescriberName,
                      prescriberLicense: formData.prescriberLicense || createdOrder.prescriberLicense,
                      prescriberContact: formData.prescriberContact || createdOrder.prescriberContact,
                      authority: createdOrder.authority as any,
                      createdByDisplay: createdOrder.createdByDisplay as any,
                      lastActionDisplay: createdOrder.lastActionDisplay as any,
                      items: items.map((it) => ({
                        catalogItemId: it.catalogItemId,
                        manualLabel: it.isManual ? it.manualLabel ?? it._label : undefined,
                        strength: it.strength ?? null,
                        route: it.route ?? null,
                        notes: it.notes ?? null,
                        quantity: it.quantity ?? null,
                        refillCount: it.refillCount ?? 0,
                        catalogMedication: {
                          displayNameFr: it._label ?? null,
                          name: it._label ?? undefined,
                          strength: it.strength ?? undefined,
                          dosageForm: it._dosageForm ?? undefined,
                          route: it._route ?? undefined,
                        },
                      })),
                    },
                    patient,
                    language,
                  });
                }}
                style={{
                  padding: "10px 18px",
                  backgroundColor: "#1a1a1a",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                {t("createOrderModal.printRx")}
              </button>
              {!allAdminister ? (
              <Link
                href="/app/pharmacy-worklist"
                style={{
                  padding: "10px 18px",
                  border: "1px solid #1a1a1a",
                  borderRadius: 4,
                  color: "#1a1a1a",
                  textDecoration: "none",
                  fontSize: 14,
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                {t("createOrderModal.viewPharmacyQueue")}
              </Link>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (nextStagedTabAfterSuccess) {
                    goToStagedTabAfterSuccess(nextStagedTabAfterSuccess);
                    return;
                  }
                  setRxSuccess(false);
                  setCreatedOrder(null);
                  setSubmittedOrderType(null);
                  setRxIntentDisplayItems(null);
                  setLastBatchAllStagedSuccess(false);
                  clearMedicationOrderLocalState();
                  onSuccess();
                }}
                style={{
                  padding: "10px 18px",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  backgroundColor: "#f5f5f5",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                {t("createOrderModal.continue")}
              </button>
            </div>
            <p style={{ marginTop: 14, fontSize: 13, color: "#666" }}>
              {t("createOrderModal.recordedAt")}{" "}
              {createdOrder.createdAt
                ? new Date(createdOrder.createdAt).toLocaleString(language === "en" ? "en-US" : "fr-FR")
                : "—"}
            </p>
                </>
              );
            })()}
          </div>
        )}

        {!rxSuccess && !orderSuccess && (
          <>
            {orderSetWarning ? (
              <div
                style={{
                  marginBottom: 12,
                  backgroundColor: "#fffbeb",
                  border: "1px solid #fde68a",
                  color: "#92400e",
                  padding: "10px 12px",
                  borderRadius: 6,
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
                role="status"
              >
                <div>{t("orders.orderSetWarning").replace("{count}", String(orderSetWarning.count))}</div>
                <p style={{ margin: "8px 0 0", fontSize: 12, lineHeight: 1.45, opacity: 0.95 }}>
                  {t("orders.orderSetSkippedHelper")}
                </p>
              </div>
            ) : null}
            <div
              role="tablist"
              style={{
                display: "flex",
                gap: 6,
                marginBottom: 14,
                paddingBottom: 10,
                borderBottom: "1px solid #e5e5e5",
                flexWrap: "wrap",
              }}
            >
              {orderTypes.map((tab) => {
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => changeTab(tab)}
                    style={{
                      padding: "8px 14px",
                      border: "none",
                      backgroundColor: active ? "#1a1a1a" : "transparent",
                      color: active ? "white" : "#555",
                      cursor: "pointer",
                      borderRadius: 4,
                      fontSize: 13,
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    {tabLabel(tab)}
                  </button>
                );
              })}
            </div>

            {!canUseMedicationCareTabs && isRn ? (
              <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                {t("orders.rnAuthorityInfo")}
              </p>
            ) : null}

            {orderSetReviewActive && nextReviewTab ? (
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
                {t("orders.nextStep")
                  .replace("{type}", domainLabel(nextReviewTab))
                  .replace("{count}", String(stagedCounts[nextReviewTab] ?? 0))}
              </p>
            ) : null}

            {orderSetReviewActive && hasStagedOrderSetItems ? (
              <div style={{ marginBottom: 12 }}>
                <div
                  style={{
                    border: "1px solid #bfdbfe",
                    background: "#eff6ff",
                    color: "#1e3a8a",
                    borderRadius: 6,
                    padding: "8px 10px",
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  {t("createOrderModal.orderSetStagedReviewBanner")}
                </div>
                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    background: "#f8fafc",
                    padding: "10px 12px",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#334155", marginBottom: 8 }}>
                    {t("createOrderModal.orderSetsApplyingBundle").replace(
                      "{bundle}",
                      t(`createOrderModal.orderSets.${selectedOrderSet}.name`)
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {orderSetReviewSections.map((section) => (
                      <div
                        key={section.tab}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: 7,
                          background: "#fff",
                          padding: "8px 10px",
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", marginBottom: 6 }}>
                          {section.icon} {section.label} ({section.items.length})
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18, color: "#475569", fontSize: 13, lineHeight: 1.5 }}>
                          {section.items.map((item) => (
                            <li key={item._lineId}>{stagedLineLabel(item)}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <form onSubmit={handleSubmit}>
              {showMultiStagedSubmitBar ? (
                <div
                  style={{
                    marginBottom: 12,
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                    {t("orders.willCreate")} {multiStagedSummaryLine}
                  </div>
                  {bulkCreateProgress ? (
                    <div style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>{bulkCreateProgress}</div>
                  ) : null}
                </div>
              ) : null}
              {error ? (
                <div
                  role="alert"
                  style={{
                    padding: "10px 12px",
                    backgroundColor: "#ffebee",
                    color: "#b71c1c",
                    borderRadius: 4,
                    marginBottom: 12,
                    fontSize: 14,
                  }}
                >
                  {error}
                </div>
              ) : null}

              <OrderPriorityField
                value={formData.priority}
                onChange={(priority) => setFormData((fd) => ({ ...fd, priority }))}
              />

              {(activeTab === "LAB" || activeTab === "IMAGING" || activeTab === "MEDICATION") ? (
                <ClinicalLatestVitalsBanner encounterId={encounterId} facilityId={facilityId} />
              ) : null}

              {activeTab === "MEDICATION" && orderingMedicationLabel ? (
                <MedicationAllergyOrderingBanner
                  facilityId={facilityId}
                  encounterId={encounterId}
                  medicationName={orderingMedicationLabel}
                />
              ) : null}

              {medicationAllergyDocSummary &&
              (activeTab === "MEDICATION" || mergedStagedForSubmitBar.MEDICATION.length > 0) ? (
                    <div
                      style={{
                        marginBottom: 12,
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid #fecaca",
                        backgroundColor: "#fef2f2",
                        fontSize: 13,
                        color: "#991b1b",
                        lineHeight: 1.45,
                      }}
                      role="status"
                    >
                      <label
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "flex-start",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={medicationAllergySafetyAck}
                          onChange={(e) => setMedicationAllergySafetyAck(e.target.checked)}
                        />
                        <span>{t("createOrderModal.medicationAllergySafetyAckLabel")}</span>
                      </label>
                    </div>
                  ) : null}

              {isRnAuthorityTab ? (
                <div
                  style={{
                    border: "1px solid #bfdbfe",
                    background: "#eff6ff",
                    borderRadius: 6,
                    padding: "10px 12px",
                    marginBottom: 12,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#1e3a8a", marginBottom: 8 }}>
                    {t("createOrderModal.rnAuthority.title")}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>
                    {t("createOrderModal.rnAuthority.modeLabel")}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "#0f172a" }}>
                      <input
                        type="radio"
                        name="rn-order-authority"
                        checked={formData.orderSource === "VERBAL_ORDER"}
                        onChange={() =>
                          setFormData((fd) => ({ ...fd, orderSource: "VERBAL_ORDER", protocolName: "" }))
                        }
                      />
                      {t("createOrderModal.rnAuthority.verbalOrder")}
                    </label>
                    <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "#0f172a" }}>
                      <input
                        type="radio"
                        name="rn-order-authority"
                        checked={formData.orderSource === "NURSING_PROTOCOL"}
                        onChange={() =>
                          setFormData((fd) => ({
                            ...fd,
                            orderSource: "NURSING_PROTOCOL",
                            prescriberName: "",
                            readbackConfirmed: false,
                          }))
                        }
                      />
                      {t("createOrderModal.rnAuthority.nursingProtocol")}
                    </label>
                  </div>

                  {formData.orderSource === "VERBAL_ORDER" ? (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#1e293b" }}>
                        {t("createOrderModal.rnAuthority.providerPickerLabel")}
                      </label>
                      <input
                        type="text"
                        list={providerDirectory.length > 0 ? providerDirectoryDatalistId : undefined}
                        value={formData.prescriberName}
                        placeholder={t("createOrderModal.rnAuthority.providerPickerPlaceholder")}
                        onChange={(e) => {
                          const name = e.target.value;
                          const matchedProvider = providerDirectory.find((provider) => provider.name === name);
                          setFormData((fd) => ({
                            ...fd,
                            prescriberName: name,
                            prescriberContact: matchedProvider?.email ?? fd.prescriberContact,
                          }));
                        }}
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          border: "1px solid #cbd5e1",
                          borderRadius: 4,
                          fontSize: 14,
                        }}
                      />
                      {providerDirectory.length > 0 ? (
                        <datalist id={providerDirectoryDatalistId}>
                          {providerDirectory.map((provider) => (
                            <option key={provider.id} value={provider.name}>
                              {provider.email}
                            </option>
                          ))}
                        </datalist>
                      ) : null}
                      <div style={{ fontSize: 12, color: providerDirectoryFailed ? "#b45309" : "#64748b" }}>
                        {t("createOrderModal.rnAuthority.providerPickerManualFallback")}
                      </div>
                      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "#0f172a" }}>
                        <input
                          type="checkbox"
                          checked={formData.readbackConfirmed}
                          onChange={(e) =>
                            setFormData((fd) => ({ ...fd, readbackConfirmed: e.target.checked }))
                          }
                        />
                        {t("createOrderModal.rnAuthority.readbackConfirmed")}
                      </label>
                    </div>
                  ) : null}

                  {formData.orderSource === "NURSING_PROTOCOL" ? (
                    <div style={{ marginTop: 10 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>
                        {t("createOrderModal.rnAuthority.protocolName")}
                      </label>
                      <input
                        type="text"
                        value={formData.protocolName}
                        onChange={(e) => setFormData((fd) => ({ ...fd, protocolName: e.target.value }))}
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          border: "1px solid #cbd5e1",
                          borderRadius: 4,
                          fontSize: 14,
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 12, color: "#333" }}>
                  {t("createOrderModal.clinicalNotesLabel")}{" "}
                  <span style={{ fontWeight: 400, color: "#888" }}>{t("createOrderModal.clinicalNotesOptional")}</span>
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((fd) => ({ ...fd, notes: e.target.value }))}
                  rows={2}
                  placeholder={t("createOrderModal.clinicalNotesPlaceholder")}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid #ccc",
                    borderRadius: 4,
                    fontSize: 14,
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div
                style={{
                  border: "1px solid #e0e0e0",
                  borderRadius: 6,
                  padding: "12px 12px 4px",
                  marginBottom: 8,
                  backgroundColor: "#fafafa",
                }}
              >
                {activeTab === "ORDER_SET" ? (
                  <OrderSetPreview
                    selected={selectedOrderSet}
                    checkedItemKeys={selectedOrderSetItemKeys}
                    onSelect={selectOrderSet}
                    onToggleItem={toggleOrderSetItem}
                    onApply={applyOrderSet}
                    canApply={canApplyOrderSet}
                    applying={orderSetApplying}
                    onOpenEkgDocumentation={onOpenEkgProcedureDocumentation}
                    t={t}
                  />
                ) : activeTab === "CARE" ? (
                  <>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#666",
                        marginBottom: 10,
                        textTransform: "uppercase",
                      }}
                    >
                      {t("createOrderModal.sectionCareProcedures")}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                      {carePresets.map((label) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => addCareLine(label)}
                          style={{
                            padding: "8px 12px",
                            fontSize: 13,
                            border: "1px solid #00695c",
                            borderRadius: 6,
                            background: "#fff",
                            color: "#004d40",
                            cursor: "pointer",
                            fontWeight: 500,
                            textAlign: "left",
                          }}
                        >
                          {label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          addCareLine(t("createOrderModal.careQuickEkgWorkflow"), {
                            quickKey: "ekg_workflow",
                            enterpriseProcedureId: "ekg_ecg",
                          })
                        }
                        style={{
                          padding: "8px 12px",
                          fontSize: 13,
                          border: "1px solid #00695c",
                          borderRadius: 6,
                          background: "#fff",
                          color: "#004d40",
                          cursor: "pointer",
                          fontWeight: 500,
                          textAlign: "left",
                        }}
                      >
                        {t("createOrderModal.careQuickEkgWorkflow")}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          addCareLine(t("createOrderModal.careQuickLacerationKit"), {
                            quickKey: "laceration_kit",
                            enterpriseProcedureId: "laceration_repair",
                          })
                        }
                        style={{
                          padding: "8px 12px",
                          fontSize: 13,
                          border: "1px solid #00695c",
                          borderRadius: 6,
                          background: "#fff",
                          color: "#004d40",
                          cursor: "pointer",
                          fontWeight: 500,
                          textAlign: "left",
                        }}
                      >
                        {t("createOrderModal.careQuickLacerationKit")}
                      </button>
                    </div>
                    {careHasEkgWorkflowLine ? (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#334155",
                          marginBottom: 10,
                          lineHeight: 1.45,
                          padding: "8px 10px",
                          borderRadius: 6,
                          border: "1px solid #bae6fd",
                          background: "#f0f9ff",
                        }}
                      >
                        <div style={{ marginBottom: onOpenEkgProcedureDocumentation ? 8 : 0 }}>
                          {t("createOrderModal.careEkgReportingHelper")}
                        </div>
                        {onOpenEkgProcedureDocumentation ? (
                          <button
                            type="button"
                            onClick={onOpenEkgProcedureDocumentation}
                            style={{
                              padding: "6px 12px",
                              fontSize: 12,
                              fontWeight: 600,
                              border: "1px solid #0369a1",
                              borderRadius: 6,
                              background: "#fff",
                              color: "#0c4a6e",
                              cursor: "pointer",
                            }}
                          >
                            {t("createOrderModal.careOpenProcedureDocButton")}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    {careHasLacerationKitLine ? (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#475569",
                          marginBottom: 10,
                          lineHeight: 1.45,
                          padding: "8px 10px",
                          borderRadius: 6,
                          border: "1px solid #e2e8f0",
                          background: "#fff",
                        }}
                      >
                        {t("createOrderModal.careLacerationDocHelper")}
                      </div>
                    ) : null}
                    <div style={{ marginBottom: 12 }}>
                      <label
                        htmlFor="care-category-filter"
                        style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}
                      >
                        {t("createOrderModal.careCategoryFilterLabel")}
                      </label>
                      <select
                        id="care-category-filter"
                        value={careCategoryFilter}
                        onChange={(e) =>
                          setCareCategoryFilter(e.target.value as "" | CanonicalCareProcedureCategory)
                        }
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          border: "1px solid #cbd5e1",
                          borderRadius: 6,
                          fontSize: 14,
                          marginBottom: 8,
                          boxSizing: "border-box",
                          background: "#fff",
                        }}
                      >
                        <option value="">{t("createOrderModal.careCategoryAll")}</option>
                        {CANONICAL_CARE_PROCEDURE_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {canonicalCareProcedureCategoryLabel(category, language === "fr" ? "fr" : "en")}
                          </option>
                        ))}
                      </select>
                      <input
                        type="search"
                        value={carePickerQuery}
                        onChange={(e) => {
                          setCarePickerQuery(e.target.value);
                          setCareDuplicateHint(null);
                        }}
                        placeholder={t("createOrderModal.careSearchPlaceholder")}
                        autoComplete="off"
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          border: "1px solid #cbd5e1",
                          borderRadius: 6,
                          fontSize: 14,
                          boxSizing: "border-box",
                        }}
                      />
                      {carePickerQuery.trim().length > 0 && carePickerQuery.trim().length < 2 ? (
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>
                          {t("createOrderModal.careSearchMinCharsHint")}
                        </div>
                      ) : null}
                      {careSearchActive ? (
                        careCatalogMatches.length === 0 ? (
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>
                            {t("createOrderModal.careSearchNoResults")}
                          </div>
                        ) : (
                          <ul
                            style={{
                              listStyle: "none",
                              margin: "8px 0 0",
                              padding: 0,
                              maxHeight: 200,
                              overflowY: "auto",
                              border: "1px solid #e2e8f0",
                              borderRadius: 6,
                              background: "#fff",
                            }}
                          >
                            {careCatalogMatches.map((procedure) => {
                              const locale = language === "fr" ? "fr" : "en";
                              const label = locale === "fr" ? procedure.displayNameFr : procedure.displayNameEn;
                              const categoryLabel =
                                locale === "fr" ? procedure.categoryLabelFr : procedure.categoryLabelEn;
                              return (
                                <li key={procedure.code} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                  <button
                                    type="button"
                                    onClick={() => addCareCatalogProcedure(procedure)}
                                    data-testid={`create-order-care-catalog-${procedure.code}`}
                                    style={{
                                      display: "block",
                                      width: "100%",
                                      textAlign: "left",
                                      padding: "8px 10px",
                                      fontSize: 13,
                                      border: "none",
                                      background: "transparent",
                                      cursor: "pointer",
                                      color: "#0f172a",
                                    }}
                                  >
                                    <span style={{ fontWeight: 600 }}>{label}</span>
                                    {categoryLabel ? (
                                      <span style={{ display: "block", fontSize: 11, color: "#64748b", marginTop: 2 }}>
                                        {categoryLabel}
                                      </span>
                                    ) : null}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )
                      ) : null}
                    </div>
                    {careDuplicateHint ? (
                      <div
                        role="alert"
                        style={{
                          marginBottom: 10,
                          padding: "8px 10px",
                          borderRadius: 6,
                          border: "1px solid #fecaca",
                          background: "#fef2f2",
                          fontSize: 12,
                          color: "#991b1b",
                        }}
                      >
                        {careDuplicateHint}
                      </div>
                    ) : null}
                    <div
                      style={{
                        marginTop: 4,
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                        background: "#fff",
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                        {t("createOrderModal.customCareTaskLabel")}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "stretch" }}>
                        <input
                          type="text"
                          value={customCareTaskDraft}
                          onChange={(e) => setCustomCareTaskDraft(e.target.value)}
                          placeholder={t("createOrderModal.customCareTaskPlaceholder")}
                          style={{
                            flex: "1 1 200px",
                            minWidth: 0,
                            padding: "8px 10px",
                            border: "1px solid #cbd5e1",
                            borderRadius: 6,
                            fontSize: 14,
                            boxSizing: "border-box",
                          }}
                        />
                        <button
                          type="button"
                          onClick={addCustomCareTaskLine}
                          disabled={!customCareTaskDraft.trim()}
                          style={{
                            padding: "8px 14px",
                            fontSize: 13,
                            fontWeight: 600,
                            border: "1px solid #0f172a",
                            borderRadius: 6,
                            background: customCareTaskDraft.trim() ? "#0f172a" : "#e2e8f0",
                            color: customCareTaskDraft.trim() ? "#fff" : "#94a3b8",
                            cursor: customCareTaskDraft.trim() ? "pointer" : "not-allowed",
                          }}
                        >
                          {t("createOrderModal.customCareTaskAdd")}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 8, textTransform: "uppercase" }}>
                      {t("createOrderModal.sectionSearchAdd")}
                    </div>
                    <SharedCatalogAutocomplete
                      catalogType={catalogTypeForTab(activeTab)}
                      label=""
                      placeholder={searchPlaceholder}
                      facilityId={facilityId}
                      onSelect={handleSelectItem}
                      favoritesFirst={activeTab === "MEDICATION"}
                      minChars={activeTab === "MEDICATION" ? 2 : 2}
                    />
                    {!(erAdministerOnlyMedication && activeTab === "MEDICATION") ? (
                      <ManualOrderEntry tab={activeTab} onAdd={handleAddManualLine} />
                    ) : null}
                  </>
                )}
              </div>

              {stagedCatalogDuplicateActive ? (
                <div
                  role="alert"
                  style={{
                    marginBottom: 10,
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #fbbf24",
                    backgroundColor: "#fffbeb",
                    fontSize: 13,
                    color: "#92400e",
                    lineHeight: 1.45,
                  }}
                >
                  {t("clinicalSafetyGuardrails.duplicateActiveCatalogWarning")}
                </div>
              ) : null}

              {activeTab !== "ORDER_SET" && (
                <div
                  style={{
                    border: "1px solid #e8e8e8",
                    borderRadius: 6,
                    padding: "10px 12px 4px",
                    minHeight: 56,
                    marginBottom: 14,
                    backgroundColor: "#fff",
                  }}
                >
                  {activeTab === "LAB" && <SelectedLabItems items={formData.items} onRemove={removeItem} />}
                  {activeTab === "IMAGING" && <SelectedImagingItems items={formData.items} onRemove={removeItem} />}
                  {activeTab === "MEDICATION" && (
                    <>
                      <SelectedMedicationItems
                        items={formData.items}
                        onPatch={patchMedItem}
                        onRemove={removeItem}
                        medicationOrderMode={medicationOrderMode}
                        facilityClinicalTimeZoneReady={facilityClinicalTimeZoneReady}
                        ivRouteConfirmations={ivRouteConfirmations}
                        erQuantityConfirmations={erQuantityConfirmations}
                        onIvRouteConfirmationChange={(lineId, confirmed) =>
                          setIvRouteConfirmations((current) => ({ ...current, [lineId]: confirmed }))
                        }
                        onErQuantityConfirmationChange={(lineId, confirmed) =>
                          setErQuantityConfirmations((current) => ({ ...current, [lineId]: confirmed }))
                        }
                      />
                      <AdvancedMedicationSafetyPanel warnings={advancedMedicationSafetyWarnings} />
                    </>
                  )}
                  {activeTab === "CARE" && (
                    <SelectedLabItems
                      listHeading={t("createOrderModal.selectedCareHeading")}
                      items={formData.items}
                      onRemove={removeItem}
                    />
                  )}
                  {formData.items.length === 0 && (
                    <p style={{ margin: "8px 0 12px", fontSize: 13, color: "#999" }}>
                      {activeTab === "CARE" ? t("createOrderModal.emptyCare") : t("createOrderModal.emptyOther")}
                    </p>
                  )}
                </div>
              )}

              {activeTab === "MEDICATION" && canPrescribe && (
                <div
                  style={{
                    marginBottom: 14,
                    paddingTop: 4,
                    borderTop: "1px solid #eee",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 10, textTransform: "uppercase" }}>
                    {t("createOrderModal.sectionRxHeader")}
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 12 }}>
                      {t("createOrderModal.labelPrescriber")}
                    </label>
                    <input
                      type="text"
                      readOnly
                      aria-readonly="true"
                      value={formData.prescriberName}
                      placeholder={t("createOrderModal.prescriberLoadingPlaceholder")}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        border: "1px solid #ccc",
                        borderRadius: 4,
                        fontSize: 14,
                        backgroundColor: "#f5f5f5",
                        cursor: "default",
                      }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 12 }}>
                        {t("createOrderModal.labelLicense")}
                      </label>
                      <input
                        type="text"
                        value={formData.prescriberLicense}
                        onChange={(e) => setFormData((fd) => ({ ...fd, prescriberLicense: e.target.value }))}
                        placeholder={t("createOrderModal.licenseOptional")}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #ccc", borderRadius: 4, fontSize: 14 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 12 }}>
                        {t("createOrderModal.labelPrescriberContact")}
                      </label>
                      <input
                        type="text"
                        value={formData.prescriberContact}
                        onChange={(e) => setFormData((fd) => ({ ...fd, prescriberContact: e.target.value }))}
                        placeholder={t("createOrderModal.contactPlaceholder")}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #ccc", borderRadius: 4, fontSize: 14 }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap", paddingTop: 4 }}>
                <button
                  type="button"
                  onClick={handleClose}
                  style={{ padding: "10px 18px", border: "1px solid #ccc", borderRadius: 4, cursor: "pointer", fontSize: 14, background: "#fff" }}
                >
                  {t("createOrderModal.cancel")}
                </button>
                {showMultiStagedSubmitBar ? (
                  <button
                    type="button"
                    onClick={() => void handleSubmitAllStagedOrders()}
                    disabled={loading}
                    style={{
                      padding: "10px 18px",
                      backgroundColor: "#1a1a1a",
                      color: "white",
                      border: "none",
                      borderRadius: 4,
                      cursor: loading ? "not-allowed" : "pointer",
                      opacity: loading ? 0.65 : 1,
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    {loading ? t("createOrderModal.submitSending") : t("orders.createAllStaged")}
                  </button>
                ) : null}
                {activeTab !== "ORDER_SET" && (
                  <button
                    type="submit"
                    disabled={loading}
                  style={{
                    padding: "10px 18px",
                    backgroundColor: showMultiStagedSubmitBar ? "#fff" : "#1a1a1a",
                    color: showMultiStagedSubmitBar ? "#1a1a1a" : "white",
                    border: showMultiStagedSubmitBar ? "1px solid #1a1a1a" : "none",
                    borderRadius: 4,
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.65 : 1,
                    fontSize: 14,
                  }}
                  >
                    {loading
                      ? activeTab === "MEDICATION"
                        ? t("createOrderModal.submitSavingMed")
                        : t("createOrderModal.submitSending")
                      : showMultiStagedSubmitBar
                        ? t("orders.createCurrentCategory")
                        : activeTab === "MEDICATION"
                          ? t("createOrderModal.submitMedicationOrder")
                          : activeTab === "CARE"
                            ? t("createOrderModal.submitCreateCare")
                            : t("createOrderModal.submitCreateOrder")}
                  </button>
                )}
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
