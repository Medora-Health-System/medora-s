"use client";

import React, { useState } from "react";
import type { DocumentedProcedureType } from "@medora/shared";
import { NURSING_TIMEOUT_WITNESS_VALUES, NURSING_TOLERANCE_VALUES } from "@medora/shared";
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

export function NursingProcedureAssistForm({
  assistedProcedureType,
  encounterId,
  facilityId,
  onBack,
  onClose,
  onRecorded,
}: ProcedureFormCommonProps & {
  assistedProcedureType: DocumentedProcedureType;
}) {
  const { t } = useI18n();
  const titleKey = `erProcedureLauncher.nursingAssistTitle.${assistedProcedureType}`;
  const [assistedProviderName, setAssistedProviderName] = useState("");
  const [patientPositionPrep, setPatientPositionPrep] = useState("");
  const [suppliesPrepared, setSuppliesPrepared] = useState(true);
  const [timeoutWitness, setTimeoutWitness] = useState<(typeof NURSING_TIMEOUT_WITNESS_VALUES)[number] | "">("");
  const [chaperonePresent, setChaperonePresent] = useState(false);
  const [vitalsMonitoringNotes, setVitalsMonitoringNotes] = useState("");
  const [specimensCollected, setSpecimensCollected] = useState(false);
  const [specimensSentToLab, setSpecimensSentToLab] = useState(false);
  const [specimenDetails, setSpecimenDetails] = useState("");
  const [patientTolerance, setPatientTolerance] = useState<(typeof NURSING_TOLERANCE_VALUES)[number] | "">("");
  const [patientToleranceOther, setPatientToleranceOther] = useState("");
  const [postProcedureCareGiven, setPostProcedureCareGiven] = useState(true);
  const [complicationsObserved, setComplicationsObserved] = useState("");
  const [providerNotified, setProviderNotified] = useState(false);
  const [notes, setNotes] = useState("");

  return (
    <ProcedureFormShell
      encounterId={encounterId}
      facilityId={facilityId}
      onBack={onBack}
      onClose={onClose}
      onRecorded={onRecorded}
      titleKey={titleKey}
      documentationRole="NURSING"
    >
      {({ performedAtLocal, setPerformedAtLocal, setSubmitErr, submitting, onSubmit }) => (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (
              !validateRequiredEnums([timeoutWitness, patientTolerance], setSubmitErr, t) ||
              !validateOtherFields([{ value: patientTolerance, other: patientToleranceOther }], setSubmitErr, t)
            ) {
              return;
            }
            if (specimensCollected && specimensSentToLab && !specimenDetails.trim()) {
              setSubmitErr(t("erProcedureLauncher.validationSpecimenDetailsRequired"));
              return;
            }
            const body: Record<string, unknown> = {
              procedureType: "NURSING_PROCEDURE_ASSIST",
              documentationRole: "NURSING",
              assistedProcedureType,
              suppliesPrepared,
              timeoutWitness,
              specimensCollected,
              specimensSentToLab,
              patientTolerance,
              postProcedureCareGiven,
              providerNotified,
            };
            if (assistedProcedureType === "PELVIC_EXAM") body.chaperonePresent = chaperonePresent;
            trimOptional(body, "assistedProviderName", assistedProviderName);
            trimOptional(body, "patientPositionPrep", patientPositionPrep);
            trimOptional(body, "vitalsMonitoringNotes", vitalsMonitoringNotes);
            trimOptional(body, "specimenDetails", specimenDetails);
            trimOptional(body, "patientToleranceOther", patientToleranceOther);
            trimOptional(body, "complicationsObserved", complicationsObserved);
            trimOptional(body, "notes", notes);
            void onSubmit(body);
          }}
        >
          <PerformedAtField performedAtLocal={performedAtLocal} setPerformedAtLocal={setPerformedAtLocal} t={t} />

          <label style={labelStyle}>{t("erProcedureLauncher.nursingFieldAssistedProvider")}</label>
          <input
            type="text"
            value={assistedProviderName}
            onChange={(e) => setAssistedProviderName(e.target.value)}
            style={{ ...inputStyle, marginBottom: 10 }}
          />

          <label style={labelStyle}>{t("erProcedureLauncher.nursingFieldPatientPositionPrep")}</label>
          <textarea
            value={patientPositionPrep}
            onChange={(e) => setPatientPositionPrep(e.target.value)}
            rows={2}
            style={{ ...inputStyle, marginBottom: 10, resize: "vertical" }}
          />

          <label style={labelStyle}>{t("erProcedureLauncher.nursingFieldSuppliesPrepared")}</label>
          {boolSelect(suppliesPrepared, setSuppliesPrepared, t)}

          <label style={labelStyle}>{t("erProcedureLauncher.nursingFieldTimeoutWitness")}</label>
          {enumSelect({
            value: timeoutWitness,
            onChange: setTimeoutWitness,
            values: NURSING_TIMEOUT_WITNESS_VALUES,
            labelKey: (v) => `erProcedureLauncher.nursingTimeoutWitness.${v}`,
            t,
            required: true,
            placeholderKey: "erProcedureLauncher.selectPlaceholder",
          })}

          {assistedProcedureType === "PELVIC_EXAM" ? (
            <>
              <label style={labelStyle}>{t("erProcedureLauncher.nursingFieldChaperonePresent")}</label>
              {boolSelect(chaperonePresent, setChaperonePresent, t)}
            </>
          ) : null}

          <label style={labelStyle}>{t("erProcedureLauncher.nursingFieldVitalsMonitoring")}</label>
          <textarea
            value={vitalsMonitoringNotes}
            onChange={(e) => setVitalsMonitoringNotes(e.target.value)}
            rows={2}
            style={{ ...inputStyle, marginBottom: 10, resize: "vertical" }}
          />

          <label style={labelStyle}>{t("erProcedureLauncher.nursingFieldSpecimensCollected")}</label>
          {boolSelect(specimensCollected, setSpecimensCollected, t)}

          <label style={labelStyle}>{t("erProcedureLauncher.nursingFieldSpecimensSentToLab")}</label>
          {boolSelect(specimensSentToLab, setSpecimensSentToLab, t)}

          {specimensCollected ? (
            <>
              <label style={labelStyle}>{t("erProcedureLauncher.nursingFieldSpecimenDetails")}</label>
              <input
                type="text"
                value={specimenDetails}
                onChange={(e) => setSpecimenDetails(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
            </>
          ) : null}

          <label style={labelStyle}>{t("erProcedureLauncher.nursingFieldPatientTolerance")}</label>
          {enumSelect({
            value: patientTolerance,
            onChange: setPatientTolerance,
            values: NURSING_TOLERANCE_VALUES,
            labelKey: (v) => `erProcedureLauncher.nursingTolerance.${v}`,
            t,
            required: true,
            placeholderKey: "erProcedureLauncher.selectPlaceholder",
          })}
          {patientTolerance === "OTHER" ? (
            <>
              <label style={labelStyle}>{t("erProcedureLauncher.nursingFieldPatientToleranceOther")}</label>
              <input
                type="text"
                value={patientToleranceOther}
                onChange={(e) => setPatientToleranceOther(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
            </>
          ) : null}

          <label style={labelStyle}>{t("erProcedureLauncher.nursingFieldPostProcedureCare")}</label>
          {boolSelect(postProcedureCareGiven, setPostProcedureCareGiven, t)}

          <label style={labelStyle}>{t("erProcedureLauncher.nursingFieldComplicationsObserved")}</label>
          <textarea
            value={complicationsObserved}
            onChange={(e) => setComplicationsObserved(e.target.value)}
            rows={2}
            style={{ ...inputStyle, marginBottom: 10, resize: "vertical" }}
          />

          <label style={labelStyle}>{t("erProcedureLauncher.nursingFieldProviderNotified")}</label>
          {boolSelect(providerNotified, setProviderNotified, t)}

          <label style={labelStyle}>{t("erProcedureLauncher.fieldNotes")}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            style={{ ...inputStyle, marginBottom: 12, resize: "vertical" }}
          />

          <SaveButton submitting={submitting} t={t} />
        </form>
      )}
    </ProcedureFormShell>
  );
}
