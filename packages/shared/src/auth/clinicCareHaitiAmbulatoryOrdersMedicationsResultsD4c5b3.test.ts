/**
 * MEDUI.D4C.5B.3 — Haiti ambulatory orders / medications / results correction (tests A–J).
 */

import { describe, expect, it } from "vitest";
import {
  CLINIC_CARE_AMBULATORY_WORKSPACE_SECTIONS,
  CLINIC_CARE_HAITI_AMBULATORY_ORDERS_MEDS_RESULTS_CERTIFICATION_ID,
  D4C5B3_RESULT_CAPABILITY_MATRIX_DOC,
  D4C5B3_SIMPLE_CLINIC_INTAKE_PRESENTATION,
  ambulatoryMedicationFormDisplayKey,
  ambulatoryMedicationRouteDisplayKey,
  ambulatoryOrderDestinationDisplayKey,
  ambulatoryOrderedByRoleDisplayKey,
  ambulatoryPharmacyStatusDisplayKey,
  buildFrenchAmbulatoryMedicationSigDisplay,
  canPrintAmbulatoryExternalPrescriptions,
  classifyAmbulatoryOrderDestination,
  filterAmbulatoryExternalPrescriptionOrders,
  getMedicationSafetyWarnings,
  haitiAmbulatoryOrdersMedicationMode,
  haitiAmbulatoryRnLabEntrySeedChangeRequired,
  isAmbulatoryExternalPrescriptionItem,
  isAmbulatoryOnsiteMarMedicationItem,
  isExternalPharmacyDispenseIntent,
  isIvOrInfusionRoute,
  isOnsiteAdministerMedicationIntent,
  isSimpleClinicIntakePresentation,
  localizeAmbulatoryMedicationSigForFrenchDisplay,
  resolveAmbulatoryResultEntryDenialMessage,
  resolveHaitiAmbulatoryIntakePresentation,
  shouldHideEdTriageChromeForHaitiAmbulatory,
  shouldSuppressFalseVasopressorAlertForAnalgesic,
} from "../index.js";

describe("MEDUI.D4C.5B.3 Haiti ambulatory orders/meds/results", () => {
  it("A — certification id + SIMPLE_CLINIC_INTAKE for Haiti ambulatory only", () => {
    expect(CLINIC_CARE_HAITI_AMBULATORY_ORDERS_MEDS_RESULTS_CERTIFICATION_ID).toBe("MEDUI.D4C.5B.3");
    const haiti = resolveHaitiAmbulatoryIntakePresentation({
      facilityCountry: "HT",
      ambulatoryCareSetting: true,
    });
    expect(haiti.presentationMode).toBe(D4C5B3_SIMPLE_CLINIC_INTAKE_PRESENTATION);
    expect(haiti.jurisdiction).toBe("HAITI");
    expect(isSimpleClinicIntakePresentation(haiti)).toBe(true);
    expect(
      shouldHideEdTriageChromeForHaitiAmbulatory({
        facilityCountry: "HT",
        ambulatoryCareSetting: true,
      })
    ).toBe(true);
    expect(
      shouldHideEdTriageChromeForHaitiAmbulatory({
        facilityCountry: "US",
        ambulatoryCareSetting: true,
      })
    ).toBe(false);
    expect(
      shouldHideEdTriageChromeForHaitiAmbulatory({
        facilityCountry: "HT",
        ambulatoryCareSetting: false,
      })
    ).toBe(false);
  });

  it("B — section order places Rx near follow-up (not between Orders and Meds)", () => {
    const s = CLINIC_CARE_AMBULATORY_WORKSPACE_SECTIONS;
    expect(s.indexOf("intake")).toBeLessThan(s.indexOf("medical-evaluation"));
    expect(s.indexOf("medical-evaluation")).toBeLessThan(s.indexOf("orders"));
    expect(s.indexOf("orders")).toBeLessThan(s.indexOf("medications"));
    expect(s.indexOf("medications")).toBeLessThan(s.indexOf("results"));
    expect(s.indexOf("results")).toBeLessThan(s.indexOf("diagnoses"));
    expect(s.indexOf("notes")).toBeLessThan(s.indexOf("prescriptions"));
    expect(s.indexOf("prescriptions")).toBeLessThan(s.indexOf("follow-up"));
    expect(s.indexOf("follow-up")).toBeLessThan(s.indexOf("summary"));
  });

  it("C — Rx vs onsite discriminator uses medicationFulfillmentIntent", () => {
    expect(isOnsiteAdministerMedicationIntent("ADMINISTER_CHART")).toBe(true);
    expect(isOnsiteAdministerMedicationIntent(null)).toBe(true);
    expect(isOnsiteAdministerMedicationIntent("PHARMACY_DISPENSE")).toBe(false);
    expect(isExternalPharmacyDispenseIntent("PHARMACY_DISPENSE")).toBe(true);
    expect(
      isAmbulatoryExternalPrescriptionItem({
        catalogItemType: "MEDICATION",
        medicationFulfillmentIntent: "PHARMACY_DISPENSE",
      })
    ).toBe(true);
    expect(
      isAmbulatoryExternalPrescriptionItem({
        catalogItemType: "LAB_TEST",
        medicationFulfillmentIntent: "PHARMACY_DISPENSE",
      })
    ).toBe(false);
    expect(
      isAmbulatoryExternalPrescriptionItem({
        catalogItemType: "MEDICATION",
        medicationFulfillmentIntent: "ADMINISTER_CHART",
      })
    ).toBe(false);
    expect(
      isAmbulatoryOnsiteMarMedicationItem({
        catalogItemType: "MEDICATION",
        medicationFulfillmentIntent: "ADMINISTER_CHART",
      })
    ).toBe(true);
    expect(
      isAmbulatoryOnsiteMarMedicationItem({
        catalogItemType: "MEDICATION",
        medicationFulfillmentIntent: "PHARMACY_DISPENSE",
      })
    ).toBe(false);
  });

  it("D — IV fluids are onsite / not external Rx", () => {
    expect(isIvOrInfusionRoute("IV")).toBe(true);
    expect(isIvOrInfusionRoute("IVPB")).toBe(true);
    expect(isIvOrInfusionRoute("PO")).toBe(false);
    expect(
      classifyAmbulatoryOrderDestination({
        catalogItemType: "MEDICATION",
        medicationFulfillmentIntent: "ADMINISTER_CHART",
        route: "IV",
      })
    ).toBe("ONSITE");
    expect(ambulatoryOrderDestinationDisplayKey("ONSITE")).toContain("onsite");
    expect(ambulatoryOrderDestinationDisplayKey("EXTERNAL_RX")).toContain("externalRx");
  });

  it("E — Haiti Orders defaults to chart-admin; Rx print blocks empty", () => {
    expect(
      haitiAmbulatoryOrdersMedicationMode({
        facilityCountry: "HT",
        ambulatoryCareSetting: true,
      })
    ).toBe("ER_ADMINISTER_ONLY");
    expect(
      haitiAmbulatoryOrdersMedicationMode({
        facilityCountry: "US",
        ambulatoryCareSetting: true,
      })
    ).toBe("DEFAULT");
    const empty = canPrintAmbulatoryExternalPrescriptions([]);
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.reasonKey).toContain("printBlockedEmpty");
    const orders = [
      {
        id: "o1",
        status: "PLACED",
        items: [
          {
            catalogItemType: "MEDICATION",
            medicationFulfillmentIntent: "PHARMACY_DISPENSE",
            displayLabel: "Amoxicilline",
          },
        ],
      },
      {
        id: "o2",
        status: "PLACED",
        items: [
          { catalogItemType: "LAB_TEST", medicationFulfillmentIntent: null, displayLabel: "CBC" },
        ],
      },
      {
        id: "o3",
        status: "PLACED",
        items: [
          {
            catalogItemType: "MEDICATION",
            medicationFulfillmentIntent: "ADMINISTER_CHART",
            displayLabel: "NaCl 0.9%",
            route: "IV",
          },
        ],
      },
    ];
    const rx = filterAmbulatoryExternalPrescriptionOrders(orders);
    expect(rx).toHaveLength(1);
    expect(rx[0]?.items?.[0]?.displayLabel).toBe("Amoxicilline");
    const printable = canPrintAmbulatoryExternalPrescriptions(orders);
    expect(printable.ok).toBe(true);
  });

  it("F — French display helpers for route/form/status/role/sig", () => {
    expect(ambulatoryMedicationRouteDisplayKey("PO")).toContain("route.po");
    expect(ambulatoryMedicationFormDisplayKey("tablet")).toContain("form.tablet");
    expect(ambulatoryPharmacyStatusDisplayKey("IN_PROGRESS")).toContain("inProgress");
    expect(ambulatoryPharmacyStatusDisplayKey("PLACED")).toContain("placed");
    expect(ambulatoryOrderedByRoleDisplayKey("PROVIDER")).toContain("provider");
    expect(localizeAmbulatoryMedicationSigForFrenchDisplay("1 tablet now")).toBe(
      "1 comprimé maintenant"
    );
    expect(
      buildFrenchAmbulatoryMedicationSigDisplay({
        dose: "500 mg",
        formKey: "comprimé",
        routeKey: "voie orale",
        timing: "maintenant",
      })
    ).toContain("500 mg");
  });

  it("G — acetaminophen must not raise false vasopressor alert", () => {
    expect(
      shouldSuppressFalseVasopressorAlertForAnalgesic({
        name: "Acetaminophen 500 mg",
        therapeuticClass: "vasopressor analgesic mis-tag",
      })
    ).toBe(true);
    const warnings = getMedicationSafetyWarnings({
      name: "Acetaminophen",
      displayName: "Acétaminophène",
      therapeuticClass: "vasopressor",
      commonAliases: ["epinephrine misalias"],
    });
    expect(warnings.some((w) => w.ruleId === "high_risk_vasopressor")).toBe(false);
    expect(warnings.some((w) => w.ruleId === "vasopressor_pressor")).toBe(false);
    const pressor = getMedicationSafetyWarnings({
      name: "Norepinephrine",
      therapeuticClass: "vasopressor",
    });
    expect(pressor.some((w) => w.category === "VASOPRESSOR_HIGH_ALERT")).toBe(true);
  });

  it("H — result-entry denial messages distinguish role vs facility policy", () => {
    const facilityDeny = resolveAmbulatoryResultEntryDenialMessage({
      action: "ENTER",
      hasRole: true,
      isRnOnly: true,
      isLabTest: true,
      facilityAllowsRnLabEntry: false,
    });
    expect(facilityDeny.allowed).toBe(false);
    expect(facilityDeny.denialKind).toBe("FACILITY_POLICY");
    expect(facilityDeny.missingCapabilityKey).toContain("FacilityRnLabPolicy");

    const roleDeny = resolveAmbulatoryResultEntryDenialMessage({
      action: "ENTER",
      hasRole: false,
    });
    expect(roleDeny.denialKind).toBe("ROLE");
    expect(roleDeny.missingCapabilityKey).toContain("deniedRoleEnter");

    const finalizeDeny = resolveAmbulatoryResultEntryDenialMessage({
      action: "FINALIZE",
      hasRole: false,
    });
    expect(finalizeDeny.missingCapabilityKey).toContain("Finalize");

    expect(D4C5B3_RESULT_CAPABILITY_MATRIX_DOC.FRONT_DESK).toEqual([]);
    expect(D4C5B3_RESULT_CAPABILITY_MATRIX_DOC.LAB_TECH).toContain("ENTER");
  });

  it("I — RN lab seed change STOP when facility policy off", () => {
    const stop = haitiAmbulatoryRnLabEntrySeedChangeRequired({
      facilityAllowsRnLabResultSubmission: false,
    });
    expect(stop.stop).toBe(true);
    expect(stop.authority).toContain("allowRnLabResultSubmission");
    expect(stop.proposedChange).toBeTruthy();
    const ok = haitiAmbulatoryRnLabEntrySeedChangeRequired({
      facilityAllowsRnLabResultSubmission: true,
    });
    expect(ok.stop).toBe(false);
  });

  it("J — no Clinic* parallel engines in D4C.5B.3 module exports surface", () => {
    const src = [
      CLINIC_CARE_HAITI_AMBULATORY_ORDERS_MEDS_RESULTS_CERTIFICATION_ID,
      "OrderItem.medicationFulfillmentIntent",
      "ADMINISTER_CHART",
      "PHARMACY_DISPENSE",
    ].join("|");
    expect(src).not.toMatch(/ClinicMAR|ClinicPrescription|ClinicLabResult|ClinicRadiologyResult/);
  });
});
