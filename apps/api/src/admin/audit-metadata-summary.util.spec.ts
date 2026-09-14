import { summarizeAuditMetadata } from "./audit-metadata-summary.util";

describe("summarizeAuditMetadata FHIR lifecycle projection", () => {
  it("keeps PHI-safe FHIR lifecycle evidence", () => {
    expect(
      summarizeAuditMetadata({
        event: "FHIR_M2M_CREDENTIAL_REVOKED",
        integrationId: "integration-1",
        credentialId: "credential-1",
        keyId: "mk_test",
        scopeCount: 2,
      }),
    ).toEqual({
      event: "FHIR_M2M_CREDENTIAL_REVOKED",
      integrationId: "integration-1",
      credentialId: "credential-1",
      keyId: "mk_test",
      scopeCount: 2,
    });
  });

  it("does not expose secrets, tokens, jti, or arbitrary metadata", () => {
    expect(
      summarizeAuditMetadata({
        event: "FHIR_M2M_TOKEN_ISSUED",
        keyId: "mk_test",
        clientSecret: "never-show-this",
        accessToken: "never-show-this-either",
        jti: "internal-token-id",
        patientName: "Sensitive Patient",
      }),
    ).toEqual({
      event: "FHIR_M2M_TOKEN_ISSUED",
      keyId: "mk_test",
    });
  });
});
