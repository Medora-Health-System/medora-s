"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { MedicationAutocomplete } from "@/components/pharmacy/MedicationAutocomplete";
import { medicationSearchLabel, type MedicationSearchItem } from "@/lib/pharmacyApi";
import {
  buildEducationSuggestionFromTemplate,
  matchProviderDischargeEducationTemplate,
} from "./providerDischargeEducationTemplates";
import {
  formatMedicationLinesAsText,
  mergeProviderDischargeDocumentationIntoDischargeJson,
  newFollowUpRowId,
  newMedicationLineId,
  PROVIDER_DISCHARGE_FOLLOW_UP_SPECIALTIES,
  WORK_SCHOOL_QUICK_OPTIONS,
  type ProviderDischargeDiagnosisRef,
  type ProviderDischargeDocumentationForm,
  type ProviderDischargeFollowUpRow,
} from "./providerDischargeDocumentationModel";

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 4,
  fontWeight: 600,
  fontSize: 12,
  color: "#475569",
};

const inputBase: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  fontSize: 14,
  color: "#0f172a",
  backgroundColor: "#fff",
};

const taStyle: React.CSSProperties = {
  ...inputBase,
  minHeight: 72,
  resize: "vertical",
};

type DxRow = { id: string; code: string; description: string | null; sortOrder: number };

function isoToDatetimeLocal(iso: string): string {
  if (!iso.trim()) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function datetimeLocalToIso(local: string): string {
  if (!local.trim()) return "";
  try {
    const d = new Date(local);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString();
  } catch {
    return "";
  }
}

export function ProviderDischargeDocumentationSection({
  facilityId,
  patientId,
  encounterId,
  providerForm,
  onProviderFormChange,
  disabled,
  diagnosticsTabHref,
}: {
  facilityId: string;
  patientId: string | null | undefined;
  encounterId: string;
  providerForm: ProviderDischargeDocumentationForm;
  onProviderFormChange: (next: ProviderDischargeDocumentationForm) => void;
  disabled: boolean;
  /** Link to existing diagnosis flow when provider adds a diagnosis. */
  diagnosticsTabHref?: string;
}) {
  const { t, language } = useI18n();
  const [encounterDiagnoses, setEncounterDiagnoses] = useState<DxRow[]>([]);
  const patientLeftEdLocal = isoToDatetimeLocal(providerForm.patientLeftEdAt);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch(`/patients/${patientId}/diagnoses?limit=200`, { facilityId });
        const items = Array.isArray((data as { items?: unknown }).items) ?
          (data as { items: Record<string, unknown>[] }).items
        : [];
        const rows = items
          .filter((d) => d.encounterId === encounterId)
          .map((d) => ({
            id: String(d.id),
            code: String(d.code ?? ""),
            description: (d.description as string | null) ?? null,
            sortOrder: typeof d.sortOrder === "number" ? d.sortOrder : 0,
          }))
          .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));
        if (!cancelled) setEncounterDiagnoses(rows);
      } catch {
        if (!cancelled) setEncounterDiagnoses([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encounterId, facilityId, patientId]);

  const patchProvider = useCallback(
    (patch: Partial<ProviderDischargeDocumentationForm>) => {
      onProviderFormChange({ ...providerForm, ...patch });
    },
    [onProviderFormChange, providerForm]
  );

  const autoPopulatePrimary = useCallback(() => {
    if (providerForm.diagnosisRefs.length > 0 || encounterDiagnoses.length === 0) return;
    const primary = encounterDiagnoses[0];
    if (!primary) return;
    const ref: ProviderDischargeDiagnosisRef = {
      encounterDiagnosisId: primary.id,
      code: primary.code,
      label: primary.description?.trim() || primary.code,
      isPrimary: true,
    };
    const template = matchProviderDischargeEducationTemplate({ code: ref.code, label: ref.label });
    if (template) {
      ref.educationTemplateId = template.id;
      const suggestion = buildEducationSuggestionFromTemplate(template);
      patchProvider({
        diagnosisRefs: [ref],
        description: suggestion.description,
        diagnosisInstructions: suggestion.instructions,
        returnPrecautions: suggestion.returnPrecautions,
      });
    } else {
      patchProvider({ diagnosisRefs: [ref] });
    }
  }, [encounterDiagnoses, patchProvider, providerForm.diagnosisRefs.length]);

  useEffect(() => {
    autoPopulatePrimary();
  }, [autoPopulatePrimary]);

  const selectedDxIds = useMemo(
    () => new Set(providerForm.diagnosisRefs.map((d) => d.encounterDiagnosisId).filter(Boolean)),
    [providerForm.diagnosisRefs]
  );

  const toggleDiagnosis = (row: DxRow) => {
    const exists = providerForm.diagnosisRefs.find((d) => d.encounterDiagnosisId === row.id);
    if (exists) {
      patchProvider({
        diagnosisRefs: providerForm.diagnosisRefs.filter((d) => d.encounterDiagnosisId !== row.id),
      });
      return;
    }
    const ref: ProviderDischargeDiagnosisRef = {
      encounterDiagnosisId: row.id,
      code: row.code,
      label: row.description?.trim() || row.code,
      isPrimary: providerForm.diagnosisRefs.length === 0,
    };
    const template = matchProviderDischargeEducationTemplate({ code: ref.code, label: ref.label });
    const patch: Partial<ProviderDischargeDocumentationForm> = {
      diagnosisRefs: [...providerForm.diagnosisRefs, ref],
    };
    if (template && !providerForm.description.trim() && !providerForm.diagnosisInstructions.trim()) {
      ref.educationTemplateId = template.id;
      const suggestion = buildEducationSuggestionFromTemplate(template);
      patch.description = suggestion.description;
      patch.diagnosisInstructions = suggestion.instructions;
      patch.returnPrecautions = suggestion.returnPrecautions;
    }
    patchProvider(patch);
  };

  const addFollowUpRow = () => {
    const row: ProviderDischargeFollowUpRow = {
      id: newFollowUpRowId(),
      specialty: "PRIMARY_CARE",
      providerOrFacility: "",
      timing: "",
      phone: "",
      address: "",
      comments: "",
    };
    patchProvider({ followUpRows: [...providerForm.followUpRows, row] });
  };

  const patchFollowUpRow = (id: string, patch: Partial<ProviderDischargeFollowUpRow>) => {
    patchProvider({
      followUpRows: providerForm.followUpRows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  };

  const removeFollowUpRow = (id: string) => {
    patchProvider({ followUpRows: providerForm.followUpRows.filter((r) => r.id !== id) });
  };

  const onMedicationPick = (med: MedicationSearchItem) => {
    const displayName = medicationSearchLabel(med, language, t);
    const line = {
      id: newMedicationLineId(),
      catalogMedicationId: med.id,
      displayName,
      dose: med.metadata?.strength?.trim() ?? "",
      frequency: "",
      instructions: "",
    };
    const nextLines = [...providerForm.medicationLines, line];
    patchProvider({
      medicationLines: nextLines,
      medicationTreatmentText: formatMedicationLinesAsText(nextLines),
    });
  };

  const appendWorkSchoolQuick = (option: (typeof WORK_SCHOOL_QUICK_OPTIONS)[number]) => {
    const text = t(`providerDischargeDocumentation19Y.workSchoolQuick.${option}`);
    const current = providerForm.workSchoolNote.trim();
    patchProvider({ workSchoolNote: current ? `${current}\n${text}` : text });
  };

  return (
    <div
      style={{
        marginTop: 8,
        padding: "12px 14px",
        borderRadius: 10,
        border: "1px solid #e2e8f0",
        backgroundColor: "#fff",
      }}
    >
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
        {t("providerDischargeDocumentation19Y.sectionTitle")}
      </p>

      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <label style={labelStyle}>{t("providerDischargeDocumentation19Y.patientLeftEd")}</label>
          <input
            type="datetime-local"
            value={patientLeftEdLocal}
            disabled={disabled}
            onChange={(e) => {
              onProviderFormChange({
                ...providerForm,
                patientLeftEdAt: datetimeLocalToIso(e.target.value),
              });
            }}
            style={{ ...inputBase, backgroundColor: disabled ? "#f8fafc" : "#fff" }}
          />
        </div>

        <div>
          <label style={labelStyle}>{t("providerDischargeDocumentation19Y.dischargeDiagnoses")}</label>
          {encounterDiagnoses.length === 0 ?
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
              {t("providerDischargeDocumentation19Y.noEncounterDiagnoses")}
            </p>
          : <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
              {encounterDiagnoses.map((dx) => (
                <label
                  key={dx.id}
                  style={{ display: "flex", gap: 8, fontSize: 13, color: "#0f172a", cursor: disabled ? "not-allowed" : "pointer" }}
                >
                  <input
                    type="checkbox"
                    checked={selectedDxIds.has(dx.id)}
                    disabled={disabled}
                    onChange={() => toggleDiagnosis(dx)}
                  />
                  <span>
                    {dx.code} — {dx.description?.trim() || dx.code}
                  </span>
                </label>
              ))}
            </div>
          }
          {diagnosticsTabHref ?
            <Link
              href={diagnosticsTabHref}
              style={{ display: "inline-block", marginTop: 6, fontSize: 12, fontWeight: 600, color: "#1d4ed8" }}
            >
              {t("providerDischargeDocumentation19Y.addDiagnosisLink")}
            </Link>
          : null}
        </div>

        <div>
          <label style={labelStyle}>{t("providerDischargeDocumentation19Y.description")}</label>
          <textarea
            value={providerForm.description}
            disabled={disabled}
            rows={3}
            style={{ ...taStyle, backgroundColor: disabled ? "#f8fafc" : "#fff" }}
            onChange={(e) => patchProvider({ description: e.target.value })}
          />
        </div>

        <div>
          <label style={labelStyle}>{t("providerDischargeDocumentation19Y.diagnosisInstructions")}</label>
          <textarea
            value={providerForm.diagnosisInstructions}
            disabled={disabled}
            rows={3}
            style={{ ...taStyle, backgroundColor: disabled ? "#f8fafc" : "#fff" }}
            onChange={(e) => patchProvider({ diagnosisInstructions: e.target.value })}
          />
        </div>

        <div>
          <label style={labelStyle}>{t("providerDischargeDocumentation19Y.medicationTreatment")}</label>
          {!disabled ?
            <div style={{ marginBottom: 8 }}>
              <MedicationAutocomplete facilityId={facilityId} onSelect={onMedicationPick} placeholder={t("providerDischargeDocumentation19Y.medicationSearchPlaceholder")} />
            </div>
          : null}
          <textarea
            value={providerForm.medicationTreatmentText}
            disabled={disabled}
            rows={3}
            style={{ ...taStyle, backgroundColor: disabled ? "#f8fafc" : "#fff" }}
            onChange={(e) => patchProvider({ medicationTreatmentText: e.target.value })}
          />
        </div>

        <div>
          <label style={labelStyle}>{t("providerDischargeDocumentation19Y.returnPrecautions")}</label>
          <textarea
            value={providerForm.returnPrecautions}
            disabled={disabled}
            rows={3}
            style={{ ...taStyle, backgroundColor: disabled ? "#f8fafc" : "#fff" }}
            onChange={(e) => patchProvider({ returnPrecautions: e.target.value })}
          />
        </div>

        <div>
          <label style={labelStyle}>{t("providerDischargeDocumentation19Y.workSchool")}</label>
          {!disabled ?
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
              {WORK_SCHOOL_QUICK_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => appendWorkSchoolQuick(opt)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 9999,
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {t(`providerDischargeDocumentation19Y.workSchoolQuick.${opt}`)}
                </button>
              ))}
            </div>
          : null}
          <textarea
            value={providerForm.workSchoolNote}
            disabled={disabled}
            rows={2}
            style={{ ...taStyle, backgroundColor: disabled ? "#f8fafc" : "#fff" }}
            onChange={(e) => patchProvider({ workSchoolNote: e.target.value })}
          />
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>{t("providerDischargeDocumentation19Y.followUp")}</label>
            {!disabled ?
              <button
                type="button"
                onClick={addFollowUpRow}
                style={{
                  padding: "4px 10px",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t("providerDischargeDocumentation19Y.addFollowUp")}
              </button>
            : null}
          </div>
          {providerForm.followUpRows.map((row) => (
            <div
              key={row.id}
              style={{
                marginTop: 8,
                padding: 8,
                borderRadius: 8,
                border: "1px solid #f1f5f9",
                display: "grid",
                gap: 6,
              }}
            >
              <select
                value={row.specialty}
                disabled={disabled}
                onChange={(e) => patchFollowUpRow(row.id, { specialty: e.target.value })}
                style={{ ...inputBase, backgroundColor: disabled ? "#f8fafc" : "#fff" }}
              >
                {PROVIDER_DISCHARGE_FOLLOW_UP_SPECIALTIES.map((s) => (
                  <option key={s} value={s}>
                    {t(`providerDischargeDocumentation19Y.followUpSpecialty.${s}`)}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder={t("providerDischargeDocumentation19Y.followUpProviderPlaceholder")}
                value={row.providerOrFacility}
                disabled={disabled}
                onChange={(e) => patchFollowUpRow(row.id, { providerOrFacility: e.target.value })}
                style={{ ...inputBase, backgroundColor: disabled ? "#f8fafc" : "#fff" }}
              />
              <input
                type="text"
                placeholder={t("providerDischargeDocumentation19Y.followUpTimingPlaceholder")}
                value={row.timing}
                disabled={disabled}
                onChange={(e) => patchFollowUpRow(row.id, { timing: e.target.value })}
                style={{ ...inputBase, backgroundColor: disabled ? "#f8fafc" : "#fff" }}
              />
              <input
                type="text"
                placeholder={t("providerDischargeDocumentation19Y.followUpPhonePlaceholder")}
                value={row.phone}
                disabled={disabled}
                onChange={(e) => patchFollowUpRow(row.id, { phone: e.target.value })}
                style={{ ...inputBase, backgroundColor: disabled ? "#f8fafc" : "#fff" }}
              />
              {!disabled ?
                <button
                  type="button"
                  onClick={() => removeFollowUpRow(row.id)}
                  style={{
                    justifySelf: "start",
                    padding: "2px 8px",
                    border: "none",
                    background: "transparent",
                    color: "#b91c1c",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {t("common.delete")}
                </button>
              : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Build discharge JSON for disposition save (provider documentation + metadata). */
export function buildProviderDischargeJsonForSave(
  dischargeSummaryJson: unknown,
  providerForm: ProviderDischargeDocumentationForm,
  meta: { documentedAt: string; documentedByDisplayName: string; documentedByTitle?: string }
): Record<string, unknown> {
  return mergeProviderDischargeDocumentationIntoDischargeJson(dischargeSummaryJson, providerForm, meta);
}
