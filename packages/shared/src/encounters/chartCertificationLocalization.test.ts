import { describe, expect, it } from "vitest";
import { buildEdClosedEncounterCertification } from "./edClosedEncounterCertification.js";
import { resolveChartCertificationLocalizationKeys } from "./chartCertificationLocalization.js";
import { ED_DISCHARGE_MODE_HOME } from "./edEncounterLifecycle.js";

const FRENCH_FOLLOW_UP_MESSAGE =
  "Documentez le suivi structuré (destination/prestataire, délai et contact le cas échéant) dans la planification de sortie.";

function departedOpenSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    status: "OPEN",
    providerDocumentationStatus: "SIGNED",
    chiefComplaint: "Chest pain",
    providerNote: "Stable",
    encounterType: "EMERGENCY",
    dischargeSummaryJson: {
      dischargeMode: ED_DISCHARGE_MODE_HOME,
      instructions: "Return if worse",
      followUp: "PCP in 2 days",
      patientInstructionsGiven: true,
    },
    nursingAssessment: {
      nursingEvalV1: { sections: { assessment: { text: "Nursing documented" } } },
      erDispositionExecutionV1: {
        dischargeSortieCompletedAt: "2026-06-03T12:00:00.000Z",
        dischargeSortieCompletedByDisplayName: "RN One",
      },
    },
    ...overrides,
  };
}

describe("chart certification localization isolation", () => {
  it("does not pipe French disposition-readiness messages into Stage A description fields", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: departedOpenSnapshot(),
      dispositionReadiness: {
        canClose: false,
        blockers: [
          {
            code: "DISCHARGE_FOLLOW_UP_MISSING",
            message: FRENCH_FOLLOW_UP_MESSAGE,
          },
        ],
        warnings: [],
        activeOrderCounts: { lab: 0, imaging: 0, medication: 0, care: 0 },
        lastVitalsAt: null,
      } as any,
    });

    const finding = result.deficiencies.find((d) => d.stableCode === "DISCHARGE_FOLLOW_UP_MISSING");
    expect(finding).toBeTruthy();
    expect(finding!.description).not.toContain("Documentez");
    expect(finding!.description).not.toBe(FRENCH_FOLLOW_UP_MESSAGE);
    expect(finding!.titleKey).toContain("DISCHARGE_FOLLOW_UP_MISSING");
    expect(finding!.descriptionKey).toContain("DISCHARGE_FOLLOW_UP_MISSING");
    expect(finding!.title.toLowerCase()).toContain("follow-up");
    expect(finding!.description.toLowerCase()).toContain("follow-up");
  });

  it("maps discharge communication vs content to distinct localization keys", () => {
    const content = resolveChartCertificationLocalizationKeys("DISCHARGE_INSTRUCTIONS_MISSING");
    const communication = resolveChartCertificationLocalizationKeys("DISCHARGE_INSTRUCTIONS_NOT_GIVEN");
    expect(content?.titleKey).toContain("DISCHARGE_INSTRUCTIONS_CONTENT_MISSING");
    expect(communication?.titleKey).toContain("DISCHARGE_INSTRUCTIONS_NOT_COMMUNICATED");
    expect(content?.titleKey).not.toBe(communication?.titleKey);
  });

  it("keeps English-only fallbacks for provider unsigned", () => {
    const keys = resolveChartCertificationLocalizationKeys("PROVIDER_DOCUMENTATION_UNSIGNED");
    expect(keys?.fallbackTitleEn).toMatch(/Provider note unsigned/i);
    expect(keys?.fallbackDescriptionEn).not.toMatch(/\b(le|la|documentez)\b/i);
  });
});
