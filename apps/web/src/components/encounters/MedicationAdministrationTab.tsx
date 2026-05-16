"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { getPendingCreateOrdersForEncounter, mergeOrders } from "@/lib/offline/pendingEncounterOrders";
import { getPendingMedicationAdminsFromQueue } from "@/lib/pendingMedicationAdminsFromQueue";
import { getOrderItemDisplayLabelForLanguage } from "@/lib/orderItemDisplayFr";
import { isOrderItemIdUuid } from "@/lib/orderItemIdUuid";
import { isOrderItemPendingNurseMedication } from "@/lib/nurseMedicationWorkload";
import { useI18n } from "@/lib/i18n";
import type { SupportedLanguage } from "@/i18n/config";
import { formatOrderAuthority } from "@/lib/orderAuthority";
import { formatOrderAttributionLines } from "@/lib/orderAttribution";
import { highRiskMedicationWarning } from "@/lib/highRiskMedication";
import {
  resolveMedicationMarActionFromStorage,
  getEncounterAllergyDocumentationSummary,
  getMedicationSafetyWarnings,
  medicationWarningsRequireMarHighRiskAck,
  evaluateMedicationTimingSafety,
  computeAdvancedMedicationSafetyForSingleLine,
  mergeAdvancedMedicationLineWithDraft,
  isMedicationInfusionCandidate,
  type MedicationInfusionCandidateInput,
  type AdvancedMedicationSafetyLine,
  type MedicationSafetyCatalogInput,
  type MedicationSafetyWarning,
} from "@medora/shared";
import { startMedicationInfusion, stopMedicationInfusion } from "@/lib/medicationInfusionApi";
import {
  findMedicationInfusionTimelineFromOrderEvents,
  formatInfusionDurationForI18n,
  formatInfusionElapsedInnerOnly,
  medicationInfusionClassificationText,
  medicationRouteSnapshotForInfusionCheck,
} from "@/features/emergency/erOrderLifecycleUi";
import { orderItemLikeToAdvancedMedicationSafetyLine } from "@/lib/advancedMedicationSafetyLineMappers";
import { AdvancedMedicationSafetyPanel } from "@/components/medication/AdvancedMedicationSafetyPanel";
import { MedicationSoftSafetyPanel } from "@/components/medication/MedicationSoftSafetyPanel";
import { ClinicalLatestVitalsBanner } from "@/components/clinical/ClinicalLatestVitalsBanner";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { medicationMarIntendedTimingUrgency } from "@/lib/medicationMarIntendedUrgency";
import {
  canAdjustMedicationAdministrationTime,
  resolveMedicationAdministrationDisplayTimes,
} from "@/features/mar/medicationAdministrationEffectiveTimeDisplay";
import { MedicationAdministrationEffectiveTimeModal } from "@/components/encounters/MedicationAdministrationEffectiveTimeModal";
import { MedicationAdministrationTimeCell } from "@/components/encounters/MedicationAdministrationTimeCell";

type AdminRow = {
  id: string;
  orderItemId: string | null;
  medicationLabelSnapshot?: string | null;
  administeredAt: string;
  createdAt?: string | null;
  effectiveAdministeredAt?: string | null;
  effectiveAdministeredAtVersion?: number | null;
  notes: string | null;
  /** From API (`findByEncounter`) or offline queue payload when present. */
  marAction?: string | null;
  administeredBy: { id: string; firstName: string; lastName: string };
  pendingSync?: boolean;
  administeredQuantity?: number | null;
};

type OrderItemApi = {
  id?: string;
  createdAt?: string | null;
  quantity?: number | null;
  catalogItemId?: string | null;
  catalogItemType?: string | null;
  manualLabel?: string | null;
  strength?: string | number | null;
  medicationFulfillmentIntent?: string | null;
  status?: string | null;
  route?: string | null;
  intendedAdministrationAt?: string | null;
  catalogMedication?: {
    code?: string | null;
    name?: string | null;
    displayNameEn?: string | null;
    displayNameFr?: string | null;
    genericName?: string | null;
    therapeuticClass?: string | null;
    route?: string | null;
    ndc11?: string | null;
    ndcDisplay?: string | null;
    billingUnitType?: string | null;
    isControlled?: boolean | null;
    controlledSchedule?: string | null;
  } | null;
};

function marOrderItemToSafetyCatalogInput(it: OrderItemApi, displayLabel: string): MedicationSafetyCatalogInput {
  const cm = it.catalogMedication;
  const strengthRaw = it.strength;
  const strengthStr =
    typeof strengthRaw === "string"
      ? strengthRaw
      : strengthRaw != null && String(strengthRaw).trim() !== ""
        ? String(strengthRaw)
        : undefined;
  return {
    code: cm?.code ?? undefined,
    name: cm?.name ?? undefined,
    displayName: cm?.displayNameEn?.trim() || cm?.displayNameFr?.trim() || displayLabel,
    genericName: cm?.genericName?.trim() || undefined,
    therapeuticClass: cm?.therapeuticClass?.trim() || undefined,
    strength: strengthStr,
    route: it.route?.trim() || cm?.route?.trim() || undefined,
    manualLabel:
      String(it.catalogItemType ?? "").toUpperCase() === "MEDICATION" && !it.catalogItemId?.trim()
        ? it.manualLabel?.trim() || displayLabel
        : undefined,
    isControlled: cm?.isControlled ?? undefined,
    controlledSchedule: cm?.controlledSchedule ?? undefined,
  };
}

const RECENT_MS = 24 * 60 * 60 * 1000;

const MAR_INFUSION_STATUS_BADGE_ACTIVE: React.CSSProperties = {
  alignSelf: "flex-start",
  padding: "5px 12px",
  borderRadius: 9999,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.01em",
  backgroundColor: "#e0f2fe",
  color: "#0369a1",
  border: "1px solid #7dd3fc",
};

const MAR_INFUSION_STATUS_BADGE_COMPLETED: React.CSSProperties = {
  alignSelf: "flex-start",
  padding: "5px 12px",
  borderRadius: 9999,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.01em",
  backgroundColor: "#ccfbf1",
  color: "#0f766e",
  border: "1px solid #5eead4",
};

/** MAR table: min width matches colgroup sum so columns stay readable; horizontal scroll when viewport is narrower. */
const MAR_TABLE_MIN_WIDTH_PX = 1630;

/** Prefer normal word boundaries; avoid `anywhere` / aggressive `break-word` on attribution prose. */
const MAR_CELL_WRAP_LONG_TEXT: React.CSSProperties = {
  overflowWrap: "break-word",
  wordBreak: "normal",
  lineHeight: 1.35,
};

const MAR_TABLE_METRIC_CELL: React.CSSProperties = {
  padding: "10px 8px",
  fontSize: 12,
  verticalAlign: "top",
  minWidth: 0,
  ...MAR_CELL_WRAP_LONG_TEXT,
  color: "#334155",
};

const MAR_TABLE_CONTROLS_CELL: React.CSSProperties = {
  padding: "10px 8px",
  verticalAlign: "top",
  minWidth: 0,
};

type MarOrderEventRow = {
  id: string;
  orderId: string;
  eventType: "CREATED" | "STARTED" | "COMPLETED" | "CANCELLED";
  performedByDisplayName?: string | null;
  performedAt: string;
  metadata?: unknown;
};

function parseOrderEventsForMar(raw: unknown[] | null): MarOrderEventRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object" && !Array.isArray(row))
    .map((row) => ({
      id: String(row.id ?? ""),
      orderId: String(row.orderId ?? ""),
      eventType: String(row.eventType ?? "").trim().toUpperCase() as MarOrderEventRow["eventType"],
      performedByDisplayName:
        typeof row.performedByDisplayName === "string" ? row.performedByDisplayName : null,
      performedAt: String(row.performedAt ?? ""),
      metadata: row.metadata,
    }))
    .filter((e) => e.id && e.orderId && e.performedAt);
}

function isSameLocalCalendarDay(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

type MarAction = "administered" | "refused" | "not_available" | "md_changed";

function actionLabel(a: MarAction, tr: (k: string) => string): string {
  return tr(`marTab.actions.${a}`);
}

function buildMarNotes(action: MarAction, routeLine: string | undefined, userNotes: string, tr: (k: string) => string): string {
  const lines = [`${tr("marTab.noteActionPrefix")} ${actionLabel(action, tr)}`];
  if (routeLine?.trim()) lines.push(`${tr("marTab.noteRoutePrefix")} ${routeLine.trim()}`);
  const n = userNotes.trim();
  if (n) lines.push(n);
  return lines.join("\n");
}

/**
 * Resolved MAR clinical outcome: prefer persisted `marAction` (ER-3.2), then legacy notes parse.
 * `OrderItem.status` only answers active vs terminal lifecycle for the Orders dashboard.
 */
function latestMarClinicalActionForRow(latest: AdminRow | undefined): MarAction | undefined {
  if (!latest) return undefined;
  return resolveMedicationMarActionFromStorage({
    marAction: latest.marAction ?? null,
    notes: latest.notes,
  });
}

export function MedicationAdministrationTab({
  encounterId,
  facilityId,
  encounterStatus,
  roleCodes = [],
}: {
  encounterId: string;
  facilityId: string;
  encounterStatus: string;
  /** RN / PROVIDER / ADMIN may adjust effective administration time (MAR tab callers). */
  roleCodes?: string[];
}) {
  const { t, language } = useI18n();
  const dateLocale = language === "en" ? "en-US" : "fr-FR";
  const [orders, setOrders] = useState<unknown[]>([]);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [orderEventsRaw, setOrderEventsRaw] = useState<unknown[] | null>(null);
  const [infusionBusy, setInfusionBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Affichage immédiat si l’enregistrement MAR est seulement mis en file (pas encore confirmé serveur). */
  const [marQueuedOfflineNotice, setMarQueuedOfflineNotice] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [modalItem, setModalItem] = useState<{
    orderItemId: string;
    label: string;
    authorityLine: string;
    attributionLines: string[];
    highRiskWarning: string | null;
    softSafetyWarnings: MedicationSafetyWarning[];
    advancedSafetyLine: AdvancedMedicationSafetyLine;
    routeHint: string;
    ndcHint: string;
    billingUnitHint: string;
    orderedQuantity: number | null;
    /** When true, MAR modal hides one-step “administered” (perfusion uses start/stop). */
    hideAdministeredAction?: boolean;
    /** Same input as open-orders infusion classifier — blocks accidental MAR “administered” for bags/IV abx. */
    infusionClassifyPayload?: MedicationInfusionCandidateInput;
  } | null>(null);
  const [modalAction, setModalAction] = useState<MarAction>("administered");
  const [modalRoute, setModalRoute] = useState("");
  const [modalNotes, setModalNotes] = useState("");
  const [modalDoseValue, setModalDoseValue] = useState("");
  const [modalDoseUnit, setModalDoseUnit] = useState("");
  const [modalAdminQty, setModalAdminQty] = useState("");
  const [modalBillingQty, setModalBillingQty] = useState("");
  const [modalNdc, setModalNdc] = useState("");
  const [marAllergyDocSummary, setMarAllergyDocSummary] = useState<string | null>(null);
  const [marAllergySafetyAck, setMarAllergySafetyAck] = useState(false);
  const [marTimingOverrideAck, setMarTimingOverrideAck] = useState(false);
  const [marHighRiskSafetyAck, setMarHighRiskSafetyAck] = useState(false);
  const [modalSubmitError, setModalSubmitError] = useState<string | null>(null);
  const [marSafetyDetailsOpen, setMarSafetyDetailsOpen] = useState(false);
  const [adminTimeModalRow, setAdminTimeModalRow] = useState<AdminRow | null>(null);
  const [adminTimeSaving, setAdminTimeSaving] = useState(false);
  /** Re-render periodically so infusion elapsed time updates on the MAR grid. */
  const [, setInfusionClockTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setInfusionClockTick((n) => n + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  const encounterOpen = encounterStatus === "OPEN";
  /** When omitted, callers rely on MAR-tab route gating (RN / PROVIDER / ADMIN only). */
  const canAdjustAdminTime = canAdjustMedicationAdministrationTime(
    roleCodes.length > 0 ? roleCodes : ["RN", "PROVIDER", "ADMIN"]
  );

  const orderItemById = useMemo(() => {
    const map = new Map<string, OrderItemApi>();
    for (const o of orders) {
      const order = asApiObject(o);
      const items = Array.isArray(order?.items) ? order.items : [];
      for (const it of items) {
        const row = asApiObject(it) as OrderItemApi | null;
        if (row?.id) map.set(String(row.id), row);
      }
    }
    return map;
  }, [orders]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [pendingAdmins, pendingOrders] = await Promise.all([
      getPendingMedicationAdminsFromQueue(
        facilityId,
        encounterId,
        t("marTab.pendingSyncFirstName"),
        t("marTab.pendingSyncLastName")
      ).catch(() => [] as AdminRow[]),
      getPendingCreateOrdersForEncounter(facilityId, encounterId).catch(() => [] as Record<string, unknown>[]),
    ]);

    try {
      const [o, a, encRaw] = await Promise.all([
        apiFetch(`/encounters/${encounterId}/orders`, { facilityId }),
        apiFetch(`/encounters/${encounterId}/medication-administrations`, { facilityId }),
        apiFetch(`/encounters/${encounterId}`, { facilityId }),
      ]);
      let eventsRaw: unknown[] = [];
      try {
        const ev = await apiFetch(`/encounters/${encounterId}/order-events`, { facilityId });
        eventsRaw = Array.isArray(ev) ? ev : [];
      } catch {
        eventsRaw = [];
      }

      const serverOrders = Array.isArray(o) ? o : [];
      const serverAdmins = Array.isArray(a) ? (a as AdminRow[]) : [];
      const encObj = asApiObject(encRaw) as {
        vitals?: unknown;
        nursingAssessment?: unknown;
        triage?: { vitalsJson?: unknown } | null;
      } | null;
      setMarAllergyDocSummary(
        getEncounterAllergyDocumentationSummary({
          vitals: encObj?.vitals,
          nursingAssessment: encObj?.nursingAssessment,
          triageVitalsJson: encObj?.triage?.vitalsJson ?? null,
        })
      );

      setOrders(mergeOrders(serverOrders, pendingOrders));
      setAdmins([...serverAdmins, ...pendingAdmins]);
      setOrderEventsRaw(eventsRaw);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("marTab.loadFailed"));
      setOrders(mergeOrders([], pendingOrders));
      setAdmins(pendingAdmins);
      setOrderEventsRaw([]);
      setMarAllergyDocSummary(null);
    } finally {
      setLoading(false);
    }
  }, [encounterId, facilityId, t]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const adminsByOrderItemId = useMemo(() => {
    const m = new Map<string, AdminRow[]>();
    for (const r of admins) {
      if (!r.orderItemId) continue;
      const list = m.get(r.orderItemId) ?? [];
      list.push(r);
      m.set(r.orderItemId, list);
    }
    for (const [k, list] of m.entries()) {
      list.sort((a, b) => new Date(b.administeredAt).getTime() - new Date(a.administeredAt).getTime());
      m.set(k, list);
    }
    return m;
  }, [admins]);

  const marOrderEventRows = useMemo(() => parseOrderEventsForMar(orderEventsRaw), [orderEventsRaw]);

  const runMarInfusion = useCallback(
    async (orderItemId: string, orderId: string, op: "start" | "stop") => {
      const busyKey = `${orderId}:${orderItemId}:${op}`;
      setInfusionBusy(busyKey);
      setError(null);
      try {
        if (op === "start") await startMedicationInfusion(orderItemId, facilityId);
        else await stopMedicationInfusion(orderItemId, facilityId);
        await loadAll();
      } catch (e) {
        setError(
          normalizeUserFacingError(e instanceof Error ? e.message : String(e), language) ||
            t("marTab.infusionActionError")
        );
      } finally {
        setInfusionBusy(null);
      }
    },
    [facilityId, language, loadAll, t]
  );

  /** Same medication line = same `orderItemId`; most recent MAR row with outcome "administered". */
  const lastAdministeredForModal = useMemo(() => {
    if (!modalItem) return null;
    const list = adminsByOrderItemId.get(modalItem.orderItemId) ?? [];
    for (const r of list) {
      const act = resolveMedicationMarActionFromStorage({
        marAction: r.marAction ?? null,
        notes: r.notes,
      });
      if (act === "administered") return r;
    }
    return null;
  }, [modalItem, adminsByOrderItemId]);

  const taskRows = useMemo(() => {
    type RowDraft = {
      orderId: string;
      orderItemId: string;
      isInfusionLifecycleMed: boolean;
      infusionClassifyPayload: MedicationInfusionCandidateInput;
      label: string;
      routeHint: string;
      ndcHint: string;
      billingUnitHint: string;
      orderedQuantity: number | null;
      intendedAt?: string | null;
      authorityLine: string;
      attributionLines: string[];
      highRiskWarning: string | null;
      safetyCatalogInput: MedicationSafetyCatalogInput;
      advancedSafetyLine: AdvancedMedicationSafetyLine;
    };
    const drafts: RowDraft[] = [];
    for (const order of orders) {
      if ((order as { status?: string }).status === "CANCELLED") continue;
      const parentOrderId = String((order as { id?: unknown }).id ?? "").trim();
      const items = (order as { items?: OrderItemApi[] }).items ?? [];
      for (const it of items) {
        if (!it.id) continue;
        if (String(it.id).startsWith("local:")) continue;
        if (!isOrderItemPendingNurseMedication(it)) continue;
        const embeddedOrderIdRaw = (it as { orderId?: unknown }).orderId;
        const embeddedOrderId =
          typeof embeddedOrderIdRaw === "string"
            ? embeddedOrderIdRaw.trim()
            : embeddedOrderIdRaw != null && String(embeddedOrderIdRaw).trim() !== ""
              ? String(embeddedOrderIdRaw).trim()
              : "";
        const orderId = parentOrderId || embeddedOrderId;
        const label = getOrderItemDisplayLabelForLanguage(
          it as Parameters<typeof getOrderItemDisplayLabelForLanguage>[0],
          language as SupportedLanguage,
          t
        );
        const itemRec = it as Record<string, unknown>;
        const routeSnap = medicationRouteSnapshotForInfusionCheck(itemRec);
        const catM = it.catalogMedication;
        const catRow = catM && typeof catM === "object" ? (catM as Record<string, unknown>) : null;
        const fulfillment = String(it.medicationFulfillmentIntent ?? "ADMINISTER_CHART");
        const rawClassText = medicationInfusionClassificationText(itemRec).trim();
        const medicationLabelForClass = (rawClassText || label.trim()).trim() || null;
        const infusionClassifyPayload: MedicationInfusionCandidateInput = {
          route: routeSnap.trim() || null,
          medicationLabel: medicationLabelForClass,
          code: typeof catRow?.code === "string" ? catRow.code : null,
          genericName: typeof catRow?.genericName === "string" ? catRow.genericName : null,
          metadata: null,
          catalogAdministrationType:
            typeof catRow?.administrationType === "string" ? catRow.administrationType : null,
        };
        const isInfusionLifecycleMed =
          String(it.catalogItemType ?? "") === "MEDICATION" &&
          fulfillment === "ADMINISTER_CHART" &&
          isMedicationInfusionCandidate(infusionClassifyPayload);
        const rawQ = it.quantity;
        const orderedQuantity =
          typeof rawQ === "number" && Number.isFinite(rawQ)
            ? rawQ
            : rawQ != null && String(rawQ).trim() !== ""
              ? (() => {
                  const n = Number(rawQ);
                  return Number.isFinite(n) ? n : null;
                })()
              : null;
        drafts.push({
          orderId,
          orderItemId: it.id,
          isInfusionLifecycleMed,
          infusionClassifyPayload,
          label,
          authorityLine: formatOrderAuthority(order as Record<string, unknown>, t),
          attributionLines: formatOrderAttributionLines(order as Record<string, unknown>, t, language),
          highRiskWarning: highRiskMedicationWarning({ ...it, label }, t),
          routeHint: it.route?.trim() || it.catalogMedication?.route?.trim() || "",
          ndcHint: it.catalogMedication?.ndcDisplay?.trim() || it.catalogMedication?.ndc11?.trim() || "",
          billingUnitHint: it.catalogMedication?.billingUnitType?.trim() || "",
          orderedQuantity,
          intendedAt: it.intendedAdministrationAt ?? null,
          safetyCatalogInput: marOrderItemToSafetyCatalogInput(it, label),
          advancedSafetyLine:
            orderItemLikeToAdvancedMedicationSafetyLine(it, label) ?? ({
              lineKey: it.id,
              catalogItemId: it.catalogItemId ?? null,
              displayName: label,
            } satisfies AdvancedMedicationSafetyLine),
        });
      }
    }
    const siblingInputs = drafts.map((d) => d.safetyCatalogInput);
    return drafts.map((row, idx) => {
      const { safetyCatalogInput, ...rest } = row;
      return {
        ...rest,
        softSafetyWarnings: getMedicationSafetyWarnings(safetyCatalogInput, {
          siblingMedications: siblingInputs.filter((_, i) => i !== idx),
        }),
      };
    });
  }, [orders, language, t]);

  const marAdvancedMedicationSafetyWarnings = useMemo(() => {
    if (!modalItem?.advancedSafetyLine || modalAction !== "administered") return [];
    const adminQty = modalAdminQty.trim() ? Number(modalAdminQty) : null;
    const draft = mergeAdvancedMedicationLineWithDraft(modalItem.advancedSafetyLine, {
      strength: modalDoseValue.trim() || undefined,
      route: modalRoute.trim() || undefined,
      quantity:
        adminQty != null && Number.isFinite(adminQty)
          ? adminQty
          : modalItem.orderedQuantity != null && Number.isFinite(modalItem.orderedQuantity)
            ? modalItem.orderedQuantity
            : undefined,
    });
    const siblings = taskRows
      .filter((r) => r.orderItemId !== modalItem.orderItemId)
      .map((r) => r.advancedSafetyLine);
    return computeAdvancedMedicationSafetyForSingleLine({
      primaryLine: draft,
      siblingEncounterLines: siblings,
    });
  }, [modalItem, modalAction, taskRows, modalDoseValue, modalRoute, modalAdminQty]);

  const advancedMarWarningCount = marAdvancedMedicationSafetyWarnings.length;
  useEffect(() => {
    if (!modalItem) return;
    setMarSafetyDetailsOpen(advancedMarWarningCount > 0);
  }, [modalItem?.orderItemId, advancedMarWarningCount]);

  const openModal = (row: (typeof taskRows)[0], options?: { hideAdministeredAction?: boolean }) => {
    const hideAdmin = options?.hideAdministeredAction === true;
    setModalItem({
      orderItemId: row.orderItemId,
      label: row.label,
      authorityLine: row.authorityLine,
      attributionLines: row.attributionLines,
      highRiskWarning: row.highRiskWarning,
      softSafetyWarnings: row.softSafetyWarnings,
      advancedSafetyLine: row.advancedSafetyLine,
      routeHint: row.routeHint,
      ndcHint: row.ndcHint,
      billingUnitHint: row.billingUnitHint,
      orderedQuantity: row.orderedQuantity,
      hideAdministeredAction: hideAdmin,
      infusionClassifyPayload: row.infusionClassifyPayload,
    });
    setModalSubmitError(null);
    setModalAction(hideAdmin ? "refused" : "administered");
    setModalRoute(row.routeHint);
    setModalNotes("");
    setModalDoseValue("");
    setModalDoseUnit(row.billingUnitHint);
    setModalAdminQty("");
    setModalBillingQty("");
    setModalNdc(row.ndcHint);
    setMarAllergySafetyAck(false);
    setMarTimingOverrideAck(false);
    setMarHighRiskSafetyAck(false);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalItem(null);
    setModalSubmitError(null);
    setMarTimingOverrideAck(false);
    setMarHighRiskSafetyAck(false);
  };

  const submitModal = async () => {
    if (!modalItem || encounterStatus !== "OPEN") return;
    const orderItemId =
      typeof modalItem.orderItemId === "string" ? modalItem.orderItemId.trim() : "";
    if (!isOrderItemIdUuid(orderItemId)) {
      console.warn("MAR blocked: invalid orderItemId", modalItem.orderItemId);
      return;
    }
    if (
      modalAction === "administered" &&
      marAllergyDocSummary &&
      !marAllergySafetyAck
    ) {
      setModalSubmitError(t("marTab.errAllergyAckRequired"));
      return;
    }
    if (
      modalAction === "administered" &&
      modalItem.infusionClassifyPayload &&
      isMedicationInfusionCandidate(modalItem.infusionClassifyPayload)
    ) {
      setModalSubmitError(t("marTab.errInfusionUseStartStop"));
      return;
    }
    setSubmitting(true);
    setModalSubmitError(null);
    setError(null);
    try {
      const routeLine = modalRoute.trim() || modalItem.routeHint;
      const body: Record<string, unknown> = {
        orderItemId,
        marAction: modalAction,
        administeredAt: new Date().toISOString(),
        ...(routeLine ? { route: routeLine } : {}),
        ...(modalDoseValue.trim() ? { doseValue: Number(modalDoseValue) } : {}),
        ...(modalDoseUnit.trim() ? { doseUnit: modalDoseUnit.trim() } : {}),
        ...(modalAdminQty.trim() ? { administeredQuantity: Number(modalAdminQty) } : {}),
        ...(modalBillingQty.trim() ? { billingQuantity: Number(modalBillingQty) } : {}),
        ...(modalNdc.trim() ? { ndc: modalNdc.trim() } : {}),
        ...(modalDoseUnit.trim() ? { quantityUnit: modalDoseUnit.trim() } : {}),
        notes: buildMarNotes(modalAction, routeLine, modalNotes, t),
        ...(modalAction === "administered" && marAllergyDocSummary && marAllergySafetyAck
          ? { safetyAcknowledgedMedicationAllergies: true }
          : {}),
      };
      const res = await apiFetch(`/encounters/${encounterId}/medication-administrations`, {
        method: "POST",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const queued =
        res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
      if (queued) {
        setMarQueuedOfflineNotice(true);
      } else {
        setMarQueuedOfflineNotice(false);
      }
      setModalItem(null);
      await loadAll();
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      setModalSubmitError(normalizeUserFacingError(raw.trim() || null, language) || t("marTab.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const isOpen = encounterStatus === "OPEN";
  const nowMs = Date.now();

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "none",
        minWidth: 0,
        alignSelf: "stretch",
        boxSizing: "border-box",
      }}
    >
      {error ? (
        <p style={{ color: "#c62828", fontSize: 14, marginTop: 0 }} role="alert">
          {error}
        </p>
      ) : null}
      {marQueuedOfflineNotice ? (
        <div
          role="alert"
          style={{
            marginBottom: 12,
            marginTop: error ? 8 : 0,
            padding: "12px 14px",
            borderRadius: 8,
            border: "1px solid #ef9a9a",
            backgroundColor: "#ffebee",
            fontSize: 13,
            color: "#b71c1c",
            lineHeight: 1.5,
            fontWeight: 600,
          }}
        >
          {t("marTab.offlineNotice")}
        </div>
      ) : null}

      {marAllergyDocSummary ? (
        <div
          role="status"
          style={{
            marginBottom: 12,
            marginTop: error || marQueuedOfflineNotice ? 8 : 0,
            padding: "12px 14px",
            borderRadius: 8,
            border: "1px solid #fecaca",
            backgroundColor: "#fef2f2",
            fontSize: 13,
            color: "#7f1d1d",
            lineHeight: 1.45,
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 6 }}>{t("marTab.allergyDocTitle")}</div>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>{t("marTab.allergyTopBannerLead")}</div>
          <div style={MAR_CELL_WRAP_LONG_TEXT}>
            {marAllergyDocSummary.length > 320 ? `${marAllergyDocSummary.slice(0, 320)}…` : marAllergyDocSummary}
          </div>
        </div>
      ) : null}

      <ClinicalLatestVitalsBanner encounterId={encounterId} facilityId={facilityId} />

      <h3 style={{ margin: "0 0 8px 0", fontSize: 16 }}>{t("marTab.title")}</h3>
      {!isOpen ? <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#616161" }}>{t("marTab.closedHint")}</p> : null}

      {loading ? (
        <p>{t("common.loading")}</p>
      ) : taskRows.length === 0 ? (
        <p style={{ color: "#666", fontSize: 14 }}>{t("marTab.emptyTasks")}</p>
      ) : (
        <div
          style={{
            display: "block",
            width: "100%",
            maxWidth: "none",
            minWidth: 0,
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <table
            style={{
              width: "100%",
              minWidth: MAR_TABLE_MIN_WIDTH_PX,
              tableLayout: "fixed",
              borderCollapse: "collapse",
              backgroundColor: "white",
              borderRadius: 8,
              border: "1px solid #eee",
            }}
          >
            <colgroup>
              <col style={{ width: 90 }} />
              <col style={{ width: 180 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 180 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 180 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 180 }} />
              <col style={{ width: 120 }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd", backgroundColor: "#f5f5f5" }}>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 12 }}>{t("marTab.columnCategory")}</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 12 }}>{t("marTab.columnIssued")}</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 12 }}>{t("marTab.columnWhen")}</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 12 }}>{t("marTab.columnOrderLine")}</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 12, verticalAlign: "bottom" }}>
                  {t("marTab.columnLastAction")}
                </th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 12 }}>{t("marTab.columnMarStarted")}</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 12 }}>{t("marTab.columnMarStopped")}</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 12 }}>{t("marTab.columnMarPerformedBy")}</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 12 }}>{t("marTab.columnMarElapsed")}</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 12 }}>{t("marTab.columnMarControls")}</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 12 }}>{t("marTab.columnTitle")}</th>
              </tr>
            </thead>
            <tbody>
              {taskRows.map((row) => {
                const list = adminsByOrderItemId.get(row.orderItemId) ?? [];
                const latest = list[0];
                const latestTime = latest ? new Date(latest.administeredAt).getTime() : 0;
                const marActionResolved = latestMarClinicalActionForRow(latest);
                const marSaysAdministered = marActionResolved === "administered";
                const marRowLocked = Boolean(latest?.pendingSync || marSaysAdministered);
                const recentWindow = latestTime > 0 && nowMs - latestTime < RECENT_MS;

                const resolvedOrderIdForInfusion = String(row.orderId ?? "").trim();
                const infusionTimeline =
                  row.isInfusionLifecycleMed && resolvedOrderIdForInfusion
                    ? findMedicationInfusionTimelineFromOrderEvents(
                        marOrderEventRows,
                        resolvedOrderIdForInfusion,
                        row.orderItemId
                      )
                    : { active: null, lastCompleted: null };
                const activeMarInfusion = infusionTimeline.active;
                const completedMarInfusion = infusionTimeline.lastCompleted;

                const marDashCell = (
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>{t("common.dash")}</span>
                );

                let marLastAction: React.ReactNode;
                let marStarted: React.ReactNode = marDashCell;
                let marStopped: React.ReactNode = marDashCell;
                let marPerformer: React.ReactNode = marDashCell;
                let marElapsed: React.ReactNode = marDashCell;
                let marControls: React.ReactNode;

                const infusionControlsStackStyle: React.CSSProperties = {
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  minWidth: 0,
                  width: "100%",
                };

                const infusionBusyKeyOrder = resolvedOrderIdForInfusion || row.orderItemId;
                const infusionBusyStart =
                  infusionBusy === `${infusionBusyKeyOrder}:${row.orderItemId}:start`;
                const infusionBusyStop =
                  infusionBusy === `${infusionBusyKeyOrder}:${row.orderItemId}:stop`;
                const primaryInfusionDisabled =
                  !isOpen || submitting || marRowLocked || infusionBusyStart || infusionBusyStop;

                const infusionControlsEl = (
                  <div style={infusionControlsStackStyle}>
                    {!activeMarInfusion ? (
                      <button
                        type="button"
                        disabled={primaryInfusionDisabled}
                        onClick={() =>
                          void runMarInfusion(
                            row.orderItemId,
                            resolvedOrderIdForInfusion || row.orderItemId,
                            "start"
                          )
                        }
                        style={{
                          padding: "8px 10px",
                          fontSize: 13,
                          minHeight: 40,
                          width: "100%",
                          minWidth: 0,
                          boxSizing: "border-box",
                          backgroundColor: isOpen && !marRowLocked ? "#1565c0" : "#bdbdbd",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                          cursor: primaryInfusionDisabled ? "not-allowed" : "pointer",
                          fontWeight: 600,
                          whiteSpace: "normal",
                        }}
                      >
                        {infusionBusyStart ? t("marTab.infusionStarting") : t("marTab.startInfusion")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={primaryInfusionDisabled}
                        onClick={() =>
                          void runMarInfusion(
                            row.orderItemId,
                            resolvedOrderIdForInfusion || row.orderItemId,
                            "stop"
                          )
                        }
                        style={{
                          padding: "8px 10px",
                          fontSize: 13,
                          minHeight: 40,
                          width: "100%",
                          minWidth: 0,
                          boxSizing: "border-box",
                          backgroundColor: isOpen && !marRowLocked ? "#2e7d32" : "#bdbdbd",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                          cursor: primaryInfusionDisabled ? "not-allowed" : "pointer",
                          fontWeight: 600,
                          whiteSpace: "normal",
                        }}
                      >
                        {infusionBusyStop ? t("marTab.infusionStopping") : t("marTab.stopInfusion")}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!isOpen || submitting || marRowLocked}
                      onClick={() => openModal(row, { hideAdministeredAction: true })}
                      style={{
                        padding: "6px 8px",
                        fontSize: 11,
                        minHeight: 36,
                        width: "100%",
                        minWidth: 0,
                        boxSizing: "border-box",
                        backgroundColor: "white",
                        color: "#1565c0",
                        border: "1px solid #90caf9",
                        borderRadius: 6,
                        cursor: isOpen && !marRowLocked ? "pointer" : "not-allowed",
                        fontWeight: 600,
                        whiteSpace: "normal",
                      }}
                    >
                      {t("marTab.infusionAltMarActions")}
                    </button>
                  </div>
                );

                const administerControlEl = (
                  <button
                    type="button"
                    disabled={!isOpen || submitting || marRowLocked}
                    onClick={() => openModal(row)}
                    style={{
                      padding: "8px 10px",
                      fontSize: 13,
                      minHeight: 40,
                      width: "100%",
                      minWidth: 0,
                      boxSizing: "border-box",
                      backgroundColor: isOpen && !marRowLocked ? "#2e7d32" : "#bdbdbd",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      cursor: isOpen && !marRowLocked ? "pointer" : "not-allowed",
                      fontWeight: 600,
                      whiteSpace: "normal",
                    }}
                  >
                    {t("marTab.administer")}
                  </button>
                );

                if (latest?.pendingSync) {
                  marLastAction = (
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontSize: 12,
                        backgroundColor: "#fff3cd",
                        color: "#856404",
                        fontWeight: 600,
                      }}
                    >
                      {t("marTab.statusPendingSync")}
                    </span>
                  );
                  marStarted = marStopped = marPerformer = marElapsed = marDashCell;
                  marControls = row.isInfusionLifecycleMed ? infusionControlsEl : administerControlEl;
                } else if (row.isInfusionLifecycleMed && activeMarInfusion) {
                  const startedMs = activeMarInfusion.infusionStartedAtIso
                    ? new Date(activeMarInfusion.infusionStartedAtIso).getTime()
                    : NaN;
                  const elapsedInner =
                    !Number.isNaN(startedMs) ? formatInfusionElapsedInnerOnly(nowMs - startedMs, t) : null;
                  const startedAtStr = activeMarInfusion.infusionStartedAtIso
                    ? new Date(activeMarInfusion.infusionStartedAtIso).toLocaleString(dateLocale, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })
                    : null;
                  const byParts = [activeMarInfusion.startedByDisplayName, activeMarInfusion.startedByTitle].filter(
                    (x): x is string => typeof x === "string" && Boolean(x.trim())
                  );
                  const byJoined = byParts.join(t("infusionTimeline.infusionTimelineDivider"));
                  marLastAction = (
                    <span style={MAR_INFUSION_STATUS_BADGE_ACTIVE}>
                      {t("erEmergencyOrders.infusionInProgress")}
                    </span>
                  );
                  marStarted = startedAtStr ? (
                    <span style={{ fontSize: 12, color: "#334155" }}>{startedAtStr}</span>
                  ) : (
                    marDashCell
                  );
                  marStopped = marDashCell;
                  marPerformer = byJoined ? (
                    <span style={{ fontSize: 12, color: "#334155", ...MAR_CELL_WRAP_LONG_TEXT }}>{byJoined}</span>
                  ) : (
                    marDashCell
                  );
                  marElapsed =
                    elapsedInner != null ? (
                      <span style={{ fontSize: 12, color: "#334155" }}>
                        {t("marTab.infusionElapsedLabel").replace("{elapsed}", elapsedInner)}
                      </span>
                    ) : (
                      marDashCell
                    );
                  marControls = infusionControlsEl;
                } else if (row.isInfusionLifecycleMed && completedMarInfusion && !activeMarInfusion) {
                  const lc = completedMarInfusion;
                  const startAt =
                    lc.infusionStartedAtIso &&
                    !Number.isNaN(new Date(lc.infusionStartedAtIso).getTime())
                      ? new Date(lc.infusionStartedAtIso).toLocaleString(dateLocale, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : t("common.dash");
                  const stopAt =
                    lc.infusionStoppedAtIso && !Number.isNaN(new Date(lc.infusionStoppedAtIso).getTime())
                      ? new Date(lc.infusionStoppedAtIso).toLocaleString(dateLocale, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : t("common.dash");
                  const durLine = formatInfusionDurationForI18n(lc.durationMinutes, t);
                  const startByParts = [lc.startedByDisplayName, lc.startedByTitle].filter(
                    (x): x is string => typeof x === "string" && Boolean(x.trim())
                  );
                  const stopByParts = [lc.stoppedByDisplayName, lc.stoppedByTitle].filter(
                    (x): x is string => typeof x === "string" && Boolean(x.trim())
                  );
                  const startByLine =
                    startByParts.length > 0
                      ? t("infusionTimeline.infusionStartedBy").replace(
                          "{by}",
                          startByParts.join(t("infusionTimeline.infusionTimelineDivider"))
                        )
                      : t("common.dash");
                  const stopByLine =
                    stopByParts.length > 0
                      ? t("infusionTimeline.infusionStoppedBy").replace(
                          "{by}",
                          stopByParts.join(t("infusionTimeline.infusionTimelineDivider"))
                        )
                      : t("common.dash");
                  marLastAction = (
                    <span style={MAR_INFUSION_STATUS_BADGE_COMPLETED}>
                      {t("infusionTimeline.infusionCompleted")}
                    </span>
                  );
                  marStarted = <span style={{ fontSize: 12, color: "#334155" }}>{startAt}</span>;
                  marStopped = <span style={{ fontSize: 12, color: "#334155" }}>{stopAt}</span>;
                  marPerformer = (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                      <span style={{ fontSize: 11, color: "#475569", ...MAR_CELL_WRAP_LONG_TEXT }}>{startByLine}</span>
                      <span style={{ fontSize: 11, color: "#475569", ...MAR_CELL_WRAP_LONG_TEXT }}>{stopByLine}</span>
                    </div>
                  );
                  marElapsed = (
                    <span style={{ fontSize: 12, color: "#334155", ...MAR_CELL_WRAP_LONG_TEXT }}>{durLine}</span>
                  );
                  marControls = marDashCell;
                } else if (marSaysAdministered) {
                  marLastAction = <span>🟢 {t("marTab.statusAdministered")}</span>;
                  marControls = row.isInfusionLifecycleMed ? infusionControlsEl : administerControlEl;
                } else if (latest && !marSaysAdministered) {
                  marLastAction = (
                    <span>
                      🟠 {actionLabel(marActionResolved as MarAction, t)}
                      {recentWindow ? ` · ${t("marTab.statusRecentLabel")}` : ""}
                    </span>
                  );
                  marControls = row.isInfusionLifecycleMed ? infusionControlsEl : administerControlEl;
                } else {
                  marLastAction = <span>🔴 {t("marTab.statusPending")}</span>;
                  marControls = row.isInfusionLifecycleMed ? infusionControlsEl : administerControlEl;
                }

                const displayName =
                  latest?.medicationLabelSnapshot?.trim() || row.label;

                const intendedLine =
                  row.intendedAt != null && String(row.intendedAt).trim() !== ""
                    ? new Date(row.intendedAt as string).toLocaleString(dateLocale)
                    : null;

                const intendedUrgency = intendedLine
                  ? medicationMarIntendedTimingUrgency(row.intendedAt, nowMs, marSaysAdministered)
                  : null;
                const intendedLineStyle: React.CSSProperties =
                  intendedUrgency === "overdue"
                    ? {
                        fontSize: 12,
                        marginTop: 4,
                        padding: "6px 8px",
                        borderRadius: 4,
                        color: "#b71c1c",
                        backgroundColor: "#ffebee",
                        fontWeight: 600,
                      }
                    : intendedUrgency === "dueSoon"
                      ? {
                          fontSize: 12,
                          marginTop: 4,
                          padding: "6px 8px",
                          borderRadius: 4,
                          color: "#e65100",
                          backgroundColor: "#fff8e1",
                          fontWeight: 600,
                        }
                      : { fontSize: 12, color: "#424242", marginTop: 4 };

                const issuedCell = row.attributionLines[0]?.trim() || "—";
                const titleCellParts: string[] = [];
                if (row.authorityLine?.trim()) titleCellParts.push(row.authorityLine.trim());
                for (const line of row.attributionLines.slice(1)) {
                  if (line.trim()) titleCellParts.push(line.trim());
                }
                const titleCell = titleCellParts.length > 0 ? titleCellParts.join(" · ") : "—";

                return (
                  <tr
                    key={row.orderItemId}
                    style={{
                      borderBottom: "1px solid #eee",
                      verticalAlign: "top",
                      backgroundColor: latest?.pendingSync ? "#fff8e1" : undefined,
                    }}
                  >
                    <td style={{ padding: "12px 8px", fontSize: 13, color: "#334155", fontWeight: 600 }}>
                      {t("marTab.columnCategoryValue")}
                    </td>
                    <td style={{ padding: "12px 8px", fontSize: 13, color: "#64748b", ...MAR_CELL_WRAP_LONG_TEXT }}>
                      {issuedCell}
                    </td>
                    <td style={{ padding: "12px 8px", fontSize: 13, color: "#424242" }}>
                      {latest ? (
                        <MedicationAdministrationTimeCell
                          row={latest}
                          encounterOpen={encounterOpen}
                          canAdjust={canAdjustAdminTime}
                          dateLocale={dateLocale}
                          t={t}
                          onAdjustClick={() => setAdminTimeModalRow(latest)}
                        />
                      ) : (
                        <div style={{ whiteSpace: "nowrap" }}>{t("common.dash")}</div>
                      )}
                      {intendedLine ? (
                        <div
                          style={intendedLineStyle}
                          title={
                            intendedUrgency === "overdue"
                              ? t("marTab.intendedOverdueTitle")
                              : intendedUrgency === "dueSoon"
                                ? t("marTab.intendedDueSoonTitle")
                                : undefined
                          }
                        >
                          {t("marTab.intendedPrefix")} {intendedLine}
                        </div>
                      ) : null}
                    </td>
                    <td style={{ padding: "12px 8px", fontSize: 14, ...MAR_CELL_WRAP_LONG_TEXT }}>
                      <div style={{ fontWeight: 600 }}>{displayName}</div>
                      {row.routeHint ? (
                        <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                          {t("marTab.routePrefix")} {row.routeHint}
                        </div>
                      ) : null}
                      {row.highRiskWarning ? (
                        <div style={{ fontSize: 12, color: "#b45309", marginTop: 4, fontWeight: 600 }}>
                          {row.highRiskWarning}
                        </div>
                      ) : null}
                    </td>
                    <td
                      style={{
                        padding: "10px 8px",
                        fontSize: 12,
                        verticalAlign: "top",
                        minWidth: 0,
                        ...MAR_CELL_WRAP_LONG_TEXT,
                        color: "#334155",
                      }}
                    >
                      {marLastAction}
                    </td>
                    <td style={MAR_TABLE_METRIC_CELL}>{marStarted}</td>
                    <td style={MAR_TABLE_METRIC_CELL}>{marStopped}</td>
                    <td style={MAR_TABLE_METRIC_CELL}>{marPerformer}</td>
                    <td style={MAR_TABLE_METRIC_CELL}>{marElapsed}</td>
                    <td style={MAR_TABLE_CONTROLS_CELL}>{marControls}</td>
                    <td style={{ padding: "12px 8px", fontSize: 12, color: "#64748b", ...MAR_CELL_WRAP_LONG_TEXT }}>
                      {titleCell}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h3 style={{ margin: "24px 0 8px 0", fontSize: 16 }}>{t("marTab.historyTitle")}</h3>
      {loading ? null : admins.length === 0 ? (
        <p style={{ color: "#666", fontSize: 14 }}>{t("marTab.empty")}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {admins
            .slice()
            .sort((a, b) => new Date(b.administeredAt).getTime() - new Date(a.administeredAt).getTime())
            .map((r) => {
              const oid = r.orderItemId;
              const label =
                r.medicationLabelSnapshot?.trim() ||
                (oid
                  ? taskRows.find((tr) => tr.orderItemId === oid)?.label ?? t("common.dash")
                  : t("marTab.noLinkedOrder"));
              return (
                <li
                  key={r.id}
                  style={{
                    padding: "12px 14px",
                    marginBottom: 8,
                    backgroundColor: "#fafafa",
                    borderRadius: 8,
                    border: "1px solid #eee",
                    fontSize: 14,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{label}</div>
                  <div style={{ marginTop: 4 }}>
                    <MedicationAdministrationTimeCell
                      row={r}
                      encounterOpen={encounterOpen}
                      canAdjust={canAdjustAdminTime}
                      dateLocale={dateLocale}
                      t={t}
                      showPerformer
                      onAdjustClick={() => setAdminTimeModalRow(r)}
                    />
                  </div>
                  {r.notes?.trim() ? (
                    <pre
                      style={{
                        margin: "8px 0 0 0",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        fontFamily: "inherit",
                        fontSize: 13,
                        color: "#333",
                      }}
                    >
                      {r.notes.trim()}
                    </pre>
                  ) : null}
                </li>
              );
            })}
        </ul>
      )}

      {modalItem ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mar-modal-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: 12,
            boxSizing: "border-box",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 12,
              maxWidth: 480,
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              padding: 16,
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 id="mar-modal-title" style={{ margin: "0 0 12px 0", fontSize: 17 }}>
              {t("marTab.modalTitle")}
            </h4>
            <p style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 600, wordBreak: "break-word" }}>{modalItem.label}</p>
            <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#64748b", ...MAR_CELL_WRAP_LONG_TEXT }}>
              {modalItem.authorityLine}
            </p>
            {modalItem.attributionLines.map((line) => (
              <p key={line} style={{ margin: "0 0 6px 0", fontSize: 13, color: "#64748b", ...MAR_CELL_WRAP_LONG_TEXT }}>
                {line}
              </p>
            ))}
            {modalItem.highRiskWarning ? (
              <p style={{ margin: "0 0 10px 0", fontSize: 13, color: "#b45309", fontWeight: 600 }}>
                {modalItem.highRiskWarning}
              </p>
            ) : null}

            {(() => {
              const list = adminsByOrderItemId.get(modalItem.orderItemId) ?? [];
              const latest = list[0];
              const lastWhen = latest
                ? new Date(latest.administeredAt).toLocaleString(dateLocale)
                : t("common.dash");
              const now = new Date();
              let todayCount = 0;
              let todayQty = 0;
              let todayHasQty = false;
              let cumQty = 0;
              let cumHasQty = false;
              let cumEvents = 0;
              for (const r of list) {
                const act = resolveMedicationMarActionFromStorage({
                  marAction: r.marAction ?? null,
                  notes: r.notes,
                });
                if (act !== "administered") continue;
                cumEvents += 1;
                const q = r.administeredQuantity;
                if (typeof q === "number" && Number.isFinite(q)) {
                  cumQty += q;
                  cumHasQty = true;
                }
                if (isSameLocalCalendarDay(r.administeredAt, now)) {
                  todayCount += 1;
                  if (typeof q === "number" && Number.isFinite(q)) {
                    todayQty += q;
                    todayHasQty = true;
                  }
                }
              }
              const orderedLabel =
                modalItem.orderedQuantity != null ? String(modalItem.orderedQuantity) : t("common.dash");
              const cumulativeLabel = cumHasQty
                ? t("marTab.safetyPreviewCumulative").replace("{qty}", String(cumQty))
                : t("marTab.safetyPreviewCumulativeEvents").replace("{count}", String(cumEvents));
              return (
                <div
                  style={{
                    marginBottom: 14,
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    backgroundColor: "#f8fafc",
                    fontSize: 12,
                    color: "#334155",
                    lineHeight: 1.45,
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: 6, color: "#0f172a" }}>
                    {t("marTab.safetyPreviewTitle")}
                  </div>
                  <div>{t("marTab.safetyPreviewLastAdmin").replace("{when}", lastWhen)}</div>
                  <div>{t("marTab.safetyPreviewToday").replace("{count}", String(todayCount))}</div>
                  {todayHasQty ? (
                    <div>{t("marTab.safetyPreviewTodayQty").replace("{qty}", String(todayQty))}</div>
                  ) : null}
                  <div style={{ marginTop: 6, fontWeight: 600 }}>
                    {t("marTab.safetyPreviewOrdered").replace("{qty}", orderedLabel)}
                    <span style={{ color: "#94a3b8" }}> · </span>
                    {cumulativeLabel}
                  </div>
                  <details
                    style={{ marginTop: 10 }}
                    open={marSafetyDetailsOpen}
                    onToggle={(e) => setMarSafetyDetailsOpen(e.currentTarget.open)}
                  >
                    <summary
                      style={{
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#334155",
                        listStyle: "none",
                      }}
                    >
                      {t("mar.viewSafetyDetails")}
                    </summary>
                    <div style={{ marginTop: 10 }}>
                      <MedicationSoftSafetyPanel warnings={modalItem.softSafetyWarnings} density="compact" />
                      {modalAction === "administered" ? (
                        <AdvancedMedicationSafetyPanel warnings={marAdvancedMedicationSafetyWarnings} density="compact" />
                      ) : null}
                    </div>
                  </details>
                </div>
              );
            })()}

            {modalSubmitError ? (
              <div
                role="alert"
                style={{
                  marginBottom: 12,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #ef9a9a",
                  backgroundColor: "#ffebee",
                  fontSize: 13,
                  color: "#b71c1c",
                  fontWeight: 600,
                }}
              >
                {modalSubmitError}
              </div>
            ) : null}

            <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
              {t("marTab.routeOptional")}
            </label>
            <input
              type="text"
              value={modalRoute}
              onChange={(e) => setModalRoute(e.target.value)}
              placeholder={modalItem.routeHint || t("marTab.routePlaceholder")}
              disabled={submitting}
              style={{
                width: "100%",
                padding: 12,
                marginBottom: 14,
                borderRadius: 8,
                border: "1px solid #ccc",
                fontSize: 16,
                boxSizing: "border-box",
              }}
            />

            <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
              {t("marTab.ndcLabel")}
            </label>
            <input
              type="text"
              value={modalNdc}
              onChange={(e) => setModalNdc(e.target.value)}
              placeholder={modalItem.ndcHint || t("marTab.ndcPlaceholder")}
              disabled={submitting}
              style={{
                width: "100%",
                padding: 12,
                marginBottom: 14,
                borderRadius: 8,
                border: "1px solid #ccc",
                fontSize: 16,
                boxSizing: "border-box",
              }}
            />

            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input
                type="number"
                min={0}
                step="0.0001"
                value={modalDoseValue}
                onChange={(e) => setModalDoseValue(e.target.value)}
                placeholder={t("marTab.doseValuePlaceholder")}
                disabled={submitting}
                style={{ flex: 1, padding: 12, borderRadius: 8, border: "1px solid #ccc", fontSize: 16 }}
              />
              <input
                type="text"
                value={modalDoseUnit}
                onChange={(e) => setModalDoseUnit(e.target.value)}
                placeholder={modalItem.billingUnitHint || t("marTab.doseUnitPlaceholder")}
                disabled={submitting}
                style={{ flex: 1, padding: 12, borderRadius: 8, border: "1px solid #ccc", fontSize: 16 }}
              />
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input
                type="number"
                min={0}
                step="0.0001"
                value={modalAdminQty}
                onChange={(e) => setModalAdminQty(e.target.value)}
                placeholder={t("marTab.adminQuantityPlaceholder")}
                disabled={submitting}
                style={{ flex: 1, padding: 12, borderRadius: 8, border: "1px solid #ccc", fontSize: 16 }}
              />
              <input
                type="number"
                min={0}
                step="0.0001"
                value={modalBillingQty}
                onChange={(e) => setModalBillingQty(e.target.value)}
                placeholder={t("marTab.billingQuantityPlaceholder")}
                disabled={submitting}
                style={{ flex: 1, padding: 12, borderRadius: 8, border: "1px solid #ccc", fontSize: 16 }}
              />
            </div>

            <span style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
              {t("marTab.actionHeading")}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {(
                (["administered", "refused", "not_available", "md_changed"] as const).filter(
                  (a) => !(modalItem.hideAdministeredAction && a === "administered")
                )
              ).map((a) => (
                <label
                  key={a}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 15,
                    padding: "10px 8px",
                    borderRadius: 8,
                    border: modalAction === a ? "2px solid #2e7d32" : "1px solid #ddd",
                    cursor: submitting ? "default" : "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="mar-action"
                    checked={modalAction === a}
                    onChange={() => {
                      setModalAction(a);
                      if (a !== "administered") {
                        setMarAllergySafetyAck(false);
                        setMarTimingOverrideAck(false);
                        setMarHighRiskSafetyAck(false);
                      }
                    }}
                    disabled={submitting}
                  />
                  {actionLabel(a, t)}
                </label>
              ))}
            </div>

            {modalAction === "administered" && marAllergyDocSummary ? (
              <div
                style={{
                  marginBottom: 14,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #fecaca",
                  backgroundColor: "#fef2f2",
                  fontSize: 13,
                  color: "#991b1b",
                  lineHeight: 1.45,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{t("marTab.allergyDocTitle")}</div>
                <div style={{ marginBottom: 10, ...MAR_CELL_WRAP_LONG_TEXT }}>
                  {marAllergyDocSummary.length > 220
                    ? `${marAllergyDocSummary.slice(0, 220)}…`
                    : marAllergyDocSummary}
                </div>
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer", fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={marAllergySafetyAck}
                    disabled={submitting}
                    onChange={(e) => setMarAllergySafetyAck(e.target.checked)}
                  />
                  <span>{t("marTab.allergyAckLabel")}</span>
                </label>
              </div>
            ) : null}

            {modalAction === "administered" &&
            modalItem &&
            medicationWarningsRequireMarHighRiskAck(modalItem.softSafetyWarnings) ? (
              <div
                style={{
                  marginBottom: 14,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#f1f5f9",
                  fontSize: 13,
                  color: "#0f172a",
                  lineHeight: 1.45,
                }}
              >
                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: submitting ? "default" : "pointer", fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={marHighRiskSafetyAck}
                    disabled={submitting}
                    onChange={(e) => setMarHighRiskSafetyAck(e.target.checked)}
                  />
                  <span>{t("marTab.highRiskMarAckLabel")}</span>
                </label>
              </div>
            ) : null}

            <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>{t("marTab.notesLabel")}</label>
            <textarea
              value={modalNotes}
              onChange={(e) => setModalNotes(e.target.value)}
              rows={3}
              disabled={submitting}
              style={{
                width: "100%",
                padding: 12,
                marginBottom: 8,
                borderRadius: 8,
                border: "1px solid #ccc",
                fontSize: 16,
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
            <p style={{ margin: "0 0 14px 0", fontSize: 12, color: "#666" }}>{t("marTab.timestampHint")}</p>

            {(() => {
              if (!modalItem || modalAction !== "administered" || !lastAdministeredForModal) return null;
              const timingEv = evaluateMedicationTimingSafety({
                lastAdministeredAt: lastAdministeredForModal.administeredAt,
                now: new Date(),
                medicationKey: modalItem.orderItemId,
              });
              if (timingEv.level === "none") return null;
              const by = lastAdministeredForModal.administeredBy;
              const rnName = `${by.firstName ?? ""} ${by.lastName ?? ""}`.trim() || t("common.dash");
              const minutes = timingEv.minutesSinceLast ?? 0;
              const msgBase = `medicationTimingSafety.${timingEv.messageKey}`;
              const timingText = t(msgBase)
                .replace("{minutes}", String(minutes))
                .replace("{name}", rnName);
              const shell =
                timingEv.level === "critical"
                  ? {
                      border: "1px solid #ef4444",
                      backgroundColor: "#fef2f2",
                      color: "#991b1b",
                    }
                  : timingEv.level === "warning"
                    ? {
                        border: "1px solid #f59e0b",
                        backgroundColor: "#fffbeb",
                        color: "#92400e",
                      }
                    : {
                        border: "1px solid #3b82f6",
                        backgroundColor: "#eff6ff",
                        color: "#1e40af",
                      };
              return (
                <div style={{ marginBottom: 14 }}>
                  <div
                    role="status"
                    style={{
                      padding: "12px 14px",
                      borderRadius: 8,
                      fontSize: 13,
                      lineHeight: 1.45,
                      fontWeight: 600,
                      ...shell,
                    }}
                  >
                    {timingText}
                  </div>
                  {timingEv.level === "critical" ? (
                    <label
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                        marginTop: 10,
                        cursor: submitting ? "default" : "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#0f172a",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={marTimingOverrideAck}
                        disabled={submitting}
                        onChange={(e) => setMarTimingOverrideAck(e.target.checked)}
                      />
                      <span>{t("medicationTimingSafety.overrideAck")}</span>
                    </label>
                  ) : null}
                </div>
              );
            })()}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                style={{
                  padding: "12px 18px",
                  fontSize: 15,
                  borderRadius: 8,
                  border: "1px solid #ccc",
                  background: "#fff",
                  cursor: submitting ? "not-allowed" : "pointer",
                  minHeight: 44,
                }}
              >
                {t("marTab.cancel")}
              </button>
              <button
                type="button"
                onClick={() => void submitModal()}
                disabled={(() => {
                  if (submitting) return true;
                  if (!modalItem || modalAction !== "administered") return false;
                  if (marAllergyDocSummary && !marAllergySafetyAck) return true;
                  if (
                    medicationWarningsRequireMarHighRiskAck(modalItem.softSafetyWarnings) &&
                    !marHighRiskSafetyAck
                  ) {
                    return true;
                  }
                  if (lastAdministeredForModal) {
                    const te = evaluateMedicationTimingSafety({
                      lastAdministeredAt: lastAdministeredForModal.administeredAt,
                      now: new Date(),
                      medicationKey: modalItem.orderItemId,
                    });
                    if (te.level === "critical" && !marTimingOverrideAck) return true;
                  }
                  return false;
                })()}
                style={{
                  padding: "12px 18px",
                  fontSize: 15,
                  borderRadius: 8,
                  border: "none",
                  background: "#1a1a1a",
                  color: "white",
                  fontWeight: 600,
                  cursor: submitting ? "not-allowed" : "pointer",
                  minHeight: 44,
                }}
              >
                {submitting ? t("common.loading") : t("marTab.save")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {adminTimeModalRow ? (() => {
        const row = adminTimeModalRow;
        const displayTimes = resolveMedicationAdministrationDisplayTimes(row);
        const oid = row.orderItemId;
        const linkedOrderItem = oid ? orderItemById.get(oid) : undefined;
        const linkedOrder = oid
          ? orders
              .map((o) => asApiObject(o))
              .find((ord) => {
                const items = Array.isArray(ord?.items) ? ord.items : [];
                return items.some((it) => asApiObject(it)?.id === oid);
              })
          : null;
        const orderCreatedAt = linkedOrder?.createdAt
          ? new Date(String(linkedOrder.createdAt))
          : new Date(row.administeredAt);
        const orderItemCreatedAt = linkedOrderItem?.createdAt
          ? new Date(String(linkedOrderItem.createdAt))
          : null;
        const orderCancelledAt =
          String(linkedOrder?.status ?? "").toUpperCase() === "CANCELLED" && linkedOrder?.cancelledAt
            ? new Date(String(linkedOrder.cancelledAt))
            : null;
        const label =
          row.medicationLabelSnapshot?.trim() ||
          (oid ? taskRows.find((tr) => tr.orderItemId === oid)?.label ?? t("common.dash") : t("marTab.noLinkedOrder"));
        return (
          <MedicationAdministrationEffectiveTimeModal
            open
            medicationLabel={label}
            defaultEffectiveIso={displayTimes.effectiveIso}
            originalAdministeredAt={new Date(row.administeredAt)}
            systemDocumentedAt={row.createdAt ? new Date(row.createdAt) : new Date(row.administeredAt)}
            orderCreatedAt={orderCreatedAt}
            orderItemCreatedAt={orderItemCreatedAt}
            orderCancelledAt={orderCancelledAt}
            adjustmentVersion={row.effectiveAdministeredAtVersion ?? 0}
            controlledMedication={Boolean(linkedOrderItem?.catalogMedication?.isControlled)}
            t={t}
            saving={adminTimeSaving}
            onClose={() => {
              if (!adminTimeSaving) setAdminTimeModalRow(null);
            }}
            onSave={async (payload) => {
              setAdminTimeSaving(true);
              try {
                await apiFetch(
                  `/encounters/${encounterId}/medication-administrations/${row.id}/effective-administered-time`,
                  {
                    facilityId,
                    method: "PATCH",
                    body: JSON.stringify(payload),
                  }
                );
                setAdminTimeModalRow(null);
                await loadAll();
              } finally {
                setAdminTimeSaving(false);
              }
            }}
          />
        );
      })() : null}
    </div>
  );
}
