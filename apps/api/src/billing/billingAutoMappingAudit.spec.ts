import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("billingAutoMappingAudit (MEDUI.BILLING.AUTO_MAPPING.1A)", () => {
  it("bulk apply uses AUTO_MAPPING_APPLIED entity with BULK_AUTO_MAPPING source", () => {
    const service = readFileSync(join(__dirname, "billing-auto-mapping.service.ts"), "utf8");
    expect(service).toContain('const BULK_AUDIT_ENTITY = "AUTO_MAPPING_APPLIED"');
    expect(service).toContain('"BULK_AUTO_MAPPING"');
    expect(service).toContain("ledgerRowId: row.id");
    expect(service).toContain("confidence: fresh.confidence");
  });

  it("single apply retains BILLING_AUTO_MAPPING entity", () => {
    const service = readFileSync(join(__dirname, "billing-auto-mapping.service.ts"), "utf8");
    expect(service).toContain('const AUDIT_ENTITY = "BILLING_AUTO_MAPPING"');
    expect(service).toContain('"AUTO_MAPPING_USER_APPLIED"');
  });

  it("metadata preserves previous values on apply", () => {
    const service = readFileSync(join(__dirname, "billing-auto-mapping.service.ts"), "utf8");
    expect(service).toContain("previousCode: row.code");
    expect(service).toContain("previousProcedureCode: row.procedureCode");
    expect(service).toContain("autoMappingApplied");
  });

  it("does not mutate encounters", () => {
    const service = readFileSync(join(__dirname, "billing-auto-mapping.service.ts"), "utf8");
    expect(service).not.toMatch(/encounter\.update/);
  });
});
