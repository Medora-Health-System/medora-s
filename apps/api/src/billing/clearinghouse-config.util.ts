/**
 * Central clearinghouse configuration (env-driven, safe defaults).
 * Never throws during read — invalid/missing values fall back to manual-safe mode.
 */

export type ClearinghouseMode =
  | "manual"
  | "sandbox_api"
  | "sandbox_sftp"
  | "live_api"
  | "live_sftp"
  | "disabled";

export type ClearinghouseVendor = "generic" | "change" | "availity" | "office_ally" | "other";

/** API auth profile for live HTTP (vendor-agnostic; optional token URL reserved for future OAuth). */
export type ClearinghouseApiAuthType = "api_key" | "basic" | "client_credentials" | "none";

export type ClearinghouseTransportHint =
  | "MANUAL"
  | "STUB_API"
  | "SANDBOX_API"
  | "SANDBOX_SFTP"
  | "LIVE_API"
  | "LIVE_SFTP"
  | "DISABLED";

/** Maps env CLEARINGHOUSE_MODE to a default transport hint (manual when unset/unknown). */
export function clearinghouseModeToDefaultHint(mode: ClearinghouseMode): ClearinghouseTransportHint {
  if (mode === "sandbox_api") return "SANDBOX_API";
  if (mode === "sandbox_sftp") return "SANDBOX_SFTP";
  if (mode === "live_api") return "LIVE_API";
  if (mode === "live_sftp") return "LIVE_SFTP";
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
  if (v === "live_api") return "live_api";
  if (v === "live_sftp") return "live_sftp";
  if (v === "disabled") return "disabled";
  return "manual";
}

function parseApiAuthType(raw: string | undefined): ClearinghouseApiAuthType {
  const v = (raw ?? "api_key").toLowerCase();
  if (v === "basic") return "basic";
  if (v === "client_credentials") return "client_credentials";
  if (v === "none") return "none";
  return "api_key";
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

/** Explicit opt-in for live outbound (all environments) — never implied by mode alone. */
export function clearinghouseLiveSendExplicitlyEnabled(): boolean {
  return readEnv("CLEARINGHOUSE_LIVE_SEND_ENABLED") === "true";
}

export function clearinghouseIsNonProduction(): boolean {
  return process.env.NODE_ENV !== "production";
}

export interface ClearinghouseConfigInternal {
  mode: ClearinghouseMode;
  vendor: ClearinghouseVendor;
  endpointUrl: string | undefined;
  /** Preferred base URL for HTTP (live + sandbox); falls back to `endpointUrl`. */
  apiBaseUrl: string | undefined;
  apiAuthType: ClearinghouseApiAuthType;
  apiClientId: string | undefined;
  apiClientSecret: string | undefined;
  apiUsername: string | undefined;
  apiPassword: string | undefined;
  sftpHost: string | undefined;
  sftpPort: number;
  sftpUsername: string | undefined;
  sftpPassword: string | undefined;
  /** Legacy single outbound path (sandbox + compatibility). */
  sftpRemotePath: string | undefined;
  /** Outbound drop path for live SFTP (falls back to `sftpRemotePath`). */
  sftpRemoteOutboundPath: string | undefined;
  /** Documented inbound path for operator diagnostics (ACK poller uses CLEARINGHOUSE_ACK_SFTP_REMOTE_PATH). */
  sftpRemoteInboundPath: string | undefined;
  apiKey: string | undefined;
  senderId: string | undefined;
  receiverId: string | undefined;
  isTest: boolean;
  /** Warnings for operators (never secrets). */
  configWarnings: string[];
}

function validateInternal(c: ClearinghouseConfigInternal): ClearinghouseConfigInternal {
  const w = [...c.configWarnings];
  const httpUrl = c.apiBaseUrl ?? c.endpointUrl;
  if (c.mode === "sandbox_api") {
    if (!httpUrl) w.push("SANDBOX_API_MISSING_ENDPOINT");
    if (!c.apiKey) w.push("SANDBOX_API_MISSING_API_KEY");
  }
  if (c.mode === "sandbox_sftp") {
    if (!c.sftpHost) w.push("SANDBOX_SFTP_MISSING_HOST");
    if (!c.sftpUsername) w.push("SANDBOX_SFTP_MISSING_USERNAME");
    if (!c.sftpPassword) w.push("SANDBOX_SFTP_MISSING_PASSWORD");
    if (!c.sftpRemoteOutboundPath && !c.sftpRemotePath) w.push("SANDBOX_SFTP_MISSING_REMOTE_PATH");
  }
  if (c.mode === "live_api") {
    if (!httpUrl) w.push("LIVE_API_MISSING_BASE_URL");
    if (c.apiAuthType === "api_key" && !c.apiKey) w.push("LIVE_API_MISSING_API_KEY");
    if (c.apiAuthType === "basic" && (!c.apiUsername || !c.apiPassword)) w.push("LIVE_API_MISSING_BASIC_CREDENTIALS");
    if (c.apiAuthType === "client_credentials") {
      if (!c.apiClientId || !c.apiClientSecret) w.push("LIVE_API_MISSING_CLIENT_CREDENTIALS");
      w.push("LIVE_API_CLIENT_CREDENTIALS_NOT_IMPLEMENTED");
    }
    if (c.apiAuthType === "none") w.push("LIVE_API_AUTH_NONE_UNSUPPORTED");
  }
  if (c.mode === "live_sftp") {
    if (!c.sftpHost) w.push("LIVE_SFTP_MISSING_HOST");
    if (!c.sftpUsername) w.push("LIVE_SFTP_MISSING_USERNAME");
    if (!c.sftpPassword) w.push("LIVE_SFTP_MISSING_PASSWORD");
    if (!c.sftpRemoteOutboundPath && !c.sftpRemotePath) w.push("LIVE_SFTP_MISSING_OUTBOUND_PATH");
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
  const endpointUrl = readEnv("CLEARINGHOUSE_ENDPOINT_URL");
  const apiBaseUrl = readEnv("CLEARINGHOUSE_API_BASE_URL") ?? endpointUrl;
  const sftpRemotePath = readEnv("CLEARINGHOUSE_SFTP_REMOTE_PATH");
  const sftpRemoteOutboundPath =
    readEnv("CLEARINGHOUSE_SFTP_REMOTE_OUTBOUND_PATH") ?? readEnv("CLEARINGHOUSE_LIVE_SFTP_REMOTE_OUTBOUND_PATH") ?? sftpRemotePath;
  const sftpRemoteInboundPath =
    readEnv("CLEARINGHOUSE_SFTP_REMOTE_INBOUND_PATH") ?? readEnv("CLEARINGHOUSE_LIVE_SFTP_REMOTE_INBOUND_PATH");

  return validateInternal({
    mode,
    vendor,
    endpointUrl,
    apiBaseUrl: apiBaseUrl ?? undefined,
    apiAuthType: parseApiAuthType(readEnv("CLEARINGHOUSE_API_AUTH_TYPE")),
    apiClientId: readEnv("CLEARINGHOUSE_API_CLIENT_ID"),
    apiClientSecret: readEnv("CLEARINGHOUSE_API_CLIENT_SECRET"),
    apiUsername: readEnv("CLEARINGHOUSE_API_USERNAME"),
    apiPassword: readEnv("CLEARINGHOUSE_API_PASSWORD"),
    sftpHost: readEnv("CLEARINGHOUSE_SFTP_HOST"),
    sftpPort,
    sftpUsername: readEnv("CLEARINGHOUSE_SFTP_USERNAME"),
    sftpPassword: readEnv("CLEARINGHOUSE_SFTP_PASSWORD"),
    sftpRemotePath: sftpRemotePath ?? undefined,
    sftpRemoteOutboundPath: sftpRemoteOutboundPath ?? undefined,
    sftpRemoteInboundPath: sftpRemoteInboundPath ?? undefined,
    apiKey: readEnv("CLEARINGHOUSE_API_KEY"),
    senderId: readEnv("CLEARINGHOUSE_SENDER_ID"),
    receiverId: readEnv("CLEARINGHOUSE_RECEIVER_ID"),
    isTest,
    configWarnings,
  });
}

function httpBaseUrl(config: ClearinghouseConfigInternal): string | undefined {
  return config.apiBaseUrl ?? config.endpointUrl;
}

/** Mode is configured enough for its selected transport to attempt a sandbox send (may still be blocked in production). */
export function clearinghouseModeConfiguredForSend(config: ClearinghouseConfigInternal): boolean {
  if (config.mode === "manual") return true;
  if (config.mode === "disabled") return false;
  if (config.mode === "sandbox_api") {
    return !!(httpBaseUrl(config) && config.apiKey);
  }
  if (config.mode === "sandbox_sftp") {
    const out = config.sftpRemoteOutboundPath ?? config.sftpRemotePath;
    return !!(config.sftpHost && config.sftpUsername && config.sftpPassword && out);
  }
  if (config.mode === "live_api") {
    const url = httpBaseUrl(config);
    if (!url) return false;
    if (config.apiAuthType === "api_key") return !!config.apiKey;
    if (config.apiAuthType === "basic") return !!(config.apiUsername && config.apiPassword);
    if (config.apiAuthType === "client_credentials") return !!(config.apiClientId && config.apiClientSecret);
    return false;
  }
  if (config.mode === "live_sftp") {
    const out = config.sftpRemoteOutboundPath ?? config.sftpRemotePath;
    return !!(config.sftpHost && config.sftpUsername && config.sftpPassword && out);
  }
  return false;
}

/** Live outbound may only proceed when explicitly enabled (never implied by mode). */
export function clearinghouseLiveOutboundSendAllowed(config: ClearinghouseConfigInternal): boolean {
  if (config.mode !== "live_api" && config.mode !== "live_sftp") return false;
  if (!clearinghouseLiveSendExplicitlyEnabled()) return false;
  if (!clearinghouseModeConfiguredForSend(config)) return false;
  if (config.configWarnings.includes("LIVE_API_CLIENT_CREDENTIALS_NOT_IMPLEMENTED")) return false;
  if (clearinghouseIsNonProduction()) return true;
  return clearinghouseExternalSendAllowedInProduction();
}

/** Sandbox HTTP/SFTP network send allowed (unchanged semantics from Phase 6.x). */
export function clearinghouseSandboxNetworkSendEnabled(config: ClearinghouseConfigInternal): boolean {
  if (config.mode !== "sandbox_api" && config.mode !== "sandbox_sftp") return false;
  if (!clearinghouseModeConfiguredForSend(config)) return false;
  if (clearinghouseIsNonProduction()) return true;
  return clearinghouseExternalSendAllowedInProduction();
}

/**
 * Network send (HTTP/SFTP) is allowed only when configured and production guard passes.
 */
export function clearinghouseNetworkSendEnabled(config: ClearinghouseConfigInternal): boolean {
  if (config.mode === "manual" || config.mode === "disabled") return false;
  if (config.mode === "live_api" || config.mode === "live_sftp") {
    return clearinghouseLiveOutboundSendAllowed(config);
  }
  return clearinghouseSandboxNetworkSendEnabled(config);
}

/** Integration tier for audit / UI (never a substitute for transport key on attempts). */
export type ClearinghouseIntegrationTier = "manual" | "sandbox" | "live" | "disabled";

export function clearinghouseIntegrationTier(mode: ClearinghouseMode): ClearinghouseIntegrationTier {
  if (mode === "disabled") return "disabled";
  if (mode === "live_api" || mode === "live_sftp") return "live";
  if (mode === "sandbox_api" || mode === "sandbox_sftp") return "sandbox";
  return "manual";
}

/** Inbound ACK SFTP poll: explicit disable wins; unset defaults to on when legacy ACK_SFTP flag is on. */
export function clearinghouseAckSftpPollGloballyEnabled(): boolean {
  if (readEnv("CLEARINGHOUSE_ACK_SFTP_ENABLED") !== "true") return false;
  const poll = readEnv("CLEARINGHOUSE_ACK_POLL_ENABLED");
  if (poll === "false") return false;
  if (poll === "true") return true;
  return true;
}

export interface ClearinghousePublicConfigStatus {
  mode: ClearinghouseMode;
  vendor: ClearinghouseVendor;
  configured: boolean;
  sandbox: boolean;
  sendEnabled: boolean;
  integrationTier: ClearinghouseIntegrationTier;
  liveSendExplicitlyEnabled: boolean;
  liveOutboundReady: boolean;
  outboundLiveConfigComplete: boolean;
  inboundAckPollEnabled: boolean;
  inboundAckPathConfigured: boolean;
  /** Non-secret diagnostic codes from config validation. */
  configWarningCodes: string[];
  /** Inbound ACK SFTP polling (Phase 6.5). */
  ackSftpIngestEnabled: boolean;
  /** Inbound ACK webhook (shared secret). */
  ackWebhookIngestEnabled: boolean;
}

export function getClearinghousePublicConfigStatus(): ClearinghousePublicConfigStatus {
  const c = loadClearinghouseConfig();
  const configured = clearinghouseModeConfiguredForSend(c);
  const tier = clearinghouseIntegrationTier(c.mode);
  const sandbox = tier === "sandbox" || (c.isTest && tier !== "live");
  const sendEnabled =
    c.mode === "manual"
      ? true
      : c.mode === "disabled"
        ? false
        : clearinghouseNetworkSendEnabled(c);
  const liveExplicit = clearinghouseLiveSendExplicitlyEnabled();
  const liveOutboundReady = clearinghouseLiveOutboundSendAllowed(c);
  const liveBlockingWarnings = new Set([
    "LIVE_API_CLIENT_CREDENTIALS_NOT_IMPLEMENTED",
    "LIVE_API_AUTH_NONE_UNSUPPORTED",
  ]);
  const outboundLiveConfigComplete =
    (c.mode === "live_api" || c.mode === "live_sftp") &&
    configured &&
    !c.configWarnings.some((w) => liveBlockingWarnings.has(w));
  const ackSftpIngestEnabled = parseBool(readEnv("CLEARINGHOUSE_ACK_SFTP_ENABLED"), false);
  const ackWebhookIngestEnabled = parseBool(readEnv("CLEARINGHOUSE_ACK_WEBHOOK_ENABLED"), false);
  const ackPoll = clearinghouseAckSftpPollGloballyEnabled();
  const ackRemoteConfigured = !!(readEnv("CLEARINGHOUSE_ACK_SFTP_REMOTE_PATH") && readEnv("CLEARINGHOUSE_ACK_POLL_FACILITY_ID"));
  return {
    mode: c.mode,
    vendor: c.vendor,
    configured,
    sandbox,
    sendEnabled,
    integrationTier: tier,
    liveSendExplicitlyEnabled: liveExplicit,
    liveOutboundReady,
    outboundLiveConfigComplete,
    inboundAckPollEnabled: ackPoll,
    inboundAckPathConfigured: ackRemoteConfigured && ackSftpIngestEnabled,
    configWarningCodes: [...c.configWarnings],
    ackSftpIngestEnabled,
    ackWebhookIngestEnabled,
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
