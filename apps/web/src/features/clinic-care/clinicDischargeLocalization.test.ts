import { describe, expect, it } from "vitest";
import {
  emptyProviderDischargeDocumentationForm,
  newDefaultFollowUpRow,
  type ProviderDischargeDiagnosisCard,
} from "@/features/emergency/providerDischargeDocumentationModel";
import {
  clinicDischargeFormContainsVisibleSentinel,
  localizeClinicDischargeFormForPresentation,
} from "./clinicDischargeLocalization";
import {
  emptyClinicAmbulatoryCheckoutDetails,
  markClinicCheckoutActionConfirmed,
  validateClinicAmbulatoryCheckoutDetails,
} from "./ClinicCareCheckoutDetailsPanel";

function abdominalPainCard(): ProviderDischargeDiagnosisCard {
  return {
    id: "dx-r109",
    sourceEncounterDiagnosisId: "enc-dx-r109",
    encounterDiagnosisId: "enc-dx-r109",
    code: "R10.9",
    displayName: "R10.9",
    isPrimaryDiagnosis: true,
    displayOrder: 0,
    description:
      "You were evaluated in the emergency department for abdominal pain. Some causes may evolve after you leave; outpatient follow-up is recommended when clinically appropriate.",
    diagnosisInstructions:
      "Stay hydrated. Eat a light diet as tolerated unless your clinician advised otherwise. Rest as needed. Return precautions for worsening or concerning symptoms were reviewed.",
    medicationTreatment:
      "Take pain or anti-nausea medicines only as prescribed or directed during this visit. Do not start new medications without clinician guidance.",
    returnPrecautions:
      "Return to the emergency department immediately if symptoms worsen.",
    followUps: [
      { ...newDefaultFollowUpRow(), specialty: "PRIMARY_CARE", timing: "UNLOCALIZED_SOURCE" },
    ],
    medicationLines: [],
    templateMeta: {
      templateId: "abdominal_pain_v1",
      templateVersion: "1.0.0",
      matchLevel: "icdExact",
      sourceReferences: [],
      appliedLocale: "en",
      providerConfirmed: false,
      templateAppliedHash: "english-template-hash",
    },
  };
}

describe("Clinic discharge Spanish presentation", () => {
  it("replaces unconfirmed English R10.9 template text with Spanish Clinic wording", () => {
    const form = emptyProviderDischargeDocumentationForm();
    form.diagnosisDocs = [abdominalPainCard()];
    form.returnPrecautions =
      "Return for care if pain worsens. Return to the emergency department immediately if symptoms worsen.";
    form.followUps = [
      { ...newDefaultFollowUpRow(), specialty: "PRIMARY_CARE", timing: "UNLOCALIZED_SOURCE" },
      { ...newDefaultFollowUpRow(), specialty: "GASTROENTEROLOGY", timing: "UNLOCALIZED_SOURCE" },
    ];

    const localized = localizeClinicDischargeFormForPresentation(form, "es", "Clínica Medora");
    const card = localized.diagnosisDocs[0];

    expect(card.description).toContain("Fue evaluado/a en Clínica Medora por dolor abdominal");
    expect(card.description.toLowerCase()).not.toContain("emergency department");
    expect(card.diagnosisInstructions).toContain("Manténgase bien hidratado/a");
    expect(card.medicationTreatment).toContain("medicamentos para el dolor o las náuseas");
    expect(localized.returnPrecautions).toContain("Busque atención médica");
    expect(localized.followUps[0].timing).toBe("en 1–2 días o según las indicaciones");
    expect(localized.followUps[1].timing).toBe("según corresponda clínicamente");
    expect(card.templateMeta?.appliedLocale).toBe("es");
    expect(card.templateMeta?.templateAppliedHash).toBeUndefined();
    expect(clinicDischargeFormContainsVisibleSentinel(localized)).toBe(false);
  });

  it("does not overwrite provider-confirmed clinical narrative", () => {
    const card = abdominalPainCard();
    card.description = "Texto clínico confirmado por el profesional.";
    card.templateMeta = { ...card.templateMeta!, providerConfirmed: true };
    const form = emptyProviderDischargeDocumentationForm();
    form.diagnosisDocs = [card];

    const localized = localizeClinicDischargeFormForPresentation(form, "es", "Clínica Medora");
    expect(localized.diagnosisDocs[0].description).toBe("Texto clínico confirmado por el profesional.");
  });
});

describe("Clinic checkout operational details", () => {
  it("requires real transfer destination and reason before save", () => {
    const details = emptyClinicAmbulatoryCheckoutDetails();
    expect(validateClinicAmbulatoryCheckoutDetails("TRANSFER_ED", details, "es")).toContain("obligatorios");

    details.transferEd.destination = "Hospital Central ED";
    details.transferEd.reason = "Dolor abdominal con empeoramiento clínico";
    expect(validateClinicAmbulatoryCheckoutDetails("TRANSFER_ED", details, "es")).toBeNull();
  });

  it("requires AMA reason plus risks and alternatives acknowledgements", () => {
    const details = emptyClinicAmbulatoryCheckoutDetails();
    details.ama.reason = "Paciente solicita retirarse";
    expect(validateClinicAmbulatoryCheckoutDetails("AMA", details, "es")).not.toBeNull();

    details.ama.risksDiscussed = true;
    details.ama.alternativesDiscussed = true;
    expect(validateClinicAmbulatoryCheckoutDetails("AMA", details, "es")).toBeNull();
  });

  it("stamps explicit transfer confirmation without faking encounter conversion", () => {
    const details = emptyClinicAmbulatoryCheckoutDetails();
    details.transferEd.destination = "Hospital Central ED";
    details.transferEd.reason = "Higher level of care";

    const confirmed = markClinicCheckoutActionConfirmed(
      "TRANSFER_ED",
      details,
      "Dr Example",
      "2026-09-13T15:00:00.000Z"
    );
    expect(confirmed.transferEd.confirmedAt).toBe("2026-09-13T15:00:00.000Z");
    expect(confirmed.transferEd.confirmedByDisplayName).toBe("Dr Example");
  });
});
