import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { edHosp1dObservationOrdersEn } from "@/i18n/messages/edHosp1dObservationOrders.en";
import { edHosp1dObservationOrdersFr } from "@/i18n/messages/edHosp1dObservationOrders.fr";
import { emergencyAdaptiveNursingEn } from "@/i18n/messages/emergencyAdaptiveNursing.en";
import { emergencyAdaptiveNursingFr } from "@/i18n/messages/emergencyAdaptiveNursing.fr";
import { hospitalAdmissionD4a0En } from "@/i18n/messages/hospitalAdmissionD4a0.en";
import { hospitalAdmissionD4a0Fr } from "@/i18n/messages/hospitalAdmissionD4a0.fr";
import { providerDischargeDocumentation19YEn } from "@/i18n/messages/providerDischargeDocumentation19Y.en";
import { providerDischargeDocumentation19YFr } from "@/i18n/messages/providerDischargeDocumentation19Y.fr";
import { localizeEdDispositionFollowUpChipText } from "@/features/emergency/providerDischargeDocumentationSummary";
import {
  deriveEmtalaAttestationsFromEvidence,
  isUnitedStatesEmtalaJurisdiction,
  shouldMountAdmissionOrderComposer,
  shouldMountObservationOrderComposer,
} from "@medora/shared";
import { requestedEncounterTypeForOutcomeUi } from "@/features/emergency/edHosp1bDispositionOutcomeMapping";

const webRoot = join(import.meta.dirname, "../../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, "src", relativePath), "utf8");
}

describe("ED.HOSP.1F disposition / nursing / language / EMTALA", () => {
  const panel = readSrc("features/emergency/EmergencyDispositionPanel.tsx");
  const nursing = readSrc("features/emergency/AdaptiveDispositionNursingSection.tsx");
  const composer = readSrc("features/emergency/EdObservationOrderComposer.tsx");
  const nursingDoc = readSrc("features/emergency/EdNursingDocumentationComposer.tsx");
  const schema = readFileSync(join(webRoot, "../../apps/api/prisma/schema.prisma"), "utf8");

  it("removed instructional prose is not rendered on the routine board", () => {
    expect(panel).not.toContain("admissionRoleHint");
    expect(panel).not.toContain("decisionDoesNotClose");
    expect(panel).not.toContain("cancelAdmissionHint");
    expect(composer).not.toContain("edHosp1dObservationOrders.subtitle");
    expect(composer).not.toContain("contextTelemetryHint");
    expect(composer).not.toContain("planReuseHint");
    expect(nursing).not.toContain("emergencyAdaptiveNursing.subtitle");
    expect(edHosp1dObservationOrdersEn.reviewEmpty).toBe("No items selected");
    expect(edHosp1dObservationOrdersEn.reviewEmpty).not.toMatch(/visual only/i);
  });

  it("EMTALA attestation block is absent from the routine board", () => {
    expect(panel).not.toContain("emtalaAttestSection");
    expect(panel).not.toContain("emtalaLabelMsePerformed");
    expect(panel).not.toContain("emtalaBlock");
    expect(panel).toContain("persistAttestations");
    expect(panel).toContain("derivedMsePerformed");
  });

  it("does not blindly persist EMTALA YES without evidence", () => {
    const none = deriveEmtalaAttestationsFromEvidence({
      mseDocumentedAt: null,
      unitedStatesJurisdiction: true,
    });
    expect(none.msePerformed).toBeNull();
    expect(panel).toContain('msePerformed: ""');
    expect(panel).toContain("isUnitedStatesEmtalaJurisdiction");
  });

  it("jurisdiction is facility country, not UI language", () => {
    expect(isUnitedStatesEmtalaJurisdiction("HT")).toBe(false);
    expect(isUnitedStatesEmtalaJurisdiction("US")).toBe(true);
    expect(panel).toContain("facilityCountry");
  });

  it("observation nursing is structured: no routine departure textareas", () => {
    expect(nursing).toContain('data-structured={structured ? "true" : "false"}');
    expect(nursing).toContain("adaptive-nursing-receivingUnit");
    expect(nursing).toContain('type="datetime-local"');
    expect(nursing).toContain("HANDOFF_REVIEWED");
    expect(nursing).toContain("EdNursingDocumentationComposer");
    expect(nursing).toContain("fetchActiveInternalPlacement");
    expect(nursing).toContain("/iv-access");
    const structuredBlock = nursing.split("{structured ? (")[1]?.split(") : (")[0] ?? "";
    expect(structuredBlock).not.toMatch(/<textarea/);
    expect(nursing).toContain("receivingUnitOptionsForPathway");
    expect(nursing).toContain("ED_HOSP_1F_UNIT_PENDING");
  });

  it("provider vs nursing role separation and persistence key are unchanged", () => {
    expect(nursing).toContain("mergeAdaptiveEdNursingIntoNursingAssessment");
    expect(nursing).toContain("completeDeparture");
    expect(nursing).toContain("saveDraft");
    expect(nursingDoc).toContain("ed-nursing-save-draft");
    expect(panel).toContain("shouldMountObservationOrderComposer");
    expect(panel).toContain("shouldMountAdmissionOrderComposer");
    expect(panel).toContain("isProviderDispositionEditor");
    expect(panel).toContain("if (!canEditMedicalDischarge && !canPrescribe)");
    expect(panel).toContain("outcomeDisabled = formDisabled || !canEditMedicalDischarge");
    expect(panel).toContain("ed-disposition-save-draft");
    expect(panel).toContain("ed-disposition-final");
    expect(shouldMountObservationOrderComposer("OBSERVATION")).toBe(true);
    expect(shouldMountAdmissionOrderComposer("ADMISSION")).toBe(true);
  });

  it("English system proposal prefixes are localized; FR mirrors stay French", () => {
    expect(panel).toContain('buildSmartAdmissionProposals(ctx, language === "en" ? "en" : "fr")');
    expect(emergencyAdaptiveNursingEn.transport.WHEELCHAIR).toBe("Wheelchair");
    expect(emergencyAdaptiveNursingFr.transport.WHEELCHAIR).toBe("Fauteuil roulant");
    expect(Object.keys(emergencyAdaptiveNursingEn.groups).sort()).toEqual(
      Object.keys(emergencyAdaptiveNursingFr.groups).sort()
    );
  });

  it("raw placement/service enums are labeled in Observation composer", () => {
    expect(composer).toContain("isHospitalAdmittingService");
    expect(composer).toContain("hospitalAdmissionD4a0.service.");
    expect(composer).toContain("projectInternalPlacementTrackboardLabel");
    expect(composer).not.toContain("ctxValue(context?.requestedService)");
  });

  it("Observation order semantics remain selection-only until activate", () => {
    expect(composer).toContain("toggleSelect");
    expect(composer).toContain("planComposerCareOrderCreates");
    expect(composer).toContain("ed-observation-activate-orders");
    expect(composer).toContain('method: "POST"');
    expect(composer).not.toContain("createDirectAdmission");
  });

  it("Admission remains INPATIENT and Observation remains OBSERVATION; no migration", () => {
    expect(shouldMountAdmissionOrderComposer("ADMISSION")).toBe(true);
    expect(shouldMountObservationOrderComposer("OBSERVATION")).toBe(true);
    expect(requestedEncounterTypeForOutcomeUi("OBSERVATION")).toBe("OBSERVATION");
    expect(requestedEncounterTypeForOutcomeUi("ADMISSION")).toBe("INPATIENT");
    expect(schema).not.toContain("edHosp1fNursingJson");
    expect(schema).not.toContain("observationDepartureV2");
    expect(nursing).not.toContain("edHosp1fNursingJson");
    expect(nursing).toContain("mergeAdaptiveEdNursingIntoNursingAssessment");
  });

  it("raw specialty enums are not rendered on Observation/Admission disposition surfaces", () => {
    expect(panel).toContain("localizeEdDispositionFollowUpChipText");
    expect(composer).toContain("hospitalAdmissionD4a0.service.");
    expect(composer).toContain("followUpSpecialty.");
    expect(localizeEdDispositionFollowUpChipText("PRIMARY_CARE — within 1–2 days", "en")).toBe(
      "Primary care provider — within 1–2 days"
    );
    expect(localizeEdDispositionFollowUpChipText("CARDIOLOGY — within 1–2 days", "en")).toBe(
      "Cardiology — within 1–2 days"
    );
    expect(localizeEdDispositionFollowUpChipText("HOSPITAL_MEDICINE", "en")).toBe("Hospital medicine");
    expect(localizeEdDispositionFollowUpChipText("PRIMARY_CARE", "fr")).toBe("Médecin traitant");
    expect(localizeEdDispositionFollowUpChipText("CARDIOLOGY", "fr")).toBe("Cardiologie");
    expect(hospitalAdmissionD4a0En.service.HOSPITAL_MEDICINE).toBe("Hospital medicine");
    expect(hospitalAdmissionD4a0Fr.service.HOSPITAL_MEDICINE).toBe("Médecine hospitalière");
    expect(providerDischargeDocumentation19YEn.followUpSpecialty.CARDIOLOGY).toBe("Cardiology");
    expect(providerDischargeDocumentation19YFr.followUpSpecialty.CARDIOLOGY).toBe("Cardiologie");
    expect(emergencyAdaptiveNursingEn.units.UNIT_PENDING).toBe("Unit pending");
    expect(emergencyAdaptiveNursingFr.units.UNIT_PENDING).toBe("Unité en attente");
    expect(Object.keys(emergencyAdaptiveNursingEn.units).sort()).toEqual(
      Object.keys(emergencyAdaptiveNursingFr.units).sort()
    );
  });

  it("1D i18n keys remain mirrored after composer chrome cleanup", () => {
    expect(Object.keys(edHosp1dObservationOrdersEn).sort()).toEqual(
      Object.keys(edHosp1dObservationOrdersFr).sort()
    );
    expect(Object.keys(emergencyAdaptiveNursingEn).sort()).toEqual(
      Object.keys(emergencyAdaptiveNursingFr).sort()
    );
  });

  it("Observation nursing copy does not use Admission-only terminology", () => {
    expect(emergencyAdaptiveNursingEn.awaitingSignedObservation).toBe("Awaiting signed observation decision.");
    expect(emergencyAdaptiveNursingFr.awaitingSignedObservation).toBe(
      "Attente de la décision d’observation signée."
    );
    expect(emergencyAdaptiveNursingEn.awaitingSignedObservation).not.toMatch(/admission/i);
    expect(emergencyAdaptiveNursingFr.awaitingSignedObservation).not.toMatch(/admission/i);
    expect(nursing).toContain("awaitingSignedObservation");
    expect(nursing).toContain('pathway === "OBSERVATION"');
  });
});
