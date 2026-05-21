import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const apiSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "medicationActivationGovernanceApi.ts"),
  "utf8"
);

const pageSource = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../../app/app/admin/medication-governance/activation/page.tsx"
  ),
  "utf8"
);

describe("medicationActivationGovernanceApi (19G.2)", () => {
  it("targets activation-candidates via apiFetchResponse backend proxy prefix", () => {
    expect(apiSource).toContain('const API_BASE = "/medication-master/governance"');
    expect(apiSource).toContain("apiFetchResponse");
    expect(apiSource).toContain("/activation-candidates");
    expect(apiSource).not.toContain("/api/backend/api/backend");
    expect(apiSource).toContain("facilityId");
  });

  it("parses structured 400 blockers instead of normalizeUserFacingError", () => {
    expect(apiSource).toContain("ActivationGovernanceApiError");
    expect(apiSource).toContain("parseActivationApiError");
    expect(apiSource).not.toContain("normalizeUserFacingError");
  });

  it("activation page uses fetchActivationCandidates without hardcoded French chrome", () => {
    expect(pageSource).toMatch(/fetchActivationCandidates/);
    expect(pageSource).toMatch(/medicationGovernanceActivation\./);
    expect(pageSource).not.toMatch(/Chargement\.\.\./);
    expect(pageSource).not.toMatch(/Actualiser/);
  });

  it("activation page splits load vs action errors and disables forward steps (19G.2B)", () => {
    expect(pageSource).toMatch(/loadError/);
    expect(pageSource).toMatch(/actionError/);
    expect(pageSource).toMatch(/forwardDisabled/);
    expect(pageSource).toMatch(/getActivationCandidateUiState/);
    expect(pageSource).toMatch(/formatActivationGovernanceError/);
    expect(pageSource).not.toMatch(/normalizeUserFacingError/);
    expect(pageSource).toMatch(/governanceReviewRequired/);
  });
});
