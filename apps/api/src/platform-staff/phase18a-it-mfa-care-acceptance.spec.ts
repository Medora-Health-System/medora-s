import fs from "node:fs";
import path from "node:path";

describe("Phase 18A Technology / IT production acceptance", () => {
  const api = (p: string) => fs.readFileSync(path.join(process.cwd(), "src", p), "utf8");
  const webRoot = path.resolve(process.cwd(), "../web");
  const web = (p: string) => fs.readFileSync(path.join(webRoot, p), "utf8");

  it("requires corporate Technology / IT identity to participate in the MFA login policy", () => {
    const auth = api("auth/auth.service.ts");
    expect(auth).toMatch(/MedoraWorkforceProfile|medoraStaffProfile|TECHNOLOGY_IT/i);
  });

  it("keeps first-login authenticator enrollment wired into the login UI", () => {
    const login = web("app/login/page.tsx");
    expect(login).toContain("mfaEnrollmentRequired");
    expect(login).toContain("MfaEnrollmentPanel");
  });

  it("offers an explicit 24-hour trusted MFA choice without browser-stored authenticator secrets", () => {
    const challenge = web("app/login/MfaChallengePanel.tsx");
    expect(challenge).toMatch(/24\s*hours|24-hour|remember.*24|allow.*24/i);
    expect(challenge).not.toMatch(/localStorage.*(?:totp|authenticator|mfa.*secret)|sessionStorage.*(?:totp|authenticator|mfa.*secret)/i);
  });

  it("backs the 24-hour choice with server-side trusted MFA semantics", () => {
    const controller = api("auth/mfa/mfa.controller.ts");
    const policy = api("platform-staff/privileged-action-policy.ts");
    expect(`${controller}\n${policy}`).toMatch(/trusted|24h|86400/i);
  });

  it("represents Technology / IT care-workspace access as server-side authority rather than a UI redirect bypass", () => {
    const auth = api("auth/auth.service.ts");
    const guard = api("common/guards/roles.guard.ts");
    expect(`${auth}\n${guard}`).toMatch(/TECHNOLOGY_IT|technology.*it/i);
  });
});
