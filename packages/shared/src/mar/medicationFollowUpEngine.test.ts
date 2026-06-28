/** MEDUI.MEDICATION.ENTERPRISE_MEDICATION_ADMINISTRATION_SAFETY.1 — regression protection. */

import { describe, expect, it } from "vitest";
import {
  buildMedicationFollowUpProjection,
} from "./medicationFollowUpEngine.js";
import { resolveMedicationFollowUpType } from "./medicationFollowUpRegistry.js";
import { resolveMedicationAdministrationLifecycleState } from "./medicationAdministrationEnterpriseLifecycle.js";
import { buildUnifiedMedicationFollowUpTimelineRows } from "./medicationFollowUpProjection.js";

describe("resolveMedicationFollowUpType registry", () => {
  it("classifies pain medications", () => {
    expect(resolveMedicationFollowUpType({ medicationLabel: "Morphine 2 mg IV" })).toBe("PAIN");
    expect(resolveMedicationFollowUpType({ medicationLabel: "Ketorolac 15 mg IV" })).toBe("PAIN");
  });

  it("classifies pulmonary medications", () => {
    expect(
      resolveMedicationFollowUpType({ medicationLabel: "Albuterol nebulizer", catalogCode: "ALBUTEROL_NEB" })
    ).toBe("RESPIRATORY");
  });

  it("classifies glucose and coagulation medications", () => {
    expect(resolveMedicationFollowUpType({ medicationLabel: "Insulin lispro 4 units" })).toBe("GLUCOSE");
    expect(resolveMedicationFollowUpType({ medicationLabel: "Heparin 5000 units SC" })).toBe("COAGULATION");
  });

  it("classifies antibiotic lab follow-up", () => {
    expect(resolveMedicationFollowUpType({ medicationLabel: "Vancomycin 1 g IV" })).toBe("LAB");
  });

  it("returns NONE for infusion-only context", () => {
    expect(
      resolveMedicationFollowUpType({
        medicationLabel: "Normal Saline",
        clinicalAction: "START_INFUSION",
        doseStatus: "IN_PROGRESS",
      })
    ).toBe("NONE");
  });
});

describe("buildMedicationFollowUpProjection", () => {
  it("projects pain follow-up after morphine administration", () => {
    const projection = buildMedicationFollowUpProjection({
      medicationLabel: "Morphine 2 mg IV",
      marAction: "administered",
      administeredAt: "2026-06-23T14:00:00.000Z",
      doseStatus: "COMPLETED",
      defaultSecondaryText: "ADMINISTERED",
    });
    expect(projection.followUpType).toBe("PAIN");
    expect(projection.pathway).toBe("pain");
    expect(projection.lifecycleState).toBe("FOLLOW_UP_REQUIRED");
    expect(projection.responseRequired).toBe(true);
  });

  it("projects respiratory follow-up after albuterol administration", () => {
    const projection = buildMedicationFollowUpProjection({
      catalogCode: "ALBUTEROL_NEB",
      medicationLabel: "Albuterol nebulizer",
      marAction: "administered",
      administeredAt: "2026-06-23T17:20:00.000Z",
      doseStatus: "COMPLETED",
      defaultSecondaryText: "ADMINISTERED",
    });
    expect(projection.followUpType).toBe("RESPIRATORY");
    expect(projection.pathway).toBe("respiratory");
    expect(projection.lifecycleState).toBe("FOLLOW_UP_REQUIRED");
  });

  it("marks completed when pain response documented", () => {
    const projection = buildMedicationFollowUpProjection({
      medicationLabel: "Morphine 2 mg IV",
      marAction: "administered",
      administeredAt: "2026-06-23T14:00:00.000Z",
      doseStatus: "COMPLETED",
      defaultSecondaryText: "RESPONSE_COMPLETED",
      administrationNotes:
        'MAR_MEDICATION_RESPONSE: {"responseCode":"PAIN_REDUCED","documentedAt":"2026-06-23T14:45:00.000Z","responseTime":"2026-06-23T14:45:00.000Z","painBefore":8,"painAfter":4}',
    });
    expect(projection.responseCompleted).toBe(true);
    expect(projection.lifecycleState).toBe("COMPLETED");
  });
});

describe("buildUnifiedMedicationFollowUpTimelineRows", () => {
  it("interleaves administration and follow-up chronologically", () => {
    const rows = buildUnifiedMedicationFollowUpTimelineRows({
      admins: [
        {
          id: "admin-1",
          notes:
            'MAR_MEDICATION_RESPONSE: {"responseCode":"PAIN_REDUCED","documentedAt":"2026-06-23T14:45:00.000Z","responseTime":"2026-06-23T14:45:00.000Z","painBefore":8,"painAfter":4}',
          medicationLabelSnapshot: "Morphine 2 mg IV",
          administeredAt: "2026-06-23T14:00:00.000Z",
        },
        {
          id: "admin-2",
          notes: "",
          medicationLabelSnapshot: "Ketorolac 15 mg IV",
          administeredAt: "2026-06-23T16:10:00.000Z",
        },
      ],
      readMedicationLabel: (admin) => String(admin.medicationLabelSnapshot ?? ""),
      readDose: () => "",
      readRoute: () => "",
      readAdministeredAt: (admin) => String(admin.administeredAt ?? ""),
      readFollowUpType: (admin) =>
        resolveMedicationFollowUpType({ medicationLabel: String(admin.medicationLabelSnapshot ?? "") }),
    });

    expect(rows.map((row) => row.kind)).toEqual(["ADMINISTRATION", "FOLLOW_UP", "ADMINISTRATION"]);
    const painResponseRow = rows.find((row) => row.kind === "FOLLOW_UP");
    expect(painResponseRow?.followUpType).toBe("PAIN");
    expect(painResponseRow?.medicationName).toBe("Morphine 2 mg IV");
  });
});

describe("resolveMedicationAdministrationLifecycleState", () => {
  it("maps verified and due states", () => {
    expect(
      resolveMedicationAdministrationLifecycleState({
        followUpType: "NONE",
        pharmacyVerified: true,
        doseStatus: "DUE",
      })
    ).toBe("DUE");
    expect(
      resolveMedicationAdministrationLifecycleState({
        followUpType: "NONE",
        pharmacyVerified: false,
      })
    ).toBe("ORDERED");
  });
});
