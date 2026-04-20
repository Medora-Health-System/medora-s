"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/apiClient";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { encounterBcp47, tEncounterType } from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";
import { readBillingCaptureV1 } from "@medora/shared";

export default function BillingPage() {
  const { t, language } = useI18n();
  const { facilityId: facilityIdFromHook, ready, roles } = useFacilityAndRoles();
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const canEditBillingCapture = roles.includes("BILLING");
  const [captureModalId, setCaptureModalId] = useState<string | null>(null);
  const [captureText, setCaptureText] = useState("");
  const [captureLoading, setCaptureLoading] = useState(false);
  const [captureSaving, setCaptureSaving] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

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

  const openBillingCaptureModal = useCallback(
    async (encounterId: string) => {
      if (!effectiveFacilityId) return;
      setCaptureModalId(encounterId);
      setCaptureError(null);
      setCaptureText("");
      setCaptureLoading(true);
      try {
        const enc = await apiFetch(`/encounters/${encounterId}`, { facilityId: effectiveFacilityId });
        const raw = enc && typeof enc === "object" && !Array.isArray(enc) ? (enc as any).billingCaptureJson : null;
        const normalized = readBillingCaptureV1(raw);
        setCaptureText(JSON.stringify(normalized, null, 2));
      } catch {
        setCaptureError(t("billingPage.billingCaptureLoadErr"));
      } finally {
        setCaptureLoading(false);
      }
    },
    [effectiveFacilityId, t]
  );

  const saveBillingCapture = async () => {
    if (!captureModalId || !effectiveFacilityId) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(captureText);
    } catch {
      setCaptureError(t("billingPage.billingCaptureInvalidJson"));
      return;
    }
    setCaptureSaving(true);
    setCaptureError(null);
    try {
      await apiFetch(`/encounters/${captureModalId}`, {
        facilityId: effectiveFacilityId,
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingCaptureJson: parsed }),
      });
      alert(t("billingPage.billingCaptureSaved"));
      setCaptureModalId(null);
      await loadQueue();
    } catch (e) {
      setCaptureError(
        e instanceof Error && e.message ? e.message : t("billingPage.billingCaptureSaveErr")
      );
    } finally {
      setCaptureSaving(false);
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
                <th style={{ padding: 12, textAlign: "left" }}>{t("billingPage.colBillingEvents")}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{t("billingPage.colNeedsReview")}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{t("billingPage.colMissingCode")}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((encounter) => {
                const bc = readBillingCaptureV1(encounter.billingCaptureJson);
                const needsReviewJson = bc.items.filter((i) => i.status === "needs_review").length;
                const bl = encounter.billingLedger as
                  | { total: number; needsReview: number; missingCode: number }
                  | undefined;
                const eventCount = typeof bl?.total === "number" ? bl.total : bc.items.length;
                const needsReview = typeof bl?.needsReview === "number" ? bl.needsReview : needsReviewJson;
                const missingCode =
                  typeof bl?.missingCode === "number" ? bl.missingCode : t("common.dash");
                return (
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
                  <td style={{ padding: 12 }}>{eventCount}</td>
                  <td style={{ padding: 12 }}>{needsReview}</td>
                  <td style={{ padding: 12 }}>{missingCode}</td>
                  <td style={{ padding: 12 }}>
                    <button
                      onClick={() => handleFinalize(encounter.id)}
                      style={{ marginRight: 8, padding: "4px 8px" }}
                    >
                      {t("billingPage.finalize")}
                    </button>
                    {canEditBillingCapture ? (
                      <button
                        type="button"
                        onClick={() => void openBillingCaptureModal(encounter.id)}
                        style={{ marginRight: 8, padding: "4px 8px" }}
                      >
                        {t("billingPage.editBillingCapture")}
                      </button>
                    ) : null}
                    <Link href={`/app/billing/encounters/${encounter.id}`} style={{ marginRight: 8 }}>
                      {t("billingPage.linkLedgerDetail")}
                    </Link>
                    <Link href={`/app/encounters/${encounter.id}`}>{t("billingPage.view")}</Link>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {captureModalId ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15,23,42,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: 8,
              maxWidth: 720,
              width: "100%",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ padding: "16px 18px", borderBottom: "1px solid #e2e8f0" }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>{t("billingPage.billingCaptureModalTitle")}</h2>
            </div>
            <div style={{ padding: 16, overflow: "auto", flex: 1 }}>
              {captureLoading ? (
                <p>{t("common.loading")}</p>
              ) : (
                <textarea
                  value={captureText}
                  onChange={(e) => setCaptureText(e.target.value)}
                  style={{
                    width: "100%",
                    minHeight: 320,
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                  spellCheck={false}
                />
              )}
              {captureError ? (
                <p style={{ color: "#b91c1c", marginTop: 8, fontSize: 13 }}>{captureError}</p>
              ) : null}
            </div>
            <div style={{ padding: "12px 16px", borderTop: "1px solid #e2e8f0", display: "flex", gap: 8 }}>
              <button
                type="button"
                disabled={captureSaving || captureLoading}
                onClick={() => void saveBillingCapture()}
                style={{ padding: "8px 16px" }}
              >
                {captureSaving ? t("common.saving") : t("billingPage.billingCaptureSave")}
              </button>
              <button
                type="button"
                disabled={captureSaving}
                onClick={() => {
                  setCaptureModalId(null);
                  setCaptureError(null);
                }}
                style={{ padding: "8px 16px" }}
              >
                {t("billingPage.billingCaptureCancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

