import { readFileSync } from "fs";
import { join } from "path";

const mainSrc = readFileSync(join(__dirname, "main.ts"), "utf8");
const prewarmSrc = readFileSync(
  join(__dirname, "medication-catalog/medication-registry-prewarm.service.ts"),
  "utf8"
);

describe("PLAT.AVAIL.1A bootstrap listen vs optional prewarm", () => {
  const bootstrapFn = mainSrc.slice(
    mainSrc.indexOf("async function bootstrap"),
    mainSrc.indexOf("void bootstrap()")
  );

  it("enables Nest shutdown hooks", () => {
    expect(mainSrc).toContain("app.enableShutdownHooks()");
  });

  it("starts HTTP listen before optional medication prewarm", () => {
    const events = [
      "bootstrap_started",
      "NestFactory.create",
      "markCriticalDependenciesReady",
      "critical_dependencies_ready",
      "await app.listen",
      "bootstrap_listening",
      "startOptionalMedicationRegistryPrewarm();",
    ];
    let last = -1;
    for (const token of events) {
      const idx = bootstrapFn.indexOf(token);
      expect(idx).toBeGreaterThan(last);
      last = idx;
    }
  });

  it("emits required startup timing events", () => {
    expect(mainSrc).toContain('bootstrap_started');
    expect(mainSrc).toContain('critical_dependencies_ready');
    expect(mainSrc).toContain('bootstrap_listening');
    expect(prewarmSrc).toContain("medication_prewarm_started");
    expect(prewarmSrc).toContain("medication_prewarm_completed");
    expect(prewarmSrc).toContain("medication_prewarm_failed");
  });

  it("does not await prewarm inside OnModuleInit", () => {
    expect(prewarmSrc).toContain("onModuleInit(): void");
    expect(prewarmSrc).toContain("medication_prewarm_deferred_until_listen");
    const onModuleInitBlock = prewarmSrc.slice(
      prewarmSrc.indexOf("onModuleInit(): void"),
      prewarmSrc.indexOf("onModuleDestroy")
    );
    expect(onModuleInitBlock).not.toContain("prewarmProviderOrderableCatalogCodesRegistry(");
    expect(onModuleInitBlock).not.toContain("new Worker");
  });

  it("prewarm worker failure is non-fatal to readiness", () => {
    expect(prewarmSrc).toContain("failPrewarm");
    expect(prewarmSrc).toContain("Does not affect readiness");
  });

  it("terminates the prewarm worker on timeout, error, and shutdown", () => {
    expect(prewarmSrc).toContain("stopOptionalMedicationRegistryPrewarm");
    expect(prewarmSrc).toContain("OnModuleDestroy");
    expect(prewarmSrc).toContain("onModuleDestroy(): void");
    expect(prewarmSrc).toContain("worker.unref()");
    expect(prewarmSrc).toContain("timeout.unref()");
    expect(prewarmSrc).toContain("PREWARM_WORKER_TIMEOUT_MS");
    expect(prewarmSrc).toContain("settleFail(\"timeout\")");
    expect(prewarmSrc).toContain("terminateWorker(worker)");
    expect(prewarmSrc).toContain("invalid_or_empty_snapshot");
  });

  it("background schedulers clear timers on module destroy", () => {
    const horizon = readFileSync(
      join(__dirname, "medication-dose/medication-dose-horizon-maintenance.service.ts"),
      "utf8"
    );
    const promotion = readFileSync(
      join(__dirname, "medication-dose/medication-dose-status-promotion.service.ts"),
      "utf8"
    );
    const claimRetry = readFileSync(
      join(__dirname, "billing/claim-retry-worker.service.ts"),
      "utf8"
    );
    const sftp = readFileSync(
      join(__dirname, "billing/ack-sftp-poller.service.ts"),
      "utf8"
    );
    const billingAuto = readFileSync(
      join(__dirname, "billing/external-billing-automation.service.ts"),
      "utf8"
    );
    for (const src of [horizon, promotion, claimRetry, sftp, billingAuto]) {
      expect(src).toContain("onModuleDestroy");
      expect(src).toContain("clearInterval");
    }
  });
});
