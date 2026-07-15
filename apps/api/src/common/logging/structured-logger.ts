import { Logger } from "@nestjs/common";
import { getLogPolicy, nestLevelAllowed } from "./log-policy";
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
      if (!nestLevelAllowed("log")) return;
      nest.log(line(event, meta));
    },
    warn(event: string, meta?: StructuredLogMeta) {
      if (!nestLevelAllowed("warn")) return;
      nest.warn(line(event, meta));
    },
    error(event: string, meta?: StructuredLogMeta) {
      if (!nestLevelAllowed("error")) return;
      nest.error(line(event, meta));
    },
    debug(event: string, meta?: StructuredLogMeta) {
      if (!getLogPolicy().debugEnabled || !nestLevelAllowed("debug")) return;
      nest.debug(line(event, meta));
    },
  };
}
