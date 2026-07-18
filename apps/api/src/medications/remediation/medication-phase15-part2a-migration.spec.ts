import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Phase 15 Part 2A migration", () => {
  const sql = readFileSync(
    resolve(
      __dirname,
      "../../../prisma/migrations/20261020120000_medication_phase_15_part2a_remediation_source_lifecycle/migration.sql"
    ),
    "utf8"
  );

  it("is additive and non-destructive", () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS "MedicationRemediationProgram"/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS "MedicationRemediationWorkItem"/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS "MedicationRemediationAuditEvent"/);
    expect(sql).not.toMatch(/\bDROP TABLE\b/i);
    expect(sql).not.toMatch(/\bTRUNCATE\b/i);
    expect(sql).not.toMatch(/\bDELETE FROM\b/i);
  });

  it("keeps CDS / care-control CHECKs off", () => {
    expect(sql).toMatch(/clinicalActivationAllowed.*= false/i);
    expect(sql).toMatch(/providerFacingAlertsAllowed.*= false/i);
    expect(sql).toMatch(/orderBlockingAllowed.*= false/i);
    expect(sql).toMatch(/knowledgeControlsPatientCare.*= false/i);
    expect(sql).toMatch(/fabricatedKnowledgeForbidden.*= true/i);
  });

  it("extends existing evidence registration rather than duplicating evidence tables", () => {
    expect(sql).toMatch(/MedicationEvidenceSourceRegistration/);
    expect(sql).not.toMatch(/CREATE TABLE IF NOT EXISTS "MedicationEvidenceSource"/);
  });
});
