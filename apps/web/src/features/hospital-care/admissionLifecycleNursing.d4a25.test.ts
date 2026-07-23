import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  INPATIENT_ADMISSION_CLINICAL_SECTIONS,
  NURSING_ADMISSION_SECTION_SCHEMAS,
} from "@medora/shared";
import { hospitalAdmissionD4a25En } from "@/i18n/messages/hospitalAdmissionD4a25.en";
import { hospitalAdmissionD4a25Fr } from "@/i18n/messages/hospitalAdmissionD4a25.fr";

describe("D4A.2.5 inpatient lifecycle + nursing admission UI contracts", () => {
  it("shell includes Prev/Next, save state, structured forms, lifecycle menu", () => {
    const shell = readFileSync(
      join(__dirname, "../inpatient-workspace/InpatientAdmissionClinicalShell.tsx"),
      "utf8"
    );
    expect(shell).toContain("NursingAdmissionStructuredSectionForm");
    expect(shell).toContain("InpatientLifecycleActionsMenu");
    expect(shell).toContain("admission-nav-");
    expect(shell).toContain('position: "top" | "bottom"');
    expect(shell).toContain("admission-save-state");
    expect(shell).toContain("createLatestWinsClinicalAutosaveScheduler");
    expect(shell).toContain("beforeunload");
  });

  it("all 20 sections have schemas and EN/FR section help keys", () => {
    for (const id of INPATIENT_ADMISSION_CLINICAL_SECTIONS) {
      expect(NURSING_ADMISSION_SECTION_SCHEMAS[id].fields.length).toBeGreaterThan(0);
      expect(hospitalAdmissionD4a25En.help.sections[id]).toBeTruthy();
      expect(hospitalAdmissionD4a25Fr.help.sections[id]).toBeTruthy();
    }
  });

  it("mirrors lifecycle action labels EN/FR", () => {
    const keys = Object.keys(hospitalAdmissionD4a25En.lifecycle) as Array<
      keyof typeof hospitalAdmissionD4a25En.lifecycle
    >;
    for (const key of keys) {
      expect(hospitalAdmissionD4a25Fr.lifecycle[key]).toBeTruthy();
    }
    expect(hospitalAdmissionD4a25En.lifecycle.cancelAdmission).toMatch(/Cancel admission/i);
    expect(hospitalAdmissionD4a25Fr.lifecycle.cancelAdmission).toMatch(/Annuler/i);
    expect(hospitalAdmissionD4a25En.lifecycle.voidEncounter).not.toMatch(/Delete patient/i);
  });

  it("API client exposes lifecycle endpoints without hard delete", () => {
    const api = readFileSync(join(__dirname, "inpatientOperationsApi.ts"), "utf8");
    expect(api).toContain("lifecycle/edit-admission");
    expect(api).toContain("lifecycle/transfer-bed");
    expect(api).toContain("lifecycle/discharge");
    expect(api).toContain("lifecycle/cancel-admission");
    expect(api).toContain("lifecycle/void-encounter");
    expect(api).not.toMatch(/hard-delete|deleteEncounter\(/i);
  });

  it("controller registers governed lifecycle routes", () => {
    const ctrl = readFileSync(
      join(
        __dirname,
        "../../../../api/src/encounters/inpatient-operations.controller.ts"
      ),
      "utf8"
    );
    expect(ctrl).toContain('lifecycle/cancel-admission');
    expect(ctrl).toContain('lifecycle/void-encounter');
    expect(ctrl).toContain("@RequireRoles(RoleCode.ADMIN)");
  });
});
