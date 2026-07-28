/**
 * MEDUI.D4C.7E — Clinic medication orders / MAR / outpatient Rx separation (tests A–N).
 */

import { describe, expect, it } from "vitest";
import {
  CLINIC_ENTERPRISE_MEDICATION_ORDERS_MAR_RX_CERTIFICATION_ID,
  D4C7E_FORBIDDEN_CLINIC_MEDICATION_AUTHORITIES,
  D4C7E_MEDICATION_INTENT,
  D4C7E_ROLE_MATRIX,
  assertFacilityOrderDoesNotCreateOutpatientRx,
  assertOutpatientRxDoesNotCreateMarTask,
  canPrintClinicOutpatientPrescriptions,
  canPrintVerbalOrderAsProviderOutpatientRx,
  clinicAmbulatoryFacilityMedicationOrderMode,
  d4c7eMedicationIntentDomainKey,
  externalPharmacySendStatusDisplayKey,
  filterClinicOutpatientPrescriptionOrders,
  filterFacilityMarOrdersForClinic,
  isAmbulatoryExternalPrescriptionItem,
  isAmbulatoryOnsiteMarMedicationItem,
  isHomeMedicationHistoryIntent,
  projectPersistedOutpatientPrescriptionPrintLines,
  resolveExternalPharmacySendStatus,
  sameEnterpriseOrderAuthorityId,
  validateOutpatientPrescriptionPrintProjection,
} from "../index.js";

describe("MEDUI.D4C.7E clinic medication orders / MAR / Rx", () => {
  it("A — enterprise reuse: certification id + no Clinic* authorities listed as allowed", () => {
    expect(CLINIC_ENTERPRISE_MEDICATION_ORDERS_MAR_RX_CERTIFICATION_ID).toBe("MEDUI.D4C.7E");
    expect(D4C7E_FORBIDDEN_CLINIC_MEDICATION_AUTHORITIES).toContain("ClinicMedicationOrder");
    expect(D4C7E_FORBIDDEN_CLINIC_MEDICATION_AUTHORITIES).toContain("ClinicMAR");
    expect(D4C7E_FORBIDDEN_CLINIC_MEDICATION_AUTHORITIES).toContain("ClinicPrescription");
    expect(D4C7E_FORBIDDEN_CLINIC_MEDICATION_AUTHORITIES).toContain("ClinicDrugCatalog");
  });

  it("B — facility medication order routing: Clinic ambulatory Orders → ER_ADMINISTER_ONLY", () => {
    expect(
      clinicAmbulatoryFacilityMedicationOrderMode({ ambulatoryCareSetting: true })
    ).toBe("ER_ADMINISTER_ONLY");
    expect(
      clinicAmbulatoryFacilityMedicationOrderMode({ ambulatoryCareSetting: false })
    ).toBe("DEFAULT");
    const mar = filterFacilityMarOrdersForClinic([
      {
        id: "o1",
        status: "PLACED",
        items: [
          {
            catalogItemType: "MEDICATION",
            medicationFulfillmentIntent: "ADMINISTER_CHART",
            displayLabel: "Acétaminophène 500 mg",
          },
        ],
      },
      {
        id: "o2",
        status: "PLACED",
        items: [
          {
            catalogItemType: "MEDICATION",
            medicationFulfillmentIntent: "PHARMACY_DISPENSE",
            displayLabel: "Losartan 50 mg",
          },
        ],
      },
    ]);
    expect(mar).toHaveLength(1);
    expect(mar[0]?.id).toBe("o1");
    expect(sameEnterpriseOrderAuthorityId("ord-1", "ord-1", "ord-1")).toBe(true);
    expect(sameEnterpriseOrderAuthorityId("ord-1", "ord-2")).toBe(false);
  });

  it("C — RN visibility classifiers: onsite MAR only for ADMINISTER_CHART", () => {
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
    expect(D4C7E_ROLE_MATRIX.RN.marAdminister).toBe(true);
    expect(D4C7E_ROLE_MATRIX.FRONT_DESK.marAdminister).toBe(false);
    expect(D4C7E_ROLE_MATRIX.PROVIDER.outpatientRxSign).toBe(true);
    expect(D4C7E_ROLE_MATRIX.RN.outpatientRxSign).toBe(false);
  });

  it("D — Pharmacy: outpatient Rx not in facility MAR filter; IV never on Rx", () => {
    expect(
      isAmbulatoryExternalPrescriptionItem({
        catalogItemType: "MEDICATION",
        medicationFulfillmentIntent: "PHARMACY_DISPENSE",
        route: "PO",
      })
    ).toBe(true);
    expect(
      isAmbulatoryExternalPrescriptionItem({
        catalogItemType: "MEDICATION",
        medicationFulfillmentIntent: "PHARMACY_DISPENSE",
        route: "IVPB",
      })
    ).toBe(false);
    expect(D4C7E_ROLE_MATRIX.PHARMACY.pharmacyVerify).toBe(true);
  });

  it("E — MAR facility filter excludes external Rx", () => {
    const orders = [
      {
        id: "a",
        items: [
          {
            catalogItemType: "MEDICATION",
            medicationFulfillmentIntent: "ADMINISTER_CHART",
            route: "IV",
          },
        ],
      },
      {
        id: "b",
        items: [
          {
            catalogItemType: "MEDICATION",
            medicationFulfillmentIntent: "PHARMACY_DISPENSE",
            route: "PO",
          },
        ],
      },
    ];
    expect(filterFacilityMarOrdersForClinic(orders)).toHaveLength(1);
    expect(filterClinicOutpatientPrescriptionOrders(orders)).toHaveLength(1);
  });

  it("F — Rx independence non-crossover", () => {
    const rx = {
      catalogItemType: "MEDICATION",
      medicationFulfillmentIntent: "PHARMACY_DISPENSE",
      route: "PO",
    };
    const facility = {
      catalogItemType: "MEDICATION",
      medicationFulfillmentIntent: "ADMINISTER_CHART",
      route: "IV",
    };
    expect(assertOutpatientRxDoesNotCreateMarTask(rx)).toBe(true);
    expect(assertFacilityOrderDoesNotCreateOutpatientRx(facility)).toBe(true);
    expect(assertOutpatientRxDoesNotCreateMarTask(facility)).toBe(true);
  });

  it("G — Home medication history intent is distinct", () => {
    expect(isHomeMedicationHistoryIntent("HOME_MEDICATION_HISTORY")).toBe(true);
    expect(isHomeMedicationHistoryIntent("ADMINISTER_CHART")).toBe(false);
    expect(D4C7E_MEDICATION_INTENT.HOME_MEDICATION_HISTORY).toBe("HOME_MEDICATION_HISTORY");
    expect(D4C7E_MEDICATION_INTENT.FACILITY_ADMINISTRATION).toBe("ADMINISTER_CHART");
    expect(D4C7E_MEDICATION_INTENT.OUTPATIENT_PRESCRIPTION).toBe("PHARMACY_DISPENSE");
  });

  it("H — Rx search/editor projection: multi-line print lines from persisted labels", () => {
    const lines = projectPersistedOutpatientPrescriptionPrintLines(
      [
        {
          catalogItemType: "MEDICATION",
          medicationFulfillmentIntent: "PHARMACY_DISPENSE",
          displayLabelFr: "Losartan",
          strength: "50 mg",
          route: "PO",
          notes: "1 comprimé quotidien",
          quantity: 30,
          refillCount: 2,
        },
        {
          catalogItemType: "MEDICATION",
          medicationFulfillmentIntent: "PHARMACY_DISPENSE",
          _label: "Amoxicilline",
          strength: "500 mg",
          route: "PO",
          quantity: 21,
          refillCount: 0,
        },
      ],
      "fr"
    );
    expect(lines).toHaveLength(2);
    expect(lines[0]?.manualLabel).toBe("Losartan");
    expect(lines[1]?.manualLabel).toBe("Amoxicilline");
  });

  it("I — External pharmacy send honesty without connector", () => {
    expect(
      resolveExternalPharmacySendStatus({
        pharmacySelected: false,
        ePrescribingConnectorAvailable: false,
      })
    ).toBe("UNSENT_NO_CONNECTOR");
    expect(
      resolveExternalPharmacySendStatus({
        pharmacySelected: true,
        ePrescribingConnectorAvailable: false,
      })
    ).toBe("SELECTED_MANUAL");
    expect(externalPharmacySendStatusDisplayKey("UNSENT_NO_CONNECTOR")).toContain(
      "unsentNoConnector"
    );
  });

  it("J — Print: persisted lines required; blank and facility-only blocked", () => {
    const empty = validateOutpatientPrescriptionPrintProjection([]);
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.reasonKey).toContain("printBlockedEmpty");

    const facilityOnly = validateOutpatientPrescriptionPrintProjection([
      {
        catalogItemType: "MEDICATION",
        medicationFulfillmentIntent: "ADMINISTER_CHART",
        displayLabel: "NaCl 0.9%",
        route: "IV",
      },
    ]);
    expect(facilityOnly.ok).toBe(false);
    if (!facilityOnly.ok) expect(facilityOnly.reasonKey).toContain("printBlockedFacilityOnly");

    const ok = validateOutpatientPrescriptionPrintProjection([
      {
        catalogItemType: "MEDICATION",
        medicationFulfillmentIntent: "PHARMACY_DISPENSE",
        displayLabel: "Losartan",
        strength: "50 mg",
        route: "PO",
        notes: "quotidien",
        quantity: 30,
        refillCount: 1,
      },
    ]);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.lineCount).toBe(1);
      expect(ok.lines[0]?.manualLabel).toBe("Losartan");
      expect(ok.lines[0]?.strength).toBe("50 mg");
    }

    const clinicPrint = canPrintClinicOutpatientPrescriptions([
      {
        id: "rx1",
        items: [
          {
            catalogItemType: "MEDICATION",
            medicationFulfillmentIntent: "PHARMACY_DISPENSE",
            displayLabel: "Losartan",
          },
        ],
      },
    ]);
    expect(clinicPrint.ok).toBe(true);
  });

  it("K — Verbal order cannot print as provider outpatient Rx without cosign", () => {
    const blocked = canPrintVerbalOrderAsProviderOutpatientRx({
      isVerbalOrder: true,
      providerCosignComplete: false,
      hasOutpatientDispenseLines: true,
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.reasonKey).toContain("printBlockedUnsignedVerbal");

    const allowed = canPrintVerbalOrderAsProviderOutpatientRx({
      isVerbalOrder: true,
      providerCosignComplete: true,
      hasOutpatientDispenseLines: true,
    });
    expect(allowed.ok).toBe(true);
  });

  it("L — Encounter closure: intent domain keys for facility vs Rx", () => {
    expect(d4c7eMedicationIntentDomainKey("ADMINISTER_CHART")).toBe("facilityAdministration");
    expect(d4c7eMedicationIntentDomainKey("PHARMACY_DISPENSE")).toBe("outpatientPrescription");
  });

  it("M — French display keys exist for external pharmacy + print blocks", () => {
    expect(externalPharmacySendStatusDisplayKey("SELECTED_MANUAL")).toContain("selectedManual");
    expect(externalPharmacySendStatusDisplayKey("SENT")).toContain("sent");
    expect(externalPharmacySendStatusDisplayKey("FAILED")).toContain("failed");
  });

  it("N — Regression: ED/Hospital mode unchanged when not ambulatory Clinic", () => {
    expect(
      clinicAmbulatoryFacilityMedicationOrderMode({ ambulatoryCareSetting: false })
    ).toBe("DEFAULT");
    // Facility chart-admin still excluded from Rx filter
    expect(
      isAmbulatoryExternalPrescriptionItem({
        catalogItemType: "MEDICATION",
        medicationFulfillmentIntent: "ADMINISTER_CHART",
      })
    ).toBe(false);
  });
});
