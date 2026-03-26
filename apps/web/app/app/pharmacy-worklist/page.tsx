"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/apiClient";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { printRx } from "@/components/pharmacy/RxPrintLayout";
import { getOrderItemDisplayLabelFr } from "@/lib/orderItemDisplayFr";
import { getOrderItemStatusLabel } from "@/constants/orderStatusLabels";
import { getOrderPriorityLabelFr, getPathwayTypeLabelFr, ui } from "@/lib/uiLabels";
import {
  getEncounterPatientLabelFromCache,
  getPendingPharmacyMedicationOrderRowsForFacility,
  type PendingFacilityQueueRow,
} from "@/lib/offline/pendingEncounterOrders";

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
  const { facilityId: facilityIdFromHook, ready } = useFacilityAndRoles();
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [pendingLocal, setPendingLocal] = useState<PendingFacilityQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordModal, setRecordModal] = useState<{
    orderItemId: string;
    medicationLine: string;
    prescriber?: string;
  } | null>(null);
  const [recordQty, setRecordQty] = useState("1");
  const [recordInstr, setRecordInstr] = useState("");
  const [recordNotes, setRecordNotes] = useState("");
  const [recordSubmitting, setRecordSubmitting] = useState(false);

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
    const pendingP = getPendingPharmacyMedicationOrderRowsForFacility(facilityId);
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
    try {
      await apiFetch(`/orders/items/${itemId}/acknowledge`, {
        method: "POST",
        facilityId,
      });
      loadQueue();
    } catch (error) {
      alert("Impossible d'acquitter");
    }
  };

  const handleStart = async (itemId: string) => {
    if (!facilityId) return;
    try {
      await apiFetch(`/orders/items/${itemId}/start`, {
        method: "POST",
        facilityId,
      });
      loadQueue();
    } catch (error) {
      alert("Impossible de démarrer");
    }
  };

  const handleComplete = async (itemId: string) => {
    if (!facilityId) return;
    try {
      await apiFetch(`/orders/items/${itemId}/complete`, {
        method: "POST",
        facilityId,
      });
      loadQueue();
    } catch (error) {
      alert("Impossible de terminer");
    }
  };

  const handlePrintRx = (order: any) => {
    printRx({
      order: {
        createdAt: order.createdAt,
        prescriberName: order.prescriberName,
        prescriberLicense: order.prescriberLicense,
        prescriberContact: order.prescriberContact,
        items: order.items || [],
      },
      patient: order.encounter?.patient ?? {},
    });
  };

  const medicationLabel = (it: any) => getOrderItemDisplayLabelFr(it);

  const openRecordModal = (order: any, item: any) => {
    setRecordModal({
      orderItemId: item.id,
      medicationLine: `${medicationLabel(item)} · Qté ${item.quantity ?? "—"} · Posologie : ${(item.notes as string) || "—"}`,
      prescriber: order.prescriberName as string | undefined,
    });
    setRecordQty(String(item.quantity ?? 1));
    setRecordInstr(((item.notes as string) || "").trim());
    setRecordNotes("");
  };

  const submitRecordDispense = async () => {
    if (!facilityId || !recordModal) return;
    const q = parseInt(recordQty, 10);
    if (!Number.isFinite(q) || q < 1) {
      alert("Quantité invalide");
      return;
    }
    setRecordSubmitting(true);
    try {
      await apiFetch("/pharmacy/dispenses/record-order", {
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
      setRecordModal(null);
      loadQueue();
    } catch {
      alert("Impossible d'enregistrer la dispensation");
    } finally {
      setRecordSubmitting(false);
    }
  };

  return (
    <div>
      <h1>Liste pharmacie</h1>
      <p>Ordres de médicaments à vérifier et dispenser.</p>
      {loading && queue.length === 0 && pendingLocal.length === 0 ? (
        <p>Chargement…</p>
      ) : queue.length === 0 && pendingLocal.length === 0 ? (
        <div style={{ marginTop: 24, padding: 16, backgroundColor: "white", borderRadius: 4 }}>
          <p>Aucun ordre médicament dans la liste.</p>
        </div>
      ) : (
        <div style={{ marginTop: 24 }}>
          {queue.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.patient}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.nir}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.medication}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.dosage}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.quantity}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.refills}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.posology}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.prescriber}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.contact}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.date}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.priority}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.status}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.actions}</th>
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
                    <td style={{ padding: 12 }}>{(order.prescriberName as string) || "—"}</td>
                    <td style={{ padding: 12 }}>{(order.prescriberContact as string) || "—"}</td>
                    <td style={{ padding: 12 }}>
                      {order.createdAt ? new Date(order.createdAt).toLocaleString("fr-FR") : "—"}
                    </td>
                    <td style={{ padding: 12 }}>
                      {getOrderPriorityLabelFr(order.priority)}
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
                          {getPathwayTypeLabelFr(order.pathwaySession.type)}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: 12 }}>{getOrderItemStatusLabel(item.status)}</td>
                    <td style={{ padding: 12 }}>
                      <Link
                        href={`/app/pharmacy-worklist/commande/${order.id}?ligne=${item.id}`}
                        style={{ marginRight: 8, fontSize: 13 }}
                        title={`${medicationLabel(item)} · ${order.prescriberName || ""}`}
                      >
                        Voir le détail
                      </Link>
                      <button
                        type="button"
                        onClick={() => openRecordModal(order, item)}
                        style={{ marginRight: 8, padding: "4px 8px", fontSize: 13, cursor: "pointer" }}
                      >
                        Enregistrer dispensation
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePrintRx(order)}
                        style={{ marginRight: 8, padding: "4px 8px", fontSize: 13, cursor: "pointer" }}
                      >
                        Imprimer
                      </button>
                      {(item.status === "PLACED" || item.status === "SIGNED") && (
                        <button
                          onClick={() => handleAcknowledge(item.id)}
                          style={{ marginRight: 8, padding: "4px 8px", cursor: "pointer" }}
                        >
                          Accuser réception
                        </button>
                      )}
                      {item.status === "ACKNOWLEDGED" && (
                        <button
                          onClick={() => handleStart(item.id)}
                          style={{ marginRight: 8, padding: "4px 8px", cursor: "pointer" }}
                        >
                          Démarrer
                        </button>
                      )}
                      {item.status === "IN_PROGRESS" && (
                        <button
                          onClick={() => handleComplete(item.id)}
                          style={{ marginRight: 8, padding: "4px 8px", cursor: "pointer" }}
                        >
                          Terminer
                        </button>
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
              <h2 style={{ fontSize: 16, marginBottom: 8 }}>En attente de synchronisation</h2>
              <p style={{ fontSize: 13, color: "#856404", marginBottom: 12 }}>
                Ordres créés sur cet appareil, non encore synchronisés avec le serveur.
              </p>
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
                    <th style={{ padding: 12, textAlign: "left" }}>{ui.common.patient}</th>
                    <th style={{ padding: 12, textAlign: "left" }}>{ui.common.nir}</th>
                    <th style={{ padding: 12, textAlign: "left" }}>{ui.common.medication}</th>
                    <th style={{ padding: 12, textAlign: "left" }}>{ui.common.date}</th>
                    <th style={{ padding: 12, textAlign: "left" }}>{ui.common.priority}</th>
                    <th style={{ padding: 12, textAlign: "left" }}>{ui.common.status}</th>
                    <th style={{ padding: 12, textAlign: "left" }}>{ui.common.actions}</th>
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
                        {new Date(row.createdAt).toLocaleString("fr-FR")}
                      </td>
                      <td style={{ padding: 12 }}>{getOrderPriorityLabelFr(row.priority)}</td>
                      <td style={{ padding: 12 }}>En attente de synchronisation</td>
                      <td style={{ padding: 12 }}>
                        <Link href={`/app/encounters/${row.encounterId}?tab=orders`} style={{ fontSize: 13 }}>
                          Consultation
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
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Dispensation</h2>
            <p style={{ fontSize: 14, color: "#333" }}>{recordModal.medicationLine}</p>
            {recordModal.prescriber ? (
              <p style={{ fontSize: 13, color: "#555" }}>Prescripteur : {recordModal.prescriber}</p>
            ) : null}
            <label style={{ display: "block", marginTop: 12, fontSize: 13 }}>
              Quantité délivrée
              <input
                type="number"
                min={1}
                value={recordQty}
                onChange={(e) => setRecordQty(e.target.value)}
                style={{ display: "block", marginTop: 4, padding: 8, width: "100%", boxSizing: "border-box" }}
              />
            </label>
            <label style={{ display: "block", marginTop: 12, fontSize: 13 }}>
              Posologie (rappel)
              <textarea
                value={recordInstr}
                onChange={(e) => setRecordInstr(e.target.value)}
                rows={2}
                style={{ display: "block", marginTop: 4, padding: 8, width: "100%", boxSizing: "border-box" }}
              />
            </label>
            <label style={{ display: "block", marginTop: 12, fontSize: 13 }}>
              Notes pharmacie
              <textarea
                value={recordNotes}
                onChange={(e) => setRecordNotes(e.target.value)}
                rows={2}
                style={{ display: "block", marginTop: 4, padding: 8, width: "100%", boxSizing: "border-box" }}
              />
            </label>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button type="button" disabled={recordSubmitting} onClick={() => setRecordModal(null)}>
                Annuler
              </button>
              <button
                type="button"
                disabled={recordSubmitting}
                onClick={() => void submitRecordDispense()}
                style={{ fontWeight: 600 }}
              >
                {recordSubmitting ? "…" : "Valider"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

