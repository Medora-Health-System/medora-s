/**
 * MEDUI.D4C.7C — web source guards: Clinic lab/rad → enterprise worklists,
 * ambulatory filter, AMBULATORY badge, no Clinic* engines.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SIDEBAR_NAV_ITEMS } from "@/components/app-shell/sidebarNavConfig";
import { filterSidebarNavItemsForSession } from "@/features/navigation/navigationVisibility";
import {
  buildClinicLaboratoryEntryHref,
  buildClinicRadiologyEntryHref,
  CLINIC_CARE_LABORATORY_RADIOLOGY_RESULTS_CORRECTION_CERTIFICATION_ID,
  D4C7C_FORBIDDEN_CLINIC_AUTHORITY_NAMES,
} from "@medora/shared";

const featureDir = __dirname;
const root = join(featureDir, "../../..");
const appRoot = join(root, "app/app");

function readApp(rel: string): string {
  return readFileSync(join(appRoot, rel), "utf8");
}

function readWeb(rel: string): string {
  return readFileSync(join(root, "src", rel), "utf8");
}

const enMessages = readFileSync(join(root, "src/i18n/messages/en.ts"), "utf8");
const frMessages = readFileSync(join(root, "src/i18n/messages/fr.ts"), "utf8");

const clinicLabProfile = {
  roleCodes: ["LAB"] as string[],
  facilityType: "CLINIC",
  facilityServiceLines: ["CLINIC", "LABORATORY", "RADIOLOGY"] as string[],
};

describe("MEDUI.D4C.7C clinic laboratory + radiology results correction (web)", () => {
  it("A — certification + clinic lab/rad aliases use enterprise entry hrefs", () => {
    expect(CLINIC_CARE_LABORATORY_RADIOLOGY_RESULTS_CORRECTION_CERTIFICATION_ID).toBe(
      "MEDUI.D4C.7C"
    );
    expect(readApp("clinic-care/laboratory/page.tsx")).toContain("buildClinicLaboratoryEntryHref");
    expect(readApp("clinic-care/radiology/page.tsx")).toContain("buildClinicRadiologyEntryHref");
    expect(readApp("clinic-care/laboratory/page.tsx")).not.toContain("ClinicLaboratoryOrder");
    expect(readApp("clinic-care/radiology/page.tsx")).not.toContain("ClinicRadiologyOrder");
  });

  it("B — forbidden Clinic* authority names documented; no duplicate engines in pages", () => {
    expect(D4C7C_FORBIDDEN_CLINIC_AUTHORITY_NAMES).toContain("ClinicDiagnosticWorklist");
    expect(D4C7C_FORBIDDEN_CLINIC_AUTHORITY_NAMES).toContain("ClinicResultAcknowledgement");
    const lab = readApp("lab-worklist/page.tsx");
    const rad = readApp("rad-worklist/page.tsx");
    expect(lab).toContain("filterAmbulatoryLabRadWorklistOrders");
    expect(rad).toContain("filterAmbulatoryLabRadWorklistOrders");
    expect(lab).not.toContain("ClinicLaboratoryOrder");
    expect(rad).not.toContain("ClinicRadiologyOrder");
  });

  it("C — LAB/RN/PROVIDER/ADMIN see Liste laboratoire; Front Desk does not", () => {
    for (const role of ["LAB", "RN", "PROVIDER", "ADMIN"] as const) {
      const filtered = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
        roleCodes: [role],
        profile: {
          ...clinicLabProfile,
          roleCodes: [role],
        },
      });
      expect(filtered.some((i) => i.href.includes("/app/lab-worklist"))).toBe(true);
    }
    const front = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["FRONT_DESK"],
      profile: {
        roleCodes: ["FRONT_DESK"],
        facilityType: "CLINIC",
        facilityServiceLines: ["CLINIC", "LABORATORY"],
      },
    });
    expect(front.some((i) => i.href.includes("/app/lab-worklist"))).toBe(false);
  });

  it("D — Clinic Care sidebar rewrites lab/rad to ambulatory source hrefs", () => {
    const admin = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["ADMIN"],
      profile: {
        roleCodes: ["ADMIN"],
        facilityType: "CLINIC",
        facilityServiceLines: ["CLINIC", "LABORATORY", "RADIOLOGY"],
      },
    });
    const labHref = admin.find((i) => i.href.includes("/app/lab-worklist"))?.href ?? "";
    const radHref = admin.find((i) => i.href.includes("/app/rad-worklist"))?.href ?? "";
    expect(labHref).toBe(buildClinicLaboratoryEntryHref());
    expect(radHref).toBe(buildClinicRadiologyEntryHref());
  });

  it("E — AMBULATORY badge + French ambulatory context key present", () => {
    expect(readApp("lab-worklist/page.tsx")).toContain('=== "AMBULATORY"');
    expect(readApp("rad-worklist/page.tsx")).toContain('=== "AMBULATORY"');
    expect(frMessages).toContain("ambulatory: \"Ambulatoire\"");
    expect(enMessages).toContain("ambulatory: \"Ambulatory\"");
    expect(frMessages).toContain("clinicCareD4c7c");
    expect(enMessages).toContain("clinicCareD4c7c");
  });

  it("F — navigationVisibility composes D4C.7C lab/rad sidebar rewrite", () => {
    const src = readWeb("features/navigation/navigationVisibility.ts");
    expect(src).toContain("resolveClinicCareLabRadSidebarHref");
    expect(src).toContain("resolveClinicCareAwareSidebarHref");
  });

  it("G — French status labels include PLACED/SIGNED (no raw-only reliance)", () => {
    expect(frMessages).toMatch(/orderItemStatus:[\s\S]*PLACED:\s*"Transmise"/);
    expect(frMessages).toMatch(/orderItemStatus:[\s\S]*SIGNED:\s*"Signée"/);
    expect(frMessages).toMatch(/orderItemChart:[\s\S]*IN_PROGRESS:\s*"En cours"/);
  });

  it("H — landingRoute allows PROVIDER on lab-worklist (aligned with sidebar + API)", () => {
    const src = readWeb("lib/landingRoute.ts");
    expect(src).toMatch(
      /prefix:\s*"\/app\/lab-worklist",\s*roles:\s*\[[^\]]*PROVIDER/
    );
  });

  it("I — DepartmentOrderDetail still gates RN lab entry on facility policy", () => {
    const src = readWeb("components/worklists/DepartmentOrderDetail.tsx");
    expect(src).toContain("allowRnLabResultSubmission");
    expect(src).toContain("rnCanSubmitLabResult");
  });

  it("J — ClinicalResultViewer remains shared enterprise viewer", () => {
    expect(readWeb("components/clinical/ClinicalResultViewer.tsx")).toContain(
      "export function ClinicalResultViewer"
    );
    expect(readApp("lab-worklist/commande/[orderId]/page.tsx")).toContain(
      "DepartmentOrderDetail"
    );
  });

  it("K — nav group FR remains Laboratoire et imagerie; Liste laboratoire label", () => {
    expect(frMessages).toContain('examens: "Laboratoire et imagerie"');
    expect(readWeb("lib/uiLabels.ts")).toContain('labWorklist: "Liste laboratoire"');
  });
});
