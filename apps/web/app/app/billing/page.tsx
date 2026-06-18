"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { apiFetch } from "@/lib/apiClient";
import {
  downloadExternalBillingDailyExport,
  downloadExternalBillingMonthlyExport,
  downloadExternalBillingWeeklyExport,
  fetchExternalBillingDailyCertification,
  fetchExternalBillingMonthlyCertification,
  fetchExternalBillingWeeklyCertification,
} from "@/lib/externalBillingExportApi";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { encounterBcp47, tEncounterType } from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";
import {
  readBillingCaptureV1,
  type BillingReadinessExplainerSummary,
  type ExternalBillingExportCertificationSummary,
} from "@medora/shared";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { BillingReadinessExplainerPanel } from "@/features/billing/BillingReadinessExplainerPanel";
import { ExternalBillingExportCertificationPanel } from "@/features/billing/ExternalBillingExportCertificationPanel";

function defaultLocalIsoDate(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultWeekStartIso(): string {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function defaultUtcMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

type ExternalExportBusyKind =
  | "daily-json"
  | "daily-csv"
  | "weekly-json"
  | "weekly-csv"
  | "monthly-json"
  | "monthly-csv";

type ExternalExportCertificationFocus = "daily" | "weekly" | "monthly";

export default function BillingPage() {
  const { t, language } = useI18n();
  const { facilityId: facilityIdFromHook, ready, roles } = useFacilityAndRoles();
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const canUseAdvancedCaptureEditor = roles.includes("BILLING") || roles.includes("ADMIN");
  const [captureModalId, setCaptureModalId] = useState<string | null>(null);
  const [captureText, setCaptureText] = useState("");
  const [captureLoading, setCaptureLoading] = useState(false);
  const [captureSaving, setCaptureSaving] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [queueFilter, setQueueFilter] = useState<"all" | "unmapped">("all");
  const [dailyExportDate, setDailyExportDate] = useState(defaultLocalIsoDate);
  const [weeklyExportWeekStart, setWeeklyExportWeekStart] = useState(defaultWeekStartIso);
  const [monthlyExportMonth, setMonthlyExportMonth] = useState(defaultUtcMonth);
  const [externalExportCertificationFocus, setExternalExportCertificationFocus] =
    useState<ExternalExportCertificationFocus>("daily");
  const [externalExportBusy, setExternalExportBusy] = useState<ExternalExportBusyKind | null>(null);
  const [externalExportErr, setExternalExportErr] = useState<string | null>(null);
  const [externalExportOk, setExternalExportOk] = useState(false);
  const [externalExportCertification, setExternalExportCertification] =
    useState<ExternalBillingExportCertificationSummary | null>(null);
  const [externalExportCertificationLoading, setExternalExportCertificationLoading] = useState(false);
  const [explainerEncounter, setExplainerEncounter] = useState<{
    id: string;
    patientId: string;
    patientLabel: string;
    summary: BillingReadinessExplainerSummary;
  } | null>(null);

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

  const visibleQueue = useMemo(() => {
    if (queueFilter === "unmapped") {
      return queue.filter((e) => {
        const bl = e.billingLedger as { unmappedLinesCount?: number } | undefined;
        return typeof bl?.unmappedLinesCount === "number" && bl.unmappedLinesCount > 0;
      });
    }
    return queue;
  }, [queue, queueFilter]);

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

  const openBillingCaptureModal = useCallback(
    async (encounterId: string) => {
      if (!effectiveFacilityId) return;
      setCaptureModalId(encounterId);
      setCaptureError(null);
      setCaptureText("");
      setShowJsonEditor(false);
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
      setCaptureModalId(null);
      setSavedNotice(true);
      window.setTimeout(() => setSavedNotice(false), 5000);
      await loadQueue();
    } catch (e) {
      const raw = e instanceof Error && e.message ? e.message : "";
      setCaptureError(
        normalizeUserFacingError(raw, language) || t("billingPage.billingCaptureSaveErr")
      );
    } finally {
      setCaptureSaving(false);
    }
  };

  const runExternalExport = useCallback(
    async (kind: ExternalExportBusyKind) => {
      const fid = effectiveFacilityId;
      if (!fid) return;
      if (kind.startsWith("daily") && !/^\d{4}-\d{2}-\d{2}$/.test(dailyExportDate.trim())) {
        setExternalExportErr(t("billingPage.externalBillingDailyDateInvalid"));
        return;
      }
      if (kind.startsWith("weekly") && !/^\d{4}-\d{2}-\d{2}$/.test(weeklyExportWeekStart.trim())) {
        setExternalExportErr(t("billingPage.externalExportWeekStartInvalid"));
        return;
      }
      if (kind.startsWith("monthly") && !/^\d{4}-\d{2}$/.test(monthlyExportMonth.trim())) {
        setExternalExportErr(t("billingPage.externalExportMonthInvalid"));
        return;
      }
      setExternalExportErr(null);
      setExternalExportOk(false);
      setExternalExportBusy(kind);
      try {
        if (kind === "daily-json") {
          await downloadExternalBillingDailyExport(fid, dailyExportDate.trim(), "json");
        } else if (kind === "daily-csv") {
          await downloadExternalBillingDailyExport(fid, dailyExportDate.trim(), "csv");
        } else if (kind === "weekly-json") {
          await downloadExternalBillingWeeklyExport(fid, weeklyExportWeekStart.trim(), "json");
        } else if (kind === "weekly-csv") {
          await downloadExternalBillingWeeklyExport(fid, weeklyExportWeekStart.trim(), "csv");
        } else if (kind === "monthly-json") {
          await downloadExternalBillingMonthlyExport(fid, monthlyExportMonth.trim(), "json");
        } else {
          await downloadExternalBillingMonthlyExport(fid, monthlyExportMonth.trim(), "csv");
        }
        setExternalExportOk(true);
        window.setTimeout(() => setExternalExportOk(false), 6000);
      } catch (e: unknown) {
        const raw = e instanceof Error && e.message ? e.message : "";
        setExternalExportErr(
          normalizeUserFacingError(raw, language) || t("billingPage.externalBillingDailyFailed")
        );
      } finally {
        setExternalExportBusy(null);
      }
    },
    [dailyExportDate, monthlyExportMonth, weeklyExportWeekStart, effectiveFacilityId, language, t]
  );

  const loadExternalExportCertification = useCallback(async () => {
    if (!effectiveFacilityId) return;
    setExternalExportCertificationLoading(true);
    try {
      const summary =
        externalExportCertificationFocus === "daily"
          ? await fetchExternalBillingDailyCertification(effectiveFacilityId, dailyExportDate.trim())
          : externalExportCertificationFocus === "weekly"
            ? await fetchExternalBillingWeeklyCertification(effectiveFacilityId, weeklyExportWeekStart.trim())
            : await fetchExternalBillingMonthlyCertification(effectiveFacilityId, monthlyExportMonth.trim());
      setExternalExportCertification(summary);
    } catch {
      setExternalExportCertification(null);
    } finally {
      setExternalExportCertificationLoading(false);
    }
  }, [
    dailyExportDate,
    effectiveFacilityId,
    externalExportCertificationFocus,
    monthlyExportMonth,
    weeklyExportWeekStart,
  ]);

  useEffect(() => {
    if (!effectiveFacilityId) return;
    void loadExternalExportCertification();
  }, [effectiveFacilityId, loadExternalExportCertification]);

  const openReadinessExplainer = useCallback(
    async (encounter: {
      id: string;
      patient?: { id?: string; firstName?: string; lastName?: string };
      readinessExplainer?: BillingReadinessExplainerSummary;
    }) => {
      if (!effectiveFacilityId) return;
      const patientLabel = `${encounter.patient?.firstName ?? ""} ${encounter.patient?.lastName ?? ""}`.trim();
      if (encounter.readinessExplainer) {
        setExplainerEncounter({
          id: encounter.id,
          patientId: encounter.patient?.id ?? "",
          patientLabel,
          summary: encounter.readinessExplainer,
        });
        return;
      }
      try {
        const summary = (await apiFetch(`/billing/encounters/${encounter.id}/readiness-explainer`, {
          facilityId: effectiveFacilityId,
        })) as BillingReadinessExplainerSummary;
        setExplainerEncounter({
          id: encounter.id,
          patientId: encounter.patient?.id ?? "",
          patientLabel,
          summary,
        });
      } catch {
        setExplainerEncounter(null);
      }
    },
    [effectiveFacilityId]
  );

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
      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <Link
          href="/app/billing/manual-review"
          style={{
            display: "inline-block",
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            background: "#fff",
            color: "#0f172a",
            fontWeight: 600,
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          {t("billingPage.manualReviewOpen")}
        </Link>
        <Link
          href="/app/billing/charge-review"
          style={{
            display: "inline-block",
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            background: "#fff",
            color: "#0f172a",
            fontWeight: 600,
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          {t("billingPage.chargeReviewOpen")}
        </Link>
        <Link
          href="/app/billing/coding-review"
          style={{
            display: "inline-block",
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            background: "#fff",
            color: "#0f172a",
            fontWeight: 600,
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          {t("billingPage.codingReviewOpen")}
        </Link>
        <Link
          href="/app/billing/claim-assembly-preview"
          style={{
            display: "inline-block",
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            background: "#fff",
            color: "#0f172a",
            fontWeight: 600,
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          {t("billingPage.claimAssemblyPreviewOpen")}
        </Link>
      </div>
      {effectiveFacilityId ? (
        <div
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            background: "#fff",
            maxWidth: 640,
          }}
        >
          <h2 style={{ margin: "0 0 4px", fontSize: 16 }}>{t("billingPage.externalExportSectionTitle")}</h2>
          <p style={{ margin: "0 0 8px", fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
            {t("billingPage.externalExportSectionSubtitle")}
          </p>
          <p style={{ margin: "0 0 12px", fontSize: 12, color: "#475569", lineHeight: 1.45 }}>
            {t("billingPage.externalExportThirdPartyHelper")}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: "#fafafa",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
                {t("billingPage.externalExportModeDaily")}
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "#334155", marginBottom: 8 }}>
                <span>{t("billingPage.externalBillingDailyDateLabel")}</span>
                <input
                  type="date"
                  value={dailyExportDate}
                  onChange={(e) => {
                    setExternalExportErr(null);
                    setExternalExportOk(false);
                    setDailyExportDate(e.target.value);
                  }}
                  style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14, maxWidth: 220 }}
                />
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button
                  type="button"
                  disabled={Boolean(externalExportBusy)}
                  onClick={() => void runExternalExport("daily-json")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    background: externalExportBusy === "daily-json" ? "#f1f5f9" : "#fff",
                    cursor: externalExportBusy ? "wait" : "pointer",
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  {externalExportBusy === "daily-json"
                    ? t("billingPage.externalBillingDailyBusy")
                    : t("billingPage.externalExportDownloadDailyJson")}
                </button>
                <button
                  type="button"
                  disabled={Boolean(externalExportBusy)}
                  onClick={() => void runExternalExport("daily-csv")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    background: externalExportBusy === "daily-csv" ? "#f1f5f9" : "#fff",
                    cursor: externalExportBusy ? "wait" : "pointer",
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  {externalExportBusy === "daily-csv"
                    ? t("billingPage.externalBillingDailyBusy")
                    : t("billingPage.externalExportDownloadDailyCsv")}
                </button>
              </div>
            </div>

            <div
              style={{
                padding: 12,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: "#fafafa",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
                {t("billingPage.externalExportModeWeekly")}
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "#334155", marginBottom: 8 }}>
                <span>{t("billingPage.externalExportWeekStartLabel")}</span>
                <input
                  type="date"
                  value={weeklyExportWeekStart}
                  onChange={(e) => {
                    setExternalExportErr(null);
                    setExternalExportOk(false);
                    setWeeklyExportWeekStart(e.target.value);
                  }}
                  style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14, maxWidth: 220 }}
                />
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button
                  type="button"
                  disabled={Boolean(externalExportBusy)}
                  onClick={() => void runExternalExport("weekly-json")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    background: externalExportBusy === "weekly-json" ? "#f1f5f9" : "#fff",
                    cursor: externalExportBusy ? "wait" : "pointer",
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  {externalExportBusy === "weekly-json"
                    ? t("billingPage.externalBillingDailyBusy")
                    : t("billingPage.externalExportDownloadWeeklyJson")}
                </button>
                <button
                  type="button"
                  disabled={Boolean(externalExportBusy)}
                  onClick={() => void runExternalExport("weekly-csv")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    background: externalExportBusy === "weekly-csv" ? "#f1f5f9" : "#fff",
                    cursor: externalExportBusy ? "wait" : "pointer",
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  {externalExportBusy === "weekly-csv"
                    ? t("billingPage.externalBillingDailyBusy")
                    : t("billingPage.externalExportDownloadWeeklyCsv")}
                </button>
              </div>
            </div>

            <div
              style={{
                padding: 12,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: "#fafafa",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
                {t("billingPage.externalExportModeMonthly")}
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "#334155", marginBottom: 8 }}>
                <span>{t("billingPage.externalExportMonthLabel")}</span>
                <input
                  type="month"
                  value={monthlyExportMonth}
                  onChange={(e) => {
                    setExternalExportErr(null);
                    setExternalExportOk(false);
                    setMonthlyExportMonth(e.target.value);
                  }}
                  style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14, maxWidth: 220 }}
                />
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button
                  type="button"
                  disabled={Boolean(externalExportBusy)}
                  onClick={() => void runExternalExport("monthly-json")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    background: externalExportBusy === "monthly-json" ? "#f1f5f9" : "#fff",
                    cursor: externalExportBusy ? "wait" : "pointer",
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  {externalExportBusy === "monthly-json"
                    ? t("billingPage.externalBillingDailyBusy")
                    : t("billingPage.externalExportDownloadMonthlyJson")}
                </button>
                <button
                  type="button"
                  disabled={Boolean(externalExportBusy)}
                  onClick={() => void runExternalExport("monthly-csv")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    background: externalExportBusy === "monthly-csv" ? "#f1f5f9" : "#fff",
                    cursor: externalExportBusy ? "wait" : "pointer",
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  {externalExportBusy === "monthly-csv"
                    ? t("billingPage.externalBillingDailyBusy")
                    : t("billingPage.externalExportDownloadMonthlyCsv")}
                </button>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
              {t("billingPage.externalExportCertificationPreviewLabel")}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              {(["daily", "weekly", "monthly"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setExternalExportCertificationFocus(mode)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 9999,
                    border: externalExportCertificationFocus === mode ? "2px solid #0f766e" : "1px solid #cbd5e1",
                    background: externalExportCertificationFocus === mode ? "#ecfdf5" : "#fff",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {t(
                    mode === "daily"
                      ? "billingPage.externalExportModeDaily"
                      : mode === "weekly"
                        ? "billingPage.externalExportModeWeekly"
                        : "billingPage.externalExportModeMonthly"
                  )}
                </button>
              ))}
            </div>
          </div>
          {externalExportCertificationLoading ? (
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
          ) : externalExportCertification ? (
            <ExternalBillingExportCertificationPanel
              certification={externalExportCertification}
              periodMode={externalExportCertificationFocus}
              t={t}
            />
          ) : null}
          {externalExportErr ? (
            <p style={{ margin: "12px 0", color: "#b91c1c", fontSize: 13 }} role="alert">
              {externalExportErr}
            </p>
          ) : null}
          {externalExportOk ? (
            <p style={{ margin: "12px 0", color: "#047857", fontSize: 13 }} role="status">
              {t("billingPage.externalBillingDailySucceeded")}
            </p>
          ) : null}
        </div>
      ) : null}
      {savedNotice ? (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            background: "#ecfdf5",
            color: "#047857",
            borderRadius: 8,
            fontSize: 14,
          }}
        >
          {t("billingPage.billingCaptureSaved")}
        </div>
      ) : null}
      {loading ? (
        <p>{t("common.loading")}</p>
      ) : queue.length === 0 ? (
        <div style={{ marginTop: 24, padding: 16, backgroundColor: "white", borderRadius: 4 }}>
          <p>{t("billingPage.empty")}</p>
        </div>
      ) : (
        <div style={{ marginTop: 24 }}>
          {visibleQueue.length === 0 ? (
            <p style={{ marginBottom: 12, color: "#64748b" }}>{t("billingPage.queueFilteredEmpty")}</p>
          ) : null}
          <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, color: "#475569" }}>{t("common.actions")} :</span>
            <button
              type="button"
              onClick={() => setQueueFilter("all")}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: queueFilter === "all" ? "2px solid #0f766e" : "1px solid #cbd5e1",
                background: queueFilter === "all" ? "#ecfdf5" : "#fff",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              {t("billingPage.queueFilterAll")}
            </button>
            <button
              type="button"
              onClick={() => setQueueFilter("unmapped")}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: queueFilter === "unmapped" ? "2px solid #b91c1c" : "1px solid #cbd5e1",
                background: queueFilter === "unmapped" ? "#fef2f2" : "#fff",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              {t("billingPage.queueFilterUnmappedOnly")}
            </button>
          </div>
          {visibleQueue.length > 0 ? (
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
                <th style={{ padding: 12, textAlign: "left" }}>{t("billingPage.colUnmappedLines")}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{t("billingPage.colBillingWorkflow")}</th>
                <th style={{ padding: 12, textAlign: "center" }} title={t("billingPage.billingPackageProfReady")}>
                  {t("billingPage.colClaimProf")}
                </th>
                <th style={{ padding: 12, textAlign: "center" }} title={t("billingPage.billingPackageFacReady")}>
                  {t("billingPage.colClaimFac")}
                </th>
                <th style={{ padding: 12, textAlign: "left" }}>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {visibleQueue.map((encounter) => {
                const bc = readBillingCaptureV1(encounter.billingCaptureJson);
                const needsReviewJson = bc.items.filter((i) => i.status === "needs_review").length;
                const bl = encounter.billingLedger as
                  | { total: number; needsReview: number; missingCode: number; unmappedLinesCount?: number }
                  | undefined;
                const eventCount = typeof bl?.total === "number" ? bl.total : bc.items.length;
                const needsReview = typeof bl?.needsReview === "number" ? bl.needsReview : needsReviewJson;
                const missingCode =
                  typeof bl?.missingCode === "number" ? bl.missingCode : t("common.dash");
                const unmappedCount =
                  typeof bl?.unmappedLinesCount === "number" ? bl.unmappedLinesCount : t("common.dash");
                const wf = String(encounter.billingFinalizationStatus ?? "NOT_READY");
                const wfLabelKey = `billingPage.billingWorkflow_${wf}`;
                const wfLabel = t(wfLabelKey);
                const br = encounter.billingReadiness as { isReady?: boolean } | undefined;
                const explainer = encounter.readinessExplainer as BillingReadinessExplainerSummary | undefined;
                const blockerCount = explainer?.blockerCount ?? 0;
                const queueHint =
                  wf === "FINALIZED"
                    ? null
                    : br?.isReady
                      ? t("billingPage.readinessQueueHintReady")
                      : t("billingPage.readinessQueueHintBlocked");
                const showExplainer = wf !== "FINALIZED" && br?.isReady !== true;
                const wfDisplay = wfLabel !== wfLabelKey ? wfLabel : wf;
                const cp = encounter.claimPackages as
                  | { overall?: { readyForProfessionalClaim?: boolean; readyForFacilityClaim?: boolean } }
                  | undefined;
                const profClaimOk = cp?.overall?.readyForProfessionalClaim === true;
                const facClaimOk = cp?.overall?.readyForFacilityClaim === true;
                return (
                  <tr key={encounter.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 12 }}>
                      {encounter.patient?.firstName} {encounter.patient?.lastName}
                    </td>
                    <td style={{ padding: 12 }}>{encounter.patient?.mrn}</td>
                    <td style={{ padding: 12 }}>{tEncounterType(t, encounter.type)}</td>
                    <td style={{ padding: 12 }}>
                      {encounter.dischargedAt
                        ? new Date(encounter.dischargedAt).toLocaleDateString(encounterBcp47(language))
                        : t("common.dash")}
                    </td>
                    <td style={{ padding: 12 }}>{encounter.orders?.length || 0}</td>
                    <td style={{ padding: 12 }}>{eventCount}</td>
                    <td style={{ padding: 12 }}>{needsReview}</td>
                    <td style={{ padding: 12 }}>{missingCode}</td>
                    <td
                      style={{
                        padding: 12,
                        fontWeight:
                          typeof bl?.unmappedLinesCount === "number" && bl.unmappedLinesCount > 0
                            ? 600
                            : 400,
                        color:
                          typeof bl?.unmappedLinesCount === "number" && bl.unmappedLinesCount > 0
                            ? "#b91c1c"
                            : undefined,
                      }}
                    >
                      {unmappedCount}
                    </td>
                    <td style={{ padding: 12, fontSize: 13 }}>
                      <div style={{ fontWeight: 600 }}>{wfDisplay}</div>
                      {queueHint ? (
                        <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{queueHint}</div>
                      ) : null}
                      {showExplainer ? (
                        <button
                          type="button"
                          onClick={() => void openReadinessExplainer(encounter)}
                          style={{
                            marginTop: 6,
                            padding: 0,
                            border: "none",
                            background: "transparent",
                            color: "#0f766e",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          {blockerCount > 0
                            ? t("billingPage.readinessExplainerWhyNotReadyWithCount").replace(
                                "{count}",
                                String(blockerCount)
                              )
                            : t("billingPage.readinessExplainerWhyNotReady")}
                        </button>
                      ) : null}
                    </td>
                    <td style={{ padding: 12, textAlign: "center", fontSize: 16 }}>{profClaimOk ? "✓" : "—"}</td>
                    <td style={{ padding: 12, textAlign: "center", fontSize: 16 }}>{facClaimOk ? "✓" : "—"}</td>
                    <td style={{ padding: 12 }}>
                      <Link
                        href={`/app/billing/encounters/${encounter.id}`}
                        style={{ marginRight: 8, padding: "4px 8px", display: "inline-block" }}
                      >
                        {t("billingPage.openLedger")}
                      </Link>
                      {canUseAdvancedCaptureEditor ? (
                        <button
                          type="button"
                          onClick={() => void openBillingCaptureModal(encounter.id)}
                          style={{ marginRight: 8, padding: "4px 8px" }}
                        >
                          {t("billingPage.editBillingCapture")}
                        </button>
                      ) : null}
                      <Link href={`/app/encounters/${encounter.id}`} style={{ marginRight: 0 }}>
                        {t("billingPage.openClinicalEncounter")}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          ) : null}
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
              <p style={{ margin: "0 0 12px", fontSize: 14, color: "#334155", lineHeight: 1.5 }}>
                {t("billingPage.billingCaptureGuidance")}
              </p>
              <p style={{ margin: "0 0 16px" }}>
                <Link
                  href={`/app/billing/encounters/${captureModalId}`}
                  style={{ fontWeight: 600, color: "#0f766e" }}
                  onClick={() => setCaptureModalId(null)}
                >
                  {t("billingPage.openLedger")} →
                </Link>
              </p>
              <button
                type="button"
                onClick={() => setShowJsonEditor((v) => !v)}
                style={{
                  marginBottom: 12,
                  padding: "6px 12px",
                  fontSize: 13,
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  cursor: "pointer",
                }}
              >
                {showJsonEditor ? t("billingPage.billingCaptureHideAdvancedJson") : t("billingPage.billingCaptureShowAdvancedJson")}
              </button>
              {showJsonEditor ? (
                <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>
                  {t("billingPage.billingCaptureAdvancedJsonHint")}
                </p>
              ) : null}
              {captureLoading ? (
                <p>{t("common.loading")}</p>
              ) : showJsonEditor ? (
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
              ) : null}
              {captureError ? (
                <p style={{ color: "#b91c1c", marginTop: 8, fontSize: 13 }}>{captureError}</p>
              ) : null}
            </div>
            <div style={{ padding: "12px 16px", borderTop: "1px solid #e2e8f0", display: "flex", gap: 8 }}>
              {showJsonEditor ? (
                <button
                  type="button"
                  disabled={captureSaving || captureLoading}
                  onClick={() => void saveBillingCapture()}
                  style={{ padding: "8px 16px" }}
                >
                  {captureSaving ? t("common.saving") : t("billingPage.billingCaptureSave")}
                </button>
              ) : null}
              <button
                type="button"
                disabled={captureSaving}
                onClick={() => {
                  setCaptureModalId(null);
                  setCaptureError(null);
                  setShowJsonEditor(false);
                }}
                style={{ padding: "8px 16px" }}
              >
                {t("billingPage.billingCaptureCancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {explainerEncounter ? (
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
              borderRadius: 10,
              maxWidth: 640,
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
              padding: 18,
            }}
          >
            <BillingReadinessExplainerPanel
              encounterId={explainerEncounter.id}
              patientId={explainerEncounter.patientId}
              patientLabel={explainerEncounter.patientLabel}
              summary={explainerEncounter.summary}
              t={t}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setExplainerEncounter(null)}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff" }}
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
