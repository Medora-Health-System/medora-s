/**
 * INP.DIS.1C — Generate inpatient HOME patient instructions from the enterprise ED
 * diagnosis → discharge template engine (no duplicate library).
 */

import {
  adaptDischargeSuggestedTextBodyForCareSetting,
  type DischargeInstructionCareSettingContext,
  type InpatientDischargeFollowUp1C,
  type InpatientPatientInstructions1C,
  type InpatientProviderDischargeDiagnosis,
} from "@medora/shared";
import { buildProviderDischargeCardFromDiagnosis } from "@/features/emergency/providerDischargeTemplateRegistry";
import {
  mergeDedupedFollowUpRows,
  mergeUniquePrecautionText,
} from "@/features/emergency/providerDischargeSharedPlanningMerge";

export function generateInpatientPatientInstructionsFromDiagnoses(input: {
  diagnoses: InpatientProviderDischargeDiagnosis[];
  locale: "en" | "fr";
  facilityDisplayName: string;
}): {
  instructions: InpatientPatientInstructions1C;
  followUps: InpatientDischargeFollowUp1C[];
} {
  const sorted = [...input.diagnoses].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.sortOrder - b.sortOrder;
  });
  if (!sorted.length) {
    return {
      instructions: {
        schemaVersion: "INP.DIS.1C",
        patientInstructionsGiven: false,
      },
      followUps: [],
    };
  }

  const careSettingContext: DischargeInstructionCareSettingContext = {
    careSetting: "INPATIENT",
    facilityDisplayName: input.facilityDisplayName.trim() || "Hospital",
    locale: input.locale,
  };

  let returnPrecautions = "";
  let diagnosisInstructions = "";
  let medicationInstructions = "";
  let activityInstructions = "";
  let followUpRows: ReturnType<typeof mergeDedupedFollowUpRows> = [];

  const primary = sorted.find((d) => d.isPrimary) ?? sorted[0]!;
  const primaryCard = buildProviderDischargeCardFromDiagnosis({
    sourceEncounterDiagnosisId: primary.id,
    code: primary.code ?? "",
    displayName: primary.description,
    isPrimaryDiagnosis: true,
    displayOrder: 0,
    applyTemplateSuggestion: true,
    locale: input.locale,
    careSettingContext,
  });

  diagnosisInstructions = primaryCard.diagnosisInstructions || primaryCard.description;
  medicationInstructions = primaryCard.medicationTreatment || primaryCard.treatment || "";
  returnPrecautions = primaryCard.returnPrecautions || "";
  activityInstructions = primaryCard.returnWorkSchool || "";
  followUpRows = mergeDedupedFollowUpRows([], primaryCard.followUps ?? []);

  for (const dx of sorted.filter((d) => d.id !== primary.id)) {
    const card = buildProviderDischargeCardFromDiagnosis({
      sourceEncounterDiagnosisId: dx.id,
      code: dx.code ?? "",
      displayName: dx.description,
      isPrimaryDiagnosis: false,
      displayOrder: dx.sortOrder,
      applyTemplateSuggestion: true,
      locale: input.locale,
      careSettingContext,
    });
    if (card.diagnosisInstructions) {
      diagnosisInstructions = mergeUniquePrecautionText(diagnosisInstructions, [
        card.diagnosisInstructions,
      ]);
    }
    if (card.medicationTreatment || card.treatment) {
      medicationInstructions = mergeUniquePrecautionText(medicationInstructions, [
        card.medicationTreatment || card.treatment || "",
      ]);
    }
    if (card.returnPrecautions) {
      returnPrecautions = mergeUniquePrecautionText(returnPrecautions, [card.returnPrecautions]);
    }
    followUpRows = mergeDedupedFollowUpRows(followUpRows, card.followUps ?? []);
  }

  // Ensure care-setting adaptation even if cards already adapted
  const adapted = adaptDischargeSuggestedTextBodyForCareSetting(
    {
      description: diagnosisInstructions,
      diagnosisInstructions,
      medicationTreatment: medicationInstructions,
      returnPrecautions,
      returnWorkSchool: activityInstructions,
    },
    careSettingContext
  );

  const diagnosisSummary = sorted
    .map((d) => [d.code, d.description].filter(Boolean).join(" — "))
    .join("; ");

  const followUps: InpatientDischargeFollowUp1C[] = followUpRows
    .filter((f) => f.specialty?.trim())
    .map((f) => ({
      id: f.id,
      specialty: f.specialty,
      timing: f.timing || null,
      providerOrFacility: f.providerOrFacility || null,
      phone: f.phone || null,
      notes: f.comments || null,
      source: "TEMPLATE",
    }));

  const followUpInstructions = followUps
    .map((f) => [f.specialty, f.timing, f.providerOrFacility].filter(Boolean).join(" — "))
    .join("\n");

  return {
    instructions: {
      schemaVersion: "INP.DIS.1C",
      dischargeDiagnosisSummary: diagnosisSummary,
      diagnosisInstructions: adapted.diagnosisInstructions,
      medicationInstructions: adapted.medicationTreatment,
      returnPrecautions: adapted.returnPrecautions,
      followUpInstructions,
      activityInstructions: adapted.returnWorkSchool ?? null,
      patientInstructionsGiven: false,
      generatedFromPrimaryDiagnosisCode: primary.code ?? null,
      generatedAt: new Date().toISOString(),
      clinicianEdited: false,
    },
    followUps,
  };
}
