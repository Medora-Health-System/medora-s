import fs from "node:fs";
import path from "node:path";

describe("Phase 18B Technology / IT MFA enforcement", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "src/auth/auth.service.ts"), "utf8");

  it("looks up active corporate workforce identity during login", () => {
    expect(source).toMatch(/MedoraWorkforceProfile|medoraWorkforceProfile|\$queryRaw/i);
    expect(source).toContain("TECHNOLOGY_IT");
  });

  it("requires MFA when either facility role policy or Technology IT workforce policy requires it", () => {
    expect(source).toMatch(/requiresMfa[\s\S]{0,500}TECHNOLOGY_IT|TECHNOLOGY_IT[\s\S]{0,500}requiresMfa/i);
    expect(source).toContain('kind: "mfa_enrollment_required"');
  });

  it("does not weaken the existing MFA challenge for already-enrolled users", () => {
    expect(source).toContain("if (user.mfaEnabled)");
    expect(source).toContain('kind: "mfa_challenge"');
  });
});
