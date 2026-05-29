import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  ENTERPRISE_PROCEDURE_CATALOG,
  enterpriseProcedureById,
  resolveEnterpriseProcedureDisplayName,
} from "./enterpriseProcedureCatalog.js";
import { filterEnterpriseProcedures } from "./enterpriseProcedureSearch.js";

const CARDIAC_IDS = [
  "ekg_ecg",
  "ekg_rhythm_strip",
  "continuous_cardiac_monitoring",
  "telemetry_initiation",
  "telemetry_discontinuation",
  "cardiac_monitoring",
] as const;

describe("enterprise procedure catalog cardiac nomenclature (MEDPROC.7A)", () => {
  it("preserves existing EKG enterpriseProcedureId ekg_ecg", () => {
    expect(enterpriseProcedureById("ekg_ecg")?.id).toBe("ekg_ecg");
  });

  it("uses 12-lead English and French display labels", () => {
    const ekg = enterpriseProcedureById("ekg_ecg")!;
    expect(ekg.displayNameEn).toBe("EKG / ECG 12-Lead");
    expect(ekg.displayNameFr).toBe("ECG 12 dérivations");
    expect(resolveEnterpriseProcedureDisplayName(ekg, "en")).toBe("EKG / ECG 12-Lead");
    expect(resolveEnterpriseProcedureDisplayName(ekg, "fr")).toBe("ECG 12 dérivations");
  });

  it("adds distinct cardiac procedure catalog entries with unique ids", () => {
    const ids = ENTERPRISE_PROCEDURE_CATALOG.map((entry) => entry.id);
    for (const id of CARDIAC_IDS) {
      expect(ids).toContain(id);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("search ekg returns 12-lead and rhythm strip", () => {
    const matches = filterEnterpriseProcedures("ekg", "en").map((e) => e.id);
    expect(matches).toContain("ekg_ecg");
    expect(matches).toContain("ekg_rhythm_strip");
  });

  it("search ecg returns 12-lead and rhythm strip", () => {
    const matches = filterEnterpriseProcedures("ecg", "en").map((e) => e.id);
    expect(matches).toContain("ekg_ecg");
    expect(matches).toContain("ekg_rhythm_strip");
  });

  it('search "12 lead" returns 12-lead only among cardiac entries', () => {
    const matches = filterEnterpriseProcedures("12 lead", "en").map((e) => e.id);
    expect(matches).toContain("ekg_ecg");
    expect(matches).not.toContain("ekg_rhythm_strip");
  });

  it("search rhythm returns rhythm strip", () => {
    const matches = filterEnterpriseProcedures("rhythm", "en").map((e) => e.id);
    expect(matches).toContain("ekg_rhythm_strip");
  });

  it("search cardiac monitor returns continuous cardiac monitoring", () => {
    const matches = filterEnterpriseProcedures("cardiac monitor", "en").map((e) => e.id);
    expect(matches).toContain("continuous_cardiac_monitoring");
  });

  it("search telemetry returns initiation, discontinuation, and continuous monitoring", () => {
    const matches = filterEnterpriseProcedures("telemetry", "en").map((e) => e.id);
    expect(matches).toContain("telemetry_initiation");
    expect(matches).toContain("telemetry_discontinuation");
    expect(matches).toContain("continuous_cardiac_monitoring");
  });

  it("keeps billing mapping review or institution policy only (no claim finalization)", () => {
    for (const id of [
      "ekg_ecg",
      "ekg_rhythm_strip",
      "continuous_cardiac_monitoring",
      "telemetry_initiation",
      "telemetry_discontinuation",
    ] as const) {
      const entry = enterpriseProcedureById(id)!;
      expect(entry.chargeMapping?.status).not.toBe("READY_FOR_REVIEW");
      expect(entry.chargeMapping?.defaultCodeCandidates ?? []).toEqual([]);
      if (entry.chargeMapping?.defaultCodeCandidates?.length) {
        for (const c of entry.chargeMapping.defaultCodeCandidates) {
          expect(c.reviewRequired).toBe(true);
        }
      }
    }
  });

  it("does not auto-link documentation templates on new rhythm or telemetry items", () => {
    expect(enterpriseProcedureById("ekg_rhythm_strip")?.documentationTemplateId).toBeUndefined();
    expect(enterpriseProcedureById("continuous_cardiac_monitoring")?.documentationTemplateId).toBeUndefined();
    expect(enterpriseProcedureById("telemetry_initiation")?.documentationTemplateId).toBeUndefined();
    expect(enterpriseProcedureById("telemetry_discontinuation")?.documentationTemplateId).toBeUndefined();
    expect(enterpriseProcedureById("ekg_ecg")?.documentationTemplateId).toBe("EKG");
  });

  it("preserves MEDPROC.6/7 metadata compatibility for ekg_ecg id", () => {
    expect(enterpriseProcedureById("ekg_ecg")?.chargeMapping?.status).toBe("INSTITUTION_POLICY_REQUIRED");
  });
});

describe("MEDPROC.7A create order and billing guards", () => {
  const webRoot = join(import.meta.dirname, "../../../../apps/web");
  const modalSource = readFileSync(join(webRoot, "src/components/orders/CreateOrderModal.tsx"), "utf8");
  const migrationsDir = join(import.meta.dirname, "../../../../apps/api/prisma/migrations");

  it("CreateOrderModal still keys ekg workflow to ekg_ecg id", () => {
    expect(modalSource).toContain('procedure.id === "ekg_ecg"');
    expect(modalSource).toContain("filterEnterpriseProcedures");
  });

  it("catalog exposes 12-lead label for modal display", () => {
    expect(enterpriseProcedureById("ekg_ecg")?.displayNameEn).toBe("EKG / ECG 12-Lead");
  });

  it("does not introduce claim or billing finalization in modal", () => {
    expect(modalSource).not.toMatch(/submitClaim|createClaim|BillingEvent\.create/i);
  });

  it("does not add MEDPROC.7A migration files", () => {
    const names = readdirSync(migrationsDir);
    expect(names.some((n) => /medproc7a|cardiac.*catalog/i.test(n))).toBe(false);
  });
});
