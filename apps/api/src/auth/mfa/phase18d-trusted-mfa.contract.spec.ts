import fs from "node:fs";
import path from "node:path";

describe("Phase 18D Medora-wide 24-hour MFA trust", () => {
  const api = (p: string) => fs.readFileSync(path.join(process.cwd(), "src/auth/mfa", p), "utf8");
  const webRoot = path.resolve(process.cwd(), "../web");
  const web = (p: string) => fs.readFileSync(path.join(webRoot, p), "utf8");

  it("is global MFA infrastructure rather than Technology / IT-specific policy", () => {
    const controller = api("trusted-mfa.controller.ts");
    expect(controller).toContain('type: "mfa_trusted_device"');
    expect(controller).toContain("24 * 60 * 60");
    expect(controller).not.toContain("TECHNOLOGY_IT");
    expect(controller).not.toContain("MedoraWorkforceProfile");
  });

  it("requires a fresh real MFA-bound session before issuing trust", () => {
    const controller = api("trusted-mfa.controller.ts");
    expect(controller).toContain('UseGuards(AuthGuard("jwt"))');
    expect(controller).toContain("mfaVerifiedAt");
    expect(controller).toContain("FRESH_MFA_REQUIRED");
  });

  it("binds trusted login to the same user and preserves original MFA verification time", () => {
    const controller = api("trusted-mfa.controller.ts");
    expect(controller).toContain("challenge.sub !== trust.sub");
    expect(controller).toContain("mfaEnabled: true");
    expect(controller).toContain("mfaVerifiedAt: verifiedAt");
    expect(controller).toContain('mfaMethod: "trusted_device"');
  });

  it("keeps trust proof HttpOnly and out of browser JavaScript storage", () => {
    const cookie = web("src/lib/server/mfaTrustedDeviceCookie.ts");
    expect(cookie).toContain("httpOnly: true");
    expect(cookie).toContain('sameSite: "lax"');
    expect(cookie).toContain("24 * 60 * 60");
  });

  it("offers the option to every MFA challenge and exchanges it only after password validation", () => {
    const panel = web("app/login/MfaChallengePanel.tsx");
    const login = web("app/api/auth/login/route.ts");
    expect(panel).toContain("trust24Hours");
    expect(panel).toContain("/api/auth/mfa/trust");
    expect(login.indexOf("/auth/login")).toBeLessThan(login.indexOf("/auth/mfa/trust/exchange"));
  });
});
