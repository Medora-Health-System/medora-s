import { describe, expect, it } from "vitest";
import {
  buildMarMedicationResponseFollowUpSummary,
  resolveMarMedicationResponseFollowUpStatus,
  resolveMarMedicationResponseFollowUpWindow,
} from "./marMedicationResponseFollowUpGovernance.js";

const administeredAt = "2026-06-03T09:00:00.000Z";

function atOffset(minutes: number): string {
  return new Date(new Date(administeredAt).getTime() + minutes * 60_000).toISOString();
}

describe("marMedicationResponseFollowUpGovernance", () => {
  it("IV morphine window = 15–60 min", () => {
    const window = resolveMarMedicationResponseFollowUpWindow({
      doseStatus: "COMPLETED",
      medicationLabel: "Morphine 2 mg IV",
      route: "IV",
      frequencyCode: "PRN",
    });
    expect(window?.category).toBe("IV_OPIOID");
    expect(window?.earliestMinutes).toBe(15);
    expect(window?.latestMinutes).toBe(60);
  });

  it("oral oxycodone window = 30–90 min", () => {
    const window = resolveMarMedicationResponseFollowUpWindow({
      doseStatus: "COMPLETED",
      medicationLabel: "Oxycodone 5 mg",
      route: "PO",
      frequencyCode: "PRN",
    });
    expect(window?.category).toBe("ORAL_OPIOID");
    expect(window?.earliestMinutes).toBe(30);
    expect(window?.latestMinutes).toBe(90);
  });

  it("ondansetron window = 30–120 min", () => {
    const window = resolveMarMedicationResponseFollowUpWindow({
      doseStatus: "COMPLETED",
      medicationLabel: "Ondansetron 4 mg IV",
      frequencyCode: "PRN",
    });
    expect(window?.category).toBe("ANTIEMETIC");
    expect(window?.earliestMinutes).toBe(30);
    expect(window?.latestMinutes).toBe(120);
  });

  it("albuterol/DuoNeb window = 15–60 min", () => {
    const window = resolveMarMedicationResponseFollowUpWindow({
      doseStatus: "COMPLETED",
      medicationLabel: "Albuterol nebulizer",
      frequencyCode: "PRN",
    });
    expect(window?.category).toBe("RESPIRATORY");
    expect(window?.earliestMinutes).toBe(15);
    expect(window?.latestMinutes).toBe(60);
  });

  it("emergency med window = 5–30 min", () => {
    const window = resolveMarMedicationResponseFollowUpWindow({
      doseStatus: "COMPLETED",
      medicationLabel: "Epinephrine",
      frequencyCode: "STAT",
    });
    expect(window?.category).toBe("EMERGENCY");
    expect(window?.earliestMinutes).toBe(5);
    expect(window?.latestMinutes).toBe(30);
  });

  it("PRN default window = 30–120 min", () => {
    const window = resolveMarMedicationResponseFollowUpWindow({
      doseStatus: "COMPLETED",
      medicationLabel: "Diphenhydramine",
      frequencyCode: "PRN",
    });
    expect(window?.category).toBe("PRN_DEFAULT");
    expect(window?.earliestMinutes).toBe(30);
    expect(window?.latestMinutes).toBe(120);
  });

  it("optional/maintenance med = NOT_APPLICABLE", () => {
    expect(
      resolveMarMedicationResponseFollowUpStatus({
        doseStatus: "COMPLETED",
        medicationLabel: "Ceftriaxone 1 g IV",
        frequencyCode: "DAILY",
        administeredAt,
        referenceAt: atOffset(45),
      })
    ).toBe("NOT_APPLICABLE");
  });

  it("status NOT_DUE before earliest", () => {
    expect(
      resolveMarMedicationResponseFollowUpStatus({
        doseStatus: "COMPLETED",
        medicationLabel: "Morphine 2 mg IV",
        route: "IV",
        frequencyCode: "PRN",
        administeredAt,
        referenceAt: atOffset(10),
      })
    ).toBe("NOT_DUE");
  });

  it("status RECOMMENDED within window", () => {
    expect(
      resolveMarMedicationResponseFollowUpStatus({
        doseStatus: "COMPLETED",
        medicationLabel: "Morphine 2 mg IV",
        route: "IV",
        frequencyCode: "PRN",
        administeredAt,
        referenceAt: atOffset(30),
      })
    ).toBe("RECOMMENDED");
  });

  it("status OVERDUE after latest", () => {
    expect(
      resolveMarMedicationResponseFollowUpStatus({
        doseStatus: "COMPLETED",
        medicationLabel: "Morphine 2 mg IV",
        route: "IV",
        frequencyCode: "PRN",
        administeredAt,
        referenceAt: atOffset(90),
      })
    ).toBe("OVERDUE");
  });

  it("status DOCUMENTED after response exists", () => {
    expect(
      resolveMarMedicationResponseFollowUpStatus({
        doseStatus: "COMPLETED",
        medicationLabel: "Morphine 2 mg IV",
        route: "IV",
        frequencyCode: "PRN",
        administeredAt,
        referenceAt: atOffset(20),
        responses: [
          {
            responseCode: "PAIN_REDUCED",
            responseDetail: null,
            responseTime: atOffset(20),
            documentedAt: atOffset(20),
            painBefore: 8,
            painAfter: 4,
          },
        ],
      })
    ).toBe("DOCUMENTED");
  });

  it("buildMarMedicationResponseFollowUpSummary exposes window bounds", () => {
    const summary = buildMarMedicationResponseFollowUpSummary({
      doseStatus: "COMPLETED",
      medicationLabel: "Morphine 2 mg IV",
      route: "IV",
      frequencyCode: "PRN",
      administeredAt,
      referenceAt: atOffset(30),
    });
    expect(summary.status).toBe("RECOMMENDED");
    expect(summary.earliestAt).toBe(atOffset(15));
    expect(summary.latestAt).toBe(atOffset(60));
  });
});
