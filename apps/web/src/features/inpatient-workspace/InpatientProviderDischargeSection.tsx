"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  INPATIENT_CONDITION_AT_DISCHARGE_STATUSES,
  INPATIENT_FINAL_DISPOSITION_CODES,
  INPATIENT_PENDING_STUDY_TYPES,
  emptyInpatientProviderDischarge,
  hydrateInpatientProviderDischarge,
  suggestFinalDispositionFromPlannedDestination,
  type InpatientProviderDischargeDiagnosis,
  type InpatientProviderDischargePendingStudy,
  type InpatientProviderDischargeV1B,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import {
  fetchInpatientProviderDischarge,
  saveInpatientProviderDischarge,
} from "@/features/hospital-care/inpatientOperationsApi";

const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 13,
};

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: 4,
  fontSize: 12,
  fontWeight: 600,
  color: "#334155",
};

const sectionStyle: CSSProperties = {
  ...MEDORA_CARD_SHELL,
  padding: 12,
  display: "grid",
  gap: 10,
};

function newDiagnosisId() {
  return `dx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function newPendingId() {
  return `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function InpatientProviderDischargeSection({
  encounterId,
  canAuthor,
}: {
  encounterId: string;
  canAuthor: boolean;
}) {
  const { t, language } = useI18n();
  const prefix = "inpatientProviderDischargeInpDis1b";
  const dateLocale = language === "en" ? "en-US" : "fr-FR";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [revision, setRevision] = useState(0);
  const [doc, setDoc] = useState<InpatientProviderDischargeV1B>(emptyInpatientProviderDischarge());
  const [plannedDestination, setPlannedDestination] = useState<string | null>(null);
  const [dispositionConfirmed, setDispositionConfirmed] = useState(false);
  const [readOnlyReason, setReadOnlyReason] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchInpatientProviderDischarge(encounterId);
      const hydrated =
        hydrateInpatientProviderDischarge(res.documentation) ?? emptyInpatientProviderDischarge();
      setDoc(hydrated);
      setRevision(res.revision ?? hydrated.revision ?? 0);
      setPlannedDestination(res.planningContext?.plannedDestination ?? null);
      setDispositionConfirmed(Boolean(hydrated.finalDisposition?.code));
      if (res.canAuthor === false && canAuthor) {
        setReadOnlyReason(t(`${prefix}.metadata.readOnly`));
      } else {
        setReadOnlyReason(null);
      }
    } catch {
      setError(t(`${prefix}.errors.load`));
    } finally {
      setLoading(false);
    }
  }, [canAuthor, encounterId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const planningSuggestion = useMemo(
    () => suggestFinalDispositionFromPlannedDestination(plannedDestination),
    [plannedDestination]
  );

  const editable = canAuthor && !readOnlyReason;

  const updateDiagnosis = (index: number, patch: Partial<InpatientProviderDischargeDiagnosis>) => {
    setDoc((prev) => {
      const next = [...prev.dischargeDiagnoses];
      next[index] = { ...next[index]!, ...patch };
      return { ...prev, dischargeDiagnoses: next };
    });
  };

  const addDiagnosis = () => {
    setDoc((prev) => ({
      ...prev,
      dischargeDiagnoses: [
        ...prev.dischargeDiagnoses,
        {
          id: newDiagnosisId(),
          code: "",
          description: "",
          isPrimary: prev.dischargeDiagnoses.length === 0,
          sortOrder: prev.dischargeDiagnoses.length,
        },
      ],
    }));
  };

  const removeDiagnosis = (index: number) => {
    setDoc((prev) => ({
      ...prev,
      dischargeDiagnoses: prev.dischargeDiagnoses.filter((_, i) => i !== index),
    }));
  };

  const setPrimaryDiagnosis = (index: number) => {
    setDoc((prev) => ({
      ...prev,
      dischargeDiagnoses: prev.dischargeDiagnoses.map((row, i) => ({
        ...row,
        isPrimary: i === index,
      })),
    }));
  };

  const addPendingStudy = () => {
    setDoc((prev) => ({
      ...prev,
      pendingStudies: [
        ...prev.pendingStudies,
        {
          id: newPendingId(),
          type: "LAB",
          description: "",
          responsibleParty: "",
          followUpPlan: "",
        },
      ],
    }));
  };

  const updatePendingStudy = (
    index: number,
    patch: Partial<InpatientProviderDischargePendingStudy>
  ) => {
    setDoc((prev) => {
      const next = [...prev.pendingStudies];
      next[index] = { ...next[index]!, ...patch };
      return { ...prev, pendingStudies: next };
    });
  };

  const removePendingStudy = (index: number) => {
    setDoc((prev) => ({
      ...prev,
      pendingStudies: prev.pendingStudies.filter((_, i) => i !== index),
    }));
  };

  const applyPlanningSuggestion = () => {
    if (!planningSuggestion) return;
    setDoc((prev) => ({
      ...prev,
      finalDisposition: {
        code: planningSuggestion,
        labelSnapshot: t(`${prefix}.disposition.${planningSuggestion}`),
      },
    }));
    setDispositionConfirmed(true);
  };

  const save = async (saveMode: "draft" | "complete") => {
    if (!editable) return;
    setSaving(true);
    setError(null);
    setValidationErrors([]);
    try {
      const res = await saveInpatientProviderDischarge(encounterId, {
        documentation: {
          ...doc,
          finalDisposition: doc.finalDisposition
            ? {
                ...doc.finalDisposition,
                labelSnapshot:
                  doc.finalDisposition.labelSnapshot ??
                  t(`${prefix}.disposition.${doc.finalDisposition.code}`),
              }
            : null,
        },
        expectedRevision: revision,
        saveMode,
      });
      const hydrated =
        hydrateInpatientProviderDischarge(res.documentation) ?? emptyInpatientProviderDischarge();
      setDoc(hydrated);
      setRevision(res.revision ?? hydrated.revision ?? 0);
    } catch (e: unknown) {
      const err = e as { status?: number; body?: { errors?: string[]; code?: string } };
      if (err.status === 409) {
        setError(t(`${prefix}.errors.conflict`));
      } else if (err.status === 403) {
        setError(t(`${prefix}.errors.forbidden`));
      } else if (Array.isArray(err.body?.errors)) {
        setValidationErrors(err.body.errors);
      } else {
        setError(t(`${prefix}.errors.save`));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div data-testid="inpatient-provider-discharge-loading" style={sectionStyle}>
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div data-testid="inpatient-provider-discharge-section" style={{ display: "grid", gap: 12 }}>
      <div style={sectionStyle}>
        <h3 style={{ margin: 0, fontSize: 15, color: "#0f172a" }}>{t(`${prefix}.title`)}</h3>
        <div
          data-testid="inpatient-provider-discharge-planning-context"
          style={{
            padding: 10,
            borderRadius: 10,
            background: "#f8fafc",
            border: "1px dashed #cbd5e1",
            fontSize: 12,
            color: "#475569",
          }}
        >
          <strong>{t(`${prefix}.planningContextTitle`)}</strong>
          <p style={{ margin: "6px 0 0" }}>{t(`${prefix}.planningContextHint`)}</p>
          <p style={{ margin: "8px 0 0" }}>
            {t(`${prefix}.plannedDestination`)}:{" "}
            <span data-testid="inpatient-provider-discharge-planned-destination">
              {plannedDestination?.trim() || t(`${prefix}.none`)}
            </span>
          </p>
        </div>
        {readOnlyReason ? (
          <p style={{ margin: 0, color: "#b45309", fontSize: 12 }}>{readOnlyReason}</p>
        ) : null}
        {error ? <p style={{ margin: 0, color: "#b91c1c", fontSize: 12 }}>{error}</p> : null}
        {validationErrors.length ? (
          <ul style={{ margin: 0, paddingLeft: 18, color: "#b91c1c", fontSize: 12 }}>
            {validationErrors.map((code) => (
              <li key={code}>{t(`${prefix}.validation.${code}`)}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <div style={sectionStyle}>
        <h4 style={{ margin: 0, fontSize: 14 }}>{t(`${prefix}.sections.dischargeDiagnoses`)}</h4>
        {doc.dischargeDiagnoses.map((row, index) => (
          <div
            key={row.id}
            data-testid={`inpatient-provider-discharge-diagnosis-${index}`}
            style={{
              display: "grid",
              gap: 8,
              gridTemplateColumns: "1fr 1fr auto",
              alignItems: "end",
            }}
          >
            <label>
              <span style={labelStyle}>{t(`${prefix}.diagnosis.code`)}</span>
              <input
                style={fieldStyle}
                value={row.code ?? ""}
                disabled={!editable}
                onChange={(e) => updateDiagnosis(index, { code: e.target.value })}
              />
            </label>
            <label>
              <span style={labelStyle}>{t(`${prefix}.diagnosis.description`)}</span>
              <input
                style={fieldStyle}
                value={row.description}
                disabled={!editable}
                onChange={(e) => updateDiagnosis(index, { description: e.target.value })}
              />
            </label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={!editable || row.isPrimary}
                onClick={() => setPrimaryDiagnosis(index)}
              >
                {row.isPrimary
                  ? t(`${prefix}.diagnosis.primary`)
                  : t(`${prefix}.diagnosis.setPrimary`)}
              </button>
              <button type="button" disabled={!editable} onClick={() => removeDiagnosis(index)}>
                {t(`${prefix}.diagnosis.remove`)}
              </button>
            </div>
          </div>
        ))}
        {editable ? (
          <button type="button" data-testid="inpatient-provider-discharge-add-diagnosis" onClick={addDiagnosis}>
            {t(`${prefix}.diagnosis.add`)}
          </button>
        ) : null}
      </div>

      <div style={sectionStyle}>
        <label>
          <span style={labelStyle}>{t(`${prefix}.sections.admissionDiagnosis`)}</span>
          <input
            style={fieldStyle}
            disabled={!editable}
            value={doc.admissionDiagnosis?.description ?? ""}
            onChange={(e) =>
              setDoc((prev) => ({
                ...prev,
                admissionDiagnosis: { description: e.target.value, code: prev.admissionDiagnosis?.code ?? null },
              }))
            }
          />
        </label>
        <label>
          <span style={labelStyle}>{t(`${prefix}.sections.reasonForHospitalization`)}</span>
          <textarea
            style={{ ...fieldStyle, minHeight: 72 }}
            disabled={!editable}
            value={doc.reasonForHospitalization ?? ""}
            onChange={(e) => setDoc((prev) => ({ ...prev, reasonForHospitalization: e.target.value }))}
          />
        </label>
        <label>
          <span style={labelStyle}>{t(`${prefix}.sections.hospitalCourse`)}</span>
          <textarea
            style={{ ...fieldStyle, minHeight: 120 }}
            disabled={!editable}
            value={doc.hospitalCourse ?? ""}
            onChange={(e) => setDoc((prev) => ({ ...prev, hospitalCourse: e.target.value }))}
          />
        </label>
        <label>
          <span style={labelStyle}>{t(`${prefix}.sections.significantFindings`)}</span>
          <textarea
            style={{ ...fieldStyle, minHeight: 72 }}
            disabled={!editable}
            value={doc.significantFindings ?? ""}
            onChange={(e) => setDoc((prev) => ({ ...prev, significantFindings: e.target.value }))}
          />
        </label>
        <label>
          <span style={labelStyle}>{t(`${prefix}.sections.proceduresAndTreatments`)}</span>
          <textarea
            style={{ ...fieldStyle, minHeight: 72 }}
            disabled={!editable}
            value={doc.proceduresAndTreatments ?? ""}
            onChange={(e) =>
              setDoc((prev) => ({ ...prev, proceduresAndTreatments: e.target.value }))
            }
          />
        </label>
        <label>
          <span style={labelStyle}>{t(`${prefix}.sections.consultations`)}</span>
          <textarea
            style={{ ...fieldStyle, minHeight: 72 }}
            disabled={!editable}
            value={doc.consultations ?? ""}
            onChange={(e) => setDoc((prev) => ({ ...prev, consultations: e.target.value }))}
          />
        </label>
        <label>
          <span style={labelStyle}>{t(`${prefix}.sections.complications`)}</span>
          <textarea
            style={{ ...fieldStyle, minHeight: 72 }}
            disabled={!editable}
            value={doc.complications ?? ""}
            onChange={(e) => setDoc((prev) => ({ ...prev, complications: e.target.value }))}
          />
        </label>
      </div>

      <div style={sectionStyle}>
        <h4 style={{ margin: 0, fontSize: 14 }}>{t(`${prefix}.sections.conditionAtDischarge`)}</h4>
        <select
          style={fieldStyle}
          disabled={!editable}
          value={doc.conditionAtDischarge?.status ?? ""}
          onChange={(e) => {
            const status = e.target.value;
            if (!status) {
              setDoc((prev) => ({ ...prev, conditionAtDischarge: null }));
              return;
            }
            setDoc((prev) => ({
              ...prev,
              conditionAtDischarge: {
                status: status as (typeof INPATIENT_CONDITION_AT_DISCHARGE_STATUSES)[number],
                narrative: prev.conditionAtDischarge?.narrative ?? null,
              },
            }));
          }}
        >
          <option value="">—</option>
          {INPATIENT_CONDITION_AT_DISCHARGE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(`${prefix}.condition.${status}`)}
            </option>
          ))}
        </select>
        {doc.conditionAtDischarge?.status === "OTHER" ? (
          <label>
            <span style={labelStyle}>{t(`${prefix}.condition.narrative`)}</span>
            <input
              style={fieldStyle}
              disabled={!editable}
              value={doc.conditionAtDischarge?.narrative ?? ""}
              onChange={(e) =>
                setDoc((prev) => ({
                  ...prev,
                  conditionAtDischarge: {
                    status: "OTHER",
                    narrative: e.target.value,
                  },
                }))
              }
            />
          </label>
        ) : null}
      </div>

      <div style={sectionStyle}>
        <h4 style={{ margin: 0, fontSize: 14 }}>{t(`${prefix}.sections.finalDisposition`)}</h4>
        {planningSuggestion && editable ? (
          <button type="button" onClick={applyPlanningSuggestion}>
            {t(`${prefix}.disposition.usePlanningSuggestion`)} ({t(`${prefix}.disposition.${planningSuggestion}`)})
          </button>
        ) : null}
        <select
          data-testid="inpatient-provider-discharge-final-disposition"
          style={fieldStyle}
          disabled={!editable}
          value={doc.finalDisposition?.code ?? ""}
          onChange={(e) => {
            const code = e.target.value;
            setDoc((prev) => ({
              ...prev,
              finalDisposition: code
                ? { code, labelSnapshot: t(`${prefix}.disposition.${code}`) }
                : null,
            }));
            setDispositionConfirmed(true);
          }}
        >
          <option value="">—</option>
          {INPATIENT_FINAL_DISPOSITION_CODES.map((code) => (
            <option key={code} value={code}>
              {t(`${prefix}.disposition.${code}`)}
            </option>
          ))}
        </select>
        <label>
          <span style={labelStyle}>{t(`${prefix}.disposition.destinationDetails`)}</span>
          <input
            style={fieldStyle}
            disabled={!editable}
            value={doc.finalDisposition?.destinationDetails ?? ""}
            onChange={(e) =>
              setDoc((prev) => ({
                ...prev,
                finalDisposition: prev.finalDisposition
                  ? { ...prev.finalDisposition, destinationDetails: e.target.value }
                  : null,
              }))
            }
          />
        </label>
        {dispositionConfirmed ? (
          <p style={{ margin: 0, fontSize: 12, color: "#047857" }}>
            {t(`${prefix}.disposition.confirmExplicit`)}
          </p>
        ) : null}
      </div>

      <div style={sectionStyle}>
        <h4 style={{ margin: 0, fontSize: 14 }}>{t(`${prefix}.sections.pendingStudies`)}</h4>
        {doc.pendingStudies.map((row, index) => (
          <div key={row.id} style={{ display: "grid", gap: 8 }}>
            <select
              style={fieldStyle}
              disabled={!editable}
              value={row.type}
              onChange={(e) =>
                updatePendingStudy(index, {
                  type: e.target.value as InpatientProviderDischargePendingStudy["type"],
                })
              }
            >
              {INPATIENT_PENDING_STUDY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`${prefix}.pendingStudy.types.${type}`)}
                </option>
              ))}
            </select>
            <input
              style={fieldStyle}
              disabled={!editable}
              placeholder={t(`${prefix}.pendingStudy.description`)}
              value={row.description}
              onChange={(e) => updatePendingStudy(index, { description: e.target.value })}
            />
            <input
              style={fieldStyle}
              disabled={!editable}
              placeholder={t(`${prefix}.pendingStudy.responsibleParty`)}
              value={row.responsibleParty ?? ""}
              onChange={(e) => updatePendingStudy(index, { responsibleParty: e.target.value })}
            />
            <input
              style={fieldStyle}
              disabled={!editable}
              placeholder={t(`${prefix}.pendingStudy.followUpPlan`)}
              value={row.followUpPlan ?? ""}
              onChange={(e) => updatePendingStudy(index, { followUpPlan: e.target.value })}
            />
            {editable ? (
              <button type="button" onClick={() => removePendingStudy(index)}>
                {t(`${prefix}.pendingStudy.remove`)}
              </button>
            ) : null}
          </div>
        ))}
        {editable ? (
          <button type="button" onClick={addPendingStudy}>
            {t(`${prefix}.pendingStudy.add`)}
          </button>
        ) : null}
      </div>

      {(doc.documentedByDisplayNameSnapshot || doc.documentedAt) && (
        <div style={sectionStyle} data-testid="inpatient-provider-discharge-metadata">
          <h4 style={{ margin: 0, fontSize: 14 }}>{t(`${prefix}.sections.metadata`)}</h4>
          {doc.documentedByDisplayNameSnapshot ? (
            <p style={{ margin: 0, fontSize: 12 }}>
              {t(`${prefix}.metadata.documentedBy`)}: {doc.documentedByDisplayNameSnapshot}
              {doc.documentedByProfessionalTitleSnapshot
                ? ` (${doc.documentedByProfessionalTitleSnapshot})`
                : ""}
            </p>
          ) : null}
          {doc.documentedAt ? (
            <p style={{ margin: 0, fontSize: 12 }}>
              {t(`${prefix}.metadata.documentedAt`)}:{" "}
              {new Date(doc.documentedAt).toLocaleString(dateLocale)}
            </p>
          ) : null}
          {doc.lastUpdatedAt ? (
            <p style={{ margin: 0, fontSize: 12 }}>
              {t(`${prefix}.metadata.lastUpdatedAt`)}:{" "}
              {new Date(doc.lastUpdatedAt).toLocaleString(dateLocale)}
            </p>
          ) : null}
        </div>
      )}

      {editable ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            data-testid="inpatient-provider-discharge-save-draft"
            disabled={saving}
            onClick={() => void save("draft")}
          >
            {saving ? t(`${prefix}.actions.saving`) : t(`${prefix}.actions.saveDraft`)}
          </button>
          <button
            type="button"
            data-testid="inpatient-provider-discharge-save-complete"
            disabled={saving}
            onClick={() => void save("complete")}
          >
            {saving ? t(`${prefix}.actions.saving`) : t(`${prefix}.actions.saveComplete`)}
          </button>
          <button type="button" disabled={saving} onClick={() => void load()}>
            {t(`${prefix}.actions.reload`)}
          </button>
        </div>
      ) : null}
    </div>
  );
}
