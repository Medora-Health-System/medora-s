"use client";

import React, { useMemo, useState } from "react";
import {
  MEDICATION_ORDER_DISCONTINUE_REASON_VALUES,
  isMedicationOrderLifecycleGovernanceDeferred,
  type MedicationOrderDiscontinueDto,
  type MedicationOrderEditDto,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import {
  discontinueAndReorderMedicationOrderItem,
  discontinueMedicationOrderItem,
  editMedicationOrderItem,
  holdMedicationOrderItem,
  medicationOrderLifecycleStatusLabelKey,
  resumeMedicationOrderItem,
} from "@/lib/medicationOrderLifecycleApi";

type LifecycleAction = "discontinue" | "hold" | "resume" | "edit" | "reorder";

export type MedicationOrderLifecyclePanelProps = {
  orderItem: {
    id: string;
    medicationLifecycleStatus?: string | null;
    frequencyCode?: string | null;
    strength?: string | null;
    route?: string | null;
    notes?: string | null;
    quantity?: number | null;
    catalogItemId?: string | null;
    manualLabel?: string | null;
    medicationFulfillmentIntent?: string | null;
  };
  facilityId: string;
  encounterSigned: boolean;
  canPrescribe: boolean;
  onUpdated?: () => void;
};

export function MedicationOrderLifecyclePanel({
  orderItem,
  facilityId,
  encounterSigned,
  canPrescribe,
  onUpdated,
}: MedicationOrderLifecyclePanelProps) {
  const { t } = useI18n();
  const [openAction, setOpenAction] = useState<LifecycleAction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<string>(MEDICATION_ORDER_DISCONTINUE_REASON_VALUES[0]);
  const [note, setNote] = useState("");
  const [effectiveAtLocal, setEffectiveAtLocal] = useState("");
  const [editFrequency, setEditFrequency] = useState(orderItem.frequencyCode ?? "");
  const [editStrength, setEditStrength] = useState(orderItem.strength ?? "");
  const [editRoute, setEditRoute] = useState(orderItem.route ?? "");
  const [editNotes, setEditNotes] = useState(orderItem.notes ?? "");

  const lifecycleStatus = (orderItem.medicationLifecycleStatus ?? "ACTIVE").toUpperCase();
  const disabled = encounterSigned || !canPrescribe;
  const governanceDeferred = isMedicationOrderLifecycleGovernanceDeferred(
    lifecycleStatus as Parameters<typeof isMedicationOrderLifecycleGovernanceDeferred>[0]
  );
  const canHold = lifecycleStatus === "ACTIVE";
  const canResume = lifecycleStatus === "ON_HOLD";
  const canMutate =
    !governanceDeferred && (lifecycleStatus === "ACTIVE" || lifecycleStatus === "ON_HOLD");

  const statusLabel = t(medicationOrderLifecycleStatusLabelKey(lifecycleStatus));

  const reasonOptions = useMemo(
    () =>
      MEDICATION_ORDER_DISCONTINUE_REASON_VALUES.map((value) => ({
        value,
        label: t(`medicationOrderLifecycle.reasons.${value}`),
      })),
    [t]
  );

  const closeModal = () => {
    setOpenAction(null);
    setError(null);
  };

  const runAction = async () => {
    if (!openAction) return;
    setSubmitting(true);
    setError(null);
    try {
      const effectiveAt = effectiveAtLocal ? new Date(effectiveAtLocal) : undefined;
      if (openAction === "discontinue") {
        const dto: MedicationOrderDiscontinueDto = { reason: reason as never, note, effectiveAt };
        await discontinueMedicationOrderItem(orderItem.id, dto, facilityId);
      } else if (openAction === "hold") {
        await holdMedicationOrderItem(orderItem.id, { reason: reason as never, note }, facilityId);
      } else if (openAction === "resume") {
        await resumeMedicationOrderItem(orderItem.id, facilityId);
      } else if (openAction === "edit") {
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
      } else if (openAction === "reorder") {
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
      closeModal();
      onUpdated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("medicationOrderLifecycle.errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>
        {t("medicationOrderLifecycle.statusLabel")}: <strong>{statusLabel}</strong>
      </div>
      {governanceDeferred ? (
        <p style={{ margin: "0 0 6px 0", fontSize: 11, color: "#92400e" }}>
          {t("medicationOrderLifecycle.summary.governanceDeferred")}
        </p>
      ) : null}
      {encounterSigned ? (
        <p style={{ margin: "0 0 6px 0", fontSize: 11, color: "#64748b" }}>
          {t("medicationOrderLifecycle.signedEncounterBlocked")}
        </p>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {canMutate ? (
          <>
            <button type="button" disabled={disabled} onClick={() => setOpenAction("edit")} style={btnStyle}>
              {t("medicationOrderLifecycle.actions.edit")}
            </button>
            <button type="button" disabled={disabled} onClick={() => setOpenAction("discontinue")} style={btnStyle}>
              {t("medicationOrderLifecycle.actions.discontinue")}
            </button>
            <button type="button" disabled={disabled} onClick={() => setOpenAction("reorder")} style={btnStyle}>
              {t("medicationOrderLifecycle.actions.discontinueAndReorder")}
            </button>
          </>
        ) : null}
        {canHold ? (
          <button type="button" disabled={disabled} onClick={() => setOpenAction("hold")} style={btnStyle}>
            {t("medicationOrderLifecycle.actions.hold")}
          </button>
        ) : null}
        {canResume ? (
          <button type="button" disabled={disabled} onClick={() => setOpenAction("resume")} style={btnStyle}>
            {t("medicationOrderLifecycle.actions.resume")}
          </button>
        ) : null}
      </div>

      {openAction ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1200,
            padding: 16,
          }}
        >
          <div
            style={{
              width: "min(100%, 480px)",
              background: "#fff",
              borderRadius: 12,
              padding: 20,
              boxShadow: "0 12px 40px rgba(15,23,42,0.25)",
            }}
          >
            <h3 style={{ margin: "0 0 12px" }}>
              {t(`medicationOrderLifecycle.modalTitle.${openAction}`)}
            </h3>
            {openAction !== "resume" ? (
              <>
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
                {(openAction === "discontinue" || openAction === "edit" || openAction === "reorder") && (
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
                {(openAction === "edit" || openAction === "reorder") && (
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
                      {t("medicationOrderLifecycle.fields.instructions")}
                      <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} style={inputStyle} rows={3} />
                    </label>
                  </>
                )}
              </>
            ) : (
              <p style={{ margin: "0 0 12px", fontSize: 14, color: "#475569" }}>
                {t("medicationOrderLifecycle.resumeConfirm")}
              </p>
            )}
            {error ? <p style={{ color: "#b91c1c", fontSize: 13 }}>{error}</p> : null}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button type="button" onClick={closeModal} style={btnStyle}>
                {t("common.cancel")}
              </button>
              <button type="button" disabled={submitting} onClick={() => void runAction()} style={primaryBtnStyle}>
                {submitting ? t("common.loading") : t("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "4px 10px",
  fontSize: 12,
  borderRadius: 6,
  border: "1px solid #cbd5e1",
  background: "#fff",
  cursor: "pointer",
};

const primaryBtnStyle: React.CSSProperties = {
  ...btnStyle,
  background: "#0f766e",
  color: "#fff",
  borderColor: "#0f766e",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  marginBottom: 10,
};

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 4,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  fontSize: 13,
};
