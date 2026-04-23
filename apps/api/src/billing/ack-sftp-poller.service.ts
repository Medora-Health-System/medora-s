import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import SftpClient from "ssh2-sftp-client";
import { createStructuredLogger } from "../common/logging/structured-logger";
import {
  clearinghouseAckSftpPollGloballyEnabled,
  getClearinghousePublicConfigStatus,
  loadClearinghouseConfig,
} from "./clearinghouse-config.util";
import { ClaimAcknowledgmentService } from "./claim-acknowledgment.service";

const log = createStructuredLogger("AckSftpPoller");

function readEnv(key: string): string | undefined {
  try {
    const v = process.env[key];
    return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
  } catch {
    return undefined;
  }
}

export type AckSftpPollFileOutcome =
  | "processed"
  | "duplicate_ignored"
  | "unmatched_stored"
  | "parse_inconclusive"
  | "skipped_empty"
  | "ingest_failed"
  | "rename_failed"
  | "transport_failed";

export type AckSftpLastPollSnapshot = {
  at: string;
  status: "ok" | "partial_error" | "connection_error" | "skipped_config";
  detail?: string;
  ingested: string[];
  skipped: string[];
  errors: { file: string; error: string; outcome?: AckSftpPollFileOutcome }[];
  fileOutcomes: Record<string, AckSftpPollFileOutcome>;
};

/**
 * Polls an SFTP inbox for inbound 999/277 ACK files and ingests them.
 * Enabled when CLEARINGHOUSE_ACK_SFTP_ENABLED=true (separate from outbound SFTP send).
 */
@Injectable()
export class AckSftpPollerService implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | undefined;
  private lastPollSnapshot: AckSftpLastPollSnapshot | null = null;

  constructor(private readonly claimAcknowledgmentService: ClaimAcknowledgmentService) {}

  /** Last completed poll (including connection failures) for ops/health — no secrets. */
  getLastPollSnapshot(): AckSftpLastPollSnapshot | null {
    return this.lastPollSnapshot;
  }

  onModuleInit(): void {
    if (!clearinghouseAckSftpPollGloballyEnabled()) {
      log.log("ack_sftp_poller_disabled", {});
      this.lastPollSnapshot = {
        at: new Date().toISOString(),
        status: "skipped_config",
        detail:
          readEnv("CLEARINGHOUSE_ACK_SFTP_ENABLED") !== "true"
            ? "CLEARINGHOUSE_ACK_SFTP_ENABLED not true"
            : "CLEARINGHOUSE_ACK_POLL_ENABLED is false",
        ingested: [],
        skipped: [],
        errors: [],
        fileOutcomes: {},
      };
      return;
    }
    const rawMs = readEnv("CLEARINGHOUSE_ACK_POLL_INTERVAL_MS");
    const ms = rawMs ? Number(rawMs) : 120_000;
    const interval = Number.isFinite(ms) && ms >= 30_000 ? ms : 120_000;
    this.timer = setInterval(() => {
      void this.pollOnce().catch((e) => log.log("ack_sftp_poll_error", { error: String(e) }));
    }, interval);
    log.log("ack_sftp_poller_started", { intervalMs: interval });
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /** Manual / test hook — same logic as scheduled poll. */
  async pollOnce(): Promise<{ ingested: string[]; skipped: string[]; errors: { file: string; error: string }[] }> {
    const facilityId = readEnv("CLEARINGHOUSE_ACK_POLL_FACILITY_ID");
    const remotePath = readEnv("CLEARINGHOUSE_ACK_SFTP_REMOTE_PATH");
    const errorSuffix = readEnv("CLEARINGHOUSE_ACK_SFTP_ERROR_SUFFIX") ?? ".error";

    const fileOutcomes: Record<string, AckSftpPollFileOutcome> = {};
    const mark = (name: string, o: AckSftpPollFileOutcome) => {
      fileOutcomes[name] = o;
    };

    if (!facilityId || !remotePath) {
      this.lastPollSnapshot = {
        at: new Date().toISOString(),
        status: "skipped_config",
        detail: "MISSING_FACILITY_OR_REMOTE_PATH",
        ingested: [],
        skipped: ["MISSING_FACILITY_OR_REMOTE_PATH"],
        errors: [],
        fileOutcomes: {},
      };
      return { ingested: [], skipped: ["MISSING_FACILITY_OR_REMOTE_PATH"], errors: [] };
    }

    const cfg = loadClearinghouseConfig();
    const host = cfg.sftpHost;
    const username = cfg.sftpUsername;
    const password = cfg.sftpPassword;
    if (!host || !username || !password) {
      this.lastPollSnapshot = {
        at: new Date().toISOString(),
        status: "skipped_config",
        detail: "SFTP_CREDENTIALS_INCOMPLETE",
        ingested: [],
        skipped: ["SFTP_CREDENTIALS_INCOMPLETE"],
        errors: [],
        fileOutcomes: {},
      };
      return { ingested: [], skipped: ["SFTP_CREDENTIALS_INCOMPLETE"], errors: [] };
    }

    const processedSuffix = readEnv("CLEARINGHOUSE_ACK_SFTP_PROCESSED_SUFFIX") ?? ".processed";
    const client = new SftpClient();
    const ingested: string[] = [];
    const skipped: string[] = [];
    const errors: { file: string; error: string; outcome?: AckSftpPollFileOutcome }[] = [];
    const chPub = getClearinghousePublicConfigStatus();

    try {
      await client.connect({
        host,
        port: cfg.sftpPort,
        username,
        password,
      });

      const list = await client.list(remotePath);
      for (const ent of list) {
        if (ent.type !== "-") continue;
        const name = ent.name;
        if (name.endsWith(processedSuffix)) continue;
        if (errorSuffix && name.endsWith(errorSuffix)) continue;

        const remoteFile = `${remotePath.replace(/\/$/, "")}/${name}`;
        try {
          const buf = await client.get(remoteFile);
          const rawText = Buffer.isBuffer(buf) ? buf.toString("utf8") : String(buf);
          if (!rawText.trim()) {
            skipped.push(name);
            mark(name, "skipped_empty");
            continue;
          }

          let ingestResult;
          try {
            ingestResult = await this.claimAcknowledgmentService.ingestInboundAckPayload({
              facilityId,
              rawText,
              kind: "AUTO",
              vendorMeta: {
                source: "SFTP_POLL",
                remoteFile,
                ingestedAt: new Date().toISOString(),
                clearinghouseMode: chPub.mode,
                integrationTier: chPub.integrationTier,
              },
            });
          } catch (ingestErr) {
            const msg = ingestErr instanceof Error ? ingestErr.message : String(ingestErr);
            await this.claimAcknowledgmentService.recordInboundAckDeadLetter({
              facilityId,
              rawText: rawText.length > 500_000 ? `${rawText.slice(0, 500_000)}\n…[truncated]` : rawText,
              source: "SFTP_POLL",
              failureCode: "ACK_INGEST_FAILED",
              failureDetail: msg,
              vendorMeta: { remoteFile, outcome: "ingest_failed" },
            });
            mark(name, "ingest_failed");
            errors.push({ file: name, error: msg, outcome: "ingest_failed" });
            if (errorSuffix) {
              try {
                await client.rename(remoteFile, `${remoteFile}${errorSuffix}`);
              } catch (re) {
                const reMsg = re instanceof Error ? re.message : String(re);
                errors.push({ file: name, error: `rename_after_fail:${reMsg}`, outcome: "rename_failed" });
                mark(name, "rename_failed");
              }
            }
            continue;
          }

          if (!ingestResult.ackStored) {
            mark(name, "duplicate_ignored");
          } else if (ingestResult.reasonCode === "ACK_UNMATCHED") {
            mark(name, "unmatched_stored");
          } else if (ingestResult.reasonCode === "ACK_PARSE_INCONCLUSIVE") {
            mark(name, "parse_inconclusive");
          } else {
            mark(name, "processed");
          }

          const renamed = `${remoteFile}${processedSuffix}`;
          try {
            await client.rename(remoteFile, renamed);
            ingested.push(name);
          } catch (re) {
            const reMsg = re instanceof Error ? re.message : String(re);
            mark(name, "rename_failed");
            errors.push({ file: name, error: reMsg, outcome: "rename_failed" });
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          mark(name, "transport_failed");
          errors.push({ file: name, error: msg, outcome: "transport_failed" });
        }
      }
      await client.end();

      const hasConn = errors.some((x) => x.file === "_connection");
      const snapStatus: AckSftpLastPollSnapshot["status"] = hasConn
        ? "connection_error"
        : errors.length
          ? "partial_error"
          : "ok";
      this.lastPollSnapshot = {
        at: new Date().toISOString(),
        status: snapStatus,
        detail: hasConn ? "sftp_connection" : errors.length ? `${errors.length} file(s) had errors` : undefined,
        ingested,
        skipped,
        errors,
        fileOutcomes,
      };

      if (ingested.length > 0) {
        log.log("ack_sftp_poll_ingested", { count: ingested.length, files: ingested });
      }
      return { ingested, skipped, errors };
    } catch (e) {
      try {
        await client.end();
      } catch {
        /* ignore */
      }
      const msg = e instanceof Error ? e.message : String(e);
      errors.push({ file: "_connection", error: msg, outcome: "ingest_failed" });
      this.lastPollSnapshot = {
        at: new Date().toISOString(),
        status: "connection_error",
        detail: msg,
        ingested,
        skipped,
        errors,
        fileOutcomes,
      };
      return { ingested, skipped, errors };
    }
  }
}
