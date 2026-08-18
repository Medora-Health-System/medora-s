"use client";

/**
 * MEDUI.INP.2B.2A — Reuses enterprise clinical-history-profile authority.
 * Does not create a Nursing-Admission-owned PMH / surgical / home-med store.
 */

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useI18n } from "@/lib/i18n";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";

export type NursingAdmissionHistoryEditorDomain =
  | "MEDICAL_HISTORY"
  | "SURGICAL_HISTORY"
  | "HOME_MEDICATIONS";

const SECTION_API: Record<NursingAdmissionHistoryEditorDomain, string> = {
  MEDICAL_HISTORY: "medicalHistory",
  SURGICAL_HISTORY: "surgicalHistory",
  HOME_MEDICATIONS: "homeMedications",
};

export function NursingAdmissionEnterpriseHistoryEditor({
  open,
  domain,
  patientId,
  encounterId,
  onClose,
  onSaved,
}: {
  open: boolean;
  domain: NursingAdmissionHistoryEditorDomain;
  patientId: string;
  encounterId: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const { t } = useI18n();
  const { facilityId } = useFacilityAndRoles();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!patientId || !facilityId) return;
    setError(null);
    try {
      const raw = await apiFetch(`/patients/${encodeURIComponent(patientId)}/clinical-history-profile`, {
        facilityId,
      });
      const profile = asApiObject<{
        medicalHistory?: { pastMedicalHistory?: string };
        surgicalHistory?: { pastSurgicalHistory?: string };
        homeMedications?: { medicationsSummary?: string };
      }>(raw);
      if (domain === "MEDICAL_HISTORY") setValue(profile?.medicalHistory?.pastMedicalHistory ?? "");
      else if (domain === "SURGICAL_HISTORY") setValue(profile?.surgicalHistory?.pastSurgicalHistory ?? "");
      else setValue(profile?.homeMedications?.medicationsSummary ?? "");
    } catch {
      setError(t("inpatientAdmissionInp2b2a.historyEditor.loadError"));
    }
  }, [domain, facilityId, patientId, t]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  if (!open) return null;

  const persist = async () => {
    if (!facilityId) return;
    setBusy(true);
    setError(null);
    try {
      const section = SECTION_API[domain];
      const body =
        domain === "MEDICAL_HISTORY"
          ? { value: { pastMedicalHistory: value }, encounterId }
          : domain === "SURGICAL_HISTORY"
            ? { value: { pastSurgicalHistory: value }, encounterId }
            : { value: { medicationsSummary: value }, encounterId };
      await apiFetch(
        `/patients/${encodeURIComponent(patientId)}/clinical-history-profile/sections/${section}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          facilityId,
          body: JSON.stringify(body),
        }
      );
      await onSaved();
      onClose();
    } catch {
      setError(t("inpatientAdmissionInp2b2a.historyEditor.saveError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="nursing-admission-enterprise-history-editor"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(15,23,42,0.35)",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div style={{ ...MEDORA_CARD_SHELL, width: "min(560px, 100%)", padding: 16, background: "#fff" }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>
          {t(`inpatientAdmissionInp2b2a.historyEditor.title.${domain}`)}
        </h3>
        <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b" }}>
          {t("inpatientAdmissionInp2b2a.historyEditor.reuseHint")}
        </p>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={8}
          data-testid="nursing-admission-history-editor-text"
          style={textareaStyle}
        />
        {error ? (
          <p role="alert" style={{ color: "#b91c1c", fontSize: 12 }}>
            {error}
          </p>
        ) : null}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
          <button type="button" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </button>
          <button type="button" onClick={() => void persist()} disabled={busy} data-testid="nursing-admission-history-editor-save">
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

const textareaStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  padding: 10,
  fontSize: 13,
};
