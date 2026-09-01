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

  it("keeps typed characters visible and searches the clinical roster", () => {
    expect(source).toContain("/roster/clinical-users?q=");
    expect(source).toContain("&role=${role}");
    expect(source).toContain("clinical-user-role-autocomplete-input");
    expect(source).toContain("MIN_CHARS = 3");
    expect(source).not.toMatch(/onChangeDisplay\(v\);\s*onSelectUser\(null\)/);
    expect(source).not.toContain("/admin/users");
  });

  it("renders roster credentials and department without admin/email fields", () => {
    expect(source).toContain("formatClinicalUserRoleLabel");
    expect(source).toContain("credentials");
    expect(source).toContain("departmentName");
    expect(source).not.toContain("email");
    expect(source).not.toContain("mfa");
    expect(source).not.toContain("/admin/users");
  });
});
