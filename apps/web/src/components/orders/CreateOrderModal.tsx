"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { apiFetch, asApiObject, parseApiResponse } from "@/lib/apiClient";
import { isEncounterMustBeOpenForOrderError } from "@/lib/userFacingError";
import type { OrderSource } from "@medora/shared";
import {
  computeAdvancedMedicationSafetyWarnings,
  getEncounterAllergyDocumentationSummary,
  normalizeMedicationRoute,
  resolveEnterpriseProcedureDisplayName,
  searchCanonicalCareProcedures,
  OXYGEN_THERAPY_PROCEDURE_CODE,
  buildOxygenTherapyManualLabel,
  buildOxygenTherapyOrderNotes,
  defaultOxygenTherapyDraft,
  enterpriseProcedureById,
  oxygenTherapyOrderPriority,
  validateOxygenTherapyDraft,
  canRolePlaceEnterpriseOrderSet,
  enterpriseOrderSetByCode,
  isRnStandingOrderSet,
  resolveEnterpriseOrderSetAuthority,
  resolveEnterpriseOrderSetDisplayName,
  buildEnterpriseOrderSetApplyContext,
  buildVerbalOrderAttestation,
  requiresVerbalOrderAttestationForRole,
  validateOutpatientPrescriptionPrintProjection,
  type EnterpriseOrderSetApplyContext,
  type EnterpriseOrderSetAuthority,
  type EnterpriseOrderSetCategory,
  type OxygenTherapyDraft,
  type D4c7ePersistedOrderItemLike,
} from "@medora/shared";
import { SharedCatalogAutocomplete } from "@/components/catalog/SharedCatalogAutocomplete";
import { printRx } from "@/components/pharmacy/RxPrintLayout";
import { searchCatalog, searchProcedureCatalog } from "@/lib/catalogSearchApi";
import {
  resolveEnterpriseOrderSetItems,
  formatOrderSetSkippedSummary,
  type ResolvedOrderSetItems,
} from "./createOrderModal/resolveEnterpriseOrderSetItems";
import {
  buildCreateOrderDomainPayload,
  prepareCreateOrderDomainPayloadForSubmit,
  resolveOrderSetProvenanceForSubmit,
  toEnterpriseOrderSetSkippedItems,
  type OrderAuthorityPayloadFields,
} from "./createOrderModal/createOrderDomainPayload";
import { mapOrderCreateApiError } from "./createOrderModal/mapOrderCreateApiError";
import {
  buildDraftPayloadAfterDomainSubmit,
  clearCreateOrderDraftSnapshot,
  createOrderDraftHasContent,
  persistCreateOrderDraftSnapshot,
  type CreateOrderDraftPayload,
} from "./createOrderModal/createOrderDraftSync";
import type { CatalogSearchItem } from "@/lib/catalogSearchTypes";
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
import { OxygenTherapyOrderForm } from "./createOrderModal/OxygenTherapyOrderForm";
import type { CreateOrderLineItem, CreateOrderModalTab, MedicationRoute, OrderModalTab } from "./createOrderModal/types";
import {
  checkedOrderSetItemKeys,
  enterpriseOrderSetBrowserAuthorityForCode,
  enterpriseOrderSetBrowserCategoryForCode,
  getDefaultOrderSetKey,
  getDefaultOrderSetKeyForRole,
  resolveOrderSetTitle,
  toOrderSetUiItems,
  type OrderSetKey,
  type OrderSetUiItem,
} from "./createOrderModal/enterpriseOrderSetAdapter";
import { EnterpriseOrderSetBrowser } from "./createOrderModal/enterpriseOrderSetBrowser";
import {
  applyDefaultPlannedAdministrationIfNeeded,
  prepareMedicationOrderLinePlannedAdmin,
  refreshUntouchedPlannedAdministrationLocal,
  patchMedicationLineWithPlannedAdminRules,
  isAdministerToPatientIntent,
  resolveMedicationOrderItemIntendedUtcForSubmit,
  stripMedicationFromOrderDraftPayload,
} from "./createOrderModal/createOrderMedicationDraft";
import { newOrderLineId } from "./createOrderModal/types";
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

type OrderTypeKey = OrderModalTab;
type OrderAuthorityFormSource = OrderSource | "";
type MedicationOrderMode = "DEFAULT" | "ER_ADMINISTER_ONLY" | "OUTPATIENT_RX_ONLY";
const ORDER_DRAFT_VERSION = "orders-drafting-v2";
const UNKNOWN_CLINICAL_DRAFT_USER_ID = "unknown-user";

function createOrderDraftSignature(payload: CreateOrderDraftPayload): string {
  return clinicalDraftPayloadSignature(payload);
}

const ORDER_TYPE_REVIEW_ORDER: OrderTypeKey[] = ["LAB", "IMAGING", "MEDICATION", "CARE"];

const ORDER_TYPE_REVIEW_ICON: Record<OrderTypeKey, string> = {
  LAB: "🧪",
  IMAGING: "🖼",
  MEDICATION: "💊",
  CARE: "🏥",
};

function normalizeRestoredOrderSetKey(value: unknown): OrderSetKey {
  if (typeof value === "string" && enterpriseOrderSetByCode(value)) {
    return value as OrderSetKey;
  }
  return getDefaultOrderSetKey();
}

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

function isOrderTypeKey(tab: CreateOrderModalTab): tab is OrderTypeKey {
  return tab !== "ORDER_SET";
}

function catalogLineLabel(
  item: CatalogSearchItem,
  language: SupportedLanguage,
  t: (key: string) => string
): string {
  return catalogSearchItemFullDisplayLine(item, language, t);
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
    const outpatientRxOnly = medicationOrderMode === "OUTPATIENT_RX_ONLY";
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
    }, outpatientRxOnly ? null : facilityTimeZone);
  }

  return null;
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
  const { facilityTimeZone, facilityClinicalTimeZoneReady, roles, userId } = useFacilityAndRoles();
  const hasRnStandingOrderAuthority = canUseRnOrderAuthority;
  const outpatientRxOnlyMedication = medicationOrderMode === "OUTPATIENT_RX_ONLY";
  const plannedAdminFacilityTimeZone =
    outpatientRxOnlyMedication || !facilityClinicalTimeZoneReady ? null : facilityTimeZone;
  const [carePickerQuery, setCarePickerQuery] = useState("");
  const [careCategoryFilter, setCareCategoryFilter] = useState<"" | CanonicalCareProcedureCategory>("");
  const [careApiMatches, setCareApiMatches] = useState<CareProcedurePickerRow[]>([]);
  const [careApiSearchLoading, setCareApiSearchLoading] = useState(false);
  const carePresets = useMemo(() => t("createOrderModal.carePresets").split("\n").filter(Boolean), [t]);
  const careOfflineMatches = useMemo(() => {
    const q = carePickerQuery.trim();
    if (q.length < 2 && !careCategoryFilter) return [];
    const locale = language === "fr" ? "fr" : "en";
    return searchCanonicalCareProcedures({
      q: q.length >= 2 ? q : "",
      locale,
      limit: 25,
      ...(careCategoryFilter ? { category: careCategoryFilter } : {}),
    }).map((row) => ({
      code: row.code,
      displayNameEn: row.displayNameEn,
      displayNameFr: row.displayNameFr,
      categoryLabelEn: canonicalCareProcedureCategoryLabel(row.category, "en"),
      categoryLabelFr: canonicalCareProcedureCategoryLabel(row.category, "fr"),
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
  const firstTab: OrderModalTab = outpatientRxOnlyMedication
    ? "MEDICATION"
    : !canUseMedicationCareTabs && (initialOrderTab === "MEDICATION" || initialOrderTab === "CARE")
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
  const defaultOrderSetKey = getDefaultOrderSetKeyForRole({
    canPrescribe,
    hasRnStandingOrderAuthority,
    roleCodes: roles,
  });
  const [selectedOrderSet, setSelectedOrderSet] = useState<OrderSetKey>(defaultOrderSetKey);
  const [selectedOrderSetItemKeys, setSelectedOrderSetItemKeys] = useState<string[]>(() =>
    checkedOrderSetItemKeys(defaultOrderSetKey)
  );
  const [orderSetBrowserAuthority, setOrderSetBrowserAuthority] = useState<EnterpriseOrderSetAuthority | null>(
    () => enterpriseOrderSetBrowserAuthorityForCode(defaultOrderSetKey)
  );
  const [orderSetBrowserCategory, setOrderSetBrowserCategory] = useState<EnterpriseOrderSetCategory | null>(
    () => enterpriseOrderSetBrowserCategoryForCode(defaultOrderSetKey)
  );
  const [orderSetSearchQuery, setOrderSetSearchQuery] = useState("");
  const [orderSetApplying, setOrderSetApplying] = useState(false);
  const [orderSetWarning, setOrderSetWarning] = useState<{ count: number } | null>(null);
  const [orderSetReviewActive, setOrderSetReviewActive] = useState(false);
  const [orderSetApplyContext, setOrderSetApplyContext] = useState<EnterpriseOrderSetApplyContext | null>(null);
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
    items?: D4c7ePersistedOrderItemLike[];
  } | null>(null);
  /** After multi-domain submit, RX success UI uses these lines instead of `formData.items` (active tab may differ). */
  const [rxIntentDisplayItems, setRxIntentDisplayItems] = useState<CreateOrderLineItem[] | null>(null);
  const [printRxError, setPrintRxError] = useState<string | null>(null);
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

  const orderTypes: CreateOrderModalTab[] = outpatientRxOnlyMedication
    ? ["MEDICATION"]
    : canUseMedicationCareTabs
      ? ["ORDER_SET", "LAB", "IMAGING", "MEDICATION", "CARE"]
      : ["ORDER_SET", "LAB", "IMAGING"];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queuedSync, setQueuedSync] = useState(false);
  const [providerDirectory, setProviderDirectory] = useState<ProviderDirectoryItem[]>([]);
  const [providerDirectoryLoaded, setProviderDirectoryLoaded] = useState(false);
  const [providerDirectoryFailed, setProviderDirectoryFailed] = useState(false);
  const [rnStandingVerbalProviderId, setRnStandingVerbalProviderId] = useState("");
  const [ivRouteConfirmations, setIvRouteConfirmations] = useState<Record<string, boolean>>({});
  const [erQuantityConfirmations, setErQuantityConfirmations] = useState<Record<string, boolean>>({});
  const [medicationAllergyDocSummary, setMedicationAllergyDocSummary] = useState<string | null>(null);
  const [medicationAllergySafetyAck, setMedicationAllergySafetyAck] = useState(false);
  const [activeCatalogKeys, setActiveCatalogKeys] = useState<Set<string>>(() => new Set());
  const [encounterOrdersSnapshot, setEncounterOrdersSnapshot] = useState<unknown[]>([]);
  const [customCareTaskDraft, setCustomCareTaskDraft] = useState("");
  const [careDuplicateHint, setCareDuplicateHint] = useState<string | null>(null);
  const [oxygenTherapyCompose, setOxygenTherapyCompose] = useState<OxygenTherapyDraft | null>(null);
  const [oxygenTherapyError, setOxygenTherapyError] = useState<string | null>(null);
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
      selectedOrderSet: defaultOrderSetKey,
      selectedOrderSetItemKeys: checkedOrderSetItemKeys(defaultOrderSetKey),
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
      setSelectedOrderSet(normalizeRestoredOrderSetKey(restored.selectedOrderSet));
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
    const authority = enterpriseOrderSetBrowserAuthorityForCode(key);
    if (authority) setOrderSetBrowserAuthority(authority);
    const category = enterpriseOrderSetBrowserCategoryForCode(key);
    if (category) setOrderSetBrowserCategory(category);
    setError(null);
  };

  const toggleOrderSetItem = (itemKey: string) => {
    setSelectedOrderSetItemKeys((current) =>
      current.includes(itemKey) ? current.filter((key) => key !== itemKey) : [...current, itemKey]
    );
  };

  const selectedOrderSetDefinition = enterpriseOrderSetByCode(selectedOrderSet);
  const selectedOrderSetUiItems = useMemo(
    () =>
      selectedOrderSetDefinition
        ? toOrderSetUiItems(selectedOrderSetDefinition, language).filter((item) =>
            selectedOrderSetItemKeys.includes(item.key)
          )
        : [],
    [language, selectedOrderSetDefinition, selectedOrderSetItemKeys]
  );
  const canApplyOrderSet =
    selectedOrderSetUiItems.length > 0 &&
    canRolePlaceEnterpriseOrderSet({
      rolesAllowed: selectedOrderSetDefinition?.rolesAllowed ?? ["PROVIDER", "ADMIN"],
      canPrescribe,
      roleCodes: roles,
      orderSetAuthority: selectedOrderSetDefinition
        ? resolveEnterpriseOrderSetAuthority(selectedOrderSetDefinition)
        : "PROVIDER_ORDER_SET",
      hasRnStandingOrderAuthority,
    });
  const requiresRnStandingVerbalAttestation = Boolean(
    orderSetReviewActive &&
      orderSetApplyContext &&
      requiresVerbalOrderAttestationForRole({
        orderSetAuthority: orderSetApplyContext.orderSetAuthority,
        canPrescribe,
        hasRnStandingOrderAuthority,
        roleCodes: roles,
      })
  );
  const rnStandingVerbalAttestationComplete =
    Boolean(rnStandingVerbalProviderId.trim()) &&
    formData.readbackConfirmed === true &&
    Boolean(userId.trim());
  const submitBlockedByRnStandingVerbal =
    requiresRnStandingVerbalAttestation && !rnStandingVerbalAttestationComplete;
  const isRnAuthorityTab =
    canUseRnOrderAuthority && (activeTab === "MEDICATION" || activeTab === "CARE");
  const rnAuthorityModeValid =
    (formData.orderSource === "VERBAL_ORDER" &&
      formData.prescriberName.trim().length > 0 &&
      formData.readbackConfirmed === true) ||
    (formData.orderSource === "NURSING_PROTOCOL" && formData.protocolName.trim().length > 0);
  const providerDirectoryDatalistId = `provider-directory-${encounterId}`;

  useEffect(() => {
    if (
      (!isRnAuthorityTab && !requiresRnStandingVerbalAttestation) ||
      formData.orderSource !== "VERBAL_ORDER" ||
      providerDirectoryLoaded
    ) {
      return;
    }
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
  }, [
    facilityId,
    formData.orderSource,
    isRnAuthorityTab,
    providerDirectoryLoaded,
    requiresRnStandingVerbalAttestation,
  ]);

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

  const validateRnStandingVerbalAttestationForSubmit = (): string | null => {
    if (!requiresRnStandingVerbalAttestation) return null;
    if (!rnStandingVerbalProviderId.trim()) {
      return t("createOrderModal.rnStandingVerbal.errors.providerRequired");
    }
    if (formData.readbackConfirmed !== true) {
      return t("createOrderModal.rnStandingVerbal.errors.readbackRequired");
    }
    if (!userId.trim()) {
      return t("createOrderModal.rnStandingVerbal.errors.userRequired");
    }
    return null;
  };

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
      if (oxygenTherapyCompose) return t("createOrderModal.oxygen.errInvalid");
      const incompleteOxygen = items.some((it) => {
        if (it._careQuickKey !== "oxygen_therapy" && it._enterpriseProcedureId !== OXYGEN_THERAPY_PROCEDURE_CODE) {
          return false;
        }
        if (!it.notes?.trim()) return true;
        if (it._oxygenTherapyDraft) return !validateOxygenTherapyDraft(it._oxygenTherapyDraft).ok;
        return false;
      });
      if (incompleteOxygen) return t("createOrderModal.oxygen.errInvalid");
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
    /** Persisted enriched lines from POST /orders (D4C.7E print projection). */
    items?: D4c7ePersistedOrderItemLike[];
  };

  const postOrderDomainApi = async (
    type: OrderTypeKey,
    items: CreateOrderLineItem[],
    summaryAtSubmit: string | null
  ): Promise<OrderCreateResponse> => {
    const allergyAckForApi = type === "MEDICATION" && Boolean(summaryAtSubmit) && medicationAllergySafetyAck;
    const enterpriseOrderSetProvenance = resolveOrderSetProvenanceForSubmit({
      applyContext: orderSetApplyContext,
      orderSetReviewActive,
      orderType: type,
      items,
      canPrescribe,
      hasRnStandingOrderAuthority,
      roleCodes: roles,
      userId,
      ...(requiresRnStandingVerbalAttestation && rnStandingVerbalAttestationComplete
        ? {
            verbalOrderAttestation: buildVerbalOrderAttestation({
              verbalOrderReceivedFromProviderId: rnStandingVerbalProviderId,
              verbalOrderReceivedFromProviderName: formData.prescriberName,
              readBackConfirmed: true,
              verbalOrderAttestedAt: new Date().toISOString(),
              verbalOrderAttestedBy: userId,
            }),
          }
        : {}),
    });
    const payloadResult = prepareCreateOrderDomainPayloadForSubmit(
      buildCreateOrderDomainPayload({
        type,
        priority: formData.priority,
        notes: formData.notes,
        prescriberName: formData.prescriberName,
        prescriberLicense: formData.prescriberLicense,
        prescriberContact: formData.prescriberContact,
        items:
          erAdministerOnlyMedication && type === "MEDICATION"
            ? items.map((item) => ({ ...item, medicationFulfillmentIntent: "ADMINISTER_CHART" as const }))
            : outpatientRxOnlyMedication && type === "MEDICATION"
              ? items.map((item) => ({
                  ...item,
                  medicationFulfillmentIntent: "PHARMACY_DISPENSE" as const,
                }))
            : items,
        authority: authorityPayloadFieldsForType(type),
        safetyAcknowledgedMedicationAllergies: allergyAckForApi ? true : undefined,
        facilityTimeZone,
        enterpriseOrderSetProvenance,
      })
    );
    if (!payloadResult.ok) {
      throw Object.assign(new Error(payloadResult.message), { status: 400 });
    }
    return (await apiFetch(`/encounters/${encounterId}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadResult.payload),
      facilityId,
    })) as OrderCreateResponse;
  };

  const persistOrderSetDraftAfterDomainSubmit = (input: {
    submittedType: OrderTypeKey;
    nextStagedItems: Record<OrderTypeKey, CreateOrderLineItem[]>;
    nextReviewTab: OrderTypeKey | null;
    formDataSnapshot: CreateOrderDraftPayload["formData"];
  }) => {
    if (typeof window === "undefined") return;
    if (!input.nextReviewTab) {
      clearCreateOrderDraftSnapshot({ storage: window.localStorage, draftKey });
      setDraftSavedLocallyAt(null);
      setDraftRestoredAt(null);
      return;
    }
    const persisted = persistCreateOrderDraftSnapshot({
      storage: window.localStorage,
      draftKey,
      draftScope,
      payload: buildDraftPayloadAfterDomainSubmit({
        submittedType: input.submittedType,
        nextStagedItems: input.nextStagedItems,
        nextReviewTab: input.nextReviewTab,
        activeTab: input.nextReviewTab,
        selectedOrderSet,
        selectedOrderSetItemKeys,
        orderSetReviewActive: true,
        formData: {
          ...input.formDataSnapshot,
          type: input.nextReviewTab,
          items: [...input.nextStagedItems[input.nextReviewTab]],
        },
      }),
    });
    setDraftSavedLocallyAt(persisted.savedLocallyAt);
    setDraftRestoredAt(null);
  };

  const resolveOrderSetItems = async (items: OrderSetUiItem[]): Promise<ResolvedOrderSetItems> =>
    resolveEnterpriseOrderSetItems({
      items,
      facilityId,
      language,
      canPrescribe,
      allowRnStandingOrderSetApply: Boolean(
        hasRnStandingOrderAuthority &&
          selectedOrderSetDefinition &&
          isRnStandingOrderSet(selectedOrderSetDefinition)
      ),
      orderSetCode: selectedOrderSet,
      catalogItemToOrderLine: (item, lang) =>
        catalogItemToOrderLine(item, lang, t, medicationOrderMode, plannedAdminFacilityTimeZone),
    });

  const applyOrderSet = async () => {
    if (!canApplyOrderSet || orderSetApplying) return;

    setOrderSetApplying(true);
    setError(null);

    try {
      const resolved = await resolveOrderSetItems(selectedOrderSetUiItems);
      if (selectedOrderSetDefinition) {
        setOrderSetApplyContext(
          buildEnterpriseOrderSetApplyContext({
            set: selectedOrderSetDefinition,
            selectedItemKeys: selectedOrderSetItemKeys,
            skippedItems: toEnterpriseOrderSetSkippedItems(resolved.skipped, selectedOrderSetItemKeys),
            appliedAt: new Date().toISOString(),
          })
        );
      }
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
        const skippedSummary = formatOrderSetSkippedSummary({
          skipped: resolved.skipped,
          itemsByKey: new Map(selectedOrderSetUiItems.map((item) => [item.key, item])),
          t,
        });
        setError(skippedSummary ?? t("ordersets.apply.noMatch"));
        return;
      }

      setActiveTab(nextTab);
      const verbalOrderResetPatch =
        selectedOrderSetDefinition &&
        isRnStandingOrderSet(selectedOrderSetDefinition) &&
        hasRnStandingOrderAuthority
          ? {
              orderSource: "VERBAL_ORDER" as const,
              protocolName: "",
              prescriberName: "",
              readbackConfirmed: false,
            }
          : {};
      setRnStandingVerbalProviderId("");
      setFormData((fd) => ({
        ...fd,
        type: nextTab,
        items: nextStagedItems[nextTab],
        ...verbalOrderResetPatch,
      }));

      if (resolved.skipped.length > 0) {
        const skippedSummary = formatOrderSetSkippedSummary({
          skipped: resolved.skipped,
          itemsByKey: new Map(selectedOrderSetUiItems.map((item) => [item.key, item])),
          t,
        });
        setError(skippedSummary ?? t("ordersets.apply.skipped").replace("{items}", resolved.skipped.map((item) => selectedOrderSetUiItems.find((ui) => ui.key === item.key)?.displayLabel ?? item.key).join(", ")));
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
    setStagedItems((current) => {
      setFormData((fd) => ({ ...fd, type: tab, items: [...current[tab]] }));
      return current;
    });
    setError(null);
  };

  const catalogTypeForTab = (tab: OrderModalTab): "LAB_TEST" | "IMAGING_STUDY" | "MEDICATION" => {
    if (tab === "LAB") return "LAB_TEST";
    if (tab === "IMAGING") return "IMAGING_STUDY";
    return "MEDICATION";
  };

  const addCareLine = (
    label: string,
    options?: {
      quickKey?: "ekg_workflow" | "laceration_kit" | "oxygen_therapy";
      enterpriseProcedureId?: string;
      notes?: string;
      oxygenTherapyDraft?: OxygenTherapyDraft;
    }
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
            ...(options?.notes ? { notes: options.notes } : {}),
            ...(options?.quickKey ? { _careQuickKey: options.quickKey } : {}),
            ...(options?.oxygenTherapyDraft ? { _oxygenTherapyDraft: options.oxygenTherapyDraft } : {}),
            ...(options?.enterpriseProcedureId ? { _enterpriseProcedureId: options.enterpriseProcedureId } : {}),
          },
        ],
      };
    });
  };

  const openOxygenTherapyCompose = () => {
    setOxygenTherapyCompose(defaultOxygenTherapyDraft());
    setOxygenTherapyError(null);
    setCareDuplicateHint(null);
  };

  const cancelOxygenTherapyCompose = () => {
    setOxygenTherapyCompose(null);
    setOxygenTherapyError(null);
  };

  const confirmOxygenTherapyOrder = () => {
    if (!oxygenTherapyCompose) return;
    const locale = language === "fr" ? "fr" : "en";
    const validation = validateOxygenTherapyDraft(oxygenTherapyCompose);
    if (!validation.ok) {
      setOxygenTherapyError(t("createOrderModal.oxygen.errInvalid"));
      return;
    }
    const manualLabel = buildOxygenTherapyManualLabel(oxygenTherapyCompose, locale);
    const notes = buildOxygenTherapyOrderNotes(oxygenTherapyCompose, locale);
    const priorityBump = oxygenTherapyOrderPriority(oxygenTherapyCompose);
    setFormData((fd) => {
      if (careLabelExistsInItems(fd.items, manualLabel)) {
        queueMicrotask(() => setCareDuplicateHint(t("createOrderModal.careDuplicateAlreadySelected")));
        return fd;
      }
      queueMicrotask(() => setCareDuplicateHint(null));
      return {
        ...fd,
        ...(priorityBump === "STAT" ? { priority: "STAT" as const } : {}),
        items: [
          ...fd.items,
          {
            _lineId: newOrderLineId(),
            isManual: true,
            catalogItemType: "CARE",
            manualLabel,
            _label: manualLabel,
            notes,
            _careQuickKey: "oxygen_therapy" as const,
            _enterpriseProcedureId: OXYGEN_THERAPY_PROCEDURE_CODE,
            _oxygenTherapyDraft: oxygenTherapyCompose,
          },
        ],
      };
    });
    setOxygenTherapyCompose(null);
    setOxygenTherapyError(null);
    setCarePickerQuery("");
  };

  const addCareCatalogProcedure = (procedure: CareProcedurePickerRow) => {
    if (procedure.code === OXYGEN_THERAPY_PROCEDURE_CODE) {
      openOxygenTherapyCompose();
      setCarePickerQuery("");
      return;
    }
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

  const addCarePresetLine = (label: string) => {
    const locale = language === "fr" ? "fr" : "en";
    const oxygenDef = enterpriseProcedureById(OXYGEN_THERAPY_PROCEDURE_CODE);
    if (oxygenDef) {
      const oxygenLabel = resolveEnterpriseProcedureDisplayName(oxygenDef, locale);
      if (careLabelNorm(label) === careLabelNorm(oxygenLabel)) {
        openOxygenTherapyCompose();
        return;
      }
    }
    addCareLine(label);
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
        : outpatientRxOnlyMedication && line.catalogItemType === "MEDICATION"
          ? { ...line, medicationFulfillmentIntent: "PHARMACY_DISPENSE" as const }
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
      } else if (outpatientRxOnlyMedication) {
        patched = { ...patched, medicationFulfillmentIntent: "PHARMACY_DISPENSE" as const };
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
    setOrderSetApplyContext(null);
    setRnStandingVerbalProviderId("");
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

    const rnStandingVerbalError = validateRnStandingVerbalAttestationForSubmit();
    if (rnStandingVerbalError) {
      setError(rnStandingVerbalError);
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
      /** Snapshot before clearing form — D4C.7E print must not depend on emptied form state. */
      const medItemsSnapshot =
        submittedType === "MEDICATION" ? ([...formData.items] as CreateOrderLineItem[]) : null;

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
      if (nextReviewTab) {
        setActiveTab(nextReviewTab);
        setFormData((fd) => ({ ...fd, type: nextReviewTab, items: [...nextStagedItems[nextReviewTab]] }));
      } else if (formData.type === submittedType) {
        setFormData((fd) => ({ ...fd, items: [] }));
      }
      if (submittedType === "MEDICATION") {
        setMedicationAllergySafetyAck(false);
      }
      if (!nextReviewTab) {
        setOrderSetReviewActive(false);
        setOrderSetApplyContext(null);
        setRnStandingVerbalProviderId("");
        setSelectedOrderSetItemKeys(checkedOrderSetItemKeys(selectedOrderSet));
        if (typeof window !== "undefined") {
          clearCreateOrderDraftSnapshot({ storage: window.localStorage, draftKey });
        }
        setDraftRestoredAt(null);
        setDraftSavedLocallyAt(null);
      } else {
        persistOrderSetDraftAfterDomainSubmit({
          submittedType,
          nextStagedItems,
          nextReviewTab,
          formDataSnapshot: formData,
        });
      }

      setPrintRxError(null);
      if ((res as OrderCreateResponse)?.queued) {
        setRxIntentDisplayItems(null);
        setQueuedSync(true);
        setOrderSuccess(true);
      } else if (submittedType === "MEDICATION") {
        setCreatedOrder(res);
        setRxIntentDisplayItems(medItemsSnapshot);
        setRxSuccess(true);
      } else {
        setRxIntentDisplayItems(null);
        setOrderSuccess(true);
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      if (isEncounterMustBeOpenForOrderError(raw)) {
        await onRefetchEncounter?.();
      }
      setError(mapOrderCreateApiError(err, t, language));
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

    const rnStandingVerbalError = validateRnStandingVerbalAttestationForSubmit();
    if (rnStandingVerbalError) {
      setError(rnStandingVerbalError);
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
          const reason = mapOrderCreateApiError(err, t, language);
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
      if (nextReviewTab) {
        setActiveTab(nextReviewTab);
        setFormData((fd) => ({ ...fd, type: nextReviewTab, items: [...nextStagedItems[nextReviewTab]] }));
        persistOrderSetDraftAfterDomainSubmit({
          submittedType: successfulTypes[successfulTypes.length - 1] ?? "LAB",
          nextStagedItems,
          nextReviewTab,
          formDataSnapshot: formData,
        });
      } else {
        setOrderSetReviewActive(false);
        setOrderSetApplyContext(null);
        setRnStandingVerbalProviderId("");
        setSelectedOrderSetItemKeys(checkedOrderSetItemKeys(selectedOrderSet));
        if (typeof window !== "undefined") {
          clearCreateOrderDraftSnapshot({ storage: window.localStorage, draftKey });
        }
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
      setError(mapOrderCreateApiError(err, t, language));
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
              const snapshotItems = (rxIntentDisplayItems ?? formData.items) as D4c7ePersistedOrderItemLike[];
              const persistedItems =
                Array.isArray(createdOrder.items) && createdOrder.items.length > 0
                  ? (createdOrder.items as D4c7ePersistedOrderItemLike[])
                  : snapshotItems;
              const intents = snapshotItems.map(
                (it) => it.medicationFulfillmentIntent ?? "PHARMACY_DISPENSE"
              );
              const allAdminister =
                snapshotItems.length > 0 && intents.every((x) => x === "ADMINISTER_CHART");
              const allPharmacy =
                snapshotItems.length > 0 && intents.every((x) => x === "PHARMACY_DISPENSE");
              return (
                <>
                  <p style={{ fontSize: 15, color: "#1b5e20", margin: "0 0 16px" }}>
                    {allAdminister
                      ? t("createOrderModal.rxAllAdministerLine")
                      : allPharmacy
                        ? t("createOrderModal.rxAllPharmacyLine")
                        : t("createOrderModal.rxMixedLine")}
                  </p>
                  {printRxError ? (
                    <p role="alert" style={{ margin: "0 0 12px", fontSize: 13, color: "#b91c1c" }}>
                      {printRxError}
                    </p>
                  ) : null}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {!allAdminister ? (
              <button
                type="button"
                onClick={() => {
                  setPrintRxError(null);
                  const lang = language === "en" ? "en" : "fr";
                  const gate = validateOutpatientPrescriptionPrintProjection(persistedItems, lang);
                  if (!gate.ok) {
                    setPrintRxError(t(gate.reasonKey));
                    return;
                  }
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
                      items: gate.lines,
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
              ) : null}
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
                  setPrintRxError(null);
                  setLastBatchAllStagedSuccess(false);
                  clearMedicationOrderLocalState();
                  onSuccess();
                }}
                style={{
                  padding: "10px 18px",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  backgroundColor: allAdminister ? "#1a1a1a" : "#f5f5f5",
                  color: allAdminister ? "#fff" : undefined,
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
              data-testid={outpatientRxOnlyMedication ? "create-order-modal-rx-only-tabs" : "create-order-modal-tabs"}
              style={{
                display: "flex",
                gap: 6,
                marginBottom: 14,
                paddingBottom: 10,
                borderBottom: "1px solid #e5e5e5",
                flexWrap: "wrap",
              }}
            >
              {outpatientRxOnlyMedication ? (
                <p style={{ margin: 0, fontSize: 13, color: "#475569", fontWeight: 600 }}>
                  {t("clinicCareD4c7g.rx.composerTitle")}
                </p>
              ) : null}
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
                      ...(outpatientRxOnlyMedication
                        ? { display: orderTypes.length === 1 ? "none" : undefined }
                        : {}),
                    }}
                  >
                    {tabLabel(tab)}
                  </button>
                );
              })}
            </div>
            {outpatientRxOnlyMedication ? (
              <p
                style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}
                data-testid="create-order-modal-rx-only-hint"
              >
                {t("clinicCareD4c7g.rx.composerHint")}
              </p>
            ) : null}

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
                      selectedOrderSetDefinition
                        ? resolveOrderSetTitle(selectedOrderSetDefinition, language)
                        : selectedOrderSet
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
                  {requiresRnStandingVerbalAttestation ? (
                    <div
                      data-testid="rn-standing-verbal-attestation"
                      style={{
                        marginTop: 12,
                        paddingTop: 12,
                        borderTop: "1px solid #e2e8f0",
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#334155", marginBottom: 8 }}>
                        {t("createOrderModal.rnStandingVerbal.sectionTitle")}
                      </div>
                      <label style={{ display: "block", marginBottom: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                          {t("createOrderModal.rnStandingVerbal.providerLabel")}
                        </div>
                        <select
                          value={rnStandingVerbalProviderId}
                          onChange={(event) => {
                            const providerId = event.target.value;
                            const provider = providerDirectory.find((row) => row.id === providerId);
                            setRnStandingVerbalProviderId(providerId);
                            setFormData((fd) => ({
                              ...fd,
                              orderSource: "VERBAL_ORDER",
                              protocolName: "",
                              prescriberName: provider?.name ?? "",
                            }));
                          }}
                          data-testid="rn-standing-verbal-provider-select"
                          style={{
                            width: "100%",
                            boxSizing: "border-box",
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: "1px solid #cbd5e1",
                            fontSize: 13,
                            background: "#fff",
                          }}
                        >
                          <option value="">{t("createOrderModal.rnStandingVerbal.providerPlaceholder")}</option>
                          {providerDirectory.map((provider) => (
                            <option key={provider.id} value={provider.id}>
                              {provider.name}
                            </option>
                          ))}
                        </select>
                        {providerDirectoryFailed ? (
                          <div style={{ fontSize: 12, color: "#b45309", marginTop: 6 }}>
                            {t("createOrderModal.rnStandingVerbal.providerDirectoryFailed")}
                          </div>
                        ) : null}
                      </label>
                      <label
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "flex-start",
                          fontSize: 13,
                          color: "#334155",
                          lineHeight: 1.45,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.readbackConfirmed === true}
                          onChange={(event) =>
                            setFormData((fd) => ({
                              ...fd,
                              orderSource: "VERBAL_ORDER",
                              readbackConfirmed: event.target.checked,
                            }))
                          }
                          data-testid="rn-standing-verbal-readback"
                          style={{ width: 14, height: 14, marginTop: 3 }}
                        />
                        <span>{t("createOrderModal.rnStandingVerbal.readbackLabel")}</span>
                      </label>
                      {submitBlockedByRnStandingVerbal ? (
                        <p style={{ margin: "10px 0 0", fontSize: 12, color: "#b45309", fontWeight: 600 }}>
                          {t("createOrderModal.rnStandingVerbal.submitBlockedHelp")}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
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
                  <EnterpriseOrderSetBrowser
                    selected={selectedOrderSet}
                    checkedItemKeys={selectedOrderSetItemKeys}
                    onSelect={selectOrderSet}
                    onToggleItem={toggleOrderSetItem}
                    onApply={applyOrderSet}
                    canApply={canApplyOrderSet}
                    applying={orderSetApplying}
                    onOpenEkgDocumentation={onOpenEkgProcedureDocumentation}
                    locale={language}
                    canPrescribe={canPrescribe}
                    hasRnStandingOrderAuthority={hasRnStandingOrderAuthority}
                    roleCodes={roles}
                    browserAuthority={orderSetBrowserAuthority}
                    onBrowserAuthorityChange={setOrderSetBrowserAuthority}
                    browserCategory={orderSetBrowserCategory}
                    onBrowserCategoryChange={setOrderSetBrowserCategory}
                    searchQuery={orderSetSearchQuery}
                    onSearchQueryChange={setOrderSetSearchQuery}
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
                          onClick={() => addCarePresetLine(label)}
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
                    {oxygenTherapyCompose ? (
                      <div data-testid="oxygen-therapy-compose-panel">
                        <OxygenTherapyOrderForm
                          draft={oxygenTherapyCompose}
                          onChange={(draft) => {
                            setOxygenTherapyCompose(draft);
                            setOxygenTherapyError(null);
                          }}
                          previewLocale={language === "fr" ? "fr" : "en"}
                        />
                        {oxygenTherapyError ? (
                          <div
                            role="alert"
                            style={{
                              marginBottom: 8,
                              fontSize: 12,
                              color: "#991b1b",
                            }}
                          >
                            {oxygenTherapyError}
                          </div>
                        ) : null}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                          <button
                            type="button"
                            onClick={confirmOxygenTherapyOrder}
                            data-testid="oxygen-therapy-add-button"
                            style={{
                              padding: "8px 14px",
                              fontSize: 13,
                              fontWeight: 600,
                              border: "1px solid #1d4ed8",
                              borderRadius: 6,
                              background: "#1d4ed8",
                              color: "#fff",
                              cursor: "pointer",
                            }}
                          >
                            {t("createOrderModal.oxygen.addButton")}
                          </button>
                          <button
                            type="button"
                            onClick={cancelOxygenTherapyCompose}
                            style={{
                              padding: "8px 14px",
                              fontSize: 13,
                              fontWeight: 600,
                              border: "1px solid #cbd5e1",
                              borderRadius: 6,
                              background: "#fff",
                              color: "#334155",
                              cursor: "pointer",
                            }}
                          >
                            {t("createOrderModal.oxygen.cancelButton")}
                          </button>
                        </div>
                      </div>
                    ) : null}
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
                      limit={activeTab === "MEDICATION" ? 40 : 20}
                    />
                    {!(erAdministerOnlyMedication && activeTab === "MEDICATION") ? (
                      <ManualOrderEntry
                        tab={activeTab}
                        onAdd={handleAddManualLine}
                        medicationOrderMode={medicationOrderMode}
                      />
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
                    disabled={loading || submitBlockedByRnStandingVerbal}
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
                    disabled={loading || submitBlockedByRnStandingVerbal}
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
