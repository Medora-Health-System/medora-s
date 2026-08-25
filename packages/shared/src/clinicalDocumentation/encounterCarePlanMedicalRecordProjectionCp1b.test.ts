import { describe, expect, it } from "vitest";
import {
  formatCarePlanClinicianAttribution,
  projectEncounterCarePlanMedicalRecord,
} from "./encounterCarePlanMedicalRecordProjectionCp1b.js";

describe("projectEncounterCarePlanMedicalRecord (MEDUI.CP.1B)", () => {
  it("buckets active vs completed and projects goals/interventions/progress/reviews with attribution", () => {
    const projection = projectEncounterCarePlanMedicalRecord({
      plans: [
        {
          id: "plan-active",
          title: "enterpriseInterdisciplinaryCarePlansD4b6.templates.fallRisk.title",
          templateId: "fall_risk",
          status: "ACTIVE",
          activatedAt: "2026-08-24T12:00:00.000Z",
          activatedByUserId: "u-a",
          activatedBy: { firstName: "Elizabeth", lastName: "Posada" },
          components: [
            {
              componentType: "GOAL",
              title: "No fall with injury",
              text: "Patient remains free from falls.",
              discipline: "NURSING",
              status: "IN_PROGRESS",
              createdAt: "2026-08-24T12:01:00.000Z",
              createdBy: { firstName: "Elizabeth", lastName: "Posada" },
            },
            {
              componentType: "INTERVENTION",
              title: "Assist with ambulation",
              text: "Assist with ambulation and maintain fall precautions.",
              discipline: "NURSING",
              status: "IN_PROGRESS",
              createdAt: "2026-08-24T12:02:00.000Z",
              createdBy: { firstName: "Elizabeth", lastName: "Posada" },
            },
            {
              componentType: "INTERVENTION",
              title: "Reassess fall risk",
              text: "Reassess fall risk each shift.",
              discipline: "NURSING",
              monitoringJson: { source: "monitor_1" },
              createdAt: "2026-08-24T12:03:00.000Z",
              createdBy: { firstName: "Elizabeth", lastName: "Posada" },
            },
            {
              componentType: "INTERVENTION",
              title: "Call before rising",
              text: "Teach patient to call before rising.",
              discipline: "NURSING",
              educationJson: { source: "edu_1" },
              createdAt: "2026-08-24T12:04:00.000Z",
              createdBy: { firstName: "Elizabeth", lastName: "Posada" },
            },
          ],
          progress: [
            {
              narrative: "Ambulated with assistance. No fall.",
              status: "IN_PROGRESS",
              discipline: "NURSING",
              authorRoleSnapshot: "RN",
              createdAt: "2026-08-24T14:00:00.000Z",
              author: { firstName: "Elizabeth", lastName: "Posada" },
            },
            {
              narrative: "Call light within reach.",
              status: "IN_PROGRESS",
              discipline: "NURSING",
              authorRoleSnapshot: "RN",
              createdAt: "2026-08-24T16:00:00.000Z",
              author: { firstName: "Marie", lastName: "Claire" },
            },
          ],
          reviews: [
            {
              reviewStatus: "CONTINUE",
              narrative: "Goals remain appropriate.",
              reviewerRoleSnapshot: "PROVIDER",
              createdAt: "2026-08-24T18:00:00.000Z",
              reviewer: { firstName: "Rajnil", lastName: "Shah" },
            },
          ],
          transitions: [
            {
              fromStatus: "DRAFT",
              toStatus: "ACTIVE",
              actorRoleSnapshot: "RN",
              createdAt: "2026-08-24T12:00:00.000Z",
              actor: { firstName: "Elizabeth", lastName: "Posada" },
            },
          ],
        },
        {
          id: "plan-done",
          title: "Completed plan",
          status: "COMPLETED",
          activatedAt: "2026-08-20T10:00:00.000Z",
          completedAt: "2026-08-22T10:00:00.000Z",
          activatedBy: { firstName: "A", lastName: "Nurse" },
          components: [],
          progress: [],
          reviews: [],
          transitions: [],
        },
      ],
      legacyItems: [{ discipline: "NURSING", goalText: "Old ops note", createdAt: "2026-01-01T00:00:00.000Z" }],
    });

    expect(projection.availability).toBe("READY");
    expect(projection.currentPlans).toHaveLength(1);
    expect(projection.completedDiscontinuedPlans).toHaveLength(1);
    expect(projection.historicalLegacy).toHaveLength(1);

    const active = projection.currentPlans[0]!;
    expect(active.activatedBy.displayName).toBe("Elizabeth Posada");
    expect(active.goals).toHaveLength(1);
    expect(active.interventions.some((i) => i.title.includes("ambulation"))).toBe(true);
    expect(active.monitoring).toHaveLength(1);
    expect(active.education).toHaveLength(1);
    expect(active.progress).toHaveLength(2);
    expect(active.progress[0]!.documentedBy.displayName).toBe("Elizabeth Posada");
    expect(active.progress[1]!.documentedBy.displayName).toBe("Marie Claire");
    expect(active.reviews[0]!.reviewedBy.displayName).toBe("Rajnil Shah");
    expect(active.contributors).toContain("NURSING");
    expect(JSON.stringify(active)).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
  });

  it("formats clinician attribution without UUIDs", () => {
    const line = formatCarePlanClinicianAttribution({
      documentedByLabel: "Documented by",
      reviewedByLabel: "Reviewed by",
      clinician: { displayName: "Elizabeth Posada", credentials: "RN", roleSnapshot: "RN" },
      at: "Aug 24, 2026 · 10:14 AM",
      mode: "documented",
    });
    expect(line).toContain("Documented by Elizabeth Posada, RN");
    expect(line).toContain("Aug 24, 2026");
    expect(line).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
  });

  it("returns EMPTY when no plans or legacy", () => {
    expect(projectEncounterCarePlanMedicalRecord({ plans: [], legacyItems: [] }).availability).toBe(
      "EMPTY"
    );
  });
});
