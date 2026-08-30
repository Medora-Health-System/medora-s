/**
 * Process-local availability flags for liveness/readiness.
 * Not a second health system — AppController projects these to HTTP.
 */

export type SchemaGuardRuntimeState = "pending" | "ok" | "skipped" | "failed";
export type OptionalPrewarmRuntimeState = "idle" | "started" | "completed" | "failed";

const bootStartedAt = Date.now();

let schemaGuard: SchemaGuardRuntimeState = "pending";
let httpListening = false;
let criticalDependenciesReady = false;
let optionalPrewarm: OptionalPrewarmRuntimeState = "idle";
let readinessAchievedLogged = false;

export function resetRuntimeAvailabilityStateForTests(): void {
  schemaGuard = "pending";
  httpListening = false;
  criticalDependenciesReady = false;
  optionalPrewarm = "idle";
  readinessAchievedLogged = false;
}

export function markSchemaGuardRuntime(state: Exclude<SchemaGuardRuntimeState, "pending">): void {
  schemaGuard = state;
}

export function markCriticalDependenciesReady(): void {
  criticalDependenciesReady = true;
}

export function markHttpListening(): void {
  httpListening = true;
}

export function markOptionalPrewarmRuntime(state: OptionalPrewarmRuntimeState): void {
  optionalPrewarm = state;
}

export function getSchemaGuardRuntimeState(): SchemaGuardRuntimeState {
  return schemaGuard;
}

export function isHttpListening(): boolean {
  return httpListening;
}

export function isCriticalDependenciesReady(): boolean {
  return criticalDependenciesReady;
}

export function getOptionalPrewarmRuntimeState(): OptionalPrewarmRuntimeState {
  return optionalPrewarm;
}

export function bootElapsedMs(): number {
  return Date.now() - bootStartedAt;
}

/** Ready for production traffic: Nest critical path + schema guard not failed. Optional prewarm is NOT required. */
export function isCriticalPathReady(): boolean {
  if (schemaGuard === "failed" || schemaGuard === "pending") return false;
  return criticalDependenciesReady;
}

export function consumeReadinessAchievedLogOnce(): boolean {
  if (readinessAchievedLogged) return false;
  readinessAchievedLogged = true;
  return true;
}
