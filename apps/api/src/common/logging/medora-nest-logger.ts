import { ConsoleLogger, type LogLevel } from "@nestjs/common";
import {
  getLogPolicy,
  shouldEmitNestFrameworkLog,
  type NestLogLevel,
} from "./log-policy";

/**
 * Nest Logger that applies Medora production log policy:
 * - respects MEDORA_LOG_LEVEL / environment nestLevels
 * - suppresses RoutesResolver / RouterExplorer noise unless MEDORA_LOG_STARTUP_ROUTES
 * - never suppresses error/warn when those levels are enabled
 */
export class MedoraNestLogger extends ConsoleLogger {
  constructor() {
    const policy = getLogPolicy();
    super("Medora", { logLevels: policy.nestLevels as LogLevel[] });
  }

  private allow(level: NestLogLevel, context?: string): boolean {
    return shouldEmitNestFrameworkLog(level, context ?? this.context, getLogPolicy());
  }

  override log(message: unknown, context?: string): void {
    if (!this.allow("log", typeof context === "string" ? context : undefined)) return;
    super.log(message as string, context);
  }

  override error(message: unknown, stackOrContext?: string, context?: string): void {
    const ctx = typeof context === "string" ? context : typeof stackOrContext === "string" && !stackOrContext.includes("\n") ? stackOrContext : undefined;
    if (!this.allow("error", ctx)) return;
    super.error(message as string, stackOrContext, context);
  }

  override warn(message: unknown, context?: string): void {
    if (!this.allow("warn", typeof context === "string" ? context : undefined)) return;
    super.warn(message as string, context);
  }

  override debug(message: unknown, context?: string): void {
    if (!this.allow("debug", typeof context === "string" ? context : undefined)) return;
    super.debug(message as string, context);
  }

  override verbose(message: unknown, context?: string): void {
    if (!this.allow("verbose", typeof context === "string" ? context : undefined)) return;
    super.verbose(message as string, context);
  }
}
