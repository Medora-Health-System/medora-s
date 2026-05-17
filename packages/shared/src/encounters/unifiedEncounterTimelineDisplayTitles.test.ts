import { describe, expect, it } from "vitest";
import {
  buildUnifiedClinicalEventTitle,
  buildUnifiedOrderEventTitle,
  resolveUnifiedTimelineOrderLineLabel,
} from "./unifiedEncounterTimelineDisplayTitles.js";

describe("unifiedEncounterTimelineDisplayTitles", () => {
  it("resolves observation template line label in English even when stored manualLabel is French", () => {
    const label = resolveUnifiedTimelineOrderLineLabel({
      metadata: { templateItemId: "mon_pulse_ox_continuous", source: "OBSERVATION_TEMPLATE_ORDER" },
      lineLabelFr: "Surveillance continue par oxymétrie de pouls",
      locale: "en",
    });
    expect(label).toContain("pulse oximetry");
    expect(label).not.toMatch(/oxymétrie/i);
  });

  it("builds English order acknowledgement title with template line", () => {
    const title = buildUnifiedOrderEventTitle({
      locale: "en",
      eventType: "STARTED",
      orderType: "CARE",
      lineLabel: "Continuous pulse oximetry monitoring",
      metadata: { lifecycleOutcome: "ACKNOWLEDGED", source: "OBSERVATION_TEMPLATE_ORDER" },
    });
    expect(title).toBe("Order acknowledged — Continuous pulse oximetry monitoring");
    expect(title).not.toMatch(/accusé|réception/i);
  });

  it("builds French discharge packet clinical title", () => {
    expect(buildUnifiedClinicalEventTitle("fr", "DISCHARGE_SUMMARY_SAVED")).toBe(
      "Dossier de sortie enregistré"
    );
  });

  it("builds English discharge packet clinical title", () => {
    expect(buildUnifiedClinicalEventTitle("en", "DISCHARGE_SUMMARY_SAVED")).toBe(
      "Discharge packet saved"
    );
  });

  it("builds provider workspace clinical titles in the requested locale", () => {
    expect(buildUnifiedClinicalEventTitle("en", "ED_PROVIDER_DOCUMENTATION_SAVED")).toBe(
      "ED provider documentation saved"
    );
    expect(buildUnifiedClinicalEventTitle("en", "OBSERVATION_PROVIDER_PROGRESS_NOTE_SAVED")).toBe(
      "Observation provider progress note saved"
    );
    expect(buildUnifiedClinicalEventTitle("fr", "OBSERVATION_PROVIDER_PROGRESS_NOTE_SAVED")).toBe(
      "Note d'évolution médecin observation enregistrée"
    );
    expect(buildUnifiedClinicalEventTitle("en", "OBSERVATION_PROVIDER_PROGRESS_NOTE_SAVED")).not.toMatch(
      /discharge|sortie|évolution|médecin/i
    );
  });
});
