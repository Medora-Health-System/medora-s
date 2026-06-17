import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isMarUniversalClinicalTimeCorrectionEligible,
} from "@medora/shared";
import { buildMarClinicalCorrectionMenu } from "./marClinicalCorrectionWorkflow";

const apiSrc = readFileSync(
  join(
    process.cwd(),
    "../api/src/medication-administration/medication-administration.service.ts"
  ),
  "utf8"
);
const workflowSrc = readFileSync(
  join(process.cwd(), "src/features/mar/marClinicalCorrectionWorkflow.ts"),
  "utf8"
);

describe("marPostAdministrationTimeCorrection (H9F)", () => {
  it("24-27 — post-action TIME correction enabled for refused, held, missed, infusion", () => {
    expect(isMarUniversalClinicalTimeCorrectionEligible("refused")).toBe(true);
    expect(isMarUniversalClinicalTimeCorrectionEligible("not_available")).toBe(true);
    expect(isMarUniversalClinicalTimeCorrectionEligible("md_changed")).toBe(true);
    expect(isMarUniversalClinicalTimeCorrectionEligible("administered")).toBe(true);

    const refusedMenu = buildMarClinicalCorrectionMenu({
      encounterOpen: true,
      canAdjust: true,
      marActionResolved: "refused",
      readOnly: false,
    });
    const refusedTime = refusedMenu.items.find(
      (i): i is Extract<typeof i, { kind: "action" }> => i.kind === "action" && i.type === "TIME"
    );
    expect(refusedTime?.enabled).toBe(true);

    const heldMenu = buildMarClinicalCorrectionMenu({
      encounterOpen: true,
      canAdjust: true,
      marActionResolved: "md_changed",
      notes: "Held: PROVIDER_ORDER",
      readOnly: false,
    });
    const heldTime = heldMenu.items.find(
      (i): i is Extract<typeof i, { kind: "action" }> => i.kind === "action" && i.type === "TIME"
    );
    expect(heldTime?.enabled).toBe(true);
  });

  it("API allows effective time correction for universal eligible actions", () => {
    expect(apiSrc).toContain("isMarUniversalClinicalTimeCorrectionEligible");
    expect(workflowSrc).toContain("isMarUniversalClinicalTimeCorrectionEligible");
    expect(workflowSrc).toContain("timeCorrectionEligible");
  });

  it("31 — no correction regression for administered-only dose/route gates", () => {
    const menu = buildMarClinicalCorrectionMenu({
      encounterOpen: true,
      canAdjust: true,
      marActionResolved: "refused",
      readOnly: false,
    });
    const dose = menu.items.find(
      (i): i is Extract<typeof i, { kind: "action" }> => i.kind === "action" && i.type === "DOSE"
    );
    expect(dose?.enabled).toBe(false);
  });
});
