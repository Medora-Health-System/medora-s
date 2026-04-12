"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  createMsppDiseaseReportFeedback,
  fetchMsppDiseaseReportFeedbackList,
} from "@/lib/msppApi";
import type { MsppDiseaseReportFeedbackItem } from "@/lib/publicHealthApi";
import { inputStyle } from "@/components/pharmacy/Modal";

const CATEGORIES = [
  "GEO_INCOMPLETE",
  "CLINICAL_INCOMPLETE",
  "LAB_MISSING",
  "CODE_VERIFY",
  "DUPLICATE_SUSPECTED",
  "DATA_INCONSISTENT",
  "OTHER",
] as const;

const SEVERITIES = ["INFO", "WARNING", "ACTION_REQUIRED"] as const;

function labelOrRaw(t: (k: string) => string, prefix: string, code: string): string {
  const key = `${prefix}.${code}`;
  const out = t(key);
  return out === key ? code : out;
}

type Props = {
  diseaseCaseReportId: string | null;
  diseaseCaseReviewId: string;
};

export function MsppValidationQualityFeedbackBlock({ diseaseCaseReportId, diseaseCaseReviewId }: Props) {
  const { t } = useI18n();
  const [items, setItems] = useState<MsppDiseaseReportFeedbackItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("GEO_INCOMPLETE");
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number]>("WARNING");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    if (!diseaseCaseReportId) return;
    setLoadingList(true);
    try {
      const res = await fetchMsppDiseaseReportFeedbackList(diseaseCaseReportId);
      setItems(res.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoadingList(false);
    }
  }, [diseaseCaseReportId]);

  useEffect(() => {
    if (diseaseCaseReportId) void loadList();
  }, [diseaseCaseReportId, loadList]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!diseaseCaseReportId || !text.trim()) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      await createMsppDiseaseReportFeedback({
        diseaseCaseReportId,
        diseaseCaseReviewId,
        category,
        severity,
        feedbackText: text.trim(),
      });
      setText("");
      setMessage(t("msppValidation.feedbackSubmitOk"));
      await loadList();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg.trim() ? msg : t("msppValidation.feedbackSubmitError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!diseaseCaseReportId) {
    return (
      <div style={{ marginTop: 12, fontSize: 13, color: "#64748b" }}>
        {t("msppValidation.feedbackNoReportId")}
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 12,
        padding: "12px 14px",
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        background: "#fafafa",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 6 }}>
        {t("msppValidation.feedbackSectionTitle")}
      </div>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
        {t("msppValidation.feedbackSectionIntro")}
      </p>

      {loadingList ? (
        <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 10px" }}>{t("msppValidation.feedbackListLoading")}</p>
      ) : items.length > 0 ? (
        <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 12, color: "#334155" }}>
          {items.map((it) => (
            <li key={it.id} style={{ marginBottom: 6 }}>
              <strong>{labelOrRaw(t, "diseaseReports.msppFeedbackCategory", it.category)}</strong>
              {" — "}
              {labelOrRaw(t, "diseaseReports.msppFeedbackSeverity", it.severity)}
              {": "}
              <span style={{ whiteSpace: "pre-wrap" }}>{it.feedbackText}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 10px" }}>{t("msppValidation.feedbackListEmpty")}</p>
      )}

      <form onSubmit={(e) => void submit(e)}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10, alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
            <span>{t("msppValidation.feedbackCategoryLabel")}</span>
            <select
              style={{ ...inputStyle, minWidth: 200, marginBottom: 0 }}
              value={category}
              onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {labelOrRaw(t, "diseaseReports.msppFeedbackCategory", c)}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
            <span>{t("msppValidation.feedbackSeverityLabel")}</span>
            <select
              style={{ ...inputStyle, minWidth: 160, marginBottom: 0 }}
              value={severity}
              onChange={(e) => setSeverity(e.target.value as (typeof SEVERITIES)[number])}
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {labelOrRaw(t, "diseaseReports.msppFeedbackSeverity", s)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
          <span>{t("msppValidation.feedbackTextLabel")}</span>
          <textarea
            style={{
              ...inputStyle,
              width: "100%",
              minHeight: 72,
              marginTop: 4,
              marginBottom: 0,
              resize: "vertical",
            }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={8000}
          />
        </label>
        {message ? (
          <p style={{ color: "#166534", fontSize: 12, margin: "6px 0" }}>{message}</p>
        ) : null}
        {error ? (
          <p style={{ color: "#b91c1c", fontSize: 12, margin: "6px 0" }} role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={submitting || !text.trim()}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid #0ea5e9",
            background: "#f0f9ff",
            fontSize: 13,
            fontWeight: 600,
            cursor: submitting || !text.trim() ? "not-allowed" : "pointer",
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? t("msppValidation.feedbackSubmitting") : t("msppValidation.feedbackSubmit")}
        </button>
      </form>
    </div>
  );
}
