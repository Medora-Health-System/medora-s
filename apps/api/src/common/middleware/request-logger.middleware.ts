import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { queueMedoraAlert } from "../logging/medoraAlert";
import { shouldLogHttpRequest } from "../logging/log-policy";
import { logInfo } from "../logging/medoraLogger";
import { RecentHttpErrorMetricsService } from "../metrics/recent-http-error-metrics.service";

type ReqWithMeta = Request & { requestId?: string; facilityId?: string; user?: { userId?: string } };

/**
 * PHI-safe HTTP access log: method, normalized path, status, duration, requestId.
 * Production policy skips routine 2xx, health/static/HEAD; always logs 5xx and slow requests.
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private readonly httpErrorMetrics: RecentHttpErrorMetricsService) {}

  use(req: ReqWithMeta, res: Response, next: NextFunction): void {
    const start = Date.now();
    const rawUrl = req.originalUrl ?? req.url ?? "";
    const path = rawUrl.split("?")[0] || "/";

    res.on("finish", () => {
      const statusCode = res.statusCode;
      const durationMs = Date.now() - start;
      const requestId = typeof req.requestId === "string" ? req.requestId : undefined;

      if (
        shouldLogHttpRequest({
          method: req.method,
          path,
          statusCode,
          durationMs,
        })
      ) {
        logInfo("http_request", {
          action: "http.request",
          requestId,
          method: req.method,
          path,
          statusCode,
          durationMs,
        });
      }

      if (statusCode >= 500) {
        this.httpErrorMetrics.record5xx();
        const r = req as ReqWithMeta;
        queueMedoraAlert({
          event: "http_request_5xx",
          severity: "critical",
          statusCode,
          requestId,
          route: `${req.method} ${path}`,
          facilityId: typeof r.facilityId === "string" ? r.facilityId : undefined,
          userId: typeof r.user?.userId === "string" ? r.user.userId : undefined,
        });
      }
    });

    next();
  }
}
