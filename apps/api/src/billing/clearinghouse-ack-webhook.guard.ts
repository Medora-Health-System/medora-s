import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";

function readEnv(key: string): string | undefined {
  try {
    const v = process.env[key];
    return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
  } catch {
    return undefined;
  }
}

function envBool(key: string, defaultValue: boolean): boolean {
  const v = readEnv(key);
  if (v === undefined) return defaultValue;
  const s = v.toLowerCase();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return defaultValue;
}

/**
 * Authenticates clearinghouse ACK webhook via shared secret header (no JWT).
 * Requires CLEARINGHOUSE_ACK_WEBHOOK_ENABLED=true and CLEARINGHOUSE_ACK_WEBHOOK_SECRET.
 */
@Injectable()
export class ClearinghouseAckWebhookGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (!envBool("CLEARINGHOUSE_ACK_WEBHOOK_ENABLED", false)) {
      throw new ForbiddenException("ACK webhook ingestion is disabled");
    }
    const secret = readEnv("CLEARINGHOUSE_ACK_WEBHOOK_SECRET");
    if (!secret?.trim()) {
      throw new ForbiddenException("ACK webhook is not configured");
    }
    const req = context.switchToHttp().getRequest<Request & { headers: Record<string, unknown> }>();
    const h =
      (typeof req.headers["x-clearinghouse-ack-secret"] === "string" && req.headers["x-clearinghouse-ack-secret"]) ||
      (typeof req.headers["X-Clearinghouse-Ack-Secret"] === "string" && req.headers["X-Clearinghouse-Ack-Secret"]);
    if (!h || h !== secret) {
      throw new UnauthorizedException("Invalid webhook secret");
    }
    return true;
  }
}
