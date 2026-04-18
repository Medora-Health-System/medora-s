"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/apiClient";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { encounterBcp47, tEncounterType } from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";

export default function BillingPage() {
  const { t, language } = useI18n();
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

  const effectiveFacilityId = facilityId || facilityIdFromHook;

  const loadQueue = async () => {
    if (!facilityId) return;
    setLoading(true);
    try {
      const data = await apiFetch("/billing/queue", { facilityId });
      setQueue(data || []);
    } catch (error) {
      console.error("Failed to load billing queue:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async (_encounterId: string) => {
    if (!effectiveFacilityId) return;
    try {
      // Placeholder - would call billing finalize endpoint
      alert(t("billingPage.alertSavedPlaceholder"));
      loadQueue();
    } catch (error) {
      alert(t("billingPage.alertFinalizeError"));
    }
  };

  if (!ready) {
    return (
      <div>
        <h1>{t("billingPage.title")}</h1>
        <p>{t("billingPage.subtitle")}</p>
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>{t("billingPage.title")}</h1>
      <p>{t("billingPage.subtitle")}</p>
      {loading ? (
        <p>{t("common.loading")}</p>
      ) : queue.length === 0 ? (
        <div style={{ marginTop: 24, padding: 16, backgroundColor: "white", borderRadius: 4 }}>
          <p>{t("billingPage.empty")}</p>
        </div>
      ) : (
        <div style={{ marginTop: 24 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: 12, textAlign: "left" }}>{t("common.patient")}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{t("common.nir")}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{t("billingPage.colEncounterType")}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{t("billingPage.colDischarge")}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{t("billingPage.colOrders")}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((encounter) => (
                <tr key={encounter.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 12 }}>
                    {encounter.patient?.firstName} {encounter.patient?.lastName}
                  </td>
                  <td style={{ padding: 12 }}>{encounter.patient?.mrn}</td>
                  <td style={{ padding: 12 }}>{tEncounterType(t, encounter.type)}</td>
                  <td style={{ padding: 12 }}>
                    {encounter.dischargedAt
                      ? new Date(encounter.dischargedAt).toLocaleDateString(
                          encounterBcp47(language)
                        )
                      : t("common.dash")}
                  </td>
                  <td style={{ padding: 12 }}>{encounter.orders?.length || 0}</td>
                  <td style={{ padding: 12 }}>
                    <button
                      onClick={() => handleFinalize(encounter.id)}
                      style={{ marginRight: 8, padding: "4px 8px" }}
                    >
                      {t("billingPage.finalize")}
                    </button>
                    <Link href={`/app/encounters/${encounter.id}`}>{t("billingPage.view")}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

