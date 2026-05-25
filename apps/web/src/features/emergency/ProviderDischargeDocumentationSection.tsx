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
  createDiagnosisDocFromRef,
  findDiagnosisDocForRef,
  mergeProviderDischargeDocumentationIntoDischargeJson,
  newDefaultFollowUpRow,
  newFollowUpRowId,
  PROVIDER_DISCHARGE_FOLLOW_UP_SPECIALTIES,
  WORK_SCHOOL_QUICK_OPTIONS,
  type ProviderDischargeDiagnosisDoc,
  type ProviderDischargeDiagnosisRef,
  type ProviderDischargeDocumentationForm,
  type ProviderDischargeFollowUpRow,
  type ProviderDischargeValidationErrors,
} from "./providerDischargeDocumentationModel";

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 4,
  fontWeight: 600,
  fontSize: 12,
  color: "#475569",
};

const errorStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: 11,
  color: "#b91c1c",
  fontWeight: 600,
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

function appendMedicationLine(current: string, line: string): string {
  const c = current.trim();
  const l = line.trim();
  if (!l) return c;
  return c ? `${c}\n${l}` : l;
}

function DiagnosisDocumentationCard({
  doc,
  disabled,
  validationErrors,
  facilityId,
  onPatchDoc,
}: {
  doc: ProviderDischargeDiagnosisDoc;
  disabled: boolean;
  validationErrors?: Partial<Record<string, string>>;
  facilityId: string;
  onPatchDoc: (docId: string, patch: Partial<ProviderDischargeDiagnosisDoc>) => void;
}) {
  const { t, language } = useI18n();
  const cardTitle = `${doc.code} — ${doc.displayName}`;

  const patchFollowUpRow = (rowId: string, patch: Partial<ProviderDischargeFollowUpRow>) => {
    onPatchDoc(doc.id, {
      followUps: doc.followUps.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
    });
  };

  const addFollowUpRow = () => {
    onPatchDoc(doc.id, { followUps: [...doc.followUps, newDefaultFollowUpRow()] });
  };

  const removeFollowUpRow = (rowId: string) => {
    onPatchDoc(doc.id, { followUps: doc.followUps.filter((r) => r.id !== rowId) });
  };

  const onMedicationPick = (med: MedicationSearchItem) => {
    const displayName = medicationSearchLabel(med, language, t);
    const dose = med.metadata?.strength?.trim() ?? "";
    const line = dose ? `${displayName} ${dose}` : displayName;
    onPatchDoc(doc.id, { medicationTreatment: appendMedicationLine(doc.medicationTreatment, line) });
  };

  const appendWorkSchoolQuick = (option: (typeof WORK_SCHOOL_QUICK_OPTIONS)[number]) => {
    const text = t(`providerDischargeDocumentation19Y.workSchoolQuick.${option}`);
    const current = (doc.returnWorkSchool ?? "").trim();
    onPatchDoc(doc.id, { returnWorkSchool: current ? `${current}\n${text}` : text });
  };

  const fieldError = (key: string) => validationErrors?.[key];

  return (
    <div
      style={{
        marginTop: 10,
        padding: "12px 14px",
        borderRadius: 10,
        border: "1px solid #cbd5e1",
        backgroundColor: "#f8fafc",
      }}
    >
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{cardTitle}</p>

      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <label style={labelStyle}>{t("providerDischargeDocumentation19Y.descriptionRequired")}</label>
          <textarea
            value={doc.description}
            disabled={disabled}
            rows={3}
            style={{
              ...taStyle,
              backgroundColor: disabled ? "#f1f5f9" : "#fff",
              borderColor: fieldError("description") ? "#b91c1c" : "#e2e8f0",
            }}
            onChange={(e) => onPatchDoc(doc.id, { description: e.target.value })}
          />
          {fieldError("description") ?
            <p style={errorStyle}>{fieldError("description")}</p>
          : null}
        </div>

        <div>
          <label style={labelStyle}>{t("providerDischargeDocumentation19Y.diagnosisInstructionsRequired")}</label>
          <textarea
            value={doc.diagnosisInstructions}
            disabled={disabled}
            rows={3}
            style={{
              ...taStyle,
              backgroundColor: disabled ? "#f1f5f9" : "#fff",
              borderColor: fieldError("diagnosisInstructions") ? "#b91c1c" : "#e2e8f0",
            }}
            onChange={(e) => onPatchDoc(doc.id, { diagnosisInstructions: e.target.value })}
          />
          {fieldError("diagnosisInstructions") ?
            <p style={errorStyle}>{fieldError("diagnosisInstructions")}</p>
          : null}
        </div>

        <div>
          <label style={labelStyle}>{t("providerDischargeDocumentation19Y.medicationTreatmentRequired")}</label>
          {!disabled ?
            <div style={{ marginBottom: 8 }}>
              <MedicationAutocomplete
                facilityId={facilityId}
                onSelect={onMedicationPick}
                placeholder={t("providerDischargeDocumentation19Y.medicationSearchPlaceholder")}
              />
            </div>
          : null}
          <textarea
            value={doc.medicationTreatment}
            disabled={disabled}
            rows={3}
            style={{
              ...taStyle,
              backgroundColor: disabled ? "#f1f5f9" : "#fff",
              borderColor: fieldError("medicationTreatment") ? "#b91c1c" : "#e2e8f0",
            }}
            onChange={(e) => onPatchDoc(doc.id, { medicationTreatment: e.target.value })}
          />
          {fieldError("medicationTreatment") ?
            <p style={errorStyle}>{fieldError("medicationTreatment")}</p>
          : null}
        </div>

        <div>
          <label style={labelStyle}>{t("providerDischargeDocumentation19Y.returnPrecautionsRequired")}</label>
          <textarea
            value={doc.returnPrecautions}
            disabled={disabled}
            rows={3}
            style={{
              ...taStyle,
              backgroundColor: disabled ? "#f1f5f9" : "#fff",
              borderColor: fieldError("returnPrecautions") ? "#b91c1c" : "#e2e8f0",
            }}
            onChange={(e) => onPatchDoc(doc.id, { returnPrecautions: e.target.value })}
          />
          {fieldError("returnPrecautions") ?
            <p style={errorStyle}>{fieldError("returnPrecautions")}</p>
          : null}
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
                    background: "#fff",
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
            value={doc.returnWorkSchool ?? ""}
            disabled={disabled}
            rows={2}
            style={{ ...taStyle, backgroundColor: disabled ? "#f1f5f9" : "#fff" }}
            onChange={(e) => onPatchDoc(doc.id, { returnWorkSchool: e.target.value })}
          />
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              {t("providerDischargeDocumentation19Y.followUpRequired")}
            </label>
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
          {fieldError("followUps") ?
            <p style={{ ...errorStyle, marginTop: 6 }}>{fieldError("followUps")}</p>
          : null}
          {doc.followUps.map((row) => (
            <div
              key={row.id}
              style={{
                marginTop: 8,
                padding: 8,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                display: "grid",
                gap: 6,
                backgroundColor: "#fff",
              }}
            >
              <select
                value={row.specialty}
                disabled={disabled}
                onChange={(e) => patchFollowUpRow(row.id, { specialty: e.target.value })}
                style={{ ...inputBase, backgroundColor: disabled ? "#f1f5f9" : "#fff" }}
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
                style={{ ...inputBase, backgroundColor: disabled ? "#f1f5f9" : "#fff" }}
              />
              <input
                type="text"
                placeholder={t("providerDischargeDocumentation19Y.followUpTimingPlaceholder")}
                value={row.timing}
                disabled={disabled}
                onChange={(e) => patchFollowUpRow(row.id, { timing: e.target.value })}
                style={{ ...inputBase, backgroundColor: disabled ? "#f1f5f9" : "#fff" }}
              />
              <input
                type="text"
                placeholder={t("providerDischargeDocumentation19Y.followUpPhonePlaceholder")}
                value={row.phone}
                disabled={disabled}
                onChange={(e) => patchFollowUpRow(row.id, { phone: e.target.value })}
                style={{ ...inputBase, backgroundColor: disabled ? "#f1f5f9" : "#fff" }}
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

export function ProviderDischargeDocumentationSection({
  facilityId,
  patientId,
  encounterId,
  providerForm,
  onProviderFormChange,
  disabled,
  diagnosticsTabHref,
  validationErrors,
}: {
  facilityId: string;
  patientId: string | null | undefined;
  encounterId: string;
  providerForm: ProviderDischargeDocumentationForm;
  onProviderFormChange: (next: ProviderDischargeDocumentationForm) => void;
  disabled: boolean;
  diagnosticsTabHref?: string;
  validationErrors?: ProviderDischargeValidationErrors | null;
}) {
  const { t } = useI18n();
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

  const patchDiagnosisDoc = useCallback(
    (docId: string, patch: Partial<ProviderDischargeDiagnosisDoc>) => {
      patchProvider({
        diagnosisDocs: providerForm.diagnosisDocs.map((d) => (d.id === docId ? { ...d, ...patch } : d)),
      });
    },
    [patchProvider, providerForm.diagnosisDocs]
  );

  const applyTemplateToDoc = useCallback(
    (docId: string, ref: ProviderDischargeDiagnosisRef) => {
      const doc = providerForm.diagnosisDocs.find((d) => d.id === docId);
      if (!doc) return;
      const template = matchProviderDischargeEducationTemplate({ code: ref.code, label: ref.label });
      if (!template) return;
      const suggestion = buildEducationSuggestionFromTemplate(template);
      const patch: Partial<ProviderDischargeDiagnosisDoc> = { sourceTemplateId: template.id };
      if (!doc.description.trim()) patch.description = suggestion.description;
      if (!doc.diagnosisInstructions.trim()) patch.diagnosisInstructions = suggestion.instructions;
      if (!doc.returnPrecautions.trim()) patch.returnPrecautions = suggestion.returnPrecautions;
      patchDiagnosisDoc(docId, patch);
    },
    [patchDiagnosisDoc, providerForm.diagnosisDocs]
  );

  const ensureDocForRef = useCallback(
    (ref: ProviderDischargeDiagnosisRef, applyTemplate: boolean): ProviderDischargeDiagnosisDoc => {
      const existing = findDiagnosisDocForRef(providerForm, ref);
      if (existing) {
        if (applyTemplate) applyTemplateToDoc(existing.id, ref);
        return existing;
      }
      const created = createDiagnosisDocFromRef(ref);
      const template = applyTemplate ?
        matchProviderDischargeEducationTemplate({ code: ref.code, label: ref.label })
      : null;
      if (template) {
        created.sourceTemplateId = template.id;
        const suggestion = buildEducationSuggestionFromTemplate(template);
        created.description = suggestion.description;
        created.diagnosisInstructions = suggestion.instructions;
        created.returnPrecautions = suggestion.returnPrecautions;
      }
      return created;
    },
    [applyTemplateToDoc, providerForm]
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
    const doc = ensureDocForRef(ref, true);
    patchProvider({
      diagnosisRefs: [ref],
      diagnosisDocs: [...providerForm.diagnosisDocs.filter((d) => d.id !== doc.id), doc],
    });
  }, [encounterDiagnoses, ensureDocForRef, patchProvider, providerForm.diagnosisDocs, providerForm.diagnosisRefs.length]);

  useEffect(() => {
    autoPopulatePrimary();
  }, [autoPopulatePrimary]);

  const selectedDxIds = useMemo(
    () => new Set(providerForm.diagnosisRefs.map((d) => d.encounterDiagnosisId).filter(Boolean)),
    [providerForm.diagnosisRefs]
  );

  const selectedCards = useMemo(
    () =>
      providerForm.diagnosisRefs
        .map((ref) => findDiagnosisDocForRef(providerForm, ref))
        .filter((d): d is ProviderDischargeDiagnosisDoc => d != null),
    [providerForm]
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
    const doc = ensureDocForRef(ref, true);
    const nextDocs = providerForm.diagnosisDocs.some((d) => d.id === doc.id) ?
      providerForm.diagnosisDocs.map((d) => (d.id === doc.id ? doc : d))
    : [...providerForm.diagnosisDocs, doc];
    patchProvider({
      diagnosisRefs: [...providerForm.diagnosisRefs, ref],
      diagnosisDocs: nextDocs,
    });
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

        {selectedCards.map((doc) => (
          <DiagnosisDocumentationCard
            key={doc.id}
            doc={doc}
            disabled={disabled}
            facilityId={facilityId}
            validationErrors={validationErrors?.byDocId[doc.id]}
            onPatchDoc={patchDiagnosisDoc}
          />
        ))}
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

export { validateProviderDischargeDocumentation } from "./providerDischargeDocumentationModel";
