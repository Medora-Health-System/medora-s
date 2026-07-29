/**
 * MEDUI.D4C.7H — Web source guards: MAR allergy ack + canonical Rx print.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  classifyMarAllergyDocumentationSummary,
  isUnsafeNoopenerPrintWindowOpenFeatures,
} from "@medora/shared";

const featureDir = join(__dirname);
const webSrc = join(featureDir, "../..");

function read(rel: string): string {
  return readFileSync(join(featureDir, rel), "utf8");
}

describe("MEDUI.D4C.7H Clinic MAR allergy acknowledgement wiring", () => {
  it("passes encounterAllergySource into MedicationAdministrationTab from ambulatory panels", () => {
    const panels = read("ClinicCareAmbulatoryWorkspacePanels.tsx");
    expect(panels).toContain("encounterAllergySource=");
    expect(panels).toContain("nursingAssessment: encounter.nursingAssessment");
    expect(panels).toContain("triage: triageSnapshot");
    expect(panels).not.toContain("ClinicMarAllergyConfirmation");
  });

  it("MAR tab hydrates allergy summary and renders acknowledgement control", () => {
    const mar = readFileSync(
      join(webSrc, "components/encounters/MedicationAdministrationTab.tsx"),
      "utf8"
    );
    expect(mar).toContain("evaluateMarAllergySafetyForAdministration");
    expect(mar).toContain('data-testid="mar-allergy-acknowledgement"');
    expect(mar).toContain('data-testid="mar-allergy-safety-ack"');
    expect(mar).toContain("marAllergyAcknowledgementRequired");
    expect(mar).toContain("isMarAllergyAcknowledgementServerMessage");
    expect(mar).toContain("safetyAcknowledgedMedicationAllergies: true");
  });

  it("shared classification distinguishes NKDA from known allergy", () => {
    expect(classifyMarAllergyDocumentationSummary("Aucune allergie connue")).toBe(
      "NO_KNOWN_ALLERGIES"
    );
    expect(classifyMarAllergyDocumentationSummary("Pénicilline")).toBe(
      "KNOWN_ALLERGY_OR_INTOLERANCE"
    );
  });
});

describe("MEDUI.D4C.7H prescription print authority", () => {
  it("Clinic Rx panel uses canonical printRx without noopener", () => {
    const rx = read("ClinicCareAmbulatoryPrescriptionPanel.tsx");
    expect(rx).toContain("printRx(");
    expect(rx).toContain("buildRxPrintFacilityIdentity");
    expect(rx).not.toContain("noopener");
    expect(rx).not.toContain("getRxPrintHtml");
  });

  it("RxPrintLayout rejects empty projection and avoids noopener blank windows", () => {
    const layout = readFileSync(join(webSrc, "components/pharmacy/RxPrintLayout.tsx"), "utf8");
    expect(layout).toContain("isRxPrintHtmlDocumentReady");
    expect(layout).toContain("schedulePrintWhenReady");
    expect(layout).toContain("facility-header");
    expect(layout).toContain('window.open("", "_blank")');
    expect(layout).not.toMatch(/window\.open\([^)]*noopener/);
    expect(layout).toContain("evaluateRxPrintFacilityIdentity");
    expect(layout).toContain("RX_PRINT_DOCUMENT_EMPTY");
    expect(isUnsafeNoopenerPrintWindowOpenFeatures("noopener,noreferrer")).toBe(true);
  });

  it("CreateOrderModal and pharmacy entry points pass facility identity", () => {
    const modal = readFileSync(join(webSrc, "components/orders/CreateOrderModal.tsx"), "utf8");
    expect(modal).toContain("buildRxPrintFacilityIdentity");
    expect(modal).toContain("facilityIdentity");
    const pharmacy = readFileSync(join(webSrc, "../app/app/pharmacy-worklist/page.tsx"), "utf8");
    expect(pharmacy).toContain("buildRxPrintFacilityIdentity");
  });
});
