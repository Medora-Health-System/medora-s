import { describe, expect, it } from "vitest";
import {
  formatCarePlanClinicianAttribution,
  projectEncounterCarePlanMedicalRecord,
} from "./encounterCarePlanMedicalRecordProjectionCp1b.js";

describe("projectEncounterCarePlanMedicalRecord (MEDUI.CP.1B / CP.1E)", () => {
  it("buckets active vs completed and projects attribution from durable snapshots", () => {
    const projection = projectEncounterCarePlanMedicalRecord({
      plans: [
        {
          id: "plan-active",
          title: "enterpriseInterdisciplinaryCarePlansD4b6.templates.fallRisk.title",
          templateId: "fall_risk",
          status: "ACTIVE",
          activatedAt: "2026-08-24T12:00:00.000Z",
          activatedByUserId: "u-a",
          activatedByDisplayNameSnapshot: "Elizabeth Posada",
          activatedByProfessionalTitleSnapshot: "RN",
          components: [
            {
              componentType: "GOAL",
              title: "No fall with injury",
              text: "Patient remains free from falls.",
              discipline: "NURSING",
              status: "IN_PROGRESS",
              createdAt: "2026-08-24T12:01:00.000Z",
              createdByDisplayNameSnapshot: "Elizabeth Posada",
              createdByProfessionalTitleSnapshot: "RN",
            },
            {
              componentType: "INTERVENTION",
              title: "Assist with ambulation",
              text: "Assist with ambulation and maintain fall precautions.",
              discipline: "NURSING",
              status: "IN_PROGRESS",
              createdAt: "2026-08-24T12:02:00.000Z",
              createdByDisplayNameSnapshot: "Elizabeth Posada",
              createdByProfessionalTitleSnapshot: "RN",
              correctedByDisplayNameSnapshot: "Elizabeth Posada",
              correctedByProfessionalTitleSnapshot: "RN",
              correctedAt: "2026-08-24T13:00:00.000Z",
              correctionReason: "Clarify assist level",
            },
            {
              componentType: "INTERVENTION",
              title: "Reassess fall risk",
              text: "Reassess fall risk each shift.",
              discipline: "NURSING",
              monitoringJson: { source: "monitor_1" },
              createdAt: "2026-08-24T12:03:00.000Z",
              createdByDisplayNameSnapshot: "Elizabeth Posada",
              createdByProfessionalTitleSnapshot: "RN",
            },
            {
              componentType: "INTERVENTION",
              title: "Call before rising",
              text: "Teach patient to call before rising.",
              discipline: "NURSING",
              educationJson: { source: "edu_1" },
              createdAt: "2026-08-24T12:04:00.000Z",
              createdByDisplayNameSnapshot: "Elizabeth Posada",
              createdByProfessionalTitleSnapshot: "RN",
            },
          ],
          progress: [
            {
              narrative: "Ambulated with assistance. No fall.",
              status: "IN_PROGRESS",
              discipline: "NURSING",
              authorRoleSnapshot: "RN",
              authorDisplayNameSnapshot: "Elizabeth Posada",
              authorProfessionalTitleSnapshot: "RN",
              createdAt: "2026-08-24T14:00:00.000Z",
            },
            {
              narrative: "Call light within reach.",
              status: "IN_PROGRESS",
              discipline: "NURSING",
              authorRoleSnapshot: "RN",
              authorDisplayNameSnapshot: "Marie Claire",
              authorProfessionalTitleSnapshot: "RN",
              createdAt: "2026-08-24T16:00:00.000Z",
            },
          ],
          reviews: [
            {
              reviewStatus: "CONTINUE",
              narrative: "Goals remain appropriate.",
              reviewerRoleSnapshot: "PROVIDER",
              reviewerDisplayNameSnapshot: "Rajnil Shah",
              reviewerProfessionalTitleSnapshot: "MD",
              createdAt: "2026-08-24T18:00:00.000Z",
            },
          ],
          transitions: [
            {
              fromStatus: "DRAFT",
              toStatus: "ACTIVE",
              actorRoleSnapshot: "RN",
              actorDisplayNameSnapshot: "Elizabeth Posada",
              actorProfessionalTitleSnapshot: "RN",
              createdAt: "2026-08-24T12:00:00.000Z",
            },
          ],
        },
        {
          id: "plan-done",
          title: "Completed plan",
          status: "COMPLETED",
          activatedAt: "2026-08-20T10:00:00.000Z",
          completedAt: "2026-08-22T10:00:00.000Z",
          activatedByDisplayNameSnapshot: "A Nurse",
          activatedByProfessionalTitleSnapshot: "RN",
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
    expect(active.activatedBy.credentials).toBe("RN");
    expect(active.goals).toHaveLength(1);
    expect(active.interventions.some((i) => i.title.includes("ambulation"))).toBe(true);
    expect(active.interventions.find((i) => i.title.includes("ambulation"))!.correctedBy?.displayName).toBe(
      "Elizabeth Posada"
    );
    expect(active.monitoring).toHaveLength(1);
    expect(active.education).toHaveLength(1);
    expect(active.progress).toHaveLength(2);
    expect(active.progress[0]!.documentedBy.displayName).toBe("Elizabeth Posada");
    expect(active.progress[1]!.documentedBy.displayName).toBe("Marie Claire");
    expect(active.reviews[0]!.reviewedBy.displayName).toBe("Rajnil Shah");
    expect(active.reviews[0]!.reviewedBy.credentials).toBe("MD");
    expect(active.contributors).toContain("NURSING");
    expect(JSON.stringify(active)).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
  });

  it("does not rewrite historical attribution from live User joins when snapshots are null", () => {
    const projection = projectEncounterCarePlanMedicalRecord({
      plans: [
        {
          id: "legacy-plan",
          title: "Old plan",
          status: "ACTIVE",
          activatedAt: "2026-01-01T00:00:00.000Z",
          activatedByUserId: "u-legacy",
          components: [
            {
              componentType: "GOAL",
              title: "Goal",
              text: "Text",
              createdAt: "2026-01-01T00:00:00.000Z",
              createdByUserId: "u-legacy",
            },
          ],
          progress: [],
          reviews: [],
          transitions: [],
        },
      ],
    });
    const plan = projection.currentPlans[0]!;
    expect(plan.activatedBy.attributionUnavailable).toBe(true);
    expect(plan.activatedBy.displayName).toBeNull();
    expect(plan.goals[0]!.documentedBy.attributionUnavailable).toBe(true);
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

  it("formats historical attribution unavailable without inventing a name", () => {
    const line = formatCarePlanClinicianAttribution({
      documentedByLabel: "Documented by",
      reviewedByLabel: "Reviewed by",
      clinician: {
        displayName: null,
        credentials: null,
        roleSnapshot: "RN",
        attributionUnavailable: true,
      },
      at: "Jan 1, 2026",
      mode: "documented",
      attributionUnavailableLabel: "Author attribution unavailable for this historical entry",
    });
    expect(line).toContain("Author attribution unavailable");
    expect(line).not.toContain("Documented by");
  });

  it("returns EMPTY when no plans or legacy", () => {
    expect(projectEncounterCarePlanMedicalRecord({ plans: [], legacyItems: [] }).availability).toBe(
      "EMPTY"
    );
  });
});
