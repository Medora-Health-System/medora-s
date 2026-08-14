import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { projectEncounterListLifecycle, projectPatientEncounterIndexRow } from "./encounterListProjection";

describe("MEDUI.D4C.8.1 closed encounter navigation and lock projection", () => {
  it("derives CLOSED only from encounter.status, never dischargedAt", () => {
    expect(projectEncounterListLifecycle({ id: "closed", status: "CLOSED", closedAt: null }).isClosed).toBe(true);
    expect(
      projectEncounterListLifecycle({
        id: "discharged-open",
        status: "OPEN",
        closedAt: null,
        dischargedAt: "2026-08-08T10:00:00.000Z",
      } as Parameters<typeof projectEncounterListLifecycle>[0] & { dischargedAt: string }).isClosed
    ).toBe(false);
  });

  it("presents authoritative closedAt only for CLOSED encounters", () => {
    expect(
      projectEncounterListLifecycle({ id: "closed", status: "CLOSED", closedAt: "2026-08-08T10:00:00.000Z" }).closedAt
    ).toBe("2026-08-08T10:00:00.000Z");
    expect(
      projectEncounterListLifecycle({ id: "open", status: "OPEN", closedAt: "2026-08-08T10:00:00.000Z" }).closedAt
    ).toBeNull();
  });

  it("uses the single authoritative encounter route for closed encounters", () => {
    expect(projectEncounterListLifecycle({ id: "open-id", status: "OPEN" }).href).toBe("/app/encounters/open-id");
    expect(projectEncounterListLifecycle({ id: "closed-id", status: "CLOSED" }).href).toBe("/app/encounters/closed-id");
    expect(projectPatientEncounterIndexRow({ id: "closed-id", status: "CLOSED", type: "OUTPATIENT" }).href).toBe(
      "/app/encounters/closed-id"
    );
  });

  it("renders a persistent accessible lock independent of navigation permission", () => {
    const source = readFileSync(new URL("./PatientConsultationsTab.tsx", import.meta.url), "utf8");
    expect(source).toContain('aria-label={t("enterprisePatientMedicalRecordD4c8c.encounters.closedAria")}');
    expect(source).toContain("{indexRow.showClosedLock ? (");
    expect(source.indexOf("{indexRow.showClosedLock ? (")).toBeLessThan(
      source.indexOf("{canOpenEncounterDetail ? (")
    );
  });

  it("preserves closed enterprise route and introduces no parallel record route", () => {
    const source = readFileSync(new URL("./PatientConsultationsTab.tsx", import.meta.url), "utf8");
    expect(source).toContain("href={indexRow.href}");
    expect(source).not.toContain("/closed-chart");
    expect(source).not.toMatch(/["'`]\/record(?:[\/"'`?]|$)/);
  });
});
