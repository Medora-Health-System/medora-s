"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import type { InpatientFinalDischargeReadiness, InpatientFinalDischargeV1E } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { productUiBcp47Tag } from "@/i18n/config";
import {
  executeInpatientFinalDischarge,
  fetchInpatientFinalDischarge,
} from "@/features/hospital-care/inpatientOperationsApi";

const sectionStyle: CSSProperties = {
  ...MEDORA_CARD_SHELL,
  padding: 12,
  display: "grid",
  gap: 10,
};

function mark(status: string): string {
  if (status === "complete") return "✓";
  if (status === "attention" || status === "blocked") return "!";
  if (status === "not_applicable") return "—";
  return "○";
}

function statusColor(status: string): string {
  if (status === "complete") return "#047857";
  if (status === "attention" || status === "blocked") return "#b45309";
  return "#64748b";
}

export function InpatientFinalDischargeSection({
  encounterId,
  canExecute,
  onDischarged,
}: {
  encounterId: string;
  canExecute: boolean;
  onDischarged?: () => void;
}) {
  const { t, language } = useI18n();
  const prefix = "inpatientFinalDischargeInpDis1e";
  const dateLocale = productUiBcp47Tag(language);

  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<InpatientFinalDischargeReadiness | null>(null);
  const [completed, setCompleted] = useState<InpatientFinalDischargeV1E | null>(null);
  const [status, setStatus] = useState<string>("OPEN");
  const [canRun, setCanRun] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchInpatientFinalDischarge(encounterId);
      setReadiness(res.readiness as InpatientFinalDischargeReadiness);
      setCompleted((res.completed as InpatientFinalDischargeV1E | null) ?? null);
      setStatus(String(res.status ?? "OPEN"));
      setCanRun(res.canExecute === true && canExecute);
    } catch {
      setError(t(`${prefix}.errors.load`));
    } finally {
      setLoading(false);
    }
  }, [canExecute, encounterId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const execute = async () => {
    if (!readiness || !canRun) return;
    const dest = readiness.dispositionLabel || readiness.dispositionCode || "";
    const ok = window.confirm(
      `${t(`${prefix}.confirmTitle`)}\n${dest ? `${dest}\n` : ""}${t(`${prefix}.confirmBody`)}`
    );
    if (!ok) return;
    setExecuting(true);
    setError(null);
    try {
      const res = await executeInpatientFinalDischarge(encounterId, {
        expectedProviderRevision: readiness.providerRevision,
        expectedNursingRevision: readiness.nursingRevision,
      });
      setCompleted((res.completed as InpatientFinalDischargeV1E) ?? null);
      setStatus(String(res.status ?? "CLOSED"));
      setReadiness((res.readiness as InpatientFinalDischargeReadiness) ?? readiness);
      setCanRun(false);
      onDischarged?.();
    } catch (e: unknown) {
      const err = e as { status?: number; body?: { errors?: string[]; blockers?: Array<{ code: string }> } };
      if (err.status === 409) setError(t(`${prefix}.conflict`));
      else if (err.status === 403) setError(t(`${prefix}.forbidden`));
      else if (Array.isArray(err.body?.errors) && err.body.errors.length) {
        setError(
          `${t(`${prefix}.blockersHeading`)}\n${err.body.errors
            .map((c) => `• ${t(`${prefix}.validation.${c}`)}`)
            .join("\n")}`
        );
      } else setError(t(`${prefix}.errors.execute`));
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <div data-testid="inpatient-final-discharge-loading" style={sectionStyle}>
        {t("common.loading")}
      </div>
    );
  }

  if (completed || status === "CLOSED") {
    return (
      <div data-testid="inpatient-final-discharge-completed" style={sectionStyle}>
        <h4 style={{ margin: 0, fontSize: 15 }}>{t(`${prefix}.completedTitle`)}</h4>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
          {completed?.dispositionLabelSnapshot ||
            completed?.clinicalDispositionCode ||
            readiness?.dispositionLabel ||
            readiness?.dispositionCode ||
            "—"}
        </p>
        {completed?.dischargedAt || readiness?.departedAt ? (
          <p style={{ margin: 0, fontSize: 13 }}>
            {new Date(completed?.dischargedAt || readiness?.departedAt || "").toLocaleString(dateLocale)}
          </p>
        ) : null}
        {completed?.dischargedByDisplayNameSnapshot ? (
          <p style={{ margin: 0, fontSize: 12 }}>
            {t(`${prefix}.dischargedBy`)}: {completed.dischargedByDisplayNameSnapshot}
          </p>
        ) : null}
      </div>
    );
  }

  const rows: Array<{ key: string; label: string; state: string }> = readiness
    ? [
        { key: "provider", label: t(`${prefix}.provider`), state: readiness.provider },
        {
          key: "med",
          label: t(`${prefix}.medRecon`),
          state: readiness.medicationReconciliation,
        },
        { key: "nursing", label: t(`${prefix}.nursing`), state: readiness.nursing },
        {
          key: "disposition",
          label: t(`${prefix}.disposition`),
          state: readiness.disposition,
        },
        { key: "departure", label: t(`${prefix}.departure`), state: readiness.departure },
      ]
    : [];

  return (
    <div data-testid="inpatient-final-discharge-section" style={sectionStyle}>
      <h4 style={{ margin: 0, fontSize: 15 }}>{t(`${prefix}.title`)}</h4>
      <div
        data-testid="inpatient-final-discharge-readiness"
        style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
      >
        {rows.map((row) => (
          <span
            key={row.key}
            style={{
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: 9999,
              border: "1px solid #cbd5e1",
              color: statusColor(row.state),
              fontWeight: 600,
            }}
          >
            {mark(row.state)} {row.label}
          </span>
        ))}
        <span
          style={{
            fontSize: 12,
            padding: "4px 10px",
            borderRadius: 9999,
            border: "1px solid #cbd5e1",
            color: readiness?.ready ? "#047857" : "#64748b",
            fontWeight: 700,
          }}
        >
          {readiness?.ready ? "✓" : "○"} {t(`${prefix}.final`)}
          {readiness?.ready ? ` — ${t(`${prefix}.readiness.complete`)}` : ""}
        </span>
      </div>

      {readiness?.dispositionLabel || readiness?.dispositionCode ? (
        <p style={{ margin: 0, fontSize: 13 }}>
          {t(`${prefix}.disposition`)}:{" "}
          <strong>{readiness.dispositionLabel || readiness.dispositionCode}</strong>
          {readiness.departedAt
            ? ` · ${t(`${prefix}.departure`)}: ${new Date(readiness.departedAt).toLocaleString(dateLocale)}`
            : ""}
        </p>
      ) : null}

      {readiness && !readiness.ready && readiness.blockers.length > 0 ? (
        <div style={{ fontSize: 12, color: "#b45309" }}>
          <div style={{ fontWeight: 600 }}>{t(`${prefix}.blockersHeading`)}</div>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
            {readiness.blockers.map((b) => (
              <li key={b.code}>{t(`${prefix}.validation.${b.code}`)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "#b91c1c", fontSize: 12, fontFamily: "inherit" }}>
          {error}
        </pre>
      ) : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          data-testid="inpatient-final-discharge-execute"
          disabled={executing || !canRun || !readiness?.ready}
          onClick={() => void execute()}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            border: "1px solid #0f766e",
            background: canRun && readiness?.ready ? "#0f766e" : "#e2e8f0",
            color: canRun && readiness?.ready ? "#fff" : "#64748b",
            fontWeight: 700,
            fontSize: 13,
            cursor: canRun && readiness?.ready ? "pointer" : "not-allowed",
          }}
        >
          {executing ? t(`${prefix}.discharging`) : t(`${prefix}.dischargePatient`)}
        </button>
        <button type="button" disabled={executing} onClick={() => void load()}>
          {t(`${prefix}.reload`)}
        </button>
      </div>
    </div>
  );
}
