import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { requireLocalAuditPreservingReset } from "../../../scripts/clearPatientData";

const apiRoot = join(__dirname, "../../..");

function productionTypescriptFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return productionTypescriptFiles(path);
    return path.endsWith(".ts") && !path.endsWith(".spec.ts") && !path.endsWith(".test.ts")
      ? [path]
      : [];
  });
}

describe("D4SEC.1C.2C.1 audit integrity and historical attribution", () => {
  it("keeps legacy null attribution but restricts deletion of attributed users and facilities", () => {
    const schema = readFileSync(join(apiRoot, "prisma/schema.prisma"), "utf8");
    const auditModel = schema.match(/model AuditLog \{[\s\S]*?\n\}/)?.[0] ?? "";

    expect(auditModel).toContain("userId      String?");
    expect(auditModel).toContain("facilityId  String?");
    expect(auditModel).toMatch(/facility\s+Facility\?.*onDelete: Restrict/);
    expect(auditModel).toMatch(/user\s+User\?.*onDelete: Restrict/);
    expect(auditModel).not.toMatch(/email/i);
  });

  it("uses immutable-ID preflight checks and restrictive FKs without rewriting rows", () => {
    const migration = readFileSync(
      join(
        apiRoot,
        "prisma/migrations/20261101120000_d4sec_1c2c1_audit_attribution_integrity/migration.sql",
      ),
      "utf8",
    );

    expect(migration).toContain('a."userId" IS NOT NULL');
    expect(migration).toContain('a."facilityId" IS NOT NULL');
    expect(migration).toContain("ON DELETE RESTRICT");
    expect(migration).not.toMatch(/\b(UPDATE|DELETE FROM|INSERT INTO)\s+"AuditLog"/i);
    expect(migration).not.toMatch(/email/i);
  });

  it("has no production runtime AuditLog mutation/deletion path", () => {
    const violations = productionTypescriptFiles(join(apiRoot, "src")).flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return /auditLog\.(?:update|updateMany|delete|deleteMany)\s*\(/.test(source) ? [path] : [];
    });
    expect(violations).toEqual([]);
  });

  it("preserves AuditLog rows in the local patient reset", () => {
    const source = readFileSync(join(apiRoot, "scripts/clearPatientData.ts"), "utf8");
    expect(source).not.toMatch(/auditLog\.delete/);
    expect(source).toContain("AuditLog is authoritative history");
  });

  const validEnvironment = {
    NODE_ENV: "development",
    CONFIRM_RESET: "true",
    CONFIRM_AUDIT_PRESERVING_PATIENT_RESET: "D4SEC_1C2C1_LOCAL_ONLY",
    DATABASE_URL: "postgresql://medora:secret@localhost:5432/medora_dev",
  };

  it("allows the explicitly confirmed audit-preserving reset only on a local database", () => {
    expect(() => requireLocalAuditPreservingReset(validEnvironment)).not.toThrow();
    expect(() =>
      requireLocalAuditPreservingReset({
        ...validEnvironment,
        DATABASE_URL: "postgresql://medora:secret@127.0.0.1:5432/medora_test",
      }),
    ).not.toThrow();
  });

  it.each([
    [{ ...validEnvironment, NODE_ENV: "production" }, "DEVELOPMENT_OR_TEST"],
    [{ ...validEnvironment, CONFIRM_RESET: "false" }, "CONFIRM_RESET"],
    [
      { ...validEnvironment, CONFIRM_AUDIT_PRESERVING_PATIENT_RESET: "wrong" },
      "AUDIT_PRESERVATION_CONFIRMATION",
    ],
    [{ ...validEnvironment, DATABASE_URL: "postgresql://db.example/medora" }, "NON_LOCAL_DATABASE"],
    [{ ...validEnvironment, DATABASE_URL: "not-a-url" }, "VALID_DATABASE_URL"],
  ])("refuses unsafe reset configuration %#", (environment, reason) => {
    expect(() => requireLocalAuditPreservingReset(environment)).toThrow(reason);
  });
});
