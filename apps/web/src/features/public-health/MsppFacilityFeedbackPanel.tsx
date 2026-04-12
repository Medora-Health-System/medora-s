"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  fetchMsppFeedbackForFacilityReport,
  postMsppFeedbackFacilityStatus,
  type MsppDiseaseReportFeedbackItem,
} from "@/lib/publicHealthApi";
import {
  fetchMsppDiseaseReportFeedbackList,
} from "@/lib/msppApi";

type Props = {
  reportId: string;
  /** Établissement : lecture + actions « Vu » / « Résolu ». */
  facilityId: string | null;
  /** Lecture MSPP nationale sans périmètre établissement (détails en lecture seule). */
  nationalMsppReadonly: boolean;
  onFeedbackUpdated?: () => void;
};

function labelOrRaw(t: (k: string) => string, prefix: string, code: string): string {
  const key = `${prefix}.${code}`;
  const out = t(key);
  return out === key ? code : out;
}

export function MsppFacilityFeedbackPanel({
  reportId,
  facilityId,
  nationalMsppReadonly,
  onFeedbackUpdated,
}: Props) {
  const { t } = useI18n();
  const [items, setItems] = useState<MsppDiseaseReportFeedbackItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (nationalMsppReadonly) {
        const res = await fetchMsppDiseaseReportFeedbackList(reportId);
        setItems(res.items ?? []);
      } else if (facilityId) {
        const res = await fetchMsppFeedbackForFacilityReport(facilityId, reportId);
        setItems(res.items ?? []);
      } else {
        setItems([]);
      }
    } catch {
      setError(t("diseaseReports.msppFeedbackLoadError"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [reportId, facilityId, nationalMsppReadonly, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(feedbackId: string, status: "REVIEWED" | "RESOLVED") {
    if (!facilityId) return;
    setBusyId(feedbackId);
    setError(null);
    try {
      const res = await postMsppFeedbackFacilityStatus(facilityId, reportId, feedbackId, status);
      setItems((prev) =>
        (prev ?? []).map((x) => (x.id === feedbackId ? res.item : x))
      );
      onFeedbackUpdated?.();
    } catch {
      setError(t("diseaseReports.msppFeedbackActionError"));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "12px 0", fontSize: 14, color: "#64748b" }}>
        {t("diseaseReports.msppFeedbackLoading")}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "14px 16px",
        background: "#f8fafc",
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        marginTop: 4,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 8 }}>
        {t("diseaseReports.msppFeedbackDetailTitle")}
      </div>
      {nationalMsppReadonly ? (
        <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b" }}>
          {t("diseaseReports.msppFeedbackReadonlyNote")}
        </p>
      ) : null}
      {error ? (
        <p style={{ margin: "0 0 10px", fontSize: 13, color: "#b91c1c" }} role="alert">
          {error}
        </p>
      ) : null}
      {!items || items.length === 0 ? (
        <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>{t("diseaseReports.msppFeedbackEmpty")}</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 18, listStyle: "disc" }}>
          {items.map((it) => (
            <li key={it.id} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>
                <strong>{labelOrRaw(t, "diseaseReports.msppFeedbackCategory", it.category)}</strong>
                {" · "}
                {labelOrRaw(t, "diseaseReports.msppFeedbackSeverity", it.severity)}
                {" · "}
                {labelOrRaw(t, "diseaseReports.msppFeedbackStatus", it.status)}
              </div>
              <div style={{ fontSize: 14, color: "#0f172a", whiteSpace: "pre-wrap" }}>{it.feedbackText}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                {t("diseaseReports.msppFeedbackMeta")
                  .replace("{author}", it.createdByDisplayName)
                  .replace("{date}", new Date(it.createdAt).toLocaleString("fr-FR"))}
              </div>
              {!nationalMsppReadonly && facilityId && it.status !== "RESOLVED" ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {it.status === "OPEN" ? (
                    <button
                      type="button"
                      disabled={busyId === it.id}
                      onClick={() => void setStatus(it.id, "REVIEWED")}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: "1px solid #cbd5e1",
                        background: "#fff",
                        fontSize: 13,
                        cursor: busyId === it.id ? "wait" : "pointer",
                      }}
                    >
                      {t("diseaseReports.msppFeedbackBtnReviewed")}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busyId === it.id}
                    onClick={() => void setStatus(it.id, "RESOLVED")}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: "1px solid #86efac",
                      background: "#f0fdf4",
                      fontSize: 13,
                      cursor: busyId === it.id ? "wait" : "pointer",
                    }}
                  >
                    {t("diseaseReports.msppFeedbackBtnResolved")}
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
