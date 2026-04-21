import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import SftpClient from "ssh2-sftp-client";
import { createStructuredLogger } from "../common/logging/structured-logger";
import { loadClearinghouseConfig } from "./clearinghouse-config.util";
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

/**
 * Polls an SFTP inbox for inbound 999/277 ACK files and ingests them.
 * Enabled when CLEARINGHOUSE_ACK_SFTP_ENABLED=true (separate from outbound SFTP send).
 */
@Injectable()
export class AckSftpPollerService implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(private readonly claimAcknowledgmentService: ClaimAcknowledgmentService) {}

  onModuleInit(): void {
    if (readEnv("CLEARINGHOUSE_ACK_SFTP_ENABLED") !== "true") {
      log.log("ack_sftp_poller_disabled", {});
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
    if (!facilityId || !remotePath) {
      return { ingested: [], skipped: ["MISSING_FACILITY_OR_REMOTE_PATH"], errors: [] };
    }

    const cfg = loadClearinghouseConfig();
    const host = cfg.sftpHost;
    const username = cfg.sftpUsername;
    const password = cfg.sftpPassword;
    if (!host || !username || !password) {
      return { ingested: [], skipped: ["SFTP_CREDENTIALS_INCOMPLETE"], errors: [] };
    }

    const processedSuffix = readEnv("CLEARINGHOUSE_ACK_SFTP_PROCESSED_SUFFIX") ?? ".processed";
    const client = new SftpClient();
    const ingested: string[] = [];
    const skipped: string[] = [];
    const errors: { file: string; error: string }[] = [];

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

        const remoteFile = `${remotePath.replace(/\/$/, "")}/${name}`;
        try {
          const buf = await client.get(remoteFile);
          const rawText = Buffer.isBuffer(buf) ? buf.toString("utf8") : String(buf);
          if (!rawText.trim()) {
            skipped.push(name);
            continue;
          }

          await this.claimAcknowledgmentService.ingestInboundAckPayload({
            facilityId,
            rawText,
            kind: "AUTO",
            vendorMeta: {
              source: "SFTP_POLL",
              remoteFile,
              ingestedAt: new Date().toISOString(),
            },
          });

          const renamed = `${remoteFile}${processedSuffix}`;
          await client.rename(remoteFile, renamed);
          ingested.push(name);
        } catch (e) {
          errors.push({ file: name, error: e instanceof Error ? e.message : String(e) });
        }
      }
      await client.end();
    } catch (e) {
      try {
        await client.end();
      } catch {
        /* ignore */
      }
      errors.push({ file: "_connection", error: e instanceof Error ? e.message : String(e) });
    }

    if (ingested.length > 0) {
      log.log("ack_sftp_poll_ingested", { count: ingested.length, files: ingested });
    }
    return { ingested, skipped, errors };
  }
}
