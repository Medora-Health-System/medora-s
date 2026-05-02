import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import type { Observable } from "rxjs";
import { auditContextStorage, type AuditRequestContext } from "./audit-context.storage";

type MsppAssignment = { role: string };

type RequestWithAuditHints = {
  userRole?: string;
  msppContext?: { msppAssignments?: MsppAssignment[] };
};

/**
 * Captures facility `RoleCode` (from `RolesGuard`) or primary MSPP role for the request,
 * so `AuditService` can persist `metadata.actorRole` / `metadata.source` without each caller inventing values.
 */
@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }
    const req = context.switchToHttp().getRequest() as RequestWithAuditHints | undefined;
    if (!req || typeof req !== "object") {
      return next.handle();
    }

    let actorRole: string | undefined;
    if (typeof req.userRole === "string" && req.userRole.trim().length > 0) {
      actorRole = req.userRole.trim();
    } else if (Array.isArray(req.msppContext?.msppAssignments) && req.msppContext.msppAssignments.length > 0) {
      const r = req.msppContext.msppAssignments[0]?.role;
      if (typeof r === "string" && r.trim().length > 0) {
        actorRole = r.trim();
      }
    }

    const store: AuditRequestContext =
      actorRole !== undefined ? { actorRole, source: "UI" } : {};

    return auditContextStorage.run(store, () => next.handle());
  }
}
