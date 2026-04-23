import SftpClient from "ssh2-sftp-client";
import type {
  ClearinghouseSendInput,
  ClearinghouseSendResult,
  ClearinghouseTransport,
} from "./clearinghouse-transport.interface";
import { clearinghouseLiveOutboundSendAllowed, loadClearinghouseConfig } from "./clearinghouse-config.util";

/**
 * Live SFTP outbound. Requires CLEARINGHOUSE_MODE=live_sftp, outbound path + credentials,
 * and CLEARINGHOUSE_LIVE_SEND_ENABLED=true (plus production guard when applicable).
 */
export class LiveSftpClearinghouseTransport implements ClearinghouseTransport {
  readonly key = "LIVE_SFTP" as const;

  async send(input: ClearinghouseSendInput): Promise<ClearinghouseSendResult> {
    const cfg = loadClearinghouseConfig();
    if (cfg.mode !== "live_sftp") {
      return {
        ok: false,
        requestMeta: {
          transport: this.key,
          modeMismatch: true,
          clearinghouseMode: cfg.mode,
          submissionId: input.submissionId,
          batchId: input.batchId,
        },
        responseMeta: { live: true },
        errorMessage: "LIVE_SFTP_CLEARINGHOUSE_MODE_MISMATCH",
      };
    }

    const host = cfg.sftpHost;
    const username = cfg.sftpUsername;
    const password = cfg.sftpPassword;
    const remoteDir = cfg.sftpRemoteOutboundPath ?? cfg.sftpRemotePath;

    if (!host || !username || !password || !remoteDir || !clearinghouseLiveOutboundSendAllowed(cfg)) {
      return {
        ok: false,
        requestMeta: {
          transport: this.key,
          configured: false,
          live: true,
          submissionId: input.submissionId,
          batchId: input.batchId,
          bytes: Buffer.byteLength(input.x12Text, "utf8"),
        },
        responseMeta: { live: true, sendNotAllowed: true },
        errorMessage: "CLEARINGHOUSE_LIVE_OUTBOUND_NOT_ALLOWED",
      };
    }

    const remoteFile = `${remoteDir.replace(/\/$/, "")}/${input.submissionId}.x12`;
    const requestMeta: Record<string, unknown> = {
      transport: this.key,
      host,
      port: cfg.sftpPort,
      username,
      remoteFile,
      bytes: Buffer.byteLength(input.x12Text, "utf8"),
      submissionId: input.submissionId,
      vendor: cfg.vendor,
      live: true,
      integrationTier: "live",
    };

    const client = new SftpClient();
    try {
      await client.connect({
        host,
        port: cfg.sftpPort,
        username,
        password,
      });
      const buf = Buffer.from(input.x12Text, "utf8");
      await client.put(buf, remoteFile);
      await client.end();
      const transportMeta: Record<string, unknown> = { remoteFile, uploadedBytes: buf.length, live: true };
      return {
        ok: true,
        requestMeta,
        responseMeta: { live: true, uploaded: true },
        transportMeta,
        externalReference: `LIVE-SFTP-${input.submissionId}-${Date.now()}`,
      };
    } catch (e) {
      try {
        await client.end();
      } catch {
        /* ignore */
      }
      const msg = e instanceof Error ? e.message : "LIVE_SFTP_FAILED";
      return {
        ok: false,
        requestMeta,
        responseMeta: { live: true, error: msg },
        errorMessage: msg,
      };
    }
  }
}
