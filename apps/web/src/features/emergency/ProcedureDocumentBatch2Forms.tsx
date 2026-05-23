"use client";

import React, { useState } from "react";
import {
  ABSCESS_SIZE_VALUES,
  BALLOON_VOLUME_UI_VALUES,
  CATHETER_SIZE_UI_VALUES,
  FOLEY_INDICATION_UI_VALUES,
  CLEANING_SOLUTION_VALUES,
  DRAINAGE_AMOUNT_VALUES,
  DRESSING_TYPE_VALUES,
  EKG_INDICATION_VALUES,
  EKG_RHYTHM_VALUES,
  EXTREMITY_SITE_VALUES,
  GLUCOSE_ACTION_VALUES,
  LACERATION_ANESTHESIA_VALUES,
  LACERATION_SITE_VALUES,
  NEUROVASCULAR_STATUS_VALUES,
  PREGNANCY_RESULT_VALUES,
  PREGNANCY_SPECIMEN_VALUES,
  RATE_RANGE_VALUES,
  SPECIMEN_SOURCE_VALUES,
  SPLINT_TYPE_VALUES,
  URINE_APPEARANCE_FOLEY_UI_VALUES,
  URINE_APPEARANCE_VALUES,
  URINE_METHOD_VALUES,
  WOUND_TYPE_VALUES,
  type DocumentedProcedureType,
  ADVANCED_DOCUMENTED_PROCEDURE_TYPES,
} from "@medora/shared";
import { afterProcedureDocumentSaveSuccess } from "@/features/emergency/procedureSaveSuccess";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";

export type BasicNonLacerationProcedureType = Exclude<
  DocumentedProcedureType,
  "LACERATION_REPAIR" | (typeof ADVANCED_DOCUMENTED_PROCEDURE_TYPES)[number]
>;

export type NonLacerationProcedureType = Exclude<DocumentedProcedureType, "LACERATION_REPAIR">;

export const NON_LACERATION_FORM_TITLE_I18N_KEYS: Record<BasicNonLacerationProcedureType, string> = {
  WOUND_CARE: "erProcedureLauncher.formTitleWoundCare",
  INCISION_AND_DRAINAGE: "erProcedureLauncher.formTitleIAndD",
  SPLINT_APPLICATION: "erProcedureLauncher.formTitleSplint",
  FOLEY_CATHETER: "erProcedureLauncher.formTitleFoley",
  EKG: "erProcedureLauncher.formTitleEkg",
  GLUCOSE_CHECK: "erProcedureLauncher.formTitleGlucose",
  URINE_COLLECTION: "erProcedureLauncher.formTitleUrine",
  PREGNANCY_TEST: "erProcedureLauncher.formTitlePregnancy",
};

function toDatetimeLocalValue(d: Date): string {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return x.toISOString().slice(0, 16);
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "#475569",
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  fontSize: 14,
};

type CommonProps = {
  encounterId: string;
  facilityId: string;
  onBack: () => void;
  onClose: () => void;
  onRecorded: () => void;
};

const procedureSaveSuccessBannerStyle: React.CSSProperties = {
  margin: "0 0 12px 0",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #86efac",
  background: "#f0fdf4",
  color: "#166534",
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: "0.03em",
};

async function postDocument(encounterId: string, facilityId: string, body: Record<string, unknown>) {
  await apiFetch(`/encounters/${encounterId}/procedures/document`, {
    method: "POST",
    facilityId,
    body: JSON.stringify(body),
  });
}

export type FormShellSubmitCtx = {
  performedAtLocal: string;
  setPerformedAtLocal: (v: string) => void;
  submitErr: string | null;
  setSubmitErr: (v: string | null) => void;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
};

type FormShellProps = CommonProps & {
  titleKey: string;
  children: (ctx: FormShellSubmitCtx) => React.ReactNode;
};

function FormShell({
  encounterId,
  facilityId,
  onBack,
  onClose,
  onRecorded,
  titleKey,
  children,
}: FormShellProps) {
  const { t } = useI18n();
  const [performedAtLocal, setPerformedAtLocal] = useState(() => toDatetimeLocalValue(new Date()));
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const onSubmit = async (body: Record<string, unknown>) => {
    setSubmitErr(null);
    setSaveSuccess(false);
    setSubmitting(true);
    try {
      if (performedAtLocal.trim()) {
        const d = new Date(performedAtLocal);
        if (!Number.isNaN(d.getTime())) body.performedAt = d.toISOString();
      }
      await postDocument(encounterId, facilityId, body);
      setSaveSuccess(true);
      await afterProcedureDocumentSaveSuccess({ onRecorded, onClose });
    } catch (e) {
      setSubmitErr(
        normalizeUserFacingError(e instanceof Error ? e.message : null) || t("erProcedureLauncher.saveError")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        disabled={submitting || saveSuccess}
        style={{
          marginBottom: 12,
          padding: "6px 12px",
          borderRadius: 8,
          border: "1px solid #cbd5e1",
          background: "#fff",
          fontSize: 13,
          fontWeight: 600,
          cursor: submitting || saveSuccess ? "not-allowed" : "pointer",
        }}
      >
        {t("erProcedureLauncher.backToGrid")}
      </button>
      <p style={{ margin: "0 0 10px 0", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{t(titleKey)}</p>
      {saveSuccess ? (
        <p role="status" aria-live="polite" style={procedureSaveSuccessBannerStyle}>
          {t("erProcedureLauncher.saveSuccess")}
        </p>
      ) : null}
      {submitErr ? (
        <p role="alert" style={{ margin: "0 0 12px 0", fontSize: 13, color: "#b45309", fontWeight: 600 }}>
          {submitErr}
        </p>
      ) : null}
      {children({ performedAtLocal, setPerformedAtLocal, submitErr, setSubmitErr, submitting, setSubmitting, onSubmit })}
    </div>
  );
}

function enumSelect<T extends string>(opts: {
  value: T | "";
  onChange: (v: T | "") => void;
  values: readonly T[];
  labelKey: (v: T) => string;
  t: (k: string) => string;
  required?: boolean;
  placeholderKey: string;
}): React.ReactElement {
  const { value, onChange, values, labelKey, t, required, placeholderKey } = opts;
  return (
    <select
      value={value}
      required={required}
      onChange={(e) => onChange((e.target.value || "") as T | "")}
      style={{ ...inputStyle, marginBottom: 8 }}
    >
      <option value="">{t(placeholderKey)}</option>
      {values.map((v) => (
        <option key={v} value={v}>
          {t(labelKey(v))}
        </option>
      ))}
    </select>
  );
}

function boolSelect(value: boolean, onChange: (v: boolean) => void, t: (k: string) => string): React.ReactElement {
  return (
    <select
      value={value ? "true" : "false"}
      required
      onChange={(e) => onChange(e.target.value === "true")}
      style={{ ...inputStyle, marginBottom: 8 }}
    >
      <option value="true">{t("erProcedureLauncher.boolYes")}</option>
      <option value="false">{t("erProcedureLauncher.boolNo")}</option>
    </select>
  );
}

function PerformedAtField({
  performedAtLocal,
  setPerformedAtLocal,
  t,
}: {
  performedAtLocal: string;
  setPerformedAtLocal: (v: string) => void;
  t: (k: string) => string;
}) {
  return (
    <>
      <label style={labelStyle}>{t("erProcedureLauncher.fieldPerformedAt")}</label>
      <input
        type="datetime-local"
        value={performedAtLocal}
        onChange={(e) => setPerformedAtLocal(e.target.value)}
        style={{ ...inputStyle, marginBottom: 10 }}
      />
    </>
  );
}

function WoundCareProcedureForm(p: CommonProps) {
  const { t } = useI18n();
  const [site, setSite] = useState<(typeof LACERATION_SITE_VALUES)[number] | "">("");
  const [siteOther, setSiteOther] = useState("");
  const [woundType, setWoundType] = useState<(typeof WOUND_TYPE_VALUES)[number] | "">("");
  const [woundTypeOther, setWoundTypeOther] = useState("");
  const [cleaningSolution, setCleaningSolution] = useState<(typeof CLEANING_SOLUTION_VALUES)[number] | "">("");
  const [cleaningSolutionOther, setCleaningSolutionOther] = useState("");
  const [dressingType, setDressingType] = useState<(typeof DRESSING_TYPE_VALUES)[number] | "">("");
  const [dressingTypeOther, setDressingTypeOther] = useState("");
  const [toleratedWell, setToleratedWell] = useState(true);
  const [complications, setComplications] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <FormShell {...p} titleKey={NON_LACERATION_FORM_TITLE_I18N_KEYS.WOUND_CARE}>
      {(ctx) => (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ctx.setSubmitErr(null);
            if (site === "OTHER" && !siteOther.trim()) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationOtherRequired"));
              return;
            }
            if (woundType === "OTHER" && !woundTypeOther.trim()) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationOtherRequired"));
              return;
            }
            if (cleaningSolution === "OTHER" && !cleaningSolutionOther.trim()) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationOtherRequired"));
              return;
            }
            if (dressingType === "OTHER" && !dressingTypeOther.trim()) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationOtherRequired"));
              return;
            }
            if (!site || !woundType || !cleaningSolution || !dressingType) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationIncomplete"));
              return;
            }
            const body: Record<string, unknown> = {
              procedureType: "WOUND_CARE",
              site,
              woundType,
              cleaningSolution,
              dressingType,
              toleratedWell,
            };
            if (siteOther.trim()) body.siteOther = siteOther.trim();
            if (woundTypeOther.trim()) body.woundTypeOther = woundTypeOther.trim();
            if (cleaningSolutionOther.trim()) body.cleaningSolutionOther = cleaningSolutionOther.trim();
            if (dressingTypeOther.trim()) body.dressingTypeOther = dressingTypeOther.trim();
            if (complications.trim()) body.complications = complications.trim();
            if (notes.trim()) body.notes = notes.trim();
            void ctx.onSubmit(body);
          }}
        >
          <PerformedAtField
            performedAtLocal={ctx.performedAtLocal}
            setPerformedAtLocal={ctx.setPerformedAtLocal}
            t={t}
          />
          <label style={labelStyle}>{t("erProcedureLauncher.fieldSite")}</label>
          {enumSelect({
            value: site,
            onChange: setSite,
            values: LACERATION_SITE_VALUES,
            labelKey: (v) => `erProcedureLauncher.site.${v}`,
            t,
            required: true,
            placeholderKey: "erProcedureLauncher.selectPlaceholder",
          })}
          {site === "OTHER" ? (
            <>
              <label style={labelStyle}>{t("erProcedureLauncher.fieldSiteOther")}</label>
              <input
                type="text"
                value={siteOther}
                onChange={(e) => setSiteOther(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
            </>
          ) : null}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldWoundType")}</label>
          {enumSelect({
            value: woundType,
            onChange: setWoundType,
            values: WOUND_TYPE_VALUES,
            labelKey: (v) => `erProcedureLauncher.woundType.${v}`,
            t,
            required: true,
            placeholderKey: "erProcedureLauncher.selectPlaceholder",
          })}
          {woundType === "OTHER" ? (
            <>
              <label style={labelStyle}>{t("erProcedureLauncher.fieldWoundTypeOther")}</label>
              <input
                type="text"
                value={woundTypeOther}
                onChange={(e) => setWoundTypeOther(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
            </>
          ) : null}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldCleaningSolution")}</label>
          {enumSelect({
            value: cleaningSolution,
            onChange: setCleaningSolution,
            values: CLEANING_SOLUTION_VALUES,
            labelKey: (v) => `erProcedureLauncher.cleaningSolution.${v}`,
            t,
            required: true,
            placeholderKey: "erProcedureLauncher.selectPlaceholder",
          })}
          {cleaningSolution === "OTHER" ? (
            <>
              <label style={labelStyle}>{t("erProcedureLauncher.fieldCleaningOther")}</label>
              <input
                type="text"
                value={cleaningSolutionOther}
                onChange={(e) => setCleaningSolutionOther(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
            </>
          ) : null}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldDressingType")}</label>
          {enumSelect({
            value: dressingType,
            onChange: setDressingType,
            values: DRESSING_TYPE_VALUES,
            labelKey: (v) => `erProcedureLauncher.dressingType.${v}`,
            t,
            required: true,
            placeholderKey: "erProcedureLauncher.selectPlaceholder",
          })}
          {dressingType === "OTHER" ? (
            <>
              <label style={labelStyle}>{t("erProcedureLauncher.fieldDressingTypeOther")}</label>
              <input
                type="text"
                value={dressingTypeOther}
                onChange={(e) => setDressingTypeOther(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
            </>
          ) : null}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldTolerated")}</label>
          {boolSelect(toleratedWell, setToleratedWell, t)}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldComplications")}</label>
          <textarea
            value={complications}
            onChange={(e) => setComplications(e.target.value)}
            rows={2}
            style={{ ...inputStyle, marginBottom: 10, resize: "vertical" }}
          />
          <label style={labelStyle}>{t("erProcedureLauncher.fieldNotes")}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            style={{ ...inputStyle, marginBottom: 14, resize: "vertical" }}
          />
          <button
            type="submit"
            disabled={ctx.submitting}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: "#1d4ed8",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              cursor: ctx.submitting ? "not-allowed" : "pointer",
            }}
          >
            {t("erProcedureLauncher.save")}
          </button>
        </form>
      )}
    </FormShell>
  );
}

function IncisionDrainageProcedureForm(p: CommonProps) {
  const { t } = useI18n();
  const [site, setSite] = useState<(typeof LACERATION_SITE_VALUES)[number] | "">("");
  const [siteOther, setSiteOther] = useState("");
  const [abscessSize, setAbscessSize] = useState<(typeof ABSCESS_SIZE_VALUES)[number] | "">("");
  const [abscessSizeOther, setAbscessSizeOther] = useState("");
  const [anesthesia, setAnesthesia] = useState<(typeof LACERATION_ANESTHESIA_VALUES)[number] | "">("");
  const [anesthesiaOther, setAnesthesiaOther] = useState("");
  const [incisionPerformed, setIncisionPerformed] = useState(true);
  const [drainageAmount, setDrainageAmount] = useState<(typeof DRAINAGE_AMOUNT_VALUES)[number] | "">("");
  const [drainageAmountOther, setDrainageAmountOther] = useState("");
  const [packingPlaced, setPackingPlaced] = useState(false);
  const [dressingApplied, setDressingApplied] = useState(true);
  const [toleratedWell, setToleratedWell] = useState(true);
  const [complications, setComplications] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <FormShell {...p} titleKey={NON_LACERATION_FORM_TITLE_I18N_KEYS.INCISION_AND_DRAINAGE}>
      {(ctx) => (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ctx.setSubmitErr(null);
            if (site === "OTHER" && !siteOther.trim()) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationOtherRequired"));
              return;
            }
            if (abscessSize === "OTHER" && !abscessSizeOther.trim()) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationOtherRequired"));
              return;
            }
            if (anesthesia === "OTHER" && !anesthesiaOther.trim()) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationOtherRequired"));
              return;
            }
            if (drainageAmount === "OTHER" && !drainageAmountOther.trim()) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationOtherRequired"));
              return;
            }
            if (!site || !abscessSize || !anesthesia || !drainageAmount) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationIncomplete"));
              return;
            }
            const body: Record<string, unknown> = {
              procedureType: "INCISION_AND_DRAINAGE",
              site,
              abscessSize,
              anesthesia,
              incisionPerformed,
              drainageAmount,
              packingPlaced,
              dressingApplied,
              toleratedWell,
            };
            if (siteOther.trim()) body.siteOther = siteOther.trim();
            if (abscessSizeOther.trim()) body.abscessSizeOther = abscessSizeOther.trim();
            if (anesthesiaOther.trim()) body.anesthesiaOther = anesthesiaOther.trim();
            if (drainageAmountOther.trim()) body.drainageAmountOther = drainageAmountOther.trim();
            if (complications.trim()) body.complications = complications.trim();
            if (notes.trim()) body.notes = notes.trim();
            void ctx.onSubmit(body);
          }}
        >
          <PerformedAtField
            performedAtLocal={ctx.performedAtLocal}
            setPerformedAtLocal={ctx.setPerformedAtLocal}
            t={t}
          />
          <label style={labelStyle}>{t("erProcedureLauncher.fieldSite")}</label>
          {enumSelect({
            value: site,
            onChange: setSite,
            values: LACERATION_SITE_VALUES,
            labelKey: (v) => `erProcedureLauncher.site.${v}`,
            t,
            required: true,
            placeholderKey: "erProcedureLauncher.selectPlaceholder",
          })}
          {site === "OTHER" ? (
            <>
              <label style={labelStyle}>{t("erProcedureLauncher.fieldSiteOther")}</label>
              <input
                type="text"
                value={siteOther}
                onChange={(e) => setSiteOther(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
            </>
          ) : null}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldAbscessSize")}</label>
          {enumSelect({
            value: abscessSize,
            onChange: setAbscessSize,
            values: ABSCESS_SIZE_VALUES,
            labelKey: (v) => `erProcedureLauncher.abscessSize.${v}`,
            t,
            required: true,
            placeholderKey: "erProcedureLauncher.selectPlaceholder",
          })}
          {abscessSize === "OTHER" ? (
            <>
              <label style={labelStyle}>{t("erProcedureLauncher.fieldAbscessSizeOther")}</label>
              <input
                type="text"
                value={abscessSizeOther}
                onChange={(e) => setAbscessSizeOther(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
            </>
          ) : null}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldAnesthesia")}</label>
          {enumSelect({
            value: anesthesia,
            onChange: setAnesthesia,
            values: LACERATION_ANESTHESIA_VALUES,
            labelKey: (v) => `erProcedureLauncher.anesthesia.${v}`,
            t,
            required: true,
            placeholderKey: "erProcedureLauncher.selectPlaceholder",
          })}
          {anesthesia === "OTHER" ? (
            <>
              <label style={labelStyle}>{t("erProcedureLauncher.fieldAnesthesiaOther")}</label>
              <input
                type="text"
                value={anesthesiaOther}
                onChange={(e) => setAnesthesiaOther(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
            </>
          ) : null}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldIncisionPerformed")}</label>
          {boolSelect(incisionPerformed, setIncisionPerformed, t)}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldDrainageAmount")}</label>
          {enumSelect({
            value: drainageAmount,
            onChange: setDrainageAmount,
            values: DRAINAGE_AMOUNT_VALUES,
            labelKey: (v) => `erProcedureLauncher.drainageAmount.${v}`,
            t,
            required: true,
            placeholderKey: "erProcedureLauncher.selectPlaceholder",
          })}
          {drainageAmount === "OTHER" ? (
            <>
              <label style={labelStyle}>{t("erProcedureLauncher.fieldDrainageOther")}</label>
              <input
                type="text"
                value={drainageAmountOther}
                onChange={(e) => setDrainageAmountOther(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
            </>
          ) : null}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldPackingPlaced")}</label>
          {boolSelect(packingPlaced, setPackingPlaced, t)}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldDressing")}</label>
          {boolSelect(dressingApplied, setDressingApplied, t)}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldTolerated")}</label>
          {boolSelect(toleratedWell, setToleratedWell, t)}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldComplications")}</label>
          <textarea
            value={complications}
            onChange={(e) => setComplications(e.target.value)}
            rows={2}
            style={{ ...inputStyle, marginBottom: 10, resize: "vertical" }}
          />
          <label style={labelStyle}>{t("erProcedureLauncher.fieldNotes")}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            style={{ ...inputStyle, marginBottom: 14, resize: "vertical" }}
          />
          <button
            type="submit"
            disabled={ctx.submitting}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: "#1d4ed8",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              cursor: ctx.submitting ? "not-allowed" : "pointer",
            }}
          >
            {t("erProcedureLauncher.save")}
          </button>
        </form>
      )}
    </FormShell>
  );
}

function SplintProcedureForm(p: CommonProps) {
  const { t } = useI18n();
  const [extremitySite, setExtremitySite] = useState<(typeof EXTREMITY_SITE_VALUES)[number] | "">("");
  const [extremitySiteOther, setExtremitySiteOther] = useState("");
  const [splintType, setSplintType] = useState<(typeof SPLINT_TYPE_VALUES)[number] | "">("");
  const [splintTypeOther, setSplintTypeOther] = useState("");
  const [neurovascularBefore, setNeurovascularBefore] = useState<(typeof NEUROVASCULAR_STATUS_VALUES)[number] | "">(
    ""
  );
  const [neurovascularBeforeOther, setNeurovascularBeforeOther] = useState("");
  const [neurovascularAfter, setNeurovascularAfter] = useState<(typeof NEUROVASCULAR_STATUS_VALUES)[number] | "">("");
  const [neurovascularAfterOther, setNeurovascularAfterOther] = useState("");
  const [patientToleratedWell, setPatientToleratedWell] = useState(true);
  const [instructionsGiven, setInstructionsGiven] = useState(true);
  const [complications, setComplications] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <FormShell {...p} titleKey={NON_LACERATION_FORM_TITLE_I18N_KEYS.SPLINT_APPLICATION}>
      {(ctx) => (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ctx.setSubmitErr(null);
            if (extremitySite === "OTHER" && !extremitySiteOther.trim()) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationOtherRequired"));
              return;
            }
            if (splintType === "OTHER" && !splintTypeOther.trim()) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationOtherRequired"));
              return;
            }
            if (neurovascularBefore === "OTHER" && !neurovascularBeforeOther.trim()) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationOtherRequired"));
              return;
            }
            if (neurovascularAfter === "OTHER" && !neurovascularAfterOther.trim()) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationOtherRequired"));
              return;
            }
            if (!extremitySite || !splintType || !neurovascularBefore || !neurovascularAfter) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationIncomplete"));
              return;
            }
            const body: Record<string, unknown> = {
              procedureType: "SPLINT_APPLICATION",
              extremitySite,
              splintType,
              neurovascularBefore,
              neurovascularAfter,
              patientToleratedWell,
              instructionsGiven,
            };
            if (extremitySiteOther.trim()) body.extremitySiteOther = extremitySiteOther.trim();
            if (splintTypeOther.trim()) body.splintTypeOther = splintTypeOther.trim();
            if (neurovascularBeforeOther.trim()) body.neurovascularBeforeOther = neurovascularBeforeOther.trim();
            if (neurovascularAfterOther.trim()) body.neurovascularAfterOther = neurovascularAfterOther.trim();
            if (complications.trim()) body.complications = complications.trim();
            if (notes.trim()) body.notes = notes.trim();
            void ctx.onSubmit(body);
          }}
        >
          <PerformedAtField
            performedAtLocal={ctx.performedAtLocal}
            setPerformedAtLocal={ctx.setPerformedAtLocal}
            t={t}
          />
          <label style={labelStyle}>{t("erProcedureLauncher.fieldExtremitySite")}</label>
          {enumSelect({
            value: extremitySite,
            onChange: setExtremitySite,
            values: EXTREMITY_SITE_VALUES,
            labelKey: (v) => `erProcedureLauncher.extremitySite.${v}`,
            t,
            required: true,
            placeholderKey: "erProcedureLauncher.selectPlaceholder",
          })}
          {extremitySite === "OTHER" ? (
            <>
              <label style={labelStyle}>{t("erProcedureLauncher.fieldExtremitySiteOther")}</label>
              <input
                type="text"
                value={extremitySiteOther}
                onChange={(e) => setExtremitySiteOther(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
            </>
          ) : null}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldSplintType")}</label>
          {enumSelect({
            value: splintType,
            onChange: setSplintType,
            values: SPLINT_TYPE_VALUES,
            labelKey: (v) => `erProcedureLauncher.splintType.${v}`,
            t,
            required: true,
            placeholderKey: "erProcedureLauncher.selectPlaceholder",
          })}
          {splintType === "OTHER" ? (
            <>
              <label style={labelStyle}>{t("erProcedureLauncher.fieldSplintTypeOther")}</label>
              <input
                type="text"
                value={splintTypeOther}
                onChange={(e) => setSplintTypeOther(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
            </>
          ) : null}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldNeuroBefore")}</label>
          {enumSelect({
            value: neurovascularBefore,
            onChange: setNeurovascularBefore,
            values: NEUROVASCULAR_STATUS_VALUES,
            labelKey: (v) => `erProcedureLauncher.neurovascularStatus.${v}`,
            t,
            required: true,
            placeholderKey: "erProcedureLauncher.selectPlaceholder",
          })}
          {neurovascularBefore === "OTHER" ? (
            <>
              <label style={labelStyle}>{t("erProcedureLauncher.fieldNeuroBeforeOther")}</label>
              <input
                type="text"
                value={neurovascularBeforeOther}
                onChange={(e) => setNeurovascularBeforeOther(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
            </>
          ) : null}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldNeuroAfter")}</label>
          {enumSelect({
            value: neurovascularAfter,
            onChange: setNeurovascularAfter,
            values: NEUROVASCULAR_STATUS_VALUES,
            labelKey: (v) => `erProcedureLauncher.neurovascularStatus.${v}`,
            t,
            required: true,
            placeholderKey: "erProcedureLauncher.selectPlaceholder",
          })}
          {neurovascularAfter === "OTHER" ? (
            <>
              <label style={labelStyle}>{t("erProcedureLauncher.fieldNeuroAfterOther")}</label>
              <input
                type="text"
                value={neurovascularAfterOther}
                onChange={(e) => setNeurovascularAfterOther(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
            </>
          ) : null}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldPatientTolerated")}</label>
          {boolSelect(patientToleratedWell, setPatientToleratedWell, t)}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldInstructionsGiven")}</label>
          {boolSelect(instructionsGiven, setInstructionsGiven, t)}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldComplications")}</label>
          <textarea
            value={complications}
            onChange={(e) => setComplications(e.target.value)}
            rows={2}
            style={{ ...inputStyle, marginBottom: 10, resize: "vertical" }}
          />
          <label style={labelStyle}>{t("erProcedureLauncher.fieldNotes")}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            style={{ ...inputStyle, marginBottom: 14, resize: "vertical" }}
          />
          <button
            type="submit"
            disabled={ctx.submitting}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: "#1d4ed8",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              cursor: ctx.submitting ? "not-allowed" : "pointer",
            }}
          >
            {t("erProcedureLauncher.save")}
          </button>
        </form>
      )}
    </FormShell>
  );
}

function FoleyProcedureForm(p: CommonProps) {
  const { t } = useI18n();
  const [catheterSize, setCatheterSize] = useState<(typeof CATHETER_SIZE_UI_VALUES)[number] | "">("");
  const [catheterSizeOther, setCatheterSizeOther] = useState("");
  const [indication, setIndication] = useState<(typeof FOLEY_INDICATION_UI_VALUES)[number] | "">("");
  const [indicationOther, setIndicationOther] = useState("");
  const [urineReturn, setUrineReturn] = useState(true);
  const [urineAppearance, setUrineAppearance] = useState<(typeof URINE_APPEARANCE_FOLEY_UI_VALUES)[number] | "">("");
  const [urineAppearanceOther, setUrineAppearanceOther] = useState("");
  const [balloonVolume, setBalloonVolume] = useState<(typeof BALLOON_VOLUME_UI_VALUES)[number] | "">("");
  const [balloonVolumeOther, setBalloonVolumeOther] = useState("");
  const [toleratedWell, setToleratedWell] = useState(true);
  const [complications, setComplications] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <FormShell {...p} titleKey={NON_LACERATION_FORM_TITLE_I18N_KEYS.FOLEY_CATHETER}>
      {(ctx) => (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ctx.setSubmitErr(null);
            if (catheterSize === "OTHER" && !catheterSizeOther.trim()) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationOtherRequired"));
              return;
            }
            if (indication === "OTHER" && !indicationOther.trim()) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationOtherRequired"));
              return;
            }
            if (urineAppearance === "OTHER" && !urineAppearanceOther.trim()) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationOtherRequired"));
              return;
            }
            if (balloonVolume === "OTHER" && !balloonVolumeOther.trim()) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationOtherRequired"));
              return;
            }
            if (!catheterSize || !indication || !urineAppearance || !balloonVolume) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationIncomplete"));
              return;
            }
            const body: Record<string, unknown> = {
              procedureType: "FOLEY_CATHETER",
              catheterSize,
              indication,
              urineReturn,
              urineAppearance,
              balloonVolume,
              toleratedWell,
            };
            if (catheterSizeOther.trim()) body.catheterSizeOther = catheterSizeOther.trim();
            if (indicationOther.trim()) body.indicationOther = indicationOther.trim();
            if (urineAppearanceOther.trim()) body.urineAppearanceOther = urineAppearanceOther.trim();
            if (balloonVolumeOther.trim()) body.balloonVolumeOther = balloonVolumeOther.trim();
            if (complications.trim()) body.complications = complications.trim();
            if (notes.trim()) body.notes = notes.trim();
            void ctx.onSubmit(body);
          }}
        >
          <PerformedAtField
            performedAtLocal={ctx.performedAtLocal}
            setPerformedAtLocal={ctx.setPerformedAtLocal}
            t={t}
          />
          <label style={labelStyle}>{t("erProcedureLauncher.fieldCatheterSize")}</label>
          {enumSelect({
            value: catheterSize,
            onChange: setCatheterSize,
            values: CATHETER_SIZE_UI_VALUES,
            labelKey: (v) => `erProcedureLauncher.catheterSize.${v}`,
            t,
            required: true,
            placeholderKey: "erProcedureLauncher.selectPlaceholder",
          })}
          {catheterSize === "OTHER" ? (
            <>
              <label style={labelStyle}>{t("erProcedureLauncher.fieldCatheterSizeOther")}</label>
              <input
                type="text"
                value={catheterSizeOther}
                onChange={(e) => setCatheterSizeOther(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
            </>
          ) : null}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldFoleyIndication")}</label>
          {enumSelect({
            value: indication,
            onChange: setIndication,
            values: FOLEY_INDICATION_UI_VALUES,
            labelKey: (v) => `erProcedureLauncher.foleyIndication.${v}`,
            t,
            required: true,
            placeholderKey: "erProcedureLauncher.selectPlaceholder",
          })}
          {indication === "OTHER" ? (
            <>
              <label style={labelStyle}>{t("erProcedureLauncher.fieldFoleyIndicationOther")}</label>
              <input
                type="text"
                value={indicationOther}
                onChange={(e) => setIndicationOther(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
            </>
          ) : null}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldUrineReturn")}</label>
          {boolSelect(urineReturn, setUrineReturn, t)}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldUrineAppearance")}</label>
          {enumSelect({
            value: urineAppearance,
            onChange: setUrineAppearance,
            values: URINE_APPEARANCE_FOLEY_UI_VALUES,
            labelKey: (v) => `erProcedureLauncher.urineAppearance.${v}`,
            t,
            required: true,
            placeholderKey: "erProcedureLauncher.selectPlaceholder",
          })}
          {urineAppearance === "OTHER" ? (
            <>
              <label style={labelStyle}>{t("erProcedureLauncher.fieldUrineAppearanceOther")}</label>
              <input
                type="text"
                value={urineAppearanceOther}
                onChange={(e) => setUrineAppearanceOther(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
            </>
          ) : null}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldBalloonVolume")}</label>
          {enumSelect({
            value: balloonVolume,
            onChange: setBalloonVolume,
            values: BALLOON_VOLUME_UI_VALUES,
            labelKey: (v) => `erProcedureLauncher.balloonVolume.${v}`,
            t,
            required: true,
            placeholderKey: "erProcedureLauncher.selectPlaceholder",
          })}
          {balloonVolume === "OTHER" ? (
            <>
              <label style={labelStyle}>{t("erProcedureLauncher.fieldBalloonVolumeOther")}</label>
              <input
                type="text"
                value={balloonVolumeOther}
                onChange={(e) => setBalloonVolumeOther(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
            </>
          ) : null}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldTolerated")}</label>
          {boolSelect(toleratedWell, setToleratedWell, t)}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldComplications")}</label>
          <textarea
            value={complications}
            onChange={(e) => setComplications(e.target.value)}
            rows={2}
            style={{ ...inputStyle, marginBottom: 10, resize: "vertical" }}
          />
          <label style={labelStyle}>{t("erProcedureLauncher.fieldNotes")}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            style={{ ...inputStyle, marginBottom: 14, resize: "vertical" }}
          />
          <button
            type="submit"
            disabled={ctx.submitting}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: "#1d4ed8",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              cursor: ctx.submitting ? "not-allowed" : "pointer",
            }}
          >
            {t("erProcedureLauncher.save")}
          </button>
        </form>
      )}
    </FormShell>
  );
}

function EkgProcedureForm(p: CommonProps) {
  const { t } = useI18n();
  const [indication, setIndication] = useState<(typeof EKG_INDICATION_VALUES)[number] | "">("");
  const [indicationOther, setIndicationOther] = useState("");
  const [rhythm, setRhythm] = useState<(typeof EKG_RHYTHM_VALUES)[number] | "">("");
  const [rhythmOther, setRhythmOther] = useState("");
  const [rateRange, setRateRange] = useState<(typeof RATE_RANGE_VALUES)[number] | "">("");
  const [providerNotified, setProviderNotified] = useState(false);
  const [copyPlacedInChart, setCopyPlacedInChart] = useState(true);
  const [notes, setNotes] = useState("");

  return (
    <FormShell {...p} titleKey={NON_LACERATION_FORM_TITLE_I18N_KEYS.EKG}>
      {(ctx) => (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ctx.setSubmitErr(null);
            if (indication === "OTHER" && !indicationOther.trim()) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationOtherRequired"));
              return;
            }
            if (rhythm === "OTHER" && !rhythmOther.trim()) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationOtherRequired"));
              return;
            }
            if (!indication || !rhythm || !rateRange) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationIncomplete"));
              return;
            }
            const body: Record<string, unknown> = {
              procedureType: "EKG",
              indication,
              rhythm,
              rateRange,
              providerNotified,
              copyPlacedInChart,
            };
            if (indicationOther.trim()) body.indicationOther = indicationOther.trim();
            if (rhythmOther.trim()) body.rhythmOther = rhythmOther.trim();
            if (notes.trim()) body.notes = notes.trim();
            void ctx.onSubmit(body);
          }}
        >
          <PerformedAtField
            performedAtLocal={ctx.performedAtLocal}
            setPerformedAtLocal={ctx.setPerformedAtLocal}
            t={t}
          />
          <label style={labelStyle}>{t("erProcedureLauncher.fieldEkgIndication")}</label>
          {enumSelect({
            value: indication,
            onChange: setIndication,
            values: EKG_INDICATION_VALUES,
            labelKey: (v) => `erProcedureLauncher.ekgIndication.${v}`,
            t,
            required: true,
            placeholderKey: "erProcedureLauncher.selectPlaceholder",
          })}
          {indication === "OTHER" ? (
            <>
              <label style={labelStyle}>{t("erProcedureLauncher.fieldEkgIndicationOther")}</label>
              <input
                type="text"
                value={indicationOther}
                onChange={(e) => setIndicationOther(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
            </>
          ) : null}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldRhythm")}</label>
          {enumSelect({
            value: rhythm,
            onChange: setRhythm,
            values: EKG_RHYTHM_VALUES,
            labelKey: (v) => `erProcedureLauncher.ekgRhythm.${v}`,
            t,
            required: true,
            placeholderKey: "erProcedureLauncher.selectPlaceholder",
          })}
          {rhythm === "OTHER" ? (
            <>
              <label style={labelStyle}>{t("erProcedureLauncher.fieldRhythmOther")}</label>
              <input
                type="text"
                value={rhythmOther}
                onChange={(e) => setRhythmOther(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
            </>
          ) : null}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldRateRange")}</label>
          {enumSelect({
            value: rateRange,
            onChange: setRateRange,
            values: RATE_RANGE_VALUES,
            labelKey: (v) => `erProcedureLauncher.rateRange.${v}`,
            t,
            required: true,
            placeholderKey: "erProcedureLauncher.selectPlaceholder",
          })}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldProviderNotified")}</label>
          {boolSelect(providerNotified, setProviderNotified, t)}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldCopyInChart")}</label>
          {boolSelect(copyPlacedInChart, setCopyPlacedInChart, t)}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldNotes")}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            style={{ ...inputStyle, marginBottom: 14, resize: "vertical" }}
          />
          <button
            type="submit"
            disabled={ctx.submitting}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: "#1d4ed8",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              cursor: ctx.submitting ? "not-allowed" : "pointer",
            }}
          >
            {t("erProcedureLauncher.save")}
          </button>
        </form>
      )}
    </FormShell>
  );
}

function GlucoseProcedureForm(p: CommonProps) {
  const { t } = useI18n();
  const [resultMgDl, setResultMgDl] = useState("");
  const [specimenSource, setSpecimenSource] = useState<(typeof SPECIMEN_SOURCE_VALUES)[number] | "">("");
  const [specimenSourceOther, setSpecimenSourceOther] = useState("");
  const [actionTaken, setActionTaken] = useState<(typeof GLUCOSE_ACTION_VALUES)[number] | "">("");
  const [actionTakenOther, setActionTakenOther] = useState("");
  const [providerNotified, setProviderNotified] = useState(false);
  const [notes, setNotes] = useState("");

  return (
    <FormShell {...p} titleKey={NON_LACERATION_FORM_TITLE_I18N_KEYS.GLUCOSE_CHECK}>
      {(ctx) => (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ctx.setSubmitErr(null);
            if (!/^\d{1,4}$/.test(resultMgDl.trim())) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationGlucoseNumeric"));
              return;
            }
            if (specimenSource === "OTHER" && !specimenSourceOther.trim()) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationOtherRequired"));
              return;
            }
            if (actionTaken === "OTHER" && !actionTakenOther.trim()) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationOtherRequired"));
              return;
            }
            if (!specimenSource || !actionTaken) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationIncomplete"));
              return;
            }
            const body: Record<string, unknown> = {
              procedureType: "GLUCOSE_CHECK",
              resultMgDl: resultMgDl.trim(),
              specimenSource,
              actionTaken,
              providerNotified,
            };
            if (specimenSourceOther.trim()) body.specimenSourceOther = specimenSourceOther.trim();
            if (actionTakenOther.trim()) body.actionTakenOther = actionTakenOther.trim();
            if (notes.trim()) body.notes = notes.trim();
            void ctx.onSubmit(body);
          }}
        >
          <PerformedAtField
            performedAtLocal={ctx.performedAtLocal}
            setPerformedAtLocal={ctx.setPerformedAtLocal}
            t={t}
          />
          <label style={labelStyle}>{t("erProcedureLauncher.fieldResultMgDl")}</label>
          <input
            type="text"
            inputMode="numeric"
            value={resultMgDl}
            onChange={(e) => setResultMgDl(e.target.value.replace(/\D/g, "").slice(0, 4))}
            style={{ ...inputStyle, marginBottom: 10 }}
          />
          <label style={labelStyle}>{t("erProcedureLauncher.fieldSpecimenSource")}</label>
          {enumSelect({
            value: specimenSource,
            onChange: setSpecimenSource,
            values: SPECIMEN_SOURCE_VALUES,
            labelKey: (v) => `erProcedureLauncher.specimenSource.${v}`,
            t,
            required: true,
            placeholderKey: "erProcedureLauncher.selectPlaceholder",
          })}
          {specimenSource === "OTHER" ? (
            <>
              <label style={labelStyle}>{t("erProcedureLauncher.fieldSpecimenSourceOther")}</label>
              <input
                type="text"
                value={specimenSourceOther}
                onChange={(e) => setSpecimenSourceOther(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
            </>
          ) : null}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldActionTaken")}</label>
          {enumSelect({
            value: actionTaken,
            onChange: setActionTaken,
            values: GLUCOSE_ACTION_VALUES,
            labelKey: (v) => `erProcedureLauncher.glucoseAction.${v}`,
            t,
            required: true,
            placeholderKey: "erProcedureLauncher.selectPlaceholder",
          })}
          {actionTaken === "OTHER" ? (
            <>
              <label style={labelStyle}>{t("erProcedureLauncher.fieldActionTakenOther")}</label>
              <input
                type="text"
                value={actionTakenOther}
                onChange={(e) => setActionTakenOther(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
            </>
          ) : null}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldProviderNotified")}</label>
          {boolSelect(providerNotified, setProviderNotified, t)}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldNotes")}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            style={{ ...inputStyle, marginBottom: 14, resize: "vertical" }}
          />
          <button
            type="submit"
            disabled={ctx.submitting}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: "#1d4ed8",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              cursor: ctx.submitting ? "not-allowed" : "pointer",
            }}
          >
            {t("erProcedureLauncher.save")}
          </button>
        </form>
      )}
    </FormShell>
  );
}

function UrineCollectionProcedureForm(p: CommonProps) {
  const { t } = useI18n();
  const [method, setMethod] = useState<(typeof URINE_METHOD_VALUES)[number] | "">("");
  const [methodOther, setMethodOther] = useState("");
  const [specimenSentToLab, setSpecimenSentToLab] = useState(false);
  const [urineAppearance, setUrineAppearance] = useState<(typeof URINE_APPEARANCE_VALUES)[number] | "">("");
  const [urineAppearanceOther, setUrineAppearanceOther] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <FormShell {...p} titleKey={NON_LACERATION_FORM_TITLE_I18N_KEYS.URINE_COLLECTION}>
      {(ctx) => (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ctx.setSubmitErr(null);
            if (method === "OTHER" && !methodOther.trim()) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationOtherRequired"));
              return;
            }
            if (urineAppearance === "OTHER" && !urineAppearanceOther.trim()) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationOtherRequired"));
              return;
            }
            if (!method || !urineAppearance) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationIncomplete"));
              return;
            }
            const body: Record<string, unknown> = {
              procedureType: "URINE_COLLECTION",
              method,
              specimenSentToLab,
              urineAppearance,
            };
            if (methodOther.trim()) body.methodOther = methodOther.trim();
            if (urineAppearanceOther.trim()) body.urineAppearanceOther = urineAppearanceOther.trim();
            if (notes.trim()) body.notes = notes.trim();
            void ctx.onSubmit(body);
          }}
        >
          <PerformedAtField
            performedAtLocal={ctx.performedAtLocal}
            setPerformedAtLocal={ctx.setPerformedAtLocal}
            t={t}
          />
          <label style={labelStyle}>{t("erProcedureLauncher.fieldUrineMethod")}</label>
          {enumSelect({
            value: method,
            onChange: setMethod,
            values: URINE_METHOD_VALUES,
            labelKey: (v) => `erProcedureLauncher.urineMethod.${v}`,
            t,
            required: true,
            placeholderKey: "erProcedureLauncher.selectPlaceholder",
          })}
          {method === "OTHER" ? (
            <>
              <label style={labelStyle}>{t("erProcedureLauncher.fieldUrineMethodOther")}</label>
              <input
                type="text"
                value={methodOther}
                onChange={(e) => setMethodOther(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
            </>
          ) : null}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldSpecimenSentLab")}</label>
          {boolSelect(specimenSentToLab, setSpecimenSentToLab, t)}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldUrineAppearance")}</label>
          {enumSelect({
            value: urineAppearance,
            onChange: setUrineAppearance,
            values: URINE_APPEARANCE_VALUES,
            labelKey: (v) => `erProcedureLauncher.urineAppearance.${v}`,
            t,
            required: true,
            placeholderKey: "erProcedureLauncher.selectPlaceholder",
          })}
          {urineAppearance === "OTHER" ? (
            <>
              <label style={labelStyle}>{t("erProcedureLauncher.fieldUrineAppearanceOther")}</label>
              <input
                type="text"
                value={urineAppearanceOther}
                onChange={(e) => setUrineAppearanceOther(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
            </>
          ) : null}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldNotes")}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            style={{ ...inputStyle, marginBottom: 14, resize: "vertical" }}
          />
          <button
            type="submit"
            disabled={ctx.submitting}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: "#1d4ed8",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              cursor: ctx.submitting ? "not-allowed" : "pointer",
            }}
          >
            {t("erProcedureLauncher.save")}
          </button>
        </form>
      )}
    </FormShell>
  );
}

function PregnancyTestProcedureForm(p: CommonProps) {
  const { t } = useI18n();
  const [specimen, setSpecimen] = useState<(typeof PREGNANCY_SPECIMEN_VALUES)[number] | "">("");
  const [specimenOther, setSpecimenOther] = useState("");
  const [result, setResult] = useState<(typeof PREGNANCY_RESULT_VALUES)[number] | "">("");
  const [providerNotified, setProviderNotified] = useState(false);
  const [notes, setNotes] = useState("");

  return (
    <FormShell {...p} titleKey={NON_LACERATION_FORM_TITLE_I18N_KEYS.PREGNANCY_TEST}>
      {(ctx) => (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ctx.setSubmitErr(null);
            if (specimen === "OTHER" && !specimenOther.trim()) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationOtherRequired"));
              return;
            }
            if (!specimen || !result) {
              ctx.setSubmitErr(t("erProcedureLauncher.validationIncomplete"));
              return;
            }
            const body: Record<string, unknown> = {
              procedureType: "PREGNANCY_TEST",
              specimen,
              result,
              providerNotified,
            };
            if (specimenOther.trim()) body.specimenOther = specimenOther.trim();
            if (notes.trim()) body.notes = notes.trim();
            void ctx.onSubmit(body);
          }}
        >
          <PerformedAtField
            performedAtLocal={ctx.performedAtLocal}
            setPerformedAtLocal={ctx.setPerformedAtLocal}
            t={t}
          />
          <label style={labelStyle}>{t("erProcedureLauncher.fieldPregnancySpecimen")}</label>
          {enumSelect({
            value: specimen,
            onChange: setSpecimen,
            values: PREGNANCY_SPECIMEN_VALUES,
            labelKey: (v) => `erProcedureLauncher.pregnancySpecimen.${v}`,
            t,
            required: true,
            placeholderKey: "erProcedureLauncher.selectPlaceholder",
          })}
          {specimen === "OTHER" ? (
            <>
              <label style={labelStyle}>{t("erProcedureLauncher.fieldPregnancySpecimenOther")}</label>
              <input
                type="text"
                value={specimenOther}
                onChange={(e) => setSpecimenOther(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
            </>
          ) : null}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldPregnancyResult")}</label>
          {enumSelect({
            value: result,
            onChange: setResult,
            values: PREGNANCY_RESULT_VALUES,
            labelKey: (v) => `erProcedureLauncher.pregnancyResult.${v}`,
            t,
            required: true,
            placeholderKey: "erProcedureLauncher.selectPlaceholder",
          })}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldProviderNotified")}</label>
          {boolSelect(providerNotified, setProviderNotified, t)}
          <label style={labelStyle}>{t("erProcedureLauncher.fieldNotes")}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            style={{ ...inputStyle, marginBottom: 14, resize: "vertical" }}
          />
          <button
            type="submit"
            disabled={ctx.submitting}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: "#1d4ed8",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              cursor: ctx.submitting ? "not-allowed" : "pointer",
            }}
          >
            {t("erProcedureLauncher.save")}
          </button>
        </form>
      )}
    </FormShell>
  );
}

export function NonLacerationProcedureForm({
  procedureType,
  encounterId,
  facilityId,
  onBack,
  onClose,
  onRecorded,
}: {
  procedureType: BasicNonLacerationProcedureType;
  encounterId: string;
  facilityId: string;
  onBack: () => void;
  onClose: () => void;
  onRecorded: () => void;
}) {
  const common: CommonProps = { encounterId, facilityId, onBack, onClose, onRecorded };
  switch (procedureType) {
    case "WOUND_CARE":
      return <WoundCareProcedureForm {...common} />;
    case "INCISION_AND_DRAINAGE":
      return <IncisionDrainageProcedureForm {...common} />;
    case "SPLINT_APPLICATION":
      return <SplintProcedureForm {...common} />;
    case "FOLEY_CATHETER":
      return <FoleyProcedureForm {...common} />;
    case "EKG":
      return <EkgProcedureForm {...common} />;
    case "GLUCOSE_CHECK":
      return <GlucoseProcedureForm {...common} />;
    case "URINE_COLLECTION":
      return <UrineCollectionProcedureForm {...common} />;
    case "PREGNANCY_TEST":
      return <PregnancyTestProcedureForm {...common} />;
  }
}
