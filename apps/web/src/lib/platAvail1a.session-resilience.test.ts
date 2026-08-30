/**
 * PLAT.AVAIL.1A — session resilience source contracts.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const webRoot = join(import.meta.dirname, "../..");

function readWebSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("PLAT.AVAIL.1A session resilience", () => {
  it("keeps authenticated shell mounted on transient auth failure", () => {
    const layout = readWebSource("app/app/layout.tsx");
    expect(layout).toContain('temporarily_unverifiable');
    expect(layout).toContain("sessionPhase === \"temporarily_unverifiable\"");
    expect(layout).toContain("bootstrapping={sessionPhase === \"loading\" && !user}");
    expect(layout).toContain("authRecoveryActive={sessionPhase === \"recoverable_error\" && !user}");
    expect(layout).toContain("if (opts?.force && !hadVerifiedSession)");
    expect(layout).toContain('setSessionPhase("temporarily_unverifiable")');
    expect(layout).toContain("connectivityDegraded={sessionPhase === \"temporarily_unverifiable\"}");
  });

  it("does not treat 403 as a backend outage", () => {
    const layout = readWebSource("app/app/layout.tsx");
    expect(layout).toContain('result.failureKind === "forbidden"');
    expect(layout).not.toContain(
      'isTransientAuthFailureKind(result.failureKind) || result.failureKind === "forbidden"'
    );
    const retry = readWebSource("src/lib/authSessionRetry.ts");
    expect(retry).toContain('kind === "unavailable" || kind === "network" || kind === "timeout"');
    expect(retry).not.toContain("forbidden");
  });

  it("does not force-loading an already verified session", () => {
    const layout = readWebSource("app/app/layout.tsx");
    expect(layout).toContain("if (opts?.force && !hadVerifiedSession)");
  });

  it("fresh load without verified session does not grant access", () => {
    const layout = readWebSource("app/app/layout.tsx");
    expect(layout).toContain('setSessionPhase("recoverable_error")');
    expect(layout).toContain("if (userRef.current)");
  });

  it("uses a single backoff retry loop", () => {
    const layout = readWebSource("app/app/layout.tsx");
    expect(layout).toContain("nextAuthTransientBackoffMs");
    expect(layout).not.toContain("5000");
  });

  it("proxy maps transient upstream to retryable 503 without 401", () => {
    const me = readWebSource("app/api/auth/me/route.ts");
    expect(me).toContain("BACKEND_TEMPORARILY_UNAVAILABLE");
    expect(me).toContain("retryable: true");
    expect(me).toContain("SESSION_INVALID");
    expect(me).not.toContain("AUTH_SERVICE_UNAVAILABLE");
    const proxy = readWebSource("src/lib/server/nestApiProxy.ts");
    expect(proxy).toContain("BACKEND_TEMPORARILY_UNAVAILABLE");
    expect(proxy).toContain("retryable: true");
  });

  it("AppShell reconnecting indicator is compact and non-blocking", () => {
    const shell = readWebSource("src/components/app-shell/AppShell.tsx");
    expect(shell).toContain("connectivityDegraded");
    expect(shell).toContain("app-shell-reconnecting");
    expect(shell).toContain("sessionContentReady");
  });
});
