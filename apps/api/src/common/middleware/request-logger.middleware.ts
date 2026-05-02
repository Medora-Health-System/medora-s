import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { logInfo } from "../logging/medoraLogger";

type ReqWithMeta = Request & { requestId?: string };

/**
 * S17A — one line per HTTP response (method, path, status, duration). Path is query-stripped.
 * Does not read bodies (no PHI).
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
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
    });

    next();
  }
}
