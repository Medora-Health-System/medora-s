import { Injectable } from "@nestjs/common";
import {
  ClearinghouseTransport,
  DisabledClearinghouseTransport,
  ManualClearinghouseTransport,
} from "./clearinghouse-transport.interface";
import type { ClearinghouseTransportHint } from "./clearinghouse-config.util";
import { SandboxApiClearinghouseTransport } from "./clearinghouse-sandbox-api.transport";
import { SandboxSftpClearinghouseTransport } from "./clearinghouse-sandbox-sftp.transport";
import { LiveApiClearinghouseTransport } from "./clearinghouse-live-api.transport";
import { LiveSftpClearinghouseTransport } from "./clearinghouse-live-sftp.transport";

/**
 * Resolves a transport implementation from an explicit hint (API body / operator choice).
 * Does not read CLEARINGHOUSE_MODE — callers may combine with env defaults when needed.
 */
@Injectable()
export class ClearinghouseTransportFactory {
  resolve(hint: ClearinghouseTransportHint = "MANUAL"): ClearinghouseTransport {
    switch (hint) {
      case "MANUAL":
        return new ManualClearinghouseTransport();
      case "DISABLED":
        return new DisabledClearinghouseTransport();
      case "STUB_API":
      case "SANDBOX_API":
        return new SandboxApiClearinghouseTransport();
      case "SANDBOX_SFTP":
        return new SandboxSftpClearinghouseTransport();
      case "LIVE_API":
        return new LiveApiClearinghouseTransport();
      case "LIVE_SFTP":
        return new LiveSftpClearinghouseTransport();
      default:
        return new ManualClearinghouseTransport();
    }
  }
}
