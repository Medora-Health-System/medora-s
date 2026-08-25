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
          activatedBy: { firstName: "Elizabeth", lastName: "Posada" },
          components: [
            {
              componentType: "GOAL",
              title: "No fall",
              text: "Remain free from falls.",
              createdBy: { firstName: "Elizabeth", lastName: "Posada" },
              createdAt: "2026-08-24T12:01:00.000Z",
            },
            {
              componentType: "INTERVENTION",
              title: "Ambulation",
              text: "Assist with ambulation.",
              discipline: "NURSING",
              createdBy: { firstName: "Elizabeth", lastName: "Posada" },
              createdAt: "2026-08-24T12:02:00.000Z",
            },
          ],
          progress: [
            {
              narrative: "No fall event.",
              authorRoleSnapshot: "RN",
              author: { firstName: "Marie", lastName: "Claire" },
              createdAt: "2026-08-24T14:00:00.000Z",
            },
          ],
          reviews: [
            {
              narrative: "Continue precautions.",
              reviewerRoleSnapshot: "PROVIDER",
              reviewer: { firstName: "Rajnil", lastName: "Shah" },
              createdAt: "2026-08-24T15:00:00.000Z",
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
    expect(html).not.toMatch(/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/);
    expect(html).not.toMatch(/D4B|D3E|Legacy D3E|expectedRevision|createdByUserId/);
    expect(html).not.toMatch(/\{\s*"/);
  });
});
