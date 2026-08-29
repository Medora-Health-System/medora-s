"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useI18n } from "@/lib/i18n";
import {
  fetchInpatientClinicalOps,
  patchInpatientClinicalOps,
} from "@/features/hospital-care/inpatientOperationsApi";

/**
 * D3E.7 — Durable clinical ops panel (code status, isolation, care plan, consults, discharge, med recon).
 * INP.PROV.1A — `canWrite` defaults true for existing callers; false = read-only UI (no mutations).
 */
export function InpatientClinicalOpsPanel({
  encounterId,
  mode,
  loadEnabled = true,
  canWrite = true,
}: {
  encounterId: string;
  mode: "nursing" | "consults" | "carePlan" | "discharge" | "overview" | "medications";
  /** INP.2E.1 — MAR first paint does not wait on clinical-ops. */
  loadEnabled?: boolean;
  /**
   * When false, list/read surfaces remain; request/ack/complete (and other mode mutations) are hidden.
   * Defaults true for backwards-compatible callers outside Provider Documentation.
   */
  canWrite?: boolean;
}) {
  const { t } = useI18n();
  const [ops, setOps] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchInpatientClinicalOps(encounterId);
      setOps(data.ops);
    } catch {
      setOps(null);
      setError(t("inpatientD3e7.ops.loadError"));
    }
  }, [encounterId, t]);

  useEffect(() => {
    if (!loadEnabled) return;
    void load();
  }, [load, loadEnabled]);

  const runPatch = async (patch: Record<string, unknown>) => {
    if (!canWrite) return;
    setBusy(true);
    setError(null);
    try {
      const data = await patchInpatientClinicalOps(encounterId, patch);
      setOps(data.ops);
      setText("");
    } catch {
      setError(t("inpatientD3e7.ops.saveError"));
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <p style={{ fontSize: 13, color: "#b91c1c" }} role="alert" data-testid={`ip-ops-error-${mode}`}>
        {error}
      </p>
    );
  }

  if (!ops) {
    return (
      <p style={{ fontSize: 13, color: "#64748b" }} data-testid={`ip-ops-loading-${mode}`}>
        {t("common.loading")}
      </p>
    );
  }

  const codeStatus = (ops.codeStatus as { status?: string } | null)?.status ?? null;
  const isolation = (ops.isolation as { precautions?: string[] } | null)?.precautions ?? [];
  const carePlan = Array.isArray(ops.carePlan) ? ops.carePlan : [];
  const consults = Array.isArray(ops.consults) ? ops.consults : [];
  const medRecon = Array.isArray(ops.medicationReconciliation) ? ops.medicationReconciliation : [];
  const discharge = (ops.dischargePlanning as Record<string, unknown> | null) ?? null;
  const nursing = (ops.nursing as Record<string, unknown> | null) ?? null;

  return (
    <div data-testid={`ip-ops-panel-${mode}`} style={{ fontSize: 13, color: "#334155" }}>
      {mode === "overview" ? (
        <div>
          <p style={{ margin: "0 0 8px" }}>
            {t("inpatientD3e7.ops.codeStatus")}: <strong>{codeStatus || t("common.dash")}</strong>
          </p>
          <p style={{ margin: "0 0 8px" }}>
            {t("inpatientD3e7.ops.isolation")}:{" "}
            <strong>{isolation.length ? isolation.join(", ") : t("common.dash")}</strong>
          </p>
          {!codeStatus || codeStatus === "UNKNOWN" || codeStatus === "PENDING_DISCUSSION" ? (
            <p style={{ margin: "0 0 10px", color: "#b45309", fontSize: 12 }}>
              {t("inpatientD3e7.ops.codeStatusAdvisory")}
            </p>
          ) : null}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runPatch({ setCodeStatus: { status: "FULL_CODE" } })}
              style={btnStyle}
            >
              {t("inpatientD3e7.ops.setFullCode")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void runPatch({
                  setIsolation: { precautions: ["CONTACT"], reason: "Documented in workspace" },
                })
              }
              style={btnStyle}
            >
              {t("inpatientD3e7.ops.setContactIsolation")}
            </button>
          </div>
        </div>
      ) : null}

      {mode === "nursing" ? (
        <div>
          <p style={{ margin: "0 0 8px" }}>
            {t("inpatientD3e7.ops.nursingAdmission")}:{" "}
            <strong>
              {nursing?.admissionAssessmentComplete
                ? t("inpatientD3e7.ops.complete")
                : t("inpatientD3e7.ops.incomplete")}
            </strong>
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void runPatch({
                setNursing: {
                  admissionAssessmentComplete: true,
                  lastShiftAssessmentAt: new Date().toISOString(),
                },
              })
            }
            style={btnStyle}
          >
            {t("inpatientD3e7.ops.markNursingAdmission")}
          </button>
        </div>
      ) : null}

      {mode === "consults" ? (
        <div
          data-testid={canWrite ? "ip-ops-consults-writable" : "ip-ops-consults-readonly"}
          data-can-write={canWrite ? "true" : "false"}
        >
          <ul style={{ margin: "0 0 10px", paddingLeft: 18 }}>
            {consults.length === 0 ? (
              <li>{t("inpatientD3e7.ops.noConsults")}</li>
            ) : (
              (consults as Array<{ consultId: string; specialty: string; status: string }>).map(
                (c) => (
                  <li key={c.consultId}>
                    {c.specialty} — {c.status}
                    {canWrite && c.status === "REQUESTED" ? (
                      <button
                        type="button"
                        disabled={busy}
                        data-testid="ip-ops-ack-consult"
                        style={{ ...btnStyle, marginLeft: 8 }}
                        onClick={() =>
                          void runPatch({
                            consultTransition: { consultId: c.consultId, status: "ACKNOWLEDGED" },
                          })
                        }
                      >
                        {t("inpatientD3e7.ops.ackConsult")}
                      </button>
                    ) : null}
                    {canWrite && (c.status === "ACKNOWLEDGED" || c.status === "IN_PROGRESS") ? (
                      <button
                        type="button"
                        disabled={busy}
                        data-testid="ip-ops-complete-consult"
                        style={{ ...btnStyle, marginLeft: 8 }}
                        onClick={() =>
                          void runPatch({
                            consultTransition: { consultId: c.consultId, status: "COMPLETED" },
                          })
                        }
                      >
                        {t("inpatientD3e7.ops.completeConsult")}
                      </button>
                    ) : null}
                  </li>
                )
              )
            )}
          </ul>
          {canWrite ? (
            <>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("inpatientD3e7.ops.consultReasonPlaceholder")}
                style={inputStyle}
                data-testid="ip-ops-consult-reason"
              />
              <button
                type="button"
                disabled={busy || !text.trim()}
                data-testid="ip-ops-request-consult"
                style={{ ...btnStyle, marginTop: 8 }}
                onClick={() =>
                  void runPatch({
                    appendConsult: {
                      specialty: "INTERNAL_MEDICINE",
                      reason: text.trim(),
                      priority: "ROUTINE",
                    },
                  })
                }
              >
                {t("inpatientD3e7.ops.requestConsult")}
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {mode === "carePlan" ? (
        <div data-testid="inpatient-ops-care-plan-legacy-readonly">
          <p style={{ margin: "0 0 10px", fontSize: 13, color: "#64748b" }}>
            {t("inpatientNursingAdmissionInp2g.carePlanWorkspace.legacyOpsReadOnly")}
          </p>
          <ul style={{ margin: "0 0 10px", paddingLeft: 18 }}>
            {carePlan.length === 0 ? (
              <li>{t("inpatientD3e7.ops.noCarePlan")}</li>
            ) : (
              (
                carePlan as Array<{ itemId: string; discipline: string; goalText: string }>
              ).map((item) => (
                <li key={item.itemId}>
                  {item.discipline}: {item.goalText}
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}

      {mode === "discharge" ? (
        <div>
          <p style={{ margin: "0 0 8px" }}>
            {t("inpatientD3e7.ops.dischargeState")}:{" "}
            <strong>{String(discharge?.workflowState ?? "PLANNING")}</strong>
          </p>
          <p style={{ margin: "0 0 8px" }}>
            {t("inpatientD3e7.ops.destination")}:{" "}
            <strong>{String(discharge?.destination ?? t("common.dash"))}</strong>
          </p>
          <button
            type="button"
            disabled={busy}
            style={btnStyle}
            onClick={() =>
              void runPatch({
                setDischargePlanning: {
                  destination: "HOME",
                  workflowState: "PLANNING",
                  anticipatedDischargeDate: new Date().toISOString().slice(0, 10),
                },
              })
            }
          >
            {t("inpatientD3e7.ops.startDischargePlanning")}
          </button>
          <button
            type="button"
            disabled={busy}
            style={{ ...btnStyle, marginLeft: 8 }}
            onClick={() =>
              void runPatch({
                setDischargePlanning: {
                  destination: String(discharge?.destination ?? "HOME"),
                  workflowState: "READY",
                },
              })
            }
          >
            {t("inpatientD3e7.ops.markDischargeReady")}
          </button>
        </div>
      ) : null}

      {mode === "medications" ? (
        <div>
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>
            {t("inpatientD3e7.ops.medReconHint")}
          </p>
          <ul style={{ margin: "0 0 10px", paddingLeft: 18 }}>
            {medRecon.length === 0 ? (
              <li>{t("inpatientD3e7.ops.noMedRecon")}</li>
            ) : (
              (
                medRecon as Array<{ lineId: string; sourceLabel: string; decision: string }>
              ).map((line) => (
                <li key={line.lineId}>
                  {line.sourceLabel}: {line.decision}
                </li>
              ))
            )}
          </ul>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("inpatientD3e7.ops.medSourcePlaceholder")}
            style={inputStyle}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {(["CONTINUE", "HOLD", "DISCONTINUE", "NOT_TAKING", "UNABLE_TO_VERIFY"] as const).map(
              (decision) => (
                <button
                  key={decision}
                  type="button"
                  disabled={busy || !text.trim()}
                  style={btnStyle}
                  onClick={() =>
                    void runPatch({
                      appendMedRecon: {
                        sourceLabel: text.trim(),
                        decision,
                        reason: null,
                      },
                    })
                  }
                >
                  {decision}
                </button>
              )
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const btnStyle: CSSProperties = {
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  maxWidth: 420,
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 13,
};
