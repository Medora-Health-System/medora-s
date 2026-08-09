import { projectEnterpriseAuditMetadata } from "./enterprise-audit-projection";

describe("enterprise audit minimum-necessary projection D4SEC.1C.2C.2", () => {
  it("returns normalized classifications and allowlisted semantic evidence", () => {
    expect(projectEnterpriseAuditMetadata({
      event: "USER_SECURITY_UPDATED", outcome: "SUCCESS", severity: "HIGH",
      sourceOperation: "PATCH /admin/users/:id", changedFields: ["isActive"], resultCount: 1,
    })).toEqual({
      event: "USER_SECURITY_UPDATED", outcome: "SUCCESS", severity: "HIGH",
      sourceOperation: "PATCH /admin/users/:id", evidence: { changedFields: ["isActive"], resultCount: 1 },
    });
  });

  it("recursively/case-insensitively excludes secrets, tokens, credentials, and MFA recovery material", () => {
    const result = projectEnterpriseAuditMetadata({
      PasswordHash: "hash", refresh_TOKEN: "token", AuthorizationHeader: "Bearer x",
      api_key: "key", mfaSecretEncrypted: "cipher", MFARecoveryCodes: ["one"], rawCredentialMaterial: "x",
      resultCount: 2,
    });
    expect(JSON.stringify(result)).not.toMatch(/hash|token|Bearer|cipher|one|credential/i);
    expect(result.evidence).toEqual({ resultCount: 2 });
  });

  it("fails closed for unknown metadata and omits clinical/PHI-bearing fields", () => {
    const result = projectEnterpriseAuditMetadata({
      unknownLegacyObject: { arbitrary: "value" }, patientId: "patient", MRN: "123",
      clinicalNarrative: "diagnosis", medicationName: "drug", filterClasses: ["action"],
    });
    expect(result.evidence).toEqual({ filterClasses: ["action"] });
    expect(JSON.stringify(result)).not.toMatch(/patient|123|diagnosis|drug|arbitrary/);
  });
});
