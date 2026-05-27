"use client";

import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { printRx } from "@/components/pharmacy/RxPrintLayout";
import { getOrderItemDisplayLabelForLanguage } from "@/lib/orderItemDisplayFr";
import {
  formatEncounterChromeDateTime,
  tOrderItemStatusForWorklist,
  tOrderPriority,
  tPathwayType,
} from "@/lib/encounterChromeI18n";
import {
  getEncounterPatientLabelFromCache,
  getPendingPharmacyMedicationOrderRowsForFacility,
  type PendingFacilityQueueRow,
} from "@/lib/offline/pendingEncounterOrders";
import { orderIsCancelled, WORKLIST_ORDER_CANCELLED_BADGE_STYLE } from "@/lib/worklistOrderCancelledUi";
import { useI18n } from "@/lib/i18n";
import { formatOrderAuthority } from "@/lib/orderAuthority";
import { formatOrderAttributionLines } from "@/lib/orderAttribution";
import { highRiskMedicationWarning } from "@/lib/highRiskMedication";
import { DISPLAY_DASH } from "@/lib/patientDisplay";
import {
  ancillaryTouchControlStyle,
  ancillaryWorklistActionRowStyle,
  ancillaryWorklistActionStackStyle,
  ancillaryWorklistPageInnerStyle,
  ancillaryWorklistPageShellStyle,
  ancillaryWorklistQueueListStyle,
  resolveAncillaryLayoutMode,
  type AncillaryLayoutMode,
} from "@/features/ancillary/ancillaryResponsiveLayout";
import {
  MedoraCard,
  MedoraCardActions,
  MedoraCardActionsMediaStyle,
  MedoraCardBadge,
  MedoraCardBadgeRow,
  MedoraCardIdentity,
  MedoraCardInner,
  MedoraCardMetaLines,
  MedoraCardTitle,
  getPriorityBadgeSoft,
  getPriorityBorder,
} from "@/components/medora-card";

function isAlreadyDispensed(item: { pharmacyDispenseRecord?: unknown | null }) {
  return !!item.pharmacyDispenseRecord;
}

function patientInitials(p: { firstName?: string | null; lastName?: string | null } | null | undefined): string {
  const f = (p?.firstName ?? "").trim();
  const l = (p?.lastName ?? "").trim();
  const a = f.charAt(0) || "";
  const b = l.charAt(0) || f.charAt(1) || "";
  return (a + b).toUpperCase() || "?";
}

function fullPatientName(p: { firstName?: string | null; lastName?: string | null } | null | undefined): string {
  return `${(p?.firstName ?? "").trim()} ${(p?.lastName ?? "").trim()}`.trim() || DISPLAY_DASH;
}

function PendingEncounterPatientBlock({
  facilityId,
  encounterId,
  children,
}: {
  facilityId: string;
  encounterId: string;
  children?: React.ReactNode;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("…");
  const [mrn, setMrn] = useState("—");
  useEffect(() => {
    void getEncounterPatientLabelFromCache(facilityId, encounterId).then((p) => {
      setName(p.label);
      setMrn(p.mrn);
    });
  }, [facilityId, encounterId]);
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";
  return (
    <div style={{ display: "flex", gap: 16, minWidth: 0, flex: 1 }}>
      <div
        aria-hidden
        style={{
          flexShrink: 0,
          width: 44,
          height: 44,
          borderRadius: "50%",
          backgroundColor: "#f1f5f9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 600,
          color: "#334155",
          border: "1px solid #e2e8f0",
        }}
      >
        {initials}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#0f172a", lineHeight: 1.25, wordBreak: "break-word" }}>
          {name}
        </h2>
        <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#64748b" }}>
          <span style={{ fontWeight: 600, color: "#475569" }}>{t("common.nir")}</span> {mrn}
        </p>
        {children}
      </div>
    </div>
  );
}

const btnGhost = (mode: AncillaryLayoutMode): React.CSSProperties =>
  ancillaryTouchControlStyle(
    {
      padding: "6px 12px",
      borderRadius: 8,
      border: "1px solid #cbd5e1",
      backgroundColor: "#fff",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 500,
      color: "#334155",
      textDecoration: "none",
    },
    mode
  );

const btnPrimary = (mode: AncillaryLayoutMode): React.CSSProperties =>
  ancillaryTouchControlStyle(
    {
      display: "inline-flex",
      justifyContent: "center",
      padding: "8px 14px",
      borderRadius: 10,
      border: "1px solid #0f172a",
      backgroundColor: "#0f172a",
      color: "#fff",
      fontSize: 13,
      fontWeight: 600,
      textDecoration: "none",
      textAlign: "center",
      cursor: "pointer",
    },
    mode
  );

export default function PharmacyWorklistPage() {
  const { language, t } = useI18n();
  const { facilityId: facilityIdFromHook, ready } = useFacilityAndRoles();
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [pendingLocal, setPendingLocal] = useState<PendingFacilityQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [layoutMode, setLayoutMode] = useState<AncillaryLayoutMode>("desktopDense");
  const [recordModal, setRecordModal] = useState<{
    orderItemId: string;
    medicationLine: string;
    highRiskWarning?: string | null;
    prescriber?: string;
    authorityLine?: string;
    attributionLines?: string[];
  } | null>(null);
  const [recordQty, setRecordQty] = useState("1");
  const [recordInstr, setRecordInstr] = useState("");
  const [recordNotes, setRecordNotes] = useState("");
  const [recordSubmitting, setRecordSubmitting] = useState(false);
  const [queuedActionNotice, setQueuedActionNotice] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyLayoutMode = () => {
      setLayoutMode(resolveAncillaryLayoutMode(window.innerWidth));
    };
    applyLayoutMode();
    window.addEventListener("resize", applyLayoutMode);
    return () => window.removeEventListener("resize", applyLayoutMode);
  }, []);

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("medora_facility_id="))
      ?.split("=")[1];
    setFacilityId(cookieValue || facilityIdFromHook || null);
  }, [facilityIdFromHook]);

  useEffect(() => {
    if (!ready || !facilityId) return;
    loadQueue();
    const interval = setInterval(loadQueue, 10000);
    return () => clearInterval(interval);
  }, [ready, facilityId]);

  const loadQueue = async () => {
    if (!facilityId) return;
    setLoading(true);
    const pendingP = getPendingPharmacyMedicationOrderRowsForFacility(facilityId, language);
    try {
      const data = await apiFetch("/worklists/pharmacy", { facilityId });
      setQueue(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load pharmacy worklist:", error);
      setQueue([]);
    }
    const pendingRows = await pendingP;
    setPendingLocal(pendingRows);
    setLoading(false);
  };

  const queuePairs = useMemo(
    () =>
      (Array.isArray(queue) ? queue : []).flatMap((order) =>
        (Array.isArray(order.items) ? order.items : []).map((item: any) => ({ order, item }))
      ),
    [queue]
  );

  const handleAcknowledge = async (itemId: string) => {
    if (!facilityId) return;
    const item = (Array.isArray(queue) ? queue : [])
      .flatMap((o: any) => (Array.isArray(o.items) ? o.items : []))
      .find((i: any) => i.id === itemId);
    if (!item) return;
    if (item.status !== "PLACED" && item.status !== "PENDING" && item.status !== "SIGNED") {
      console.warn("ACK blocked: invalid state", item.status);
      return;
    }
    try {
      const res = await apiFetch(`/orders/items/${itemId}/acknowledge`, {
        method: "POST",
        facilityId,
      });
      const queued =
        res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
      setQueuedActionNotice(queued ? t("pharmacyWorklistPage.queuedNotice") : null);
      loadQueue();
    } catch (error) {
      alert(t("pharmacyWorklistPage.alertAckFailed"));
    }
  };

  const handleStart = async (itemId: string) => {
    if (!facilityId) return;
    try {
      const res = await apiFetch(`/orders/items/${itemId}/start`, {
        method: "POST",
        facilityId,
      });
      const queued =
        res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
      setQueuedActionNotice(queued ? t("pharmacyWorklistPage.queuedNotice") : null);
      loadQueue();
    } catch (error) {
      alert(t("pharmacyWorklistPage.alertStartFailed"));
    }
  };

  const handleComplete = async (itemId: string) => {
    if (!facilityId) return;
    try {
      const res = await apiFetch(`/orders/items/${itemId}/complete`, {
        method: "POST",
        facilityId,
      });
      const queued =
        res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
      setQueuedActionNotice(queued ? t("pharmacyWorklistPage.queuedNotice") : null);
      loadQueue();
    } catch (error) {
      alert(t("pharmacyWorklistPage.alertCompleteFailed"));
    }
  };

  const handlePrintRx = (order: any) => {
    printRx({
      order: {
        createdAt: order.createdAt,
        prescriberName: order.prescriberName,
        prescriberLicense: order.prescriberLicense,
        prescriberContact: order.prescriberContact,
        authority: order.authority ?? { source: order.source },
        createdByDisplay: order.createdByDisplay,
        lastActionDisplay: order.lastActionDisplay,
        items: order.items || [],
      },
      patient: order.encounter?.patient ?? {},
      language,
    });
  };

  const medicationLabel = (it: any) => getOrderItemDisplayLabelForLanguage(it, language, t);
  const medicationRoute = (it: any) => (it.route as string | undefined)?.trim() || it.catalogMedication?.route?.trim() || "";

  const openRecordModal = (order: any, item: any) => {
    if (orderIsCancelled(order)) return;
    if (isAlreadyDispensed(item)) return;
    setRecordModal({
      orderItemId: item.id,
      medicationLine: `${medicationLabel(item)} · ${t("pharmacyWorklistPage.recordLineQty")} ${item.quantity ?? t("common.dash")} · ${t("pharmacyWorklistPage.recordLineRoute")}: ${medicationRoute(item) || t("common.dash")} · ${t("pharmacyWorklistPage.recordLineDirections")}: ${(item.notes as string) || t("common.dash")}`,
      highRiskWarning: highRiskMedicationWarning(item, t),
      prescriber: order.prescriberName as string | undefined,
      authorityLine: formatOrderAuthority(order, t),
      attributionLines: formatOrderAttributionLines(order, t, language),
    });
    setRecordQty(String(item.quantity ?? 1));
    setRecordInstr(((item.notes as string) || "").trim());
    setRecordNotes("");
  };

  const submitRecordDispense = async () => {
    if (!facilityId || !recordModal) return;
    const item = (Array.isArray(queue) ? queue : [])
      .flatMap((o: any) => (Array.isArray(o.items) ? o.items : []))
      .find((i: any) => i.id === recordModal.orderItemId);
    if (!item || isAlreadyDispensed(item)) return;
    const q = parseInt(recordQty, 10);
    if (!Number.isFinite(q) || q < 1) {
      alert(t("pharmacyWorklistPage.alertInvalidQty"));
      return;
    }
    setRecordSubmitting(true);
    try {
      const res = await apiFetch("/pharmacy/dispenses/record-order", {
        method: "POST",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderItemId: recordModal.orderItemId,
          quantityDispensed: q,
          dosageInstructions: recordInstr.trim() || undefined,
          notes: recordNotes.trim() || undefined,
        }),
      });
      const queued =
        res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
      setQueuedActionNotice(queued ? t("pharmacyWorklistPage.queuedNotice") : null);
      setRecordModal(null);
      loadQueue();
    } catch {
      alert(t("pharmacyWorklistPage.alertDispenseFailed"));
    } finally {
      setRecordSubmitting(false);
    }
  };

  const renderActions = (order: any, item: any) => {
    const detailTitle = `${medicationLabel(item)} · ${order.prescriberName || ""}`;
    if (orderIsCancelled(order)) {
      return (
        <div style={ancillaryWorklistActionStackStyle()}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#b71c1c", lineHeight: 1.45 }}>
            {t("pharmacyWorklistPage.orderCancelledNoAction")}
          </p>
          <Link
            href={`/app/pharmacy-worklist/commande/${order.id}?ligne=${item.id}`}
            style={btnPrimary(layoutMode)}
            title={detailTitle}
          >
            {t("pharmacyWorklistPage.viewDetail")}
          </Link>
        </div>
      );
    }
    return (
      <div style={ancillaryWorklistActionStackStyle()}>
        <div style={ancillaryWorklistActionRowStyle()}>
          {(item.status === "PLACED" || item.status === "SIGNED") && (
            <button type="button" onClick={() => void handleAcknowledge(item.id)} style={btnGhost(layoutMode)}>
              {t("pharmacyWorklistPage.acknowledge")}
            </button>
          )}
          {item.status === "ACKNOWLEDGED" && (
            <button type="button" onClick={() => void handleStart(item.id)} style={btnGhost(layoutMode)}>
              {t("pharmacyWorklistPage.start")}
            </button>
          )}
          {item.status === "IN_PROGRESS" && (
            <button type="button" onClick={() => void handleComplete(item.id)} style={btnGhost(layoutMode)}>
              {t("pharmacyWorklistPage.complete")}
            </button>
          )}
        </div>
        <Link
          href={`/app/pharmacy-worklist/commande/${order.id}?ligne=${item.id}`}
          style={btnPrimary(layoutMode)}
          title={detailTitle}
        >
          {t("pharmacyWorklistPage.viewDetail")}
        </Link>
        {!isAlreadyDispensed(item) ? (
          <button type="button" onClick={() => openRecordModal(order, item)} style={btnGhost(layoutMode)}>
            {t("pharmacyWorklistPage.recordDispense")}
          </button>
        ) : null}
        <button type="button" onClick={() => handlePrintRx(order)} style={btnGhost(layoutMode)}>
          {t("pharmacyWorklistPage.print")}
        </button>
      </div>
    );
  };

  const renderQueueList = (pairs: { order: any; item: any }[]) => (
    <ul style={ancillaryWorklistQueueListStyle(layoutMode)}>
      {pairs.map(({ order, item }) => {
        const patient = order.encounter?.patient;
        const pc = String(order.priority ?? "ROUTINE");
        const pSoft = getPriorityBadgeSoft(pc);
        const borderLeft = getPriorityBorder(pc);
        const hrWarning = highRiskMedicationWarning(item, t);
        const strength = item.strength ?? item.catalogMedication?.strength ?? t("common.dash");
        const qty = item.quantity ?? t("common.dash");
        const refills = item.refillCount ?? 0;
        const directions = (item.notes as string) || t("common.dash");
        const prescriber = (order.prescriberName as string) || t("common.dash");
        const contact = (order.prescriberContact as string) || t("common.dash");
        const orderedAt = order.createdAt ? formatEncounterChromeDateTime(order.createdAt, language) : t("common.dash");

        return (
          <li key={item.id} style={{ minWidth: 0 }}>
            <MedoraCard
              className="transition-shadow duration-150 ease-out hover:shadow-[0_4px_14px_rgba(15,23,42,0.08)]"
              leftAccentColor={borderLeft}
              variant="default"
            >
              <MedoraCardInner>
                <MedoraCardIdentity initials={patientInitials(patient)}>
                  <MedoraCardTitle
                    title={fullPatientName(patient)}
                    subline={
                      <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                        <span style={{ fontWeight: 600, color: "#475569" }}>{t("common.nir")}</span>{" "}
                        {(patient?.mrn ?? "").trim() || t("common.dash")}
                      </p>
                    }
                  />
                  <MedoraCardBadgeRow>
                    <MedoraCardBadge preset="neutral">
                      {t("pharmacyWorklistPage.colMedication")} · {medicationLabel(item)}
                    </MedoraCardBadge>
                    {orderIsCancelled(order) ? (
                      <span style={WORKLIST_ORDER_CANCELLED_BADGE_STYLE}>{t("pharmacyWorklistPage.orderCancelled")}</span>
                    ) : (
                      <MedoraCardBadge preset="neutral">{tOrderItemStatusForWorklist(t, item.status)}</MedoraCardBadge>
                    )}
                    {order.pathwaySession ? (
                      <MedoraCardBadge preset="pathway">{tPathwayType(t, order.pathwaySession.type)}</MedoraCardBadge>
                    ) : null}
                  </MedoraCardBadgeRow>
                  <MedoraCardMetaLines>
                    {medicationRoute(item) ? (
                      <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#64748b", overflowWrap: "anywhere" }}>
                        <span style={{ fontWeight: 600, color: "#475569" }}>{t("pharmacyWorklistPage.recordLineRoute")}</span>{" "}
                        {medicationRoute(item)}
                      </p>
                    ) : null}
                    {hrWarning ? (
                      <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#b45309", fontWeight: 600, overflowWrap: "anywhere" }}>
                        {hrWarning}
                      </p>
                    ) : null}
                    <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#64748b", overflowWrap: "anywhere" }}>
                      <span style={{ fontWeight: 600, color: "#475569" }}>{t("pharmacyWorklistPage.colStrength")}</span> {strength}
                      {" · "}
                      <span style={{ fontWeight: 600, color: "#475569" }}>{t("pharmacyWorklistPage.colQuantity")}</span> {qty}
                      {" · "}
                      <span style={{ fontWeight: 600, color: "#475569" }}>{t("pharmacyWorklistPage.colRefills")}</span> {refills}
                    </p>
                    <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#64748b", overflowWrap: "anywhere" }}>
                      <span style={{ fontWeight: 600, color: "#475569" }}>{t("pharmacyWorklistPage.colDirections")}</span> {directions}
                    </p>
                    <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#64748b", overflowWrap: "anywhere" }}>
                      <span style={{ fontWeight: 600, color: "#475569" }}>{t("pharmacyWorklistPage.colPrescriber")}</span> {prescriber}
                    </p>
                    <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#64748b", overflowWrap: "anywhere" }}>
                      {formatOrderAuthority(order, t)}
                    </p>
                    {formatOrderAttributionLines(order, t, language).map((line) => (
                      <p key={line} style={{ margin: "4px 0 0 0", fontSize: 12, color: "#64748b", overflowWrap: "anywhere" }}>
                        {line}
                      </p>
                    ))}
                    <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#64748b", overflowWrap: "anywhere" }}>
                      <span style={{ fontWeight: 600, color: "#475569" }}>{t("pharmacyWorklistPage.colContact")}</span> {contact}
                    </p>
                    <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#64748b" }}>
                      <span style={{ fontWeight: 600, color: "#475569" }}>{t("pharmacyWorklistPage.colDate")}</span> {orderedAt}
                    </p>
                  </MedoraCardMetaLines>
                </MedoraCardIdentity>

                <MedoraCardActions railBorderTopColor="#f1f5f9">
                  <MedoraCardBadge soft={pSoft}>{tOrderPriority(t, pc)}</MedoraCardBadge>
                  {renderActions(order, item)}
                </MedoraCardActions>
              </MedoraCardInner>
            </MedoraCard>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div style={ancillaryWorklistPageShellStyle()} data-testid="pharmacy-worklist-layout" data-layout-mode={layoutMode}>
      <div style={ancillaryWorklistPageInnerStyle()}>
        <header style={{ marginBottom: 20, paddingTop: 12 }}>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(1.35rem, 2.5vw, 1.65rem)",
              fontWeight: 600,
              color: "#0f172a",
            }}
          >
            {t("pharmacyWorklistPage.title")}
          </h1>
          <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b", maxWidth: 720, lineHeight: 1.55 }}>
            {t("pharmacyWorklistPage.subtitle")}
          </p>
        </header>

        {queuedActionNotice ? (
          <div
            role="alert"
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #ef9a9a",
              backgroundColor: "#ffebee",
              fontSize: 13,
              fontWeight: 600,
              color: "#b71c1c",
              lineHeight: 1.45,
              maxWidth: 720,
            }}
          >
            {queuedActionNotice}
          </div>
        ) : null}

        {loading && queue.length === 0 && pendingLocal.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  borderRadius: 16,
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#fff",
                  padding: 16,
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
                }}
              >
                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", backgroundColor: "#f1f5f9" }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ height: 16, width: "45%", borderRadius: 4, backgroundColor: "#f1f5f9" }} />
                    <div style={{ height: 12, width: "30%", borderRadius: 4, backgroundColor: "#f1f5f9" }} />
                    <div style={{ height: 12, width: "75%", borderRadius: 4, backgroundColor: "#f1f5f9" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : queue.length === 0 && pendingLocal.length === 0 ? (
          <div
            style={{
              marginTop: 24,
              borderRadius: 16,
              border: "1px dashed #cbd5e1",
              backgroundColor: "rgba(255,255,255,0.9)",
              padding: "48px 24px",
              textAlign: "center",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
            }}
          >
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#334155" }}>{t("pharmacyWorklistPage.loadEmpty")}</p>
          </div>
        ) : (
          <div style={{ marginTop: 24 }}>
            {queuePairs.length > 0 ? renderQueueList(queuePairs) : null}

            {pendingLocal.length > 0 ? (
              <div style={{ marginTop: queuePairs.length > 0 ? 32 : 0 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "#0f172a" }}>
                  {t("pharmacyWorklistPage.pendingSyncTitle")}
                </h2>
                <p style={{ fontSize: 13, color: "#856404", marginBottom: 12 }}>{t("pharmacyWorklistPage.pendingSyncBody")}</p>
                <ul style={ancillaryWorklistQueueListStyle(layoutMode)}>
                  {pendingLocal.map((row) => {
                    const pc = String(row.priority ?? "ROUTINE");
                    const pSoft = getPriorityBadgeSoft(pc);
                    const borderLeft = getPriorityBorder(pc);
                    return (
                      <li key={row.queueItemId} style={{ minWidth: 0 }}>
                        <MedoraCard
                          className="transition-shadow duration-150 ease-out hover:shadow-[0_4px_14px_rgba(15,23,42,0.08)]"
                          leftAccentColor={borderLeft}
                          variant="pendingSync"
                        >
                          <MedoraCardInner>
                            <PendingEncounterPatientBlock facilityId={row.facilityId} encounterId={row.encounterId}>
                              <MedoraCardBadgeRow>
                                <MedoraCardBadge preset="neutral">
                                  {row.itemLabels.filter(Boolean).join(", ") || t("common.dash")}
                                </MedoraCardBadge>
                                <MedoraCardBadge preset="neutral">{t("pharmacyWorklistPage.pendingSyncStatus")}</MedoraCardBadge>
                              </MedoraCardBadgeRow>
                              <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#64748b" }}>
                                {formatEncounterChromeDateTime(row.createdAt, language)}
                              </p>
                            </PendingEncounterPatientBlock>
                            <MedoraCardActions railBorderTopColor="#fde68a">
                              <MedoraCardBadge soft={pSoft}>{tOrderPriority(t, pc)}</MedoraCardBadge>
                              <Link
                                href={`/app/encounters/${row.encounterId}?tab=orders`}
                                style={btnPrimary(layoutMode)}
                              >
                                {t("pharmacyWorklistPage.linkEncounter")}
                              </Link>
                            </MedoraCardActions>
                          </MedoraCardInner>
                        </MedoraCard>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        )}

        <MedoraCardActionsMediaStyle />
      </div>

      {recordModal ? (
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
          onClick={() => !recordSubmitting && setRecordModal(null)}
          role="presentation"
        >
          <div
            style={{ background: "#fff", borderRadius: 8, padding: 24, maxWidth: 480, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h2 style={{ marginTop: 0, fontSize: 18 }}>{t("pharmacyWorklistPage.modalTitle")}</h2>
            <p style={{ fontSize: 14, color: "#333" }}>{recordModal.medicationLine}</p>
            {recordModal.highRiskWarning ? (
              <p style={{ fontSize: 13, color: "#b45309", margin: "4px 0" }}>{recordModal.highRiskWarning}</p>
            ) : null}
            {recordModal.prescriber ? (
              <p style={{ fontSize: 13, color: "#555" }}>
                {t("pharmacyWorklistPage.modalPrescriberPrefix")} {recordModal.prescriber}
              </p>
            ) : null}
            {recordModal.authorityLine ? (
              <p style={{ fontSize: 13, color: "#64748b", overflowWrap: "anywhere" }}>{recordModal.authorityLine}</p>
            ) : null}
            {recordModal.attributionLines?.map((line) => (
              <p key={line} style={{ fontSize: 13, color: "#64748b", overflowWrap: "anywhere", margin: "4px 0" }}>
                {line}
              </p>
            ))}
            <label style={{ display: "block", marginTop: 12, fontSize: 13 }}>
              {t("pharmacyWorklistPage.modalQtyLabel")}
              <input
                type="number"
                min={1}
                value={recordQty}
                onChange={(e) => setRecordQty(e.target.value)}
                style={{ display: "block", marginTop: 4, padding: 8, width: "100%", boxSizing: "border-box" }}
              />
            </label>
            <label style={{ display: "block", marginTop: 12, fontSize: 13 }}>
              {t("pharmacyWorklistPage.modalDirectionsLabel")}
              <textarea
                value={recordInstr}
                onChange={(e) => setRecordInstr(e.target.value)}
                rows={2}
                style={{ display: "block", marginTop: 4, padding: 8, width: "100%", boxSizing: "border-box" }}
              />
            </label>
            <label style={{ display: "block", marginTop: 12, fontSize: 13 }}>
              {t("pharmacyWorklistPage.modalNotesLabel")}
              <textarea
                value={recordNotes}
                onChange={(e) => setRecordNotes(e.target.value)}
                rows={2}
                style={{ display: "block", marginTop: 4, padding: 8, width: "100%", boxSizing: "border-box" }}
              />
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button
                type="button"
                disabled={recordSubmitting}
                onClick={() => setRecordModal(null)}
                style={btnGhost(layoutMode)}
              >
                {t("pharmacyWorklistPage.modalCancel")}
              </button>
              <button
                type="button"
                disabled={recordSubmitting}
                onClick={() => void submitRecordDispense()}
                style={ancillaryTouchControlStyle({ ...btnPrimary(layoutMode), fontWeight: 600 }, layoutMode)}
              >
                {recordSubmitting ? t("pharmacyWorklistPage.modalSubmitting") : t("pharmacyWorklistPage.modalSubmit")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
