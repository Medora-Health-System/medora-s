/**
 * MEDUI.D4C.7G — Web source guards: Clinic MAR fallback + pure Rx mode.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  shouldShowAmbulatoryPendingMarOrderItemFallback,
  D4C7G_OUTPATIENT_RX_ORDER_MODE,
} from "@medora/shared";

const featureDir = join(__dirname);
const webSrc = join(featureDir, "../..");

function read(rel: string): string {
  return readFileSync(join(featureDir, rel), "utf8");
}

describe("MEDUI.D4C.7G Clinic MAR / Rx web guards", () => {
  it("A — Médicaments mounts MedicationAdministrationTab with Haiti timeline hide param", () => {
    const panels = read("ClinicCareAmbulatoryWorkspacePanels.tsx");
    expect(panels).toContain("MedicationAdministrationTab");
    expect(panels).toContain("shouldHideMarShiftTimelineForHaitiAmbulatory");
    expect(panels).toContain("showFacilityMarShiftTimeline={!hideShiftTimeline}");
    expect(panels).toContain("clinicAmbulatoryFacilityMedicationOrderMode");
  });

  it("B — MAR tab uses ambulatory pending OrderItem fallback when timeline hidden", () => {
    const mar = readFileSync(
      join(webSrc, "components/encounters/MedicationAdministrationTab.tsx"),
      "utf8"
    );
    expect(mar).toContain("shouldShowAmbulatoryPendingMarOrderItemFallback");
    expect(mar).toContain("mar-ambulatory-pending-fallback-hint");
    expect(mar).toContain("isOrderItemPendingNurseMedication");
    expect(
      shouldShowAmbulatoryPendingMarOrderItemFallback({
        showFacilityMarShiftTimeline: false,
        marTabShowLegacySections: false,
      })
    ).toBe(true);
  });

  it("C — Rx panel uses OUTPATIENT_RX_ONLY (not DEFAULT)", () => {
    const rx = read("ClinicCareAmbulatoryPrescriptionPanel.tsx");
    expect(rx).toContain(`medicationOrderMode="${D4C7G_OUTPATIENT_RX_ORDER_MODE}"`);
    expect(rx).not.toContain('medicationOrderMode="DEFAULT"');
    expect(rx).toContain("OUTPATIENT_RX_ONLY");
  });

  it("D — CreateOrderModal supports medication-only outpatient Rx mode", () => {
    const modal = readFileSync(join(webSrc, "components/orders/CreateOrderModal.tsx"), "utf8");
    expect(modal).toContain('OUTPATIENT_RX_ONLY"');
    expect(modal).toContain('? ["MEDICATION"]');
    expect(modal).toContain("create-order-modal-rx-only-tabs");
    expect(modal).toContain("outpatientRxOnlyMedication");
  });

  it("E — SelectedMedicationItems / ManualOrderEntry hide administer destination in Rx mode", () => {
    const selected = readFileSync(
      join(webSrc, "components/orders/createOrderModal/SelectedMedicationItems.tsx"),
      "utf8"
    );
    const manual = readFileSync(
      join(webSrc, "components/orders/createOrderModal/ManualOrderEntry.tsx"),
      "utf8"
    );
    expect(selected).toContain("OUTPATIENT_RX_ONLY");
    expect(selected).toContain("clinicCareD4c7g.rx.externalPharmacyDestination");
    expect(manual).toContain("OUTPATIENT_RX_ONLY");
    expect(manual).toContain("manual-rx-external-destination");
  });

  it("F — French i18n keys for D4C.7G mirrored", () => {
    const fr = readFileSync(join(webSrc, "i18n/messages/fr.ts"), "utf8");
    const en = readFileSync(join(webSrc, "i18n/messages/en.ts"), "utf8");
    for (const key of [
      "clinicCareD4c7g",
      "ambulatoryPendingHint",
      "composerTitle",
      "externalPharmacyDestination",
      "facilityMarProjectionFailed",
    ]) {
      expect(fr).toContain(key);
      expect(en).toContain(key);
    }
  });

  it("G — API pilot skip for outpatient Rx wired", () => {
    const orders = readFileSync(
      join(webSrc, "../../api/src/orders/orders.service.ts"),
      "utf8"
    );
    expect(orders).toContain("shouldSkipPilotScopeForOutpatientRxCreate");
    expect(orders).toContain("OUTPATIENT_RX_PILOT_SCOPE_NOT_APPLICABLE");
  });
});
