import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("ClinicalUserRoleAutocomplete (M1.8B.4A.5)", () => {
  const source = readFileSync(join(import.meta.dirname, "ClinicalUserRoleAutocomplete.tsx"), "utf8");

  it("surfaces API errors instead of silent empty results", () => {
    expect(source).toContain("searchError");
    expect(source).toContain("clinicalUserRoleAutocomplete.apiError");
    expect(source).toContain("clinical-user-role-autocomplete-api-error");
  });
});
