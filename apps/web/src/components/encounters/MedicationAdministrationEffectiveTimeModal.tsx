"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  MEDICATION_ADMINISTRATION_CORRECTION_REASON_CODES,
  datetimeLocalToUtcIsoInFacilityTimeZone,
  utcIsoToDatetimeLocalValueInFacilityTimeZone,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { resolveMarEffectiveTimeErrorMessage } from "@/features/mar/marEffectiveTimeErrorMessage";
import {
  buildClinicalDraftKey,
  createClinicalDraft,
  readClinicalDraft,
  removeClinicalDraft,
  shouldRestoreClinicalDraft,
  writeClinicalDraft,
  type ClinicalDraftScope,
} from "@/lib/clinicalDraftStorage";
import { useClinicalBeforeUnloadWarning } from "@/lib/useClinicalBeforeUnloadWarning";
import {
  medicationAdminTimeModalIsLargeBackdate,
} from "@/features/mar/medicationAdministrationEffectiveTimeDisplay";

const MAR_EFFECTIVE_TIME_DRAFT_VERSION = "mar-effective-time-correction-v1";
const UNKNOWN_CLINICAL_DRAFT_USER_ID = "unknown-user";

type MarEffectiveTimeDraftPayload = {
  reason: string;
};

function effectiveTimeDraftHasContent(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Partial<MarEffectiveTimeDraftPayload>;
  return Boolean(p.reason?.trim());
}

export function MedicationAdministrationEffectiveTimeModal({
  open,
  encounterId,
  facilityId,
  medicationAdministrationId,
  workflowEditable,
  medicationLabel,
  defaultEffectiveIso,
  originalAdministeredAt,
  systemDocumentedAt,
  orderCreatedAt,
  orderItemCreatedAt,
  orderCancelledAt,
  adjustmentVersion,
  controlledMedication,
  facilityTimeZone,
  t,
  onClose,
  onSave,
  saving,
}: {
  open: boolean;
  encounterId: string;
  facilityId: string;
  medicationAdministrationId: string;
  workflowEditable: boolean;
  medicationLabel: string;
  defaultEffectiveIso: string;
  originalAdministeredAt: Date;
  systemDocumentedAt: Date;
  orderCreatedAt: Date;
  orderItemCreatedAt: Date | null;
  orderCancelledAt: Date | null;
  adjustmentVersion: number;
  controlledMedication: boolean;
  facilityTimeZone?: string | null;
  t: (key: string) => string;
  onClose: () => void;
  onSave: (payload: {
    effectiveAdministeredTime: string;
    correctionReasonCode?: string;
    reason?: string;
  }) => Promise<void>;
  saving: boolean;
}) {
  const { language } = useI18n();
  const resolvedFacilityTz = facilityTimeZone ?? null;
  const [clinicalLocal, setClinicalLocal] = useState(() =>
    utcIsoToDatetimeLocalValueInFacilityTimeZone({
      iso: defaultEffectiveIso,
      facilityTimezone: resolvedFacilityTz,
    })
  );
  const [reason, setReason] = useState("");
  const [correctionReasonCode, setCorrectionReasonCode] = useState("DOCUMENTED_WRONG_TIME");
  const [error, setError] = useState<string | null>(null);
  const [draftRestoredAt, setDraftRestoredAt] = useState<string | null>(null);
  const [draftSavedLocallyAt, setDraftSavedLocallyAt] = useState<string | null>(null);

  const draftScope = useMemo<ClinicalDraftScope>(
    () => ({
      workflowType: "MAR_EFFECTIVE_TIME_CORRECTION",
      encounterId,
      facilityId,
      userId: UNKNOWN_CLINICAL_DRAFT_USER_ID,
      version: `${MAR_EFFECTIVE_TIME_DRAFT_VERSION}:${adjustmentVersion}:${defaultEffectiveIso}`,
      subjectId: medicationAdministrationId,
    }),
    [adjustmentVersion, defaultEffectiveIso, encounterId, facilityId, medicationAdministrationId]
  );
  const draftKey = useMemo(() => buildClinicalDraftKey(draftScope), [draftScope]);

  useEffect(() => {
    if (open) {
      setClinicalLocal(
        utcIsoToDatetimeLocalValueInFacilityTimeZone({
          iso: defaultEffectiveIso,
          facilityTimezone: resolvedFacilityTz,
        })
      );
      setReason("");
      setCorrectionReasonCode("DOCUMENTED_WRONG_TIME");
      setError(null);
      setDraftRestoredAt(null);
      setDraftSavedLocallyAt(null);
    }
  }, [open, defaultEffectiveIso, resolvedFacilityTz]);

  const toFacilityUtcIso = (local: string) =>
    datetimeLocalToUtcIsoInFacilityTimeZone({
      localValue: local,
      facilityTimezone: resolvedFacilityTz,
    });

  const effectiveIso = useMemo(() => toFacilityUtcIso(clinicalLocal), [clinicalLocal, resolvedFacilityTz]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const draft = readClinicalDraft<MarEffectiveTimeDraftPayload>(window.localStorage, draftKey);
    const canRestore = shouldRestoreClinicalDraft({
      draft,
      scope: draftScope,
      workflowEditable,
      encounterStatus: workflowEditable ? "OPEN" : "CLOSED",
      hasPayloadContent: effectiveTimeDraftHasContent,
    });
    if (canRestore && draft) {
      setReason(draft.payload.reason ?? "");
      setDraftRestoredAt(draft.metadata.savedLocallyAt);
      setDraftSavedLocallyAt(draft.metadata.savedLocallyAt);
    } else if (draft && !canRestore) {
      removeClinicalDraft(window.localStorage, draftKey);
    }
  }, [draftKey, draftScope, open, workflowEditable]);

  useEffect(() => {
    if (!open || !workflowEditable) return;
    if (!reason.trim()) {
      if (typeof window !== "undefined") removeClinicalDraft(window.localStorage, draftKey);
      setDraftSavedLocallyAt(null);
      return;
    }
    if (typeof window === "undefined") return;
    const savedLocallyAt = new Date().toISOString();
    writeClinicalDraft(
      window.localStorage,
      draftKey,
      createClinicalDraft({
        scope: draftScope,
        payload: { reason },
        savedLocallyAt,
      })
    );
    setDraftSavedLocallyAt(savedLocallyAt);
  }, [draftKey, draftScope, open, reason, workflowEditable]);

  useClinicalBeforeUnloadWarning({
    dirty: Boolean(open && workflowEditable && reason.trim() && draftSavedLocallyAt),
    workflowEditable,
  });

  const reasonRequired = false;

  const largeBackdate = useMemo(() => {
    if (!effectiveIso) return false;
    return medicationAdminTimeModalIsLargeBackdate({
      effectiveAdministeredTimeIso: effectiveIso,
      systemDocumentedAt,
    });
  }, [effectiveIso, systemDocumentedAt]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const iso = toFacilityUtcIso(clinicalLocal);
    if (!iso) {
      setError(t("marTab.adminTime.invalidTime"));
      return;
    }
    try {
      await onSave({
        effectiveAdministeredTime: iso,
        correctionReasonCode,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      if (typeof window !== "undefined") removeClinicalDraft(window.localStorage, draftKey);
      setDraftRestoredAt(null);
      setDraftSavedLocallyAt(null);
    } catch (err) {
      const fromCode = resolveMarEffectiveTimeErrorMessage(err, language, t);
      if (fromCode) {
        setError(fromCode);
        return;
      }
      const raw = err instanceof Error ? err.message : "";
      const fromServer = raw.trim()
        ? normalizeUserFacingError(raw, language) ?? raw.trim()
        : null;
      setError(fromServer ?? t("marTab.adminTime.saveFailed"));
    }
  };

  return (
    <MarAdminTimeModalOverlay onClose={onClose}>
      <form
        onSubmit={(e) => void handleSubmit(e)}
        role="dialog"
        aria-labelledby="mar-admin-time-title"
        style={{
          width: "min(420px, 100%)",
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          padding: "18px 20px",
          boxShadow: "0 12px 40px rgba(15, 23, 42, 0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="mar-admin-time-title" style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
          {t("marTab.adminTime.modalTitle")}
        </h2>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
          <strong>{medicationLabel}</strong>
        </p>
        <p style={{ margin: "0 0 14px", fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
          {t("marTab.adminTime.warning")}
        </p>
        {controlledMedication ? (
          <p style={{ margin: "0 0 12px", fontSize: 12, color: "#b45309", fontWeight: 600, lineHeight: 1.45 }}>
            {t("marTab.adminTime.controlledWarning")}
          </p>
        ) : null}
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
          {t("marTab.adminTime.effectiveLabel")}
        </label>
        <input
          type="datetime-local"
          value={clinicalLocal}
          onChange={(e) => setClinicalLocal(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            fontSize: 14,
            marginBottom: largeBackdate ? 6 : 12,
            boxSizing: "border-box",
          }}
        />
        {largeBackdate ? (
          <p style={{ margin: "0 0 12px", fontSize: 12, color: "#b45309", lineHeight: 1.45 }}>
            {t("marTab.adminTime.largeBackdateReasonHelp")}
          </p>
        ) : null}
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
          {t("marAdministrationCorrection.fieldLabel")}
        </label>
        <select
          value={correctionReasonCode}
          onChange={(e) => setCorrectionReasonCode(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            fontSize: 14,
            marginBottom: 12,
            boxSizing: "border-box",
          }}
        >
          {MEDICATION_ADMINISTRATION_CORRECTION_REASON_CODES.map((code) => (
            <option key={code} value={code}>
              {t(`marAdministrationCorrection.reason.${code}`)}
            </option>
          ))}
        </select>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
          {t("marAdministrationCorrection.detailLabel")}
          {reasonRequired ? " *" : null}
        </label>
        {draftRestoredAt ? (
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "#0369a1", fontWeight: 600 }}>
            {t("marTab.localDraftRestored")}
          </p>
        ) : null}
        {draftSavedLocallyAt ? (
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>
            {t("marTab.localDraftSaved")}
          </p>
        ) : null}
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder={t("marTab.adminTime.reasonPlaceholder")}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            fontSize: 13,
            resize: "vertical",
            marginBottom: 12,
            boxSizing: "border-box",
          }}
        />
        {error ? (
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "#b45309" }} role="alert">
            {error}
          </p>
        ) : null}
        <MarAdminTimeModalActions t={t} onClose={onClose} saving={saving} />
      </form>
    </MarAdminTimeModalOverlay>
  );
}

function MarAdminTimeModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      {children}
    </div>
  );
}

function MarAdminTimeModalActions({
  t,
  onClose,
  saving,
}: {
  t: (key: string) => string;
  onClose: () => void;
  saving: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
      <button
        type="button"
        onClick={onClose}
        disabled={saving}
        style={{
          padding: "8px 14px",
          fontSize: 13,
          borderRadius: 10,
          border: "1px solid #cbd5e1",
          background: "#fff",
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {t("marTab.adminTime.cancel")}
      </button>
      <button
        type="submit"
        disabled={saving}
        style={{
          padding: "8px 14px",
          fontSize: 13,
          borderRadius: 10,
          border: "none",
          background: "#0f172a",
          color: "#fff",
          fontWeight: 600,
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? t("common.saving") : t("marTab.adminTime.save")}
      </button>
    </div>
  );
}
