"use client";

import React, { useEffect, useMemo, useState } from "react";
import { parseLabRadiologyEffectiveClinicalTimeIso } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
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
  datetimeLocalValueToUtcIso,
  labRadModalIsLargeBackdate,
  labRadModalRequiresDetailedReason,
  labRadModalRequiresReason,
} from "@/features/orders/labRadiologyEffectiveTimeDisplay";

function toDatetimeLocalValue(iso: string): string {
  const d = parseLabRadiologyEffectiveClinicalTimeIso(iso);
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const LAB_RAD_EFFECTIVE_TIME_DRAFT_VERSION = "lab-radiology-effective-time-correction-v1";
const UNKNOWN_CLINICAL_DRAFT_USER_ID = "unknown-user";

type LabRadiologyEffectiveTimeDraftPayload = {
  reason: string;
};

function effectiveTimeDraftHasContent(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Partial<LabRadiologyEffectiveTimeDraftPayload>;
  return Boolean(p.reason?.trim());
}

export function LabRadiologyEffectiveTimeModal({
  open,
  encounterId,
  facilityId,
  userId,
  orderItemId,
  departmentKind,
  milestone,
  workflowEditable,
  lineLabel,
  milestoneLabel,
  defaultEffectiveIso,
  documentedAt,
  orderCreatedAt,
  orderItemCreatedAt,
  adjustmentVersion,
  onClose,
  onSave,
  saving,
}: {
  open: boolean;
  encounterId: string;
  facilityId: string;
  userId: string | null | undefined;
  orderItemId: string;
  departmentKind: "lab" | "radiology";
  milestone: "received" | "collected" | "performed" | "resulted" | "finalized";
  workflowEditable: boolean;
  lineLabel: string;
  milestoneLabel: string;
  defaultEffectiveIso: string;
  documentedAt: Date;
  orderCreatedAt: Date;
  orderItemCreatedAt: Date;
  adjustmentVersion: number;
  onClose: () => void;
  onSave: (payload: { effectiveClinicalTime: string; reason?: string }) => Promise<void>;
  saving: boolean;
}) {
  const { t, language } = useI18n();
  const [clinicalLocal, setClinicalLocal] = useState(() => toDatetimeLocalValue(defaultEffectiveIso));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [draftRestoredAt, setDraftRestoredAt] = useState<string | null>(null);
  const [draftSavedLocallyAt, setDraftSavedLocallyAt] = useState<string | null>(null);
  const restoringDraftRef = React.useRef(false);
  const draftScope = useMemo<ClinicalDraftScope>(
    () => ({
      workflowType: departmentKind === "lab" ? "LAB_EFFECTIVE_TIME_CORRECTION" : "RADIOLOGY_EFFECTIVE_TIME_CORRECTION",
      encounterId,
      facilityId,
      userId: userId || UNKNOWN_CLINICAL_DRAFT_USER_ID,
      version: `${LAB_RAD_EFFECTIVE_TIME_DRAFT_VERSION}:${departmentKind}:${milestone}:${adjustmentVersion}:${defaultEffectiveIso}`,
      subjectId: orderItemId,
    }),
    [adjustmentVersion, defaultEffectiveIso, departmentKind, encounterId, facilityId, milestone, orderItemId, userId]
  );
  const draftKey = useMemo(() => buildClinicalDraftKey(draftScope), [draftScope]);

  useEffect(() => {
    if (open) {
      setClinicalLocal(toDatetimeLocalValue(defaultEffectiveIso));
      setReason("");
      setError(null);
      setDraftRestoredAt(null);
      setDraftSavedLocallyAt(null);
    }
  }, [open, defaultEffectiveIso]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const draft = readClinicalDraft<LabRadiologyEffectiveTimeDraftPayload>(window.localStorage, draftKey);
    const canRestore = shouldRestoreClinicalDraft({
      draft,
      scope: draftScope,
      workflowEditable,
      encounterStatus: workflowEditable ? "OPEN" : "CLOSED",
      hasPayloadContent: effectiveTimeDraftHasContent,
    });
    if (canRestore && draft) {
      restoringDraftRef.current = true;
      setReason(draft.payload.reason ?? "");
      setDraftRestoredAt(draft.metadata.savedLocallyAt);
      setDraftSavedLocallyAt(draft.metadata.savedLocallyAt);
      queueMicrotask(() => {
        restoringDraftRef.current = false;
      });
    } else if (draft && !canRestore) {
      removeClinicalDraft(window.localStorage, draftKey);
    }
  }, [draftKey, draftScope, open, workflowEditable]);

  useEffect(() => {
    if (restoringDraftRef.current) return;
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

  const effectiveIso = useMemo(() => datetimeLocalValueToUtcIso(clinicalLocal), [clinicalLocal]);

  const reasonRequired = useMemo(() => {
    if (!effectiveIso) return false;
    return labRadModalRequiresReason({
      effectiveClinicalTimeIso: effectiveIso,
      documentedAt,
      orderCreatedAt,
      orderItemCreatedAt,
      adjustmentVersion,
    });
  }, [effectiveIso, documentedAt, orderCreatedAt, orderItemCreatedAt, adjustmentVersion]);

  const largeBackdate = useMemo(() => {
    if (!effectiveIso) return false;
    return labRadModalIsLargeBackdate({ effectiveClinicalTimeIso: effectiveIso, documentedAt });
  }, [effectiveIso, documentedAt]);

  const reasonTooShort = useMemo(() => {
    if (!effectiveIso) return false;
    return labRadModalRequiresDetailedReason({
      effectiveClinicalTimeIso: effectiveIso,
      documentedAt,
      reason,
    });
  }, [effectiveIso, documentedAt, reason]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const iso = datetimeLocalValueToUtcIso(clinicalLocal);
    if (!iso) {
      setError(t("labRadTime.invalidTime"));
      return;
    }
    if (reasonRequired && !reason.trim()) {
      setError(t("labRadTime.reasonRequired"));
      return;
    }
    if (reasonTooShort) {
      setError(t("labRadTime.reasonTooShortForLargeBackdate"));
      return;
    }
    try {
      await onSave({
        effectiveClinicalTime: iso,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      if (typeof window !== "undefined") removeClinicalDraft(window.localStorage, draftKey);
      setDraftRestoredAt(null);
      setDraftSavedLocallyAt(null);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      setError(
        raw.trim()
          ? normalizeUserFacingError(raw, language) ?? raw.trim()
          : t("labRadTime.saveFailed")
      );
    }
  };

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1200,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        role="dialog"
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
        <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>{milestoneLabel}</h2>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b" }}>
          <strong>{lineLabel}</strong>
        </p>
        <p style={{ margin: "0 0 14px", fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
          {t("labRadTime.warning")}
        </p>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
          {t("labRadTime.effectiveLabel")}
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
            {t("labRadTime.largeBackdateSupervisoryWarning")}
          </p>
        ) : null}
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
          {t("labRadTime.reasonLabel")}
          {reasonRequired ? " *" : null}
        </label>
        {draftRestoredAt ? (
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "#0369a1", fontWeight: 600 }}>
            {t("orderDetail.localDraftRestored")}
          </p>
        ) : null}
        {draftSavedLocallyAt ? (
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>
            {t("orderDetail.localDraftSaved")}
          </p>
        ) : null}
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder={t("labRadTime.reasonPlaceholder")}
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
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onClose} disabled={saving} style={{ padding: "8px 14px" }}>
            {t("labRadTime.cancel")}
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "none",
              background: "#0f172a",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            {saving ? t("common.saving") : t("labRadTime.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
