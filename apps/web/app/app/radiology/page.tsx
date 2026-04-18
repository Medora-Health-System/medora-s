"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/apiClient";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { tOrderItemStatusForWorklist, tOrderPriority } from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";

export default function RadiologyPage() {
  const { t } = useI18n();
  const { facilityId: facilityIdFromHook, ready } = useFacilityAndRoles();
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, [ready, facilityId]);

  const loadQueue = async () => {
    if (!facilityId) return;
    setLoading(true);
    try {
      const data = await apiFetch("/radiology/queue", { facilityId });
      setQueue(data || []);
    } catch (error) {
      console.error("Failed to load radiology queue:", error);
    } finally {
      setLoading(false);
    }
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
      alert(t("worklistDepartments.radiology.updateStatusFailed"));
    }
  };

  return (
    <div>
      <h1>{t("worklistDepartments.radiology.title")}</h1>
      <p>{t("worklistDepartments.radiology.subtitle")}</p>
      {loading ? (
        <p>{t("common.loading")}</p>
      ) : queue.length === 0 ? (
        <div style={{ marginTop: 24, padding: 16, backgroundColor: "white", borderRadius: 4 }}>
          <p>{t("worklistDepartments.radiology.empty")}</p>
        </div>
      ) : (
        <div style={{ marginTop: 24 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: 12, textAlign: "left" }}>{t("common.patient")}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{t("common.nir")}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{t("common.imagingStudy")}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{t("common.priority")}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{t("common.status")}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((order) =>
                order.items?.map((item: any) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 12 }}>
                      {order.encounter?.patient?.firstName} {order.encounter?.patient?.lastName}
                    </td>
                    <td style={{ padding: 12 }}>{order.encounter?.patient?.mrn ?? t("common.dash")}</td>
                    <td style={{ padding: 12 }}>{item.catalogItemId}</td>
                    <td style={{ padding: 12 }}>{tOrderPriority(t, String(order.priority ?? "ROUTINE"))}</td>
                    <td style={{ padding: 12 }}>{tOrderItemStatusForWorklist(t, String(item.status))}</td>
                    <td style={{ padding: 12 }}>
                      {item.status === "PENDING" && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(item.id, "IN_PROGRESS")}
                          style={{ marginRight: 8, padding: "4px 8px", cursor: "pointer" }}
                        >
                          {t("worklistDepartments.shared.start")}
                        </button>
                      )}
                      {item.status === "IN_PROGRESS" && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(item.id, "COMPLETED")}
                          style={{ marginRight: 8, padding: "4px 8px", cursor: "pointer" }}
                        >
                          {t("worklistDepartments.shared.complete")}
                        </button>
                      )}
                      <Link href={`/app/encounters/${order.encounterId}`}>{t("worklistDepartments.radiology.viewEncounter")}</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
