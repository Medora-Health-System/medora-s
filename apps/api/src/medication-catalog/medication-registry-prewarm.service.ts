import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Worker } from "node:worker_threads";
import { join } from "node:path";
import {
  hydrateProviderOrderableCatalogCodesRegistry,
  type ProviderOrderableCatalogCodesSnapshot,
} from "@medora/shared";
import { getLogPolicy } from "../common/logging/log-policy";
import { createStructuredLogger } from "../common/logging/structured-logger";
import { registryPrewarmEnabled } from "../common/runtime/background-workers-policy";
import { markOptionalPrewarmRuntime } from "../common/runtime/runtime-availability.state";

const log = createStructuredLogger("MedicationRegistryPrewarm");

/** Bound so a hung worker cannot pin a replica forever. Does not affect readiness. */
const PREWARM_WORKER_TIMEOUT_MS = 180_000;

let activePrewarmWorker: Worker | null = null;
let prewarmTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Nest OnModuleInit must stay non-blocking. Prewarm runs after app.listen via
 * startOptionalMedicationRegistryPrewarm().
 */
@Injectable()
export class MedicationRegistryPrewarmService implements OnModuleInit, OnModuleDestroy {
  onModuleInit(): void {
    log.log("medication_prewarm_deferred_until_listen", {
      enabled: registryPrewarmEnabled(),
    });
  }

  onModuleDestroy(): void {
    stopOptionalMedicationRegistryPrewarm();
  }
}

function clearPrewarmTimeout(): void {
  if (prewarmTimeout) {
    clearTimeout(prewarmTimeout);
    prewarmTimeout = null;
  }
}

function releaseWorker(worker: Worker | null): void {
  if (activePrewarmWorker === worker) {
    activePrewarmWorker = null;
  }
}

function terminateWorker(worker: Worker | null): void {
  if (!worker) return;
  releaseWorker(worker);
  try {
    void worker.terminate();
  } catch {
    /* shutdown / timeout must not throw */
  }
}

function isUsablePrewarmSnapshot(snapshot: ProviderOrderableCatalogCodesSnapshot | null | undefined): boolean {
  if (!snapshot || typeof snapshot !== "object") return false;
  if (!Array.isArray(snapshot.merged) || snapshot.merged.length === 0) return false;
  if (
    snapshot.activeByDomain == null ||
    typeof snapshot.activeByDomain !== "object" ||
    Array.isArray(snapshot.activeByDomain)
  ) {
    return false;
  }
  if (
    snapshot.priorByDomain == null ||
    typeof snapshot.priorByDomain !== "object" ||
    Array.isArray(snapshot.priorByDomain)
  ) {
    return false;
  }
  return Object.keys(snapshot.activeByDomain).length > 0;
}

function applySnapshot(snapshot: ProviderOrderableCatalogCodesSnapshot, started: number): boolean {
  if (!isUsablePrewarmSnapshot(snapshot)) {
    failPrewarm(started, "invalid_or_empty_snapshot");
    return false;
  }
  hydrateProviderOrderableCatalogCodesRegistry(snapshot);
  const durationMs = Date.now() - started;
  const meta = {
    durationMs,
    activeCodeCount: snapshot.merged.length,
  };
  markOptionalPrewarmRuntime("completed");
  const warnMs = getLogPolicy().prewarmWarnMs;
  if (durationMs >= warnMs) {
    log.warn("medication_prewarm_completed", { ...meta, slow: true });
    log.warn("provider_orderable_catalog_codes_prewarmed_slow", meta);
  } else {
    log.log("medication_prewarm_completed", meta);
    log.log("provider_orderable_catalog_codes_prewarmed", meta);
  }
  return true;
}

function failPrewarm(started: number, reason: string): void {
  markOptionalPrewarmRuntime("failed");
  log.warn("medication_prewarm_failed", {
    durationMs: Date.now() - started,
    reason,
  });
}

/**
 * Terminate optional catalog prewarm on SIGTERM / module destroy.
 * Timeout handles and the worker must not keep Node alive after drain.
 */
export function stopOptionalMedicationRegistryPrewarm(): void {
  clearPrewarmTimeout();
  terminateWorker(activePrewarmWorker);
}

/**
 * Start optional catalog prewarm AFTER HTTP listen / readiness.
 * Failure is non-fatal: catalog routes still lazy-load the same registry.
 */
export function startOptionalMedicationRegistryPrewarm(): void {
  if (!registryPrewarmEnabled()) {
    log.log("provider_orderable_catalog_codes_prewarm_skipped", {
      reason: "disabled_for_test_or_env",
    });
    return;
  }
  if (activePrewarmWorker) {
    return;
  }

  markOptionalPrewarmRuntime("started");
  log.log("medication_prewarm_started", {});
  const started = Date.now();
  const workerPath = join(__dirname, "medication-registry-prewarm.worker.js");
  let settled = false;

  const settleFail = (reason: string) => {
    if (settled) return;
    settled = true;
    failPrewarm(started, reason);
  };

  let worker: Worker;
  try {
    worker = new Worker(workerPath);
  } catch (err) {
    settleFail(err instanceof Error ? err.name : "worker_spawn_failed");
    return;
  }

  worker.unref();
  activePrewarmWorker = worker;

  const timeout = setTimeout(() => {
    prewarmTimeout = null;
    terminateWorker(worker);
    settleFail("timeout");
  }, PREWARM_WORKER_TIMEOUT_MS);
  timeout.unref();
  prewarmTimeout = timeout;

  worker.once("message", (snapshot: ProviderOrderableCatalogCodesSnapshot) => {
    clearPrewarmTimeout();
    if (settled) {
      terminateWorker(worker);
      return;
    }
    settled = true;
    try {
      applySnapshot(snapshot, started);
    } catch (err) {
      failPrewarm(started, err instanceof Error ? err.name : "hydrate_failed");
    } finally {
      terminateWorker(worker);
    }
  });

  worker.once("error", (err) => {
    clearPrewarmTimeout();
    terminateWorker(worker);
    settleFail(err instanceof Error ? err.name : "worker_error");
  });

  worker.once("exit", (code) => {
    clearPrewarmTimeout();
    releaseWorker(worker);
    if (code !== 0 && code !== null) {
      settleFail(`worker_exit_${code}`);
    }
  });
}
