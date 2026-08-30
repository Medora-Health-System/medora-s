/**
 * Off-thread medication catalog prewarm. Runs the existing shared registry builder
 * in a worker so the API event loop can serve health and auth during startup.
 */
import { parentPort } from "node:worker_threads";
import {
  prewarmProviderOrderableCatalogCodesRegistry,
  snapshotProviderOrderableCatalogCodesRegistry,
} from "@medora/shared";

prewarmProviderOrderableCatalogCodesRegistry();
parentPort?.postMessage(snapshotProviderOrderableCatalogCodesRegistry());
