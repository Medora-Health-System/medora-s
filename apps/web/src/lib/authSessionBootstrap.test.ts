import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  beginLoadSessionRequest,
  clearedAuthenticatedSessionState,
  isLatestLoadSessionRequest,
  shouldIgnoreStaleAuthMeResult,
  shouldIgnoreStaleUnauthenticatedResult,
} from "./authSessionBootstrap";
import { resolveAppShellShowAuthRecovery } from "./authShellRecovery";

const webRoot = join(import.meta.dirname, "../..");

function readWebSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("auth session bootstrap serialization", () => {
  it("successful auth followed by stale unauthenticated result is ignored", () => {
    const seqRef = { current: 0 };
    const first = beginLoadSessionRequest(seqRef);
    const second = beginLoadSessionRequest(seqRef);

    expect(
      shouldIgnoreStaleUnauthenticatedResult({
        requestSeq: first,
        latestSeq: second,
        result: { ok: false, failureKind: "unauthenticated" },
        current: {
          sessionPhase: "authenticated",
          user: { id: "u1" },
          facilities: [{ id: "f1", name: "Clinic" }],
          activeFacility: "f1",
        },
      })
    ).toBe(true);
    expect(isLatestLoadSessionRequest(first, second)).toBe(false);
    expect(isLatestLoadSessionRequest(second, second)).toBe(true);
  });

  it("latest unauthenticated result is applied when it is the latest request", () => {
    const seqRef = { current: 0 };
    const latest = beginLoadSessionRequest(seqRef);

    expect(
      shouldIgnoreStaleAuthMeResult({
        requestSeq: latest,
        latestSeq: latest,
        result: { ok: false, failureKind: "unauthenticated" },
      })
    ).toBe(false);
  });

  it("AppShell gates authenticated content on sessionContentReady", () => {
    const shell = readWebSource("src/components/app-shell/AppShell.tsx");
    expect(shell).toContain("sessionContentReady");
  });

  it("concurrent loadSession calls only latest wins", () => {
    const seqRef = { current: 0 };
    const first = beginLoadSessionRequest(seqRef);
    const second = beginLoadSessionRequest(seqRef);
    const third = beginLoadSessionRequest(seqRef);

    expect(isLatestLoadSessionRequest(first, third)).toBe(false);
    expect(isLatestLoadSessionRequest(second, third)).toBe(false);
    expect(isLatestLoadSessionRequest(third, third)).toBe(true);
  });

  it("unauthenticated cleanup clears user and facility state", () => {
    const cleared = clearedAuthenticatedSessionState();
    expect(cleared.user).toBeNull();
    expect(cleared.facilities).toEqual([]);
    expect(cleared.activeFacility).toBe("");
    expect(cleared.authRecoveryMessage).toBeNull();
    expect(cleared.sessionAccessTtlSec).toBeNull();
  });

  it("layout uses serialized loadSession request sequence", () => {
    const layout = readWebSource("app/app/layout.tsx");
    expect(layout).toContain("loadSessionSeqRef");
    expect(layout).toContain("beginLoadSessionRequest");
    expect(layout).toContain("isLatestLoadSessionRequest");
    expect(layout).toContain("shouldIgnoreStaleAuthMeResult");
    expect(layout).toContain("clearedAuthenticatedSessionState");
  });

  it("unauthenticated path clears session before login redirect", () => {
    const layout = readWebSource("app/app/layout.tsx");
    expect(layout).toContain("clearAuthenticatedSession");
    expect(layout).toContain("invalidateAuthMeSessionCache()");
    expect(layout).toContain("redirectToLogin");
  });

  it("login invalidates stale failed auth cache", () => {
    const login = readWebSource("app/login/page.tsx");
    expect(login).toContain("invalidateAuthMeSessionCache");
  });

  it("auth recovery panel does not show when authenticated", () => {
    expect(
      resolveAppShellShowAuthRecovery({
        authRecoveryActive: false,
        onAuthRecoveryRetry: () => {},
        onAuthRecoveryLogin: () => {},
        onAuthRecoveryReload: () => {},
      })
    ).toBe(false);
  });

  it("authSessionMe aborts superseded force fetch", () => {
    const authMe = readWebSource("src/lib/authSessionMe.ts");
    expect(authMe).toContain("activeFetchController");
    expect(authMe).toContain("fetchEpoch");
  });

  it("logout still clears auth cache", () => {
    const layout = readWebSource("app/app/layout.tsx");
    expect(layout).toContain("handleLogout");
    expect(layout).toContain("invalidateAuthMeSessionCache()");
    expect(layout).toContain('router.push("/login")');
  });
});
