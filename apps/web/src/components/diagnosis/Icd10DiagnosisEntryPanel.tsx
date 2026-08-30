"use client";

import React, { useEffect, useState } from "react";
import { isIcd10CmLikeCodeFormat } from "@medora/shared";
import type { Icd10SearchHit } from "@/lib/chartApi";
import type { SupportedLanguage } from "@/i18n/config";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { Icd10DiagnosisSearchAutocomplete } from "./Icd10DiagnosisSearchAutocomplete";
import { icd10HitDescription } from "./icd10DiagnosisSearchHelpers";

export type Icd10DiagnosisEntryPanelProps = {
  facilityId: string;
  disabled?: boolean;
  language: SupportedLanguage;
  /** Primary i18n namespace: `diagnosisEntry.*` with fallbacks to `encounterConsultDiagnostics.*` where noted in callers — use diagnosisEntry keys. */
  t: (key: string) => string;
  onError: (message: string | null) => void;
  onPickCatalog: (hit: Icd10SearchHit, extra?: { onsetDate?: string; notes?: string; description?: string }) => Promise<void>;
  onSubmitManual: (payload: {
    code: string;
    description?: string;
    onsetDate?: string;
    notes?: string;
    manualNonCatalog: true;
  }) => Promise<void>;
  /**
   * When true, catalog/manual selection notifies parent only (parent opens onset dialog).
   * Skips immediate createDiagnosis.
   */
  selectionOnly?: boolean;
  onSelectCatalog?: (hit: Icd10SearchHit) => void;
  onSelectManual?: (draft: { code: string; description?: string }) => void;
  /** Show onset date + notes fields (chart modal / ER quick add). */
  showOnsetNotes?: boolean;
  /** External busy flag (e.g. parent saving). */
  saving?: boolean;
  /** Opens manual entry and prefills (e.g. common diagnosis shortcut from chart modal). */
  manualPrefill?: { code: string; description?: string } | null;
};

/**
 * Shared ICD-10 catalog search + explicit manual path (ER-1 / ER-1.1).
 * Same DTO semantics as `POST /encounters/:id/diagnoses`.
 */
export function Icd10DiagnosisEntryPanel({
  disabled,
  language,
  t,
  onError,
  onPickCatalog,
  onSubmitManual,
  selectionOnly = false,
  onSelectCatalog,
  onSelectManual,
  showOnsetNotes = false,
  saving = false,
  manualPrefill = null,
}: Icd10DiagnosisEntryPanelProps) {
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [onsetDate, setOnsetDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!manualPrefill?.code?.trim()) return;
    setManualOpen(true);
    setManualCode(manualPrefill.code.trim());
    setManualDesc((manualPrefill.description ?? "").trim());
  }, [manualPrefill]);

  const busy = saving || !!disabled;

  const pickCatalog = async (hit: Icd10SearchHit) => {
    if (busy) return;
    onError(null);
    if (selectionOnly) {
      onSelectCatalog?.(hit);
      return;
    }
    try {
      await onPickCatalog(hit, {
        onsetDate: showOnsetNotes && onsetDate.trim() ? onsetDate.trim() : undefined,
        notes: showOnsetNotes && notes.trim() ? notes.trim() : undefined,
        description: icd10HitDescription(hit),
      });
      if (showOnsetNotes) {
        setOnsetDate("");
        setNotes("");
      }
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : (e as { message?: string })?.message;
      onError(normalizeUserFacingError(raw, language) || t("diagnosisEntry.saveError"));
    }
  };

  const submitManual = async () => {
    if (busy) return;
    const code = manualCode.trim();
    if (!code) {
      onError(t("diagnosisEntry.manualCodeRequired"));
      return;
    }
    if (!isIcd10CmLikeCodeFormat(code)) {
      onError(t("diagnosisEntry.invalidIcdFormat"));
      return;
    }
    onError(null);
    if (selectionOnly) {
      onSelectManual?.({ code, description: manualDesc.trim() || undefined });
      return;
    }
    try {
      await onSubmitManual({
        code,
        description: manualDesc.trim() || undefined,
        onsetDate: showOnsetNotes && onsetDate.trim() ? onsetDate.trim() : undefined,
        notes: showOnsetNotes && notes.trim() ? notes.trim() : undefined,
        manualNonCatalog: true,
      });
      setManualOpen(false);
      setManualCode("");
      setManualDesc("");
      if (showOnsetNotes) {
        setOnsetDate("");
        setNotes("");
      }
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : (e as { message?: string })?.message;
      onError(normalizeUserFacingError(raw, language) || t("diagnosisEntry.saveError"));
    }
  };

  const manualFormatOk = manualCode.trim().length === 0 || isIcd10CmLikeCodeFormat(manualCode.trim());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }} data-testid="icd10-diagnosis-entry-panel">
      {showOnsetNotes ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
            {t("diagnosisEntry.onsetLabel")}
            <input
              type="date"
              value={onsetDate}
              onChange={(e) => setOnsetDate(e.target.value)}
              disabled={busy}
              style={{ display: "block", marginTop: 4, padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, width: "100%" }}
            />
          </label>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
            {t("diagnosisEntry.notesLabel")}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={busy}
              rows={2}
              style={{ display: "block", marginTop: 4, padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, width: "100%" }}
            />
          </label>
        </div>
      ) : null}

      <Icd10DiagnosisSearchAutocomplete
        language={language}
        disabled={busy}
        label={t("diagnosisEntry.icdSearchLabel")}
        placeholder={t("diagnosisEntry.icdSearchPlaceholder")}
        searchingLabel={t("diagnosisEntry.icdSearching")}
        noResultsLabel={t("diagnosisEntry.icdNoResults")}
        searchFailedLabel={t("diagnosisEntry.icdSearchFailed")}
        alreadyAddedLabel={t("diagnosisEntry.alreadyAdded")}
        nonBillableLabel={t("diagnosisEntry.nonBillableCode")}
        onSelect={(hit) => void pickCatalog(hit)}
      />

      <div>
        <button
          type="button"
          onClick={() => setManualOpen((v) => !v)}
          disabled={busy}
          style={{
            padding: "8px 12px",
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            background: manualOpen ? "#e2e8f0" : "#fff",
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {t("diagnosisEntry.manualToggle")}
        </button>
      </div>
      {manualOpen ? (
        <div style={{ paddingTop: 8, borderTop: "1px solid #e2e8f0" }}>
          <p style={{ margin: "0 0 8px 0", fontSize: 12, color: "#b45309", lineHeight: 1.45 }}>{t("diagnosisEntry.manualWarning")}</p>
          <p style={{ margin: "0 0 10px 0", fontSize: 12, color: "#64748b" }}>{t("diagnosisEntry.manualFormatHint")}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder={t("diagnosisEntry.manualCodePh")}
              disabled={busy}
              aria-invalid={!manualFormatOk}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: manualFormatOk ? "1px solid #e2e8f0" : "1px solid #f97316",
                fontSize: 14,
              }}
            />
            <input
              value={manualDesc}
              onChange={(e) => setManualDesc(e.target.value)}
              placeholder={t("diagnosisEntry.manualDescPh")}
              disabled={busy}
              style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 }}
            />
            <button
              type="button"
              onClick={() => void submitManual()}
              disabled={busy}
              style={{
                alignSelf: "flex-start",
                padding: "8px 16px",
                borderRadius: 10,
                border: "none",
                background: "#0f172a",
                color: "#fff",
                fontWeight: 600,
                cursor: busy ? "wait" : "pointer",
              }}
            >
              {t("diagnosisEntry.manualSubmit")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
