import { describe, expect, it } from "vitest";
import {
  buildVaccineMarWorkflowCertificationReport,
  buildVaccineVISGovernanceCertificationReport,
} from "./vaccineMarWorkflowCertification.js";

describe("VaccineMarWorkflowCertificationReport", () => {
  const mar = buildVaccineMarWorkflowCertificationReport();
  const vis = buildVaccineVISGovernanceCertificationReport();

  it("audits vaccine MAR workflow", () => {
    expect(["PASS", "PARTIAL", "FAIL"]).toContain(mar.decision);
  });

  it("audits vaccine name field", () => {
    expect(mar.fields.some((field) => field.field === "vaccine name")).toBe(true);
  });

  it("audits dose and unit fields", () => {
    expect(mar.fields.some((field) => field.field === "dose")).toBe(true);
    expect(mar.fields.some((field) => field.field === "unit")).toBe(true);
  });

  it("audits route and site fields", () => {
    expect(mar.fields.some((field) => field.field === "route")).toBe(true);
    expect(mar.fields.some((field) => field.field === "site")).toBe(true);
  });

  it("audits lot and expiration fields", () => {
    expect(mar.fields.some((field) => field.field === "lot number")).toBe(true);
    expect(mar.fields.some((field) => field.field === "expiration date")).toBe(true);
  });

  it("audits manufacturer field", () => {
    expect(mar.fields.some((field) => field.field === "manufacturer")).toBe(true);
  });

  it("audits VIS fields", () => {
    expect(mar.fields.filter((field) => field.field.includes("VIS")).length).toBe(3);
  });

  it("supports generated MAR note", () => {
    expect(mar.generatedMarNoteSupported).toBe(true);
  });

  it("certifies VIS governance", () => {
    expect(vis.decision).toBe("PASS");
  });

  it("does not hardcode VIS date as permanent truth", () => {
    expect(vis.visDateClinicianEntered).toBe(true);
  });

  it("omits VIS when not documented", () => {
    expect(vis.noteOmitsVisWhenNotDocumented).toBe(true);
  });

  it("includes VIS when documented", () => {
    expect(vis.noteIncludesVisWhenDocumented).toBe(true);
  });
});
