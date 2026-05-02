import { AsyncLocalStorage } from "node:async_hooks";

/** Request-scoped audit context (set by `AuditContextInterceptor`, read by `AuditService`). */
export type AuditRequestContext = {
  actorRole?: string;
  /** How the action was initiated (never PHI). */
  source?: string;
};

export const auditContextStorage = new AsyncLocalStorage<AuditRequestContext>();
