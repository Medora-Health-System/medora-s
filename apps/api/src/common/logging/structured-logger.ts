import { Logger } from "@nestjs/common";
import { redactPHI } from "./redact-phi";

export type StructuredLogMeta = Record<string, unknown>;

/**
 * Nest-backed structured logs: one JSON line per entry, event name first, meta redacted.
 * Never pass raw Prisma payloads, clinical text, or user emails — use ids/codes only.
 */
export function createStructuredLogger(context: string) {
  const nest = new Logger(context);

  function line(event: string, meta?: StructuredLogMeta): string {
    if (meta === undefined || Object.keys(meta).length === 0) {
      return JSON.stringify({ event });
    }
    const safe = redactPHI(meta) as StructuredLogMeta;
    return JSON.stringify({ event, ...safe });
  }

  return {
    log(event: string, meta?: StructuredLogMeta) {
      nest.log(line(event, meta));
    },
    warn(event: string, meta?: StructuredLogMeta) {
      nest.warn(line(event, meta));
    },
    error(event: string, meta?: StructuredLogMeta) {
      nest.error(line(event, meta));
    },
  };
}
