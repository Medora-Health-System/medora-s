/**
 * MEDUI.D5A.4A — Dental Clinical Evaluation panel.
 * Replaces ambulatory medical Med Eval templates for Dental > Evaluation.
 * Persists via enterprise Encounter PATCH + nursingAssessment.dentalClinicalEvaluationV1.
 * Signs via enterprise sign-provider-documentation (no Dental sign engine).
 */

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  D5A4A_CERTIFICATION_ID,
  D5A4A_CHIEF_CONCERN_CODES,
  D5A4A_SEVERITY_LEVELS,
  buildDentalClinicalEvaluationSavePayload,
  canAuthorAmbulatoryProviderDocumentation,
  hasDentalClinicalEvaluationContent,
  readDentalClinicalEvaluationFromNursingAssessment,
  type D5a4aChiefConcernCode,
  type D5a4aDentalClinicalEvaluationV1,
  type D5a4aYesNoUnknown,
  enterpriseDentalEncounterWorkspacePath,
} from "@medora/shared";
import { apiFetch, parseApiResponse } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { isEncounterLocked } from "@/lib/encounterLock";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";

export type DentalClinicalEvaluationEncounter = {
  id: string;
  status?: string | null;
  type?: string | null;
  visitReason?: string | null;
  chiefComplaint?: string | null;
  providerNote?: string | null;
  treatmentPlan?: string | null;
  nursingAssessment?: unknown;
  providerDocumentationStatus?: string | null;
  providerDocumentationSignedAt?: string | null;
  providerDocumentationSignedByDisplayFr?: string | null;
};

const YNU: D5a4aYesNoUnknown[] = ["", "YES", "NO", "UNKNOWN"];

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
      {children}
    </label>
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{
        width: "100%",
        minHeight: props.rows ? undefined : 64,
        borderRadius: 10,
        border: "1px solid #cbd5e1",
        padding: "8px 10px",
        fontSize: 14,
        fontFamily: "inherit",
        boxSizing: "border-box",
        ...((props.style as object) ?? {}),
      }}
    />
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        borderRadius: 10,
        border: "1px solid #cbd5e1",
        padding: "8px 10px",
        fontSize: 14,
        fontFamily: "inherit",
        boxSizing: "border-box",
        ...((props.style as object) ?? {}),
      }}
    />
  );
}

function SelectField(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{
        width: "100%",
        borderRadius: 10,
        border: "1px solid #cbd5e1",
        padding: "8px 10px",
        fontSize: 14,
        fontFamily: "inherit",
        background: "#fff",
        boxSizing: "border-box",
        ...((props.style as object) ?? {}),
      }}
    />
  );
}

function SectionCard({
  title,
  children,
  testId,
}: {
  title: string;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <section
      data-testid={testId}
      style={{ ...MEDORA_CARD_SHELL, padding: 14, marginBottom: 12 }}
    >
      <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{title}</h3>
      {children}
    </section>
  );
}

export function EnterpriseDentalClinicalEvaluationPanel({
  encounter,
  facilityId,
  roles,
  onUpdate,
}: {
  encounter: DentalClinicalEvaluationEncounter;
  facilityId: string;
  roles: readonly string[];
  onUpdate: () => void | Promise<void>;
}) {
  const { t, language } = useI18n();
  const dateLocale = language === "en" ? "en-US" : "fr-FR";
  const canAuthor = canAuthorAmbulatoryProviderDocumentation(roles);
  const readOnlyEncounter = (encounter.status ?? "").trim() !== "OPEN";
  const docSigned = isEncounterLocked(encounter);
  const fieldsLocked = readOnlyEncounter || docSigned || !canAuthor;

  const [value, setValue] = useState<D5a4aDentalClinicalEvaluationV1>(() =>
    readDentalClinicalEvaluationFromNursingAssessment(encounter.nursingAssessment)
  );
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [message, setMessage] = useState<{ variant: "success" | "error" | "queued"; text: string } | null>(
    null
  );

  useEffect(() => {
    setValue(readDentalClinicalEvaluationFromNursingAssessment(encounter.nursingAssessment));
  }, [
    encounter.id,
    encounter.nursingAssessment,
    encounter.providerDocumentationStatus,
    encounter.providerDocumentationSignedAt,
  ]);

  const odontogramHref = useMemo(
    () => enterpriseDentalEncounterWorkspacePath(encounter.id, "odontogram"),
    [encounter.id]
  );

  const toggleConcern = useCallback(
    (code: D5a4aChiefConcernCode) => {
      if (fieldsLocked) return;
      setValue((prev) => {
        const set = new Set(prev.chiefConcerns);
        if (set.has(code)) set.delete(code);
        else set.add(code);
        return { ...prev, chiefConcerns: Array.from(set) };
      });
    },
    [fieldsLocked]
  );

  const save = useCallback(async () => {
    if (!canAuthor || fieldsLocked) return;
    setMessage(null);
    setSaving(true);
    try {
      let savedByDisplayName = t("erMseProviderPanel.defaultSignerFallback");
      try {
        const meRes = await fetch("/api/auth/me");
        const me = await parseApiResponse(meRes);
        if (me && typeof me === "object" && !Array.isArray(me)) {
          const fn = (me as { fullName?: string }).fullName?.trim();
          if (fn) savedByDisplayName = fn;
        }
      } catch {
        /* fallback */
      }
      const payload = buildDentalClinicalEvaluationSavePayload({
        previousNursingAssessment: encounter.nursingAssessment,
        evaluation: value,
        metadata: {
          savedAt: new Date().toISOString(),
          savedBy: savedByDisplayName,
        },
        chiefComplaintLabelFor: (code) => t(`dentalCareD5a4a.concerns.${code}`),
      });
      const res = await apiFetch(`/encounters/${encounter.id}`, {
        method: "PATCH",
        facilityId,
        body: JSON.stringify(payload),
      });
      const queued =
        res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
      setMessage({
        variant: queued ? "queued" : "success",
        text: queued ? t("encounterClinicTab.toastSavedQueued") : t("encounterClinicTab.toastSaved"),
      });
      await onUpdate();
    } catch (e) {
      setMessage({
        variant: "error",
        text:
          normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("encounterClinicTab.errSave"),
      });
    } finally {
      setSaving(false);
    }
  }, [canAuthor, fieldsLocked, value, encounter, facilityId, language, onUpdate, t]);

  const sign = useCallback(async () => {
    if (!canAuthor || readOnlyEncounter) return;
    setMessage(null);
    setSigning(true);
    try {
      if (hasDentalClinicalEvaluationContent(value) && !docSigned) {
        // Persist latest edits before sign so content is on the encounter.
        await save();
      }
      await apiFetch(`/encounters/${encounter.id}/sign-provider-documentation`, {
        method: "POST",
        facilityId,
        body: JSON.stringify({ attestationAccepted: true }),
      });
      setMessage({ variant: "success", text: t("encounterClinicTab.toastSigned") });
      await onUpdate();
    } catch (e) {
      setMessage({
        variant: "error",
        text:
          normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("encounterClinicTab.errSign"),
      });
    } finally {
      setSigning(false);
    }
  }, [
    canAuthor,
    readOnlyEncounter,
    value,
    docSigned,
    save,
    encounter.id,
    facilityId,
    language,
    onUpdate,
    t,
  ]);

  const grid2: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
  };

  return (
    <div data-testid="dental-clinical-evaluation-d5a4a" data-certification={D5A4A_CERTIFICATION_ID}>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b" }}>{t("dentalCareD5a4a.reuseNote")}</p>

      {!canAuthor ? (
        <p
          role="status"
          style={{
            margin: "0 0 10px",
            padding: "10px 12px",
            borderRadius: 10,
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            color: "#9a3412",
            fontSize: 13,
          }}
        >
          {t("dentalCareD5a4a.readOnly")}
        </p>
      ) : null}

      {docSigned ? (
        <p role="status" style={{ margin: "0 0 10px", fontSize: 13, color: "#166534" }}>
          {t("erMseProviderPanel.lockedDocumentation")}
          {encounter.providerDocumentationSignedByDisplayFr && encounter.providerDocumentationSignedAt
            ? ` · ${encounter.providerDocumentationSignedByDisplayFr} · ${new Date(
                encounter.providerDocumentationSignedAt
              ).toLocaleString(dateLocale)}`
            : ""}
        </p>
      ) : null}

      <SectionCard title={t("dentalCareD5a4a.sections.chiefConcern")} testId="dental-eval-chief-concern">
        <div
          role="group"
          aria-label={t("dentalCareD5a4a.sections.chiefConcern")}
          style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
          data-testid="dental-eval-concern-chips"
        >
          {D5A4A_CHIEF_CONCERN_CODES.map((code) => {
            const selected = value.chiefConcerns.includes(code);
            return (
              <button
                key={code}
                type="button"
                disabled={fieldsLocked}
                aria-pressed={selected}
                onClick={() => toggleConcern(code)}
                style={{
                  borderRadius: 9999,
                  border: selected ? "1px solid #0f766e" : "1px solid #cbd5e1",
                  background: selected ? "#ccfbf1" : "#fff",
                  color: "#0f172a",
                  padding: "6px 12px",
                  fontSize: 13,
                  cursor: fieldsLocked ? "not-allowed" : "pointer",
                }}
              >
                {t(`dentalCareD5a4a.concerns.${code}`)}
              </button>
            );
          })}
        </div>
        {value.chiefConcerns.includes("OTHER") ? (
          <div style={{ marginTop: 10 }}>
            <FieldLabel htmlFor="dental-eval-concern-other">{t("dentalCareD5a4a.concerns.OTHER")}</FieldLabel>
            <TextInput
              id="dental-eval-concern-other"
              disabled={fieldsLocked}
              value={value.chiefConcernOther}
              onChange={(e) => setValue((p) => ({ ...p, chiefConcernOther: e.target.value }))}
            />
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title={t("dentalCareD5a4a.sections.hpi")} testId="dental-eval-hpi">
        <div style={grid2}>
          <div>
            <FieldLabel htmlFor="dental-hpi-region">{t("dentalCareD5a4a.hpi.toothOrRegion")}</FieldLabel>
            <TextInput
              id="dental-hpi-region"
              disabled={fieldsLocked}
              value={value.hpi.toothOrRegion}
              onChange={(e) =>
                setValue((p) => ({ ...p, hpi: { ...p.hpi, toothOrRegion: e.target.value } }))
              }
            />
          </div>
          <div>
            <FieldLabel htmlFor="dental-hpi-onset">{t("dentalCareD5a4a.hpi.onset")}</FieldLabel>
            <TextInput
              id="dental-hpi-onset"
              disabled={fieldsLocked}
              value={value.hpi.onset}
              onChange={(e) => setValue((p) => ({ ...p, hpi: { ...p.hpi, onset: e.target.value } }))}
            />
          </div>
          <div>
            <FieldLabel htmlFor="dental-hpi-duration">{t("dentalCareD5a4a.hpi.duration")}</FieldLabel>
            <TextInput
              id="dental-hpi-duration"
              disabled={fieldsLocked}
              value={value.hpi.duration}
              onChange={(e) => setValue((p) => ({ ...p, hpi: { ...p.hpi, duration: e.target.value } }))}
            />
          </div>
          <div>
            <FieldLabel htmlFor="dental-hpi-severity">{t("dentalCareD5a4a.hpi.severity")}</FieldLabel>
            <SelectField
              id="dental-hpi-severity"
              disabled={fieldsLocked}
              value={value.hpi.severity}
              onChange={(e) =>
                setValue((p) => ({
                  ...p,
                  hpi: { ...p.hpi, severity: e.target.value as typeof p.hpi.severity },
                }))
              }
            >
              <option value="">{t("common.dash")}</option>
              {D5A4A_SEVERITY_LEVELS.map((s) => (
                <option key={s} value={s}>
                  {t(`dentalCareD5a4a.severity.${s}`)}
                </option>
              ))}
            </SelectField>
          </div>
          {(
            [
              "hotSensitivity",
              "coldSensitivity",
              "sweetsSensitivity",
              "bitingSensitivity",
              "swelling",
              "drainage",
              "trauma",
            ] as const
          ).map((key) => (
            <div key={key}>
              <FieldLabel htmlFor={`dental-hpi-${key}`}>{t(`dentalCareD5a4a.hpi.${key}`)}</FieldLabel>
              <SelectField
                id={`dental-hpi-${key}`}
                disabled={fieldsLocked}
                value={value.hpi[key]}
                onChange={(e) =>
                  setValue((p) => ({
                    ...p,
                    hpi: { ...p.hpi, [key]: e.target.value as D5a4aYesNoUnknown },
                  }))
                }
              >
                {YNU.map((v) => (
                  <option key={v || "blank"} value={v}>
                    {v ? t(`dentalCareD5a4a.ynu.${v}`) : t("common.dash")}
                  </option>
                ))}
              </SelectField>
            </div>
          ))}
        </div>
        <div style={{ ...grid2, marginTop: 10 }}>
          <div>
            <FieldLabel htmlFor="dental-hpi-spontaneous">{t("dentalCareD5a4a.hpi.spontaneousVsProvoked")}</FieldLabel>
            <TextInput
              id="dental-hpi-spontaneous"
              disabled={fieldsLocked}
              value={value.hpi.spontaneousVsProvoked}
              onChange={(e) =>
                setValue((p) => ({ ...p, hpi: { ...p.hpi, spontaneousVsProvoked: e.target.value } }))
              }
            />
          </div>
          <div>
            <FieldLabel htmlFor="dental-hpi-prior">{t("dentalCareD5a4a.hpi.priorTreatment")}</FieldLabel>
            <TextInput
              id="dental-hpi-prior"
              disabled={fieldsLocked}
              value={value.hpi.priorTreatment}
              onChange={(e) =>
                setValue((p) => ({ ...p, hpi: { ...p.hpi, priorTreatment: e.target.value } }))
              }
            />
          </div>
          <div>
            <FieldLabel htmlFor="dental-hpi-analgesic">{t("dentalCareD5a4a.hpi.analgesicUse")}</FieldLabel>
            <TextInput
              id="dental-hpi-analgesic"
              disabled={fieldsLocked}
              value={value.hpi.analgesicUse}
              onChange={(e) =>
                setValue((p) => ({ ...p, hpi: { ...p.hpi, analgesicUse: e.target.value } }))
              }
            />
          </div>
          <div>
            <FieldLabel htmlFor="dental-hpi-abx">{t("dentalCareD5a4a.hpi.antibioticUse")}</FieldLabel>
            <TextInput
              id="dental-hpi-abx"
              disabled={fieldsLocked}
              value={value.hpi.antibioticUse}
              onChange={(e) =>
                setValue((p) => ({ ...p, hpi: { ...p.hpi, antibioticUse: e.target.value } }))
              }
            />
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <FieldLabel htmlFor="dental-hpi-narrative">{t("dentalCareD5a4a.hpi.narrative")}</FieldLabel>
          <TextArea
            id="dental-hpi-narrative"
            rows={3}
            disabled={fieldsLocked}
            value={value.hpi.narrative}
            onChange={(e) => setValue((p) => ({ ...p, hpi: { ...p.hpi, narrative: e.target.value } }))}
          />
        </div>
      </SectionCard>

      <SectionCard title={t("dentalCareD5a4a.sections.riskReview")} testId="dental-eval-risk">
        <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>{t("dentalCareD5a4a.risk.reuseNote")}</p>
        <div style={{ display: "grid", gap: 8 }}>
          {(
            [
              "enterpriseHistoryReviewed",
              "anticoagulantAntiplateletNoted",
              "diabetesNoted",
              "pregnancyRelevant",
              "tobaccoNoted",
            ] as const
          ).map((key) => (
            <label key={key} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
              <input
                type="checkbox"
                disabled={fieldsLocked}
                checked={value.riskReview[key]}
                onChange={(e) =>
                  setValue((p) => ({
                    ...p,
                    riskReview: { ...p.riskReview, [key]: e.target.checked },
                  }))
                }
              />
              {t(`dentalCareD5a4a.risk.${key}`)}
            </label>
          ))}
        </div>
        <div style={{ marginTop: 10 }}>
          <FieldLabel htmlFor="dental-risk-complications">{t("dentalCareD5a4a.risk.priorDentalComplications")}</FieldLabel>
          <TextArea
            id="dental-risk-complications"
            rows={2}
            disabled={fieldsLocked}
            value={value.riskReview.priorDentalComplications}
            onChange={(e) =>
              setValue((p) => ({
                ...p,
                riskReview: { ...p.riskReview, priorDentalComplications: e.target.value },
              }))
            }
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <FieldLabel htmlFor="dental-risk-notes">{t("dentalCareD5a4a.risk.notes")}</FieldLabel>
          <TextArea
            id="dental-risk-notes"
            rows={2}
            disabled={fieldsLocked}
            value={value.riskReview.notes}
            onChange={(e) =>
              setValue((p) => ({ ...p, riskReview: { ...p.riskReview, notes: e.target.value } }))
            }
          />
        </div>
      </SectionCard>

      <SectionCard title={t("dentalCareD5a4a.sections.extraoral")} testId="dental-eval-extraoral">
        <div style={grid2}>
          {(
            [
              "facialSymmetry",
              "facialSwelling",
              "lymphNodes",
              "tmj",
              "mouthOpeningTrismus",
              "other",
            ] as const
          ).map((key) => (
            <div key={key}>
              <FieldLabel htmlFor={`dental-extra-${key}`}>{t(`dentalCareD5a4a.extraoral.${key}`)}</FieldLabel>
              <TextInput
                id={`dental-extra-${key}`}
                disabled={fieldsLocked}
                value={value.extraoral[key]}
                onChange={(e) =>
                  setValue((p) => ({ ...p, extraoral: { ...p.extraoral, [key]: e.target.value } }))
                }
              />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t("dentalCareD5a4a.sections.intraoral")} testId="dental-eval-intraoral">
        <div style={grid2}>
          {(
            [
              "oralMucosa",
              "tongue",
              "floorOfMouth",
              "palate",
              "gingiva",
              "dentition",
              "occlusion",
              "swelling",
              "drainage",
              "lesions",
              "other",
            ] as const
          ).map((key) => (
            <div key={key}>
              <FieldLabel htmlFor={`dental-intra-${key}`}>{t(`dentalCareD5a4a.intraoral.${key}`)}</FieldLabel>
              <TextInput
                id={`dental-intra-${key}`}
                disabled={fieldsLocked}
                value={value.intraoral[key]}
                onChange={(e) =>
                  setValue((p) => ({ ...p, intraoral: { ...p.intraoral, [key]: e.target.value } }))
                }
              />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t("dentalCareD5a4a.sections.toothExam")} testId="dental-eval-tooth">
        <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>{t("dentalCareD5a4a.toothExam.reuseNote")}</p>
        <Link href={odontogramHref} style={{ fontSize: 13, fontWeight: 600 }}>
          {t("dentalCareD5a4a.toothExam.openOdontogram")}
        </Link>
        <div style={{ marginTop: 10 }}>
          <FieldLabel htmlFor="dental-tooth-notes">{t("dentalCareD5a4a.toothExam.notes")}</FieldLabel>
          <TextArea
            id="dental-tooth-notes"
            rows={2}
            disabled={fieldsLocked}
            value={value.toothExamNotes}
            onChange={(e) => setValue((p) => ({ ...p, toothExamNotes: e.target.value }))}
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <FieldLabel htmlFor="dental-tooth-codes">{t("dentalCareD5a4a.toothExam.referencedTeeth")}</FieldLabel>
          <TextInput
            id="dental-tooth-codes"
            disabled={fieldsLocked}
            placeholder={t("dentalCareD5a4a.toothExam.referencedTeethPlaceholder")}
            value={value.referencedToothCodes.join(", ")}
            onChange={(e) =>
              setValue((p) => ({
                ...p,
                referencedToothCodes: e.target.value
                  .split(/[,\s]+/)
                  .map((s) => s.trim())
                  .filter(Boolean),
              }))
            }
          />
        </div>
      </SectionCard>

      <SectionCard title={t("dentalCareD5a4a.sections.diagnostics")} testId="dental-eval-diagnostics">
        <div style={grid2}>
          {(
            [
              "percussion",
              "palpation",
              "mobility",
              "vitalityPulpTesting",
              "radiographicFindings",
              "other",
            ] as const
          ).map((key) => (
            <div key={key}>
              <FieldLabel htmlFor={`dental-diag-${key}`}>{t(`dentalCareD5a4a.diagnostics.${key}`)}</FieldLabel>
              <TextInput
                id={`dental-diag-${key}`}
                disabled={fieldsLocked}
                value={value.diagnostics[key]}
                onChange={(e) =>
                  setValue((p) => ({
                    ...p,
                    diagnostics: { ...p.diagnostics, [key]: e.target.value },
                  }))
                }
              />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t("dentalCareD5a4a.sections.assessment")} testId="dental-eval-assessment">
        <FieldLabel htmlFor="dental-assessment">{t("dentalCareD5a4a.assessment.label")}</FieldLabel>
        <TextArea
          id="dental-assessment"
          rows={3}
          disabled={fieldsLocked}
          value={value.assessment}
          onChange={(e) => setValue((p) => ({ ...p, assessment: e.target.value }))}
        />
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b" }}>{t("dentalCareD5a4a.assessment.dxNote")}</p>
      </SectionCard>

      <SectionCard title={t("dentalCareD5a4a.sections.clinicalDecision")} testId="dental-eval-cdm">
        <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
          {(
            ["findingsReviewed", "dentalImagingReviewed", "urgentReferral"] as const
          ).map((key) => (
            <label key={key} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
              <input
                type="checkbox"
                disabled={fieldsLocked}
                checked={value.clinicalDecision[key]}
                onChange={(e) =>
                  setValue((p) => ({
                    ...p,
                    clinicalDecision: { ...p.clinicalDecision, [key]: e.target.checked },
                  }))
                }
              />
              {t(`dentalCareD5a4a.cdm.${key}`)}
            </label>
          ))}
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {(
            [
              "diagnosticImpression",
              "treatmentOptionsDiscussed",
              "risksBenefitsDiscussed",
              "procedureRecommended",
              "procedureDeferred",
              "referralConsultation",
              "followUpDisposition",
              "clinicalReasoning",
            ] as const
          ).map((key) => (
            <div key={key}>
              <FieldLabel htmlFor={`dental-cdm-${key}`}>{t(`dentalCareD5a4a.cdm.${key}`)}</FieldLabel>
              <TextArea
                id={`dental-cdm-${key}`}
                rows={key === "clinicalReasoning" ? 3 : 2}
                disabled={fieldsLocked}
                value={value.clinicalDecision[key]}
                onChange={(e) =>
                  setValue((p) => ({
                    ...p,
                    clinicalDecision: { ...p.clinicalDecision, [key]: e.target.value },
                  }))
                }
              />
            </div>
          ))}
        </div>
      </SectionCard>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
          marginTop: 4,
          marginBottom: 8,
        }}
      >
        <button
          type="button"
          data-testid="dental-eval-save"
          disabled={fieldsLocked || saving}
          onClick={() => void save()}
          style={{
            borderRadius: 10,
            border: "1px solid #0f766e",
            background: "#0f766e",
            color: "#fff",
            padding: "8px 14px",
            fontWeight: 700,
            fontSize: 13,
            cursor: fieldsLocked || saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? t("common.saving") : t("dentalCareD5a4a.actions.save")}
        </button>
        {canAuthor && !readOnlyEncounter ? (
          <button
            type="button"
            data-testid="dental-eval-sign"
            disabled={docSigned || signing}
            onClick={() => void sign()}
            style={{
              borderRadius: 10,
              border: "1px solid #1e293b",
              background: "#fff",
              color: "#0f172a",
              padding: "8px 14px",
              fontWeight: 700,
              fontSize: 13,
              cursor: docSigned || signing ? "not-allowed" : "pointer",
            }}
          >
            {signing ? t("common.saving") : t("dentalCareD5a4a.actions.sign")}
          </button>
        ) : null}
        {value.metadata?.savedAt ? (
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {t("dentalCareD5a4a.lastSaved")}: {value.metadata.savedBy ?? "—"} ·{" "}
            {new Date(value.metadata.savedAt).toLocaleString(dateLocale)}
          </span>
        ) : null}
      </div>

      {message ? (
        <p
          role="status"
          data-testid="dental-eval-message"
          style={{
            margin: 0,
            fontSize: 13,
            color:
              message.variant === "error" ? "#b91c1c" : message.variant === "queued" ? "#9a3412" : "#166534",
          }}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
