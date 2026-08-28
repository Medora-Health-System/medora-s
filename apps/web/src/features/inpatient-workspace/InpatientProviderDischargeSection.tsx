"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  INPATIENT_CONDITION_AT_DISCHARGE_STATUSES,
  INPATIENT_FINAL_DISPOSITION_CODES,
  INPATIENT_PENDING_STUDY_TYPES,
  INPATIENT_TRANSFER_REASONS,
  INPATIENT_TRANSFER_SERVICES,
  INPATIENT_TRANSPORT_MODES,
  buildInpatientDischargeChartDraft,
  dispositionRequiresConditionAtDischarge,
  dispositionSkipsPatientInstructionRequirement,
  dispositionUsesHomeInstructionEngine,
  emptyInpatientProviderDischarge,
  hydrateInpatientProviderDischarge1C,
  instantToLocalDateTimeInput,
  localDateTimeInputToIso,
  markClinicianEditedField,
  mergeChartDraftPreservingClinicianEdits,
  projectInpatientDischargeReadiness,
  suggestFinalDispositionFromPlannedDestination1C,
  type DischargeReadinessChip,
  type InpatientDischargeChartSnapshot,
  type InpatientDischargeFollowUp1C,
  type InpatientFinalDisposition1C,
  type InpatientPatientInstructions1C,
  type InpatientProviderDischargeDiagnosis,
  type InpatientProviderDischargePendingStudy,
  type InpatientProviderDischargeV1C,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import {
  fetchInpatientProviderDischarge,
  saveInpatientProviderDischarge,
} from "@/features/hospital-care/inpatientOperationsApi";
import { generateInpatientPatientInstructionsFromDiagnoses } from "./inpatientPatientInstructionsFromDiagnoses";

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

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div style={sectionStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <h4 style={{ margin: 0, fontSize: 14 }}>{title}</h4>
        {action}
      </div>
      {children}
    </div>
  );
}

function ReadinessRow({ chips, t }: { chips: DischargeReadinessChip[]; t: (k: string) => string }) {
  const prefix = "inpatientProviderDischargeInpDis1b";
  const color = (s: DischargeReadinessChip["status"]) =>
    s === "complete" ? "#047857" : s === "attention" ? "#b45309" : s === "not_applicable" ? "#94a3b8" : "#64748b";
  const mark = (s: DischargeReadinessChip["status"]) =>
    s === "complete" ? "✓" : s === "attention" ? "!" : s === "not_applicable" ? "—" : "○";
  return (
    <div data-testid="inpatient-discharge-readiness" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {chips.map((chip) => (
        <span
          key={chip.id}
          style={{
            fontSize: 12,
            padding: "4px 10px",
            borderRadius: 9999,
            border: `1px solid ${color(chip.status)}33`,
            color: color(chip.status),
            background: "#fff",
            fontWeight: 600,
          }}
        >
          {mark(chip.status)} {t(`${prefix}.readiness.${chip.id}`)}
        </span>
      ))}
    </div>
  );
}

export function InpatientProviderDischargeSection({
  encounterId,
  canAuthor,
  facilityDisplayName = "Hospital",
}: {
  encounterId: string;
  canAuthor: boolean;
  facilityDisplayName?: string;
}) {
  const { t, language } = useI18n();
  const prefix = "inpatientProviderDischargeInpDis1b";
  const dateLocale = language === "en" ? "en-US" : "fr-FR";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [revision, setRevision] = useState(0);
  const [doc, setDoc] = useState<InpatientProviderDischargeV1C>(
    emptyInpatientProviderDischarge() as InpatientProviderDischargeV1C
  );
  const [plannedDestination, setPlannedDestination] = useState<string | null>(null);
  const [chartBootstrap, setChartBootstrap] = useState<InpatientDischargeChartSnapshot | null>(null);
  const [readiness, setReadiness] = useState<DischargeReadinessChip[]>([]);
  const [dispositionConfirmed, setDispositionConfirmed] = useState(false);
  const [readOnlyReason, setReadOnlyReason] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchInpatientProviderDischarge(encounterId);
      const hydrated =
        hydrateInpatientProviderDischarge1C(res.documentation) ??
        (emptyInpatientProviderDischarge() as InpatientProviderDischargeV1C);
      setDoc(hydrated);
      setRevision(res.revision ?? hydrated.revision ?? 0);
      setPlannedDestination(res.planningContext?.plannedDestination ?? null);
      setChartBootstrap((res.chartBootstrap as InpatientDischargeChartSnapshot) ?? null);
      setReadiness(
        (res.readiness as DischargeReadinessChip[]) ??
          projectInpatientDischargeReadiness(hydrated)
      );
      setDispositionConfirmed(Boolean(hydrated.finalDisposition?.code));
      setReadOnlyReason(res.canAuthor === false && canAuthor ? t(`${prefix}.metadata.readOnly`) : null);
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
    () => suggestFinalDispositionFromPlannedDestination1C(plannedDestination),
    [plannedDestination]
  );

  const editable = canAuthor && !readOnlyReason;
  const dispositionCode = doc.finalDisposition?.code?.toUpperCase() ?? "";
  const showHomeInstructions = dispositionUsesHomeInstructionEngine(dispositionCode);
  const skipInstructions = dispositionSkipsPatientInstructionRequirement(dispositionCode);
  const showCondition = dispositionRequiresConditionAtDischarge(dispositionCode);

  const touchField = (field: string) => {
    setDoc((prev) => ({
      ...prev,
      fieldProvenance: markClinicianEditedField(prev.fieldProvenance, field),
    }));
  };

  const setDisposition = (code: string) => {
    const next: InpatientFinalDisposition1C = {
      ...(doc.finalDisposition ?? { code }),
      code,
      labelSnapshot: code ? t(`${prefix}.disposition.${code}`) : null,
    };
    setDoc((prev) => ({ ...prev, finalDisposition: code ? next : null }));
    setDispositionConfirmed(Boolean(code));
    touchField("finalDisposition");
  };

  const patchDispositionDetails = (patch: Partial<InpatientFinalDisposition1C>) => {
    setDoc((prev) => ({
      ...prev,
      finalDisposition: prev.finalDisposition
        ? { ...prev.finalDisposition, ...patch }
        : ({ code: dispositionCode, ...patch } as InpatientFinalDisposition1C),
    }));
    touchField("finalDisposition");
  };

  const refreshFromChart = () => {
    if (!chartBootstrap) return;
    const edited = doc.fieldProvenance?.clinicianEditedFields ?? [];
    const draft = buildInpatientDischargeChartDraft({
      ...chartBootstrap,
      dischargeDiagnoses: doc.dischargeDiagnoses.length
        ? doc.dischargeDiagnoses
        : chartBootstrap.dischargeDiagnoses,
      language: language === "en" ? "en" : "fr",
    });
    if (edited.length) {
      const replaceEdited = window.confirm(t(`${prefix}.refreshConfirm`));
      if (!replaceEdited) {
        const { next } = mergeChartDraftPreservingClinicianEdits({
          existing: doc,
          draft,
          forceReplaceFields: [],
        });
        setDoc(next);
        return;
      }
      const { next } = mergeChartDraftPreservingClinicianEdits({
        existing: doc,
        draft,
        forceReplaceFields: edited,
      });
      setDoc(next);
      return;
    }
    const { next } = mergeChartDraftPreservingClinicianEdits({
      existing: doc,
      draft,
      forceReplaceFields: [],
    });
    setDoc(next);
  };

  const generateInstructions = () => {
    if (!doc.dischargeDiagnoses.length) return;
    const { instructions, followUps } = generateInpatientPatientInstructionsFromDiagnoses({
      diagnoses: doc.dischargeDiagnoses,
      locale: language === "en" ? "en" : "fr",
      facilityDisplayName,
    });
    setDoc((prev) => ({
      ...prev,
      patientInstructions: {
        ...instructions,
        clinicianEdited: false,
      },
      followUps: followUps.length ? followUps : prev.followUps ?? [],
      fieldProvenance: {
        ...prev.fieldProvenance,
        lastInstructionDraftAt: new Date().toISOString(),
      },
    }));
  };

  const updateDiagnosis = (index: number, patch: Partial<InpatientProviderDischargeDiagnosis>) => {
    setDoc((prev) => {
      const next = [...prev.dischargeDiagnoses];
      next[index] = { ...next[index]!, ...patch };
      return {
        ...prev,
        dischargeDiagnoses: next,
        fieldProvenance: markClinicianEditedField(prev.fieldProvenance, "dischargeDiagnoses"),
      };
    });
  };

  const save = async (saveMode: "draft" | "complete") => {
    if (!editable) return;
    setSaving(true);
    setError(null);
    setValidationErrors([]);
    try {
      const res = await saveInpatientProviderDischarge(encounterId, {
        documentation: doc as unknown as Record<string, unknown>,
        expectedRevision: revision,
        saveMode,
      });
      const hydrated =
        hydrateInpatientProviderDischarge1C(res.documentation) ??
        (emptyInpatientProviderDischarge() as InpatientProviderDischargeV1C);
      setDoc(hydrated);
      setRevision(res.revision ?? hydrated.revision ?? 0);
      if (Array.isArray((res as { readiness?: DischargeReadinessChip[] }).readiness)) {
        setReadiness((res as { readiness: DischargeReadinessChip[] }).readiness);
      } else {
        setReadiness(projectInpatientDischargeReadiness(hydrated));
      }
    } catch (e: unknown) {
      const err = e as { status?: number; body?: { errors?: string[] } };
      if (err.status === 409) setError(t(`${prefix}.errors.conflict`));
      else if (err.status === 403) setError(t(`${prefix}.errors.forbidden`));
      else if (Array.isArray(err.body?.errors)) setValidationErrors(err.body.errors);
      else setError(t(`${prefix}.errors.save`));
    } finally {
      setSaving(false);
    }
  };

  // Auto-build once when empty and chart data available
  useEffect(() => {
    if (!editable || loading || !chartBootstrap) return;
    const empty =
      !doc.hospitalCourse &&
      !doc.reasonForHospitalization &&
      doc.dischargeDiagnoses.length === 0 &&
      !doc.documentedAt;
    if (!empty) return;
    const draft = buildInpatientDischargeChartDraft({
      ...chartBootstrap,
      language: language === "en" ? "en" : "fr",
    });
    const { next } = mergeChartDraftPreservingClinicianEdits({ existing: doc, draft });
    setDoc(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot seed
  }, [loading, chartBootstrap, editable]);

  if (loading) {
    return (
      <div data-testid="inpatient-provider-discharge-loading" style={sectionStyle}>
        {t("common.loading")}
      </div>
    );
  }

  const instructions: InpatientPatientInstructions1C = doc.patientInstructions ?? {};

  return (
    <div data-testid="inpatient-provider-discharge-section" style={{ display: "grid", gap: 12 }}>
      <Section title={t(`${prefix}.title`)}>
        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{t(`${prefix}.readinessHint`)}</p>
        <ReadinessRow chips={readiness.length ? readiness : projectInpatientDischargeReadiness(doc)} t={t} />
        {editable ? (
          <button type="button" data-testid="inpatient-discharge-refresh-chart" onClick={() => refreshFromChart()}>
            {t(`${prefix}.refreshFromChart`)}
          </button>
        ) : null}
        {error ? <p style={{ margin: 0, color: "#b91c1c", fontSize: 12 }}>{error}</p> : null}
        {validationErrors.length ? (
          <ul style={{ margin: 0, paddingLeft: 18, color: "#b91c1c", fontSize: 12 }}>
            {validationErrors.map((code) => (
              <li key={code}>{t(`${prefix}.validation.${code}`)}</li>
            ))}
          </ul>
        ) : null}
      </Section>

      <div
        data-testid="inpatient-provider-discharge-planning-context"
        style={{ ...sectionStyle, borderStyle: "dashed" }}
      >
        <strong>{t(`${prefix}.planningContextTitle`)}</strong>
        <p style={{ margin: 0, fontSize: 12, color: "#475569" }}>{t(`${prefix}.planningContextHint`)}</p>
        <p style={{ margin: 0, fontSize: 12 }}>
          {t(`${prefix}.plannedDestination`)}:{" "}
          <span data-testid="inpatient-provider-discharge-planned-destination">
            {plannedDestination?.trim() || t(`${prefix}.none`)}
          </span>
        </p>
        {planningSuggestion && editable ? (
          <button
            type="button"
            data-testid="inpatient-discharge-confirm-planned"
            onClick={() => setDisposition(planningSuggestion)}
          >
            {t(`${prefix}.usePlannedSuggestion`)} ({t(`${prefix}.disposition.${planningSuggestion}`)})
          </button>
        ) : null}
      </div>

      <Section title={t(`${prefix}.sections.dischargeDiagnoses`)}>
        {doc.dischargeDiagnoses.map((row, index) => (
          <div key={row.id} style={{ display: "grid", gap: 6, gridTemplateColumns: "1fr 2fr auto", alignItems: "end" }}>
            <label>
              <span style={labelStyle}>{t(`${prefix}.diagnosis.code`)}</span>
              <input
                style={fieldStyle}
                disabled={!editable}
                value={row.code ?? ""}
                onChange={(e) => updateDiagnosis(index, { code: e.target.value })}
              />
            </label>
            <label>
              <span style={labelStyle}>{t(`${prefix}.diagnosis.description`)}</span>
              <input
                style={fieldStyle}
                disabled={!editable}
                value={row.description}
                onChange={(e) => updateDiagnosis(index, { description: e.target.value })}
              />
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" disabled={!editable || row.isPrimary} onClick={() => {
                setDoc((prev) => ({
                  ...prev,
                  dischargeDiagnoses: prev.dischargeDiagnoses.map((d, i) => ({
                    ...d,
                    isPrimary: i === index,
                  })),
                  fieldProvenance: markClinicianEditedField(prev.fieldProvenance, "dischargeDiagnoses"),
                }));
              }}>
                {row.isPrimary ? t(`${prefix}.diagnosis.primary`) : t(`${prefix}.diagnosis.setPrimary`)}
              </button>
              <button
                type="button"
                disabled={!editable}
                onClick={() =>
                  setDoc((prev) => ({
                    ...prev,
                    dischargeDiagnoses: prev.dischargeDiagnoses.filter((_, i) => i !== index),
                    fieldProvenance: markClinicianEditedField(prev.fieldProvenance, "dischargeDiagnoses"),
                  }))
                }
              >
                {t(`${prefix}.diagnosis.remove`)}
              </button>
            </div>
          </div>
        ))}
        {editable ? (
          <button
            type="button"
            data-testid="inpatient-provider-discharge-add-diagnosis"
            onClick={() =>
              setDoc((prev) => ({
                ...prev,
                dischargeDiagnoses: [
                  ...prev.dischargeDiagnoses,
                  {
                    id: newId("dx"),
                    code: "",
                    description: "",
                    isPrimary: prev.dischargeDiagnoses.length === 0,
                    sortOrder: prev.dischargeDiagnoses.length,
                  },
                ],
                fieldProvenance: markClinicianEditedField(prev.fieldProvenance, "dischargeDiagnoses"),
              }))
            }
          >
            {t(`${prefix}.diagnosis.add`)}
          </button>
        ) : null}
      </Section>

      <Section title={t(`${prefix}.sections.hospitalCourse`)}>
        <label>
          <span style={labelStyle}>{t(`${prefix}.sections.admissionDiagnosis`)}</span>
          <input
            style={fieldStyle}
            disabled={!editable}
            value={doc.admissionDiagnosis?.description ?? ""}
            onChange={(e) => {
              touchField("admissionDiagnosis");
              setDoc((prev) => ({
                ...prev,
                admissionDiagnosis: { description: e.target.value, code: prev.admissionDiagnosis?.code ?? null },
              }));
            }}
          />
        </label>
        <label>
          <span style={labelStyle}>{t(`${prefix}.sections.reasonForHospitalization`)}</span>
          <textarea
            style={{ ...fieldStyle, minHeight: 56 }}
            disabled={!editable}
            value={doc.reasonForHospitalization ?? ""}
            onChange={(e) => {
              touchField("reasonForHospitalization");
              setDoc((prev) => ({ ...prev, reasonForHospitalization: e.target.value }));
            }}
          />
        </label>
        <label>
          <span style={labelStyle}>{t(`${prefix}.sections.hospitalCourse`)}</span>
          <textarea
            style={{ ...fieldStyle, minHeight: 100 }}
            disabled={!editable}
            value={doc.hospitalCourse ?? ""}
            onChange={(e) => {
              touchField("hospitalCourse");
              setDoc((prev) => ({ ...prev, hospitalCourse: e.target.value }));
            }}
          />
        </label>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
          <label>
            <span style={labelStyle}>{t(`${prefix}.sections.consultations`)}</span>
            <textarea
              style={{ ...fieldStyle, minHeight: 56 }}
              disabled={!editable}
              value={doc.consultations ?? ""}
              onChange={(e) => {
                touchField("consultations");
                setDoc((prev) => ({ ...prev, consultations: e.target.value }));
              }}
            />
          </label>
          <label>
            <span style={labelStyle}>{t(`${prefix}.sections.proceduresAndTreatments`)}</span>
            <textarea
              style={{ ...fieldStyle, minHeight: 56 }}
              disabled={!editable}
              value={doc.proceduresAndTreatments ?? ""}
              onChange={(e) => {
                touchField("proceduresAndTreatments");
                setDoc((prev) => ({ ...prev, proceduresAndTreatments: e.target.value }));
              }}
            />
          </label>
        </div>
        <label>
          <span style={labelStyle}>{t(`${prefix}.sections.significantFindings`)}</span>
          <textarea
            style={{ ...fieldStyle, minHeight: 56 }}
            disabled={!editable}
            value={doc.significantFindings ?? ""}
            onChange={(e) => {
              touchField("significantFindings");
              setDoc((prev) => ({ ...prev, significantFindings: e.target.value }));
            }}
          />
        </label>
        <label>
          <span style={labelStyle}>{t(`${prefix}.sections.complications`)}</span>
          <input
            style={fieldStyle}
            disabled={!editable}
            value={doc.complications ?? ""}
            onChange={(e) => {
              touchField("complications");
              setDoc((prev) => ({ ...prev, complications: e.target.value }));
            }}
          />
        </label>
      </Section>

      <Section title={t(`${prefix}.sections.finalDisposition`)}>
        <select
          data-testid="inpatient-provider-discharge-final-disposition"
          style={fieldStyle}
          disabled={!editable}
          value={dispositionCode}
          onChange={(e) => setDisposition(e.target.value)}
        >
          <option value="">—</option>
          {INPATIENT_FINAL_DISPOSITION_CODES.map((code) => (
            <option key={code} value={code}>
              {t(`${prefix}.disposition.${code}`)}
            </option>
          ))}
        </select>
        {dispositionConfirmed ? (
          <p style={{ margin: 0, fontSize: 12, color: "#047857" }}>{t(`${prefix}.disposition.confirmExplicit`)}</p>
        ) : null}

        {showCondition ? (
          <>
            <label>
              <span style={labelStyle}>{t(`${prefix}.sections.conditionAtDischarge`)}</span>
              <select
                style={fieldStyle}
                disabled={!editable}
                value={doc.conditionAtDischarge?.status ?? ""}
                onChange={(e) => {
                  const status = e.target.value;
                  setDoc((prev) => ({
                    ...prev,
                    conditionAtDischarge: status
                      ? {
                          status: status as (typeof INPATIENT_CONDITION_AT_DISCHARGE_STATUSES)[number],
                          narrative: prev.conditionAtDischarge?.narrative ?? null,
                        }
                      : null,
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
            </label>
            {doc.conditionAtDischarge?.status === "OTHER" ? (
              <input
                style={fieldStyle}
                disabled={!editable}
                placeholder={t(`${prefix}.condition.narrative`)}
                value={doc.conditionAtDischarge.narrative ?? ""}
                onChange={(e) =>
                  setDoc((prev) => ({
                    ...prev,
                    conditionAtDischarge: { status: "OTHER", narrative: e.target.value },
                  }))
                }
              />
            ) : null}
          </>
        ) : null}

        {dispositionCode === "TRANSFER_ACUTE_CARE" || dispositionCode === "BEHAVIORAL_HEALTH_FACILITY" ? (
          <div data-testid="inpatient-discharge-transfer-details" style={{ display: "grid", gap: 8 }}>
            <input
              style={fieldStyle}
              disabled={!editable}
              placeholder={t(`${prefix}.disposition.receivingHospital`)}
              value={doc.finalDisposition?.transfer?.receivingHospital ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  transfer: { ...doc.finalDisposition?.transfer, receivingHospital: e.target.value },
                })
              }
            />
            <select
              style={fieldStyle}
              disabled={!editable}
              value={doc.finalDisposition?.transfer?.receivingService ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  transfer: { ...doc.finalDisposition?.transfer, receivingService: e.target.value },
                })
              }
            >
              <option value="">— {t(`${prefix}.disposition.receivingService`)}</option>
              {INPATIENT_TRANSFER_SERVICES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <input
              style={fieldStyle}
              disabled={!editable}
              placeholder={t(`${prefix}.disposition.receivingPhysician`)}
              value={doc.finalDisposition?.transfer?.receivingPhysician ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  transfer: { ...doc.finalDisposition?.transfer, receivingPhysician: e.target.value },
                })
              }
            />
            <select
              style={fieldStyle}
              disabled={!editable}
              value={doc.finalDisposition?.transfer?.reasonCode ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  transfer: { ...doc.finalDisposition?.transfer, reasonCode: e.target.value },
                })
              }
            >
              <option value="">— {t(`${prefix}.disposition.transferReason`)}</option>
              {INPATIENT_TRANSFER_REASONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <select
              style={fieldStyle}
              disabled={!editable}
              value={doc.finalDisposition?.transfer?.transportMode ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  transfer: { ...doc.finalDisposition?.transfer, transportMode: e.target.value },
                })
              }
            >
              <option value="">— {t(`${prefix}.disposition.transportMode`)}</option>
              {INPATIENT_TRANSPORT_MODES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {dispositionCode === "SKILLED_NURSING_FACILITY" ||
        dispositionCode === "ACUTE_REHAB" ||
        dispositionCode === "LONG_TERM_ACUTE_CARE" ||
        dispositionCode === "ASSISTED_LIVING" ||
        dispositionCode === "HOSPICE" ? (
          <div data-testid="inpatient-discharge-snf-details" style={{ display: "grid", gap: 8 }}>
            <input
              style={fieldStyle}
              disabled={!editable}
              placeholder={t(`${prefix}.disposition.facilityName`)}
              value={doc.finalDisposition?.snf?.facilityName ?? doc.finalDisposition?.destinationDetails ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  snf: { ...doc.finalDisposition?.snf, facilityName: e.target.value },
                  destinationDetails: e.target.value,
                })
              }
            />
            <input
              style={fieldStyle}
              disabled={!editable}
              placeholder={t(`${prefix}.disposition.facilityAddress`)}
              value={doc.finalDisposition?.snf?.facilityAddress ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  snf: { ...doc.finalDisposition?.snf, facilityAddress: e.target.value },
                })
              }
            />
            <input
              style={fieldStyle}
              disabled={!editable}
              placeholder={t(`${prefix}.disposition.facilityPhone`)}
              value={doc.finalDisposition?.snf?.facilityPhone ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  snf: { ...doc.finalDisposition?.snf, facilityPhone: e.target.value },
                })
              }
            />
          </div>
        ) : null}

        {dispositionCode === "HOME_WITH_HOME_HEALTH" ? (
          <input
            style={fieldStyle}
            disabled={!editable}
            placeholder={t(`${prefix}.disposition.agencyName`)}
            value={doc.finalDisposition?.homeHealth?.agencyName ?? ""}
            onChange={(e) =>
              patchDispositionDetails({
                homeHealth: { ...doc.finalDisposition?.homeHealth, agencyName: e.target.value },
              })
            }
          />
        ) : null}

        {dispositionCode === "CORRECTIONAL_FACILITY" ? (
          <div data-testid="inpatient-discharge-correctional-details" style={{ display: "grid", gap: 8 }}>
            <input
              style={fieldStyle}
              disabled={!editable}
              placeholder={t(`${prefix}.disposition.facilityName`)}
              value={doc.finalDisposition?.correctional?.facilityName ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  correctional: { ...doc.finalDisposition?.correctional, facilityName: e.target.value },
                })
              }
            />
            <input
              style={fieldStyle}
              disabled={!editable}
              placeholder={t(`${prefix}.disposition.agencyName`)}
              value={doc.finalDisposition?.correctional?.agencyName ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  correctional: { ...doc.finalDisposition?.correctional, agencyName: e.target.value },
                })
              }
            />
            <input
              style={fieldStyle}
              disabled={!editable}
              placeholder={t(`${prefix}.disposition.officerName`)}
              value={doc.finalDisposition?.correctional?.officerName ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  correctional: { ...doc.finalDisposition?.correctional, officerName: e.target.value },
                })
              }
            />
          </div>
        ) : null}

        {dispositionCode === "ELOPED" ? (
          <div data-testid="inpatient-discharge-eloped-details" style={{ display: "grid", gap: 8 }}>
            <input
              style={fieldStyle}
              disabled={!editable}
              placeholder={t(`${prefix}.disposition.lastKnownAt`)}
              value={doc.finalDisposition?.eloped?.lastKnownAt ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  eloped: { ...doc.finalDisposition?.eloped, lastKnownAt: e.target.value },
                })
              }
            />
            <input
              style={fieldStyle}
              disabled={!editable}
              placeholder={t(`${prefix}.disposition.lastKnownLocation`)}
              value={doc.finalDisposition?.eloped?.lastKnownLocation ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  eloped: { ...doc.finalDisposition?.eloped, lastKnownLocation: e.target.value },
                })
              }
            />
          </div>
        ) : null}

        {dispositionCode === "DECEASED" ? (
          <div data-testid="inpatient-discharge-deceased-details" style={{ display: "grid", gap: 8 }}>
            <input
              style={fieldStyle}
              disabled={!editable}
              type="datetime-local"
              placeholder={t(`${prefix}.disposition.pronouncedAt`)}
              value={instantToLocalDateTimeInput(doc.finalDisposition?.deceased?.pronouncedAt)}
              onChange={(e) =>
                patchDispositionDetails({
                  deceased: {
                    ...doc.finalDisposition?.deceased,
                    pronouncedAt: localDateTimeInputToIso(e.target.value),
                  },
                })
              }
            />
            <input
              style={fieldStyle}
              disabled={!editable}
              placeholder={t(`${prefix}.disposition.pronouncedBy`)}
              value={doc.finalDisposition?.deceased?.pronouncedBy ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  deceased: { ...doc.finalDisposition?.deceased, pronouncedBy: e.target.value },
                })
              }
            />
          </div>
        ) : null}

        {dispositionCode === "OTHER" || dispositionCode === "AGAINST_MEDICAL_ADVICE" ? (
          <input
            style={fieldStyle}
            disabled={!editable}
            placeholder={t(`${prefix}.disposition.destinationDetails`)}
            value={doc.finalDisposition?.destinationDetails ?? ""}
            onChange={(e) => patchDispositionDetails({ destinationDetails: e.target.value })}
          />
        ) : null}
      </Section>

      {!skipInstructions && showHomeInstructions ? (
        <Section
          title={t(`${prefix}.sections.patientInstructions`)}
          action={
            editable ? (
              <button
                type="button"
                data-testid="inpatient-discharge-generate-instructions"
                onClick={generateInstructions}
              >
                {t(`${prefix}.generateInstructions`)}
              </button>
            ) : null
          }
        >
          {(
            [
              "dischargeDiagnosisSummary",
              "diagnosisInstructions",
              "medicationInstructions",
              "returnPrecautions",
              "followUpInstructions",
              "activityInstructions",
            ] as const
          ).map((key) => (
            <label key={key}>
              <span style={labelStyle}>{t(`${prefix}.instructions.${key === "dischargeDiagnosisSummary" ? "diagnosisSummary" : key}`)}</span>
              <textarea
                style={{ ...fieldStyle, minHeight: key.includes("return") || key.includes("diagnosis") ? 72 : 48 }}
                disabled={!editable}
                value={(instructions[key] as string | null | undefined) ?? ""}
                onChange={(e) =>
                  setDoc((prev) => ({
                    ...prev,
                    patientInstructions: {
                      ...prev.patientInstructions,
                      [key]: e.target.value,
                      clinicianEdited: true,
                    },
                  }))
                }
              />
            </label>
          ))}
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
            <input
              type="checkbox"
              disabled={!editable}
              checked={instructions.patientInstructionsGiven === true}
              onChange={(e) =>
                setDoc((prev) => ({
                  ...prev,
                  patientInstructions: {
                    ...prev.patientInstructions,
                    patientInstructionsGiven: e.target.checked,
                  },
                }))
              }
            />
            {t(`${prefix}.instructions.given`)}
            <span style={{ color: "#64748b" }}>{t(`${prefix}.instructions.givenHint`)}</span>
          </label>
        </Section>
      ) : null}

      {!skipInstructions ? (
        <Section title={t(`${prefix}.sections.followUp`)}>
          {(doc.followUps ?? []).map((row, index) => (
            <div key={row.id} style={{ display: "grid", gap: 6, gridTemplateColumns: "1fr 1fr auto" }}>
              <input
                style={fieldStyle}
                disabled={!editable}
                placeholder={t(`${prefix}.followUp.specialty`)}
                value={row.specialty}
                onChange={(e) => {
                  const next = [...(doc.followUps ?? [])];
                  next[index] = { ...row, specialty: e.target.value };
                  setDoc((prev) => ({ ...prev, followUps: next }));
                }}
              />
              <input
                style={fieldStyle}
                disabled={!editable}
                placeholder={t(`${prefix}.followUp.timing`)}
                value={row.timing ?? ""}
                onChange={(e) => {
                  const next = [...(doc.followUps ?? [])];
                  next[index] = { ...row, timing: e.target.value };
                  setDoc((prev) => ({ ...prev, followUps: next }));
                }}
              />
              <button
                type="button"
                disabled={!editable}
                onClick={() =>
                  setDoc((prev) => ({
                    ...prev,
                    followUps: (prev.followUps ?? []).filter((_, i) => i !== index),
                  }))
                }
              >
                {t(`${prefix}.followUp.remove`)}
              </button>
            </div>
          ))}
          {editable ? (
            <button
              type="button"
              onClick={() =>
                setDoc((prev) => ({
                  ...prev,
                  followUps: [
                    ...(prev.followUps ?? []),
                    { id: newId("fu"), specialty: "", timing: "", source: "MANUAL" } satisfies InpatientDischargeFollowUp1C,
                  ],
                }))
              }
            >
              {t(`${prefix}.followUp.add`)}
            </button>
          ) : null}
        </Section>
      ) : null}

      <Section title={t(`${prefix}.sections.pendingStudies`)}>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
          <input
            type="checkbox"
            disabled={!editable}
            checked={doc.noKnownPendingStudies === true}
            onChange={(e) =>
              setDoc((prev) => ({
                ...prev,
                noKnownPendingStudies: e.target.checked,
                pendingStudies: e.target.checked ? [] : prev.pendingStudies,
              }))
            }
          />
          {t(`${prefix}.noKnownPending`)}
        </label>
        {!doc.noKnownPendingStudies
          ? doc.pendingStudies.map((row, index) => (
              <div key={row.id} style={{ display: "grid", gap: 6 }}>
                <select
                  style={fieldStyle}
                  disabled={!editable}
                  value={row.type}
                  onChange={(e) => {
                    const next = [...doc.pendingStudies];
                    next[index] = {
                      ...row,
                      type: e.target.value as InpatientProviderDischargePendingStudy["type"],
                    };
                    setDoc((prev) => ({ ...prev, pendingStudies: next }));
                  }}
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
                  onChange={(e) => {
                    const next = [...doc.pendingStudies];
                    next[index] = { ...row, description: e.target.value };
                    setDoc((prev) => ({ ...prev, pendingStudies: next }));
                  }}
                />
                <input
                  style={fieldStyle}
                  disabled={!editable}
                  placeholder={t(`${prefix}.pendingStudy.followUpPlan`)}
                  value={row.followUpPlan ?? ""}
                  onChange={(e) => {
                    const next = [...doc.pendingStudies];
                    next[index] = { ...row, followUpPlan: e.target.value };
                    setDoc((prev) => ({ ...prev, pendingStudies: next }));
                  }}
                />
              </div>
            ))
          : null}
        {editable && !doc.noKnownPendingStudies ? (
          <button
            type="button"
            onClick={() =>
              setDoc((prev) => ({
                ...prev,
                pendingStudies: [
                  ...prev.pendingStudies,
                  { id: newId("pending"), type: "LAB", description: "" },
                ],
              }))
            }
          >
            {t(`${prefix}.pendingStudy.add`)}
          </button>
        ) : null}
      </Section>

      {(doc.documentedByDisplayNameSnapshot || doc.documentedAt) && (
        <Section title={t(`${prefix}.sections.metadata`)}>
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
        </Section>
      )}

      {editable ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{t(`${prefix}.finalizeHint`)}</p>
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
        </div>
      ) : null}
    </div>
  );
}
