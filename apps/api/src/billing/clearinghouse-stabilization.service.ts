import { Injectable } from "@nestjs/common";

function readEnvInt(key: string, defaultValue: number): number {
  try {
    const v = process.env[key];
    if (v === undefined || v.trim() === "") return defaultValue;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : defaultValue;
  } catch {
    return defaultValue;
  }
}

const LIVE_TRANSPORTS = new Set(["LIVE_API", "LIVE_SFTP"]);
const NETWORK_TRANSPORTS = new Set(["LIVE_API", "LIVE_SFTP", "SANDBOX_API", "SANDBOX_SFTP"]);

type RollingKind =
  | "duplicate_ack"
  | "duplicate_send"
  | "rate_limit"
  | "throttle"
  | "circuit_block"
  | "concurrent_cap"
  | "dl_replay";

const ROLLING_RETENTION_MS = 24 * 60 * 60 * 1000;

function rollingKindForOutboundBlockCode(code: string): RollingKind | null {
  switch (code) {
    case "LIVE_SEND_CIRCUIT_OPEN":
      return "circuit_block";
    case "SEND_BLOCKED_IN_FLIGHT":
      return "duplicate_send";
    case "LIVE_SEND_CONCURRENT_LIMIT":
      return "concurrent_cap";
    case "LIVE_SEND_RATE_LIMITED":
      return "rate_limit";
    case "LIVE_SEND_THROTTLED":
      return "throttle";
    default:
      return null;
  }
}

/**
 * Phase 8.1 — Per-process pacing, concurrency, in-flight dedupe, live circuit breaker, and ops counters.
 * Multi-instance: each process has independent state; document in `getPacingConfigPublic().distributionNote`.
 */
@Injectable()
export class ClearinghouseStabilizationService {
  private readonly facilitySendTimestamps = new Map<string, number[]>();
  private readonly facilityConcurrent = new Map<string, number>();
  private readonly submissionInFlight = new Set<string>();
  private readonly liveFailureTimestamps = new Map<string, number[]>();
  private readonly circuitOpenUntil = new Map<string, number>();
  private readonly circuitReason = new Map<string, string>();
  private readonly circuitOpenedAt = new Map<string, number>();
  private readonly lastFacilitySendCompletedAt = new Map<string, number>();
  /** Per-facility rolling timestamps for ops (24h window, in-process only). */
  private readonly facilityRolling = new Map<string, Partial<Record<RollingKind, number[]>>>();

  private readonly metrics = {
    duplicateSendBlocked: 0,
    rateLimited: 0,
    circuitBlocked: 0,
    throttleSkipped: 0,
    duplicateAckIgnored: 0,
    deadLetterReplayed: 0,
  };

  getPacingConfigPublic() {
    return {
      maxSendsPerMinute: readEnvInt("CLEARINGHOUSE_MAX_SENDS_PER_MINUTE", 30),
      maxConcurrentSends: readEnvInt("CLEARINGHOUSE_MAX_CONCURRENT_SENDS", 3),
      batchSendLimit: readEnvInt("CLEARINGHOUSE_BATCH_SEND_LIMIT", 50),
      ackPollMaxFilesPerCycle: readEnvInt("CLEARINGHOUSE_ACK_POLL_MAX_FILES_PER_CYCLE", 25),
      sendMinIntervalMs: readEnvInt("CLEARINGHOUSE_SEND_MIN_INTERVAL_MS", 0),
      liveCircuitFailureThreshold: readEnvInt("CLEARINGHOUSE_LIVE_CIRCUIT_FAILURE_THRESHOLD", 5),
      liveCircuitWindowMs: readEnvInt("CLEARINGHOUSE_LIVE_CIRCUIT_WINDOW_MS", 300_000),
      liveCircuitCooldownMs: readEnvInt("CLEARINGHOUSE_LIVE_CIRCUIT_COOLDOWN_MS", 120_000),
      distributionNote:
        "Throttling, concurrency, in-flight locks, and circuit state are per API process only; scale-out requires external coordination for strict global limits.",
    };
  }

  getMetricsSnapshot() {
    return { ...this.metrics };
  }

  private appendRolling(facilityId: string, kind: RollingKind): void {
    const now = Date.now();
    const bucket = this.facilityRolling.get(facilityId) ?? {};
    const prev = bucket[kind] ?? [];
    const next = [...prev.filter((t) => now - t <= ROLLING_RETENTION_MS), now];
    bucket[kind] = next;
    this.facilityRolling.set(facilityId, bucket);
  }

  private countRolling(facilityId: string, kind: RollingKind, windowMs: number): number {
    const now = Date.now();
    const arr = this.facilityRolling.get(facilityId)?.[kind] ?? [];
    return arr.filter((t) => now - t <= windowMs).length;
  }

  /** Rolling facility-scoped counters for ops (in-process; see pacing `distributionNote`). */
  getRollingSnapshotForFacility(facilityId: string, windowMs: number = ROLLING_RETENTION_MS) {
    return {
      recentDuplicateAckCount: this.countRolling(facilityId, "duplicate_ack", windowMs),
      recentDuplicateSendBlockedCount: this.countRolling(facilityId, "duplicate_send", windowMs),
      recentRateLimitedSendCount: this.countRolling(facilityId, "rate_limit", windowMs),
      recentThrottleSkips: this.countRolling(facilityId, "throttle", windowMs),
      recentCircuitBlockedSendCount: this.countRolling(facilityId, "circuit_block", windowMs),
      recentConcurrentLimitedSendCount: this.countRolling(facilityId, "concurrent_cap", windowMs),
      recentDeadLetterReplays: this.countRolling(facilityId, "dl_replay", windowMs),
    };
  }

  /** DB-level duplicate send guard (idempotency util), not in-flight slot. */
  recordOutboundDuplicateSendDbBlock(facilityId: string): void {
    this.metrics.duplicateSendBlocked += 1;
    this.appendRolling(facilityId, "duplicate_send");
  }

  getLiveCircuitState(facilityId: string): {
    liveCircuitOpen: boolean;
    liveCircuitOpenedAt: string | null;
    liveCircuitReason: string | null;
    liveCircuitOpenUntil: string | null;
  } {
    const until = this.circuitOpenUntil.get(facilityId);
    const now = Date.now();
    if (!until || now >= until) {
      if (until && now >= until) {
        this.circuitOpenUntil.delete(facilityId);
        this.circuitReason.delete(facilityId);
        this.circuitOpenedAt.delete(facilityId);
      }
      return { liveCircuitOpen: false, liveCircuitOpenedAt: null, liveCircuitReason: null, liveCircuitOpenUntil: null };
    }
    const opened = this.circuitOpenedAt.get(facilityId);
    return {
      liveCircuitOpen: true,
      liveCircuitOpenedAt: opened ? new Date(opened).toISOString() : null,
      liveCircuitReason: this.circuitReason.get(facilityId) ?? "LIVE_SEND_CIRCUIT_OPEN",
      liveCircuitOpenUntil: new Date(until).toISOString(),
    };
  }

  recordDuplicateAckIgnored(facilityId: string): void {
    this.metrics.duplicateAckIgnored += 1;
    this.appendRolling(facilityId, "duplicate_ack");
  }

  recordDeadLetterReplayed(facilityId: string): void {
    this.metrics.deadLetterReplayed += 1;
    this.appendRolling(facilityId, "dl_replay");
  }

  recordLiveTransportFailure(facilityId: string): void {
    const now = Date.now();
    const windowMs = readEnvInt("CLEARINGHOUSE_LIVE_CIRCUIT_WINDOW_MS", 300_000);
    const threshold = readEnvInt("CLEARINGHOUSE_LIVE_CIRCUIT_FAILURE_THRESHOLD", 5);
    const cooldown = readEnvInt("CLEARINGHOUSE_LIVE_CIRCUIT_COOLDOWN_MS", 120_000);
    const arr = (this.liveFailureTimestamps.get(facilityId) ?? []).filter((t) => now - t <= windowMs);
    arr.push(now);
    this.liveFailureTimestamps.set(facilityId, arr);
    if (arr.length >= threshold) {
      this.circuitOpenUntil.set(facilityId, now + cooldown);
      this.circuitReason.set(facilityId, "LIVE_SEND_CIRCUIT_OPEN");
      this.circuitOpenedAt.set(facilityId, now);
    }
  }

  recordLiveTransportSuccess(facilityId: string): void {
    this.liveFailureTimestamps.delete(facilityId);
  }

  /**
   * Acquire pacing slot for a network outbound send. Always call `release()` in `finally`
   * after the transport attempt is persisted (success or failure).
   */
  acquireOutboundSlot(
    facilityId: string,
    submissionId: string,
    transportKey: string
  ):
    | { allowed: true; release: (outcome: "completed" | "aborted_before_transport") => void }
    | { allowed: false; code: string } {
    if (!NETWORK_TRANSPORTS.has(transportKey)) {
      return {
        allowed: true,
        release: () => {
          /* no-op for manual/disabled */
        },
      };
    }

    if (LIVE_TRANSPORTS.has(transportKey)) {
      const until = this.circuitOpenUntil.get(facilityId);
      if (until && Date.now() < until) {
        this.metrics.circuitBlocked += 1;
        this.appendRolling(facilityId, "circuit_block");
        return { allowed: false, code: "LIVE_SEND_CIRCUIT_OPEN" };
      }
      if (until && Date.now() >= until) {
        this.circuitOpenUntil.delete(facilityId);
        this.circuitReason.delete(facilityId);
        this.circuitOpenedAt.delete(facilityId);
      }
    }

    if (this.submissionInFlight.has(submissionId)) {
      this.metrics.duplicateSendBlocked += 1;
      const rk = rollingKindForOutboundBlockCode("SEND_BLOCKED_IN_FLIGHT");
      if (rk) this.appendRolling(facilityId, rk);
      return { allowed: false, code: "SEND_BLOCKED_IN_FLIGHT" };
    }

    const maxConcurrent = readEnvInt("CLEARINGHOUSE_MAX_CONCURRENT_SENDS", 3);
    const cur = this.facilityConcurrent.get(facilityId) ?? 0;
    if (cur >= maxConcurrent) {
      this.metrics.duplicateSendBlocked += 1;
      const rk = rollingKindForOutboundBlockCode("LIVE_SEND_CONCURRENT_LIMIT");
      if (rk) this.appendRolling(facilityId, rk);
      return { allowed: false, code: "LIVE_SEND_CONCURRENT_LIMIT" };
    }

    const now = Date.now();
    const maxPerMinute = readEnvInt("CLEARINGHOUSE_MAX_SENDS_PER_MINUTE", 30);
    const window = 60_000;
    const stamps = (this.facilitySendTimestamps.get(facilityId) ?? []).filter((t) => now - t < window);
    if (stamps.length >= maxPerMinute) {
      this.metrics.rateLimited += 1;
      const rk = rollingKindForOutboundBlockCode("LIVE_SEND_RATE_LIMITED");
      if (rk) this.appendRolling(facilityId, rk);
      return { allowed: false, code: "LIVE_SEND_RATE_LIMITED" };
    }

    const minInterval = readEnvInt("CLEARINGHOUSE_SEND_MIN_INTERVAL_MS", 0);
    const lastDone = this.lastFacilitySendCompletedAt.get(facilityId);
    if (minInterval > 0 && lastDone !== undefined && now - lastDone < minInterval) {
      this.metrics.throttleSkipped += 1;
      const rk = rollingKindForOutboundBlockCode("LIVE_SEND_THROTTLED");
      if (rk) this.appendRolling(facilityId, rk);
      return { allowed: false, code: "LIVE_SEND_THROTTLED" };
    }

    this.submissionInFlight.add(submissionId);
    this.facilityConcurrent.set(facilityId, cur + 1);

    const release = (outcome: "completed" | "aborted_before_transport") => {
      this.submissionInFlight.delete(submissionId);
      const c = this.facilityConcurrent.get(facilityId) ?? 1;
      const next = Math.max(0, c - 1);
      if (next === 0) this.facilityConcurrent.delete(facilityId);
      else this.facilityConcurrent.set(facilityId, next);
      if (outcome === "completed") {
        const t = Date.now();
        const arr2 = (this.facilitySendTimestamps.get(facilityId) ?? []).filter((x) => t - x < window);
        arr2.push(t);
        this.facilitySendTimestamps.set(facilityId, arr2);
        this.lastFacilitySendCompletedAt.set(facilityId, t);
      }
    };

    return { allowed: true, release };
  }
}
