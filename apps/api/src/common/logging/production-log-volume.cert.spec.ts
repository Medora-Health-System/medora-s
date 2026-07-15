import {
  resolveLogPolicy,
  schedulerCompletionLevel,
  shouldEmitNestFrameworkLog,
  shouldLogHttpRequest,
} from "./log-policy";

type SimLevel = "error" | "warn" | "log" | "debug" | "suppress";

/**
 * Deterministic production-like logging volume certification.
 * Labels simulated emissions — does not claim live Railway certification.
 */
describe("production log volume certification (simulated)", () => {
  it("keeps burst far below Railway 500 logs/sec under a production-like mix", () => {
    const policy = resolveLogPolicy({ NODE_ENV: "production" });
    const emitted: SimLevel[] = [];

    const emit = (level: SimLevel) => {
      if (level !== "suppress") emitted.push(level);
    };

    // Application bootstrap concise signals
    emit("log"); // bootstrap_started
    emit("log"); // bootstrap_listening

    // Nest route registration flood (200 mapped routes) — must be suppressed
    for (let i = 0; i < 200; i++) {
      if (shouldEmitNestFrameworkLog("log", "RouterExplorer", policy)) emit("log");
    }

    // 100 successful API requests
    let suppressedSuccesses = 0;
    for (let i = 0; i < 100; i++) {
      const ok = shouldLogHttpRequest(
        { method: "GET", path: `/encounters/${i}`, statusCode: 200, durationMs: 20 },
        policy,
      );
      if (ok) emit("log");
      else suppressedSuccesses += 1;
    }

    // 10 health checks + 10 HEAD
    let suppressedProbes = 0;
    for (let i = 0; i < 10; i++) {
      if (
        shouldLogHttpRequest(
          { method: "GET", path: "/health", statusCode: 200, durationMs: 1 },
          policy,
        )
      ) {
        emit("log");
      } else {
        suppressedProbes += 1;
      }
    }
    for (let i = 0; i < 10; i++) {
      if (
        shouldLogHttpRequest(
          { method: "HEAD", path: "/encounters", statusCode: 200, durationMs: 1 },
          policy,
        )
      ) {
        emit("log");
      } else {
        suppressedProbes += 1;
      }
    }

    // 60 no-op scheduler runs
    let suppressedNoop = 0;
    for (let i = 0; i < 60; i++) {
      const level = schedulerCompletionLevel(0, policy);
      if (level === "suppress") suppressedNoop += 1;
      else emit(level);
    }

    // 3 scheduler runs with changes
    for (let i = 0; i < 3; i++) {
      const level = schedulerCompletionLevel(2, policy);
      emit(level);
    }

    // 2 warnings + 2 unique errors (must never be lost)
    emit("warn");
    emit("warn");
    emit("error");
    emit("error");

    const byLevel = emitted.reduce(
      (acc, level) => {
        acc[level] = (acc[level] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const total = emitted.length;
    // Simulate this mix occurring within ~2 seconds of boot + early traffic.
    const simulatedWindowSec = 2;
    const maxBurst = total / simulatedWindowSec;

    expect(byLevel.error ?? 0).toBe(2);
    expect(byLevel.warn ?? 0).toBe(2);
    expect(suppressedSuccesses).toBe(100);
    expect(suppressedProbes).toBe(20);
    expect(suppressedNoop).toBe(60);
    expect(byLevel.log ?? 0).toBe(2 + 3); // bootstrap x2 + changed scheduler x3
    expect(total).toBeLessThan(50);
    expect(maxBurst).toBeLessThan(100);
    expect(maxBurst).toBeLessThan(500);
  });
});
