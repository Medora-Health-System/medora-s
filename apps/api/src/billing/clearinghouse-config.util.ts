/**
 * Central clearinghouse configuration (env-driven, safe defaults).
 * Never throws during read — invalid/missing values fall back to manual-safe mode.
 */

export type ClearinghouseMode = "manual" | "sandbox_api" | "sandbox_sftp" | "disabled";

export type ClearinghouseVendor = "generic" | "change" | "availity" | "office_ally" | "other";

export type ClearinghouseTransportHint =
  | "MANUAL"
  | "STUB_API"
  | "SANDBOX_API"
  | "SANDBOX_SFTP"
  | "DISABLED";

/** Maps env CLEARINGHOUSE_MODE to a default transport hint (manual when unset/unknown). */
export function clearinghouseModeToDefaultHint(mode: ClearinghouseMode): ClearinghouseTransportHint {
  if (mode === "sandbox_api") return "SANDBOX_API";
  if (mode === "sandbox_sftp") return "SANDBOX_SFTP";
  if (mode === "disabled") return "DISABLED";
  return "MANUAL";
}

function readEnv(key: string): string | undefined {
  try {
    const v = process.env[key];
    return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
  } catch {
    return undefined;
  }
}

function parseMode(raw: string | undefined): ClearinghouseMode {
  const v = (raw ?? "manual").toLowerCase();
  if (v === "manual") return "manual";
  if (v === "sandbox_api") return "sandbox_api";
  if (v === "sandbox_sftp") return "sandbox_sftp";
  if (v === "disabled") return "disabled";
  return "manual";
}

function parseVendor(raw: string | undefined): ClearinghouseVendor {
  const v = (raw ?? "generic").toLowerCase();
  if (v === "change") return "change";
  if (v === "availity") return "availity";
  if (v === "office_ally") return "office_ally";
  if (v === "other") return "other";
  return "generic";
}

function parseBool(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw === undefined) return defaultValue;
  const v = raw.toLowerCase();
  if (v === "true" || v === "1" || v === "yes") return true;
  if (v === "false" || v === "0" || v === "no") return false;
  return defaultValue;
}

/** When NODE_ENV=production, external HTTP/SFTP sends require this flag to be true. */
export function clearinghouseExternalSendAllowedInProduction(): boolean {
  return readEnv("CLEARINGHOUSE_EXTERNAL_SEND_IN_PRODUCTION") === "true";
}

export function clearinghouseIsNonProduction(): boolean {
  return process.env.NODE_ENV !== "production";
}

export interface ClearinghouseConfigInternal {
  mode: ClearinghouseMode;
  vendor: ClearinghouseVendor;
  endpointUrl: string | undefined;
  sftpHost: string | undefined;
  sftpPort: number;
  sftpUsername: string | undefined;
  sftpPassword: string | undefined;
  sftpRemotePath: string | undefined;
  apiKey: string | undefined;
  senderId: string | undefined;
  receiverId: string | undefined;
  isTest: boolean;
  /** Warnings for operators (never secrets). */
  configWarnings: string[];
}

function validateInternal(c: ClearinghouseConfigInternal): ClearinghouseConfigInternal {
  const w = [...c.configWarnings];
  if (c.mode === "sandbox_api") {
    if (!c.endpointUrl) w.push("SANDBOX_API_MISSING_ENDPOINT");
    if (!c.apiKey) w.push("SANDBOX_API_MISSING_API_KEY");
  }
  if (c.mode === "sandbox_sftp") {
    if (!c.sftpHost) w.push("SANDBOX_SFTP_MISSING_HOST");
    if (!c.sftpUsername) w.push("SANDBOX_SFTP_MISSING_USERNAME");
    if (!c.sftpPassword) w.push("SANDBOX_SFTP_MISSING_PASSWORD");
    if (!c.sftpRemotePath) w.push("SANDBOX_SFTP_MISSING_REMOTE_PATH");
  }
  return { ...c, configWarnings: w };
}

export function loadClearinghouseConfig(): ClearinghouseConfigInternal {
  const configWarnings: string[] = [];
  const mode = parseMode(readEnv("CLEARINGHOUSE_MODE"));
  const vendor = parseVendor(readEnv("CLEARINGHOUSE_VENDOR"));
  const portRaw = readEnv("CLEARINGHOUSE_SFTP_PORT");
  let sftpPort = 22;
  if (portRaw !== undefined) {
    const n = Number(portRaw);
    if (Number.isFinite(n) && n > 0 && n < 65536) sftpPort = Math.floor(n);
    else configWarnings.push("INVALID_CLEARINGHOUSE_SFTP_PORT");
  }

  const isTest = parseBool(readEnv("CLEARINGHOUSE_IS_TEST"), true);

  return validateInternal({
    mode,
    vendor,
    endpointUrl: readEnv("CLEARINGHOUSE_ENDPOINT_URL"),
    sftpHost: readEnv("CLEARINGHOUSE_SFTP_HOST"),
    sftpPort,
    sftpUsername: readEnv("CLEARINGHOUSE_SFTP_USERNAME"),
    sftpPassword: readEnv("CLEARINGHOUSE_SFTP_PASSWORD"),
    sftpRemotePath: readEnv("CLEARINGHOUSE_SFTP_REMOTE_PATH"),
    apiKey: readEnv("CLEARINGHOUSE_API_KEY"),
    senderId: readEnv("CLEARINGHOUSE_SENDER_ID"),
    receiverId: readEnv("CLEARINGHOUSE_RECEIVER_ID"),
    isTest,
    configWarnings,
  });
}

/** Mode is configured enough for its selected transport to attempt a sandbox send (may still be blocked in production). */
export function clearinghouseModeConfiguredForSend(config: ClearinghouseConfigInternal): boolean {
  if (config.mode === "manual") return true;
  if (config.mode === "disabled") return false;
  if (config.mode === "sandbox_api") {
    return !!(config.endpointUrl && config.apiKey);
  }
  if (config.mode === "sandbox_sftp") {
    return !!(config.sftpHost && config.sftpUsername && config.sftpPassword && config.sftpRemotePath);
  }
  return false;
}

/**
 * Network send (HTTP/SFTP) is allowed only when configured and production guard passes.
 */
export function clearinghouseNetworkSendEnabled(config: ClearinghouseConfigInternal): boolean {
  if (config.mode === "manual" || config.mode === "disabled") return false;
  if (!clearinghouseModeConfiguredForSend(config)) return false;
  if (clearinghouseIsNonProduction()) return true;
  return clearinghouseExternalSendAllowedInProduction();
}

export interface ClearinghousePublicConfigStatus {
  mode: ClearinghouseMode;
  vendor: ClearinghouseVendor;
  configured: boolean;
  sandbox: boolean;
  sendEnabled: boolean;
}

export function getClearinghousePublicConfigStatus(): ClearinghousePublicConfigStatus {
  const c = loadClearinghouseConfig();
  const configured = clearinghouseModeConfiguredForSend(c);
  const sandbox = c.mode === "sandbox_api" || c.mode === "sandbox_sftp" || c.isTest;
  const sendEnabled =
    c.mode === "manual"
      ? true
      : c.mode === "disabled"
        ? false
        : clearinghouseNetworkSendEnabled(c);
  return {
    mode: c.mode,
    vendor: c.vendor,
    configured,
    sandbox,
    sendEnabled,
  };
}

export function safeEndpointHostForAudit(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}
