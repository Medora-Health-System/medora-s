/**
 * MEDUI.D4C.7D — web source guards for ambulatory lifecycle synchronization.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CLINIC_CARE_AMBULATORY_ENTERPRISE_CLOSE_TARGET,
  D4C7D_FORBIDDEN_CLINIC_AUTHORITY_NAMES,
  ENTERPRISE_AMBULATORY_ENCOUNTER_LIFECYCLE_SYNC_CERTIFICATION_ID,
  projectAmbulatoryLifecycleHeader,
  resolveClinicCareAmbulatoryWorkflowTarget,
} from "@medora/shared";

const clinicCareDir = join(__dirname);
const webLibDir = join(__dirname, "../../lib");

function readClinic(name: string): string {
  return readFileSync(join(clinicCareDir, name), "utf8");
}

function readLib(name: string): string {
  return readFileSync(join(webLibDir, name), "utf8");
}

describe("MEDUI.D4C.7D ambulatory lifecycle web guards", () => {
  it("A — certification + no forbidden Clinic* close authorities in workspace", () => {
    expect(ENTERPRISE_AMBULATORY_ENCOUNTER_LIFECYCLE_SYNC_CERTIFICATION_ID).toBe("MEDUI.D4C.7D");
    const view = readClinic("ClinicCareActiveAmbulatoryWorkspaceView.tsx");
    for (const name of D4C7D_FORBIDDEN_CLINIC_AUTHORITY_NAMES) {
      expect(view).not.toContain(name);
    }
    expect(view).toContain("closeAmbulatoryEncounterViaEnterprise");
    expect(view).toContain("invalidateClinicCareAmbulatoryLifecycleCache");
    expect(view).toContain("projectAmbulatoryLifecycleHeader");
  });

  it("B — COMPLETE_VISIT targets enterprise close sentinel", () => {
    expect(resolveClinicCareAmbulatoryWorkflowTarget("COMPLETE_VISIT", "DISCHARGE_READY")).toBe(
      CLINIC_CARE_AMBULATORY_ENTERPRISE_CLOSE_TARGET
    );
    expect(resolveClinicCareAmbulatoryWorkflowTarget("COMPLETE_VISIT", "FINALIZED")).toBe(
      CLINIC_CARE_AMBULATORY_ENTERPRISE_CLOSE_TARGET
    );
    const api = readLib("clinicalWorklistApi.ts");
    expect(api).toContain("/encounters/${encounterId}/close");
    expect(api).toContain("closeAmbulatoryEncounterViaEnterprise");
  });

  it("C — header uses lifecycle projection (no raw workflow enum as badge source)", () => {
    const header = readClinic("ClinicCareAmbulatoryPatientHeader.tsx");
    expect(header).toContain("statusLabel");
    expect(header).toContain("badgeText");
    const view = readClinic("ClinicCareActiveAmbulatoryWorkspaceView.tsx");
    expect(view).toContain("lifecycleHeader.badgeLabelKey");
    expect(view).toContain("lifecycleHeader.metaLabelKey");
    expect(view).not.toMatch(/workflowStateLabel=\{encounter\.workflowState/);
    const ready = projectAmbulatoryLifecycleHeader({
      encounterStatus: "OPEN",
      workflowState: "FINALIZED",
      providerDocumentationStatus: "SIGNED",
    });
    expect(ready.metaLabelKey).not.toBe("FINALIZED");
  });

  it("H — cache invalidation helper uses getRequestDedupe (typed drop only)", () => {
    const inv = readLib("invalidateClinicCareAmbulatoryLifecycleCache.ts");
    expect(inv).toContain("invalidateGetRequestDedupeForPath");
    expect(inv).toContain("invalidateClinicFollowUpProjectionCache");
    expect(inv).not.toMatch(/\bsetTimeout\s*\(/);
    expect(inv).not.toContain("location.reload");
  });

  it("N — French i18n keys mirrored for lifecycle", () => {
    const fr = readFileSync(join(__dirname, "../../i18n/messages/fr.ts"), "utf8");
    const en = readFileSync(join(__dirname, "../../i18n/messages/en.ts"), "utf8");
    expect(fr).toContain("clinicCareD4c7d:");
    expect(en).toContain("clinicCareD4c7d:");
    expect(fr).toContain('open: "Ouverte"');
    expect(fr).toContain('terminated: "Terminée"');
    expect(fr).toContain('closed: "Fermée"');
    expect(fr).toContain('dischargeDone: "Sortie effectuée"');
    expect(fr).toContain('docsToFinalize: "Documentation à finaliser"');
    expect(fr).toContain('closeEncounter: "Clôturer la rencontre"');
    expect(fr).toContain('closed: "La visite a été clôturée."');
  });
});
