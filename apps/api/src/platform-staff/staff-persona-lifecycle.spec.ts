import fs from "node:fs";
import path from "node:path";
import { changePersonaSchema, provisionStaffSchema, staffLifecycleSchema } from "./dto/platform-staff.dto";
import { MEDORA_STAFF_PERSONAS, PERSONA_CAPABILITY_TEMPLATES } from "./platform-capabilities";
import { resolvePlatformCapabilities } from "./platform-capability.resolver";

describe("D4SEC.1C.4B persona/lifecycle foundation", () => {
  it("defines exactly the five certified personas and templates without CRITICAL catalog capabilities", () => {
    expect(MEDORA_STAFF_PERSONAS).toEqual(["IMPLEMENTATION", "SUPPORT", "BILLING_OPERATIONS", "COMPLIANCE_SECURITY", "PLATFORM_OPERATIONS"]);
    const migration = fs.readFileSync(path.join(process.cwd(), "prisma/migrations/20261102120000_d4sec_1c3_medora_staff_capability_engine/migration.sql"), "utf8");
    for (const [persona, codes] of Object.entries(PERSONA_CAPABILITY_TEMPLATES)) {
      expect(codes.length).toBeGreaterThan(0);
      for (const code of codes) {
        expect(migration).toContain(`'${code}'`);
        expect(migration).not.toMatch(new RegExp(`'${code}'[^\\n]*'CRITICAL'`));
      }
      if (persona === "SUPPORT") expect(codes).toEqual(["FACILITY_HEALTH_VIEW", "STAFF_VIEW", "SYSTEM_HEALTH_VIEW"]);
    }
  });

  it("strictly validates lifecycle input and rejects spoofed/secret fields", () => {
    expect(provisionStaffSchema.parse({ persona: "SUPPORT", reason: "approved ticket" }).persona).toBe("SUPPORT");
    expect(() => provisionStaffSchema.parse({ persona: "ADMIN", reason: "approved ticket" })).toThrow();
    expect(() => changePersonaSchema.parse({ persona: "SUPPORT", reason: "ok" })).toThrow();
    expect(() => staffLifecycleSchema.parse({ reason: "approved", mfaVerifiedAt: new Date().toISOString() })).toThrow();
  });

  it("resolves only explicit active grants and returns zero for inactive staff", async () => {
    const findUnique = jest.fn().mockResolvedValue({ isActive: true, medoraStaffProfile: { isActive: false }, platformCapabilityGrants: [{ capability: { code: "STAFF_VIEW" } }] });
    const result = await resolvePlatformCapabilities({ user: { findUnique } }, "immutable-user-id");
    expect(result.capabilities.size).toBe(0);
    expect(result.reason).toBe("INACTIVE_STAFF");
    const query = findUnique.mock.calls[0][0];
    expect(query.where).toEqual({ id: "immutable-user-id" });
    expect(JSON.stringify(query)).not.toMatch(/patient|encounter|chart|medication|order|result|userRoles|facility/i);
  });

  it("does not use persona as runtime authorization", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/platform-staff/platform-capability.resolver.ts"), "utf8");
    expect(source).not.toMatch(/persona/i);
    expect(source).toContain("platformCapabilityGrants");
  });

  it("schema provenance is explicit and lifecycle history uses restrictive attribution", () => {
    const migration = fs.readFileSync(path.join(process.cwd(), "prisma/migrations/20260810150000_staff_persona_lifecycle_foundation/migration.sql"), "utf8");
    expect(migration).toContain('DEFAULT \'MANUAL\'');
    expect(migration).toContain('PlatformCapabilityGrant_persona_provenance_check');
    expect(migration.match(/ON DELETE RESTRICT/g)).toHaveLength(2);
    expect(migration).not.toMatch(/INSERT INTO "User"|INSERT INTO "UserRole"|INSERT INTO "Facility/);
  });
});
