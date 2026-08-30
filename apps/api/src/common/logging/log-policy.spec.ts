import {
  getLogPolicy,
  isQuietHttpPath,
  resetLogPolicyCache,
  resolveLogPolicy,
  schedulerCompletionLevel,
  shouldEmitNestFrameworkLog,
  shouldLogHttpRequest,
} from "./log-policy";
import { createLogDedupGate } from "./log-dedup";
import { redactPHI } from "./redact-phi";

describe("Medora production log policy", () => {
  const prevEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...prevEnv };
    resetLogPolicyCache();
  });

  describe("environment defaults", () => {
    it("production excludes debug/verbose and disables startup routes + http success + scheduler noop", () => {
      const policy = resolveLogPolicy({ NODE_ENV: "production" });
      expect(policy.nestLevels).toEqual(["error", "warn", "log"]);
      expect(policy.startupRoutesEnabled).toBe(false);
      expect(policy.httpSuccessEnabled).toBe(false);
      expect(policy.schedulerNoopEnabled).toBe(false);
      expect(policy.debugEnabled).toBe(false);
    });

    it("development retains debug", () => {
      const policy = resolveLogPolicy({ NODE_ENV: "development" });
      expect(policy.nestLevels).toContain("debug");
      expect(policy.startupRoutesEnabled).toBe(true);
      expect(policy.httpSuccessEnabled).toBe(true);
    });

    it("test environment is quiet by default", () => {
      const policy = resolveLogPolicy({ NODE_ENV: "test" });
      expect(policy.nestLevels).toEqual(["error", "warn", "log"]);
      expect(policy.debugEnabled).toBe(false);
      expect(policy.httpSuccessEnabled).toBe(false);
      expect(policy.schedulerNoopEnabled).toBe(false);
      expect(policy.startupRoutesEnabled).toBe(false);
      expect(shouldEmitNestFrameworkLog("log", "RoutesResolver", policy)).toBe(false);
    });

    it("MEDORA_LOG_LEVEL overrides nest levels", () => {
      expect(resolveLogPolicy({ NODE_ENV: "production", MEDORA_LOG_LEVEL: "warn" }).nestLevels).toEqual([
        "error",
        "warn",
      ]);
      expect(resolveLogPolicy({ NODE_ENV: "production", MEDORA_LOG_LEVEL: "debug" }).debugEnabled).toBe(
        true,
      );
    });
  });

  describe("Nest startup noise", () => {
    it("production logger excludes route-mapping noise", () => {
      const policy = resolveLogPolicy({ NODE_ENV: "production" });
      expect(shouldEmitNestFrameworkLog("log", "RoutesResolver", policy)).toBe(false);
      expect(shouldEmitNestFrameworkLog("log", "RouterExplorer", policy)).toBe(false);
      expect(shouldEmitNestFrameworkLog("log", "Bootstrap", policy)).toBe(true);
      expect(shouldEmitNestFrameworkLog("error", "RoutesResolver", policy)).toBe(true);
      expect(shouldEmitNestFrameworkLog("warn", "RouterExplorer", policy)).toBe(true);
    });

    it("development retains route mapping when startup routes enabled", () => {
      const policy = resolveLogPolicy({ NODE_ENV: "development" });
      expect(shouldEmitNestFrameworkLog("log", "RoutesResolver", policy)).toBe(true);
    });
  });

  describe("HTTP request logging", () => {
    const prod = resolveLogPolicy({ NODE_ENV: "production" });

    it("does not log routine successful 200 by default", () => {
      expect(
        shouldLogHttpRequest(
          { method: "GET", path: "/patients", statusCode: 200, durationMs: 12 },
          prod,
        ),
      ).toBe(false);
    });

    it("always logs 5xx", () => {
      expect(
        shouldLogHttpRequest(
          { method: "GET", path: "/patients", statusCode: 500, durationMs: 5 },
          prod,
        ),
      ).toBe(true);
    });

    it("logs slow requests", () => {
      expect(
        shouldLogHttpRequest(
          { method: "GET", path: "/patients", statusCode: 200, durationMs: 5_000 },
          prod,
        ),
      ).toBe(true);
    });

    it("excludes health/static/HEAD", () => {
      expect(isQuietHttpPath("/health")).toBe(true);
    expect(isQuietHttpPath("/health/live")).toBe(true);
    expect(isQuietHttpPath("/health/ready")).toBe(true);
      expect(isQuietHttpPath("/favicon.ico")).toBe(true);
      expect(
        shouldLogHttpRequest(
          { method: "GET", path: "/health", statusCode: 200, durationMs: 1 },
          prod,
        ),
      ).toBe(false);
      expect(
        shouldLogHttpRequest(
          { method: "HEAD", path: "/patients", statusCode: 200, durationMs: 1 },
          prod,
        ),
      ).toBe(false);
    });

    it("preserves requestId fields when logging (caller responsibility smoke)", () => {
      // Policy does not strip requestId — middleware still attaches it when logging.
      expect(prod.httpSuccessEnabled).toBe(false);
      expect(
        shouldLogHttpRequest(
          { method: "POST", path: "/auth/login", statusCode: 401, durationMs: 8 },
          prod,
        ),
      ).toBe(true);
    });

    it("samples successful requests when enabled", () => {
      const sampled = resolveLogPolicy({
        NODE_ENV: "production",
        MEDORA_LOG_HTTP_SUCCESS: "true",
        MEDORA_LOG_SAMPLE_RATE: "0.5",
      });
      expect(
        shouldLogHttpRequest(
          {
            method: "GET",
            path: "/patients",
            statusCode: 200,
            durationMs: 10,
            random: () => 0.1,
          },
          sampled,
        ),
      ).toBe(true);
      expect(
        shouldLogHttpRequest(
          {
            method: "GET",
            path: "/patients",
            statusCode: 200,
            durationMs: 10,
            random: () => 0.9,
          },
          sampled,
        ),
      ).toBe(false);
    });
  });

  describe("scheduler completion levels", () => {
    it("zero-change runs do not log at INFO in production", () => {
      const policy = resolveLogPolicy({ NODE_ENV: "production" });
      expect(schedulerCompletionLevel(0, policy)).toBe("suppress");
    });

    it("changed-record runs log one INFO summary", () => {
      const policy = resolveLogPolicy({ NODE_ENV: "production" });
      expect(schedulerCompletionLevel(3, policy)).toBe("log");
    });

    it("noop can be debug when explicitly enabled", () => {
      const policy = resolveLogPolicy({
        NODE_ENV: "production",
        MEDORA_LOG_SCHEDULER_NOOP: "true",
        MEDORA_LOG_LEVEL: "debug",
      });
      expect(schedulerCompletionLevel(0, policy)).toBe("debug");
    });
  });

  describe("deduplication", () => {
    it("duplicate suppression is bounded", () => {
      let t = 0;
      const gate = createLogDedupGate({
        intervalMs: 1_000,
        maxKeys: 3,
        now: () => t,
      });
      expect(gate.allow("a")).toBe(true);
      expect(gate.allow("a")).toBe(false);
      t = 2_000;
      expect(gate.allow("a")).toBe(true);
      expect(gate.allow("b")).toBe(true);
      expect(gate.allow("c")).toBe(true);
      expect(gate.allow("d")).toBe(true);
      expect(gate.size()).toBeLessThanOrEqual(3);
    });

    it("unique error keys are never dropped by a fresh gate", () => {
      const gate = createLogDedupGate({ intervalMs: 60_000 });
      expect(gate.allow("error:TypeError:pdfkit")).toBe(true);
      expect(gate.allow("error:TypeError:other")).toBe(true);
    });
  });

  describe("PHI and secrets", () => {
    it("redacts PHI and secrets", () => {
      const redacted = redactPHI({
        firstName: "Ada",
        mrn: "M-1",
        email: "ada@example.com",
        authorization: "Bearer secret",
        cookie: "session=abc",
        databaseUrl: "postgres://u:p@host/db",
        webhookUrl: "https://hooks.example/x",
        sftpPassword: "pw",
        requestId: "req-1",
        statusCode: 500,
      }) as Record<string, unknown>;
      expect(redacted.firstName).toBe("[REDACTED]");
      expect(redacted.mrn).toBe("[REDACTED]");
      expect(redacted.email).toBe("[REDACTED]");
      expect(redacted.authorization).toBe("[REDACTED]");
      expect(redacted.cookie).toBe("[REDACTED]");
      expect(redacted.databaseUrl).toBe("[REDACTED]");
      expect(redacted.webhookUrl).toBe("[REDACTED]");
      expect(redacted.sftpPassword).toBe("[REDACTED]");
      expect(redacted.requestId).toBe("req-1");
      expect(redacted.statusCode).toBe(500);
    });

    it("does not embed raw environment secrets into resolved policy snapshots", () => {
      process.env.DATABASE_URL = "postgres://user:hunter2@db/medora";
      process.env.JWT_SECRET = "super-secret-value";
      resetLogPolicyCache();
      const policy = getLogPolicy();
      const snap = JSON.stringify(policy);
      expect(snap).not.toContain("hunter2");
      expect(snap).not.toContain("super-secret-value");
      expect(snap).not.toContain("postgres://");
    });
  });
});
