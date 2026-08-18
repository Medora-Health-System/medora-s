import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";
import {
  sectionNeedsAuthoritativeEdocWriteThrough,
  nursingSectionIntegration,
} from "@medora/shared";

function read(name: string) {
  return readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
}

describe("MEDUI.INP.2B.2B nursing admission authoritative-domain save hotfix", () => {
  it("keeps the serialized save coordinator for Confirm, Update, and section save", () => {
    const coordinator = read("nursingAdmissionSaveCoordinator.ts");
    const shell = read("InpatientAdmissionClinicalShell.tsx");
    expect(coordinator).toContain("requestSectionSave");
    expect(coordinator).toContain("requestVerify");
    expect(shell).toContain("classifyNursingAdmissionSaveFailure");
    expect(shell).toContain('persistSection(undefined, "CONTINUE")');
  });

  it("does not over-apply EDOC UUID requirements to admission-owned screens", () => {
    expect(sectionNeedsAuthoritativeEdocWriteThrough("FUNCTIONAL_MOBILITY")).toBe(false);
    expect(sectionNeedsAuthoritativeEdocWriteThrough("NUTRITION")).toBe(false);
    expect(nursingSectionIntegration("HOME_MEDICATIONS").writeMode).toBe("VERIFY_AND_UPDATE");
    expect(nursingSectionIntegration("LINES_DRAINS_DEVICES").writeMode).toBe("ADMISSION_ONLY");
  });

  it("mirrors new EN/FR save-failure keys without canonical backend codes", () => {
    expect(Object.keys(en.inpatientAdmissionInp2b2a)).toEqual(Object.keys(fr.inpatientAdmissionInp2b2a));
    expect(en.inpatientAdmissionInp2b2a.saveNetwork).not.toMatch(/AUTHORITATIVE|SECTION_VALIDATION/);
    expect(fr.inpatientAdmissionInp2b2a.saveDomainLink).not.toMatch(/AUTHORITATIVE/);
    expect(en.inpatientAdmissionInp2b2a.savePreloadConfirm.length).toBeGreaterThan(10);
  });
});
