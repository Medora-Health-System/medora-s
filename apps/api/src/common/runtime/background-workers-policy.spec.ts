import {
  backgroundWorkersEnabledByDefault,
  registryPrewarmEnabled,
  resolveWorkerEnabledFlag,
} from "./background-workers-policy";

describe("background-workers-policy", () => {
  const keys = [
    "NODE_ENV",
    "MEDORA_BACKGROUND_WORKERS_ENABLED",
    "CLEARINGHOUSE_RETRY_WORKER_ENABLED",
    "MEDORA_REGISTRY_PREWARM_ENABLED",
  ] as const;

  const snapshot: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of keys) {
      snapshot[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of keys) {
      if (snapshot[k] === undefined) delete process.env[k];
      else process.env[k] = snapshot[k];
    }
  });

  it("disables workers by default in test and production", () => {
    process.env.NODE_ENV = "test";
    expect(backgroundWorkersEnabledByDefault()).toBe(false);
    process.env.NODE_ENV = "production";
    expect(backgroundWorkersEnabledByDefault()).toBe(false);
  });

  it("enables workers by default in development when unset", () => {
    process.env.NODE_ENV = "development";
    expect(backgroundWorkersEnabledByDefault()).toBe(true);
  });

  it("respects MEDORA_BACKGROUND_WORKERS_ENABLED over legacy defaults", () => {
    process.env.NODE_ENV = "development";
    process.env.MEDORA_BACKGROUND_WORKERS_ENABLED = "false";
    expect(
      resolveWorkerEnabledFlag("CLEARINGHOUSE_RETRY_WORKER_ENABLED", {
        legacyNonProductionDefault: true,
      })
    ).toBe(false);
  });

  it("skips registry prewarm in test unless explicitly enabled", () => {
    process.env.NODE_ENV = "test";
    expect(registryPrewarmEnabled()).toBe(false);
    process.env.MEDORA_REGISTRY_PREWARM_ENABLED = "true";
    expect(registryPrewarmEnabled()).toBe(true);
  });
});
