import { Injectable } from "@nestjs/common";

const MAX_TIMESTAMPS = 2000;
const DEFAULT_WINDOW_MS = 24 * 3600_000;

/**
 * S17D — in-process rolling record of HTTP 5xx responses (no PHI, no DB).
 * Used by GET /admin/system-health metrics.recent5xxCount.
 */
@Injectable()
export class RecentHttpErrorMetricsService {
  private readonly timestamps: number[] = [];

  record5xx(): void {
    const now = Date.now();
    this.timestamps.push(now);
    while (this.timestamps.length > MAX_TIMESTAMPS) {
      this.timestamps.shift();
    }
  }

  /** Count of 5xx responses since `now - windowMs` (default 24h). */
  countRecent(windowMs: number = DEFAULT_WINDOW_MS): number {
    const cutoff = Date.now() - windowMs;
    let i = 0;
    while (i < this.timestamps.length && this.timestamps[i]! < cutoff) {
      i += 1;
    }
    if (i > 0) {
      this.timestamps.splice(0, i);
    }
    return this.timestamps.length;
  }
}
