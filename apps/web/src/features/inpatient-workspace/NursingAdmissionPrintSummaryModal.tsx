"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { fetchNursingAdmissionPrintSummary } from "@/features/hospital-care/inpatientOperationsApi";
import { DISPLAY_DASH } from "@/lib/patientDisplay";

type PrintSummary = {
  printStatus?: string;
  documentRevision?: number;
  printedAt?: string;
  facility?: { name?: string | null };
  patient?: {
    legalName?: string | null;
    mrn?: string | null;
    dob?: string | null;
    sexAtBirth?: string | null;
  };
  encounter?: {
    id?: string;
    admittedAt?: string | null;
    unit?: string | null;
    roomBed?: string | null;
    attending?: string | null;
  };
  overview?: Record<string, unknown>;
  sections?: Array<{
    sectionId: string;
    completionState: string;
    authoritativeDomain: string;
    domainRefCount: number;
    loadError?: string | null;
    answersSummary?: Record<string, unknown> | null;
  }>;
  signature?: {
    signed?: boolean;
    signedAt?: string | null;
    signedByUserId?: string | null;
    displayName?: string | null;
    credentials?: string | null;
  } | null;
  amendments?: Array<{
    amendmentId: string;
    type: string;
    reason: string;
    note?: string | null;
    sectionId?: string | null;
    createdAt: string;
    createdByUserId: string;
    originalValue?: unknown;
    correctedValue?: unknown;
  }>;
  warnings?: string[];
};

export function NursingAdmissionPrintSummaryModal({
  encounterId,
  open,
  onClose,
}: {
  encounterId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [summary, setSummary] = useState<PrintSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const raw = await fetchNursingAdmissionPrintSummary(encounterId);
        if (!cancelled) setSummary(raw as PrintSummary);
      } catch {
        if (!cancelled) {
          setSummary(null);
          setError(t("hospitalAdmissionD4a25a.print.loadError"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, encounterId, t]);

  if (!open) return null;

  const statusKey =
    summary?.printStatus === "DRAFT"
      ? "draft"
      : summary?.printStatus === "CORRECTED"
        ? "corrected"
        : summary?.printStatus === "AMENDED"
          ? "amended"
          : "signed";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="nursing-admission-print-title"
      data-testid="nursing-admission-print-modal"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        zIndex: 80,
        display: "flex",
        justifyContent: "center",
        padding: 16,
        overflow: "auto",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          maxWidth: 860,
          width: "100%",
          padding: 16,
          alignSelf: "flex-start",
        }}
      >
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <button type="button" onClick={onClose}>
            {t("hospitalAdmissionD4a25a.print.close")}
          </button>
          <button
            type="button"
            disabled={!summary}
            onClick={() => window.print()}
            data-testid="nursing-admission-print-action"
          >
            {t("hospitalAdmissionD4a25a.print.print")}
          </button>
          <span
            title={t("hospitalAdmissionD4a25a.domain.helpPrint")}
            aria-label={t("hospitalAdmissionD4a25a.domain.helpPrint")}
            style={{
              display: "inline-flex",
              width: 18,
              height: 18,
              borderRadius: 9999,
              border: "1px solid #94a3b8",
              fontSize: 11,
              alignItems: "center",
              justifyContent: "center",
              cursor: "help",
              alignSelf: "center",
            }}
          >
            ?
          </span>
        </div>

        {loading ? <p>{t("common.loading")}</p> : null}
        {error ? (
          <p role="alert" style={{ color: "#b91c1c" }}>
            {error}
          </p>
        ) : null}

        {summary ? (
          <article data-testid="nursing-admission-print-summary">
            <header style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 10 }}>
              <h2 id="nursing-admission-print-title" style={{ margin: 0, fontSize: 18 }}>
                {t("hospitalAdmissionD4a25a.print.title")}
              </h2>
              <p style={{ margin: "6px 0 0", fontSize: 13 }}>
                {t("hospitalAdmissionD4a25a.print.facility")}:{" "}
                {summary.facility?.name || DISPLAY_DASH}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 13 }}>
                {t("hospitalAdmissionD4a25a.print.status")}:{" "}
                <strong>{t(`hospitalAdmissionD4a25a.print.${statusKey}`)}</strong>
                {" · "}
                {t("hospitalAdmissionD4a25a.print.revision")}: {summary.documentRevision ?? DISPLAY_DASH}
                {" · "}
                {t("hospitalAdmissionD4a25a.print.printedAt")}: {summary.printedAt || DISPLAY_DASH}
              </p>
            </header>

            <section style={{ marginTop: 12, fontSize: 13 }}>
              <p>
                <strong>{summary.patient?.legalName || DISPLAY_DASH}</strong>
                {" · "}
                {summary.patient?.mrn || DISPLAY_DASH}
                {" · "}
                {summary.patient?.dob || DISPLAY_DASH}
                {" · "}
                {summary.patient?.sexAtBirth || DISPLAY_DASH}
              </p>
              <p>
                {summary.encounter?.id}
                {" · "}
                {summary.encounter?.roomBed || DISPLAY_DASH}
                {" · "}
                {summary.encounter?.attending || DISPLAY_DASH}
              </p>
            </section>

            <section style={{ marginTop: 12 }}>
              <h3 style={{ fontSize: 14, margin: "0 0 6px" }}>
                {t("hospitalAdmissionD4a0.clinical.sections.OVERVIEW")}
              </h3>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {Object.entries(summary.overview ?? {})
                  .filter(([, v]) => v != null && v !== "")
                  .map(([k, v]) => (
                    <li key={k}>
                      {k}: {String(v)}
                    </li>
                  ))}
              </ul>
            </section>

            <section style={{ marginTop: 12 }}>
              <h3 style={{ fontSize: 14, margin: "0 0 6px" }}>
                {t("hospitalAdmissionD4a25.review.title")}
              </h3>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
                {(summary.sections ?? []).map((s) => (
                  <li key={s.sectionId} style={{ marginBottom: 6 }}>
                    <strong>{t(`hospitalAdmissionD4a0.clinical.sections.${s.sectionId}`)}</strong>
                    {" — "}
                    {s.completionState} · {s.authoritativeDomain} ·{" "}
                    {t("hospitalAdmissionD4a25a.domain.linkedCount").replace(
                      "{count}",
                      String(s.domainRefCount)
                    )}
                    {s.loadError ? (
                      <div role="status" style={{ color: "#9a3412" }}>
                        ⚠ {s.loadError}
                      </div>
                    ) : null}
                    {s.answersSummary ? (
                      <div style={{ color: "#475569" }}>
                        {Object.entries(s.answersSummary)
                          .slice(0, 8)
                          .map(([k, v]) => `${k}=${String(v)}`)
                          .join("; ")}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>

            <section style={{ marginTop: 12, fontSize: 13 }}>
              <h3 style={{ fontSize: 14, margin: "0 0 6px" }}>
                {t("hospitalAdmissionD4a25a.print.signature")}
              </h3>
              <p>
                {summary.signature?.displayName || summary.signature?.signedByUserId || DISPLAY_DASH}
                {" · "}
                {summary.signature?.credentials || DISPLAY_DASH}
                {" · "}
                {summary.signature?.signedAt || DISPLAY_DASH}
              </p>
            </section>

            <section style={{ marginTop: 12 }}>
              <h3 style={{ fontSize: 14, margin: "0 0 6px" }}>
                {t("hospitalAdmissionD4a25a.print.amendments")}
              </h3>
              {(summary.amendments ?? []).length === 0 ? (
                <p style={{ fontSize: 13 }}>{t("hospitalAdmissionD4a25a.amendments.empty")}</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
                  {(summary.amendments ?? []).map((a) => (
                    <li key={a.amendmentId}>
                      {a.type} · {a.sectionId || "—"} · {a.reason}
                      {a.note ? ` — ${a.note}` : ""}
                      {a.type === "CORRECTION" ? (
                        <div>
                          {t("hospitalAdmissionD4a25a.amendments.original")}:{" "}
                          {JSON.stringify(a.originalValue)}
                          {" → "}
                          {t("hospitalAdmissionD4a25a.amendments.corrected")}:{" "}
                          {JSON.stringify(a.correctedValue)}
                        </div>
                      ) : null}
                      <div style={{ color: "#64748b" }}>
                        {a.createdAt} · {a.createdByUserId}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </article>
        ) : null}
      </div>
    </div>
  );
}
