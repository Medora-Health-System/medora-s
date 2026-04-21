import SftpClient from "ssh2-sftp-client";
import type {
  ClearinghouseSendInput,
  ClearinghouseSendResult,
  ClearinghouseTransport,
} from "./clearinghouse-transport.interface";
import {
  clearinghouseExternalSendAllowedInProduction,
  clearinghouseIsNonProduction,
  loadClearinghouseConfig,
} from "./clearinghouse-config.util";

export class SandboxSftpClearinghouseTransport implements ClearinghouseTransport {
  readonly key = "SANDBOX_SFTP" as const;

  async send(input: ClearinghouseSendInput): Promise<ClearinghouseSendResult> {
    const cfg = loadClearinghouseConfig();
    const host = cfg.sftpHost;
    const username = cfg.sftpUsername;
    const password = cfg.sftpPassword;
    const remoteDir = cfg.sftpRemotePath;

    if (!host || !username || !password || !remoteDir) {
      return {
        ok: false,
        requestMeta: {
          transport: this.key,
          configured: false,
          submissionId: input.submissionId,
          batchId: input.batchId,
          bytes: Buffer.byteLength(input.x12Text, "utf8"),
        },
        responseMeta: { configured: false, sandbox: true },
        errorMessage: "CLEARINGHOUSE_NOT_CONFIGURED",
      };
    }

    if (!clearinghouseIsNonProduction() && !clearinghouseExternalSendAllowedInProduction()) {
      return {
        ok: false,
        requestMeta: {
          transport: this.key,
          blockedInProduction: true,
          host,
          submissionId: input.submissionId,
          batchId: input.batchId,
          bytes: Buffer.byteLength(input.x12Text, "utf8"),
        },
        responseMeta: { sandbox: true, note: "External sandbox send blocked in production unless CLEARINGHOUSE_EXTERNAL_SEND_IN_PRODUCTION=true" },
        errorMessage: "EXTERNAL_SEND_BLOCKED_IN_PRODUCTION",
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
      isTest: cfg.isTest,
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
      const transportMeta: Record<string, unknown> = { remoteFile, uploadedBytes: buf.length };
      return {
        ok: true,
        requestMeta,
        responseMeta: { sandbox: true, uploaded: true },
        transportMeta,
        externalReference: `SANDBOX-SFTP-${input.submissionId}-${Date.now()}`,
      };
    } catch (e) {
      try {
        await client.end();
      } catch {
        /* ignore */
      }
      const msg = e instanceof Error ? e.message : "SANDBOX_SFTP_FAILED";
      return {
        ok: false,
        requestMeta,
        responseMeta: { sandbox: true, error: msg },
        errorMessage: msg,
      };
    }
  }
}
