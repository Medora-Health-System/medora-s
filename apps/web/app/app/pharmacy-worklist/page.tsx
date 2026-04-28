"use client";

import React, { useState, useEffect } from "react";
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

function isAlreadyDispensed(item: { pharmacyDispenseRecord?: unknown | null }) {
  return !!item.pharmacyDispenseRecord;
}

function PendingEncounterPatientCells({
  facilityId,
  encounterId,
}: {
  facilityId: string;
  encounterId: string;
}) {
  const [name, setName] = useState("…");
  const [mrn, setMrn] = useState("—");
  useEffect(() => {
    void getEncounterPatientLabelFromCache(facilityId, encounterId).then((p) => {
      setName(p.label);
      setMrn(p.mrn);
    });
  }, [facilityId, encounterId]);
  return (
    <>
      <td style={{ padding: 12 }}>{name}</td>
      <td style={{ padding: 12 }}>{mrn}</td>
    </>
  );
}

export default function PharmacyWorklistPage() {
  const { language, t } = useI18n();
  const { facilityId: facilityIdFromHook, ready } = useFacilityAndRoles();
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [pendingLocal, setPendingLocal] = useState<PendingFacilityQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordModal, setRecordModal] = useState<{
    orderItemId: string;
    medicationLine: string;
    prescriber?: string;
    authorityLine?: string;
  } | null>(null);
  const [recordQty, setRecordQty] = useState("1");
  const [recordInstr, setRecordInstr] = useState("");
  const [recordNotes, setRecordNotes] = useState("");
  const [recordSubmitting, setRecordSubmitting] = useState(false);
  /** Dernière action worklist mise en file hors ligne uniquement. */
  const [queuedActionNotice, setQueuedActionNotice] = useState<string | null>(null);

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
        items: order.items || [],
      },
      patient: order.encounter?.patient ?? {},
      language,
    });
  };

  const medicationLabel = (it: any) => getOrderItemDisplayLabelForLanguage(it, language, t);

  const openRecordModal = (order: any, item: any) => {
    if (orderIsCancelled(order)) return;
    if (isAlreadyDispensed(item)) return;
    setRecordModal({
      orderItemId: item.id,
      medicationLine: `${medicationLabel(item)} · ${t("pharmacyWorklistPage.recordLineQty")} ${item.quantity ?? t("common.dash")} · ${t("pharmacyWorklistPage.recordLineDirections")}: ${(item.notes as string) || t("common.dash")}`,
      prescriber: order.prescriberName as string | undefined,
      authorityLine: formatOrderAuthority(order, t),
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

  return (
    <div>
      <h1>{t("pharmacyWorklistPage.title")}</h1>
      <p>{t("pharmacyWorklistPage.subtitle")}</p>
      {queuedActionNotice ? (
        <div
          role="alert"
          style={{
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 8,
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
        <p>{t("pharmacyWorklistPage.loading")}</p>
      ) : queue.length === 0 && pendingLocal.length === 0 ? (
        <div style={{ marginTop: 24, padding: 16, backgroundColor: "white", borderRadius: 4 }}>
          <p>{t("pharmacyWorklistPage.loadEmpty")}</p>
        </div>
      ) : (
        <div style={{ marginTop: 24 }}>
          {queue.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: 12, textAlign: "left" }}>{t("pharmacyWorklistPage.colPatient")}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{t("pharmacyWorklistPage.colId")}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{t("pharmacyWorklistPage.colMedication")}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{t("pharmacyWorklistPage.colStrength")}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{t("pharmacyWorklistPage.colQuantity")}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{t("pharmacyWorklistPage.colRefills")}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{t("pharmacyWorklistPage.colDirections")}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{t("pharmacyWorklistPage.colPrescriber")}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{t("pharmacyWorklistPage.colContact")}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{t("pharmacyWorklistPage.colDate")}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{t("pharmacyWorklistPage.colPriority")}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{t("pharmacyWorklistPage.colStatus")}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{t("pharmacyWorklistPage.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(queue) ? queue : []).map((order) =>
                (Array.isArray(order.items) ? order.items : []).map((item: any) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 12 }}>
                      {order.encounter?.patient?.firstName} {order.encounter?.patient?.lastName}
                    </td>
                    <td style={{ padding: 12 }}>{order.encounter?.patient?.mrn ?? "—"}</td>
                    <td style={{ padding: 12 }}>{medicationLabel(item)}</td>
                    <td style={{ padding: 12 }}>{item.strength ?? item.catalogMedication?.strength ?? "—"}</td>
                    <td style={{ padding: 12 }}>{item.quantity ?? "—"}</td>
                    <td style={{ padding: 12 }}>{item.refillCount ?? 0}</td>
                    <td style={{ padding: 12 }}>{(item.notes as string) || "—"}</td>
                    <td style={{ padding: 12 }}>
                      <div>{(order.prescriberName as string) || "—"}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, overflowWrap: "anywhere" }}>
                        {formatOrderAuthority(order, t)}
                      </div>
                    </td>
                    <td style={{ padding: 12 }}>{(order.prescriberContact as string) || "—"}</td>
                    <td style={{ padding: 12 }}>
                      {order.createdAt ? formatEncounterChromeDateTime(order.createdAt, language) : t("common.dash")}
                    </td>
                    <td style={{ padding: 12 }}>
                      {tOrderPriority(t, order.priority)}
                      {order.pathwaySession && (
                        <span
                          style={{
                            marginLeft: 8,
                            padding: "2px 6px",
                            backgroundColor: "#e3f2fd",
                            color: "#1976d2",
                            borderRadius: 3,
                            fontSize: 11,
                          }}
                        >
                          {tPathwayType(t, order.pathwaySession.type)}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: 12 }}>
                      {orderIsCancelled(order) ? (
                        <span style={WORKLIST_ORDER_CANCELLED_BADGE_STYLE}>{t("pharmacyWorklistPage.orderCancelled")}</span>
                      ) : (
                        tOrderItemStatusForWorklist(t, item.status)
                      )}
                    </td>
                    <td style={{ padding: 12 }}>
                      {orderIsCancelled(order) ? (
                        <div>
                          <p style={{ margin: "0 0 8px 0", fontSize: 13, fontWeight: 600, color: "#b71c1c", lineHeight: 1.45 }}>
                            {t("pharmacyWorklistPage.orderCancelledNoAction")}
                          </p>
                          <Link
                            href={`/app/pharmacy-worklist/commande/${order.id}?ligne=${item.id}`}
                            style={{ fontSize: 13 }}
                            title={`${medicationLabel(item)} · ${order.prescriberName || ""}`}
                          >
                            {t("pharmacyWorklistPage.viewDetail")}
                          </Link>
                        </div>
                      ) : (
                        <>
                          <Link
                            href={`/app/pharmacy-worklist/commande/${order.id}?ligne=${item.id}`}
                            style={{ marginRight: 8, fontSize: 13 }}
                            title={`${medicationLabel(item)} · ${order.prescriberName || ""}`}
                          >
                            {t("pharmacyWorklistPage.viewDetail")}
                          </Link>
                          {!isAlreadyDispensed(item) ? (
                            <button
                              type="button"
                              onClick={() => openRecordModal(order, item)}
                              style={{ marginRight: 8, padding: "4px 8px", fontSize: 13, cursor: "pointer" }}
                            >
                              {t("pharmacyWorklistPage.recordDispense")}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => handlePrintRx(order)}
                            style={{ marginRight: 8, padding: "4px 8px", fontSize: 13, cursor: "pointer" }}
                          >
                            {t("pharmacyWorklistPage.print")}
                          </button>
                          {(item.status === "PLACED" || item.status === "SIGNED") && (
                            <button
                              onClick={() => handleAcknowledge(item.id)}
                              style={{ marginRight: 8, padding: "4px 8px", cursor: "pointer" }}
                            >
                              {t("pharmacyWorklistPage.acknowledge")}
                            </button>
                          )}
                          {item.status === "ACKNOWLEDGED" && (
                            <button
                              onClick={() => handleStart(item.id)}
                              style={{ marginRight: 8, padding: "4px 8px", cursor: "pointer" }}
                            >
                              {t("pharmacyWorklistPage.start")}
                            </button>
                          )}
                          {item.status === "IN_PROGRESS" && (
                            <button
                              onClick={() => handleComplete(item.id)}
                              style={{ marginRight: 8, padding: "4px 8px", cursor: "pointer" }}
                            >
                              {t("pharmacyWorklistPage.complete")}
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          ) : null}
          {pendingLocal.length > 0 ? (
            <div style={{ marginTop: queue.length > 0 ? 28 : 0 }}>
              <h2 style={{ fontSize: 16, marginBottom: 8 }}>{t("pharmacyWorklistPage.pendingSyncTitle")}</h2>
              <p style={{ fontSize: 13, color: "#856404", marginBottom: 12 }}>{t("pharmacyWorklistPage.pendingSyncBody")}</p>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  backgroundColor: "#fff8e1",
                  border: "1px solid #ffe082",
                  borderRadius: 8,
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "2px solid #ddd" }}>
                    <th style={{ padding: 12, textAlign: "left" }}>{t("pharmacyWorklistPage.colPatient")}</th>
                    <th style={{ padding: 12, textAlign: "left" }}>{t("pharmacyWorklistPage.colId")}</th>
                    <th style={{ padding: 12, textAlign: "left" }}>{t("pharmacyWorklistPage.colMedication")}</th>
                    <th style={{ padding: 12, textAlign: "left" }}>{t("pharmacyWorklistPage.colDate")}</th>
                    <th style={{ padding: 12, textAlign: "left" }}>{t("pharmacyWorklistPage.colPriority")}</th>
                    <th style={{ padding: 12, textAlign: "left" }}>{t("pharmacyWorklistPage.colStatus")}</th>
                    <th style={{ padding: 12, textAlign: "left" }}>{t("pharmacyWorklistPage.colActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingLocal.map((row) => (
                    <tr key={row.queueItemId} style={{ borderBottom: "1px solid #eee" }}>
                      <PendingEncounterPatientCells facilityId={row.facilityId} encounterId={row.encounterId} />
                      <td style={{ padding: 12 }}>
                        {row.itemLabels.filter(Boolean).join(", ") || "—"}
                      </td>
                      <td style={{ padding: 12 }}>
                        {formatEncounterChromeDateTime(row.createdAt, language)}
                      </td>
                      <td style={{ padding: 12 }}>{tOrderPriority(t, row.priority)}</td>
                      <td style={{ padding: 12 }}>{t("pharmacyWorklistPage.pendingSyncStatus")}</td>
                      <td style={{ padding: 12 }}>
                        <Link href={`/app/encounters/${row.encounterId}?tab=orders`} style={{ fontSize: 13 }}>
                          {t("pharmacyWorklistPage.linkEncounter")}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}

      {recordModal && (
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
          >
            <h2 style={{ marginTop: 0, fontSize: 18 }}>{t("pharmacyWorklistPage.modalTitle")}</h2>
            <p style={{ fontSize: 14, color: "#333" }}>{recordModal.medicationLine}</p>
            {recordModal.prescriber ? (
              <p style={{ fontSize: 13, color: "#555" }}>
                {t("pharmacyWorklistPage.modalPrescriberPrefix")} {recordModal.prescriber}
              </p>
            ) : null}
            {recordModal.authorityLine ? (
              <p style={{ fontSize: 13, color: "#64748b", overflowWrap: "anywhere" }}>
                {recordModal.authorityLine}
              </p>
            ) : null}
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
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button type="button" disabled={recordSubmitting} onClick={() => setRecordModal(null)}>
                {t("pharmacyWorklistPage.modalCancel")}
              </button>
              <button
                type="button"
                disabled={recordSubmitting}
                onClick={() => void submitRecordDispense()}
                style={{ fontWeight: 600 }}
              >
                {recordSubmitting ? t("pharmacyWorklistPage.modalSubmitting") : t("pharmacyWorklistPage.modalSubmit")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

