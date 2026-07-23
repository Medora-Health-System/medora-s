/**
 * D4A.2.3 — Boundary: Admission Command Center workspace.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  HOSPITAL_CARE_ADMISSION_COMMAND_CENTER,
  hospitalAdmissionCommandCenterPath,
  hospitalAdmissionReviewPath,
} from "./hospitalCarePaths";

const root = join(__dirname);

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("MEDUI.ADMISSION_COMMAND_CENTER.D4A2_3 boundary", () => {
  it("command center path is under admissions and links bidirectionally with review", () => {
    expect(HOSPITAL_CARE_ADMISSION_COMMAND_CENTER).toBe(
      "/app/hospitalisation/admissions/command-center"
    );
    expect(hospitalAdmissionCommandCenterPath("enc-1")).toContain("encounterId=enc-1");
    expect(hospitalAdmissionReviewPath("enc-1")).toContain("/admissions/review/");
  });

  it("workspace uses facility-scoped API, polling, filters, and operational actions", () => {
    const src = read("AdmissionCommandCenterView.tsx");
    expect(src).toContain("admission-command-center");
    expect(src).toContain("/hospital-care/admission-command-center");
    expect(src).toContain("admission/operational-action");
    expect(src).toContain("visibilitychange");
    expect(src).toContain("POLL_MS");
    expect(src).toContain("admission-command-filters");
    expect(src).toContain("admission-command-metrics");
    expect(src).toContain("hospitalAdmissionReviewPath");
    expect(src).toContain("SIMULATION");
    expect(src).not.toContain("/internal-placement/draft");
    expect(src).not.toContain("Admission Submitted");
  });

  it("Admission Review links to Command Center", () => {
    const review = read("AdmissionReviewWorkspaceView.tsx");
    expect(review).toContain("hospitalAdmissionCommandCenterPath");
    expect(review).toContain("admission-review-open-command-center");
  });

  it("EN/FR keys mirrored for command center", () => {
    const en = read("../../i18n/messages/admissionCommandCenter.en.ts");
    const fr = read("../../i18n/messages/admissionCommandCenter.fr.ts");
    for (const key of [
      "title",
      "acceptOperationally",
      "placementOff",
      "simulation",
      "metrics",
      "holdReasons",
      "OPERATIONAL_ROLE_NOT_AUTHORIZED",
    ]) {
      expect(en).toContain(key);
      expect(fr).toContain(key);
    }
  });

  it("page route mounts command center view", () => {
    const page = readFileSync(
      join(
        root,
        "../../../app/app/hospitalisation/admissions/command-center/page.tsx"
      ),
      "utf8"
    );
    expect(page).toContain("AdmissionCommandCenterView");
  });
});
