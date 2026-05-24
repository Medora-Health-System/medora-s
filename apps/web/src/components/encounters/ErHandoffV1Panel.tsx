"use client";

/**
 * ER admission nursing handoff (erHandoffV1) — shared UI for Nursing Assessment and related flows.
 * Persists via PATCH /encounters/:id { nursingAssessment: merged } (unchanged contract).
 */

import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useI18n } from "@/lib/i18n";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import {
  erHandoffV1HasPersistedBlob,
  mergeErHandoffV1IntoNursingAssessment,
  readErHandoffV1FromNursingAssessment,
  type ErHandoffV1Stored,
} from "@medora/shared";
import { ClinicalUserRoleAutocomplete } from "@/components/clinical/ClinicalUserRoleAutocomplete";

const ED_HANDOFF_ENCOUNTER_TYPES = new Set(["EMERGENCY", "URGENT_CARE"]);

/** Nursing handoff (erHandoffV1) block: all ED-type encounters, not only when admission packet exists. */
export function shouldShowErHandoffV1InNursing(encounter: {
  type?: string | null;
  status?: string | null;
  admissionSummaryJson?: unknown;
  nursingAssessment?: unknown;
}): boolean {
  return ED_HANDOFF_ENCOUNTER_TYPES.has((encounter.type ?? "").trim());
}

/** Operational panel (read-only): show handoff subsection when any persisted handoff info exists. */
export function erHandoffV1ShouldShowReadonlyOperationalBlock(nursingAssessment: unknown): boolean {
  if (erHandoffV1HasPersistedBlob(nursingAssessment)) return true;
  const r = readErHandoffV1FromNursingAssessment(nursingAssessment);
  if (r.receivingNurseName?.trim()) return true;
  if (r.reportGiven === true || r.reportGiven === false) return true;
  if (r.reportGivenAt?.trim()) return true;
  if (r.handoffNote?.trim()) return true;
  if (r.readyForInpatientTransfer === true || r.readyForInpatientTransfer === false) return true;
  if (r.handoffLastSavedByDisplayName?.trim() && r.handoffLastSavedAt?.trim()) return true;
  return false;
}

function isoToDatetimeLocalValue(iso: string | undefined): string {
  if (!iso?.trim()) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function datetimeLocalToIso(local: string): string | undefined {
  if (!local.trim()) return undefined;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function defaultHandoffForm(read: ErHandoffV1Stored): ErHandoffV1Stored {
  return {
    reportGiven: read.reportGiven ?? false,
    reportGivenAt: read.reportGivenAt,
    receivingNurseName: read.receivingNurseName ?? "",
    receivingNurseUserId: read.receivingNurseUserId,
    handoffNote: read.handoffNote ?? "",
    readyForInpatientTransfer: read.readyForInpatientTransfer ?? false,
    providerDispositionCompleted: read.providerDispositionCompleted ?? false,
    nurseDocumentationCompleted: read.nurseDocumentationCompleted ?? false,
    acceptingPhysicianSelected: read.acceptingPhysicianSelected ?? false,
    reportGivenToReceivingUnit: read.reportGivenToReceivingUnit ?? false,
  };
}

export function ErHandoffV1ReadonlySummary({ nursingAssessment }: { nursingAssessment: unknown }) {
  const { t } = useI18n();
  const readHandoff = useMemo(() => readErHandoffV1FromNursingAssessment(nursingAssessment), [nursingAssessment]);

  const handoffLastSavedCaption = useMemo(() => {
    if (!readHandoff.handoffLastSavedByDisplayName?.trim() || !readHandoff.handoffLastSavedAt?.trim()) return null;
    try {
      const d = new Date(readHandoff.handoffLastSavedAt);
      const when = Number.isNaN(d.getTime()) ? readHandoff.handoffLastSavedAt.trim() : d.toLocaleString();
      return t("encounterOperational.handoffLastSavedLine")
        .replace("{name}", readHandoff.handoffLastSavedByDisplayName.trim())
        .replace("{when}", when);
    } catch {
      return null;
    }
  }, [readHandoff.handoffLastSavedAt, readHandoff.handoffLastSavedByDisplayName, t]);

  const handoffReadonlyLines = useMemo(() => {
    const lines: string[] = [];
    if (readHandoff.receivingNurseName) {
      lines.push(`${t("encounterOperational.receivingNurseLabel")}: ${readHandoff.receivingNurseName}`);
    }
    if (readHandoff.reportGiven === true || readHandoff.reportGiven === false) {
      lines.push(
        `${t("encounterOperational.reportGivenLabel")}: ${readHandoff.reportGiven ? t("common.yes") : t("common.no")}`
      );
    }
    if (readHandoff.reportGivenAt) {
      try {
        const d = new Date(readHandoff.reportGivenAt);
        if (!Number.isNaN(d.getTime())) {
          lines.push(`${t("encounterOperational.reportGivenAtLabel")}: ${d.toLocaleString()}`);
        }
      } catch {
        /* ignore */
      }
    }
    if (readHandoff.handoffNote) {
      lines.push(`${t("encounterOperational.handoffNoteLabel")}: ${readHandoff.handoffNote}`);
    }
    if (handoffLastSavedCaption) {
      lines.push(handoffLastSavedCaption);
    }
    if (readHandoff.readyForInpatientTransfer === true || readHandoff.readyForInpatientTransfer === false) {
      lines.push(
        `${t("encounterOperational.readyForTransferLabel")}: ${
          readHandoff.readyForInpatientTransfer ? t("common.yes") : t("common.no")
        }`
      );
    }
    return lines;
  }, [handoffLastSavedCaption, readHandoff, t]);

  if (!handoffReadonlyLines.length) {
    return <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("encounterOperational.handoffEmptyReadonly")}</p>;
  }

  return (
    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#475569", lineHeight: 1.45 }}>
      {handoffReadonlyLines.map((ln, i) => (
        <li key={i} style={{ marginBottom: 4 }}>
          {ln}
        </li>
      ))}
    </ul>
  );
}

export function ErHandoffV1Editor({
  encounterId,
  facilityId,
  nursingAssessment,
  onUpdated,
  onSaved,
  readOnly = false,
}: {
  encounterId: string;
  facilityId: string;
  nursingAssessment: unknown;
  onUpdated: () => void | Promise<void>;
  onSaved?: (patch: Record<string, unknown>) => void;
  /** Locked / closed / view-only: same fields, no save. */
  readOnly?: boolean;
}) {
  const { t, language } = useI18n();
  const [handoffSaving, setHandoffSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handoffForm, setHandoffForm] = useState<ErHandoffV1Stored>(() =>
    defaultHandoffForm(readErHandoffV1FromNursingAssessment(undefined))
  );

  useEffect(() => {
    setHandoffForm(defaultHandoffForm(readErHandoffV1FromNursingAssessment(nursingAssessment)));
  }, [nursingAssessment]);

  const readHandoff = useMemo(() => readErHandoffV1FromNursingAssessment(nursingAssessment), [nursingAssessment]);

  const handoffLastSavedCaption = useMemo(() => {
    if (!readHandoff.handoffLastSavedByDisplayName?.trim() || !readHandoff.handoffLastSavedAt?.trim()) return null;
    try {
      const d = new Date(readHandoff.handoffLastSavedAt);
      const when = Number.isNaN(d.getTime()) ? readHandoff.handoffLastSavedAt.trim() : d.toLocaleString();
      return t("encounterOperational.handoffLastSavedLine")
        .replace("{name}", readHandoff.handoffLastSavedByDisplayName.trim())
        .replace("{when}", when);
    } catch {
      return null;
    }
  }, [readHandoff.handoffLastSavedAt, readHandoff.handoffLastSavedByDisplayName, t]);

  const fieldLabel: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#64748b",
    marginBottom: 6,
    letterSpacing: "0.02em",
  };

  const selectStyle: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    minWidth: 160,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#fff",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  };

  const inputStyle: React.CSSProperties = {
    ...selectStyle,
    width: "100%",
    boxSizing: "border-box",
  };

  const checkboxRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "#334155",
  };

  const saveHandoff = useCallback(async () => {
    if (readOnly) return;
    setHandoffSaving(true);
    setError(null);
    try {
      let handoffLastSavedByDisplayName = t("emergencyDisposition.signerFallback");
      try {
        const me = await apiFetch("/auth/me");
        if (me && typeof me === "object" && !Array.isArray(me)) {
          const fn = (me as { fullName?: string }).fullName?.trim();
          if (fn) handoffLastSavedByDisplayName = fn;
        }
      } catch {
        /* fallback label */
      }
      const handoffLastSavedAt = new Date().toISOString();
      const payload: ErHandoffV1Stored = {
        ...handoffForm,
        receivingNurseName: handoffForm.receivingNurseName?.trim() || undefined,
        handoffNote: handoffForm.handoffNote?.trim() || undefined,
        reportGivenAt: handoffForm.reportGivenAt?.trim() || undefined,
        handoffLastSavedAt,
        handoffLastSavedByDisplayName,
      };
      const merged = mergeErHandoffV1IntoNursingAssessment(nursingAssessment, payload);
      const res = await apiFetch(`/encounters/${encounterId}`, {
        method: "PATCH",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nursingAssessment: merged }),
      });
      if (res && typeof res === "object" && !Array.isArray(res) && !(res as { queued?: boolean }).queued) {
        onSaved?.(res as Record<string, unknown>);
      }
      await Promise.resolve(onUpdated());
    } catch (e) {
      setError(
        normalizeUserFacingError(e instanceof Error ? e.message : null, language) || t("encounterOperational.handoffSaveFailed")
      );
    } finally {
      setHandoffSaving(false);
    }
  }, [encounterId, facilityId, handoffForm, language, nursingAssessment, onSaved, onUpdated, readOnly, t]);

  const disabled = handoffSaving || readOnly;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 520 }}>
      {readOnly ? (
        <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.45 }} role="status">
          {t("nursingAssessmentTab.erHandoffReadOnlyBanner")}
        </p>
      ) : (
        <p style={{ margin: 0, fontSize: 11, color: "#64748b", lineHeight: 1.45 }}>
          {t("encounterOperational.handoffRecipientSearchHint")}
        </p>
      )}
      <div>
        <label style={fieldLabel}>{t("encounterOperational.receivingNurseLabel")}</label>
        <ClinicalUserRoleAutocomplete
          facilityId={facilityId}
          role="RN"
          disabled={disabled}
          placeholder={t("encounterOperational.receivingNurseAutocompletePlaceholder")}
          ariaLabel={t("encounterOperational.receivingNurseLabel")}
          displayValue={handoffForm.receivingNurseName ?? ""}
          onChangeDisplay={(v) => {
            if (readOnly) return;
            setHandoffForm((f) => ({
              ...f,
              receivingNurseName: v,
              receivingNurseUserId: undefined,
            }));
          }}
          selectedUserId={handoffForm.receivingNurseUserId ?? null}
          onSelectUser={(u) => {
            if (readOnly) return;
            setHandoffForm((f) => ({
              ...f,
              receivingNurseUserId: u?.id,
              ...(u ? { receivingNurseName: `${u.firstName} ${u.lastName}`.trim() } : {}),
            }));
          }}
        />
      </div>
      <label style={{ ...checkboxRow, cursor: readOnly ? "default" : undefined }}>
        <input
          type="checkbox"
          disabled={disabled}
          checked={handoffForm.reportGiven ?? false}
          onChange={(e) => setHandoffForm((f) => ({ ...f, reportGiven: e.target.checked }))}
        />
        {t("encounterOperational.reportGivenLabel")}
      </label>
      <div>
        <label style={fieldLabel}>{t("encounterOperational.reportGivenAtLabel")}</label>
        <input
          type="datetime-local"
          disabled={disabled}
          value={isoToDatetimeLocalValue(handoffForm.reportGivenAt)}
          onChange={(e) =>
            setHandoffForm((f) => ({
              ...f,
              reportGivenAt: datetimeLocalToIso(e.target.value),
            }))
          }
          style={{
            ...inputStyle,
            maxWidth: 280,
            ...(readOnly ? { backgroundColor: "#f8fafc", cursor: "not-allowed" as const } : {}),
          }}
        />
      </div>
      <div>
        <label style={fieldLabel}>{t("encounterOperational.handoffNoteLabel")}</label>
        <textarea
          value={handoffForm.handoffNote ?? ""}
          onChange={(e) => setHandoffForm((f) => ({ ...f, handoffNote: e.target.value }))}
          rows={3}
          readOnly={readOnly}
          placeholder={t("encounterOperational.handoffNotePlaceholder")}
          style={{
            ...inputStyle,
            minHeight: 72,
            resize: readOnly ? ("none" as const) : ("vertical" as const),
            ...(readOnly ? { backgroundColor: "#f8fafc", cursor: "not-allowed" as const } : {}),
          }}
        />
      </div>
      <label style={{ ...checkboxRow, cursor: readOnly ? "default" : undefined }}>
        <input
          type="checkbox"
          disabled={disabled}
          checked={handoffForm.readyForInpatientTransfer ?? false}
          onChange={(e) => setHandoffForm((f) => ({ ...f, readyForInpatientTransfer: e.target.checked }))}
        />
        {t("encounterOperational.readyForTransferLabel")}
      </label>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: 6,
          padding: "10px 0 0 0",
          borderTop: "1px dashed #e2e8f0",
        }}
      >
        <label style={{ ...checkboxRow, cursor: readOnly ? "default" : undefined }}>
          <input
            type="checkbox"
            disabled={disabled}
            checked={handoffForm.providerDispositionCompleted ?? false}
            onChange={(e) => setHandoffForm((f) => ({ ...f, providerDispositionCompleted: e.target.checked }))}
          />
          {t("encounterOperational.checklistProviderDisposition")}
        </label>
        <label style={{ ...checkboxRow, cursor: readOnly ? "default" : undefined }}>
          <input
            type="checkbox"
            disabled={disabled}
            checked={handoffForm.nurseDocumentationCompleted ?? false}
            onChange={(e) => setHandoffForm((f) => ({ ...f, nurseDocumentationCompleted: e.target.checked }))}
          />
          {t("encounterOperational.checklistNurseDocumentation")}
        </label>
        <label style={{ ...checkboxRow, cursor: readOnly ? "default" : undefined }}>
          <input
            type="checkbox"
            disabled={disabled}
            checked={handoffForm.acceptingPhysicianSelected ?? false}
            onChange={(e) => setHandoffForm((f) => ({ ...f, acceptingPhysicianSelected: e.target.checked }))}
          />
          {t("encounterOperational.checklistAcceptingPhysician")}
        </label>
        <label style={{ ...checkboxRow, cursor: readOnly ? "default" : undefined }}>
          <input
            type="checkbox"
            disabled={disabled}
            checked={handoffForm.reportGivenToReceivingUnit ?? false}
            onChange={(e) => setHandoffForm((f) => ({ ...f, reportGivenToReceivingUnit: e.target.checked }))}
          />
          {t("encounterOperational.checklistReportToUnit")}
        </label>
      </div>
      {!readOnly ? (
        <button
          type="button"
          disabled={handoffSaving}
          onClick={() => void saveHandoff()}
          style={{
            alignSelf: "flex-start",
            marginTop: 4,
            padding: "8px 16px",
            backgroundColor: "#475569",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            cursor: handoffSaving ? "wait" : "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {handoffSaving ? t("common.saving") : t("encounterOperational.saveHandoffButton")}
        </button>
      ) : null}
      {handoffLastSavedCaption ? (
        <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>{handoffLastSavedCaption}</p>
      ) : null}
      {error ? (
        <p style={{ color: "#b91c1c", fontSize: 13, margin: 0, lineHeight: 1.45 }} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const handoffCollapsibleShell: React.CSSProperties = {
  border: "1px solid #bae6fd",
  borderRadius: 12,
  margin: 0,
  marginTop: 4,
  padding: 0,
  backgroundColor: "#f0f9ff",
  overflow: "hidden",
};

export function ErHandoffV1NursingSection({
  encounter,
  encounterId,
  facilityId,
  isLocked,
  canEditErHandoff,
  onUpdated,
  onSaved,
}: {
  encounter: {
    type?: string | null;
    status?: string | null;
    admissionSummaryJson?: unknown;
    nursingAssessment?: unknown;
  };
  encounterId: string;
  facilityId: string;
  isLocked: boolean;
  canEditErHandoff: boolean;
  onUpdated: () => void | Promise<void>;
  onSaved?: (patch: Record<string, unknown>) => void;
}) {
  const { t, language } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const reactId = useId();
  const headingId = `${reactId}-er-handoff-heading`;
  const panelId = `${reactId}-er-handoff-panel`;
  const show = shouldShowErHandoffV1InNursing(encounter);
  if (!show) return null;
  const allowEdit = canEditErHandoff && (encounter.status ?? "").trim() === "OPEN" && !isLocked;

  const hf = useMemo(
    () => readErHandoffV1FromNursingAssessment(encounter.nursingAssessment),
    [encounter.nursingAssessment]
  );

  const compactSummary = useMemo(() => {
    const parts: string[] = [];
    if (hf.receivingNurseName?.trim()) {
      parts.push(hf.receivingNurseName.trim());
    }
    if (hf.reportGivenAt?.trim()) {
      const d = new Date(hf.reportGivenAt);
      if (!Number.isNaN(d.getTime())) {
        parts.push(formatEncounterChromeDateTime(hf.reportGivenAt, language));
      }
    }
    if (hf.handoffLastSavedByDisplayName?.trim() && hf.handoffLastSavedAt?.trim()) {
      const d = new Date(hf.handoffLastSavedAt);
      const when = Number.isNaN(d.getTime())
        ? hf.handoffLastSavedAt.trim()
        : formatEncounterChromeDateTime(hf.handoffLastSavedAt, language);
      parts.push(
        t("nursingAssessmentTab.erHandoffCollapsedSavedBy")
          .replace("{name}", hf.handoffLastSavedByDisplayName.trim())
          .replace("{when}", when)
      );
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  }, [hf, language, t]);

  return (
    <section style={handoffCollapsibleShell} aria-labelledby={headingId}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          padding: "12px 14px",
          borderBottom: expanded ? "1px solid #bae6fd" : "none",
        }}
      >
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <h3
            id={headingId}
            style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a", lineHeight: 1.35 }}
          >
            {t("nursingAssessmentTab.erHandoffLegend")}
          </h3>
          {compactSummary ? (
            <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45, wordBreak: "break-word" }}>
              {compactSummary}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((e) => !e)}
          style={{
            flexShrink: 0,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 10,
            border: "1px solid #7dd3fc",
            backgroundColor: "#fff",
            color: "#0369a1",
            cursor: "pointer",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
          }}
        >
          {expanded ? t("nursingAssessmentTab.erHandoffCollapse") : t("nursingAssessmentTab.erHandoffExpand")}
        </button>
      </div>
      {expanded ? (
        <div id={panelId} style={{ padding: "14px 16px 16px" }}>
          <p style={{ margin: "0 0 12px 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
            {t("nursingAssessmentTab.erHandoffIntro")}
          </p>
          <ErHandoffV1Editor
            encounterId={encounterId}
            facilityId={facilityId}
            nursingAssessment={encounter.nursingAssessment}
            onUpdated={onUpdated}
            onSaved={onSaved}
            readOnly={!allowEdit}
          />
        </div>
      ) : null}
    </section>
  );
}
