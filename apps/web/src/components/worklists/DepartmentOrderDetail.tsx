"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { buildRxPrintFacilityIdentity, printRx } from "@/components/pharmacy/RxPrintLayout";
import { getOrderItemDisplayLabelFromLocale } from "@/lib/orderItemDisplayFr";
import { careOrderClinicalDetailLines } from "@/lib/careOrderDisplayUi";
import { sanitizeOrderItemNotesForDisplay } from "@medora/shared";
import { MEDORA_CHART_RESULT_UPDATED } from "@/lib/chartEvents";
import { ClinicalResultViewer } from "@/components/clinical/ClinicalResultViewer";
import { attachmentsFromResultDataAll, clinicalResultFromOrderItemLike } from "@/lib/clinicalResultNormalize";
import {
  collectResultUploadFiles,
  validateResultUploadPreflight,
} from "@/lib/resultUploadLimits";
import {
  encounterBcp47,
  tOrderItemStatusForWorklist,
  tOrderPriority,
  tPathwayType,
} from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";
import { formatClinicalInstantForFacility } from "@/lib/clinicalTimeDisplay";
import { formatOrderAuthority } from "@/lib/orderAuthority";
import { formatOrderAttributionLines } from "@/lib/orderAttribution";
import { highRiskMedicationWarning } from "@/lib/highRiskMedication";
import { LabRadiologyEffectiveTimeRow } from "@/components/worklists/LabRadiologyEffectiveTimeRow";
import { LabRadiologyEffectiveTimeModal } from "@/components/worklists/LabRadiologyEffectiveTimeModal";
import { LabRadiologyOperationalBadges } from "@/components/worklists/LabRadiologyOperationalBadges";
import { analyzeLabRadWorklistOperationalRow } from "@/features/orders/labRadiologyOperationalEscalationUi";
import { isEncounterLocked } from "@/lib/encounterLock";
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
import {
  resolveWorklistItemWorkflowAction,
  isDeptWorklistWorkflowActor,
  shouldShowDeptWorklistReadOnlyNotice,
  deptWorklistReadOnlyNoticeKey,
  type WorklistItemWorkflowAction,
} from "@/lib/worklistLabRadUi";
import { postWorklistItemWorkflowAction } from "@/lib/worklistLabRadWorkflowApi";
import {
  orderItemLifecycleIdempotentToastKey,
  orderItemLifecycleStaleStateMessageKey,
  shouldTreatLifecycleErrorAsStaleState,
} from "@/lib/mutateOrderItemLifecycleAction";
import {
  createOrderLifecycleMutationHandlers,
  mergeOrderPayload,
  runOrderItemLifecycleUiMutation,
} from "@/lib/orderItemLifecycleUiSync";
import { ingestServerOrderPayload, subscribeToOrderItem } from "@/lib/orderStateSyncStore";
import { OrderLifecycleErrorBoundary } from "@/components/orders/OrderLifecycleErrorBoundary";
import {
  isOrderItemAnyWorkflowPending,
  isOrderItemWorkflowPending,
  orderItemWorkflowPendingKey,
  ORDER_DETAIL_WORKFLOW_BUSY_LABEL_KEY,
  workflowActionFailureMessageKey,
  type OrderItemLifecycleWorkflowAction,
} from "@/lib/orderItemWorkflowUi";
import { DeptWorklistReadOnlyNotice } from "@/components/worklists/DeptWorklistReadOnlyNotice";
import { resolveSelectedLineId } from "@/lib/departmentOrderDetailLineSelection";

function fillTemplate(s: string, vars: Record<string, string | number>): string {
  let out = s;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

export type WorklistDeptKind = "lab" | "radiology" | "pharmacy";

type AttachmentMeta = { fileName?: string; mimeType?: string; dataBase64?: string };

/** Statuts où texte / fichiers peuvent être enregistrés (aligné backend + flux accusé → démarrage → examen). */
function statusAllowsSubstantiveResultEntry(itemStatus: string): boolean {
  return (
    itemStatus === "COMPLETED" ||
    itemStatus === "RESULTED" ||
    itemStatus === "VERIFIED" ||
    itemStatus === "IN_PROGRESS"
  );
}

/** Message affiché tant que la ligne n’est pas prête pour un résultat (texte / pièces). */
function getWorkflowBlockMessage(t: (key: string) => string, itemStatus: string): string | null {
  if (statusAllowsSubstantiveResultEntry(itemStatus)) return null;
  if (itemStatus === "ACKNOWLEDGED") {
    return t("orderDetail.workflowAfterAck");
  }
  if (itemStatus === "PLACED" || itemStatus === "PENDING" || itemStatus === "SIGNED") {
    return t("orderDetail.workflowAfterPlace");
  }
  if (itemStatus === "CANCELLED" || itemStatus === "DRAFT") {
    return t("orderDetail.workflowCancelledDraft");
  }
  return t("orderDetail.workflowDefault");
}

function isAlreadyDispensed(item: { pharmacyDispenseRecord?: unknown | null }) {
  return !!item.pharmacyDispenseRecord;
}

const LAB_RAD_RESULT_DRAFT_VERSION = "lab-radiology-documentation-v1";
const UNKNOWN_CLINICAL_DRAFT_USER_ID = "unknown-user";

type LabRadiologyResultDraftPayload = {
  resultText: string;
};

function labRadiologyResultDraftSignature(payload: LabRadiologyResultDraftPayload): string {
  return clinicalDraftPayloadSignature(payload);
}

function labRadiologyResultDraftHasContent(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Partial<LabRadiologyResultDraftPayload>;
  return Boolean(p.resultText?.trim());
}

function readFileAsAttachment(file: File, readErr: string): Promise<AttachmentMeta> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || "");
      const m = s.match(/^data:([^;]+);base64,(.+)$/);
      if (m) resolve({ fileName: file.name, mimeType: m[1], dataBase64: m[2] });
      else reject(new Error(readErr));
    };
    r.onerror = () => reject(r.error ?? new Error(readErr));
    r.readAsDataURL(file);
  });
}

export default function DepartmentOrderDetail({
  kind,
  orderId,
  listHref,
  facilityId,
}: {
  kind: WorklistDeptKind;
  orderId: string;
  listHref: string;
  facilityId: string | null;
}) {
  const { t, language } = useI18n();
  const dateLocale = encounterBcp47(language);
  const searchParams = useSearchParams();
  const highlightLineId = searchParams.get("ligne") || "";
  const { roles, userId, allowRnLabResultSubmission, facilityTimeZone, facilities, careProfileJson } = useFacilityAndRoles();

  /**
   * Acteur autorisé aux actions worklist (accusé / démarrage / clôture). Labo / imagerie :
   * rôles cliniques LAB.ED.4 (PROVIDER, RN, LAB, RADIOLOGY, ADMIN). Pharmacie : PHARMACY/ADMIN.
   */
  const viewerIsDeptActor = useMemo(() => isDeptWorklistWorkflowActor(roles, kind), [roles, kind]);

  /**
   * Phase 1 — saisie de résultat de **laboratoire** par un infirmier sous politique
   * d'établissement. N'élargit que la saisie de résultat ; n'ouvre pas l'imagerie,
   * la vérification, la création de commandes, ni les boutons d'accusé / démarrage.
   */
  const rnCanSubmitLabResult = useMemo(() => {
    if (kind !== "lab") return false;
    if (!allowRnLabResultSubmission) return false;
    if (!roles.includes("RN")) return false;
    if (roles.includes("LAB") || roles.includes("RADIOLOGY") || roles.includes("ADMIN")) {
      return false;
    }
    return true;
  }, [kind, allowRnLabResultSubmission, roles]);

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dispenseItem, setDispenseItem] = useState<any>(null);
  const [dispenseQty, setDispenseQty] = useState("1");
  const [dispenseInstr, setDispenseInstr] = useState("");
  const [dispenseNotes, setDispenseNotes] = useState("");
  const [dispenseDoseValue, setDispenseDoseValue] = useState("");
  const [dispenseDoseUnit, setDispenseDoseUnit] = useState("");
  const [dispenseBillingQty, setDispenseBillingQty] = useState("");
  const [dispenseNdc, setDispenseNdc] = useState("");
  const [dispenseBusy, setDispenseBusy] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [pendingWorkflowAction, setPendingWorkflowAction] = useState<string | null>(null);

  const labels = useMemo(() => {
    if (kind === "lab") {
      return {
        title: t("orderDetail.labTitle"),
        resultLabel: t("orderDetail.resultLabelLab"),
        resultPlaceholder: t("orderDetail.resultPlaceholderLab"),
        submitResult: t("orderDetail.submitAddResultLab"),
        showCritical: true,
      };
    }
    if (kind === "radiology") {
      return {
        title: t("orderDetail.radTitle"),
        resultLabel: t("orderDetail.resultLabelRad"),
        resultPlaceholder: t("orderDetail.resultPlaceholderRad"),
        submitResult: t("orderDetail.submitAddResultRad"),
        showCritical: false,
      };
    }
    return {
      title: t("orderDetail.pharmacyTitle"),
      resultLabel: "",
      resultPlaceholder: "",
      submitResult: "",
      showCritical: false,
    };
  }, [kind, t]);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!facilityId || !orderId) return;
    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await apiFetch(`/orders/${orderId}`, { facilityId });
      setOrder(asApiObject(ingestServerOrderPayload(data)));
    } catch (e: unknown) {
      setOrder(null);
      setError(normalizeUserFacingError(e instanceof Error ? e.message : null, language) || t("orderDetail.loadError"));
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [facilityId, orderId, t, language]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return subscribeToOrderItem(() => {
      setOrder((prev: unknown) => mergeOrderPayload(prev));
    });
  }, []);

  const filterItems = (items: any[]) => {
    if (!items) return [];
    if (kind === "lab") return items.filter((i: any) => i.catalogItemType === "LAB_TEST");
    if (kind === "radiology") return items.filter((i: any) => i.catalogItemType === "IMAGING_STUDY");
    return items.filter((i: any) => i.catalogItemType === "MEDICATION");
  };

  const visibleItems = useMemo(
    () => filterItems(order?.items || []),
    [order?.items, kind]
  );

  const effectiveSelectedLineId = useMemo(
    () => resolveSelectedLineId(visibleItems, highlightLineId, selectedLineId),
    [visibleItems, highlightLineId, selectedLineId]
  );

  useEffect(() => {
    setSelectedLineId((current) => {
      const resolved = resolveSelectedLineId(visibleItems, highlightLineId, current);
      return resolved === current ? current : resolved;
    });
  }, [visibleItems, highlightLineId]);

  useEffect(() => {
    const scrollTargetId = highlightLineId || effectiveSelectedLineId;
    if (!scrollTargetId || !order?.items?.length) return;
    const el = document.getElementById(`ligne-${scrollTargetId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [highlightLineId, order, effectiveSelectedLineId]);

  const runWorkflowAction = async (itemId: string, action: WorklistItemWorkflowAction) => {
    if (!facilityId || order?.status === "CANCELLED" || isOrderItemAnyWorkflowPending(pendingWorkflowAction, itemId)) {
      return;
    }
    const item = (order?.items ?? []).find((i: any) => i.id === itemId);
    if (!item) return;
    setPendingWorkflowAction(orderItemWorkflowPendingKey(itemId, action));
    try {
      const result = await runOrderItemLifecycleUiMutation({
        action,
        itemId,
        facilityId,
        currentStatus: item.status,
        mutate: (workflowAction, lineId, facId) =>
          postWorklistItemWorkflowAction(workflowAction, lineId, facId, item.status, {
            cacheScope: {
              orderId,
              worklists: kind === "lab" ? ["lab"] : kind === "radiology" ? ["radiology"] : [],
            },
          }),
        handlers: createOrderLifecycleMutationHandlers({
          itemId,
          action,
          collectionKind: "orders",
          applyCollection: (transform) => {
            setOrder((prev: unknown) => transform(prev));
          },
        }),
      });
      if (result.idempotent) {
        alert(t(orderItemLifecycleIdempotentToastKey(action)));
      }
      void load({ silent: true });
    } catch (err) {
      const httpStatus = (err as { status?: number }).status;
      if (shouldTreatLifecycleErrorAsStaleState(action, item.status, httpStatus)) {
        alert(t(orderItemLifecycleStaleStateMessageKey()));
        void load({ silent: true });
        return;
      }
      alert(t(workflowActionFailureMessageKey(action, "orderDetail")));
    } finally {
      setPendingWorkflowAction(null);
    }
  };

  const handleAck = async (itemId: string) => runWorkflowAction(itemId, "acknowledge");
  const handleStart = async (itemId: string) => runWorkflowAction(itemId, "start");
  const handleComplete = async (itemId: string) => runWorkflowAction(itemId, "complete");

  const openDispense = (item: any) => {
    if (order?.status === "CANCELLED") return;
    if (isAlreadyDispensed(item)) return;
    setDispenseItem(item);
    setDispenseQty(String(item.quantity ?? 1));
    setDispenseInstr(((item.notes as string) || "").trim());
    setDispenseNotes("");
    setDispenseDoseValue("");
    setDispenseDoseUnit((item.catalogMedication?.billingUnitType as string) || "");
    setDispenseBillingQty("");
    setDispenseNdc((item.catalogMedication?.ndcDisplay as string) || (item.catalogMedication?.ndc11 as string) || "");
  };

  const submitDispense = async () => {
    if (!facilityId || !dispenseItem || order?.status === "CANCELLED") return;
    const line = (order?.items ?? []).find((i: any) => i.id === dispenseItem.id);
    const item = line ?? dispenseItem;
    if (isAlreadyDispensed(item)) return;
    const q = parseInt(dispenseQty, 10);
    if (!Number.isFinite(q) || q < 1) {
      alert(t("orderDetail.invalidQty"));
      return;
    }
    setDispenseBusy(true);
    try {
      await apiFetch("/pharmacy/dispenses/record-order", {
        method: "POST",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderItemId: dispenseItem.id,
          quantityDispensed: q,
          doseValue: dispenseDoseValue.trim() ? Number(dispenseDoseValue) : undefined,
          doseUnit: dispenseDoseUnit.trim() || undefined,
          billingQuantity: dispenseBillingQty.trim() ? Number(dispenseBillingQty) : undefined,
          quantityUnit: dispenseDoseUnit.trim() || undefined,
          ndc: dispenseNdc.trim() || undefined,
          dosageInstructions: dispenseInstr.trim() || undefined,
          notes: dispenseNotes.trim() || undefined,
        }),
      });
      setDispenseItem(null);
      await load();
    } catch {
      alert(t("orderDetail.saveDispenseFailed"));
    } finally {
      setDispenseBusy(false);
    }
  };

  if (!facilityId) {
    return <p style={{ padding: 24 }}>{t("orderDetail.facilityRequired")}</p>;
  }

  if (loading && !order) {
    return <p style={{ padding: 24 }}>{t("common.loading")}</p>;
  }

  if (error || !order) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: "#c62828" }}>{error || t("orderDetail.orderNotFound")}</p>
        <Link href={listHref} style={{ color: "#1565c0" }}>
          {t("orderDetail.backToList")}
        </Link>
      </div>
    );
  }

  const patient = order.encounter?.patient;
  const items = visibleItems;
  const parentOrderCancelled = order.status === "CANCELLED";

  const typeMismatch =
    (kind === "lab" && order.type !== "LAB") ||
    (kind === "radiology" && order.type !== "IMAGING") ||
    (kind === "pharmacy" && order.type !== "MEDICATION");

  return (
    <div style={{ maxWidth: 920, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <Link href={listHref} style={{ fontSize: 14, color: "#1565c0" }}>
          ← {t("orderDetail.backToList")}
        </Link>
      </div>
      <h1 style={{ marginTop: 0 }}>{labels.title}</h1>

      {parentOrderCancelled && !typeMismatch ? (
        <div
          role="status"
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            borderRadius: 8,
            border: "1px solid #ef9a9a",
            backgroundColor: "#ffebee",
            color: "#b71c1c",
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1.45,
          }}
        >
          {t("orderDetail.orderCancelledBanner")}
        </div>
      ) : null}

      {typeMismatch ? (
        <p style={{ color: "#c62828" }}>{t("orderDetail.typeMismatch")}</p>
      ) : null}

      <section
        style={{
          background: "#fff",
          border: "1px solid #e0e0e0",
          borderRadius: 8,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: 16 }}>{t("orderDetail.sectionPatientRx")}</h2>
        <div style={{ fontSize: 14, lineHeight: 1.6 }}>
          <div>
            <strong>{t("orderDetail.patientLabel")}</strong> {patient ? `${patient.firstName} ${patient.lastName}` : t("common.dash")}
          </div>
          <div>
            <strong>{t("orderDetail.nirLabel")}</strong> {patient?.mrn ?? t("common.dash")}
          </div>
          <div>
            <strong>{t("orderDetail.encounterLabel")}</strong>{" "}
            {order.encounterId ? (
              <Link href={`/app/encounters/${order.encounterId}`} style={{ color: "#1565c0" }}>
                {t("orderDetail.openEncounter")}
              </Link>
            ) : (
              t("common.dash")
            )}
          </div>
          <div>
            <strong>{t("orderDetail.priorityLabel")}</strong> {tOrderPriority(t, order.priority)}
            {order.pathwaySession ? (
              <span style={{ marginLeft: 8, fontSize: 12, color: "#1976d2" }}>
                {tPathwayType(t, order.pathwaySession.type)}
              </span>
            ) : null}
          </div>
          <div>
            <strong>{t("orderDetail.prescriberLabel")}</strong> {(order.prescriberName as string) || t("common.dash")}
          </div>
          <div style={{ color: "#64748b", overflowWrap: "anywhere" }}>
            {formatOrderAuthority(order, t)}
          </div>
          {formatOrderAttributionLines(order, t, language).map((line) => (
            <div key={line} style={{ color: "#64748b", overflowWrap: "anywhere" }}>
              {line}
            </div>
          ))}
          <div>
            <strong>{t("orderDetail.prescriberContactLabel")}</strong> {(order.prescriberContact as string) || t("common.dash")}
          </div>
          <div>
            <strong>{t("orderDetail.orderDateLabel")}</strong>{" "}
            {order.createdAt
              ? formatClinicalInstantForFacility(String(order.createdAt), facilityTimeZone, language)
              : t("common.dash")}
          </div>
          {order.notes ? (
            <div style={{ marginTop: 8 }}>
              <strong>{t("orderDetail.notesLabel")}</strong> {order.notes}
            </div>
          ) : null}
        </div>
      </section>

      {items.length === 0 ? (
        <p>{t("orderDetail.emptyLines")}</p>
      ) : (
        items.map((item: any) => (
          <OrderLifecycleErrorBoundary key={item.id}>
          <LineCard
            item={item}
            kind={kind}
            expanded={effectiveSelectedLineId === item.id}
            highlight={effectiveSelectedLineId === item.id}
            labels={labels}
            facilityId={facilityId}
            order={order}
            parentOrderCancelled={parentOrderCancelled}
            currentUserId={userId}
            viewerIsDeptActor={viewerIsDeptActor}
            roles={roles}
            rnCanSubmitLabResult={rnCanSubmitLabResult}
            onReload={load}
            onAck={handleAck}
            onStart={handleStart}
            onComplete={handleComplete}
            onSelectLine={() => setSelectedLineId(item.id)}
            pendingWorkflowAction={pendingWorkflowAction}
            onOpenDispense={kind === "pharmacy" ? openDispense : undefined}
          />
          </OrderLifecycleErrorBoundary>
        ))
      )}

      {kind === "pharmacy" && (
        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            onClick={() =>
              printRx({
                order: {
                  createdAt: order.createdAt,
                  status: order.status ?? null,
                  prescriberName: order.prescriberName,
                  prescriberLicense: order.prescriberLicense,
                  prescriberContact: order.prescriberContact,
                  authority: order.authority ?? { source: order.source },
                  createdByDisplay: order.createdByDisplay,
                  lastActionDisplay: order.lastActionDisplay,
                  items: order.items || [],
                },
                patient: patient ?? {},
                facilityIdentity: buildRxPrintFacilityIdentity({
                  facilityName: facilities.find((f) => f.id === facilityId)?.name ?? null,
                  careProfileJson,
                }),
                language,
                requireFacilityIdentity: false,
              })
            }
            style={{ padding: "8px 14px", cursor: "pointer" }}
          >
            {t("orderDetail.printRx")}
          </button>
        </div>
      )}

      {dispenseItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3000,
            padding: 16,
          }}
          onClick={() => !dispenseBusy && setDispenseItem(null)}
          role="presentation"
        >
          <div
            style={{ background: "#fff", borderRadius: 8, padding: 24, maxWidth: 480, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <h2 style={{ marginTop: 0, fontSize: 18 }}>{t("orderDetail.saveDispenseTitle")}</h2>
            <p style={{ fontSize: 14 }}>
              <strong>{getOrderItemDisplayLabelFromLocale(dispenseItem, language)}</strong> —{" "}
              {fillTemplate(t("orderDetail.qtyPrescribedLine"), {
                qty: String(dispenseItem.quantity ?? t("common.dash")),
              })}
            </p>
            <p style={{ fontSize: 13, color: "#64748b", overflowWrap: "anywhere" }}>
              {formatOrderAuthority(order, t)}
            </p>
            <label style={{ display: "block", marginTop: 12, fontSize: 13 }}>
              {t("orderDetail.qtyDelivered")}
              <input
                type="number"
                min={1}
                value={dispenseQty}
                onChange={(e) => setDispenseQty(e.target.value)}
                style={{ display: "block", marginTop: 4, padding: 8, width: "100%", boxSizing: "border-box" }}
              />
            </label>
            <label style={{ display: "block", marginTop: 12, fontSize: 13 }}>
              {t("orderDetail.ndcLabel")}
              <input
                type="text"
                value={dispenseNdc}
                onChange={(e) => setDispenseNdc(e.target.value)}
                style={{ display: "block", marginTop: 4, padding: 8, width: "100%", boxSizing: "border-box" }}
              />
            </label>
            <label style={{ display: "block", marginTop: 12, fontSize: 13 }}>
              {t("orderDetail.doseFields")}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <input
                  type="number"
                  min={0}
                  step="0.0001"
                  value={dispenseDoseValue}
                  onChange={(e) => setDispenseDoseValue(e.target.value)}
                  placeholder={t("orderDetail.doseValuePlaceholder")}
                  style={{ flex: 1, padding: 8, boxSizing: "border-box" }}
                />
                <input
                  type="text"
                  value={dispenseDoseUnit}
                  onChange={(e) => setDispenseDoseUnit(e.target.value)}
                  placeholder={t("orderDetail.doseUnitPlaceholder")}
                  style={{ flex: 1, padding: 8, boxSizing: "border-box" }}
                />
              </div>
            </label>
            <label style={{ display: "block", marginTop: 12, fontSize: 13 }}>
              {t("orderDetail.billingQuantity")}
              <input
                type="number"
                min={0}
                step="0.0001"
                value={dispenseBillingQty}
                onChange={(e) => setDispenseBillingQty(e.target.value)}
                style={{ display: "block", marginTop: 4, padding: 8, width: "100%", boxSizing: "border-box" }}
              />
            </label>
            <label style={{ display: "block", marginTop: 12, fontSize: 13 }}>
              {t("orderDetail.posologyReminder")}
              <textarea
                value={dispenseInstr}
                onChange={(e) => setDispenseInstr(e.target.value)}
                rows={2}
                style={{ display: "block", marginTop: 4, padding: 8, width: "100%", boxSizing: "border-box" }}
              />
            </label>
            {!dispenseItem.catalogMedication ? (
              <p style={{ marginTop: 10, fontSize: 12, color: "#b71c1c" }}>{t("orderDetail.manualMedicationWarning")}</p>
            ) : null}
            <label style={{ display: "block", marginTop: 12, fontSize: 13 }}>
              {t("orderDetail.pharmacyNotes")}
              <textarea
                value={dispenseNotes}
                onChange={(e) => setDispenseNotes(e.target.value)}
                rows={2}
                style={{ display: "block", marginTop: 4, padding: 8, width: "100%", boxSizing: "border-box" }}
              />
            </label>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button type="button" disabled={dispenseBusy} onClick={() => setDispenseItem(null)}>
                {t("orderDetail.cancel")}
              </button>
              <button type="button" disabled={dispenseBusy} onClick={() => void submitDispense()}>
                {dispenseBusy ? "…" : t("orderDetail.submit")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LineCard({
  item,
  kind,
  expanded,
  highlight,
  labels,
  facilityId,
  order,
  parentOrderCancelled,
  currentUserId,
  viewerIsDeptActor,
  roles,
  rnCanSubmitLabResult,
  onReload,
  onAck,
  onStart,
  onComplete,
  onSelectLine,
  pendingWorkflowAction,
  onOpenDispense,
}: {
  item: any;
  kind: WorklistDeptKind;
  expanded: boolean;
  highlight: boolean;
  labels: {
    title: string;
    resultLabel: string;
    resultPlaceholder: string;
    submitResult: string;
    showCritical: boolean;
  };
  facilityId: string;
  order: any;
  parentOrderCancelled: boolean;
  currentUserId: string | null | undefined;
  /** false pour rôles non cliniques (ex. accueil) sur labo / imagerie ; aligné backend LAB.ED.4. */
  viewerIsDeptActor: boolean;
  roles: readonly string[];
  /**
   * Phase 1 — true uniquement quand `Facility.allowRnLabResultSubmission === true`,
   * que la file est `lab`, et que l'utilisateur est RN sans rôle technicien. Autorise
   * uniquement la saisie de résultat ; pas d'accusé/démarrage/clôture.
   */
  rnCanSubmitLabResult: boolean;
  onReload: () => Promise<void>;
  onAck: (id: string) => Promise<void>;
  onStart: (id: string) => Promise<void>;
  onComplete: (id: string) => Promise<void>;
  onSelectLine: () => void;
  pendingWorkflowAction?: string | null;
  onOpenDispense?: (item: any) => void;
}) {
  const { t, language } = useI18n();
  const [resultText, setResultText] = useState(item.result?.resultText ?? "");
  const [critical, setCritical] = useState(!!item.result?.criticalValue);
  const [saving, setSaving] = useState(false);
  const [pdfFiles, setPdfFiles] = useState<FileList | null>(null);
  const [imgFiles, setImgFiles] = useState<FileList | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [draftRestoredAt, setDraftRestoredAt] = useState<string | null>(null);
  const [draftSavedLocallyAt, setDraftSavedLocallyAt] = useState<string | null>(null);
  const [timeAdjustSaving, setTimeAdjustSaving] = useState(false);
  const [timeAdjustTarget, setTimeAdjustTarget] = useState<{
    milestone: "received" | "collected" | "performed" | "resulted" | "finalized";
    patchPath: string;
    titleKey: string;
    documentedAt: Date;
    effectiveAt: string | null;
    version: number;
  } | null>(null);
  const restoringDraftRef = useRef(false);

  const dateLocale = encounterBcp47(language);
  const encounterLocked = isEncounterLocked(order?.encounter);
  const canAdjustClinicalTime = viewerIsDeptActor && !encounterLocked;
  const encounterEditable = !parentOrderCancelled && !encounterLocked && order?.encounter?.status === "OPEN";
  const resultDraftScope = useMemo<ClinicalDraftScope | null>(() => {
    if (kind !== "lab" && kind !== "radiology") return null;
    return {
      workflowType: "LAB_RADIOLOGY_DOCUMENTATION",
      encounterId: String(order?.encounterId ?? ""),
      facilityId,
      userId: currentUserId || UNKNOWN_CLINICAL_DRAFT_USER_ID,
      version: `${LAB_RAD_RESULT_DRAFT_VERSION}:${kind}`,
      subjectId: item.id,
    };
  }, [currentUserId, facilityId, item.id, kind, order?.encounterId]);
  const resultDraftKey = useMemo(
    () => (resultDraftScope ? buildClinicalDraftKey(resultDraftScope) : null),
    [resultDraftScope]
  );
  const resultDraftPayload = useMemo<LabRadiologyResultDraftPayload>(() => ({ resultText }), [resultText]);
  const serverResultSignature = useMemo(
    () => labRadiologyResultDraftSignature({ resultText: item.result?.resultText ?? "" }),
    [item.result?.resultText]
  );
  const resultDraftDirty =
    Boolean(resultDraftKey) && labRadiologyResultDraftSignature(resultDraftPayload) !== serverResultSignature;

  const operational = useMemo(() => {
    if (kind !== "lab" && kind !== "radiology") return null;
    const domain = kind === "lab" ? ("LAB" as const) : ("RADIOLOGY" as const);
    const siblings = Array.isArray(order?.items) ? order.items : [];
    return analyzeLabRadWorklistOperationalRow({
      domain,
      order: {
        id: order.id,
        createdAt: order.createdAt,
        type: order.type,
        priority: order.priority,
      },
      item,
      siblingItems: siblings,
    });
  }, [kind, order, item]);

  const saveTimeAdjust = useCallback(
    async (payload: { effectiveClinicalTime: string; reason?: string }) => {
      if (!timeAdjustTarget || !facilityId) return;
      setTimeAdjustSaving(true);
      try {
        await apiFetch(timeAdjustTarget.patchPath, {
          method: "PATCH",
          facilityId,
          body: JSON.stringify(payload),
        });
        setTimeAdjustTarget(null);
        await onReload();
      } finally {
        setTimeAdjustSaving(false);
      }
    },
    [timeAdjustTarget, facilityId, onReload]
  );

  /**
   * Saisie de résultat autorisée :
   * - LAB / RADIOLOGY / ADMIN sur leur file (existant) ; ou
   * - RN sur la file `lab` quand l'établissement a opté pour la politique Phase 1.
   * Le bouton de vérification provider et la file imagerie restent inchangés.
   */
  const canResult =
    ((kind === "lab" || kind === "radiology") && viewerIsDeptActor) ||
    (kind === "lab" && rnCanSubmitLabResult);
  const existingAtt = attachmentsFromResultDataAll(item.result?.resultData).filter(
    (a) => a.dataBase64 && String(a.dataBase64).length > 0
  );

  const statusAllowsSubstantiveResult = statusAllowsSubstantiveResultEntry(item.status);
  const workflowBlockMessage = canResult ? getWorkflowBlockMessage(t, item.status) : null;

  const criticalChanged = critical !== !!item.result?.criticalValue;
  const hasNewFiles = (pdfFiles?.length ?? 0) > 0 || (imgFiles?.length ?? 0) > 0;
  const hasText = resultText.trim().length > 0;
  const hasPayloadForSubmit =
    kind === "lab"
      ? hasText || hasNewFiles || criticalChanged
      : hasText || hasNewFiles;

  const substantiveBlocked = (hasText || hasNewFiles) && !statusAllowsSubstantiveResult;
  const resultDraftEditable = canResult && encounterEditable && statusAllowsSubstantiveResult;

  useEffect(() => {
    setResultText(item.result?.resultText ?? "");
    setCritical(!!item.result?.criticalValue);
    setDraftRestoredAt(null);
    setDraftSavedLocallyAt(null);
  }, [item.id, item.result?.resultText, item.result?.criticalValue]);

  useEffect(() => {
    if (!resultDraftKey || !resultDraftScope || restoringDraftRef.current) return;
    if (typeof window === "undefined") return;
    const draft = readClinicalDraft<LabRadiologyResultDraftPayload>(window.localStorage, resultDraftKey);
    const canRestore = shouldRestoreClinicalDraft({
      draft,
      scope: resultDraftScope,
      workflowEditable: resultDraftEditable,
      encounterStatus: order?.encounter?.status ?? null,
      serverSavedAt: item.result?.verifiedAt ?? item.updatedAt ?? order?.updatedAt ?? null,
      hasPayloadContent: labRadiologyResultDraftHasContent,
    });
    if (canRestore && draft) {
      restoringDraftRef.current = true;
      setResultText(draft.payload.resultText ?? "");
      setDraftRestoredAt(draft.metadata.savedLocallyAt);
      setDraftSavedLocallyAt(draft.metadata.savedLocallyAt);
      queueMicrotask(() => {
        restoringDraftRef.current = false;
      });
    } else if (draft && !canRestore) {
      removeClinicalDraft(window.localStorage, resultDraftKey);
    }
  }, [
    item.result?.verifiedAt,
    item.updatedAt,
    order?.encounter?.status,
    order?.updatedAt,
    resultDraftEditable,
    resultDraftKey,
    resultDraftScope,
  ]);

  useEffect(() => {
    if (!resultDraftKey || !resultDraftScope || restoringDraftRef.current) return;
    if (!resultDraftEditable) return;
    if (!resultDraftDirty || !labRadiologyResultDraftHasContent(resultDraftPayload)) {
      if (typeof window !== "undefined") removeClinicalDraft(window.localStorage, resultDraftKey);
      setDraftSavedLocallyAt(null);
      return;
    }
    if (typeof window === "undefined") return;
    const savedLocallyAt = new Date().toISOString();
    writeClinicalDraft(
      window.localStorage,
      resultDraftKey,
      createClinicalDraft({
        scope: resultDraftScope,
        payload: resultDraftPayload,
        savedLocallyAt,
        lastServerSavedAt: item.result?.verifiedAt ?? item.updatedAt ?? order?.updatedAt ?? null,
      })
    );
    setDraftSavedLocallyAt(savedLocallyAt);
  }, [
    item.result?.verifiedAt,
    item.updatedAt,
    order?.updatedAt,
    resultDraftDirty,
    resultDraftEditable,
    resultDraftKey,
    resultDraftPayload,
    resultDraftScope,
  ]);

  useClinicalBeforeUnloadWarning({
    dirty: resultDraftDirty && Boolean(draftSavedLocallyAt),
    workflowEditable: resultDraftEditable,
  });

  const workflowBtnStyle: React.CSSProperties = {
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    backgroundColor: "#fff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    color: "#334155",
  };

  const workflowPrimaryBtnStyle: React.CSSProperties = {
    ...workflowBtnStyle,
    border: "1px solid #0f172a",
    backgroundColor: "#0f172a",
    color: "#fff",
  };

  const showReadOnlyWorkflowNotice =
    expanded &&
    shouldShowDeptWorklistReadOnlyNotice({
      roles,
      kind,
      status: item.status,
      orderCancelled: parentOrderCancelled,
    });
  const nextWorkflowAction = viewerIsDeptActor
    ? resolveWorklistItemWorkflowAction(item.status)
    : null;
  const showAckButton = nextWorkflowAction === "acknowledge";
  const showStartButton = nextWorkflowAction === "start";
  const showCompleteButton =
    nextWorkflowAction === "complete" && !(kind === "pharmacy" && !isAlreadyDispensed(item));
  const workflowDisabled = Boolean(isOrderItemAnyWorkflowPending(pendingWorkflowAction, item.id) || saving);

  const detailWorkflowLabel = (action: OrderItemLifecycleWorkflowAction, idleKey: string): string => {
    if (isOrderItemWorkflowPending(pendingWorkflowAction, item.id, action)) {
      return t(ORDER_DETAIL_WORKFLOW_BUSY_LABEL_KEY[action]);
    }
    return t(idleKey);
  };

  const workflowButtons = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
      {showAckButton ? (
        <button
          type="button"
          data-testid={`order-detail-workflow-acknowledge-${item.id}`}
          disabled={workflowDisabled}
          onClick={() => onAck(item.id)}
          style={workflowPrimaryBtnStyle}
        >
          {detailWorkflowLabel("acknowledge", "orderDetail.ackReceive")}
        </button>
      ) : null}
      {showStartButton ? (
        <button
          type="button"
          data-testid={`order-detail-workflow-start-${item.id}`}
          disabled={workflowDisabled}
          onClick={() => onStart(item.id)}
          style={workflowPrimaryBtnStyle}
        >
          {detailWorkflowLabel("start", "orderDetail.startExam")}
        </button>
      ) : null}
      {showCompleteButton ? (
        <button
          type="button"
          data-testid={`order-detail-workflow-complete-${item.id}`}
          disabled={workflowDisabled}
          onClick={() => onComplete(item.id)}
          style={workflowBtnStyle}
        >
          {detailWorkflowLabel("complete", "orderDetail.completeExam")}
        </button>
      ) : null}
      {kind === "pharmacy" && onOpenDispense && (
        <>
          {!isAlreadyDispensed(item) ? (
            <button type="button" onClick={() => onOpenDispense(item)} style={{ padding: "6px 10px", cursor: "pointer" }}>
              {t("orderDetail.recordDispenseShort")}
            </button>
          ) : null}
          {order.encounter?.patient?.id ? (
            <Link
              href={`/app/pharmacy/dispense?patientId=${order.encounter.patient.id}&encounterId=${order.encounterId}`}
              style={{ fontSize: 14, alignSelf: "center" }}
            >
              {t("orderDetail.openDispenseScreen")}
            </Link>
          ) : null}
        </>
      )}
    </div>
  );

  const submitResult = async () => {
    if (!facilityId || parentOrderCancelled) return;
    setFeedback(null);

    if (!hasPayloadForSubmit) {
      setFeedback({
        type: "err",
        text: kind === "lab" ? t("orderDetail.errPayloadLab") : t("orderDetail.errPayloadRad"),
      });
      return;
    }

    if (substantiveBlocked) {
      setFeedback({
        type: "err",
        text: getWorkflowBlockMessage(t, item.status) || t("orderDetail.errWorkflowBlocked"),
      });
      return;
    }

    const newFiles = collectResultUploadFiles(pdfFiles, imgFiles);
    const preflight = validateResultUploadPreflight({
      resultText,
      existingResultData: item.result?.resultData,
      newFiles,
    });
    if (!preflight.ok) {
      const e = preflight.err;
      let errText: string;
      if (e.code === "totalTooLarge") {
        errText = t("orderDetail.uploadErrTotal");
      } else {
        const file = e.fileLabel;
        if (e.code === "invalidPdf") errText = fillTemplate(t("orderDetail.uploadErrPdf"), { file });
        else if (e.code === "invalidImage") errText = fillTemplate(t("orderDetail.uploadErrImage"), { file });
        else errText = fillTemplate(t("orderDetail.uploadErrSize"), { file });
      }
      setFeedback({ type: "err", text: errText });
      return;
    }

    setSaving(true);
    try {
      const newAttachments: AttachmentMeta[] = [];
      const readErr = t("orderDetail.fileReadFailed");
      const collect = async (list: FileList | null) => {
        if (!list?.length) return;
        for (let i = 0; i < list.length; i++) {
          const f = list[i];
          newAttachments.push(await readFileAsAttachment(f, readErr));
        }
      };
      await collect(pdfFiles);
      await collect(imgFiles);

      const body: Record<string, unknown> = {
        resultText: resultText.trim() || undefined,
      };
      if (labels.showCritical) body.criticalValue = critical;
      if (newAttachments.length > 0) body.resultData = { attachments: newAttachments };

      const res = await apiFetch(`/orders/${item.id}/result`, {
        method: "PUT",
        facilityId,
        body: JSON.stringify(body),
      });
      if (resultDraftKey && typeof window !== "undefined") {
        removeClinicalDraft(window.localStorage, resultDraftKey);
      }
      setDraftRestoredAt(null);
      setDraftSavedLocallyAt(null);
      if (res && typeof res === "object" && (res as { queued?: boolean }).queued === true) {
        setPdfFiles(null);
        setImgFiles(null);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(MEDORA_CHART_RESULT_UPDATED, {
              detail: { patientId: order.encounter?.patient?.id, encounterId: order.encounterId },
            })
          );
        }
        setFeedback({
          type: "ok",
          text: t("orderDetail.feedbackLocalSync"),
        });
        return;
      }

      setPdfFiles(null);
      setImgFiles(null);
      await onReload();
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(MEDORA_CHART_RESULT_UPDATED, {
            detail: { patientId: order.encounter?.patient?.id, encounterId: order.encounterId },
          })
        );
      }
      setFeedback({
        type: "ok",
        text: t("orderDetail.feedbackSaved"),
      });
    } catch (e: unknown) {
      const msg = normalizeUserFacingError(e instanceof Error ? e.message : null, language);
      setFeedback({
        type: "err",
        text: msg || t("orderDetail.feedbackSaveFailed"),
      });
    } finally {
      setSaving(false);
    }
  };

  const modalityLine =
    kind === "radiology" && item.catalogImagingStudy
      ? [item.catalogImagingStudy.modality, item.catalogImagingStudy.bodyRegion].filter(Boolean).join(" · ")
      : null;
  const medicationRoute =
    kind === "pharmacy" ? (item.route as string | undefined)?.trim() || item.catalogMedication?.route?.trim() || "" : "";
  const highRiskWarning = kind === "pharmacy" ? highRiskMedicationWarning(item, t) : null;

  return (
    <section
      id={`ligne-${item.id}`}
      style={{
        background: "#fff",
        border: highlight ? "2px solid #1565c0" : "1px solid #e0e0e0",
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onSelectLine}
        style={{
          display: "block",
          width: "100%",
          margin: 0,
          padding: 0,
          border: "none",
          background: "transparent",
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <h3 style={{ marginTop: 0, fontSize: 15 }}>
          {getOrderItemDisplayLabelFromLocale(item, language)}{" "}
          <span style={{ fontWeight: 400, color: "#666", fontSize: 13 }}>
            ({tOrderItemStatusForWorklist(t, item.status)})
          </span>
        </h3>
      </button>
      {expanded ? (
        <>
      {kind === "radiology" && modalityLine ? (
        <div style={{ fontSize: 13, color: "#546e7a", marginBottom: 8 }}>
          {t("orderDetail.modalityRegion")} {modalityLine}
        </div>
      ) : null}
      {kind === "pharmacy" ? (
        <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 8 }}>
          <div>
            <strong>{t("orderDetail.dosageLabel")}</strong> {item.strength ?? item.catalogMedication?.strength ?? t("common.dash")}
          </div>
          <div>
            <strong>{t("orderDetail.routeLabel")}</strong> {medicationRoute || t("common.dash")}
          </div>
          <div>
            <strong>{t("orderDetail.linePosology")}</strong> {(item.notes as string) || t("common.dash")}
          </div>
          <div>
            <strong>{t("orderDetail.quantityLabel")}</strong> {item.quantity ?? t("common.dash")} ·{" "}
            <strong>{t("orderDetail.refillsLabel")}</strong> {item.refillCount ?? 0}
          </div>
          {highRiskWarning ? (
            <div style={{ color: "#b45309", fontWeight: 600 }}>{highRiskWarning}</div>
          ) : null}
        </div>
      ) : null}
      {(() => {
        if (!item.notes || kind === "pharmacy") return null;
        const careDetails =
          String(item.catalogItemType ?? "") === "CARE"
            ? careOrderClinicalDetailLines(
                {
                  catalogItemType: "CARE",
                  enterpriseProcedureId:
                    typeof item.enterpriseProcedureId === "string" ? item.enterpriseProcedureId : null,
                  manualLabel: typeof item.manualLabel === "string" ? item.manualLabel : null,
                  notes: typeof item.notes === "string" ? item.notes : null,
                },
                language
              )
            : [];
        const cleanedNote =
          careDetails.length > 0
            ? null
            : sanitizeOrderItemNotesForDisplay({
                catalogItemType: String(item.catalogItemType ?? "CARE"),
                enterpriseProcedureId:
                  typeof item.enterpriseProcedureId === "string" ? item.enterpriseProcedureId : null,
                notes: typeof item.notes === "string" ? item.notes : null,
              });
        if (!careDetails.length && !cleanedNote) return null;
        return (
          <div style={{ fontSize: 13, marginBottom: 8 }}>
            <strong>{t("orderDetail.lineNoteLabel")}</strong>
            {careDetails.length > 0 ? (
              careDetails.map((line) => (
                <div key={line} style={{ marginTop: 4 }}>
                  {line}
                </div>
              ))
            ) : (
              <> {cleanedNote}</>
            )}
          </div>
        );
      })()}

      {showReadOnlyWorkflowNotice ? (
        <DeptWorklistReadOnlyNotice message={t(deptWorklistReadOnlyNoticeKey(kind))} />
      ) : null}

      {parentOrderCancelled ? null : workflowButtons}

      {operational &&
      (operational.reconciliation.badges.length > 0 || operational.escalationBadges.length > 0) ? (
        <div
          style={{
            marginTop: 10,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            background: "#f8fafc",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
            {t("labRadEscalation.detailEscalationTitle")}
          </div>
          <p style={{ margin: "0 0 6px 0", fontSize: 11, color: "#64748b", lineHeight: 1.45 }}>
            {t("labRadEscalation.detailEscalationReadOnly")}
          </p>
          <LabRadiologyOperationalBadges
            escalationBadges={operational.escalationBadges}
            reconciliationBadges={operational.reconciliation.badges}
            t={t}
            compact
          />
        </div>
      ) : null}

      {kind === "lab" && viewerIsDeptActor ? (
        <div style={{ marginTop: 10 }}>
          <LabRadiologyEffectiveTimeRow
            label={t("labRadTime.labReceived")}
            documentedAt={item.documentedReceivedAt}
            effectiveAt={item.effectiveReceivedAt}
            version={item.effectiveReceivedAtVersion ?? 0}
            dateLocale={dateLocale}
            canAdjust={canAdjustClinicalTime && Boolean(item.documentedReceivedAt)}
            onAdjust={() =>
              setTimeAdjustTarget({
                milestone: "received",
                patchPath: `/orders/items/${item.id}/effective-lab-received-time`,
                titleKey: "labRadTime.adjustReceivedTitle",
                documentedAt: new Date(item.documentedReceivedAt),
                effectiveAt: item.effectiveReceivedAt,
                version: item.effectiveReceivedAtVersion ?? 0,
              })
            }
            t={t}
          />
          <LabRadiologyEffectiveTimeRow
            label={t("labRadTime.labCollected")}
            documentedAt={item.documentedCollectedAt}
            effectiveAt={item.effectiveCollectedAt}
            version={item.effectiveCollectedAtVersion ?? 0}
            dateLocale={dateLocale}
            canAdjust={canAdjustClinicalTime && Boolean(item.documentedCollectedAt)}
            onAdjust={() =>
              setTimeAdjustTarget({
                milestone: "collected",
                patchPath: `/orders/items/${item.id}/effective-lab-collected-time`,
                titleKey: "labRadTime.adjustCollectedTitle",
                documentedAt: new Date(item.documentedCollectedAt),
                effectiveAt: item.effectiveCollectedAt,
                version: item.effectiveCollectedAtVersion ?? 0,
              })
            }
            t={t}
          />
          {item.result?.verifiedAt ? (
            <LabRadiologyEffectiveTimeRow
              label={t("labRadTime.labResulted")}
              documentedAt={item.result.verifiedAt}
              effectiveAt={item.result.effectiveResultedAt}
              version={item.result.effectiveResultedAtVersion ?? 0}
              dateLocale={dateLocale}
              canAdjust={canAdjustClinicalTime}
              onAdjust={() =>
                setTimeAdjustTarget({
                  milestone: "resulted",
                  patchPath: `/orders/${item.id}/effective-lab-result-time`,
                  titleKey: "labRadTime.adjustResultedTitle",
                  documentedAt: new Date(item.result.verifiedAt),
                  effectiveAt: item.result.effectiveResultedAt,
                  version: item.result.effectiveResultedAtVersion ?? 0,
                })
              }
              t={t}
            />
          ) : null}
        </div>
      ) : null}

      {kind === "radiology" && viewerIsDeptActor ? (
        <div style={{ marginTop: 10 }}>
        <LabRadiologyEffectiveTimeRow
          label={t("labRadTime.imagingPerformed")}
          documentedAt={item.documentedPerformedAt}
          effectiveAt={item.effectivePerformedAt}
          version={item.effectivePerformedAtVersion ?? 0}
          dateLocale={dateLocale}
          canAdjust={canAdjustClinicalTime && Boolean(item.documentedPerformedAt)}
          onAdjust={() =>
            setTimeAdjustTarget({
              milestone: "performed",
              patchPath: `/orders/items/${item.id}/effective-imaging-performed-time`,
              titleKey: "labRadTime.adjustPerformedTitle",
              documentedAt: new Date(item.documentedPerformedAt),
              effectiveAt: item.effectivePerformedAt,
              version: item.effectivePerformedAtVersion ?? 0,
            })
          }
          t={t}
        />
        {item.result?.verifiedAt ? (
          <LabRadiologyEffectiveTimeRow
            label={t("labRadTime.imagingFinalized")}
            documentedAt={item.result.verifiedAt}
            effectiveAt={item.result.effectiveFinalizedAt}
            version={item.result.effectiveFinalizedAtVersion ?? 0}
            dateLocale={dateLocale}
            canAdjust={canAdjustClinicalTime}
            onAdjust={() =>
              setTimeAdjustTarget({
                milestone: "finalized",
                patchPath: `/orders/${item.id}/effective-imaging-finalized-time`,
                titleKey: "labRadTime.adjustFinalizedTitle",
                documentedAt: new Date(item.result.verifiedAt),
                effectiveAt: item.result.effectiveFinalizedAt,
                version: item.result.effectiveFinalizedAtVersion ?? 0,
              })
            }
            t={t}
          />
        ) : null}
        </div>
      ) : null}

      {item.result &&
      (item.result.resultText?.trim() ||
        existingAtt.length > 0 ||
        attachmentsFromResultDataAll(item.result.resultData).length > 0) ? (
        <div style={{ marginTop: 14 }}>
          {(() => {
            const v = clinicalResultFromOrderItemLike({
              displayLabel: getOrderItemDisplayLabelFromLocale(item, language),
              status: item.status,
              catalogItemType: item.catalogItemType,
              result: item.result,
            });
            return (
              <ClinicalResultViewer
                compact
                title={v.title}
                itemStatus={v.itemStatus}
                verifiedAt={v.verifiedAt}
                resultDocumentedAt={v.resultDocumentedAt}
                resultClinicalAt={v.resultClinicalAt}
                resultEffectiveVersion={v.resultEffectiveVersion}
                criticalValue={v.criticalValue}
                resultText={v.resultText}
                attachments={v.attachments}
                enteredByDisplayFr={v.enteredByDisplayFr}
                acknowledgedByDisplayFr={v.acknowledgedByDisplayFr}
                acknowledgedByProviderAt={v.acknowledgedByProviderAt}
                catalogItemType={v.catalogItemType}
              />
            );
          })()}
        </div>
      ) : null}

      {canResult && !parentOrderCancelled ? (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #eee" }}>
          {workflowBlockMessage ? (
            <div
              id={`workflow-result-hint-${item.id}`}
              role="status"
              style={{
                marginBottom: 12,
                padding: "10px 12px",
                background: "#fff8e1",
                border: "1px solid #ffcc80",
                borderRadius: 8,
                fontSize: 13,
                color: "#5d4037",
                lineHeight: 1.45,
              }}
            >
              <strong>{t("orderDetail.stepRequired")}</strong> {workflowBlockMessage}
              {showAckButton ? (
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    disabled={workflowDisabled}
                    onClick={() => onAck(item.id)}
                    style={workflowPrimaryBtnStyle}
                  >
                    {detailWorkflowLabel("acknowledge", "orderDetail.ackReceive")}
                  </button>
                </div>
              ) : null}
              {showStartButton ? (
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    disabled={workflowDisabled}
                    onClick={() => onStart(item.id)}
                    style={workflowPrimaryBtnStyle}
                  >
                    {detailWorkflowLabel("start", "orderDetail.startExam")}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          {feedback ? (
            <div
              role={feedback.type === "err" ? "alert" : "status"}
              style={{
                marginBottom: 12,
                padding: "10px 12px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                background: feedback.type === "ok" ? "#e8f5e9" : "#ffebee",
                color: feedback.type === "ok" ? "#1b5e20" : "#b71c1c",
                border: `1px solid ${feedback.type === "ok" ? "#a5d6a7" : "#ffcdd2"}`,
              }}
            >
              {feedback.text}
            </div>
          ) : null}
          <label style={{ display: "block", fontSize: 13, fontWeight: 600 }}>
            {labels.resultLabel}
            {draftRestoredAt ? (
              <span style={{ display: "block", marginTop: 6, fontSize: 12, color: "#0369a1", fontWeight: 600 }}>
                {t("orderDetail.localDraftRestored")}
              </span>
            ) : null}
            {draftSavedLocallyAt ? (
              <span style={{ display: "block", marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                {t("orderDetail.localDraftSaved")}
              </span>
            ) : null}
            <textarea
              value={resultText}
              onChange={(e) => setResultText(e.target.value)}
              rows={4}
              placeholder={labels.resultPlaceholder}
              style={{ display: "block", marginTop: 6, width: "100%", boxSizing: "border-box", padding: 8 }}
            />
          </label>
          {labels.showCritical ? (
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 13 }}>
              <input type="checkbox" checked={critical} onChange={(e) => setCritical(e.target.checked)} />
              {t("orderDetail.criticalValueFlag")}
            </label>
          ) : null}
          <div style={{ marginTop: 10, fontSize: 13 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{t("orderDetail.uploadPdf")}</div>
            <input
              type="file"
              accept="application/pdf,.pdf"
              multiple
              onChange={(e) => setPdfFiles(e.target.files)}
            />
          </div>
          <div style={{ marginTop: 10, fontSize: 13 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{t("orderDetail.uploadImage")}</div>
            <input type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg" multiple onChange={(e) => setImgFiles(e.target.files)} />
          </div>
          <button
            type="button"
            disabled={saving}
            aria-describedby={workflowBlockMessage ? `workflow-result-hint-${item.id}` : undefined}
            onClick={() => void submitResult()}
            style={{
              marginTop: 12,
              padding: "8px 14px",
              cursor: saving ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            {saving ? t("orderDetail.saving") : labels.submitResult}
          </button>
          <p style={{ fontSize: 12, color: "#757575", marginTop: 8 }}>
            {t("orderDetail.uploadFormatsHint")} {t("orderDetail.uploadFooterHint")}
          </p>
        </div>
      ) : null}

      {timeAdjustTarget ? (
        <LabRadiologyEffectiveTimeModal
          open
          encounterId={String(order?.encounterId ?? "")}
          facilityId={facilityId}
          userId={currentUserId}
          orderItemId={item.id}
          departmentKind={kind === "lab" ? "lab" : "radiology"}
          milestone={timeAdjustTarget.milestone}
          workflowEditable={canAdjustClinicalTime && encounterEditable}
          lineLabel={getOrderItemDisplayLabelFromLocale(item, language)}
          milestoneLabel={t(timeAdjustTarget.titleKey)}
          defaultEffectiveIso={
            timeAdjustTarget.effectiveAt ?? timeAdjustTarget.documentedAt.toISOString()
          }
          documentedAt={timeAdjustTarget.documentedAt}
          orderCreatedAt={new Date(order.createdAt)}
          orderItemCreatedAt={new Date(item.createdAt)}
          adjustmentVersion={timeAdjustTarget.version}
          saving={timeAdjustSaving}
          onClose={() => setTimeAdjustTarget(null)}
          onSave={saveTimeAdjust}
        />
      ) : null}
        </>
      ) : null}
    </section>
  );
}
