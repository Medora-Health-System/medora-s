"use client";

import React, { useState } from "react";
import type { AdvancedDocumentedProcedureType } from "@medora/shared";
import {
  ASA_CLASS_VALUES,
  CENTRAL_LINE_ATTEMPTS_VALUES,
  CENTRAL_LINE_CONFIRMATION_VALUES,
  CENTRAL_LINE_INDICATION_VALUES,
  CENTRAL_LINE_POST_STATUS_VALUES,
  CENTRAL_LINE_SITE_VALUES,
  CENTRAL_LINE_TYPE_VALUES,
  CHEST_TUBE_CONFIRMATION_VALUES,
  CHEST_TUBE_DRAINAGE_TYPE_VALUES,
  CHEST_TUBE_INDICATION_VALUES,
  CHEST_TUBE_INSERTION_SITE_VALUES,
  CHEST_TUBE_OUTPUT_ESTIMATE_VALUES,
  CHEST_TUBE_POST_STATUS_VALUES,
  CHEST_TUBE_TECHNIQUE_VALUES,
  CHEST_TUBE_TUBE_SIZE_VALUES,
  FASTING_STATUS_VALUES,
  FLUID_AMOUNT_REMOVED_VALUES,
  FLUID_APPEARANCE_VALUES,
  FLUID_PROCEDURE_INDICATION_VALUES,
  FLUID_PROCEDURE_SITE_VALUES,
  FLUID_PROCEDURE_TYPE_VALUES,
  INTUBATION_AIRWAY_ASSESSMENT_VALUES,
  INTUBATION_APPROACH_VALUES,
  INTUBATION_ATTEMPTS_VALUES,
  INTUBATION_BLADE_DEVICE_VALUES,
  INTUBATION_CONFIRMATION_VALUES,
  INTUBATION_INDICATION_VALUES,
  INTUBATION_POST_STATUS_VALUES,
  INTUBATION_TUBE_SIZE_VALUES,
  LACERATION_ANESTHESIA_UI_VALUES,
  LP_CSF_APPEARANCE_VALUES,
  LP_INDICATION_VALUES,
  LP_LEVEL_VALUES,
  LP_OPENING_PRESSURE_VALUES,
  LP_POSITION_VALUES,
  LP_TUBES_COLLECTED_VALUES,
  MALLAMPATI_VALUES,
  PELVIC_EXAM_INDICATION_VALUES,
  PELVIC_FINDINGS_SUMMARY_VALUES,
  PELVIC_SPECIMEN_VALUES,
  PROCEDURE_CONSENT_VALUES,
  PROCEDURE_LATERALITY_VALUES,
  PROCEDURE_URGENCY_VALUES,
  REDUCTION_BODY_PART_VALUES,
  REDUCTION_INJURY_TYPE_VALUES,
  REDUCTION_SUCCESS_VALUES,
  REDUCTION_TECHNIQUE_VALUES,
  SEDATION_INDICATION_VALUES,
  SEDATION_MONITORING_VALUES,
  SEDATION_RECOVERY_STATUS_VALUES,
} from "@medora/shared";
import {
  boolSelect,
  enumSelect,
  inputStyle,
  labelStyle,
  PerformedAtField,
  ProcedureFormShell,
  SaveButton,
  trimOptional,
  type ProcedureFormCommonProps,
  validateOtherFields,
  validateRequiredEnums,
} from "@/features/emergency/procedureFormShared";
import { useI18n } from "@/lib/i18n";

export type AdvancedProcedureType = AdvancedDocumentedProcedureType;

export const ADVANCED_PROCEDURE_FORM_TITLE_I18N_KEYS: Record<AdvancedProcedureType, string> = {
  CHEST_TUBE: "erProcedureLauncher.formTitleChestTube",
  INTUBATION: "erProcedureLauncher.formTitleIntubation",
  CENTRAL_LINE: "erProcedureLauncher.formTitleCentralLine",
  PROCEDURAL_SEDATION: "erProcedureLauncher.formTitleProceduralSedation",
  REDUCTION: "erProcedureLauncher.formTitleReduction",
  THORACENTESIS_PARACENTESIS: "erProcedureLauncher.formTitleThoracentesis",
  PELVIC_EXAM: "erProcedureLauncher.formTitlePelvicExam",
  LUMBAR_PUNCTURE: "erProcedureLauncher.formTitleLumbarPuncture",
};

const neuroValues = ["INTACT", "ALTERED", "NOT_ASSESSED", "OTHER"] as const;

function EnumField<T extends string>({
  labelKey,
  value,
  onChange,
  values,
  i18nGroup,
  otherValue,
  onOtherChange,
  t,
}: {
  labelKey: string;
  value: T | "";
  onChange: (v: T | "") => void;
  values: readonly T[];
  i18nGroup: string;
  otherValue?: string;
  onOtherChange?: (v: string) => void;
  t: (k: string) => string;
}) {
  return (
    <>
      <label style={labelStyle}>{t(labelKey)}</label>
      {enumSelect({
        value,
        onChange,
        values,
        labelKey: (v) => `erProcedureLauncher.${i18nGroup}.${v}`,
        t,
        required: true,
        placeholderKey: "erProcedureLauncher.selectPlaceholder",
      })}
      {value === "OTHER" && onOtherChange ? (
        <>
          <label style={labelStyle}>{t("erProcedureLauncher.fieldOtherSpecify")}</label>
          <input
            type="text"
            value={otherValue ?? ""}
            onChange={(e) => onOtherChange(e.target.value)}
            style={{ ...inputStyle, marginBottom: 10 }}
          />
        </>
      ) : null}
    </>
  );
}

function BoolField({
  labelKey,
  value,
  onChange,
  t,
}: {
  labelKey: string;
  value: boolean;
  onChange: (v: boolean) => void;
  t: (k: string) => string;
}) {
  return (
    <>
      <label style={labelStyle}>{t(labelKey)}</label>
      {boolSelect(value, onChange, t)}
    </>
  );
}

function TextAreaField({
  labelKey,
  value,
  onChange,
  t,
}: {
  labelKey: string;
  value: string;
  onChange: (v: string) => void;
  t: (k: string) => string;
}) {
  return (
    <>
      <label style={labelStyle}>{t(labelKey)}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        style={{ ...inputStyle, marginBottom: 10, resize: "vertical" }}
      />
    </>
  );
}

function ChestTubeForm(p: ProcedureFormCommonProps) {
  const { t } = useI18n();
  const [side, setSide] = useState<(typeof PROCEDURE_LATERALITY_VALUES)[number] | "">("");
  const [sideOther, setSideOther] = useState("");
  const [indication, setIndication] = useState<(typeof CHEST_TUBE_INDICATION_VALUES)[number] | "">("");
  const [indicationOther, setIndicationOther] = useState("");
  const [urgency, setUrgency] = useState<(typeof PROCEDURE_URGENCY_VALUES)[number] | "">("");
  const [consent, setConsent] = useState<(typeof PROCEDURE_CONSENT_VALUES)[number] | "">("");
  const [consentOther, setConsentOther] = useState("");
  const [sterilePrep, setSterilePrep] = useState(true);
  const [anesthesia, setAnesthesia] = useState<(typeof LACERATION_ANESTHESIA_UI_VALUES)[number] | "">("");
  const [anesthesiaOther, setAnesthesiaOther] = useState("");
  const [tubeSize, setTubeSize] = useState<(typeof CHEST_TUBE_TUBE_SIZE_VALUES)[number] | "">("");
  const [tubeSizeOther, setTubeSizeOther] = useState("");
  const [insertionSite, setInsertionSite] = useState<(typeof CHEST_TUBE_INSERTION_SITE_VALUES)[number] | "">("");
  const [insertionSiteOther, setInsertionSiteOther] = useState("");
  const [technique, setTechnique] = useState<(typeof CHEST_TUBE_TECHNIQUE_VALUES)[number] | "">("");
  const [techniqueOther, setTechniqueOther] = useState("");
  const [confirmationMethod, setConfirmationMethod] = useState<(typeof CHEST_TUBE_CONFIRMATION_VALUES)[number] | "">("");
  const [confirmationMethodOther, setConfirmationMethodOther] = useState("");
  const [drainageType, setDrainageType] = useState<(typeof CHEST_TUBE_DRAINAGE_TYPE_VALUES)[number] | "">("");
  const [drainageTypeOther, setDrainageTypeOther] = useState("");
  const [estimatedOutput, setEstimatedOutput] = useState<(typeof CHEST_TUBE_OUTPUT_ESTIMATE_VALUES)[number] | "">("");
  const [estimatedOutputOther, setEstimatedOutputOther] = useState("");
  const [postProcedureStatus, setPostProcedureStatus] = useState<(typeof CHEST_TUBE_POST_STATUS_VALUES)[number] | "">("");
  const [postProcedureStatusOther, setPostProcedureStatusOther] = useState("");
  const [toleratedWell, setToleratedWell] = useState(true);
  const [followUpImagingOrdered, setFollowUpImagingOrdered] = useState(false);
  const [complications, setComplications] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <ProcedureFormShell {...p} titleKey={ADVANCED_PROCEDURE_FORM_TITLE_I18N_KEYS.CHEST_TUBE}>
      {(ctx) => (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ctx.setSubmitErr(null);
            if (
              !validateOtherFields(
                [
                  { value: side, other: sideOther },
                  { value: indication, other: indicationOther },
                  { value: consent, other: consentOther },
                  { value: anesthesia, other: anesthesiaOther },
                  { value: tubeSize, other: tubeSizeOther },
                  { value: insertionSite, other: insertionSiteOther },
                  { value: technique, other: techniqueOther },
                  { value: confirmationMethod, other: confirmationMethodOther },
                  { value: drainageType, other: drainageTypeOther },
                  { value: estimatedOutput, other: estimatedOutputOther },
                  { value: postProcedureStatus, other: postProcedureStatusOther },
                ],
                ctx.setSubmitErr,
                t
              )
            )
              return;
            if (
              !validateRequiredEnums(
                [side, indication, urgency, consent, anesthesia, tubeSize, insertionSite, technique, confirmationMethod, drainageType, estimatedOutput, postProcedureStatus],
                ctx.setSubmitErr,
                t
              )
            )
              return;
            const body: Record<string, unknown> = {
              procedureType: "CHEST_TUBE",
              side,
              indication,
              urgency,
              consent,
              sterilePrep,
              anesthesia,
              tubeSize,
              insertionSite,
              technique,
              confirmationMethod,
              drainageType,
              estimatedOutput,
              postProcedureStatus,
              toleratedWell,
              followUpImagingOrdered,
            };
            trimOptional(body, "sideOther", sideOther);
            trimOptional(body, "indicationOther", indicationOther);
            trimOptional(body, "consentOther", consentOther);
            trimOptional(body, "anesthesiaOther", anesthesiaOther);
            trimOptional(body, "tubeSizeOther", tubeSizeOther);
            trimOptional(body, "insertionSiteOther", insertionSiteOther);
            trimOptional(body, "techniqueOther", techniqueOther);
            trimOptional(body, "confirmationMethodOther", confirmationMethodOther);
            trimOptional(body, "drainageTypeOther", drainageTypeOther);
            trimOptional(body, "estimatedOutputOther", estimatedOutputOther);
            trimOptional(body, "postProcedureStatusOther", postProcedureStatusOther);
            trimOptional(body, "complications", complications);
            trimOptional(body, "notes", notes);
            void ctx.onSubmit(body);
          }}
        >
          <PerformedAtField performedAtLocal={ctx.performedAtLocal} setPerformedAtLocal={ctx.setPerformedAtLocal} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldSide" value={side} onChange={setSide} values={PROCEDURE_LATERALITY_VALUES} i18nGroup="laterality" otherValue={sideOther} onOtherChange={setSideOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldChestTubeIndication" value={indication} onChange={setIndication} values={CHEST_TUBE_INDICATION_VALUES} i18nGroup="chestTubeIndication" otherValue={indicationOther} onOtherChange={setIndicationOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldUrgency" value={urgency} onChange={setUrgency} values={PROCEDURE_URGENCY_VALUES} i18nGroup="urgency" t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldConsent" value={consent} onChange={setConsent} values={PROCEDURE_CONSENT_VALUES} i18nGroup="consent" otherValue={consentOther} onOtherChange={setConsentOther} t={t} />
          <BoolField labelKey="erProcedureLauncher.fieldSterilePrep" value={sterilePrep} onChange={setSterilePrep} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldAnesthesia" value={anesthesia} onChange={setAnesthesia} values={LACERATION_ANESTHESIA_UI_VALUES} i18nGroup="anesthesia" otherValue={anesthesiaOther} onOtherChange={setAnesthesiaOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldChestTubeSize" value={tubeSize} onChange={setTubeSize} values={CHEST_TUBE_TUBE_SIZE_VALUES} i18nGroup="chestTubeSize" otherValue={tubeSizeOther} onOtherChange={setTubeSizeOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldInsertionSite" value={insertionSite} onChange={setInsertionSite} values={CHEST_TUBE_INSERTION_SITE_VALUES} i18nGroup="chestTubeInsertionSite" otherValue={insertionSiteOther} onOtherChange={setInsertionSiteOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldTechnique" value={technique} onChange={setTechnique} values={CHEST_TUBE_TECHNIQUE_VALUES} i18nGroup="chestTubeTechnique" otherValue={techniqueOther} onOtherChange={setTechniqueOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldConfirmationMethod" value={confirmationMethod} onChange={setConfirmationMethod} values={CHEST_TUBE_CONFIRMATION_VALUES} i18nGroup="chestTubeConfirmation" otherValue={confirmationMethodOther} onOtherChange={setConfirmationMethodOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldDrainageType" value={drainageType} onChange={setDrainageType} values={CHEST_TUBE_DRAINAGE_TYPE_VALUES} i18nGroup="chestTubeDrainageType" otherValue={drainageTypeOther} onOtherChange={setDrainageTypeOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldEstimatedOutput" value={estimatedOutput} onChange={setEstimatedOutput} values={CHEST_TUBE_OUTPUT_ESTIMATE_VALUES} i18nGroup="chestTubeOutput" otherValue={estimatedOutputOther} onOtherChange={setEstimatedOutputOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldPostProcedureStatus" value={postProcedureStatus} onChange={setPostProcedureStatus} values={CHEST_TUBE_POST_STATUS_VALUES} i18nGroup="chestTubePostStatus" otherValue={postProcedureStatusOther} onOtherChange={setPostProcedureStatusOther} t={t} />
          <BoolField labelKey="erProcedureLauncher.fieldTolerated" value={toleratedWell} onChange={setToleratedWell} t={t} />
          <BoolField labelKey="erProcedureLauncher.fieldFollowUpImagingOrdered" value={followUpImagingOrdered} onChange={setFollowUpImagingOrdered} t={t} />
          <TextAreaField labelKey="erProcedureLauncher.fieldComplications" value={complications} onChange={setComplications} t={t} />
          <TextAreaField labelKey="erProcedureLauncher.fieldNotes" value={notes} onChange={setNotes} t={t} />
          <SaveButton submitting={ctx.submitting} t={t} />
        </form>
      )}
    </ProcedureFormShell>
  );
}

function IntubationForm(p: ProcedureFormCommonProps) {
  const { t } = useI18n();
  const [indication, setIndication] = useState<(typeof INTUBATION_INDICATION_VALUES)[number] | "">("");
  const [indicationOther, setIndicationOther] = useState("");
  const [approach, setApproach] = useState<(typeof INTUBATION_APPROACH_VALUES)[number] | "">("");
  const [approachOther, setApproachOther] = useState("");
  const [preoxygenation, setPreoxygenation] = useState(true);
  const [airwayAssessment, setAirwayAssessment] = useState<(typeof INTUBATION_AIRWAY_ASSESSMENT_VALUES)[number] | "">("");
  const [airwayAssessmentOther, setAirwayAssessmentOther] = useState("");
  const [medicationsUsed, setMedicationsUsed] = useState("");
  const [bladeDevice, setBladeDevice] = useState<(typeof INTUBATION_BLADE_DEVICE_VALUES)[number] | "">("");
  const [bladeDeviceOther, setBladeDeviceOther] = useState("");
  const [tubeSize, setTubeSize] = useState<(typeof INTUBATION_TUBE_SIZE_VALUES)[number] | "">("");
  const [tubeSizeOther, setTubeSizeOther] = useState("");
  const [attempts, setAttempts] = useState<(typeof INTUBATION_ATTEMPTS_VALUES)[number] | "">("");
  const [successfulAttemptNumber, setSuccessfulAttemptNumber] = useState<(typeof INTUBATION_ATTEMPTS_VALUES)[number] | "">("");
  const [confirmationMethod, setConfirmationMethod] = useState<(typeof INTUBATION_CONFIRMATION_VALUES)[number] | "">("");
  const [confirmationMethodOther, setConfirmationMethodOther] = useState("");
  const [postIntubationStatus, setPostIntubationStatus] = useState<(typeof INTUBATION_POST_STATUS_VALUES)[number] | "">("");
  const [postIntubationStatusOther, setPostIntubationStatusOther] = useState("");
  const [ventilatorInitiated, setVentilatorInitiated] = useState(true);
  const [complications, setComplications] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <ProcedureFormShell {...p} titleKey={ADVANCED_PROCEDURE_FORM_TITLE_I18N_KEYS.INTUBATION}>
      {(ctx) => (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ctx.setSubmitErr(null);
            if (
              !validateOtherFields(
                [
                  { value: indication, other: indicationOther },
                  { value: approach, other: approachOther },
                  { value: airwayAssessment, other: airwayAssessmentOther },
                  { value: bladeDevice, other: bladeDeviceOther },
                  { value: tubeSize, other: tubeSizeOther },
                  { value: confirmationMethod, other: confirmationMethodOther },
                  { value: postIntubationStatus, other: postIntubationStatusOther },
                ],
                ctx.setSubmitErr,
                t
              )
            )
              return;
            if (
              !validateRequiredEnums(
                [indication, approach, airwayAssessment, bladeDevice, tubeSize, attempts, successfulAttemptNumber, confirmationMethod, postIntubationStatus],
                ctx.setSubmitErr,
                t
              )
            )
              return;
            const body: Record<string, unknown> = {
              procedureType: "INTUBATION",
              indication,
              approach,
              preoxygenation,
              airwayAssessment,
              bladeDevice,
              tubeSize,
              attempts,
              successfulAttemptNumber,
              confirmationMethod,
              postIntubationStatus,
              ventilatorInitiated,
            };
            trimOptional(body, "indicationOther", indicationOther);
            trimOptional(body, "approachOther", approachOther);
            trimOptional(body, "airwayAssessmentOther", airwayAssessmentOther);
            trimOptional(body, "medicationsUsed", medicationsUsed);
            trimOptional(body, "bladeDeviceOther", bladeDeviceOther);
            trimOptional(body, "tubeSizeOther", tubeSizeOther);
            trimOptional(body, "confirmationMethodOther", confirmationMethodOther);
            trimOptional(body, "postIntubationStatusOther", postIntubationStatusOther);
            trimOptional(body, "complications", complications);
            trimOptional(body, "notes", notes);
            void ctx.onSubmit(body);
          }}
        >
          <PerformedAtField performedAtLocal={ctx.performedAtLocal} setPerformedAtLocal={ctx.setPerformedAtLocal} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldIntubationIndication" value={indication} onChange={setIndication} values={INTUBATION_INDICATION_VALUES} i18nGroup="intubationIndication" otherValue={indicationOther} onOtherChange={setIndicationOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldIntubationApproach" value={approach} onChange={setApproach} values={INTUBATION_APPROACH_VALUES} i18nGroup="intubationApproach" otherValue={approachOther} onOtherChange={setApproachOther} t={t} />
          <BoolField labelKey="erProcedureLauncher.fieldPreoxygenation" value={preoxygenation} onChange={setPreoxygenation} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldAirwayAssessment" value={airwayAssessment} onChange={setAirwayAssessment} values={INTUBATION_AIRWAY_ASSESSMENT_VALUES} i18nGroup="intubationAirwayAssessment" otherValue={airwayAssessmentOther} onOtherChange={setAirwayAssessmentOther} t={t} />
          <TextAreaField labelKey="erProcedureLauncher.fieldMedicationsUsed" value={medicationsUsed} onChange={setMedicationsUsed} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldBladeDevice" value={bladeDevice} onChange={setBladeDevice} values={INTUBATION_BLADE_DEVICE_VALUES} i18nGroup="intubationBladeDevice" otherValue={bladeDeviceOther} onOtherChange={setBladeDeviceOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldIntubationTubeSize" value={tubeSize} onChange={setTubeSize} values={INTUBATION_TUBE_SIZE_VALUES} i18nGroup="intubationTubeSize" otherValue={tubeSizeOther} onOtherChange={setTubeSizeOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldAttempts" value={attempts} onChange={setAttempts} values={INTUBATION_ATTEMPTS_VALUES} i18nGroup="attemptCount" t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldSuccessfulAttemptNumber" value={successfulAttemptNumber} onChange={setSuccessfulAttemptNumber} values={INTUBATION_ATTEMPTS_VALUES} i18nGroup="attemptCount" t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldConfirmationMethod" value={confirmationMethod} onChange={setConfirmationMethod} values={INTUBATION_CONFIRMATION_VALUES} i18nGroup="intubationConfirmation" otherValue={confirmationMethodOther} onOtherChange={setConfirmationMethodOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldPostIntubationStatus" value={postIntubationStatus} onChange={setPostIntubationStatus} values={INTUBATION_POST_STATUS_VALUES} i18nGroup="intubationPostStatus" otherValue={postIntubationStatusOther} onOtherChange={setPostIntubationStatusOther} t={t} />
          <BoolField labelKey="erProcedureLauncher.fieldVentilatorInitiated" value={ventilatorInitiated} onChange={setVentilatorInitiated} t={t} />
          <TextAreaField labelKey="erProcedureLauncher.fieldComplications" value={complications} onChange={setComplications} t={t} />
          <TextAreaField labelKey="erProcedureLauncher.fieldNotes" value={notes} onChange={setNotes} t={t} />
          <SaveButton submitting={ctx.submitting} t={t} />
        </form>
      )}
    </ProcedureFormShell>
  );
}

function CentralLineForm(p: ProcedureFormCommonProps) {
  const { t } = useI18n();
  const [lineType, setLineType] = useState<(typeof CENTRAL_LINE_TYPE_VALUES)[number] | "">("");
  const [lineTypeOther, setLineTypeOther] = useState("");
  const [site, setSite] = useState<(typeof CENTRAL_LINE_SITE_VALUES)[number] | "">("");
  const [siteOther, setSiteOther] = useState("");
  const [indication, setIndication] = useState<(typeof CENTRAL_LINE_INDICATION_VALUES)[number] | "">("");
  const [indicationOther, setIndicationOther] = useState("");
  const [ultrasoundGuidance, setUltrasoundGuidance] = useState(true);
  const [sterileTechnique, setSterileTechnique] = useState(true);
  const [attempts, setAttempts] = useState<(typeof CENTRAL_LINE_ATTEMPTS_VALUES)[number] | "">("");
  const [successfulPlacement, setSuccessfulPlacement] = useState(true);
  const [confirmation, setConfirmation] = useState<(typeof CENTRAL_LINE_CONFIRMATION_VALUES)[number] | "">("");
  const [confirmationOther, setConfirmationOther] = useState("");
  const [postProcedureStatus, setPostProcedureStatus] = useState<(typeof CENTRAL_LINE_POST_STATUS_VALUES)[number] | "">("");
  const [postProcedureStatusOther, setPostProcedureStatusOther] = useState("");
  const [complications, setComplications] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <ProcedureFormShell {...p} titleKey={ADVANCED_PROCEDURE_FORM_TITLE_I18N_KEYS.CENTRAL_LINE}>
      {(ctx) => (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ctx.setSubmitErr(null);
            if (
              !validateOtherFields(
                [
                  { value: lineType, other: lineTypeOther },
                  { value: site, other: siteOther },
                  { value: indication, other: indicationOther },
                  { value: confirmation, other: confirmationOther },
                  { value: postProcedureStatus, other: postProcedureStatusOther },
                ],
                ctx.setSubmitErr,
                t
              )
            )
              return;
            if (!validateRequiredEnums([lineType, site, indication, attempts, confirmation, postProcedureStatus], ctx.setSubmitErr, t)) return;
            const body: Record<string, unknown> = {
              procedureType: "CENTRAL_LINE",
              lineType,
              site,
              indication,
              ultrasoundGuidance,
              sterileTechnique,
              attempts,
              successfulPlacement,
              confirmation,
              postProcedureStatus,
            };
            trimOptional(body, "lineTypeOther", lineTypeOther);
            trimOptional(body, "siteOther", siteOther);
            trimOptional(body, "indicationOther", indicationOther);
            trimOptional(body, "confirmationOther", confirmationOther);
            trimOptional(body, "postProcedureStatusOther", postProcedureStatusOther);
            trimOptional(body, "complications", complications);
            trimOptional(body, "notes", notes);
            void ctx.onSubmit(body);
          }}
        >
          <PerformedAtField performedAtLocal={ctx.performedAtLocal} setPerformedAtLocal={ctx.setPerformedAtLocal} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldCentralLineType" value={lineType} onChange={setLineType} values={CENTRAL_LINE_TYPE_VALUES} i18nGroup="centralLineType" otherValue={lineTypeOther} onOtherChange={setLineTypeOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldCentralLineSite" value={site} onChange={setSite} values={CENTRAL_LINE_SITE_VALUES} i18nGroup="centralLineSite" otherValue={siteOther} onOtherChange={setSiteOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldCentralLineIndication" value={indication} onChange={setIndication} values={CENTRAL_LINE_INDICATION_VALUES} i18nGroup="centralLineIndication" otherValue={indicationOther} onOtherChange={setIndicationOther} t={t} />
          <BoolField labelKey="erProcedureLauncher.fieldUltrasoundGuidance" value={ultrasoundGuidance} onChange={setUltrasoundGuidance} t={t} />
          <BoolField labelKey="erProcedureLauncher.fieldAsepticTechnique" value={sterileTechnique} onChange={setSterileTechnique} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldAttempts" value={attempts} onChange={setAttempts} values={CENTRAL_LINE_ATTEMPTS_VALUES} i18nGroup="attemptCount" t={t} />
          <BoolField labelKey="erProcedureLauncher.fieldSuccessfulPlacement" value={successfulPlacement} onChange={setSuccessfulPlacement} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldConfirmationMethod" value={confirmation} onChange={setConfirmation} values={CENTRAL_LINE_CONFIRMATION_VALUES} i18nGroup="centralLineConfirmation" otherValue={confirmationOther} onOtherChange={setConfirmationOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldPostProcedureStatus" value={postProcedureStatus} onChange={setPostProcedureStatus} values={CENTRAL_LINE_POST_STATUS_VALUES} i18nGroup="centralLinePostStatus" otherValue={postProcedureStatusOther} onOtherChange={setPostProcedureStatusOther} t={t} />
          <TextAreaField labelKey="erProcedureLauncher.fieldComplications" value={complications} onChange={setComplications} t={t} />
          <TextAreaField labelKey="erProcedureLauncher.fieldNotes" value={notes} onChange={setNotes} t={t} />
          <SaveButton submitting={ctx.submitting} t={t} />
        </form>
      )}
    </ProcedureFormShell>
  );
}

function ProceduralSedationForm(p: ProcedureFormCommonProps) {
  const { t } = useI18n();
  const [sedationEndLocal, setSedationEndLocal] = useState("");
  const [indication, setIndication] = useState<(typeof SEDATION_INDICATION_VALUES)[number] | "">("");
  const [indicationOther, setIndicationOther] = useState("");
  const [consent, setConsent] = useState<(typeof PROCEDURE_CONSENT_VALUES)[number] | "">("");
  const [consentOther, setConsentOther] = useState("");
  const [asaClass, setAsaClass] = useState<(typeof ASA_CLASS_VALUES)[number] | "">("");
  const [mallampati, setMallampati] = useState<(typeof MALLAMPATI_VALUES)[number] | "">("");
  const [fastingStatus, setFastingStatus] = useState<(typeof FASTING_STATUS_VALUES)[number] | "">("");
  const [medicationsUsed, setMedicationsUsed] = useState("");
  const [monitoringUsed, setMonitoringUsed] = useState<(typeof SEDATION_MONITORING_VALUES)[number] | "">("");
  const [monitoringUsedOther, setMonitoringUsedOther] = useState("");
  const [continuousMonitoring, setContinuousMonitoring] = useState(true);
  const [recoveryStatus, setRecoveryStatus] = useState<(typeof SEDATION_RECOVERY_STATUS_VALUES)[number] | "">("");
  const [recoveryStatusOther, setRecoveryStatusOther] = useState("");
  const [complications, setComplications] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <ProcedureFormShell {...p} titleKey={ADVANCED_PROCEDURE_FORM_TITLE_I18N_KEYS.PROCEDURAL_SEDATION}>
      {(ctx) => (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ctx.setSubmitErr(null);
            if (
              !validateOtherFields(
                [
                  { value: indication, other: indicationOther },
                  { value: consent, other: consentOther },
                  { value: monitoringUsed, other: monitoringUsedOther },
                  { value: recoveryStatus, other: recoveryStatusOther },
                ],
                ctx.setSubmitErr,
                t
              )
            )
              return;
            if (!validateRequiredEnums([indication, consent, asaClass, mallampati, fastingStatus, monitoringUsed, recoveryStatus], ctx.setSubmitErr, t)) return;
            const body: Record<string, unknown> = {
              procedureType: "PROCEDURAL_SEDATION",
              indication,
              consent,
              asaClass,
              mallampati,
              fastingStatus,
              monitoringUsed,
              continuousMonitoring,
              recoveryStatus,
            };
            if (sedationEndLocal.trim()) {
              const d = new Date(sedationEndLocal);
              if (!Number.isNaN(d.getTime())) body.sedationEndAt = d.toISOString();
            }
            trimOptional(body, "indicationOther", indicationOther);
            trimOptional(body, "consentOther", consentOther);
            trimOptional(body, "medicationsUsed", medicationsUsed);
            trimOptional(body, "monitoringUsedOther", monitoringUsedOther);
            trimOptional(body, "recoveryStatusOther", recoveryStatusOther);
            trimOptional(body, "complications", complications);
            trimOptional(body, "notes", notes);
            void ctx.onSubmit(body);
          }}
        >
          <PerformedAtField performedAtLocal={ctx.performedAtLocal} setPerformedAtLocal={ctx.setPerformedAtLocal} t={t} />
          <label style={labelStyle}>{t("erProcedureLauncher.fieldSedationEndAt")}</label>
          <input type="datetime-local" value={sedationEndLocal} onChange={(e) => setSedationEndLocal(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
          <EnumField labelKey="erProcedureLauncher.fieldSedationIndication" value={indication} onChange={setIndication} values={SEDATION_INDICATION_VALUES} i18nGroup="sedationIndication" otherValue={indicationOther} onOtherChange={setIndicationOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldConsent" value={consent} onChange={setConsent} values={PROCEDURE_CONSENT_VALUES} i18nGroup="consent" otherValue={consentOther} onOtherChange={setConsentOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldAsaClass" value={asaClass} onChange={setAsaClass} values={ASA_CLASS_VALUES} i18nGroup="asaClass" t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldMallampati" value={mallampati} onChange={setMallampati} values={MALLAMPATI_VALUES} i18nGroup="mallampati" t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldFastingStatus" value={fastingStatus} onChange={setFastingStatus} values={FASTING_STATUS_VALUES} i18nGroup="fastingStatus" t={t} />
          <TextAreaField labelKey="erProcedureLauncher.fieldMedicationsUsed" value={medicationsUsed} onChange={setMedicationsUsed} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldMonitoringUsed" value={monitoringUsed} onChange={setMonitoringUsed} values={SEDATION_MONITORING_VALUES} i18nGroup="sedationMonitoring" otherValue={monitoringUsedOther} onOtherChange={setMonitoringUsedOther} t={t} />
          <BoolField labelKey="erProcedureLauncher.fieldContinuousMonitoring" value={continuousMonitoring} onChange={setContinuousMonitoring} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldRecoveryStatus" value={recoveryStatus} onChange={setRecoveryStatus} values={SEDATION_RECOVERY_STATUS_VALUES} i18nGroup="sedationRecoveryStatus" otherValue={recoveryStatusOther} onOtherChange={setRecoveryStatusOther} t={t} />
          <TextAreaField labelKey="erProcedureLauncher.fieldComplications" value={complications} onChange={setComplications} t={t} />
          <TextAreaField labelKey="erProcedureLauncher.fieldNotes" value={notes} onChange={setNotes} t={t} />
          <SaveButton submitting={ctx.submitting} t={t} />
        </form>
      )}
    </ProcedureFormShell>
  );
}

function ReductionForm(p: ProcedureFormCommonProps) {
  const { t } = useI18n();
  const [bodyPart, setBodyPart] = useState<(typeof REDUCTION_BODY_PART_VALUES)[number] | "">("");
  const [bodyPartOther, setBodyPartOther] = useState("");
  const [injuryType, setInjuryType] = useState<(typeof REDUCTION_INJURY_TYPE_VALUES)[number] | "">("");
  const [injuryTypeOther, setInjuryTypeOther] = useState("");
  const [neurovascularBefore, setNeurovascularBefore] = useState<(typeof neuroValues)[number] | "">("");
  const [neurovascularBeforeOther, setNeurovascularBeforeOther] = useState("");
  const [anesthesia, setAnesthesia] = useState<(typeof LACERATION_ANESTHESIA_UI_VALUES)[number] | "">("");
  const [anesthesiaOther, setAnesthesiaOther] = useState("");
  const [reductionTechnique, setReductionTechnique] = useState<(typeof REDUCTION_TECHNIQUE_VALUES)[number] | "">("");
  const [reductionTechniqueOther, setReductionTechniqueOther] = useState("");
  const [reductionSuccess, setReductionSuccess] = useState<(typeof REDUCTION_SUCCESS_VALUES)[number] | "">("");
  const [postReductionImaging, setPostReductionImaging] = useState(false);
  const [neurovascularAfter, setNeurovascularAfter] = useState<(typeof neuroValues)[number] | "">("");
  const [neurovascularAfterOther, setNeurovascularAfterOther] = useState("");
  const [splintApplied, setSplintApplied] = useState(false);
  const [complications, setComplications] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <ProcedureFormShell {...p} titleKey={ADVANCED_PROCEDURE_FORM_TITLE_I18N_KEYS.REDUCTION}>
      {(ctx) => (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ctx.setSubmitErr(null);
            if (
              !validateOtherFields(
                [
                  { value: bodyPart, other: bodyPartOther },
                  { value: injuryType, other: injuryTypeOther },
                  { value: neurovascularBefore, other: neurovascularBeforeOther },
                  { value: anesthesia, other: anesthesiaOther },
                  { value: reductionTechnique, other: reductionTechniqueOther },
                  { value: neurovascularAfter, other: neurovascularAfterOther },
                ],
                ctx.setSubmitErr,
                t
              )
            )
              return;
            if (
              !validateRequiredEnums(
                [bodyPart, injuryType, neurovascularBefore, anesthesia, reductionTechnique, reductionSuccess, neurovascularAfter],
                ctx.setSubmitErr,
                t
              )
            )
              return;
            const body: Record<string, unknown> = {
              procedureType: "REDUCTION",
              bodyPart,
              injuryType,
              neurovascularBefore,
              anesthesia,
              reductionTechnique,
              reductionSuccess,
              postReductionImaging,
              neurovascularAfter,
              splintApplied,
            };
            trimOptional(body, "bodyPartOther", bodyPartOther);
            trimOptional(body, "injuryTypeOther", injuryTypeOther);
            trimOptional(body, "neurovascularBeforeOther", neurovascularBeforeOther);
            trimOptional(body, "anesthesiaOther", anesthesiaOther);
            trimOptional(body, "reductionTechniqueOther", reductionTechniqueOther);
            trimOptional(body, "neurovascularAfterOther", neurovascularAfterOther);
            trimOptional(body, "complications", complications);
            trimOptional(body, "notes", notes);
            void ctx.onSubmit(body);
          }}
        >
          <PerformedAtField performedAtLocal={ctx.performedAtLocal} setPerformedAtLocal={ctx.setPerformedAtLocal} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldBodyPart" value={bodyPart} onChange={setBodyPart} values={REDUCTION_BODY_PART_VALUES} i18nGroup="reductionBodyPart" otherValue={bodyPartOther} onOtherChange={setBodyPartOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldInjuryType" value={injuryType} onChange={setInjuryType} values={REDUCTION_INJURY_TYPE_VALUES} i18nGroup="reductionInjuryType" otherValue={injuryTypeOther} onOtherChange={setInjuryTypeOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldNeuroBefore" value={neurovascularBefore} onChange={setNeurovascularBefore} values={neuroValues} i18nGroup="neurovascularStatus" otherValue={neurovascularBeforeOther} onOtherChange={setNeurovascularBeforeOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldAnesthesia" value={anesthesia} onChange={setAnesthesia} values={LACERATION_ANESTHESIA_UI_VALUES} i18nGroup="anesthesia" otherValue={anesthesiaOther} onOtherChange={setAnesthesiaOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldReductionTechnique" value={reductionTechnique} onChange={setReductionTechnique} values={REDUCTION_TECHNIQUE_VALUES} i18nGroup="reductionTechnique" otherValue={reductionTechniqueOther} onOtherChange={setReductionTechniqueOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldReductionSuccess" value={reductionSuccess} onChange={setReductionSuccess} values={REDUCTION_SUCCESS_VALUES} i18nGroup="reductionSuccess" t={t} />
          <BoolField labelKey="erProcedureLauncher.fieldPostReductionImaging" value={postReductionImaging} onChange={setPostReductionImaging} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldNeuroAfter" value={neurovascularAfter} onChange={setNeurovascularAfter} values={neuroValues} i18nGroup="neurovascularStatus" otherValue={neurovascularAfterOther} onOtherChange={setNeurovascularAfterOther} t={t} />
          <BoolField labelKey="erProcedureLauncher.fieldSplintApplied" value={splintApplied} onChange={setSplintApplied} t={t} />
          <TextAreaField labelKey="erProcedureLauncher.fieldComplications" value={complications} onChange={setComplications} t={t} />
          <TextAreaField labelKey="erProcedureLauncher.fieldNotes" value={notes} onChange={setNotes} t={t} />
          <SaveButton submitting={ctx.submitting} t={t} />
        </form>
      )}
    </ProcedureFormShell>
  );
}

function ThoracentesisParacentesisForm(p: ProcedureFormCommonProps) {
  const { t } = useI18n();
  const [fluidProcedureType, setFluidProcedureType] = useState<(typeof FLUID_PROCEDURE_TYPE_VALUES)[number] | "">("");
  const [indication, setIndication] = useState<(typeof FLUID_PROCEDURE_INDICATION_VALUES)[number] | "">("");
  const [indicationOther, setIndicationOther] = useState("");
  const [site, setSite] = useState<(typeof FLUID_PROCEDURE_SITE_VALUES)[number] | "">("");
  const [siteOther, setSiteOther] = useState("");
  const [ultrasoundGuidance, setUltrasoundGuidance] = useState(true);
  const [sterilePrep, setSterilePrep] = useState(true);
  const [anesthetic, setAnesthetic] = useState<(typeof LACERATION_ANESTHESIA_UI_VALUES)[number] | "">("");
  const [anestheticOther, setAnestheticOther] = useState("");
  const [amountRemoved, setAmountRemoved] = useState<(typeof FLUID_AMOUNT_REMOVED_VALUES)[number] | "">("");
  const [amountRemovedOther, setAmountRemovedOther] = useState("");
  const [fluidAppearance, setFluidAppearance] = useState<(typeof FLUID_APPEARANCE_VALUES)[number] | "">("");
  const [fluidAppearanceOther, setFluidAppearanceOther] = useState("");
  const [specimenSent, setSpecimenSent] = useState(false);
  const [toleratedWell, setToleratedWell] = useState(true);
  const [complications, setComplications] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <ProcedureFormShell {...p} titleKey={ADVANCED_PROCEDURE_FORM_TITLE_I18N_KEYS.THORACENTESIS_PARACENTESIS}>
      {(ctx) => (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ctx.setSubmitErr(null);
            if (
              !validateOtherFields(
                [
                  { value: indication, other: indicationOther },
                  { value: site, other: siteOther },
                  { value: anesthetic, other: anestheticOther },
                  { value: amountRemoved, other: amountRemovedOther },
                  { value: fluidAppearance, other: fluidAppearanceOther },
                ],
                ctx.setSubmitErr,
                t
              )
            )
              return;
            if (!validateRequiredEnums([fluidProcedureType, indication, site, anesthetic, amountRemoved, fluidAppearance], ctx.setSubmitErr, t)) return;
            const body: Record<string, unknown> = {
              procedureType: "THORACENTESIS_PARACENTESIS",
              fluidProcedureType,
              indication,
              site,
              ultrasoundGuidance,
              sterilePrep,
              anesthetic,
              amountRemoved,
              fluidAppearance,
              specimenSent,
              toleratedWell,
            };
            trimOptional(body, "indicationOther", indicationOther);
            trimOptional(body, "siteOther", siteOther);
            trimOptional(body, "anestheticOther", anestheticOther);
            trimOptional(body, "amountRemovedOther", amountRemovedOther);
            trimOptional(body, "fluidAppearanceOther", fluidAppearanceOther);
            trimOptional(body, "complications", complications);
            trimOptional(body, "notes", notes);
            void ctx.onSubmit(body);
          }}
        >
          <PerformedAtField performedAtLocal={ctx.performedAtLocal} setPerformedAtLocal={ctx.setPerformedAtLocal} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldFluidProcedureType" value={fluidProcedureType} onChange={setFluidProcedureType} values={FLUID_PROCEDURE_TYPE_VALUES} i18nGroup="fluidProcedureType" t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldFluidIndication" value={indication} onChange={setIndication} values={FLUID_PROCEDURE_INDICATION_VALUES} i18nGroup="fluidProcedureIndication" otherValue={indicationOther} onOtherChange={setIndicationOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldFluidSite" value={site} onChange={setSite} values={FLUID_PROCEDURE_SITE_VALUES} i18nGroup="fluidProcedureSite" otherValue={siteOther} onOtherChange={setSiteOther} t={t} />
          <BoolField labelKey="erProcedureLauncher.fieldUltrasoundGuidance" value={ultrasoundGuidance} onChange={setUltrasoundGuidance} t={t} />
          <BoolField labelKey="erProcedureLauncher.fieldSterilePrep" value={sterilePrep} onChange={setSterilePrep} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldAnesthetic" value={anesthetic} onChange={setAnesthetic} values={LACERATION_ANESTHESIA_UI_VALUES} i18nGroup="anesthesia" otherValue={anestheticOther} onOtherChange={setAnestheticOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldAmountRemoved" value={amountRemoved} onChange={setAmountRemoved} values={FLUID_AMOUNT_REMOVED_VALUES} i18nGroup="fluidAmountRemoved" otherValue={amountRemovedOther} onOtherChange={setAmountRemovedOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldFluidAppearance" value={fluidAppearance} onChange={setFluidAppearance} values={FLUID_APPEARANCE_VALUES} i18nGroup="fluidAppearance" otherValue={fluidAppearanceOther} onOtherChange={setFluidAppearanceOther} t={t} />
          <BoolField labelKey="erProcedureLauncher.fieldSpecimenSent" value={specimenSent} onChange={setSpecimenSent} t={t} />
          <BoolField labelKey="erProcedureLauncher.fieldTolerated" value={toleratedWell} onChange={setToleratedWell} t={t} />
          <TextAreaField labelKey="erProcedureLauncher.fieldComplications" value={complications} onChange={setComplications} t={t} />
          <TextAreaField labelKey="erProcedureLauncher.fieldNotes" value={notes} onChange={setNotes} t={t} />
          <SaveButton submitting={ctx.submitting} t={t} />
        </form>
      )}
    </ProcedureFormShell>
  );
}

function PelvicExamForm(p: ProcedureFormCommonProps) {
  const { t } = useI18n();
  const [chaperonePresent, setChaperonePresent] = useState(true);
  const [indication, setIndication] = useState<(typeof PELVIC_EXAM_INDICATION_VALUES)[number] | "">("");
  const [indicationOther, setIndicationOther] = useState("");
  const [externalExamFindings, setExternalExamFindings] = useState<(typeof PELVIC_FINDINGS_SUMMARY_VALUES)[number] | "">("");
  const [externalExamFindingsOther, setExternalExamFindingsOther] = useState("");
  const [speculumExamFindings, setSpeculumExamFindings] = useState<(typeof PELVIC_FINDINGS_SUMMARY_VALUES)[number] | "">("");
  const [speculumExamFindingsOther, setSpeculumExamFindingsOther] = useState("");
  const [bimanualFindings, setBimanualFindings] = useState<(typeof PELVIC_FINDINGS_SUMMARY_VALUES)[number] | "">("");
  const [bimanualFindingsOther, setBimanualFindingsOther] = useState("");
  const [dischargePresent, setDischargePresent] = useState(false);
  const [cervicalMotionTenderness, setCervicalMotionTenderness] = useState(false);
  const [adnexalTenderness, setAdnexalTenderness] = useState(false);
  const [specimensCollected, setSpecimensCollected] = useState<(typeof PELVIC_SPECIMEN_VALUES)[number] | "">("");
  const [specimensCollectedOther, setSpecimensCollectedOther] = useState("");
  const [complications, setComplications] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <ProcedureFormShell {...p} titleKey={ADVANCED_PROCEDURE_FORM_TITLE_I18N_KEYS.PELVIC_EXAM}>
      {(ctx) => (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ctx.setSubmitErr(null);
            if (
              !validateOtherFields(
                [
                  { value: indication, other: indicationOther },
                  { value: externalExamFindings, other: externalExamFindingsOther },
                  { value: speculumExamFindings, other: speculumExamFindingsOther },
                  { value: bimanualFindings, other: bimanualFindingsOther },
                  { value: specimensCollected, other: specimensCollectedOther },
                ],
                ctx.setSubmitErr,
                t
              )
            )
              return;
            if (
              !validateRequiredEnums(
                [indication, externalExamFindings, speculumExamFindings, bimanualFindings, specimensCollected],
                ctx.setSubmitErr,
                t
              )
            )
              return;
            const body: Record<string, unknown> = {
              procedureType: "PELVIC_EXAM",
              chaperonePresent,
              indication,
              externalExamFindings,
              speculumExamFindings,
              bimanualFindings,
              dischargePresent,
              cervicalMotionTenderness,
              adnexalTenderness,
              specimensCollected,
            };
            trimOptional(body, "indicationOther", indicationOther);
            trimOptional(body, "externalExamFindingsOther", externalExamFindingsOther);
            trimOptional(body, "speculumExamFindingsOther", speculumExamFindingsOther);
            trimOptional(body, "bimanualFindingsOther", bimanualFindingsOther);
            trimOptional(body, "specimensCollectedOther", specimensCollectedOther);
            trimOptional(body, "complications", complications);
            trimOptional(body, "notes", notes);
            void ctx.onSubmit(body);
          }}
        >
          <PerformedAtField performedAtLocal={ctx.performedAtLocal} setPerformedAtLocal={ctx.setPerformedAtLocal} t={t} />
          <BoolField labelKey="erProcedureLauncher.fieldChaperonePresent" value={chaperonePresent} onChange={setChaperonePresent} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldPelvicExamIndication" value={indication} onChange={setIndication} values={PELVIC_EXAM_INDICATION_VALUES} i18nGroup="pelvicExamIndication" otherValue={indicationOther} onOtherChange={setIndicationOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldExternalExamFindings" value={externalExamFindings} onChange={setExternalExamFindings} values={PELVIC_FINDINGS_SUMMARY_VALUES} i18nGroup="pelvicFindingsSummary" otherValue={externalExamFindingsOther} onOtherChange={setExternalExamFindingsOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldSpeculumExamFindings" value={speculumExamFindings} onChange={setSpeculumExamFindings} values={PELVIC_FINDINGS_SUMMARY_VALUES} i18nGroup="pelvicFindingsSummary" otherValue={speculumExamFindingsOther} onOtherChange={setSpeculumExamFindingsOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldBimanualFindings" value={bimanualFindings} onChange={setBimanualFindings} values={PELVIC_FINDINGS_SUMMARY_VALUES} i18nGroup="pelvicFindingsSummary" otherValue={bimanualFindingsOther} onOtherChange={setBimanualFindingsOther} t={t} />
          <BoolField labelKey="erProcedureLauncher.fieldDischargePresent" value={dischargePresent} onChange={setDischargePresent} t={t} />
          <BoolField labelKey="erProcedureLauncher.fieldCervicalMotionTenderness" value={cervicalMotionTenderness} onChange={setCervicalMotionTenderness} t={t} />
          <BoolField labelKey="erProcedureLauncher.fieldAdnexalTenderness" value={adnexalTenderness} onChange={setAdnexalTenderness} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldSpecimensCollected" value={specimensCollected} onChange={setSpecimensCollected} values={PELVIC_SPECIMEN_VALUES} i18nGroup="pelvicSpecimen" otherValue={specimensCollectedOther} onOtherChange={setSpecimensCollectedOther} t={t} />
          <TextAreaField labelKey="erProcedureLauncher.fieldComplications" value={complications} onChange={setComplications} t={t} />
          <TextAreaField labelKey="erProcedureLauncher.fieldNotes" value={notes} onChange={setNotes} t={t} />
          <SaveButton submitting={ctx.submitting} t={t} />
        </form>
      )}
    </ProcedureFormShell>
  );
}

function LumbarPunctureForm(p: ProcedureFormCommonProps) {
  const { t } = useI18n();
  const [indication, setIndication] = useState<(typeof LP_INDICATION_VALUES)[number] | "">("");
  const [indicationOther, setIndicationOther] = useState("");
  const [consent, setConsent] = useState<(typeof PROCEDURE_CONSENT_VALUES)[number] | "">("");
  const [consentOther, setConsentOther] = useState("");
  const [level, setLevel] = useState<(typeof LP_LEVEL_VALUES)[number] | "">("");
  const [levelOther, setLevelOther] = useState("");
  const [position, setPosition] = useState<(typeof LP_POSITION_VALUES)[number] | "">("");
  const [positionOther, setPositionOther] = useState("");
  const [openingPressure, setOpeningPressure] = useState<(typeof LP_OPENING_PRESSURE_VALUES)[number] | "">("");
  const [openingPressureOther, setOpeningPressureOther] = useState("");
  const [csfAppearance, setCsfAppearance] = useState<(typeof LP_CSF_APPEARANCE_VALUES)[number] | "">("");
  const [csfAppearanceOther, setCsfAppearanceOther] = useState("");
  const [tubesCollected, setTubesCollected] = useState<(typeof LP_TUBES_COLLECTED_VALUES)[number] | "">("");
  const [toleratedWell, setToleratedWell] = useState(true);
  const [complications, setComplications] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <ProcedureFormShell {...p} titleKey={ADVANCED_PROCEDURE_FORM_TITLE_I18N_KEYS.LUMBAR_PUNCTURE}>
      {(ctx) => (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ctx.setSubmitErr(null);
            if (
              !validateOtherFields(
                [
                  { value: indication, other: indicationOther },
                  { value: consent, other: consentOther },
                  { value: level, other: levelOther },
                  { value: position, other: positionOther },
                  { value: openingPressure, other: openingPressureOther },
                  { value: csfAppearance, other: csfAppearanceOther },
                ],
                ctx.setSubmitErr,
                t
              )
            )
              return;
            if (!validateRequiredEnums([indication, consent, level, position, openingPressure, csfAppearance, tubesCollected], ctx.setSubmitErr, t)) return;
            const body: Record<string, unknown> = {
              procedureType: "LUMBAR_PUNCTURE",
              indication,
              consent,
              level,
              position,
              openingPressure,
              csfAppearance,
              tubesCollected,
              toleratedWell,
            };
            trimOptional(body, "indicationOther", indicationOther);
            trimOptional(body, "consentOther", consentOther);
            trimOptional(body, "levelOther", levelOther);
            trimOptional(body, "positionOther", positionOther);
            trimOptional(body, "openingPressureOther", openingPressureOther);
            trimOptional(body, "csfAppearanceOther", csfAppearanceOther);
            trimOptional(body, "complications", complications);
            trimOptional(body, "notes", notes);
            void ctx.onSubmit(body);
          }}
        >
          <PerformedAtField performedAtLocal={ctx.performedAtLocal} setPerformedAtLocal={ctx.setPerformedAtLocal} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldLpIndication" value={indication} onChange={setIndication} values={LP_INDICATION_VALUES} i18nGroup="lpIndication" otherValue={indicationOther} onOtherChange={setIndicationOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldConsent" value={consent} onChange={setConsent} values={PROCEDURE_CONSENT_VALUES} i18nGroup="consent" otherValue={consentOther} onOtherChange={setConsentOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldLpLevel" value={level} onChange={setLevel} values={LP_LEVEL_VALUES} i18nGroup="lpLevel" otherValue={levelOther} onOtherChange={setLevelOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldLpPosition" value={position} onChange={setPosition} values={LP_POSITION_VALUES} i18nGroup="lpPosition" otherValue={positionOther} onOtherChange={setPositionOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldOpeningPressure" value={openingPressure} onChange={setOpeningPressure} values={LP_OPENING_PRESSURE_VALUES} i18nGroup="lpOpeningPressure" otherValue={openingPressureOther} onOtherChange={setOpeningPressureOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldCsfAppearance" value={csfAppearance} onChange={setCsfAppearance} values={LP_CSF_APPEARANCE_VALUES} i18nGroup="lpCsfAppearance" otherValue={csfAppearanceOther} onOtherChange={setCsfAppearanceOther} t={t} />
          <EnumField labelKey="erProcedureLauncher.fieldTubesCollected" value={tubesCollected} onChange={setTubesCollected} values={LP_TUBES_COLLECTED_VALUES} i18nGroup="lpTubesCollected" t={t} />
          <BoolField labelKey="erProcedureLauncher.fieldTolerated" value={toleratedWell} onChange={setToleratedWell} t={t} />
          <TextAreaField labelKey="erProcedureLauncher.fieldComplications" value={complications} onChange={setComplications} t={t} />
          <TextAreaField labelKey="erProcedureLauncher.fieldNotes" value={notes} onChange={setNotes} t={t} />
          <SaveButton submitting={ctx.submitting} t={t} />
        </form>
      )}
    </ProcedureFormShell>
  );
}

export function AdvancedProcedureForm({
  procedureType,
  encounterId,
  facilityId,
  onBack,
  onClose,
  onRecorded,
  documentationRole = "PROVIDER",
}: {
  procedureType: AdvancedProcedureType;
  encounterId: string;
  facilityId: string;
  onBack: () => void;
  onClose: () => void;
  onRecorded: () => void;
  documentationRole?: "PROVIDER" | "NURSING";
}) {
  const common: ProcedureFormCommonProps = {
    encounterId,
    facilityId,
    onBack,
    onClose,
    onRecorded,
    documentationRole,
  };
  switch (procedureType) {
    case "CHEST_TUBE":
      return <ChestTubeForm {...common} />;
    case "INTUBATION":
      return <IntubationForm {...common} />;
    case "CENTRAL_LINE":
      return <CentralLineForm {...common} />;
    case "PROCEDURAL_SEDATION":
      return <ProceduralSedationForm {...common} />;
    case "REDUCTION":
      return <ReductionForm {...common} />;
    case "THORACENTESIS_PARACENTESIS":
      return <ThoracentesisParacentesisForm {...common} />;
    case "PELVIC_EXAM":
      return <PelvicExamForm {...common} />;
    case "LUMBAR_PUNCTURE":
      return <LumbarPunctureForm {...common} />;
  }
}

export function isAdvancedProcedureType(value: string): value is AdvancedProcedureType {
  return (
    value === "CHEST_TUBE" ||
    value === "INTUBATION" ||
    value === "CENTRAL_LINE" ||
    value === "PROCEDURAL_SEDATION" ||
    value === "REDUCTION" ||
    value === "THORACENTESIS_PARACENTESIS" ||
    value === "PELVIC_EXAM" ||
    value === "LUMBAR_PUNCTURE"
  );
}
