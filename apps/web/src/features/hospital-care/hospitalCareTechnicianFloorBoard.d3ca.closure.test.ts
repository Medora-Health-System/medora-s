import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOSPITAL_CARE_FLOOR_BOARD, HOSPITAL_CARE_HOME } from "./hospitalCarePaths";

describe("D3CA.CLOSURE — technician floor-board shortcut", () => {
  it("technician active workspace links to floor board, not Hospital Care home", () => {
    const src = readFileSync(
      join(__dirname, "../hospitalization/HospitalTechnicianActiveWorkspaceView.tsx"),
      "utf8"
    );
    expect(src).toContain(`href="${HOSPITAL_CARE_FLOOR_BOARD}"`);
    expect(src).toContain('href="/app/hospitalisation/floor-board"');
    expect(src).not.toMatch(/href=\{?["']\/app\/hospitalisation["']\}?/);
    expect(HOSPITAL_CARE_FLOOR_BOARD).not.toBe(HOSPITAL_CARE_HOME);
  });

  it("legacy EN /app/hospitalization redirects to Hospital Care home", () => {
    const src = readFileSync(
      join(__dirname, "../../../app/app/hospitalization/page.tsx"),
      "utf8"
    );
    expect(src).toContain('redirect(`/app/hospitalisation');
  });
});
