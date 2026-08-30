"use client";

/**
 * D3C — Admission & Observation Decision Board (feature-flagged).
 * Does not create placement rows from the client identity; API derives facility/patient.
 * Behind INTERNAL_PLACEMENT_WORKFLOW — when OFF, returns null (legacy admission shell remains).
 */

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useI18n } from "@/lib/i18n";
import { internalPlacementWorkflowEnabled } from "@medora/shared";
import {
  createInternalPlacementDraft,
  fetchActiveInternalPlacement,
  signInternalPlacement,
  submitInternalPlacement,
  updateInternalPlacementDraft,
  type InternalPlacementProjectionDto,
  type PlacementDraftPayload,
} from "./internalPlacementApi";

export type AdmissionObservationDecisionBoardProps = {
  encounterId: string;
  /** Controlled from the parent ED disposition outcome (OBSERVATION vs ADMISSION). */
  requestedEncounterType: "OBSERVATION" | "INPATIENT";
  disabled?: boolean;
  onPlacementChange?: (placement: InternalPlacementProjectionDto | null) => void;
};

export function isInternalPlacementWorkflowUiEnabled(): boolean {
  return internalPlacementWorkflowEnabled({
    INTERNAL_PLACEMENT_WORKFLOW_ENABLED: process.env.NEXT_PUBLIC_INTERNAL_PLACEMENT_WORKFLOW_ENABLED,
    NEXT_PUBLIC_INTERNAL_PLACEMENT_WORKFLOW_ENABLED:
      process.env.NEXT_PUBLIC_INTERNAL_PLACEMENT_WORKFLOW_ENABLED,
  });
}

const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 13,
  boxSizing: "border-box",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#334155",
  marginBottom: 4,
};

export function AdmissionObservationDecisionBoard({
  encounterId,
  requestedEncounterType,
  disabled,
  onPlacementChange,
}: AdmissionObservationDecisionBoardProps) {
  const { t } = useI18n();
  const [placement, setPlacement] = useState<InternalPlacementProjectionDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [admissionDiagnosisSummary, setAdmissionDiagnosisSummary] = useState("");
  const [requestedService, setRequestedService] = useState("");
  const [requestedLevelOfCare, setRequestedLevelOfCare] = useState("");
  const [reasonForPlacement, setReasonForPlacement] = useState("");
  const [clinicalPriority, setClinicalPriority] = useState("ROUTINE");
  const [telemetryRequired, setTelemetryRequired] = useState(false);
  const [isolationRequired, setIsolationRequired] = useState(false);
  const [acceptingProviderNameSnapshot, setAcceptingProviderNameSnapshot] = useState("");

  const applyPlacement = useCallback(
    (next: InternalPlacementProjectionDto | null) => {
      setPlacement(next);
      onPlacementChange?.(next);
      if (!next) return;
      setRequestedLevelOfCare(next.requestedLevelOfCare ?? "");
      setRequestedService(next.requestedService ?? "");
      setClinicalPriority(next.clinicalPriority ?? "ROUTINE");
      setAdmissionDiagnosisSummary(next.admissionDiagnosisSummary ?? "");
      setReasonForPlacement(next.reasonForPlacement ?? "");
      setTelemetryRequired(next.telemetryRequired === true);
      setIsolationRequired(next.isolationRequired === true);
      setAcceptingProviderNameSnapshot(next.acceptingProviderNameSnapshot ?? "");
    },
    [onPlacementChange]
  );

  useEffect(() => {
    if (!isInternalPlacementWorkflowUiEnabled() || !encounterId) return;
    let cancelled = false;
    void (async () => {
      try {
        const row = await fetchActiveInternalPlacement(encounterId);
        if (!cancelled) applyPlacement(row);
      } catch {
        if (!cancelled) applyPlacement(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encounterId, applyPlacement]);

  if (!isInternalPlacementWorkflowUiEnabled()) {
    return null;
  }

  const formLocked =
    disabled ||
    busy ||
    (placement != null &&
      placement.status !== "DRAFT" &&
      placement.status !== "SIGNED");

  function buildPayload(): PlacementDraftPayload {
    return {
      requestedEncounterType,
      requestedLevelOfCare: requestedLevelOfCare.trim() || null,
      requestedService: requestedService.trim() || null,
      clinicalPriority: clinicalPriority.trim() || null,
      admissionDiagnosisSummary: admissionDiagnosisSummary.trim() || null,
      reasonForPlacement: reasonForPlacement.trim() || null,
      telemetryRequired,
      isolationRequired,
      acceptingProviderNameSnapshot: acceptingProviderNameSnapshot.trim() || null,
      expectedVersion: placement?.version,
    };
  }

  async function runAction(action: "draft" | "sign" | "submit") {
    setError(null);
    setBusy(true);
    try {
      const payload = buildPayload();
      let next: InternalPlacementProjectionDto;
      if (!placement) {
        next = await createInternalPlacementDraft(encounterId, payload);
        if (action === "sign") {
          next = await signInternalPlacement(next.id, next.version);
        } else if (action === "submit") {
          next = await submitInternalPlacement(next.id, next.version);
        }
      } else if (action === "draft") {
        next = await updateInternalPlacementDraft(placement.id, payload);
      } else if (action === "sign") {
        next = await updateInternalPlacementDraft(placement.id, payload);
        next = await signInternalPlacement(next.id, next.version);
      } else {
        next = await updateInternalPlacementDraft(placement.id, payload);
        next = await submitInternalPlacement(next.id, next.version);
      }
      applyPlacement(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("internalPlacementD3c.saveError"));
    } finally {
      setBusy(false);
    }
  }

  const statusLabel = placement?.trackboardLabel
    ? t(
        `internalPlacementD3c.status.${placement.trackboardLabel}` as Parameters<
          typeof t
        >[0]
      )
    : t("internalPlacementD3c.statusNone");

  return (
    <section
      data-testid="admission-observation-decision-board"
      data-requested-encounter-type={requestedEncounterType}
      aria-labelledby="d3c-admission-obs-title"
      style={{
        marginTop: 12,
        padding: "12px 14px",
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
        minWidth: 0,
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      <h3
        id="d3c-admission-obs-title"
        style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}
      >
        {requestedEncounterType === "OBSERVATION"
          ? t("emergencyDisposition.boardTitle.OBSERVATION")
          : t("emergencyDisposition.boardTitle.ADMISSION")}
      </h3>

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 10,
          minWidth: 0,
        }}
      >
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>{t("internalPlacementD3c.fields.diagnosis")}</label>
          <textarea
            value={admissionDiagnosisSummary}
            disabled={formLocked}
            onChange={(e) => setAdmissionDiagnosisSummary(e.target.value)}
            rows={2}
            style={fieldStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>{t("internalPlacementD3c.fields.service")}</label>
          <input
            value={requestedService}
            disabled={formLocked}
            onChange={(e) => setRequestedService(e.target.value)}
            style={fieldStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>{t("internalPlacementD3c.fields.levelOfCare")}</label>
          <input
            value={requestedLevelOfCare}
            disabled={formLocked}
            onChange={(e) => setRequestedLevelOfCare(e.target.value)}
            style={fieldStyle}
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>{t("internalPlacementD3c.fields.clinicalReason")}</label>
          <textarea
            value={reasonForPlacement}
            disabled={formLocked}
            onChange={(e) => setReasonForPlacement(e.target.value)}
            rows={2}
            style={fieldStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>{t("internalPlacementD3c.fields.priority")}</label>
          <select
            value={clinicalPriority}
            disabled={formLocked}
            onChange={(e) => setClinicalPriority(e.target.value)}
            style={fieldStyle}
          >
            <option value="ROUTINE">{t("internalPlacementD3c.priority.routine")}</option>
            <option value="URGENT">{t("internalPlacementD3c.priority.urgent")}</option>
            <option value="STAT">{t("internalPlacementD3c.priority.stat")}</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>{t("internalPlacementD3c.fields.acceptingProvider")}</label>
          <input
            value={acceptingProviderNameSnapshot}
            disabled={formLocked}
            onChange={(e) => setAcceptingProviderNameSnapshot(e.target.value)}
            style={fieldStyle}
          />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={telemetryRequired}
            disabled={formLocked}
            onChange={(e) => setTelemetryRequired(e.target.checked)}
          />
          {t("internalPlacementD3c.fields.telemetry")}
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={isolationRequired}
            disabled={formLocked}
            onChange={(e) => setIsolationRequired(e.target.checked)}
          />
          {t("internalPlacementD3c.fields.isolation")}
        </label>
      </div>

      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button
          type="button"
          disabled={formLocked}
          onClick={() => void runAction("draft")}
          style={actionBtnStyle}
        >
          {t("internalPlacementD3c.actions.saveDraft")}
        </button>
        <button
          type="button"
          disabled={formLocked}
          onClick={() => void runAction("sign")}
          style={actionBtnStyle}
        >
          {t("internalPlacementD3c.actions.sign")}
        </button>
        <button
          type="button"
          disabled={formLocked}
          onClick={() => void runAction("submit")}
          style={{ ...actionBtnStyle, background: "#0f766e", color: "#fff", borderColor: "#0f766e" }}
        >
          {t("internalPlacementD3c.actions.request")}
        </button>
      </div>

      {error ? (
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "#b91c1c" }} role="alert">
          {error}
        </p>
      ) : null}

      <div style={{ marginTop: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
          {t("emergencyDisposition.placementStatusLabel")}
        </span>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#0f172a" }}>{statusLabel}</p>
      </div>
    </section>
  );
}

const actionBtnStyle: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
