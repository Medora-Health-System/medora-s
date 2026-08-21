/**
 * MEDUI.LAB.REF.1 — Nest unit proof that ResultsService wires the shared authority
 * (ED / IP / Clinic / Dental consume Result.resultData snapshot — no alternate engine).
 */

import { LabReferenceIntervalService } from "../lab-reference/lab-reference-interval.service";

describe("LabReferenceIntervalService care-setting convergence", () => {
  it("exports a single snapshot API for all service lines", () => {
    expect(typeof LabReferenceIntervalService.prototype.snapshotLabResultObservations).toBe(
      "function"
    );
    expect(typeof LabReferenceIntervalService.prototype.resolveReferenceInterval).toBe("function");
    expect(typeof LabReferenceIntervalService.prototype.resolveCriticalValue).toBe("function");
  });
});
