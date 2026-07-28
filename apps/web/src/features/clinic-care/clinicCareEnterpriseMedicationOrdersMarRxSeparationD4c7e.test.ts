/**
 * MEDUI.D4C.7E — web source guards for Clinic medication / MAR / Rx separation.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const featureDir = __dirname;

function read(rel: string): string {
  return readFileSync(join(featureDir, rel), "utf8");
}

describe("MEDUI.D4C.7E clinic medication orders/MAR/Rx web mounts", () => {
  it("A — no ClinicMedicationOrder / ClinicMAR / ClinicPrescription engines", () => {
    const panels = read("ClinicCareAmbulatoryWorkspacePanels.tsx");
    const rx = read("ClinicCareAmbulatoryPrescriptionPanel.tsx");
    expect(panels).not.toContain("ClinicMedicationOrder");
    expect(panels).not.toContain("ClinicMAR");
    expect(rx).not.toContain("ClinicPrescription");
    expect(rx).not.toContain("ClinicDrugCatalog");
  });

  it("B — Orders use clinic ambulatory facility-admin mode → enterprise MAR path", () => {
    const panels = read("ClinicCareAmbulatoryWorkspacePanels.tsx");
    expect(panels).toContain("clinicAmbulatoryFacilityMedicationOrderMode");
    expect(panels).toContain("medicationOrderMode={ordersMedicationMode}");
    expect(panels).toContain("MedicationAdministrationTab");
    expect(panels).toContain("EmergencyErOrdersPanel");
  });

  it("C — Rx panel projects persisted print lines + external pharmacy board", () => {
    const rx = read("ClinicCareAmbulatoryPrescriptionPanel.tsx");
    expect(rx).toContain("validateOutpatientPrescriptionPrintProjection");
    expect(rx).toContain("projectPersistedOutpatientPrescriptionPrintLines");
    expect(rx).toContain("resolveExternalPharmacySendStatus");
    expect(rx).toContain("clinic-care-ambulatory-external-pharmacy-board");
    expect(rx).toContain('medicationOrderMode="DEFAULT"');
  });

  it("D — CreateOrderModal snapshots med lines for print (no empty post-clear print)", () => {
    const createOrder = readFileSync(
      join(featureDir, "../../components/orders/CreateOrderModal.tsx"),
      "utf8"
    );
    expect(createOrder).toContain("medItemsSnapshot");
    expect(createOrder).toContain("validateOutpatientPrescriptionPrintProjection");
    expect(createOrder).toContain("setRxIntentDisplayItems(medItemsSnapshot)");
  });

  it("E — RxPrintLayout blocks zero-line print", () => {
    const print = readFileSync(
      join(featureDir, "../../components/pharmacy/RxPrintLayout.tsx"),
      "utf8"
    );
    expect(print).toContain("printOutput.rx.emptyBlocked");
    expect(print).toContain("params.order.items.length === 0");
  });

  it("F — MAR reuses enterprise MedicationAdministrationTab (parameterized)", () => {
    const panels = read("ClinicCareAmbulatoryWorkspacePanels.tsx");
    expect(panels).toContain("embeddedWorkspaceLayout");
    expect(panels).toContain("showFacilityMarShiftTimeline");
    expect(panels).not.toMatch(/function ClinicMAR/);
  });
});
