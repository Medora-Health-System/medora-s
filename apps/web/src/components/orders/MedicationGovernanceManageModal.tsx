"use client";

import React, { useMemo, useState } from "react";
import {
  MEDICATION_ORDER_DISCONTINUE_REASON_VALUES,
  isMedicationOrderLifecycleGovernanceDeferred,
  type MedicationOrderDiscontinueDto,
  type MedicationOrderEditDto,
  type MedicationOrderLifecycleStatus,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import {
  filterMedicationOrderLifecycleEventsForItem,
  medicationOrderLifecycleEventLabelKey,
} from "@/lib/medicationOrderLifecycleHistory";
import {
  discontinueAndReorderMedicationOrderItem,
  discontinueMedicationOrderItem,
  editMedicationOrderItem,
  holdMedicationOrderItem,
  medicationOrderLifecycleStatusLabelKey,
  resumeMedicationOrderItem,
} from "@/lib/medicationOrderLifecycleApi";

export type MedicationGovernanceLifecycleAction =
  | "discontinue"
  | "hold"
  | "resume"
  | "edit"
  | "reorder"
  | "history";

type ModalStep = "select" | MedicationGovernanceLifecycleAction;

export type MedicationGovernanceManageModalProps = {
  open: boolean;
  onClose: () => void;
  orderItem: {
    id: string;
    medicationLifecycleStatus?: MedicationOrderLifecycleStatus | string | null;
    frequencyCode?: string | null;
    strength?: string | null;
    route?: string | null;
    notes?: string | null;
    quantity?: number | null;
    catalogItemId?: string | null;
    manualLabel?: string | null;
    medicationFulfillmentIntent?: string | null;
  };
  orderId: string;
  orderEvents: unknown[];
  medicationLabel: string;
  facilityId: string;
  encounterSigned: boolean;
  canMutateLifecycle: boolean;
  lifecycleStatus: MedicationOrderLifecycleStatus;
  onUpdated?: () => void;
};

const SHELL_BORDER = "#e2e8f0";
const CANVAS = "#f8fafc";

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M13.5 6.5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function actionSelectorLabelKey(id: MedicationGovernanceLifecycleAction): string {
  switch (id) {
    case "edit":
      return "medicationOrderLifecycle.actions.edit";
    case "hold":
      return "medicationOrderLifecycle.actions.hold";
    case "resume":
      return "medicationOrderLifecycle.actions.resume";
    case "discontinue":
      return "medicationOrderLifecycle.actions.discontinue";
    case "reorder":
      return "medicationOrderLifecycle.actions.discontinueAndReorder";
    case "history":
      return "medicationOrderLifecycle.viewHistory";
  }
}

export function MedicationGovernanceManageButton({
  disabled,
  onClick,
}: {
  disabled?: boolean;
  onClick: () => void;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      data-testid="medication-governance-manage"
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 8,
        border: "1px solid #cbd5e1",
        background: "#fff",
        color: "#0f172a",
        fontSize: 12,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <PencilIcon />
      {t("medicationOrderLifecycle.manage")}
    </button>
  );
}

export function MedicationGovernanceManageModal({
  open,
  onClose,
  orderItem,
  orderId,
  orderEvents,
  medicationLabel,
  facilityId,
  encounterSigned,
  canMutateLifecycle,
  lifecycleStatus,
  onUpdated,
}: MedicationGovernanceManageModalProps) {
  const { t, language } = useI18n();
  const [step, setStep] = useState<ModalStep>("select");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<string>(MEDICATION_ORDER_DISCONTINUE_REASON_VALUES[0]);
  const [note, setNote] = useState("");
  const [effectiveAtLocal, setEffectiveAtLocal] = useState("");
  const [editFrequency, setEditFrequency] = useState(orderItem.frequencyCode ?? "");
  const [editStrength, setEditStrength] = useState(orderItem.strength ?? "");
  const [editRoute, setEditRoute] = useState(orderItem.route ?? "");
  const [editNotes, setEditNotes] = useState(orderItem.notes ?? "");

  const governanceDeferred = isMedicationOrderLifecycleGovernanceDeferred(lifecycleStatus);
  const canHold = lifecycleStatus === "ACTIVE" && canMutateLifecycle && !governanceDeferred;
  const canResume = lifecycleStatus === "ON_HOLD" && canMutateLifecycle && !governanceDeferred;
  const canEditDiscontinue =
    canMutateLifecycle &&
    !governanceDeferred &&
    (lifecycleStatus === "ACTIVE" || lifecycleStatus === "ON_HOLD");

  const reasonOptions = useMemo(
    () =>
      MEDICATION_ORDER_DISCONTINUE_REASON_VALUES.map((value) => ({
        value,
        label: t(`medicationOrderLifecycle.reasons.${value}`),
      })),
    [t]
  );

  const historyRows = useMemo(
    () => filterMedicationOrderLifecycleEventsForItem(orderEvents, orderItem.id, orderId),
    [orderEvents, orderItem.id, orderId]
  );

  if (!open) return null;

  const resetForm = () => {
    setReason(MEDICATION_ORDER_DISCONTINUE_REASON_VALUES[0]);
    setNote("");
    setEffectiveAtLocal("");
    setEditFrequency(orderItem.frequencyCode ?? "");
    setEditStrength(orderItem.strength ?? "");
    setEditRoute(orderItem.route ?? "");
    setEditNotes(orderItem.notes ?? "");
    setError(null);
  };

  const handleClose = () => {
    setStep("select");
    resetForm();
    onClose();
  };

  const goToSelect = () => {
    setStep("select");
    setError(null);
  };

  const submitLabelKey = (action: Exclude<ModalStep, "select">): string => {
    switch (action) {
      case "edit":
        return "medicationOrderLifecycle.submit.saveChanges";
      case "discontinue":
        return "medicationOrderLifecycle.submit.discontinue";
      case "reorder":
        return "medicationOrderLifecycle.submit.discontinueAndReorder";
      case "hold":
        return "medicationOrderLifecycle.submit.hold";
      case "resume":
        return "medicationOrderLifecycle.submit.resume";
      default:
        return "medicationOrderLifecycle.close";
    }
  };

  const isDangerAction = (action: ModalStep) =>
    action === "discontinue" || action === "reorder";

  const runAction = async () => {
    if (step === "select" || step === "history") return;
    if (!reason.trim() && step !== "resume") {
      setError(t("medicationOrderLifecycle.reasonRequired"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const effectiveAt = effectiveAtLocal ? new Date(effectiveAtLocal) : undefined;
      if (step === "discontinue") {
        const dto: MedicationOrderDiscontinueDto = { reason: reason as never, note, effectiveAt };
        await discontinueMedicationOrderItem(orderItem.id, dto, facilityId);
      } else if (step === "hold") {
        await holdMedicationOrderItem(orderItem.id, { reason: reason as never, note }, facilityId);
      } else if (step === "resume") {
        await resumeMedicationOrderItem(orderItem.id, facilityId);
      } else if (step === "edit") {
        const dto: MedicationOrderEditDto = {
          reason: reason as never,
          note,
          effectiveAt,
          frequencyCode: editFrequency || undefined,
          strength: editStrength || undefined,
          route: editRoute || undefined,
          notes: editNotes || undefined,
        };
        await editMedicationOrderItem(orderItem.id, dto, facilityId);
      } else if (step === "reorder") {
        await discontinueAndReorderMedicationOrderItem(
          orderItem.id,
          {
            reason: reason as never,
            note,
            effectiveAt,
            replacement: {
              catalogItemId: orderItem.catalogItemId ?? undefined,
              manualLabel: orderItem.manualLabel ?? undefined,
              quantity: orderItem.quantity ?? undefined,
              strength: editStrength || orderItem.strength || undefined,
              route: editRoute || orderItem.route || undefined,
              frequencyCode: editFrequency || orderItem.frequencyCode || undefined,
              notes: editNotes || orderItem.notes || undefined,
              medicationFulfillmentIntent:
                (orderItem.medicationFulfillmentIntent as "ADMINISTER_CHART" | "PHARMACY_DISPENSE" | undefined) ??
                "ADMINISTER_CHART",
            },
          },
          facilityId
        );
      }
      handleClose();
      onUpdated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("medicationOrderLifecycle.errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  };

  const selectorItems: Array<{ id: MedicationGovernanceLifecycleAction; visible: boolean }> = [
    { id: "edit", visible: canEditDiscontinue },
    { id: "hold", visible: canHold },
    { id: "resume", visible: canResume },
    { id: "discontinue", visible: canEditDiscontinue },
    { id: "reorder", visible: canEditDiscontinue },
    { id: "history", visible: true },
  ];

  const statusLabel = t(medicationOrderLifecycleStatusLabelKey(lifecycleStatus));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="medication-governance-manage-title"
      data-testid="medication-governance-manage-modal"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1300,
        padding: 16,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          width: "min(100%, 520px)",
          maxHeight: "min(88vh, 720px)",
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          borderRadius: 16,
          border: `1px solid ${SHELL_BORDER}`,
          boxShadow: "0 16px 48px rgba(15,23,42,0.18)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "18px 20px 12px", borderBottom: `1px solid ${SHELL_BORDER}` }}>
          <h3 id="medication-governance-manage-title" style={{ margin: 0, fontSize: 17, color: "#0f172a" }}>
            {step === "select"
              ? t("medicationOrderLifecycle.manageModalTitle")
              : t(`medicationOrderLifecycle.modalTitle.${step}`)}
          </h3>
          <p
            data-testid="medication-governance-clinical-header"
            style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}
          >
            {medicationLabel}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
            {t("medicationOrderLifecycle.statusLabel")}: {statusLabel}
          </p>
          {encounterSigned ? (
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b" }}>
              {t("medicationOrderLifecycle.signedEncounterBlocked")}
            </p>
          ) : null}
        </div>

        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1, background: step === "select" ? CANVAS : "#fff" }}>
          {step === "select" ? (
            <div
              data-testid="medication-governance-action-selector"
              style={{ display: "grid", gap: 8 }}
            >
              {selectorItems
                .filter((item) => item.visible)
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`medication-governance-action-${item.id}`}
                    disabled={encounterSigned && item.id !== "history"}
                    onClick={() => {
                      resetForm();
                      setStep(item.id);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: `1px solid ${SHELL_BORDER}`,
                      background: "#fff",
                      fontSize: 14,
                      fontWeight: 600,
                      color: item.id === "discontinue" ? "#b91c1c" : "#0f172a",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span>{t(actionSelectorLabelKey(item.id))}</span>
                    <span aria-hidden="true" style={{ color: "#94a3b8" }}>
                      ›
                    </span>
                  </button>
                ))}
            </div>
          ) : step === "history" ? (
            <div data-testid="medication-governance-history-view">
              {historyRows.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                  {t("medicationOrderLifecycle.historyEmpty")}
                </p>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
                  {historyRows.map((row) => (
                    <li
                      key={row.id}
                      data-testid="medication-lifecycle-history-row"
                      style={{
                        border: `1px solid ${SHELL_BORDER}`,
                        borderRadius: 12,
                        padding: "10px 12px",
                        fontSize: 13,
                        lineHeight: 1.45,
                      }}
                    >
                      <strong>{t(medicationOrderLifecycleEventLabelKey(row.eventType))}</strong>
                      <div style={{ color: "#64748b", marginTop: 4 }}>
                        {t("medicationOrderLifecycle.historyPerformedAt")}:{" "}
                        {formatEncounterChromeDateTime(row.performedAt, language)}
                      </div>
                      {row.performedByDisplayName ? (
                        <div style={{ color: "#64748b" }}>
                          {t("medicationOrderLifecycle.historyPerformedBy")}: {row.performedByDisplayName}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div data-testid={`medication-governance-form-${step}`} style={{ display: "grid", gap: 12 }}>
              <label style={labelStyle}>
                {t("medicationOrderLifecycle.reasonLabel")}
                <select value={reason} onChange={(e) => setReason(e.target.value)} style={inputStyle}>
                  {reasonOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label style={labelStyle}>
                {t("medicationOrderLifecycle.noteLabel")}
                <textarea value={note} onChange={(e) => setNote(e.target.value)} style={inputStyle} rows={2} />
              </label>
              {(step === "discontinue" ||
                step === "edit" ||
                step === "reorder" ||
                step === "hold" ||
                step === "resume") && (
                <label style={labelStyle}>
                  {t("medicationOrderLifecycle.effectiveAtLabel")}
                  <input
                    type="datetime-local"
                    value={effectiveAtLocal}
                    onChange={(e) => setEffectiveAtLocal(e.target.value)}
                    style={inputStyle}
                  />
                </label>
              )}
              {(step === "edit" || step === "reorder") && (
                <>
                  <label style={labelStyle}>
                    {t("medicationOrderLifecycle.fields.frequency")}
                    <input value={editFrequency} onChange={(e) => setEditFrequency(e.target.value)} style={inputStyle} />
                  </label>
                  <label style={labelStyle}>
                    {t("medicationOrderLifecycle.fields.strength")}
                    <input value={editStrength} onChange={(e) => setEditStrength(e.target.value)} style={inputStyle} />
                  </label>
                  <label style={labelStyle}>
                    {t("medicationOrderLifecycle.fields.route")}
                    <input value={editRoute} onChange={(e) => setEditRoute(e.target.value)} style={inputStyle} />
                  </label>
                  <label style={labelStyle}>
                    {step === "reorder"
                      ? t("medicationOrderLifecycle.fields.replacementInstructions")
                      : t("medicationOrderLifecycle.fields.instructions")}
                    <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} style={inputStyle} rows={3} />
                  </label>
                </>
              )}
            </div>
          )}
          {error ? <p style={{ color: "#b91c1c", fontSize: 13, margin: "12px 0 0" }}>{error}</p> : null}
        </div>

        <div
          style={{
            padding: "12px 20px 16px",
            borderTop: `1px solid ${SHELL_BORDER}`,
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            background: "#fff",
          }}
        >
          {step === "select" ? (
            <span />
          ) : (
            <button type="button" onClick={goToSelect} style={secondaryBtnStyle}>
              {t("common.back")}
            </button>
          )}
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <button type="button" onClick={handleClose} style={secondaryBtnStyle}>
              {t("common.cancel")}
            </button>
            {step !== "select" && step !== "history" ? (
              <button
                type="button"
                data-testid="medication-governance-submit"
                disabled={submitting || encounterSigned || !canMutateLifecycle}
                onClick={() => void runAction()}
                style={isDangerAction(step) ? dangerBtnStyle : primaryBtnStyle}
              >
                {submitting ? t("common.loading") : t(submitLabelKey(step))}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 13,
  fontWeight: 600,
  color: "#334155",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 13,
  fontWeight: 400,
  color: "#0f172a",
  boxSizing: "border-box",
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  color: "#334155",
};

const primaryBtnStyle: React.CSSProperties = {
  ...secondaryBtnStyle,
  background: "#0f766e",
  borderColor: "#0f766e",
  color: "#fff",
};

const dangerBtnStyle: React.CSSProperties = {
  ...secondaryBtnStyle,
  background: "#b91c1c",
  borderColor: "#b91c1c",
  color: "#fff",
};
