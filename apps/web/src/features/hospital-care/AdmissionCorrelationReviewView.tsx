"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useI18n } from "@/lib/i18n";
import { apiFetch } from "@/lib/apiClient";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { HospitalCareShell } from "./HospitalCareShell";
import { DISPLAY_DASH } from "@/lib/patientDisplay";

type QueueItem = {
  kind: string;
  placementId?: string;
  sourceEncounterId?: string;
  receivingEncounterId?: string | null;
  detail: string;
  decision: string;
};

/**
 * D3E.8A — Admin-only legacy admission correlation reconciliation console.
 * Ambiguous cases remain REVIEW_REQUIRED — never silent auto-link.
 */
export function AdmissionCorrelationReviewView() {
  const { t } = useI18n();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiFetch("/admission-correlation/reconciliation/queue");
        if (!cancelled) {
          setItems(((data as { items?: QueueItem[] })?.items ?? []) as QueueItem[]);
          setError(null);
          setDisabled(false);
        }
      } catch (e) {
        if (!cancelled) {
          const text = String((e as Error)?.message ?? e);
          if (text.toLowerCase().includes("disabled") || text.includes("403")) {
            setDisabled(true);
            setError(t("hospitalCareD3e8a.reconciliation.disabled"));
          } else {
            setError(t("hospitalCareD3e8a.reconciliation.loadError"));
          }
          setItems([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  async function markNotRelated() {
    if (!selected?.receivingEncounterId) return;
    setMsg(null);
    try {
      // Explicit reject path: audited mutation only when evidence LINK — otherwise review stays.
      await apiFetch("/admission-correlation/reconciliation/correct", {
        method: "POST",
        body: JSON.stringify({
          hostEncounterId: selected.receivingEncounterId,
          expectedVersion: 1,
          reason: reason.trim() || "MARK_NOT_RELATED_REVIEW",
          evidence: { samePatientOnly: true },
          patch: {},
        }),
      });
      setMsg(t("hospitalCareD3e8a.reconciliation.rejectBlocked"));
    } catch {
      setMsg(t("hospitalCareD3e8a.reconciliation.rejectBlocked"));
    }
  }

  return (
    <HospitalCareShell
      active="admissions"
      title={t("hospitalCareD3e8a.reconciliation.title")}
      subtitle={t("hospitalCareD3e8a.reconciliation.subtitle")}
    >
      <section style={{ ...MEDORA_CARD_SHELL, padding: 12 }} data-testid="admission-correlation-review">
        {error ? (
          <p style={{ fontSize: 13, color: "#b45309" }}>{error}</p>
        ) : null}
        {!disabled && items.length === 0 && !error ? (
          <p style={{ fontSize: 13, color: "#64748b" }}>
            {t("hospitalCareD3e8a.reconciliation.empty")}
          </p>
        ) : null}
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {items.map((item, idx) => (
            <li
              key={`${item.kind}-${item.placementId ?? item.receivingEncounterId ?? idx}`}
              style={rowStyle}
            >
              <div>
                <strong style={{ fontSize: 13 }}>{item.kind}</strong>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#475569" }}>{item.detail}</p>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#64748b" }}>
                  {t("hospitalCareD3e8a.reconciliation.decision")}: {item.decision || DISPLAY_DASH}
                </p>
              </div>
              <button
                type="button"
                style={btnStyle}
                onClick={() => setSelected(item)}
              >
                {t("hospitalCareD3e8a.reconciliation.inspect")}
              </button>
            </li>
          ))}
        </ul>

        {selected ? (
          <div style={{ marginTop: 12, borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
            <h4 style={{ margin: "0 0 8px", fontSize: 13 }}>
              {t("hospitalCareD3e8a.reconciliation.selected")}
            </h4>
            <p style={{ fontSize: 12, color: "#475569" }}>{selected.detail}</p>
            <label style={{ display: "grid", gap: 4, fontSize: 12, marginTop: 8 }}>
              {t("hospitalCareD3e8a.reconciliation.reason")}
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={inputStyle}
              />
            </label>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button type="button" style={btnStyle} onClick={() => void markNotRelated()}>
                {t("hospitalCareD3e8a.reconciliation.markNotRelated")}
              </button>
            </div>
            <p style={{ fontSize: 11, color: "#64748b", marginTop: 8 }}>
              {t("hospitalCareD3e8a.reconciliation.noAutoLink")}
            </p>
            {msg ? <p style={{ fontSize: 12, marginTop: 6 }}>{msg}</p> : null}
          </div>
        ) : null}
      </section>
    </HospitalCareShell>
  );
}

const rowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  padding: 10,
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  background: "#fff",
};

const btnStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  border: "1px solid #cbd5e1",
  background: "#fff",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const inputStyle: CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "6px 8px",
  fontSize: 13,
};
