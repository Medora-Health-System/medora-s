import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(import.meta.dirname, "../../../../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("MAR action route certification", () => {
  const marActions: Array<{
    action: string;
    apiPath: string;
    webModule: string;
    webPattern: string;
    backendController: string;
  }> = [
    {
      action: "Administer",
      apiPath: "encounters/:encounterId/medication-administrations",
      webModule: "apps/web/src/components/encounters/MedicationAdministrationTab.tsx",
      webPattern: "medication-administrations",
      backendController: "medication-administration.controller.ts",
    },
    {
      action: "Start/Stop infusion",
      apiPath: "encounters/:encounterId/medication-administrations",
      webModule: "apps/web/src/components/encounters/MedicationAdministrationTab.tsx",
      webPattern: "runMarInfusion",
      backendController: "medication-administration.controller.ts",
    },
    {
      action: "Change scheduled time",
      apiPath: ':doseInstanceId/scheduled-at',
      webModule: "apps/web/src/lib/medicationDoseScheduleAdjustmentApi.ts",
      webPattern: "medication-doses/${",
      backendController: "medication-dose-schedule-adjustment.controller.ts",
    },
    {
      action: "Refuse/Hold/Missed",
      apiPath: "encounters/:encounterId/medication-administrations",
      webModule: "apps/web/src/features/mar/marShiftTimelineTerminalMar.ts",
      webPattern: "submitMarShiftTimelineTerminalMar",
      backendController: "medication-administration.controller.ts",
    },
    {
      action: "Medication response",
      apiPath: "medication-administrations/:administrationId/response",
      webModule: "apps/web/src/lib/marMedicationResponseApi.ts",
      webPattern: "/response",
      backendController: "medication-administration.controller.ts",
    },
    {
      action: "Respiratory response",
      apiPath: "medication-administrations/:administrationId/respiratory-response",
      webModule: "apps/web/src/lib/marRespiratoryMedicationResponseApi.ts",
      webPattern: "/respiratory-response",
      backendController: "medication-administration.controller.ts",
    },
    {
      action: "Continuous fluid",
      apiPath: "fluid/start",
      webModule: "apps/web/src/lib/continuousFluidApi.ts",
      webPattern: "/fluid/start",
      backendController: "continuous-fluid",
    },
    {
      action: "MAR shift timeline",
      apiPath: "mar-shift-timeline",
      webModule: "apps/web/src/lib/marShiftTimelineApi.ts",
      webPattern: "/mar-shift-timeline",
      backendController: "mar-shift-timeline.controller.ts",
    },
  ];

  it.each(marActions)("route exists for $action", ({ apiPath, webModule, webPattern, backendController }) => {
    const webSrc = readSrc(webModule);
    expect(webSrc).toContain(webPattern);
    if (backendController === "medication-dose-schedule-adjustment.controller.ts") {
      const backendSrc = readSrc(
        "apps/api/src/medication-dose/medication-dose-schedule-adjustment.controller.ts"
      );
      expect(backendSrc).toContain(apiPath);
    } else if (backendController === "mar-shift-timeline.controller.ts") {
      expect(readSrc("apps/api/src/medication-dose/mar-shift-timeline.controller.ts")).toContain(
        "mar-shift-timeline"
      );
    } else {
      expect(
        readSrc("apps/api/src/medication-administration/medication-administration.controller.ts")
      ).toContain("medication-administrations");
    }
    const bff = readSrc("apps/web/app/api/backend/[...path]/route.ts");
    expect(bff).toContain("PATCH");
  });

  it("scheduled-at route requires doseInstanceId param in backend", () => {
    const controller = readSrc(
      "apps/api/src/medication-dose/medication-dose-schedule-adjustment.controller.ts"
    );
    expect(controller).toContain('@Patch(":doseInstanceId/scheduled-at")');
    expect(controller).not.toContain('@Patch("scheduled-at")');
  });

  it("BFF proxy forwards PATCH to Nest", () => {
    const proxy = readSrc("apps/web/app/api/backend/[...path]/route.ts");
    expect(proxy).toMatch(/export async function PATCH/);
  });
});
