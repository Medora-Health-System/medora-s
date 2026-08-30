"use client";

/**
 * INP.DIS.1G.1 — Fast nursing medication reconciliation (one-click Continue / Stop / Edit).
 * Persists to dischargeSummaryJson.inpatientMedRecon via clinical-ops finalize.
 */

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  allRequiredMedReconDecisionsComplete,
  canBulkContinueMedReconLine,
  medReconLineNeedsReview,
  summarizeMedReconWorkspace,
  type InpatientDischargeMedReconHistoryState,
  type InpatientDischargeMedReconLineV1,
  type MedReconDecision,
} from "@medora/shared";
import { MedicationAutocomplete } from "@/components/pharmacy/MedicationAutocomplete";
import { medicationSearchLabel, type MedicationSearchItem } from "@/lib/pharmacyApi";
import { useI18n } from "@/lib/i18n";
import { patchInpatientClinicalOps } from "@/features/hospital-care/inpatientOperationsApi";
import { fieldStyle, neutralBtn, primaryBtn } from "./dischargeBoardStyles";

const PREFIX = "inpatientDischargeBoardInpDis1f";

export type MedReconLineDraft = InpatientDischargeMedReconLineV1;

type Props = {
  encounterId: string;
  facilityId: string | null;
  initialLines: MedReconLineDraft[];
  historyState: InpatientDischargeMedReconHistoryState;
  finalized: boolean;
  disabled: boolean;
  onSaved: () => void | Promise<void>;
};

function newId(): string {
  return `mrl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function serializeLine(l: MedReconLineDraft) {
  return {
    id: l.id,
    sourceLabel: l.sourceLabel,
    medicationName: l.medicationName,
    strength: l.strength ?? null,
    dose: l.dose ?? null,
    unit: l.unit ?? null,
    route: l.route ?? null,
    frequency: l.frequency ?? null,
    instructions: l.instructions ?? null,
    catalogMedicationId: l.catalogMedicationId ?? null,
    source: l.source,
    rowKind: l.rowKind ?? null,
    homeRegimen: l.homeRegimen ?? null,
    dischargeRegimen: l.dischargeRegimen ?? null,
    providerPlanRelationship: l.providerPlanRelationship ?? null,
    providerPlanSummary: l.providerPlanSummary ?? null,
    decision: l.decision,
    reason: l.reason ?? null,
  };
}

export function InpatientDischargeMedReconPanel({
  encounterId,
  facilityId,
  initialLines,
  historyState,
  finalized,
  disabled,
  onSaved,
}: Props) {
  const { t, language } = useI18n();
  const tp = (key: string) => t(`${PREFIX}.${key}`);
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<MedReconLineDraft[]>(initialLines);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchKey, setSearchKey] = useState(0);

  useEffect(() => {
    setLines(initialLines);
  }, [initialLines]);

  const summary = useMemo(() => summarizeMedReconWorkspace(lines), [lines]);
  const canFinalize = allRequiredMedReconDecisionsComplete(lines);
  const bulkTargets = useMemo(() => lines.filter(canBulkContinueMedReconLine), [lines]);
  const operationallyFinalized = finalized && summary.needsReview === 0;

  const setDecision = (id: string, decision: MedReconDecision, reason?: string | null) => {
    setLines((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, decision, reason: reason !== undefined ? reason : l.reason }
          : l
      )
    );
    if (editingId === id && decision !== "MODIFY") setEditingId(null);
  };

  const save = async (markComplete: boolean) => {
    if (disabled) return;
    if (markComplete && !canFinalize) {
      setError(tp("medRecon.finalizeBlocked"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await patchInpatientClinicalOps(encounterId, {
        finalizeInpatientMedRecon: {
          markComplete,
          lines: lines.map(serializeLine),
        },
      });
      await onSaved();
    } catch {
      setError(tp("errors.medRec"));
    } finally {
      setBusy(false);
    }
  };

  const onPick = (med: MedicationSearchItem) => {
    const displayName = medicationSearchLabel(med, language, t);
    const strength =
      typeof med.metadata?.strength === "string" ? med.metadata.strength : null;
    setLines((prev) => [
      ...prev,
      {
        id: newId(),
        sourceLabel: displayName,
        medicationName: displayName,
        strength,
        dose: null,
        unit: null,
        route: null,
        frequency: null,
        instructions: null,
        catalogMedicationId: med.id,
        source: "MANUAL",
        rowKind: "MANUAL",
        decision: "UNABLE_TO_VERIFY",
        reason: null,
      },
    ]);
    setSearchKey((k) => k + 1);
  };

  const statusLabel = (line: MedReconLineDraft) => {
    if (line.decision === "CONTINUE") return tp("medRecon.status.continue");
    if (line.decision === "DISCONTINUE") return tp("medRecon.status.stop");
    if (line.decision === "MODIFY" || line.decision === "REPLACE") {
      return tp("medRecon.status.changed");
    }
    if (line.decision === "HOLD" || line.decision === "NOT_TAKING") {
      return tp(`medRecon.${line.decision}`);
    }
    return tp("medRecon.status.needsReview");
  };

  const emptyMessage =
    historyState === "MEDICATION_HISTORY_UNAVAILABLE"
      ? tp("medRecon.historyUnavailable")
      : historyState === "NO_DOCUMENTED_MEDICATIONS"
        ? tp("medRecon.noneDocumented")
        : tp("medRecon.empty");

  return (
    <div data-testid="inp-dis-1g-med-recon" style={{ display: "grid", gap: 8 }}>
      <button type="button" style={neutralBtn} onClick={() => setOpen((v) => !v)}>
        {open ? tp("medRecon.hide") : tp("medRecon.open")}
        {operationallyFinalized ? ` · ${tp("medRecon.finalized")}` : ""}
      </button>
      {open ? (
        <div style={panel} data-testid="inp-dis-1g-med-recon-drawer">
          <h3 style={{ margin: 0, fontSize: 14 }}>{tp("medRecon.title")}</h3>
          <div
            data-testid="inp-dis-1g-med-recon-summary"
            style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}
          >
            {tp("medRecon.summary")
              .replace("{total}", String(summary.total))
              .replace("{reconciled}", String(summary.reconciled))
              .replace("{needsReview}", String(summary.needsReview))}
          </div>

          {!disabled && !operationallyFinalized ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <MedicationAutocomplete
                key={searchKey}
                facilityId={facilityId}
                placeholder={tp("medRecon.addFromSearch")}
                onSelect={onPick}
                mode="prescribe"
              />
              {bulkTargets.length > 0 ? (
                <button
                  type="button"
                  style={neutralBtn}
                  data-testid="inp-dis-1g-med-recon-bulk-continue"
                  disabled={busy}
                  onClick={() =>
                    setLines((prev) =>
                      prev.map((l) =>
                        canBulkContinueMedReconLine(l) ? { ...l, decision: "CONTINUE" } : l
                      )
                    )
                  }
                >
                  {tp("medRecon.bulkContinue")} ({bulkTargets.length})
                </button>
              ) : null}
            </div>
          ) : null}

          {lines.length === 0 ? (
            <div data-testid="inp-dis-1g-med-recon-empty" style={{ display: "grid", gap: 6 }}>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{emptyMessage}</p>
            </div>
          ) : (
            lines.map((line) => {
              const needsReview = medReconLineNeedsReview(line);
              const isEdit = editingId === line.id;
              const kind = line.rowKind ?? "HOME_ONLY";
              return (
                <div
                  key={line.id}
                  style={{
                    ...row,
                    borderColor: needsReview ? "#fbbf24" : "#cbd5e1",
                  }}
                  data-testid="inp-dis-1g-med-recon-line"
                  data-row-kind={kind}
                  data-decision={line.decision}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ display: "grid", gap: 2, minWidth: 0, flex: 1 }}>
                      <strong style={{ fontSize: 13 }}>{line.medicationName}</strong>
                      {kind === "PROVIDER_CHANGED" ? (
                        <>
                          <span style={meta}>
                            {tp("medRecon.homeLabel")}: {line.homeRegimen || "—"}
                          </span>
                          <span style={meta}>
                            {tp("medRecon.dischargePlanLabel")}: {line.dischargeRegimen || "—"}
                          </span>
                          <span style={{ ...meta, fontWeight: 700 }}>
                            {tp("medRecon.changedByProvider")}
                          </span>
                        </>
                      ) : kind === "PROVIDER_NEW" ? (
                        <>
                          <span style={{ ...meta, fontWeight: 700 }}>
                            {tp("medRecon.newAtDischarge")}
                          </span>
                          <span style={meta}>{line.dischargeRegimen || line.sourceLabel}</span>
                        </>
                      ) : kind === "PROVIDER_STOP" ? (
                        <>
                          <span style={meta}>
                            {line.homeRegimen
                              ? `${tp("medRecon.homeLabel")}: ${line.homeRegimen}`
                              : line.sourceLabel}
                          </span>
                          <span style={{ ...meta, fontWeight: 700 }}>
                            {tp("medRecon.providerPlanStop")}
                          </span>
                        </>
                      ) : (
                        <>
                          <span style={meta}>
                            {line.homeRegimen ||
                              line.dischargeRegimen ||
                              [line.dose, line.unit, line.route, line.frequency]
                                .filter(Boolean)
                                .join(" ") ||
                              line.sourceLabel}
                          </span>
                          <span style={meta}>
                            {tp("medRecon.source")}: {tp(`medRecon.sourceType.${line.source}`)}
                          </span>
                        </>
                      )}
                    </div>
                    <span
                      data-testid="inp-dis-1g-med-recon-status"
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: needsReview ? "#b45309" : "#166534",
                      }}
                      aria-label={statusLabel(line)}
                    >
                      {statusLabel(line)}
                    </span>
                  </div>

                  {!disabled && !operationallyFinalized ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {kind === "PROVIDER_CHANGED" ? (
                        <ActionBtn
                          testId="recon-accept-change"
                          title={tp("medRecon.actions.acceptChange")}
                          tone="ok"
                          onClick={() => setDecision(line.id, "MODIFY")}
                        >
                          ✓ {tp("medRecon.actions.acceptChange")}
                        </ActionBtn>
                      ) : kind === "PROVIDER_NEW" ? (
                        <ActionBtn
                          testId="recon-confirm-new"
                          title={tp("medRecon.actions.confirmNew")}
                          tone="ok"
                          onClick={() => setDecision(line.id, "CONTINUE")}
                        >
                          ✓ {tp("medRecon.actions.confirmNew")}
                        </ActionBtn>
                      ) : kind === "PROVIDER_STOP" ? (
                        <ActionBtn
                          testId="recon-confirm-stop"
                          title={tp("medRecon.actions.confirmStop")}
                          tone="danger"
                          onClick={() => setDecision(line.id, "DISCONTINUE")}
                        >
                          ✕ {tp("medRecon.actions.confirmStop")}
                        </ActionBtn>
                      ) : (
                        <ActionBtn
                          testId="recon-continue"
                          title={tp("medRecon.actions.continue")}
                          tone="ok"
                          onClick={() => setDecision(line.id, "CONTINUE")}
                        >
                          ✓ {tp("medRecon.actions.continue")}
                        </ActionBtn>
                      )}
                      {kind !== "PROVIDER_STOP" ? (
                        <ActionBtn
                          testId="recon-stop"
                          title={tp("medRecon.actions.stop")}
                          tone="danger"
                          onClick={() => setDecision(line.id, "DISCONTINUE")}
                        >
                          ✕ {tp("medRecon.actions.stop")}
                        </ActionBtn>
                      ) : null}
                      <ActionBtn
                        testId="recon-edit"
                        title={tp("medRecon.actions.edit")}
                        tone="neutral"
                        onClick={() => {
                          setEditingId(isEdit ? null : line.id);
                          if (!isEdit) setDecision(line.id, "MODIFY");
                        }}
                      >
                        ✎ {tp("medRecon.actions.edit")}
                      </ActionBtn>
                    </div>
                  ) : null}

                  {isEdit && !operationallyFinalized ? (
                    <div style={{ display: "grid", gap: 6 }} data-testid="inp-dis-1g-med-recon-editor">
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        <input
                          style={fieldStyle}
                          placeholder={tp("medRecon.dose")}
                          value={line.dose ?? ""}
                          disabled={disabled}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l) =>
                                l.id === line.id ? { ...l, dose: e.target.value } : l
                              )
                            )
                          }
                        />
                        <input
                          style={fieldStyle}
                          placeholder={tp("dischargeMeds.unit")}
                          value={line.unit ?? ""}
                          disabled={disabled}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l) =>
                                l.id === line.id ? { ...l, unit: e.target.value } : l
                              )
                            )
                          }
                        />
                        <input
                          style={fieldStyle}
                          placeholder={tp("medRecon.route")}
                          value={line.route ?? ""}
                          disabled={disabled}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l) =>
                                l.id === line.id ? { ...l, route: e.target.value } : l
                              )
                            )
                          }
                        />
                        <input
                          style={fieldStyle}
                          placeholder={tp("medRecon.frequency")}
                          value={line.frequency ?? ""}
                          disabled={disabled}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l) =>
                                l.id === line.id ? { ...l, frequency: e.target.value } : l
                              )
                            )
                          }
                        />
                      </div>
                      <input
                        style={fieldStyle}
                        placeholder={tp("dischargeMeds.instructions")}
                        value={line.instructions ?? ""}
                        disabled={disabled}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l) =>
                              l.id === line.id ? { ...l, instructions: e.target.value } : l
                            )
                          )
                        }
                      />
                      <input
                        style={fieldStyle}
                        placeholder={tp("medRecon.reason")}
                        value={line.reason ?? ""}
                        disabled={disabled}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l) =>
                              l.id === line.id ? { ...l, reason: e.target.value } : l
                            )
                          )
                        }
                      />
                    </div>
                  ) : null}
                </div>
              );
            })
          )}

          {error ? <p style={{ margin: 0, color: "#b91c1c", fontSize: 12 }}>{error}</p> : null}
          {!disabled && !operationallyFinalized ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                style={neutralBtn}
                disabled={busy}
                onClick={() => void save(false)}
              >
                {tp("medRecon.saveDraft")}
              </button>
              <button
                type="button"
                style={primaryBtn}
                disabled={busy || !canFinalize}
                data-testid="inp-dis-1g-med-recon-finalize"
                onClick={() => void save(true)}
              >
                {tp("medRecon.finalize")}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ActionBtn(props: {
  children: ReactNode;
  title: string;
  tone: "ok" | "danger" | "neutral";
  onClick: () => void;
  testId: string;
}) {
  const colors =
    props.tone === "ok"
      ? { border: "#86efac", background: "#f0fdf4", color: "#166534" }
      : props.tone === "danger"
        ? { border: "#fca5a5", background: "#fef2f2", color: "#991b1b" }
        : { border: "#cbd5e1", background: "#fff", color: "#334155" };
  return (
    <button
      type="button"
      title={props.title}
      aria-label={props.title}
      data-testid={props.testId}
      onClick={props.onClick}
      style={{
        fontSize: 12,
        fontWeight: 700,
        padding: "4px 8px",
        borderRadius: 8,
        border: `1px solid ${colors.border}`,
        background: colors.background,
        color: colors.color,
        cursor: "pointer",
      }}
    >
      {props.children}
    </button>
  );
}

const panel: CSSProperties = {
  display: "grid",
  gap: 8,
  padding: 10,
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  background: "#fff",
};
const row: CSSProperties = {
  display: "grid",
  gap: 6,
  padding: 8,
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  background: "#f8fafc",
};
const meta: CSSProperties = { fontSize: 11, color: "#475569" };
