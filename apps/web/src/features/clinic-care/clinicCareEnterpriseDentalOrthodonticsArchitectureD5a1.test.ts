/**
 * MEDUI.D5A.1 — Web/source audit guards (no product behavior).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  D5A1_FORBIDDEN_AUTHORITIES,
  ENTERPRISE_DENTAL_ORTHODONTICS_ARCHITECTURE_CERTIFICATION_ID,
} from "@medora/shared";

const repoRoot = join(__dirname, "../../../../..");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("MEDUI.D5A.1 dental architecture source guards", () => {
  it("exports D5A.1 certification id from shared", () => {
    expect(ENTERPRISE_DENTAL_ORTHODONTICS_ARCHITECTURE_CERTIFICATION_ID).toBe("MEDUI.D5A.1");
  });

  it("Prisma schema has no DentalPatient / OrthodonticPatient / DentalAppointment", () => {
    const schema = read("apps/api/prisma/schema.prisma");
    for (const name of [
      "DentalPatient",
      "OrthodonticPatient",
      "DentalAppointment",
      "DentalOrder",
      "DentalPrescription",
      "DentalBillingEngine",
      "DentalGuardian",
    ] as const) {
      expect(D5A1_FORBIDDEN_AUTHORITIES).toContain(name);
      expect(schema).not.toContain(`model ${name} `);
      expect(schema).not.toContain(`model ${name}{`);
    }
    expect(schema).toContain("model Patient {");
    expect(schema).toContain("model Encounter {");
    expect(schema).toContain("model Appointment {");
    expect(schema).toContain("model Order {");
  });

  it("architecture docs exist and forbid inpatient dental census", () => {
    const audit = read("docs/clinical/enterprise-dental-orthodontics-architecture-d5a1-audit.md");
    expect(audit).toContain("MEDUI.D5A.1");
    expect(audit).toMatch(/OrthodonticCase.*Encounter|Encounter.*OrthodonticCase/i);
    expect(audit).toContain("bed");
    expect(audit).toContain("D4C.7I");
  });
});
