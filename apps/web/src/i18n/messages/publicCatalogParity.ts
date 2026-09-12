import { isHiddenSpanishPlaceholder, PUBLIC_UI_LAST_RESORT_COPY } from "@medora/shared";

export const FROZEN_LEGAL_SOURCE_PATHS = [
  "packetWizard.legalPendingNotice",
  "packetWizard.sectionAcknowledge",
  "packetWizard.insuranceAcknowledge",
  "packetWizard.consentFull",
  "packetWizard.emtalaFull",
  "esignature.patientAttestation",
  "esignature.staffAttestation",
  "printOutput.erPacket.sectionEmtalaSummary",
  "printOutput.erPacket.emtalaNoData",
  "printOutput.erPacket.emtalaNoTimestamps",
  "printOutput.erPacket.emtalaArrival",
  "printOutput.erPacket.emtalaTriageCompleted",
  "printOutput.erPacket.emtalaMseCompleted",
  "printOutput.erPacket.emtalaDispositionDecision",
  "printOutput.erPacket.emtalaDeparture",
  "printOutput.erPacket.emtalaTransferAccepted",
  "printOutput.erPacket.signedEmtalaLog",
] as const;

export const CRITICAL_PUBLIC_UI_NAMESPACES = [
  "adminHub",
  "reportsOps",
  "goLiveReadiness",
  "medicalExamAnalytics",
  "encounterChrome",
  "encounterRoom",
  "emergencyTrackboard",
  "hospitalizationBoard",
  "billingPage",
  "pharmacyHomePage",
  "createOrderModal",
] as const;

const SOURCE_LANGUAGE_PREFIXES = [
  "providerDocumentationComplaintIntel.",
  "providerDocumentationTemplateHpiDimensions.",
  "providerDocumentationDynamicClusters.",
  "providerDocumentationDynamicIntel.",
  "providerDocumentationSmartSentences.",
  "enterpriseInterdisciplinaryCarePlansD4b6.templates.",
  "encounterClinicTab.snippet",
  "encounterClinicTab.observationMdmSnippet",
] as const;

export function collectMessageLeaves(obj: unknown, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  if (typeof obj === "string") {
    if (prefix) out.set(prefix, obj);
    return out;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      for (const [path, value] of collectMessageLeaves(item, prefix ? `${prefix}.${index}` : String(index))) {
        out.set(path, value);
      }
    });
    return out;
  }
  if (obj !== null && typeof obj === "object") {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const next = prefix ? `${prefix}.${key}` : key;
      for (const [path, leaf] of collectMessageLeaves(value, next)) out.set(path, leaf);
    }
  }
  return out;
}

export function isFrozenLegalSourcePath(path: string): boolean {
  return (
    (FROZEN_LEGAL_SOURCE_PATHS as readonly string[]).includes(path) ||
    path.startsWith("packetWizard.") ||
    path.startsWith("printOutput.erPacket.emtala") ||
    path.startsWith("printOutput.erPacket.sectionEmtala") ||
    path.startsWith("printOutput.erPacket.signedEmtala") ||
    path === "esignature.patientAttestation" ||
    path === "esignature.staffAttestation"
  );
}

export function isSourceLanguageContentPath(path: string): boolean {
  return SOURCE_LANGUAGE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function looksLikeRawMessageKey(path: string, value: string): boolean {
  if (value !== path) return false;
  return path.includes(".") && /^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)+$/.test(path);
}

export type CatalogParityFinding = {
  code:
    | "EN_ONLY"
    | "EN_INCOMPLETE"
    | "FR_MISSING"
    | "ES_MISSING"
    | "FR_EXTRA"
    | "ES_EXTRA"
    | "ES_SENTINEL"
    | "ES_GENERIC_FALLBACK"
    | "RAW_KEY_VALUE"
    | "EMPTY_VALUE";
  path: string;
};

export type CatalogParityReport = {
  TOTAL_KEYS: number;
  EN_COMPLETE: boolean;
  FR_COMPLETE: boolean;
  ES_COMPLETE: boolean;
  ES_SENTINELS: number;
  RAW_KEYS: number;
  EMPTY_KEYS: number;
  EXTRA_KEYS: number;
  findings: CatalogParityFinding[];
  VERDICT: "PASS" | "FAIL";
};

export function auditPublicCatalogParity(
  en: unknown,
  fr: unknown,
  es: unknown
): CatalogParityReport {
  const enLeaves = collectMessageLeaves(en);
  const frLeaves = collectMessageLeaves(fr);
  const esLeaves = collectMessageLeaves(es);
  const findings: CatalogParityFinding[] = [];

  for (const path of enLeaves.keys()) {
    if (!frLeaves.has(path)) findings.push({ code: "FR_MISSING", path });
    if (!esLeaves.has(path)) findings.push({ code: "ES_MISSING", path });
  }
  for (const path of frLeaves.keys()) {
    if (!enLeaves.has(path)) findings.push({ code: "FR_EXTRA", path });
  }
  for (const path of esLeaves.keys()) {
    if (!enLeaves.has(path)) findings.push({ code: "ES_EXTRA", path });
  }

  for (const [path, value] of esLeaves) {
    if (isHiddenSpanishPlaceholder(value)) findings.push({ code: "ES_SENTINEL", path });
    if (value === "UNLOCALIZED_SOURCE") findings.push({ code: "ES_SENTINEL", path });
    if (looksLikeRawMessageKey(path, value)) findings.push({ code: "RAW_KEY_VALUE", path });
    const enVal = enLeaves.get(path) ?? "";
    if (!value.trim() && enVal.trim()) findings.push({ code: "EMPTY_VALUE", path });
    // Last-resort "No disponible" is defense-in-depth, not a complete translation.
    if (
      value === PUBLIC_UI_LAST_RESORT_COPY.es &&
      !/^(Unavailable|Not available)$/i.test(enVal.trim())
    ) {
      findings.push({ code: "ES_GENERIC_FALLBACK", path });
    }
  }
  for (const [path, value] of enLeaves) {
    if (looksLikeRawMessageKey(path, value)) findings.push({ code: "EN_INCOMPLETE", path });
    if (isHiddenSpanishPlaceholder(value) || value === "UNLOCALIZED_SOURCE") {
      findings.push({ code: "EN_INCOMPLETE", path });
    }
    // Intentionally empty English chrome is allowed; do not flag it as incomplete.
  }
  for (const [path, value] of frLeaves) {
    if (looksLikeRawMessageKey(path, value)) findings.push({ code: "RAW_KEY_VALUE", path });
  }

  const ES_SENTINELS = findings.filter((f) => f.code === "ES_SENTINEL").length;
  const ES_GENERIC_FALLBACKS = findings.filter((f) => f.code === "ES_GENERIC_FALLBACK").length;
  const RAW_KEYS = findings.filter((f) => f.code === "RAW_KEY_VALUE").length;
  const EMPTY_KEYS = findings.filter((f) => f.code === "EMPTY_VALUE").length;
  const EXTRA_KEYS = findings.filter((f) => f.code === "FR_EXTRA" || f.code === "ES_EXTRA").length;
  const EN_COMPLETE =
    findings.filter((f) => f.code === "EN_ONLY" || f.code === "EN_INCOMPLETE").length === 0;
  const FR_COMPLETE = findings.filter((f) => f.code === "FR_MISSING").length === 0;
  const ES_COMPLETE =
    findings.filter((f) => f.code === "ES_MISSING" || f.code === "ES_SENTINEL" || f.code === "ES_GENERIC_FALLBACK")
      .length === 0;

  const VERDICT: "PASS" | "FAIL" =
    ES_SENTINELS === 0 &&
    ES_GENERIC_FALLBACKS === 0 &&
    RAW_KEYS === 0 &&
    EMPTY_KEYS === 0 &&
    EXTRA_KEYS === 0 &&
    FR_COMPLETE &&
    ES_COMPLETE &&
    EN_COMPLETE
      ? "PASS"
      : "FAIL";

  return {
    TOTAL_KEYS: enLeaves.size,
    EN_COMPLETE,
    FR_COMPLETE,
    ES_COMPLETE,
    ES_SENTINELS,
    RAW_KEYS,
    EMPTY_KEYS,
    EXTRA_KEYS,
    findings,
    VERDICT,
  };
}

export function formatCatalogParityReport(report: CatalogParityReport): string {
  const lines = [
    `TOTAL_KEYS=${report.TOTAL_KEYS}`,
    `EN_COMPLETE=${report.EN_COMPLETE ? "YES" : "NO"}`,
    `FR_COMPLETE=${report.FR_COMPLETE ? "YES" : "NO"}`,
    `ES_COMPLETE=${report.ES_COMPLETE ? "YES" : "NO"}`,
    `ES_SENTINELS=${report.ES_SENTINELS}`,
    `RAW_KEYS=${report.RAW_KEYS}`,
    `EMPTY_KEYS=${report.EMPTY_KEYS}`,
    `EXTRA_KEYS=${report.EXTRA_KEYS}`,
    `VERDICT=${report.VERDICT}`,
  ];
  if (report.VERDICT !== "PASS") {
    const sample = report.findings.slice(0, 40).map((f) => `${f.code} ${f.path}`);
    lines.push("FINDINGS_SAMPLE=");
    lines.push(...sample);
  }
  return lines.join("\n");
}
