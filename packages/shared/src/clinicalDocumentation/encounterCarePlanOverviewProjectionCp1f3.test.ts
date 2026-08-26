/**
 * MEDUI.CP.1F.3 — Care Plan overview / clinical-context projection tests.
 */

import { describe, expect, it } from "vitest";
import {
  carePlanOverviewContainsTemplateKeyLeak,
  projectEncounterCarePlanOverview,
} from "./encounterCarePlanOverviewProjectionCp1f3.js";

const KEY_TITLE =
  "enterpriseInterdisciplinaryCarePlansD4b6.templates.fallRisk.title";
const KEY_GOAL =
  "enterpriseInterdisciplinaryCarePlansD4b6.templates.fallRisk.goalBody";

describe("MEDUI.CP.1F.3 Care Plan overview projection", () => {
  it("resolves legacy template keys to clinician-readable EN overview lines", () => {
    const lines = projectEncounterCarePlanOverview({
      displayLocale: "en",
      plans: [
        {
          id: "plan-1",
          title: KEY_TITLE,
          status: "ACTIVE",
          templateId: "fall_risk",
          activatedAt: "2026-08-26T12:00:00.000Z",
          components: [
            {
              componentType: "GOAL",
              title: KEY_GOAL,
              text: KEY_GOAL,
              status: "NOT_STARTED",
            },
          ],
        },
      ],
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]?.title).toBe("Fall risk");
    expect(lines[0]?.goalSummary).toContain("fall");
    expect(carePlanOverviewContainsTemplateKeyLeak(JSON.stringify(lines))).toBe(false);
  });

  it("preserves persisted French narrative without retranslation on EN display", () => {
    const frNarrative = "Le patient restera sans chute avec blessure pendant le séjour.";
    const lines = projectEncounterCarePlanOverview({
      displayLocale: "en",
      plans: [
        {
          id: "plan-fr",
          title: "Risque de chute",
          status: "ACTIVE",
          components: [
            {
              componentType: "GOAL",
              title: "Objectif",
              text: frNarrative,
            },
          ],
        },
      ],
    });
    expect(lines[0]?.goalSummary).toBe(frNarrative);
  });

  it("prefers current active plans over completed in sort order", () => {
    const lines = projectEncounterCarePlanOverview({
      displayLocale: "en",
      plans: [
        {
          id: "done",
          title: "Completed plan",
          status: "COMPLETED",
          activatedAt: "2026-08-25T12:00:00.000Z",
          components: [],
        },
        {
          id: "active",
          title: "Active plan",
          status: "ACTIVE",
          activatedAt: "2026-08-24T12:00:00.000Z",
          components: [],
        },
      ],
    });
    expect(lines[0]?.planId).toBe("active");
  });
});
