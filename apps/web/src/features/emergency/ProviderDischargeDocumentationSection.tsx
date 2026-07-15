"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { MedicationAutocomplete } from "@/components/pharmacy/MedicationAutocomplete";
import { DictationFieldLabel } from "@/components/clinical/DictationFieldLabel";
import { medicationSearchLabel, type MedicationSearchItem } from "@/lib/pharmacyApi";
import { getLocalizedDiagnosisDisplayLabel } from "@/features/emergency/diagnosisFrenchDisplayLabels";
import {
  applyProviderDischargeTemplateToCardByDiagnosis,
  ensureProviderDischargeCardForRef,
  providerDischargeCardNeedsLocaleReapply,
} from "./providerDischargeCardTemplateSync";
import { resolveProviderDischargeTemplateForDiagnosis } from "./providerDischargeTemplateRegistry";
import {
  extractSharedFieldsFromTemplate,
  mergeSharedFieldsFromSelectedTemplates,
  mergeTemplateSharedFieldsIntoForm,
} from "./providerDischargeSharedPlanningMerge";
import {
  getSelectedDiagnosisDocs,
  mergeCanonicalErDispositionIntoDischargeJson,
  mergeProviderDischargeDocumentationIntoDischargeJson,
  newDefaultFollowUpRow,
  providerDischargeDictationTextareaId,
  PROVIDER_DISCHARGE_FOLLOW_UP_SPECIALTIES,
  WORK_SCHOOL_QUICK_OPTIONS,
  type ProviderDischargeDiagnosisCard,
  type ProviderDischargeDiagnosisRef,
  type ProviderDischargeDocumentationForm,
  type ProviderDischargeFollowUpRow,
  type ProviderDischargeValidationErrors,
} from "./providerDischargeDocumentationModel";
import { pruneDischargeFormAfterDiagnosisRemoval } from "./pruneDischargeFormAfterDiagnosisRemoval";
import {
  edDispositionDiagnosisCardShellStyle,
  edDispositionFollowUpRowGridStyle,
  edDispositionSectionShellStyle,
  edDispositionTouchButtonStyle,
  type EdDispositionLayoutMode,
} from "./edDispositionResponsiveLayout";

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

const DiagnosisDocumentationCard = React.memo(function DiagnosisDocumentationCard({
  doc,
  disabled,
  validationErrors,
  facilityId,
  layoutMode = "desktopSplit",
  onPatchDoc,
  onApplyTemplate,
}: {
  doc: ProviderDischargeDiagnosisCard;
  disabled: boolean;
  validationErrors?: Partial<Record<string, string>>;
  facilityId: string;
  layoutMode?: EdDispositionLayoutMode;
  onPatchDoc: (docId: string, patch: Partial<ProviderDischargeDiagnosisCard>) => void;
  onApplyTemplate: (docId: string, overwriteExisting: boolean) => void;
}) {
  const { t, language } = useI18n();
  const cardTitle = `${doc.code} — ${getLocalizedDiagnosisDisplayLabel({ code: doc.code, description: doc.displayName }, language)}${doc.isPrimaryDiagnosis ? ` (${t("providerDischargeDocumentation19Y.primary")})` : ""}`;

  const onMedicationPick = (med: MedicationSearchItem) => {
    const displayName = medicationSearchLabel(med, language, t);
    const dose = med.metadata?.strength?.trim() ?? "";
    const line = dose ? `${displayName} ${dose}` : displayName;
    onPatchDoc(doc.id, { medicationTreatment: appendMedicationLine(doc.medicationTreatment, line) });
  };

  const fieldError = (key: string) => validationErrors?.[key];
  const descriptionId = providerDischargeDictationTextareaId.diagnosisDescription(doc.id);
  const instructionsId = providerDischargeDictationTextareaId.diagnosisInstructions(doc.id);
  const medicationId = providerDischargeDictationTextareaId.medicationTreatment(doc.id);
  const dictationLabel = t("providerDocumentationWorkspace.dictationFocusField");
  const dictationReadOnly = t("providerDocumentationWorkspace.dictationReadOnlyField");

  return (
    <div style={edDispositionDiagnosisCardShellStyle()}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0f172a", wordBreak: "break-word", lineHeight: 1.35 }}>
        {cardTitle}
      </p>
      {!disabled ?
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button
            type="button"
            onClick={() => onApplyTemplate(doc.id, false)}
            style={edDispositionTouchButtonStyle(
              {
                padding: "4px 10px",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: "#fff",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              },
              layoutMode
            )}
          >
            {t("providerDischargeDocumentation19Y.applySuggestion")}
          </button>
        </div>
      : null}

      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <DictationFieldLabel
            label={t("providerDischargeDocumentation19Y.descriptionRequired")}
            dictationTargetId={descriptionId}
            dictationLabel={dictationLabel}
            readOnly={disabled}
            readOnlyLabel={dictationReadOnly}
          />
          <textarea
            id={descriptionId}
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
          <DictationFieldLabel
            label={t("providerDischargeDocumentation19Y.diagnosisInstructionsRequired")}
            dictationTargetId={instructionsId}
            dictationLabel={dictationLabel}
            readOnly={disabled}
            readOnlyLabel={dictationReadOnly}
          />
          <textarea
            id={instructionsId}
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
          <DictationFieldLabel
            label={t("providerDischargeDocumentation19Y.medicationTreatmentRequired")}
            dictationTargetId={medicationId}
            dictationLabel={dictationLabel}
            readOnly={disabled}
            readOnlyLabel={dictationReadOnly}
          />
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
            id={medicationId}
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
      </div>
    </div>
  );
});

const SharedDischargePlanningSection = React.memo(function SharedDischargePlanningSection({
  returnPrecautions,
  returnWorkSchool,
  followUps,
  patientInstructionsGiven,
  disabled,
  validationErrors,
  layoutMode = "desktopSplit",
  onPatchShared,
}: {
  returnPrecautions: string;
  returnWorkSchool: string;
  followUps: ProviderDischargeFollowUpRow[];
  patientInstructionsGiven: boolean;
  disabled: boolean;
  validationErrors?: Partial<Record<string, string>>;
  layoutMode?: EdDispositionLayoutMode;
  onPatchShared: (
    patch: Partial<
      Pick<
        ProviderDischargeDocumentationForm,
        "returnPrecautions" | "returnWorkSchool" | "followUps" | "patientInstructionsGiven"
      >
    >
  ) => void;
}) {
  const { t } = useI18n();
  const dictationLabel = t("providerDocumentationWorkspace.dictationFocusField");
  const dictationReadOnly = t("providerDocumentationWorkspace.dictationReadOnlyField");
  const precautionsId = providerDischargeDictationTextareaId.returnPrecautions;
  const workSchoolId = providerDischargeDictationTextareaId.returnWorkSchool;

  const patchFollowUpRow = (rowId: string, patch: Partial<ProviderDischargeFollowUpRow>) => {
    onPatchShared({
      followUps: followUps.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
    });
  };

  const addFollowUpRow = () => {
    onPatchShared({ followUps: [...followUps, newDefaultFollowUpRow()] });
  };

  const removeFollowUpRow = (rowId: string) => {
    onPatchShared({ followUps: followUps.filter((r) => r.id !== rowId) });
  };

  const appendWorkSchoolQuick = (option: (typeof WORK_SCHOOL_QUICK_OPTIONS)[number]) => {
    const text = t(`providerDischargeDocumentation19Y.workSchoolQuick.${option}`);
    const current = returnWorkSchool.trim();
    onPatchShared({ returnWorkSchool: current ? `${current}\n${text}` : text });
  };

  return (
    <div
      style={{
        marginTop: 14,
        padding: "12px 14px",
        borderRadius: 10,
        border: "1px solid #cbd5e1",
        backgroundColor: "#f1f5f9",
      }}
    >
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
        {t("providerDischargeDocumentation19Y.dischargePlanningSection")}
      </p>

      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <DictationFieldLabel
            label={t("providerDischargeDocumentation19Y.returnPrecautionsRequired")}
            dictationTargetId={precautionsId}
            dictationLabel={dictationLabel}
            readOnly={disabled}
            readOnlyLabel={dictationReadOnly}
          />
          <textarea
            id={precautionsId}
            value={returnPrecautions}
            disabled={disabled}
            rows={3}
            style={{
              ...taStyle,
              backgroundColor: disabled ? "#f1f5f9" : "#fff",
              borderColor: validationErrors?.returnPrecautions ? "#b91c1c" : "#e2e8f0",
            }}
            onChange={(e) => onPatchShared({ returnPrecautions: e.target.value })}
          />
          {validationErrors?.returnPrecautions ?
            <p style={errorStyle}>{validationErrors.returnPrecautions}</p>
          : null}
        </div>

        <div>
          <DictationFieldLabel
            label={t("providerDischargeDocumentation19Y.workSchool")}
            dictationTargetId={workSchoolId}
            dictationLabel={dictationLabel}
            readOnly={disabled}
            readOnlyLabel={dictationReadOnly}
          />
          {!disabled ?
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
              {WORK_SCHOOL_QUICK_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => appendWorkSchoolQuick(opt)}
                  style={edDispositionTouchButtonStyle(
                    {
                      padding: "4px 8px",
                      borderRadius: 9999,
                      border: "1px solid #e2e8f0",
                      background: "#fff",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                    },
                    layoutMode
                  )}
                >
                  {t(`providerDischargeDocumentation19Y.workSchoolQuick.${opt}`)}
                </button>
              ))}
            </div>
          : null}
          <textarea
            id={workSchoolId}
            value={returnWorkSchool}
            disabled={disabled}
            rows={2}
            style={{ ...taStyle, backgroundColor: disabled ? "#f1f5f9" : "#fff" }}
            onChange={(e) => onPatchShared({ returnWorkSchool: e.target.value })}
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
                style={edDispositionTouchButtonStyle(
                  {
                    padding: "4px 10px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  },
                  layoutMode
                )}
              >
                {t("providerDischargeDocumentation19Y.addFollowUp")}
              </button>
            : null}
          </div>
          {validationErrors?.followUps ?
            <p style={{ ...errorStyle, marginTop: 6 }}>{validationErrors.followUps}</p>
          : null}
          {followUps.map((row) => (
            <div
              key={row.id}
              style={{
                marginTop: 8,
                padding: 8,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                ...edDispositionFollowUpRowGridStyle(layoutMode),
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
                  style={edDispositionTouchButtonStyle(
                    {
                      justifySelf: "start",
                      padding: "2px 8px",
                      border: "none",
                      background: "transparent",
                      color: "#b91c1c",
                      fontSize: 12,
                      cursor: "pointer",
                    },
                    layoutMode
                  )}
                >
                  {t("common.delete")}
                </button>
              : null}
            </div>
          ))}
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            marginTop: 4,
            fontSize: 13,
            color: "#0f172a",
            cursor: disabled ? "default" : "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={patientInstructionsGiven}
            disabled={disabled}
            onChange={(e) => onPatchShared({ patientInstructionsGiven: e.target.checked })}
            style={{ marginTop: 2 }}
          />
          <span>{t("patientDischargeInstructions.givenCheckbox")}</span>
        </label>
      </div>
    </div>
  );
});

export function ProviderDischargeDocumentationSection({
  facilityId,
  patientId,
  encounterId,
  providerForm,
  onProviderFormChange,
  disabled,
  diagnosticsTabHref,
  validationErrors,
  layoutMode = "desktopSplit",
}: {
  facilityId: string;
  patientId: string | null | undefined;
  encounterId: string;
  providerForm: ProviderDischargeDocumentationForm;
  onProviderFormChange: (next: ProviderDischargeDocumentationForm) => void;
  disabled: boolean;
  diagnosticsTabHref?: string;
  validationErrors?: ProviderDischargeValidationErrors | null;
  layoutMode?: EdDispositionLayoutMode;
}) {
  const { t, language } = useI18n();
  const [encounterDiagnoses, setEncounterDiagnoses] = useState<DxRow[]>([]);
  const [diagnosesLoaded, setDiagnosesLoaded] = useState(false);
  const patientLeftEdLocal = isoToDatetimeLocal(providerForm.patientLeftEdAt);

  useEffect(() => {
    if (!patientId) {
      setDiagnosesLoaded(false);
      setEncounterDiagnoses([]);
      return;
    }
    let cancelled = false;
    setDiagnosesLoaded(false);
    (async () => {
      try {
        const data = await apiFetch(`/patients/${patientId}/diagnoses?status=ACTIVE&limit=200`, { facilityId });
        const items = Array.isArray((data as { items?: unknown }).items) ?
          (data as { items: Record<string, unknown>[] }).items
        : [];
        const rows = items
          .filter((d) => d.encounterId === encounterId && (d.status == null || d.status === "ACTIVE"))
          .map((d) => ({
            id: String(d.id),
            code: String(d.code ?? ""),
            description: (d.description as string | null) ?? null,
            sortOrder: typeof d.sortOrder === "number" ? d.sortOrder : 0,
          }))
          .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));
        if (!cancelled) {
          setEncounterDiagnoses(rows);
          setDiagnosesLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setEncounterDiagnoses([]);
          setDiagnosesLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encounterId, facilityId, patientId]);

  useEffect(() => {
    if (!diagnosesLoaded) return;
    const activeIds = new Set(encounterDiagnoses.map((d) => d.id));
    const pruned = pruneDischargeFormAfterDiagnosisRemoval(providerForm, activeIds);
    if (pruned === providerForm) return;
    onProviderFormChange(pruned);
  }, [diagnosesLoaded, encounterDiagnoses, onProviderFormChange, providerForm]);
  const patchProvider = useCallback(
    (patch: Partial<ProviderDischargeDocumentationForm>) => {
      onProviderFormChange({ ...providerForm, ...patch });
    },
    [onProviderFormChange, providerForm]
  );

  const patchDiagnosisDoc = useCallback(
    (docId: string, patch: Partial<ProviderDischargeDiagnosisCard>) => {
      patchProvider({
        diagnosisDocs: providerForm.diagnosisDocs.map((d) => (d.id === docId ? { ...d, ...patch } : d)),
      });
    },
    [patchProvider, providerForm.diagnosisDocs]
  );

  const patchSharedPlanning = useCallback(
    (
      patch: Partial<
        Pick<
          ProviderDischargeDocumentationForm,
          "returnPrecautions" | "returnWorkSchool" | "followUps" | "patientInstructionsGiven"
        >
      >
    ) => {
      patchProvider(patch);
    },
    [patchProvider]
  );

  const applyTemplateToDoc = useCallback(
    (docId: string, overwriteExisting: boolean, providerConfirmed: boolean) => {
      const doc = providerForm.diagnosisDocs.find((d) => d.id === docId);
      if (!doc) return;
      const resolved = resolveProviderDischargeTemplateForDiagnosis({
        code: doc.code,
        displayName: doc.displayName,
      });
      if (resolved.matchLevel === "generic" && !overwriteExisting) return;
      const cardPatch = applyProviderDischargeTemplateToCardByDiagnosis(doc, {
        locale: language,
        overwriteExisting,
        forceOverwrite: overwriteExisting,
        providerConfirmed,
        actor: { appliedAt: new Date().toISOString() },
      });
      const sharedPatch = mergeTemplateSharedFieldsIntoForm(
        providerForm,
        extractSharedFieldsFromTemplate(resolved.template, language),
        {
          overwriteExisting,
        }
      );
      patchProvider({
        diagnosisDocs: providerForm.diagnosisDocs.map((d) => (d.id === docId ? cardPatch : d)),
        ...sharedPatch,
      });
    },
    [language, patchProvider, providerForm]
  );

  const ensureDocForRow = useCallback(
    (row: DxRow, isPrimary: boolean, applyTemplate: boolean): ProviderDischargeDiagnosisCard => {
      const ref: ProviderDischargeDiagnosisRef = {
        encounterDiagnosisId: row.id,
        code: row.code,
        label: row.description?.trim() || row.code,
        isPrimary,
      };
      return ensureProviderDischargeCardForRef(providerForm, ref, {
        applyTemplate,
        locale: language,
        isPrimary,
        displayOrder: row.sortOrder,
      });
    },
    [language, providerForm]
  );

  const mergeSharedFromSelectedDiagnoses = useCallback(
    (form: ProviderDischargeDocumentationForm, locale: "en" | "fr") => {
      const templates = getSelectedDiagnosisDocs(form)
        .map((doc) => resolveProviderDischargeTemplateForDiagnosis({ code: doc.code, displayName: doc.displayName }))
        .filter((r) => r.matchLevel !== "generic")
        .map((r) => extractSharedFieldsFromTemplate(r.template, locale));
      if (!templates.length) return form;
      const overwriteSharedLocale = getSelectedDiagnosisDocs(form).some((doc) =>
        providerDischargeCardNeedsLocaleReapply(doc, locale)
      );
      return {
        ...form,
        ...mergeSharedFieldsFromSelectedTemplates(form, templates, {
          overwriteExisting: overwriteSharedLocale,
        }),
      };
    },
    []
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
    const doc = ensureDocForRow(primary, true, true);
    let nextForm: ProviderDischargeDocumentationForm = {
      ...providerForm,
      diagnosisRefs: [ref],
      diagnosisDocs: [...providerForm.diagnosisDocs.filter((d) => d.id !== doc.id), doc],
    };
    nextForm = mergeSharedFromSelectedDiagnoses(nextForm, language);
    patchProvider(nextForm);
  }, [encounterDiagnoses, ensureDocForRow, language, mergeSharedFromSelectedDiagnoses, patchProvider, providerForm]);

  useEffect(() => {
    autoPopulatePrimary();
  }, [autoPopulatePrimary]);

  const selectedDxIds = useMemo(
    () => new Set(providerForm.diagnosisRefs.map((d) => d.encounterDiagnosisId).filter(Boolean)),
    [providerForm.diagnosisRefs]
  );

  const selectedCards = useMemo(
    () => getSelectedDiagnosisDocs(providerForm),
    [providerForm]
  );

  const showSharedPlanning = selectedCards.length > 0;

  const toggleDiagnosis = (row: DxRow) => {
    const exists = providerForm.diagnosisRefs.find((d) => d.encounterDiagnosisId === row.id);
    if (exists) {
      patchProvider({
        diagnosisRefs: providerForm.diagnosisRefs.filter((d) => d.encounterDiagnosisId !== row.id),
      });
      return;
    }
    const isPrimary = providerForm.diagnosisRefs.length === 0;
    const ref: ProviderDischargeDiagnosisRef = {
      encounterDiagnosisId: row.id,
      code: row.code,
      label: row.description?.trim() || row.code,
      isPrimary,
    };
    const doc = ensureDocForRow(row, isPrimary, true);
    const nextDocs = providerForm.diagnosisDocs.some((d) => d.id === doc.id) ?
      providerForm.diagnosisDocs.map((d) => (d.id === doc.id ? doc : d))
    : [...providerForm.diagnosisDocs, doc];
    let nextForm: ProviderDischargeDocumentationForm = {
      ...providerForm,
      diagnosisRefs: [...providerForm.diagnosisRefs, ref],
      diagnosisDocs: nextDocs,
    };
    nextForm = mergeSharedFromSelectedDiagnoses(nextForm, language);
    patchProvider(nextForm);
  };

  return (
    <div style={edDispositionSectionShellStyle()}>
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
                  style={{ display: "flex", gap: 8, fontSize: 13, color: "#0f172a", cursor: disabled ? "not-allowed" : "pointer", alignItems: "flex-start" }}
                >
                  <input
                    type="checkbox"
                    checked={selectedDxIds.has(dx.id)}
                    disabled={disabled}
                    onChange={() => toggleDiagnosis(dx)}
                    style={{ marginTop: 2, flexShrink: 0 }}
                  />
                  <span style={{ wordBreak: "break-word", minWidth: 0, flex: 1 }}>
                    {dx.code} — {getLocalizedDiagnosisDisplayLabel({ code: dx.code, description: dx.description }, language)}
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
            layoutMode={layoutMode}
            validationErrors={validationErrors?.byDocId[doc.id]}
            onPatchDoc={patchDiagnosisDoc}
            onApplyTemplate={(docId, overwrite) => applyTemplateToDoc(docId, overwrite, true)}
          />
        ))}

        {showSharedPlanning ?
          <SharedDischargePlanningSection
            returnPrecautions={providerForm.returnPrecautions}
            returnWorkSchool={providerForm.returnWorkSchool}
            followUps={providerForm.followUps}
            patientInstructionsGiven={providerForm.patientInstructionsGiven ?? false}
            disabled={disabled}
            validationErrors={validationErrors?.shared}
            layoutMode={layoutMode}
            onPatchShared={patchSharedPlanning}
          />
        : null}
      </div>
    </div>
  );
}

/** Build discharge JSON for disposition save (provider documentation + metadata). */
export function buildProviderDischargeJsonForSave(
  dischargeSummaryJson: unknown,
  providerForm: ProviderDischargeDocumentationForm,
  meta: { documentedAt: string; documentedByDisplayName: string; documentedByTitle?: string },
  canonicalDischargePatch?: Record<string, unknown> | null
): Record<string, unknown> {
  const providerJson = mergeProviderDischargeDocumentationIntoDischargeJson(
    dischargeSummaryJson,
    providerForm,
    meta
  );
  return mergeCanonicalErDispositionIntoDischargeJson(providerJson, canonicalDischargePatch);
}

export { validateProviderDischargeDocumentation } from "./providerDischargeDocumentationModel";
