import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  INFUSION_START_MAR_NOTE_PREFIX,
  isMarUniversalClinicalTimeCorrectionEligible,
  resolveMarUniversalClinicalTimeCorrectionEventType,
  type MarUniversalClinicalTimeCorrectionContext,
} from "@medora/shared";
import { buildMarClinicalCorrectionMenu } from "./marClinicalCorrectionWorkflow";

const apiSrc = readFileSync(
  join(process.cwd(), "../api/src/medication-administration/medication-administration.service.ts"),
  "utf8"
);

describe("marUniversalClinicalTimeCorrectionCertification (H9F.1)", () => {
  const correctionMatrix: Array<{
    label: string;
    ctx: MarUniversalClinicalTimeCorrectionContext;
    expectedType: string;
  }> = [
    { label: "Administered", ctx: { marActionResolved: "administered" }, expectedType: "ADMINISTER" },
    {
      label: "PRN administered",
      ctx: { marActionResolved: "administered", isPrn: true },
      expectedType: "PRN_ADMINISTER",
    },
    { label: "Refused", ctx: { marActionResolved: "refused" }, expectedType: "REFUSE" },
    {
      label: "Held",
      ctx: { marActionResolved: "md_changed", notes: "Held: PROVIDER_ORDER" },
      expectedType: "HOLD",
    },
    {
      label: "Missed",
      ctx: { marActionResolved: "not_available", notes: "Missed: PATIENT_UNAVAILABLE" },
      expectedType: "MISSED",
    },
    {
      label: "Not available",
      ctx: { marActionResolved: "not_available", notes: "Not available: MEDICATION_UNAVAILABLE" },
      expectedType: "NOT_AVAILABLE",
    },
    {
      label: "MD changed",
      ctx: { marActionResolved: "md_changed", notes: "Changed by physician" },
      expectedType: "MD_CHANGED",
    },
    {
      label: "IVPB start",
      ctx: {
        marActionResolved: "administered",
        infusionPhase: "INFUSION_START",
        doseKind: "IVPB_SESSION",
      },
      expectedType: "IVPB_START",
    },
    {
      label: "IVPB stop",
      ctx: {
        marActionResolved: "administered",
        infusionPhase: "INFUSION_STOP",
        doseKind: "IVPB_SESSION",
      },
      expectedType: "IVPB_STOP",
    },
    {
      label: "Infusion start",
      ctx: {
        marActionResolved: "administered",
        notes: `${INFUSION_START_MAR_NOTE_PREFIX} (14:00)`,
        isContinuousFluid: true,
      },
      expectedType: "INFUSION_START",
    },
    {
      label: "Infusion stop",
      ctx: {
        marActionResolved: "administered",
        infusionPhase: "INFUSION_STOP",
        isContinuousFluid: true,
      },
      expectedType: "INFUSION_STOP",
    },
    {
      label: "Bolus start",
      ctx: {
        marActionResolved: "administered",
        infusionPhase: "INFUSION_START",
        isFluidBolus: true,
      },
      expectedType: "BOLUS_START",
    },
    {
      label: "Bolus complete",
      ctx: {
        marActionResolved: "administered",
        infusionPhase: "INFUSION_STOP",
        isFluidBolus: true,
      },
      expectedType: "BOLUS_COMPLETE",
    },
  ];

  it.each(correctionMatrix)("$label — eligible for append-only TIME correction", ({ ctx, expectedType }) => {
    expect(resolveMarUniversalClinicalTimeCorrectionEventType(ctx)).toBe(expectedType);
    expect(isMarUniversalClinicalTimeCorrectionEligible(ctx)).toBe(true);
    const menu = buildMarClinicalCorrectionMenu({
      encounterOpen: true,
      canAdjust: true,
      marActionResolved: ctx.marActionResolved ?? "administered",
      notes: ctx.notes ?? null,
      infusionPhase: ctx.infusionPhase ?? null,
      readOnly: false,
    });
    const timeAction = menu.items.find(
      (i): i is Extract<typeof i, { kind: "action" }> => i.kind === "action" && i.type === "TIME"
    );
    expect(timeAction?.enabled).toBe(true);
  });

  it("append-only correction — original row preserved, no delete path", () => {
    expect(apiSrc).toContain("medicationAdministrationCorrection.create");
    expect(apiSrc).toContain("effectiveAdministeredAtVersion: { increment: 1 }");
    expect(apiSrc).not.toContain("medicationAdministration.delete");
    expect(apiSrc).toContain("isMarUniversalClinicalTimeCorrectionEligible");
  });

  it("destructive reassignment corrections remain blocked", () => {
    const menu = buildMarClinicalCorrectionMenu({
      encounterOpen: true,
      canAdjust: true,
      marActionResolved: "administered",
      readOnly: false,
    });
    expect(menu.items.some((i) => i.kind === "blocked" && i.type === "WRONG_PATIENT")).toBe(true);
    expect(menu.items.some((i) => i.kind === "blocked" && i.type === "CHANGE_MEDICATION")).toBe(true);
    expect(menu.items.some((i) => i.kind === "blocked" && i.type === "CHANGE_PERFORMER")).toBe(true);
  });
});
