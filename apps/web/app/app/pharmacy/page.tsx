"use client";

import React, { useState, useEffect, useMemo } from "react";
import { apiFetch } from "@/lib/apiClient";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { filterAmbulatoryPharmacyQueueOrders } from "@medora/shared";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { PharmacyAlertsCard } from "@/components/pharmacy/PharmacyAlertsCard";
import { PharmacyFavorites } from "@/components/pharmacy/PharmacyFavorites";
import { tOrderItemStatusForWorklist, tOrderPriority } from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";
import { getCachedRecord, setCachedRecord } from "@/lib/offline/offlineCache";
import {
  getEncounterPatientLabelFromCache,
  getPendingPharmacyMedicationOrderRowsForFacility,
  type PendingFacilityQueueRow,
} from "@/lib/offline/pendingEncounterOrders";
import { useConnectivityStatus } from "@/lib/offline/useConnectivityStatus";

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

const linkStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "12px 20px",
  backgroundColor: "#1a1a1a",
  color: "white",
  borderRadius: 4,
  textDecoration: "none",
  fontSize: 14,
  marginRight: 12,
  marginBottom: 8,
};

export default function PharmacyPage() {
  const { t, language } = useI18n();
  const searchParams = useSearchParams();
  const ambulatoryOnly = searchParams?.get("ambulatory") === "1";
  const { facilityId: facilityIdFromHook, ready, canViewPharmacy } =
    useFacilityAndRoles();
  const { isOffline } = useConnectivityStatus();
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [queue, setQueue] = useState<unknown[]>([]);
  const [pendingLocal, setPendingLocal] = useState<PendingFacilityQueueRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("medora_facility_id="))
      ?.split("=")[1];
    setFacilityId(cookieValue || null);
  }, []);

  const effectiveFacilityId = facilityId || facilityIdFromHook || "";

  const displayedQueue = useMemo(() => {
    const rows = Array.isArray(queue) ? queue : [];
    if (!ambulatoryOnly || !effectiveFacilityId) return rows;
    return filterAmbulatoryPharmacyQueueOrders(
      rows as Array<{
        facilityId?: string | null;
        createdAt?: string | Date | null;
        orderedByUserId?: string | null;
        encounter?: { type?: string | null; patientId?: string | null } | null;
        items?: Array<{
          medicationFulfillmentIntent?: string | null;
          pharmacyVerificationStatus?: string | null;
        }> | null;
      }>,
      { facilityId: effectiveFacilityId, ambulatoryOnly: true }
    );
  }, [ambulatoryOnly, effectiveFacilityId, queue]);

  useEffect(() => {
    if (!ready || !facilityId) return;
    loadQueue();
  }, [ready, facilityId]);

  const loadQueue = async () => {
    if (!facilityId) return;
    setLoading(true);
    const cacheKey = `pharmacy-queue:${facilityId}`;
    const pendingP = getPendingPharmacyMedicationOrderRowsForFacility(facilityId, language);
    try {
      const data = await apiFetch("/pharmacy/queue", { facilityId });
      setQueue(Array.isArray(data) ? data : []);
      void setCachedRecord("encounter_summaries", cacheKey, Array.isArray(data) ? data : [], { facilityId });
    } catch (error) {
      console.error("Failed to load pharmacy queue:", error);
      const cached = await getCachedRecord<unknown[]>("encounter_summaries", cacheKey);
      setQueue(cached?.data ?? []);
    }
    const pendingRows = await pendingP;
    setPendingLocal(pendingRows);
    setLoading(false);
  };

  const handleUpdateStatus = async (itemId: string, status: string) => {
    if (!facilityId) return;
    try {
      await apiFetch(`/orders/items/${itemId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        facilityId,
      });
      loadQueue();
    } catch {
      alert(t("worklistDepartments.pharmacy.updateStatusFailed"));
    }
  };

  return (
    <div>
      {ready && canViewPharmacy && effectiveFacilityId && (
        <PharmacyAlertsCard facilityId={effectiveFacilityId} />
      )}

      <h1 style={{ marginTop: 0 }}>{t("pharmacyHomePage.title")}</h1>
      <p style={{ marginBottom: 16, color: "#555", fontSize: 14 }}>{t("pharmacyHomePage.shortcuts")}</p>
      {isOffline && (
        <p style={{ marginTop: -8, marginBottom: 14, fontSize: 12, color: "#8a4b08" }}>
          {t("pharmacyHomePage.offlineListNote")}
        </p>
      )}
      <div style={{ marginBottom: 24 }}>
        <Link href="/app/pharmacy/inventory" style={linkStyle}>
          {t("pharmacyHomePage.linkInventory")}
        </Link>
        <Link href="/app/pharmacy/dispense" style={linkStyle}>
          {t("pharmacyHomePage.linkDispense")}
        </Link>
        <Link href="/app/pharmacy/low-stock" style={linkStyle}>
          {t("pharmacyHomePage.linkLowStock")}
        </Link>
        <Link href="/app/pharmacy/expiring" style={linkStyle}>
          {t("pharmacyHomePage.linkExpiring")}
        </Link>
        <Link href="/app/pharmacy-worklist" style={linkStyle}>
          {t("pharmacyHomePage.linkWorklist")}
        </Link>
      </div>

      {effectiveFacilityId && canViewPharmacy && (
        <div style={{ marginBottom: 24 }}>
          <PharmacyFavorites
            facilityId={effectiveFacilityId}
            compact
            maxItems={8}
          />
        </div>
      )}

      <p>{t("pharmacyHomePage.intro")}</p>
      {ambulatoryOnly ? (
        <p style={{ marginTop: -8, marginBottom: 12, fontSize: 13, color: "#0d9488", fontWeight: 600 }}>
          {t("clinicCareD4c7.pharmacy.ambulatoryFilter")}
        </p>
      ) : null}
      {loading && displayedQueue.length === 0 && pendingLocal.length === 0 ? (
        <p>{t("common.loading")}</p>
      ) : displayedQueue.length === 0 && pendingLocal.length === 0 ? (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            backgroundColor: "white",
            borderRadius: 8,
            border: "1px solid #eee",
          }}
        >
          <p>{t("pharmacyHomePage.empty")}</p>
        </div>
      ) : (
        <div style={{ marginTop: 24 }}>
          {displayedQueue.length > 0 ? (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                backgroundColor: "white",
                border: "1px solid #eee",
                borderRadius: 8,
              }}
            >
              <thead>
                <tr style={{ borderBottom: "2px solid #ddd" }}>
                  <th style={{ padding: 12, textAlign: "left" }}>{t("common.patient")}</th>
                  <th style={{ padding: 12, textAlign: "left" }}>{t("common.nir")}</th>
                  <th style={{ padding: 12, textAlign: "left" }}>{t("common.medication")}</th>
                  <th style={{ padding: 12, textAlign: "left" }}>{t("common.priority")}</th>
                  <th style={{ padding: 12, textAlign: "left" }}>{t("common.status")}</th>
                  <th style={{ padding: 12, textAlign: "left" }}>{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {(displayedQueue as { items?: { id: string; status: string; catalogItemId: string }[]; encounterId: string; priority: string; encounter?: { patient?: { id?: string; firstName: string; lastName: string; mrn?: string } } }[]).map(
                  (order) =>
                    order.items?.map(
                      (item: {
                        id: string;
                        status: string;
                        catalogItemId: string;
                      }) => (
                        <tr
                          key={item.id}
                          style={{ borderBottom: "1px solid #eee" }}
                        >
                          <td style={{ padding: 12 }}>
                            {order.encounter?.patient?.firstName}{" "}
                            {order.encounter?.patient?.lastName}
                          </td>
                          <td style={{ padding: 12 }}>
                            {order.encounter?.patient?.mrn ?? t("common.dash")}
                          </td>
                          <td style={{ padding: 12 }}>{item.catalogItemId}</td>
                          <td style={{ padding: 12 }}>{tOrderPriority(t, String((order as { priority?: string }).priority ?? "ROUTINE"))}</td>
                          <td style={{ padding: 12 }}>
                            {tOrderItemStatusForWorklist(t, String(item.status))}
                          </td>
                          <td style={{ padding: 12 }}>
                            {item.status === "PENDING" && (
                              <button
                                onClick={() =>
                                  handleUpdateStatus(item.id, "IN_PROGRESS")
                                }
                                style={{
                                  marginRight: 8,
                                  padding: "4px 8px",
                                  cursor: "pointer",
                                }}
                              >
                                {t("pharmacyHomePage.verify")}
                              </button>
                            )}
                            {item.status === "IN_PROGRESS" && (
                              <button
                                onClick={() =>
                                  handleUpdateStatus(item.id, "COMPLETED")
                                }
                                style={{
                                  marginRight: 8,
                                  padding: "4px 8px",
                                  cursor: "pointer",
                                }}
                              >
                                {t("pharmacyHomePage.dispense")}
                              </button>
                            )}
                            <Link
                              href={
                                order.encounter?.patient?.id
                                  ? `/app/pharmacy/dispense?patientId=${order.encounter.patient.id}&encounterId=${order.encounterId}`
                                  : "/app/pharmacy/dispense"
                              }
                              style={{ fontSize: 13 }}
                            >
                              {t("pharmacyHomePage.dispenseContext")}
                            </Link>
                          </td>
                        </tr>
                      )
                    )
                )}
              </tbody>
            </table>
          ) : null}
          {pendingLocal.length > 0 ? (
            <div style={{ marginTop: displayedQueue.length > 0 ? 28 : 0 }}>
              <h2 style={{ fontSize: 16, marginBottom: 8 }}>{t("worklistDepartments.shared.syncPendingTitle")}</h2>
              <p style={{ fontSize: 13, color: "#856404", marginBottom: 12 }}>
                {t("worklistDepartments.shared.syncPendingDescription")}
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
                    <th style={{ padding: 12, textAlign: "left" }}>{t("common.patient")}</th>
                    <th style={{ padding: 12, textAlign: "left" }}>{t("common.nir")}</th>
                    <th style={{ padding: 12, textAlign: "left" }}>{t("common.medication")}</th>
                    <th style={{ padding: 12, textAlign: "left" }}>{t("common.priority")}</th>
                    <th style={{ padding: 12, textAlign: "left" }}>{t("common.status")}</th>
                    <th style={{ padding: 12, textAlign: "left" }}>{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingLocal.map((row) => (
                    <tr key={row.queueItemId} style={{ borderBottom: "1px solid #eee" }}>
                      <PendingEncounterPatientCells facilityId={row.facilityId} encounterId={row.encounterId} />
                      <td style={{ padding: 12 }}>
                        {row.itemLabels.filter(Boolean).join(", ") || t("common.dash")}
                      </td>
                      <td style={{ padding: 12 }}>{tOrderPriority(t, String(row.priority ?? "ROUTINE"))}</td>
                      <td style={{ padding: 12 }}>{t("worklistDepartments.shared.syncPendingStatus")}</td>
                      <td style={{ padding: 12 }}>
                        <Link href={`/app/encounters/${row.encounterId}?tab=orders`} style={{ fontSize: 13 }}>
                          {t("worklistDepartments.shared.visitLink")}
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
    </div>
  );
}