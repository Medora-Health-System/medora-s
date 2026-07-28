/**
 * MEDUI.D4C.7F — web source guards for encounter transition, closure override,
 * navigation icons, and Pharmacy access.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CLINIC_ENCOUNTER_TRANSITION_CLOSURE_PHARMACY_NAV_CERTIFICATION_ID,
  D4C7F_ENCOUNTER_PENDING_ITEMS_CODE,
  D4C7F_FORBIDDEN_CLINIC_AUTHORITY_NAMES,
  assertNoForbiddenClinicD4c7fAuthority,
  resolveSidebarNavIconPathname,
} from "@medora/shared";

const clinicCareDir = join(__dirname);
const webSrcDir = join(__dirname, "../..");

function readClinic(name: string): string {
  return readFileSync(join(clinicCareDir, name), "utf8");
}

function readSrc(rel: string): string {
  return readFileSync(join(webSrcDir, rel), "utf8");
}

describe("MEDUI.D4C.7F web guards (transition / closure / icons / pharmacy)", () => {
  it("certification id + forbidden Clinic* authorities absent from workspace", () => {
    expect(CLINIC_ENCOUNTER_TRANSITION_CLOSURE_PHARMACY_NAV_CERTIFICATION_ID).toBe("MEDUI.D4C.7F");
    const view = readClinic("ClinicCareActiveAmbulatoryWorkspaceView.tsx");
    expect(assertNoForbiddenClinicD4c7fAuthority(view)).toBe(true);
    for (const name of D4C7F_FORBIDDEN_CLINIC_AUTHORITY_NAMES) {
      expect(view.includes(name)).toBe(false);
    }
  });

  it("B — ambulatory closure uses pending modal (no silent disposition ack)", () => {
    const view = readClinic("ClinicCareActiveAmbulatoryWorkspaceView.tsx");
    expect(view).toContain("ClinicCareAmbulatoryClosurePendingModal");
    expect(view).toContain("acknowledgePendingItems");
    expect(view).toContain("D4C7F_ENCOUNTER_PENDING_ITEMS_CODE");
    expect(view).not.toMatch(/acknowledgeDispositionSafety:\s*needsSafetyAck/);
    expect(D4C7F_ENCOUNTER_PENDING_ITEMS_CODE).toBe("ENCOUNTER_PENDING_ITEMS");
  });

  it("E — instant button pending labels + duplicate-click guard", () => {
    const view = readClinic("ClinicCareActiveAmbulatoryWorkspaceView.tsx");
    expect(view).toContain("ambulatoryWorkflowPendingLabelKey");
    expect(view).toContain("if (workflowBusy) return");
    expect(view).toContain("disabled={Boolean(workflowBusy)");
    expect(view).toContain("invalidateClinicCareAmbulatoryLifecycleCache");
  });

  it("I — sidebar icons pathname-normalized (clinic-care + query)", () => {
    const icons = readSrc("components/app-shell/SidebarNavIcons.tsx");
    expect(icons).toContain("resolveSidebarNavIconPathname");
    expect(resolveSidebarNavIconPathname("/app/clinic-care/nursing")).toBe("/app/nursing");
    expect(
      resolveSidebarNavIconPathname("/app/lab-worklist?source=clinic-care&ambulatory=1")
    ).toBe("/app/lab-worklist");
  });

  it("J — pharmacy sidebar rewrite uses D4C.7F full path helper", () => {
    const nav = readSrc("features/navigation/navigationVisibility.ts");
    expect(nav).toContain("resolveClinicCareAwarePharmacySidebarHref");
  });

  it("error serialization maps blocker objects (no [object Object])", () => {
    const client = readSrc("lib/apiClient.ts");
    expect(client).toContain("formatBlocker");
    expect(client).toContain("o.message");
  });
});
