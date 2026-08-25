import { describe, expect, it } from "vitest";
import { projectEncounterCarePlanMedicalRecord } from "@medora/shared";
import { buildCarePlanMedicalRecordPrintHtml } from "./carePlanMedicalRecordProjectionCp1b";

describe("carePlanMedicalRecordProjectionCp1b UI helpers", () => {
  it("builds print HTML without UUIDs, JSON, or D4B/D3E chrome", () => {
    const projection = projectEncounterCarePlanMedicalRecord({
      plans: [
        {
          id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
          title: "Fall risk",
          status: "ACTIVE",
          activatedAt: "2026-08-24T12:00:00.000Z",
          activatedByDisplayNameSnapshot: "Elizabeth Posada",
          activatedByProfessionalTitleSnapshot: "RN",
          components: [
            {
              componentType: "GOAL",
              title: "No fall",
              text: "Remain free from falls.",
              createdByDisplayNameSnapshot: "Elizabeth Posada",
              createdByProfessionalTitleSnapshot: "RN",
              createdAt: "2026-08-24T12:01:00.000Z",
            },
            {
              componentType: "INTERVENTION",
              title: "Ambulation",
              text: "Assist with ambulation.",
              discipline: "NURSING",
              createdByDisplayNameSnapshot: "Elizabeth Posada",
              createdByProfessionalTitleSnapshot: "RN",
              createdAt: "2026-08-24T12:02:00.000Z",
            },
          ],
          progress: [
            {
              narrative: "No fall event.",
              authorRoleSnapshot: "RN",
              authorDisplayNameSnapshot: "Marie Claire",
              authorProfessionalTitleSnapshot: "RN",
              createdAt: "2026-08-24T14:00:00.000Z",
            },
          ],
          reviews: [
            {
              narrative: "Continue precautions.",
              reviewerRoleSnapshot: "PROVIDER",
              reviewerDisplayNameSnapshot: "Rajnil Shah",
              reviewerProfessionalTitleSnapshot: "MD",
              createdAt: "2026-08-24T15:00:00.000Z",
            },
          ],
          transitions: [
            {
              fromStatus: "DRAFT",
              toStatus: "ACTIVE",
              actorDisplayNameSnapshot: "Elizabeth Posada",
              actorProfessionalTitleSnapshot: "RN",
              actorRoleSnapshot: "RN",
              createdAt: "2026-08-24T12:00:00.000Z",
            },
          ],
        },
      ],
    });

    const html = buildCarePlanMedicalRecordPrintHtml({
      projection,
      t: (key) => key.split(".").pop() ?? key,
      formatDateTime: (iso) => iso ?? "",
      emptyLabel: "empty",
    });

    expect(html).toContain("Fall risk");
    expect(html).toContain("Remain free from falls.");
    expect(html).toContain("Assist with ambulation.");
    expect(html).toContain("No fall event.");
    expect(html).toContain("Continue precautions.");
    expect(html).toContain("Elizabeth Posada");
    expect(html).toContain("Marie Claire");
    expect(html).not.toMatch(/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/);
    expect(html).not.toMatch(/D4B|D3E|Legacy D3E|expectedRevision|createdByUserId/);
    expect(html).not.toMatch(/\{\s*"/);
  });
});
