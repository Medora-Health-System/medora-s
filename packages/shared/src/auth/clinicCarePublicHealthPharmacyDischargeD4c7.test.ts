/**
 * MEDUI.D4C.7 — Public Health / Pharmacy / ambulatory discharge integration (tests A–M).
 */

import { describe, expect, it } from "vitest";
import {
  CLINIC_AMBULATORY_CHECKOUT_I18N_KEYS,
  CLINIC_AMBULATORY_CHECKOUT_STATES,
  CLINIC_CARE_PUBLIC_HEALTH_PHARMACY_DISCHARGE_CERTIFICATION_ID,
  D4C7_DISEASE_REPORT_CLINICAL_DRAFT_LIFECYCLE_PERSISTENCE_GAP,
  D4C7_FORBIDDEN_CLINIC_AUTHORITY_NAMES,
  D4C7_PHARMACY_VERIFICATION_I18N_KEYS,
  D4C7_PUBLIC_HEALTH_NAV,
  adaptDischargeNarrativeForCareSetting,
  adaptDischargeSuggestedTextBodyForCareSetting,
  ambulatoryPharmacyVerificationLabelKey,
  assertNoForbiddenClinicAuthorityName,
  buildClinicCarePublicHealthDeepLink,
  canRecordVaccineAdministration,
  classifyAmbulatoryMedicationFulfillmentForDischarge,
  clinicDischargePrintBlockedReason,
  dischargeNarrativeContainsEdOnlyWording,
  filterAmbulatoryPharmacyQueueOrders,
  isAmbulatoryPharmacyQueueEncounterType,
  maySubmitOfficialDiseaseReportForJurisdiction,
  resolveD4c7PublicHealthJurisdictionPathway,
  resolveDischargeVisitFramingPhrases,
  shouldBlockEnglishDischargeContentForFrenchLocale,
} from "../index.js";

describe("MEDUI.D4C.7 public health / pharmacy / discharge", () => {
  it("A — certification id + forbidden Clinic* authorities listed", () => {
    expect(CLINIC_CARE_PUBLIC_HEALTH_PHARMACY_DISCHARGE_CERTIFICATION_ID).toBe("MEDUI.D4C.7");
    expect(D4C7_FORBIDDEN_CLINIC_AUTHORITY_NAMES).toContain("ClinicPharmacy");
    expect(D4C7_FORBIDDEN_CLINIC_AUTHORITY_NAMES).toContain("ClinicDischarge");
    expect(D4C7_FORBIDDEN_CLINIC_AUTHORITY_NAMES).toContain("ClinicDiagnosisInstruction");
    expect(assertNoForbiddenClinicAuthorityName("DiseaseCaseReport")).toBe(true);
    expect(assertNoForbiddenClinicAuthorityName("ClinicMAR")).toBe(false);
  });

  it("B — typed care-setting framing: ED keeps ED language", () => {
    const ed = resolveDischargeVisitFramingPhrases({
      careSetting: "ED",
      facilityDisplayName: "Any Clinic Name",
      locale: "en",
    });
    expect(ed.evaluatedLocation).toBe("in the Emergency Department");
    expect(ed.returnImmediatelySuffix).toContain("emergency department");
    expect(ed.careSettingNoun).toBe("Emergency Department");
  });

  it("C — Clinic framing uses Facility.displayName (never global clinic hard-code)", () => {
    const clinic = resolveDischargeVisitFramingPhrases({
      careSetting: "CLINIC",
      facilityDisplayName: "Clinique Espoir",
      locale: "en",
    });
    expect(clinic.evaluatedLocation).toBe("at Clinique Espoir");
    expect(clinic.afterVisit).toBe("after this clinic visit");
    expect(clinic.returnImmediatelySuffix).toContain("Clinique Espoir");
    expect(clinic.returnImmediatelySuffix).not.toMatch(/Emergency Department/i);

    const fr = resolveDischargeVisitFramingPhrases({
      careSetting: "CLINIC",
      facilityDisplayName: "Clinique Espoir",
      locale: "fr",
    });
    expect(fr.evaluatedLocation).toBe("à Clinique Espoir");
    expect(fr.afterVisit).toBe("après cette consultation");
    expect(fr.returnImmediatelySuffix).toContain("Clinique Espoir");
    expect(fr.returnImmediatelySuffix.toLowerCase()).not.toMatch(/^retournez aux urgences immédiatement/);
  });

  it("D — adapt narrative replaces known ED framing with typed Clinic phrases", () => {
    const ctx = {
      careSetting: "CLINIC" as const,
      facilityDisplayName: "Clinique Espoir",
      locale: "en" as const,
    };
    const adapted = adaptDischargeNarrativeForCareSetting(
      "You were evaluated in the emergency department for chest pain. Symptoms may evolve after an emergency visit.",
      ctx
    );
    expect(adapted).toContain("at Clinique Espoir");
    expect(adapted).toContain("after this clinic visit");
    expect(adapted.toLowerCase()).not.toContain("emergency department");
    expect(adapted.toLowerCase()).not.toContain("emergency visit");

    const frAdapted = adaptDischargeNarrativeForCareSetting(
      "Vous avez été pris en charge aux urgences pour une douleur thoracique. Les signes peuvent évoluer après une visite aux urgences.",
      { ...ctx, locale: "fr" }
    );
    expect(frAdapted).toContain("à Clinique Espoir");
    expect(frAdapted).toContain("après cette consultation");
  });

  it("E — ED careSetting leaves catalog text unchanged", () => {
    const body = {
      description: "You were evaluated in the emergency department for chest pain.",
      diagnosisInstructions: "Rest.",
      medicationTreatment: "Take as prescribed.",
      returnPrecautions: "Return to the emergency department immediately if symptoms worsen.",
    };
    const same = adaptDischargeSuggestedTextBodyForCareSetting(body, {
      careSetting: "ED",
      facilityDisplayName: "Clinique Espoir",
      locale: "en",
    });
    expect(same).toEqual(body);
  });

  it("F — jurisdiction from Facility.country only (never UI locale)", () => {
    const haiti = resolveD4c7PublicHealthJurisdictionPathway({ facilityCountry: "HT" });
    expect(haiti.pathway).toBe("MSPP_HAITI");
    expect(haiti.canSubmitOfficial).toBe(true);

    const usConfigured = resolveD4c7PublicHealthJurisdictionPathway({
      facilityCountry: "US",
      usPathwayConfigured: true,
    });
    expect(usConfigured.pathway).toBe("CONFIGURED_US");

    const unsupported = resolveD4c7PublicHealthJurisdictionPathway({
      facilityCountry: "XX",
      usPathwayConfigured: false,
    });
    expect(unsupported.pathway).toBe("UNSUPPORTED_DRAFT_ONLY");
    expect(unsupported.canSubmitOfficial).toBe(false);
    expect(maySubmitOfficialDiseaseReportForJurisdiction(unsupported)).toBe(false);
  });

  it("G — disease clinical DRAFT lifecycle persistence gap documented (no silent false submitted)", () => {
    expect(D4C7_DISEASE_REPORT_CLINICAL_DRAFT_LIFECYCLE_PERSISTENCE_GAP).toContain("SUSPECTED");
    expect(D4C7_DISEASE_REPORT_CLINICAL_DRAFT_LIFECYCLE_PERSISTENCE_GAP).toContain("migration");
  });

  it("H — ambulatory pharmacy queue filter by facility / AMBULATORY / intent / verification", () => {
    expect(isAmbulatoryPharmacyQueueEncounterType("OUTPATIENT")).toBe(true);
    expect(isAmbulatoryPharmacyQueueEncounterType("EMERGENCY")).toBe(false);

    const orders = [
      {
        facilityId: "f1",
        createdAt: "2026-07-28T10:00:00.000Z",
        orderedByUserId: "p1",
        encounter: { type: "OUTPATIENT", patientId: "pt1" },
        items: [{ medicationFulfillmentIntent: "PHARMACY_DISPENSE", pharmacyVerificationStatus: "PENDING" }],
      },
      {
        facilityId: "f1",
        createdAt: "2026-07-28T11:00:00.000Z",
        orderedByUserId: "p1",
        encounter: { type: "EMERGENCY", patientId: "pt2" },
        items: [{ medicationFulfillmentIntent: "ADMINISTER_CHART", pharmacyVerificationStatus: "VERIFIED" }],
      },
      {
        facilityId: "f1",
        createdAt: "2026-07-28T12:00:00.000Z",
        orderedByUserId: "p2",
        encounter: { type: "OUTPATIENT", patientId: "pt1" },
        items: [{ medicationFulfillmentIntent: "ADMINISTER_CHART", pharmacyVerificationStatus: "VERIFIED" }],
      },
    ];

    const ambulatory = filterAmbulatoryPharmacyQueueOrders(orders, {
      facilityId: "f1",
      ambulatoryOnly: true,
    });
    expect(ambulatory).toHaveLength(2);

    const rxOnly = filterAmbulatoryPharmacyQueueOrders(orders, {
      facilityId: "f1",
      ambulatoryOnly: true,
      fulfillmentIntent: "PHARMACY_DISPENSE",
    });
    expect(rxOnly).toHaveLength(1);
    expect(rxOnly[0]?.encounter?.patientId).toBe("pt1");

    const verified = filterAmbulatoryPharmacyQueueOrders(orders, {
      facilityId: "f1",
      ambulatoryOnly: true,
      verificationState: "VERIFIED",
    });
    expect(verified).toHaveLength(1);
    expect(verified[0]?.items?.[0]?.medicationFulfillmentIntent).toBe("ADMINISTER_CHART");
  });

  it("I — pharmacy verification FR i18n keys + Rx vs MAR discharge classification", () => {
    expect(ambulatoryPharmacyVerificationLabelKey("VERIFIED")).toBe(
      D4C7_PHARMACY_VERIFICATION_I18N_KEYS.VERIFIED
    );
    expect(ambulatoryPharmacyVerificationLabelKey("PENDING")).toBe(
      D4C7_PHARMACY_VERIFICATION_I18N_KEYS.PENDING
    );
    expect(
      classifyAmbulatoryMedicationFulfillmentForDischarge({
        catalogItemType: "MEDICATION",
        medicationFulfillmentIntent: "PHARMACY_DISPENSE",
      })
    ).toBe("EXTERNAL_RX");
    expect(
      classifyAmbulatoryMedicationFulfillmentForDischarge({
        catalogItemType: "MEDICATION",
        medicationFulfillmentIntent: "ADMINISTER_CHART",
      })
    ).toBe("ONSITE_MAR");
  });

  it("J — Clinic checkout states use Sortie labels (not Disposition ED)", () => {
    expect(CLINIC_AMBULATORY_CHECKOUT_STATES).toContain("HOME");
    expect(CLINIC_AMBULATORY_CHECKOUT_STATES).toContain("TRANSFER_ED");
    expect(CLINIC_AMBULATORY_CHECKOUT_I18N_KEYS.HOME).toBe("clinicCareD4c7.checkout.home");
    expect(CLINIC_AMBULATORY_CHECKOUT_I18N_KEYS.CLINIC_FOLLOW_UP).toBe(
      "clinicCareD4c7.checkout.clinicFollowUp"
    );
  });

  it("K — PH deep links to enterprise nav (no Clinic* PH engines)", () => {
    expect(D4C7_PUBLIC_HEALTH_NAV.vaccinations).toBe("/app/public-health/vaccinations");
    expect(D4C7_PUBLIC_HEALTH_NAV.diseaseReports).toBe("/app/public-health/disease-reports");
    const link = buildClinicCarePublicHealthDeepLink({
      target: "vaccinations",
      encounterId: "e1",
      patientId: "p1",
    });
    expect(link).toContain("/app/public-health/vaccinations?");
    expect(link).toContain("encounterId=e1");
    expect(link).toContain("patientId=p1");
  });

  it("L — vaccination role matrix + Haiti FR blocks silent English content", () => {
    expect(canRecordVaccineAdministration(["RN"])).toBe(true);
    expect(canRecordVaccineAdministration(["FRONT_DESK"])).toBe(false);
    expect(
      shouldBlockEnglishDischargeContentForFrenchLocale({
        uiLocale: "fr",
        contentLocale: "en",
        jurisdictionCountry: "HT",
      })
    ).toBe(true);
    expect(
      shouldBlockEnglishDischargeContentForFrenchLocale({
        uiLocale: "fr",
        contentLocale: "fr",
        jurisdictionCountry: "HT",
      })
    ).toBe(false);
    expect(
      shouldBlockEnglishDischargeContentForFrenchLocale({
        uiLocale: "en",
        contentLocale: "en",
        jurisdictionCountry: "HT",
      })
    ).toBe(false);
  });

  it("M — Clinic print gates + ED-wording detection for non-ED care settings", () => {
    expect(
      clinicDischargePrintBlockedReason({
        hasSignedFinal: false,
        hasInstructionContent: true,
        containsEdOnlyWording: false,
        careSetting: "CLINIC",
      })
    ).toBe("clinicCareD4c7.print.blockedUnsigned");
    expect(
      clinicDischargePrintBlockedReason({
        hasSignedFinal: true,
        hasInstructionContent: false,
        containsEdOnlyWording: false,
        careSetting: "CLINIC",
      })
    ).toBe("clinicCareD4c7.print.blockedEmpty");
    expect(
      dischargeNarrativeContainsEdOnlyWording(
        "You were evaluated in the emergency department.",
        "CLINIC"
      )
    ).toBe(true);
    expect(
      dischargeNarrativeContainsEdOnlyWording(
        "You were evaluated at Clinique Espoir.",
        "CLINIC"
      )
    ).toBe(false);
    expect(
      clinicDischargePrintBlockedReason({
        hasSignedFinal: true,
        hasInstructionContent: true,
        containsEdOnlyWording: false,
        careSetting: "CLINIC",
      })
    ).toBeNull();
  });
});
