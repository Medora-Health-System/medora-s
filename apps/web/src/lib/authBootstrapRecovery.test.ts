/**
 * MEDUI.APP_SHELL.REFRESH_BLANK_SCREEN_AUTH_502_FIX.1 — source regression anchors.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const webRoot = join(import.meta.dirname, "../..");

function readWebSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("auth refresh blank screen recovery", () => {
  it("AppShell exposes auth recovery panel hooks", () => {
    const src = readWebSource("src/components/app-shell/AppShell.tsx");
    expect(src).toContain("AppShellAuthFailurePanel");
    expect(src).toContain("authRecoveryMessage");
    expect(src).toContain("onAuthRecoveryRetry");
    const panel = readWebSource("src/components/app-shell/AppShellAuthFailurePanel.tsx");
    expect(panel).toContain('data-testid="app-shell-auth-failure-panel"');
  });

  it("auth/me BFF maps backend 502 to 503 with retry", () => {
    const route = readWebSource("app/api/auth/me/route.ts");
    expect(route).toContain("fetchBackendMeWithRetry");
    expect(route).toContain("AUTH_SERVICE_UNAVAILABLE");
    expect(route).toContain("status: 503");
  });

  it("authSessionMe retries transient failures", () => {
    const authMe = readWebSource("src/lib/authSessionMe.ts");
    expect(authMe).toContain("fetchAuthMeWithRetry");
    expect(authMe).toContain("AUTH_ME_FETCH_TIMEOUT_MS");
    expect(authMe).toContain("failureKind");
  });

  it("layout does not bootstrap forever when user is null after auth failure", () => {
    const layout = readWebSource("app/app/layout.tsx");
    expect(layout).toContain('bootstrapping={sessionPhase === "loading"}');
    expect(layout).not.toContain("bootstrapping={!sessionReady || !user}");
    expect(layout).toContain('sessionPhase === "recoverable_error"');
  });
});
