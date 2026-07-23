/**
 * D4A.2.4 — Boundary: dual-mode Command Center convergence.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname);

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("MEDUI.ADMISSION_OPERATIONS_CONVERGENCE.D4A2_4 boundary", () => {
  it("Command Center hides durable receiving when placement OFF", () => {
    const src = read("AdmissionCommandCenterView.tsx");
    expect(src).toContain("receivingUnavailable");
    expect(src).toContain("operationsMode");
    expect(src).toContain("convergedDisplayState");
    expect(src).toContain("placementOn ?");
  });

  it("EN/FR include placement unavailable and receiving stale errors", () => {
    const en = read("../../i18n/messages/admissionCommandCenter.en.ts");
    const fr = read("../../i18n/messages/admissionCommandCenter.fr.ts");
    for (const key of [
      "PLACEMENT_WORKFLOW_UNAVAILABLE",
      "RECEIVING_ACCEPTANCE_STALE",
      "displayStates",
      "receivingUnavailable",
    ]) {
      expect(en).toContain(key);
      expect(fr).toContain(key);
    }
  });
});
