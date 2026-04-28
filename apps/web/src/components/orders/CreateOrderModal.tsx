"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { apiFetch, asApiObject, parseApiResponse } from "@/lib/apiClient";
import { isEncounterMustBeOpenForOrderError, normalizeUserFacingError } from "@/lib/userFacingError";
import type { OrderCreateDto } from "@medora/shared";
import { SharedCatalogAutocomplete } from "@/components/catalog/SharedCatalogAutocomplete";
import { printRx } from "@/components/pharmacy/RxPrintLayout";
import { searchCatalog } from "@/lib/catalogSearchApi";
import type { CatalogSearchItem, CatalogType } from "@/lib/catalogSearchTypes";
import { catalogSearchItemFullDisplayLine } from "@/lib/catalogDisplayLabel";
import { OrderPriorityField } from "./createOrderModal/OrderPriorityField";
import { SelectedLabItems } from "./createOrderModal/SelectedLabItems";
import { SelectedImagingItems } from "./createOrderModal/SelectedImagingItems";
import { SelectedMedicationItems } from "./createOrderModal/SelectedMedicationItems";
import { ManualOrderEntry } from "./createOrderModal/ManualOrderEntry";
import type { CreateOrderLineItem, CreateOrderModalTab, OrderModalTab } from "./createOrderModal/types";
import { newOrderLineId } from "./createOrderModal/types";
import { useI18n } from "@/lib/i18n";
import type { SupportedLanguage } from "@/i18n/config";

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

const ORDER_TYPE_REVIEW_ORDER: OrderTypeKey[] = ["LAB", "IMAGING", "MEDICATION", "CARE"];

const ORDER_SET_KEYS: OrderSetKey[] = [
  "chestPain",
  "abdominalPain",
  "sepsis",
  "trauma",
  "respiratoryDistress",
];

const ORDER_SET_ITEMS: Record<OrderSetKey, OrderSetItem[]> = {
  chestPain: [
    { key: "cbc", type: "LAB", catalogType: "LAB_TEST", catalogCode: "CBC", catalogCodes: ["ER_CBC"] },
    { key: "cmp", type: "LAB", catalogType: "LAB_TEST", catalogCode: "CMP", catalogCodes: ["ER_CMP"] },
    { key: "troponin", type: "LAB", catalogType: "LAB_TEST", catalogCode: "TROPONIN", catalogCodes: ["TROP", "ER_TROP"] },
    { key: "chestXray", type: "IMAGING", catalogType: "IMAGING_STUDY", catalogCode: "XR_CHEST" },
    { key: "ekgComingSoon", type: "CARE", comingSoon: true },
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
    { key: "ctHead", type: "IMAGING", catalogType: "IMAGING_STUDY", catalogCode: "CT_HEAD" },
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

function mapOrderCreateError(err: unknown, t: (k: string) => string): string {
  const msg = err instanceof Error ? err.message : "";
  return normalizeUserFacingError(msg.trim() || null) || t("createOrderModal.mapOrderCreateError");
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
  t: (key: string) => string
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
    return {
      _lineId: newOrderLineId(),
      isManual: false,
      catalogItemId: item.id,
      catalogItemType: "MEDICATION",
      quantity: 30,
      notes: "",
      strength: item.metadata?.strength ?? undefined,
      _label: catalogLineLabel(item, language, t),
      _dosageForm: item.metadata?.dosageForm ?? undefined,
      _route: item.metadata?.route ?? undefined,
      refillCount: 0,
      medicationFulfillmentIntent: "PHARMACY_DISPENSE",
    };
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
  t,
}: {
  selected: OrderSetKey;
  checkedItemKeys: string[];
  onSelect: (key: OrderSetKey) => void;
  onToggleItem: (itemKey: string) => void;
  onApply: () => void;
  canApply: boolean;
  applying: boolean;
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
  items: CreateOrderLineItem[]
): OrderCreateDto {
  const rootNotes = notes.trim() || undefined;

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
      items: items.map((it) => ({
        catalogItemId: null,
        catalogItemType: "CARE" as const,
        manualLabel: (it.manualLabel ?? it._label).trim(),
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
    items: items.map((it) => {
      const raw = it.intendedAdministrationAt?.trim();
      const intendedDate = raw ? new Date(raw) : undefined;
      const baseManual = {
        catalogItemId: null,
        catalogItemType: "MEDICATION" as const,
        manualLabel: (it.manualLabel ?? it._label).trim(),
        quantity: it.quantity!,
        notes: it.notes?.trim() || undefined,
        strength: it.strength?.trim() || undefined,
        refillCount: it.refillCount != null && it.refillCount >= 0 ? it.refillCount : undefined,
        medicationFulfillmentIntent: it.medicationFulfillmentIntent ?? "PHARMACY_DISPENSE",
        ...(intendedDate ? { intendedAdministrationAt: intendedDate } : {}),
      };
      const baseCatalog = {
        catalogItemId: it.catalogItemId!,
        catalogItemType: "MEDICATION" as const,
        quantity: it.quantity!,
        notes: it.notes?.trim() || undefined,
        strength: it.strength?.trim() || undefined,
        refillCount: it.refillCount != null && it.refillCount >= 0 ? it.refillCount : undefined,
        medicationFulfillmentIntent: it.medicationFulfillmentIntent ?? "PHARMACY_DISPENSE",
        ...(intendedDate ? { intendedAdministrationAt: intendedDate } : {}),
      };
      return it.isManual || !it.catalogItemId ? baseManual : baseCatalog;
    }),
  };
}

export function CreateOrderModal({
  encounterId,
  facilityId,
  canPrescribe,
  encounter,
  initialOrderTab = "LAB",
  onClose,
  onSuccess,
  /** Après constat serveur « consultation fermée », re-synchronise l’état parent (évite badge Ouverte obsolète). */
  onRefetchEncounter,
  /** Si onglet initial CARE : préremplit une ligne manuelle (ex. action rapide). */
  initialCareManualLabel,
}: {
  encounterId: string;
  facilityId: string;
  canPrescribe: boolean;
  encounter?: { patient?: { firstName?: string; lastName?: string; mrn?: string } };
  initialOrderTab?: OrderModalTab;
  initialCareManualLabel?: string | null;
  onClose: () => void;
  onSuccess: () => void;
  onRefetchEncounter?: () => Promise<void>;
}) {
  const { language, t } = useI18n();
  const carePresets = useMemo(() => t("createOrderModal.carePresets").split("\n").filter(Boolean), [t]);
  const firstTab: OrderModalTab =
    !canPrescribe && (initialOrderTab === "MEDICATION" || initialOrderTab === "CARE") ? "LAB" : initialOrderTab;

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
  const [orderSetReviewActive, setOrderSetReviewActive] = useState(false);
  const [nextStagedTabAfterSuccess, setNextStagedTabAfterSuccess] = useState<OrderTypeKey | null>(null);
  const [submittedOrderType, setSubmittedOrderType] = useState<OrderTypeKey | null>(null);
  const [createdOrder, setCreatedOrder] = useState<{
    id: string;
    createdAt: string;
    prescriberName?: string;
    prescriberLicense?: string;
    prescriberContact?: string;
  } | null>(null);
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
    items: initialOrderItems,
  });

  const orderTypes: CreateOrderModalTab[] = canPrescribe
    ? ["ORDER_SET", "LAB", "IMAGING", "MEDICATION", "CARE"]
    : ["ORDER_SET", "LAB", "IMAGING"];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queuedSync, setQueuedSync] = useState(false);
  const prescriberPrefilled = useRef(false);

  /** Préremplir le prescripteur pour le flux ordonnance (médecin / admin connecté). */
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

  const resolveOrderSetItems = async (items: OrderSetItem[]): Promise<ResolvedOrderSetItems> => {
    const resolved = emptyResolvedOrderSetItems();

    for (const orderSetItem of items) {
      if (orderSetItem.comingSoon) continue;

      if ((orderSetItem.type === "MEDICATION" || orderSetItem.type === "CARE") && !canPrescribe) {
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

      const line = catalogItemToOrderLine(catalogItem, language, t);
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
          ? "ordersets.apply.nonPrescriber"
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

  const addCarePreset = (label: string) => {
    setFormData((fd) => ({
      ...fd,
      items: [
        ...fd.items,
        {
          _lineId: newOrderLineId(),
          isManual: true,
          catalogItemType: "CARE",
          manualLabel: label,
          _label: label,
        },
      ],
    }));
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
      return {
        ...fd,
        items: [
          ...fd.items,
          {
            _lineId: newOrderLineId(),
            isManual: false,
            catalogItemId: item.id,
            catalogItemType: "MEDICATION",
            quantity: 30,
            notes: "",
            strength: item.metadata?.strength ?? undefined,
            _label: catalogLineLabel(item, language, t),
            _dosageForm: item.metadata?.dosageForm ?? undefined,
            _route: item.metadata?.route ?? undefined,
            refillCount: 0,
            medicationFulfillmentIntent: "PHARMACY_DISPENSE",
          },
        ],
      };
    });
  };

  const handleAddManualLine = (line: CreateOrderLineItem) => {
    setFormData((fd) => ({ ...fd, items: [...fd.items, line] }));
  };

  const removeItem = (idx: number) => {
    setFormData((fd) => ({ ...fd, items: fd.items.filter((_, i) => i !== idx) }));
  };

  const patchMedItem = (idx: number, patch: Partial<CreateOrderLineItem>) => {
    setFormData((fd) => {
      const next = [...fd.items];
      next[idx] = { ...next[idx], ...patch };
      return { ...fd, items: next };
    });
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

    if (formData.type === "MEDICATION") {
      if (!formData.prescriberName.trim()) {
        setError(t("createOrderModal.errPrescriberRequired"));
        return;
      }
      const missingQty = formData.items.some((it) => it.quantity == null || it.quantity < 1);
      if (missingQty) {
        setError(t("createOrderModal.errQuantityRequired"));
        return;
      }
    }

    if (formData.type === "LAB") {
      const catalogLineMissingId = formData.items.some((it) => !it.isManual && !it.catalogItemId?.trim());
      if (catalogLineMissingId) {
        console.warn(
          "[CreateOrderModal] Lab line marked as catalog (not manual) but catalogItemId is missing — submit blocked",
          formData.items.filter((it) => !it.isManual && !it.catalogItemId?.trim())
        );
        setError(t("createOrderModal.errLabCatalogIdMissing"));
        return;
      }
    }

    setLoading(true);
    setError(null);

    const payload = buildPayload(
      formData.type,
      formData.priority,
      formData.notes,
      formData.prescriberName,
      formData.prescriberLicense,
      formData.prescriberContact,
      formData.items
    );

    try {
      /**
       * Cause du décalage UI / API : l’en-tête peut afficher « Ouverte » depuis un cache offline
       * (`encounter_summaries`) ou un état React non rafraîchi alors que le serveur a déjà clôturé.
       * Re-vérification synchrone avec la source de vérité avant POST (même règle que l’API).
       */
      try {
        const latestRaw = await apiFetch(`/encounters/${encounterId}`, { facilityId });
        const latest = asApiObject(latestRaw) as { status?: string } | null;
        // Ne bloquer que si la source de vérité indique explicitement un statut autre qu’OPEN.
        if (latest && typeof latest.status === "string" && latest.status !== "OPEN") {
          await onRefetchEncounter?.();
          setError(t("createOrderModal.errEncounterClosed"));
          return;
        }
      } catch {
        /* re-vérification indisponible : l’API tranchera au POST */
      }

      const res = (await apiFetch(`/encounters/${encounterId}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        facilityId,
      })) as {
        id: string;
        createdAt: string;
        prescriberName?: string;
        prescriberLicense?: string;
        prescriberContact?: string;
      };

      const submittedType = formData.type;
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
      if (!nextReviewTab) {
        setOrderSetReviewActive(false);
      }

      if ((res as any)?.queued) {
        setQueuedSync(true);
        setOrderSuccess(true);
      } else if (formData.type === "MEDICATION") {
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
      setError(mapOrderCreateError(err, t));
    } finally {
      setLoading(false);
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
    submittedOrderType && nextStagedTabAfterSuccess
      ? t("createOrderModal.successCreatedNext")
          .replace("{createdType}", domainLabel(submittedOrderType))
          .replace("{nextType}", domainLabel(nextStagedTabAfterSuccess))
      : queuedSync
        ? t("createOrderModal.successQueued")
        : t("createOrderModal.successOk");

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
      onClick={onClose}
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
              const items = formData.items;
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
                      items: formData.items.map((it) => ({
                        catalogItemId: it.catalogItemId,
                        manualLabel: it.isManual ? it.manualLabel ?? it._label : undefined,
                        strength: it.strength ?? null,
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

            {orderSetReviewActive && hasStagedOrderSetItems ? (
              <div
                style={{
                  border: "1px solid #bfdbfe",
                  background: "#eff6ff",
                  color: "#1e3a8a",
                  borderRadius: 6,
                  padding: "8px 10px",
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 12,
                }}
              >
                {t("createOrderModal.orderSetStagedReviewBanner")}
              </div>
            ) : null}

            <form onSubmit={handleSubmit}>
              <OrderPriorityField
                value={formData.priority}
                onChange={(priority) => setFormData((fd) => ({ ...fd, priority }))}
              />

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
                          onClick={() => addCarePreset(label)}
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
                    <ManualOrderEntry tab={activeTab} onAdd={handleAddManualLine} />
                  </>
                )}
              </div>

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
                    <SelectedMedicationItems items={formData.items} onPatch={patchMedItem} onRemove={removeItem} />
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

              {activeTab === "MEDICATION" && (
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

              {error && (
                <div
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
              )}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ padding: "10px 18px", border: "1px solid #ccc", borderRadius: 4, cursor: "pointer", fontSize: 14, background: "#fff" }}
                >
                  {t("createOrderModal.cancel")}
                </button>
                {activeTab !== "ORDER_SET" && (
                  <button
                    type="submit"
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
                  }}
                  >
                    {loading
                      ? activeTab === "MEDICATION"
                        ? t("createOrderModal.submitSavingMed")
                        : t("createOrderModal.submitSending")
                      : activeTab === "MEDICATION"
                        ? t("createOrderModal.submitSaveRx")
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
