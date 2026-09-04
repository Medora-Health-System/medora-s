/**
 * MEDUI.ES.1J.B — Print / document / consent SAFE chrome overlay.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PUBLICLY_SELECTABLE_PRODUCT_UI_LANGUAGES,
  productUiLanguageSelectOptions,
  type SupportedLanguage,
} from "@/i18n/config";
import {
  applyApprovedSpanishTerminology,
  ES_MEDICAL_TERMINOLOGY,
  isHiddenSpanishPlaceholder,
} from "@medora/shared";
import { resolveClinicalUiMessage } from "@/i18n/messages/registry";
import { i18nMessage } from "@/lib/i18nMessagesLookup";
import { resolveClientUiLanguage } from "@/i18n/resolveClientUiLanguage";
import { printT } from "@/lib/printI18n";
import { getDischargePrintHtml } from "@/components/encounters/DischargePrintLayout";
import { getErPrintPacketHtml } from "@/features/emergency/erPrintPacket";
import { sectionCatalogForTemplate } from "@/features/documents/usRegistrationPacketContent";
import en from "./en";
import fr from "./fr";
import es, { applyGovernedSpanishOverlay } from "./es";
import { createHiddenSpanishCatalog } from "./hiddenSpanishCatalog";
import { MEDUI_ES_1E_OVERLAY } from "./meduiEs1eCorePlatformOverlay";
import { MEDUI_ES_1F_OVERLAY } from "./meduiEs1fEmergencyDepartmentOverlay";
import { MEDUI_ES_1G_OVERLAY } from "./meduiEs1gHospitalInpatientObservationOverlay";
import { MEDUI_ES_1H_OVERLAY } from "./meduiEs1hOrdersMarPharmacyDiagnosticsOverlay";
import { MEDUI_ES_1I_OVERLAY } from "./meduiEs1iClinicDentalBillingAncillaryOverlay";
import {
  MEDUI_ES_1JB_EMPTY_OVERLAY_PATHS,
  MEDUI_ES_1JB_OVERLAY,
} from "./meduiEs1jSafeChromeOverlay";

const webRoot = join(import.meta.dirname, "../..");
const repoRoot = join(webRoot, "../../..");

function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function collectLeaves(obj: unknown, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  if (typeof obj === "string") {
    if (prefix) out.set(prefix, obj);
    return out;
  }
  if (obj !== null && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const next = prefix ? `${prefix}.${k}` : k;
      for (const [p, s] of collectLeaves(v, next)) out.set(p, s);
    }
  }
  return out;
}

function interpolationTokens(value: string): string[] {
  return [...value.matchAll(/\{[^{}]+\}|\{\{[^{}]+\}\}/g)].map((m) => m[0]).sort();
}

function countPlaceholders(tree: unknown): { totalLeaves: number; placeholders: number } {
  const leaves = collectLeaves(tree);
  let placeholders = 0;
  for (const value of leaves.values()) {
    if (isHiddenSpanishPlaceholder(value)) placeholders += 1;
  }
  return { totalLeaves: leaves.size, placeholders };
}

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}.`);
}

function classify1jbPath(path: string): string {
  if (matchesPrefix(path, "documentCenter")) return "DOCUMENT_CENTER";
  if (matchesPrefix(path, "packetWizard")) return "PACKET_WORKFLOW_CHROME";
  if (matchesPrefix(path, "esignature")) return "SIGNATURE_WORKFLOW_CHROME";
  if (matchesPrefix(path, "facesheet")) return "FACESHEET";
  if (matchesPrefix(path, "roi") && !matchesPrefix(path, "roiMonitoring")) return "ROI_ADMIN_CHROME";
  if (matchesPrefix(path, "nursingAdmissionPrint")) return "CLINICAL_PRINT_CHROME";
  if (matchesPrefix(path, "printOutput.erPacket")) return "CLINICAL_PRINT_CHROME";
  if (matchesPrefix(path, "printOutput.discharge")) return "CLINICAL_PRINT_CHROME";
  if (matchesPrefix(path, "printOutput.inpatientDisposition")) return "CLINICAL_PRINT_CHROME";
  if (matchesPrefix(path, "printOutput.inpatientDischargeDocumentation")) return "CLINICAL_PRINT_CHROME";
  if (matchesPrefix(path, "printOutput.dischargeMedications")) return "CLINICAL_PRINT_CHROME";
  if (matchesPrefix(path, "printOutput.patientDischargeInstructions")) return "CLINICAL_PRINT_CHROME";
  if (matchesPrefix(path, "printOutput.results")) return "CLINICAL_PRINT_CHROME";
  if (matchesPrefix(path, "printOutput.patientChart")) return "CLINICAL_PRINT_CHROME";
  if (matchesPrefix(path, "printOutput.encounterChartLivePreview")) return "CLINICAL_PRINT_CHROME";
  if (matchesPrefix(path, "printOutput.common")) return "PRINT_CHROME";
  return "OUT_OF_SCOPE";
}

const FROZEN_PACKET = [
  "packetWizard.legalPendingNotice",
  "packetWizard.sectionAcknowledge",
  "packetWizard.insuranceAcknowledge",
];

const EMTALA_PRINT_FROZEN = [
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
];

function after1iTree() {
  const hidden = createHiddenSpanishCatalog(en);
  const { tree: afterCanon } = applyApprovedSpanishTerminology(hidden);
  const { tree: after1e } = applyGovernedSpanishOverlay(afterCanon, MEDUI_ES_1E_OVERLAY);
  const { tree: after1f } = applyGovernedSpanishOverlay(after1e, MEDUI_ES_1F_OVERLAY);
  const { tree: after1g } = applyGovernedSpanishOverlay(after1f, MEDUI_ES_1G_OVERLAY);
  const { tree: after1h } = applyGovernedSpanishOverlay(after1g, MEDUI_ES_1H_OVERLAY);
  return applyGovernedSpanishOverlay(after1h, MEDUI_ES_1I_OVERLAY).tree;
}

describe("MEDUI.ES.1J.B overlay ownership", () => {
  it("does not overlap earlier overlays and stays inside 1J.B classes", () => {
    const earlier = new Set([
      ...Object.keys(MEDUI_ES_1E_OVERLAY),
      ...Object.keys(MEDUI_ES_1F_OVERLAY),
      ...Object.keys(MEDUI_ES_1G_OVERLAY),
      ...Object.keys(MEDUI_ES_1H_OVERLAY),
      ...Object.keys(MEDUI_ES_1I_OVERLAY),
    ]);
    const outOfScope: string[] = [];
    for (const path of Object.keys(MEDUI_ES_1JB_OVERLAY)) {
      expect(earlier.has(path), path).toBe(false);
      const cls = classify1jbPath(path);
      if (cls === "OUT_OF_SCOPE") outOfScope.push(path);
    }
    expect(outOfScope).toEqual([]);
  });

  it("excludes legal/source packet bodies, attestations, and EMTALA print legal keys", () => {
    for (const path of Object.keys(MEDUI_ES_1JB_OVERLAY)) {
      expect(/^packetWizard\..*(Full|Summary|Text)$/.test(path), path).toBe(false);
      expect(FROZEN_PACKET.includes(path), path).toBe(false);
      expect(path === "esignature.patientAttestation" || path === "esignature.staffAttestation", path).toBe(
        false,
      );
      expect(EMTALA_PRINT_FROZEN.includes(path), path).toBe(false);
      expect(path.startsWith("printOutput.rx"), path).toBe(false);
      expect(path.startsWith("printOutput.orderItemChart"), path).toBe(false);
      expect(path.startsWith("roiMonitoring"), path).toBe(false);
      expect(path.startsWith("msppRapportPrint"), path).toBe(false);
      expect(path.startsWith("compliance"), path).toBe(false);
    }
    for (const path of [...FROZEN_PACKET, ...EMTALA_PRINT_FROZEN, "packetWizard.consentFull", "packetWizard.emtalaFull"]) {
      expect(MEDUI_ES_1JB_OVERLAY[path], path).toBeUndefined();
      expect(isHiddenSpanishPlaceholder(getByPath(es, path) as string), path).toBe(true);
    }
    expect(isHiddenSpanishPlaceholder(getByPath(es, "esignature.patientAttestation") as string)).toBe(true);
    expect(isHiddenSpanishPlaceholder(getByPath(es, "esignature.staffAttestation") as string)).toBe(true);
  });
});

describe("MEDUI.ES.1J.B overlay accounting", () => {
  it("computes exact placeholder and overlay counts", () => {
    const overlayEntries = Object.entries(MEDUI_ES_1JB_OVERLAY);
    const overlayPaths = overlayEntries.map(([path]) => path);
    expect(new Set(overlayPaths).size, "duplicate overlay key paths").toBe(overlayPaths.length);

    const after1i = after1iTree();
    const before = countPlaceholders(after1i);
    const reviewRequiredUiKeys = new Set<string>();
    for (const entry of ES_MEDICAL_TERMINOLOGY) {
      if (entry.status === "REVIEW_REQUIRED") {
        for (const k of entry.uiMessageKeys ?? []) reviewRequiredUiKeys.add(k);
      }
    }

    const byClass: Record<string, number> = {};
    const outOfScope: string[] = [];
    const reviewRequiredOverlays: string[] = [];
    const emptyOverlayEntries: string[] = [];
    const notReplacing: string[] = [];
    const enLeaves = collectLeaves(en);

    for (const [path, value] of overlayEntries) {
      const cls = classify1jbPath(path);
      byClass[cls] = (byClass[cls] || 0) + 1;
      if (cls === "OUT_OF_SCOPE") outOfScope.push(path);
      if (reviewRequiredUiKeys.has(path)) reviewRequiredOverlays.push(path);
      if (value === "") emptyOverlayEntries.push(path);
      const prior = getByPath(after1i, path);
      if (typeof prior !== "string" || !isHiddenSpanishPlaceholder(prior)) notReplacing.push(path);
      const enVal = enLeaves.get(path);
      expect(enVal, `overlay path missing in EN: ${path}`).toBeDefined();
      if (value === "") expect(enVal).toBe("");
      else expect(interpolationTokens(value), `token parity: ${path}`).toEqual(interpolationTokens(enVal as string));
    }

    const { tree: after1jb, replaced } = applyGovernedSpanishOverlay(after1i, MEDUI_ES_1JB_OVERLAY);
    const after = countPlaceholders(after1jb);

    expect(outOfScope).toEqual([]);
    expect(reviewRequiredOverlays).toEqual([]);
    expect(notReplacing).toEqual([]);
    expect([...emptyOverlayEntries].sort()).toEqual([...MEDUI_ES_1JB_EMPTY_OVERLAY_PATHS].sort());
    expect(byClass.OUT_OF_SCOPE ?? 0).toBe(0);
    expect(replaced).toBe(overlayEntries.length);
    expect(after.placeholders).toBe(before.placeholders - replaced);
    expect(overlayEntries.length).toBe(624);
    expect(before.totalLeaves).toBe(44266);
    expect(before.placeholders).toBe(28272);
    expect(after.placeholders).toBe(27648);
    expect(byClass.DOCUMENT_CENTER).toBe(91);
    expect(byClass.PACKET_WORKFLOW_CHROME).toBe(57);
    expect(byClass.SIGNATURE_WORKFLOW_CHROME).toBe(22);
    expect(byClass.ROI_ADMIN_CHROME).toBe(40);
    expect(byClass.FACESHEET).toBe(23);
    expect(byClass.PRINT_CHROME).toBe(6);
    expect(byClass.CLINICAL_PRINT_CHROME).toBe(385);
  });

  it("overlay keys are sorted and live es exposes every 1J.B overlay value", () => {
    const keys = Object.keys(MEDUI_ES_1JB_OVERLAY);
    expect(keys).toEqual([...keys].sort());
    expect(keys).toContain("printOutput.erPacket.handoffRecordSaved");
    expect(MEDUI_ES_1JB_OVERLAY["printOutput.erPacket.handoffRecordSaved"]).toBe("");
    for (const [path, value] of Object.entries(MEDUI_ES_1JB_OVERLAY)) {
      expect(getByPath(es, path), path).toBe(value);
    }
  });
});

describe("MEDUI.ES.1J.B zero-fallback and chrome isolation", () => {
  it("safe chrome resolves ES only; EN and FR catalogs unchanged", () => {
    const keys = [
      "documentCenter.title",
      "packetWizard.registrationPackage",
      "esignature.signHere",
      "facesheet.title",
      "roi.title",
      "printOutput.erPacket.finalDiagnosis",
      "printOutput.common.documentFooter",
    ];
    for (const key of keys) {
      const enVal = i18nMessage("en", key);
      const frVal = i18nMessage("fr", key);
      const esVal = i18nMessage("es", key);
      expect(isHiddenSpanishPlaceholder(esVal), key).toBe(false);
      expect(esVal, key).not.toBe(enVal);
      expect(esVal, key).not.toBe(frVal);
      expect(resolveClinicalUiMessage("en", key)).toBe(enVal);
      expect(resolveClinicalUiMessage("fr", key)).toBe(frVal);
      expect(resolveClinicalUiMessage("es", key)).toBe(esVal);
      expect(printT("en", key)).toBe(enVal);
      expect(printT("fr", key)).toBe(frVal);
      expect(printT("es", key)).toBe(esVal);
    }
  });

  it("missing ES keys never fall back to EN or FR", () => {
    const missing = "meduiEs1jb.missing.print.key";
    expect(resolveClinicalUiMessage("es", missing)).toBe(missing);
    expect(printT("es", missing)).toBe(missing);
    expect(printT("en", missing)).toBe(missing);
    expect(printT("fr", missing)).toBe(missing);
  });
});

describe("MEDUI.ES.1J.B print chrome vs authored source", () => {
  it("ES discharge print shows Spanish chrome and keeps authored diagnosis text", () => {
    const html = getDischargePrintHtml({
      patient: { firstName: "Ada", lastName: "Lovelace", dob: "1980-01-01", sex: "F" },
      encounter: { createdAt: "2026-06-03T17:00:00.000Z" },
      primaryDiagnosis: "Sepsis, unspecified organism",
      language: "es",
    });
    expect(html).toContain(printT("es", "printOutput.discharge.documentH1"));
    expect(html).toContain(printT("es", "printOutput.discharge.primaryDiagnosis"));
    expect(html).toContain("Sepsis, unspecified organism");
    expect(html).not.toContain(printT("en", "printOutput.discharge.documentH1"));
    expect(html).not.toContain(printT("fr", "printOutput.discharge.documentH1"));
    expect(html).not.toContain("PRIMARY");
    expect(html).not.toContain("PRINCIPAL");
    expect(html).not.toContain("Diagnóstico principal");
  });

  it("ES ED print chrome does not emit EMTALA for non-US and does not translate EMTALA legal keys", () => {
    const html = getErPrintPacketHtml({
      patient: { firstName: "Jean", lastName: "Patient", dob: "1990-01-01", sex: "M" },
      encounter: { createdAt: "2026-05-18T08:00:00.000Z", dischargeSummaryJson: null, nursingAssessment: {} },
      triageSnapshot: null,
      language: "es" as SupportedLanguage,
      facility: { name: "Port-au-Prince ED", country: "HT" },
    });
    expect(html).toContain(printT("es", "printOutput.erPacket.htmlTitleErPacket"));
    expect(html).toContain(printT("es", "printOutput.erPacket.subtitleErPacket"));
    expect(html).not.toContain(printT("en", "printOutput.erPacket.sectionEmtalaSummary"));
    expect(html).not.toContain(printT("fr", "printOutput.erPacket.sectionEmtalaSummary"));
    expect(html).not.toContain(printT("es", "printOutput.erPacket.sectionEmtalaSummary"));
    expect(isHiddenSpanishPlaceholder(printT("es", "printOutput.erPacket.emtalaNoData"))).toBe(true);
  });
});

describe("MEDUI.ES.1J.B primary vs principal / legal freeze", () => {
  it("keeps primaryDiagnosis approved Spanish and principalDiagnosis REVIEW_REQUIRED", () => {
    expect(getByPath(es, "printOutput.discharge.primaryDiagnosis")).toBe("Diagnóstico primario");
    const principal = ES_MEDICAL_TERMINOLOGY.find((e) => e.key === "clinical.dx.principalDiagnosis");
    expect(principal?.status).toBe("REVIEW_REQUIRED");
    expect(principal?.uiMessageKeys ?? []).toEqual([]);
    expect(Object.values(MEDUI_ES_1JB_OVERLAY).some((v) => /diagn[oó]stico principal/i.test(v))).toBe(false);
  });

  it("does not translate legal source JSON or wizard legal bodies", () => {
    const usFederal = readFileSync(
      join(repoRoot, "apps/api/prisma/registration-packets/legal-sources/us-federal.json"),
      "utf8",
    );
    expect(usFederal).toContain("SOURCE_GROUNDED_PENDING_LEGAL_APPROVAL");
    expect(usFederal).not.toMatch(/LEGAL_CONTENT_APPROVED/);
    expect(sectionCatalogForTemplate("HOSPITAL", { emtalaApplicable: false }).some((s) => s.key === "emtalaNotice")).toBe(
      false,
    );
    expect(isHiddenSpanishPlaceholder(i18nMessage("es", "packetWizard.consentFull"))).toBe(true);
    expect(i18nMessage("es", "packetWizard.consentFull")).not.toBe(i18nMessage("en", "packetWizard.consentFull"));
    expect(i18nMessage("es", "packetWizard.consentFull")).not.toBe(i18nMessage("fr", "packetWizard.consentFull"));
  });
});

describe("MEDUI.ES.1J.B public exposure and preferredLanguage", () => {
  it("Español remains hidden from public product UI selectors", () => {
    expect([...PUBLICLY_SELECTABLE_PRODUCT_UI_LANGUAGES]).toEqual(["fr", "en"]);
    expect(productUiLanguageSelectOptions().map((o) => o.value)).toEqual(["fr", "en"]);
    expect(productUiLanguageSelectOptions().some((o) => /español/i.test(o.label))).toBe(false);
  });

  it("patient preferredLanguage es does not activate product UI Spanish", () => {
    expect(resolveClientUiLanguage({ storedLanguage: "es" })).not.toBe("es");
  });
});

describe("MEDUI.ES.1J.B components stay message-key driven", () => {
  it("does not add Spanish literals to 1J print/document components", () => {
    const files = [
      "components/documents/RegistrationPacketWizard.tsx",
      "components/encounters/DischargePrintLayout.tsx",
      "features/emergency/erPrintPacket.ts",
      "features/documents/usRegistrationPacketContent.ts",
    ];
    for (const rel of files) {
      const src = readFileSync(join(webRoot, rel), "utf8");
      expect(src, rel).not.toMatch(/¿|¡/);
      expect(src, rel).not.toMatch(/Diagnóstico primario|Paquete de inscripción|Centro de documentos/);
    }
  });
});

describe("MEDUI.ES.1J.B hardcoded print chrome classification", () => {
  it("PDF and dental chrome maps are locale-isolated and freeze legal source", () => {
    const pdfChrome = readFileSync(join(repoRoot, "apps/api/src/documents/packet-pdf-chrome.ts"), "utf8");
    const dentalChrome = readFileSync(
      join(repoRoot, "apps/api/src/encounters/chart-export-print-chrome.ts"),
      "utf8",
    );
    const pdfSvc = readFileSync(join(repoRoot, "apps/api/src/documents/packet-pdf.service.ts"), "utf8");
    const exportSvc = readFileSync(join(repoRoot, "apps/api/src/encounters/chart-export.service.ts"), "utf8");
    expect(pdfChrome).toContain('registrationPackage: "Paquete de inscripción"');
    expect(pdfChrome).toContain('locale: "Idioma:"');
    expect(pdfSvc).not.toMatch(/map\.es \|\| map\.en/);
    expect(pdfSvc).not.toContain("REGISTRATION_PACKAGE_TITLE");
    expect(exportSvc).not.toContain('"Non documenté"');
    expect(dentalChrome).toContain("Acceptation du plan (≠ consentement procédural signé)");
    expect(dentalChrome).toContain("Revisión de antecedentes (encuentro dental)");
    expect(Object.keys(MEDUI_ES_1JB_OVERLAY)).toHaveLength(624);
  });

  it("dental workspace chart-export caller routes by active product UI locale", () => {
    const caller = readFileSync(
      join(webRoot, "features/dental-care/overview/EnterpriseDentalEncounterOverviewPanel.tsx"),
      "utf8",
    );
    const helper = readFileSync(
      join(webRoot, "features/dental-care/overview/dentalEncounterChartExportPath.ts"),
      "utf8",
    );
    expect(caller).toContain("dentalEncounterChartExportHtmlPath(encounterId, language)");
    expect(caller).not.toContain("locale=fr");
    expect(helper).toContain("resolveProductUiLanguageOrDefault(language)");
    expect(helper).not.toMatch(/preferredLanguage/);
  });
});
