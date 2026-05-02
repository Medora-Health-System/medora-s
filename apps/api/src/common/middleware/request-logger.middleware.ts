import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { queueMedoraAlert } from "../logging/medoraAlert";
import { logInfo } from "../logging/medoraLogger";
import { RecentHttpErrorMetricsService } from "../metrics/recent-http-error-metrics.service";

type ReqWithMeta = Request & { requestId?: string; facilityId?: string; user?: { userId?: string } };

/**
 * S17A — one line per HTTP response (method, path, status, duration). Path is query-stripped.
 * Does not read bodies (no PHI).
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private readonly httpErrorMetrics: RecentHttpErrorMetricsService) {}

  use(req: ReqWithMeta, res: Response, next: NextFunction): void {
    const start = Date.now();
    const rawUrl = req.originalUrl ?? req.url ?? "";
    const path = rawUrl.split("?")[0] || "/";

    res.on("finish", () => {
      logInfo("http_request", {
        action: "http.request",
        requestId: typeof req.requestId === "string" ? req.requestId : undefined,
        method: req.method,
        path,
        statusCode: res.statusCode,
        durationMs: Date.now() - start,
      });
      if (res.statusCode >= 500) {
        this.httpErrorMetrics.record5xx();
        const r = req as ReqWithMeta;
        queueMedoraAlert({
          event: "http_request_5xx",
          severity: "critical",
          statusCode: res.statusCode,
          requestId: typeof r.requestId === "string" ? r.requestId : undefined,
          route: `${req.method} ${path}`,
          facilityId: typeof r.facilityId === "string" ? r.facilityId : undefined,
          userId: typeof r.user?.userId === "string" ? r.user.userId : undefined,
        });
      }
    });

    next();
  }
}
