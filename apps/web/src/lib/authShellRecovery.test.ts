import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveAppShellShowAuthRecovery } from "./authShellRecovery";

const webRoot = join(import.meta.dirname, "../..");

function readWebSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

const handlers = {
  onAuthRecoveryRetry: () => {},
  onAuthRecoveryLogin: () => {},
  onAuthRecoveryReload: () => {},
};

describe("auth recovery false-positive prevention", () => {
  it("1. recovery panel shows only when authRecoveryActive is true", () => {
    expect(
      resolveAppShellShowAuthRecovery({ authRecoveryActive: true, ...handlers })
    ).toBe(true);
    expect(
      resolveAppShellShowAuthRecovery({ authRecoveryActive: false, ...handlers })
    ).toBe(false);
  });

  it("2. handlers alone must not show recovery panel when inactive", () => {
    expect(
      resolveAppShellShowAuthRecovery({
        authRecoveryActive: false,
        ...handlers,
      })
    ).toBe(false);
  });

  it("3. retry success path clears recovery via sessionPhase gate in layout", () => {
    const layout = readWebSource("app/app/layout.tsx");
    expect(layout).toContain("authRecoveryActive={sessionPhase === \"recoverable_error\" && !user}");
    expect(layout).toContain("setAuthRecoveryMessage(null)");
    expect(layout).toContain('setSessionPhase("authenticated")');
  });

  it("4. AppShell uses authRecoveryActive not handler presence", () => {
    const shell = readWebSource("src/components/app-shell/AppShell.tsx");
    expect(shell).toContain("authRecoveryActive");
    expect(shell).toContain("resolveAppShellShowAuthRecovery");
    expect(shell).not.toContain("authRecoveryMessage != null || onAuthRecoveryRetry");
  });

  it("5. login clears auth cache after successful auth", () => {
    const login = readWebSource("app/login/page.tsx");
    expect(login).toContain("invalidateAuthMeSessionCache");
    expect(login).toContain("notifyAuthSessionRestored");
  });

  it("6. logout clears auth cache", () => {
    const layout = readWebSource("app/app/layout.tsx");
    expect(layout).toContain("invalidateAuthMeSessionCache()");
    expect(layout).toContain('router.push("/login")');
  });
});
