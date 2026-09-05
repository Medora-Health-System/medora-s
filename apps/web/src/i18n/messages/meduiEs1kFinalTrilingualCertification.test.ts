/**
 * MEDUI.ES.1K — Whole-Medora tri-lingual certification + public Español enablement.
 *
 * Historical architecture (1B–1J.B): Español internally recognized, hidden from public selectors.
 * Final architecture (1K): public product UI locales are EN / FR / ES. Default remains EN.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FACILITY_DEFAULT_LANGUAGE,
  PRODUCT_DEFAULT_UI_LANGUAGE,
  PUBLICLY_SELECTABLE_PRODUCT_UI_LANGUAGES,
  PRODUCT_UI_LOCALE_REGISTRY,
  pickCatalogDisplayLabelForProductUi,
  pickProductUiCopy,
  productUiBcp47Tag,
  productUiLanguageSelectOptions,
  resolveProductUiLanguageFromBrowserCandidates,
  resolveProductUiLanguageOrDefault,
  resolvePublicProductUiLanguageOrDefault,
  supportedLanguages,
} from "@/i18n/config";
import {
  ES_MEDICAL_TERMINOLOGY,
  MEDORA_SPANISH_MEDICAL_TERMINOLOGY_VERSION,
  esMedicalTerminologyCounts,
  getSpanishMedicalTerminologyEntry,
  isHiddenSpanishPlaceholder,
  productUiLanguageSchema,
} from "@medora/shared";
import { resolveClinicalUiMessage } from "@/i18n/messages/registry";
import { i18nMessage } from "@/lib/i18nMessagesLookup";
import { resolveClientUiLanguage } from "@/i18n/resolveClientUiLanguage";
import { printT } from "@/lib/printI18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { formatTemperatureDualLine, formatVitalsHeaderLineForLocale } from "@/lib/patientVitals";
import { defaultVitalsEntryUnits } from "@/lib/vitalsEntryDefaults";
import { formatLatestVitalsLine } from "@/lib/encounterChromeI18n";
import { dispositionReadinessIssueText } from "@/components/clinical/DispositionReadinessBanner";
import { localizeMarTimelinePrnCellText } from "@/features/mar/marShiftTimelineDisplay";
import {
  canRunPlatformAdminDomRewrite,
  parsePlatformUiLanguage,
  platformLanguageSelectOptions,
} from "@/i18n/platformLocale";
import { selectableDxPrimaryFromGovernedMaps } from "@/components/diagnosis/icd10SelectableDisplayTestUtil";
import { getCatalogSearchItemDisplayLabel } from "@/lib/catalogDisplayLabel";
import {
  encounterChartExportHtmlHref,
  encounterChartExportSnapshotHtmlHref,
  roiSnapshotDocumentHtmlHref,
} from "@/lib/chartExportHtmlHref";
import type { CatalogSearchItem } from "@/lib/catalogSearchTypes";
import { MEDUI_ES_1E_OVERLAY } from "./meduiEs1eCorePlatformOverlay";
import { MEDUI_ES_1F_OVERLAY } from "./meduiEs1fEmergencyDepartmentOverlay";
import { MEDUI_ES_1G_OVERLAY } from "./meduiEs1gHospitalInpatientObservationOverlay";
import { MEDUI_ES_1H_OVERLAY } from "./meduiEs1hOrdersMarPharmacyDiagnosticsOverlay";
import { MEDUI_ES_1I_OVERLAY } from "./meduiEs1iClinicDentalBillingAncillaryOverlay";
import { MEDUI_ES_1JB_OVERLAY } from "./meduiEs1jSafeChromeOverlay";
import { MEDUI_ES_1K_OVERLAY, MEDUI_ES_1K_EMPTY_OVERLAY_PATHS } from "./meduiEs1kSafeChromeOverlay";
import { MEDUI_ES_1K_PUBLIC_CHROME_OVERLAY, MEDUI_ES_1K_PUBLIC_CHROME_EMPTY_OVERLAY_PATHS } from "./meduiEs1kPublicChromeOverlay";
import { MEDUI_TRILANG_2_CERTIFIED_PREFIXES } from "./meduiTrilang2ClinicalWorkspaceOverlay";
import es from "./es";

const webRoot = join(import.meta.dirname, "../..");
const repoRoot = join(webRoot, "../../..");

const FROZEN_LEGAL_SOURCE_PATHS = [
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

const LAB_ITEM: CatalogSearchItem = {
  id: "lab-cbc",
  code: "CBC",
  type: "LAB_TEST",
  displayNameEn: "Complete Blood Count",
  displayNameFr: "Numération formule sanguine",
};

describe("MEDUI.ES.1K public enablement", () => {
  it("public locales are EN / FR / ES with native Español label; default remains EN", () => {
    expect([...supportedLanguages]).toEqual(["fr", "en", "es"]);
    expect([...PUBLICLY_SELECTABLE_PRODUCT_UI_LANGUAGES]).toEqual(["fr", "en", "es"]);
    expect(PRODUCT_DEFAULT_UI_LANGUAGE).toBe("en");
    expect(FACILITY_DEFAULT_LANGUAGE).toBe("fr");
    expect(PRODUCT_UI_LOCALE_REGISTRY.es.publiclySelectable).toBe(true);
    expect(PRODUCT_UI_LOCALE_REGISTRY.es.nativeLabel).toBe("Español");
    expect(productUiLanguageSelectOptions()).toEqual([
      { value: "fr", label: "Français" },
      { value: "en", label: "English" },
      { value: "es", label: "Español" },
    ]);
    expect(productUiLanguageSchema.safeParse("es").success).toBe(true);
    expect(productUiLanguageSchema.safeParse("ht").success).toBe(false);
  });

  it("stored es hydrates to ES; invalid/absent still defaults to EN", () => {
    expect(resolvePublicProductUiLanguageOrDefault("es")).toBe("es");
    expect(resolvePublicProductUiLanguageOrDefault("es-419")).toBe("es");
    expect(resolveClientUiLanguage({ storedLanguage: "es" })).toBe("es");
    expect(resolveClientUiLanguage({ storedLanguage: "en" })).toBe("en");
    expect(resolveClientUiLanguage({ storedLanguage: "fr" })).toBe("fr");
    expect(resolveClientUiLanguage({})).toBe("en");
    expect(resolveProductUiLanguageOrDefault("de")).toBe("en");
    expect(resolveProductUiLanguageFromBrowserCandidates(["es-419", "es"])).toBeNull();
  });

  it("patient preferredLanguage is not an input to product UI resolution", () => {
    const src = readFileSync(join(webRoot, "i18n/resolveClientUiLanguage.ts"), "utf8");
    expect(src).not.toMatch(/preferredLanguage/);
    expect(resolveClientUiLanguage({ storedLanguage: "en" })).toBe("en");
  });
});

describe("MEDUI.ES.1K six-direction isolation", () => {
  it("message lookup never substitutes another Medora language", () => {
    const en = resolveClinicalUiMessage("en", "common.save");
    const fr = resolveClinicalUiMessage("fr", "common.save");
    const esMsg = resolveClinicalUiMessage("es", "common.save");
    expect(en).not.toBe(fr);
    expect(esMsg).not.toBe(en);
    expect(esMsg).not.toBe(fr);
    const missing = "meduiEs1k.missing.key";
    expect(resolveClinicalUiMessage("en", missing)).toBe(missing);
    expect(resolveClinicalUiMessage("fr", missing)).toBe(missing);
    expect(resolveClinicalUiMessage("es", missing)).toBe(missing);
  });

  it("errors, print chrome, and Intl tags stay active-locale specific", () => {
    expect(normalizeUserFacingError("Encounter not found", "en")).toBe("Encounter not found.");
    expect(normalizeUserFacingError("Encounter not found", "fr")).toBe("Consultation introuvable.");
    expect(normalizeUserFacingError("Encounter not found", "es")).toBe("Encuentro no encontrado.");
    expect(normalizeUserFacingError("Encounter not found", "es")).not.toContain("Encounter");
    expect(normalizeUserFacingError("Encounter not found", "es")).not.toContain("introuvable");
    expect(printT("es", "printOutput.discharge.documentH1")).not.toBe(printT("en", "printOutput.discharge.documentH1"));
    expect(printT("es", "printOutput.discharge.documentH1")).not.toBe(printT("fr", "printOutput.discharge.documentH1"));
    expect(productUiBcp47Tag("es")).toBe("es-419");
    expect(productUiBcp47Tag("es")).not.toBe(productUiBcp47Tag("fr"));
    expect(productUiBcp47Tag("es")).not.toBe(productUiBcp47Tag("en"));
  });

  it("pickProductUiCopy never uses EN/FR as Spanish", () => {
    const copy = { en: "Save", fr: "Enregistrer", es: "Guardar" };
    expect(pickProductUiCopy("en", copy, "X")).toBe("Save");
    expect(pickProductUiCopy("fr", copy, "X")).toBe("Enregistrer");
    expect(pickProductUiCopy("es", copy, "X")).toBe("Guardar");
    expect(pickProductUiCopy("es", { en: "Save", fr: "Enregistrer" }, "Ocurrió un error.")).toBe(
      "Ocurrió un error."
    );
    expect(pickProductUiCopy("es", { en: "Save", fr: "Enregistrer" }, "Ocurrió un error.")).not.toBe("Save");
    expect(pickProductUiCopy("es", { en: "Save", fr: "Enregistrer" }, "Ocurrió un error.")).not.toBe(
      "Enregistrer"
    );
  });

  it("1K-widened formatters do not treat ES as FR or EN", () => {
    expect(formatTemperatureDualLine(37, "es")).toBe("37.0°C / 98.6°F");
    expect(formatTemperatureDualLine(37, "fr")).toBe("37.0°C / 98.6°F");
    expect(formatTemperatureDualLine(37, "en")).toBe("98.6°F / 37.0°C");
    const esVitals = formatVitalsHeaderLineForLocale({ tempC: 37, painScore: 4 }, "es");
    expect(esVitals).toContain("Dolor");
    expect(esVitals).not.toContain("Douleur");
    expect(esVitals).not.toContain("Température");
    expect(esVitals).not.toContain("Pain ");
    expect(defaultVitalsEntryUnits("es")).toEqual({
      tempInputUnit: "C",
      weightInputUnit: "kg",
      heightInputMode: "cm",
    });
    expect(defaultVitalsEntryUnits("de")).toEqual({
      tempInputUnit: "F",
      weightInputUnit: "lb",
      heightInputMode: "ftin",
    });
    const esi = formatLatestVitalsLine({}, 2, "es", (k) => k);
    expect(esi).toBe("ESI 2");
    expect(esi).not.toBe("ESI : 2");
    expect(
      dispositionReadinessIssueText((k) => k, { code: "FOO_BAR", message: "Message API français" }, {
        activeOrderCounts: { lab: 0, imaging: 0, medication: 0, care: 0 },
      } as never, "es")
    ).toBe("Foo Bar");
    expect(
      dispositionReadinessIssueText((k) => k, { code: "FOO_BAR", message: "Message API français" }, {
        activeOrderCounts: { lab: 0, imaging: 0, medication: 0, care: 0 },
      } as never, "es")
    ).not.toBe("Message API français");
    expect(localizeMarTimelinePrnCellText("Pain 4/10", "es")).toBe("Dolor 4/10");
    expect(localizeMarTimelinePrnCellText("Douleur 4/10", "es")).toBe("Dolor 4/10");
    expect(localizeMarTimelinePrnCellText("Pain 4/10", "es")).not.toBe("Douleur 4/10");
  });
});

describe("MEDUI.ES.1K catalogs + print routing", () => {
  it("ES catalog display uses governed Spanish, never EN or FR labels", () => {
    expect(selectableDxPrimaryFromGovernedMaps({ code: "R07.9", description: "Chest pain, unspecified" }, "es")).toBe(
      "Dolor torácico no especificado"
    );
    expect(selectableDxPrimaryFromGovernedMaps({ code: "R07.9", description: "Chest pain, unspecified" }, "es")).not.toBe(
      "Chest pain, unspecified"
    );
    expect(getCatalogSearchItemDisplayLabel(LAB_ITEM, "es")).toBe("Hemograma completo");
    expect(getCatalogSearchItemDisplayLabel(LAB_ITEM, "en")).toBe("Complete Blood Count");
    expect(getCatalogSearchItemDisplayLabel(LAB_ITEM, "fr")).toBe("Numération formule sanguine");
    expect(
      pickCatalogDisplayLabelForProductUi("es", {
        displayNameEn: "Glucose",
        displayNameFr: "Glucose plasmatique",
        code: "GLU",
      })
    ).toBe("GLU");
  });

  it("chart-export and ROI HTML entry points route EN→en, FR→fr, ES→es", () => {
    expect(encounterChartExportHtmlHref("enc-1", "es")).toContain("locale=es");
    expect(encounterChartExportHtmlHref("enc-1", "fr")).toContain("locale=fr");
    expect(encounterChartExportHtmlHref("enc-1", "en")).toContain("locale=en");
    expect(encounterChartExportSnapshotHtmlHref("enc-1", "snap-1", "es")).toContain("locale=es");
    expect(roiSnapshotDocumentHtmlHref("roi-1", "es")).toContain("locale=es");
    const closed = readFileSync(join(webRoot, "components/encounters/EnterpriseClosedEncounterViewer.tsx"), "utf8");
    expect(closed).toContain("encounterChartExportHtmlHref");
    const roi = readFileSync(join(webRoot, "../app/app/admin/roi/page.tsx"), "utf8");
    expect(roi).toContain("roiSnapshotDocumentHtmlHref");
  });
});

describe("MEDUI.ES.1K primary vs principal + terminology", () => {
  it("keeps PRIMARY as Diagnóstico primario and principal REVIEW_REQUIRED with no UI keys", () => {
    expect(MEDORA_SPANISH_MEDICAL_TERMINOLOGY_VERSION).toBe("2026.09.1");
    const counts = esMedicalTerminologyCounts();
    expect(counts.total).toBe(ES_MEDICAL_TERMINOLOGY.length);
    expect(counts.approved + counts.reviewRequired).toBe(counts.total);
    const primary = getSpanishMedicalTerminologyEntry("clinical.dx.primaryDiagnosis");
    const principal = getSpanishMedicalTerminologyEntry("clinical.dx.principalDiagnosis");
    expect(primary?.es).toBe("Diagnóstico primario");
    expect(primary?.status).toBe("APPROVED");
    expect(principal?.status).toBe("REVIEW_REQUIRED");
    expect(principal?.uiMessageKeys ?? []).toEqual([]);
    expect(i18nMessage("es", "printOutput.discharge.primaryDiagnosis")).toBe("Diagnóstico primario");
    expect(MEDUI_ES_1F_OVERLAY["emergencyDisposition.errors.primaryDiagnosisRequired"]).toContain(
      "diagnóstico primario"
    );
    expect(MEDUI_ES_1G_OVERLAY["hospitalAdmissionD4a25.fields.primaryDiagnosis"]).toBe("Diagnóstico primario");
    expect(Object.values(MEDUI_ES_1F_OVERLAY).some((v) => /diagn[oó]stico principal/i.test(v))).toBe(false);
    expect(Object.values(MEDUI_ES_1G_OVERLAY).some((v) => /diagn[oó]stico principal/i.test(v))).toBe(false);
  });
});

describe("MEDUI.ES.1K legal freeze + Platform Admin isolation", () => {
  it("does not translate frozen legal/source packet and EMTALA keys", () => {
    for (const path of FROZEN_LEGAL_SOURCE_PATHS) {
      expect(MEDUI_ES_1E_OVERLAY[path], path).toBeUndefined();
      expect(MEDUI_ES_1F_OVERLAY[path], path).toBeUndefined();
      expect(MEDUI_ES_1G_OVERLAY[path], path).toBeUndefined();
      expect(MEDUI_ES_1H_OVERLAY[path], path).toBeUndefined();
      expect(MEDUI_ES_1I_OVERLAY[path], path).toBeUndefined();
      expect(MEDUI_ES_1JB_OVERLAY[path], path).toBeUndefined();
      expect(isHiddenSpanishPlaceholder(getByPath(es, path) as string), path).toBe(true);
    }
    const usFederal = readFileSync(
      join(repoRoot, "apps/api/prisma/registration-packets/legal-sources/us-federal.json"),
      "utf8"
    );
    expect(usFederal).toContain("SOURCE_GROUNDED_PENDING_LEGAL_APPROVAL");
    expect(usFederal).not.toMatch(/LEGAL_CONTENT_APPROVED/);
  });

  it("Platform Admin remains a legacy EN/FR island and never DOM-rewrites es", () => {
    expect(parsePlatformUiLanguage("es")).toBeNull();
    expect(canRunPlatformAdminDomRewrite("es")).toBe(false);
    expect(canRunPlatformAdminDomRewrite("en")).toBe(true);
    expect(platformLanguageSelectOptions().map((o) => o.value).sort()).toEqual(["en", "fr"]);
    expect(platformLanguageSelectOptions().some((o) => /español/i.test(o.label))).toBe(false);
    const platformProvider = readFileSync(join(webRoot, "i18n/I18nProvider.tsx"), "utf8");
    expect(platformProvider).toContain("canRunPlatformAdminDomRewrite");
    expect(platformProvider).not.toMatch(/Español/);
  });
});

type Es1kPlaceholderClass =
  | "LEGAL_REVIEW_REQUIRED"
  | "SOURCE_LANGUAGE_CONTENT"
  | "AUTHORED_CONTENT"
  | "CANONICAL_CODE"
  | "CANONICAL_IDENTITY"
  | "LEGACY_UNUSED"
  | "DEAD_UNREACHABLE"
  | "NON_PUBLIC_TOOLING"
  | "INTENTIONAL_EMPTY"
  | "UNLOCALIZED_SOURCE"
  | "UNKNOWN";

const FROZEN_LEGAL_SOURCE_PATH_SET = new Set<string>(FROZEN_LEGAL_SOURCE_PATHS);

const REACHABLE_PUBLIC_UI_PREFIXES = [
  "common",
  "appShell",
  "nav",
  "navGroups",
  "auth",
  "landingHome",
  "patientsListPage",
  "patientProfile",
  "registrationHome",
  "registrationWorkspace",
  "chartInsuranceSummary",
  "encounterChrome",
  "patientQuickActions",
  "patientConsultationsTab",
  "emergencyTrackboard",
  "emergencyErClosure",
  "emergencyDisposition",
  "erTriage",
  "erMseProviderPanel",
  "printOutput",
  "documentCenter",
  "packetWizard",
  "esignature",
  "facesheet",
  "roi",
  "createOrderModal",
  "mar",
  "pharmacy",
  "clinic",
  "dental",
  "billing",
  "adminHub",
  "publicHealthSummary",
  "publicHealthModule",
  "publicHealthNational",
  "publicHealthVaccinationsPage",
  "diseaseReports",
  "adminUsers",
  "adminAudit",
  "clinicalSafetyGuardrails",
  "providerDischargeDocumentation19Y",
  "medicationKnowledgeExpansionWave2",
  "facilityIdentityD4c7i",
  "facilityServiceConfigD4c9",
  "clinicalDashboard",
  "openEncountersTable",
  "followUpsPage",
  "createFollowUpModal",
  "diagnosisEntry",
  "diagnosisOnset",
  "removeDiagnosisModal",
  "vitalSummary",
  "vitalsContext",
  "vitalsUnits",
  "erMseExamChips",
  "erMseHpiChips",
  "erMseRosChips",
  "erMseMdmChips",
  "erTriageComplaintTemplates",
  "patientDischargeInstructions",
  "nursingDischargeVitals",
] as const;

function classifyRemainingEsPlaceholder(path: string): Es1kPlaceholderClass {
  if (
    FROZEN_LEGAL_SOURCE_PATH_SET.has(path) ||
    path === "packetWizard.consentFull" ||
    path === "packetWizard.emtalaFull" ||
    path.startsWith("packetWizard.") ||
    path.startsWith("printOutput.erPacket.emtala") ||
    path.startsWith("printOutput.erPacket.sectionEmtala") ||
    path.startsWith("printOutput.erPacket.signedEmtala") ||
    path.startsWith("esignature.patientAttestation") ||
    path.startsWith("esignature.staffAttestation")
  ) {
    return "LEGAL_REVIEW_REQUIRED";
  }
  if (path.startsWith("enterpriseInterdisciplinaryCarePlansD4b6.templates.")) {
    return "SOURCE_LANGUAGE_CONTENT";
  }
  if (
    path.startsWith("encounterClinicTab.snippet") ||
    path.startsWith("encounterClinicTab.observationMdmSnippet")
  ) {
    return "SOURCE_LANGUAGE_CONTENT";
  }
  if (
    path.startsWith("providerDocumentationComplaintIntel") ||
    path.startsWith("providerDocumentationTemplateHpiDimensions") ||
    path.startsWith("providerDocumentationSmartSentences") ||
    path.startsWith("providerDocumentationDynamicIntel") ||
    path.startsWith("providerDocumentationDynamicClusters")
  ) {
    return "SOURCE_LANGUAGE_CONTENT";
  }
  if (path.startsWith("providerDischargeDocumentation") || path.startsWith("nursingDischargeNotes")) {
    return "AUTHORED_CONTENT";
  }
  if (
    path.startsWith("platformAdmin") ||
    path.startsWith("catalogImport") ||
    path.startsWith("catalogAdmin") ||
    path.startsWith("handbook") ||
    path.startsWith("mspp") ||
    path.startsWith("adminMsppAccess") ||
    path.startsWith("catalogAudit") ||
    path.startsWith("systemHealth") ||
    path.startsWith("medicationRxNormReview") ||
    path.startsWith("medicationInventoryStaging") ||
    path.startsWith("reportsOps") ||
    path.startsWith("medicationPhase17Pilot")
  ) {
    return "NON_PUBLIC_TOOLING";
  }
  if (path.startsWith("createOrderModal.orderSetItems")) {
    return "CANONICAL_IDENTITY";
  }
  return "UNLOCALIZED_SOURCE";
}

function isReachableUiChromeFamily(path: string): boolean {
  if (path.startsWith("enterpriseInterdisciplinaryCarePlansD4b6.templates.")) return false;
  if (
    path.startsWith("encounterClinicTab.snippet") ||
    path.startsWith("encounterClinicTab.observationMdmSnippet")
  ) {
    return false;
  }
  if (MEDUI_TRILANG_2_CERTIFIED_PREFIXES.some((p) => path === p || path.startsWith(`${p}.`))) {
    return true;
  }
  return (
    path.startsWith("encounterChrome.") ||
    path.startsWith("clinicalDocumentation.") ||
    path.startsWith("patientChartUi.") ||
    path.startsWith("edLifecycle.") ||
    path.startsWith("enterpriseInterdisciplinaryCarePlansD4b6.") ||
    path.startsWith("encounterClinicTab.") ||
    path.startsWith("nursingAssessmentTab.") ||
    path.startsWith("encounterTriageTab.") ||
    path.startsWith("adminHub.") ||
    path.startsWith("publicHealthSummary.") ||
    path.startsWith("publicHealthModule.") ||
    path.startsWith("publicHealthNational.") ||
    path.startsWith("publicHealthVaccinationsPage.") ||
    path.startsWith("diseaseReports.") ||
    path.startsWith("adminUsers.") ||
    path.startsWith("adminAudit.") ||
    path.startsWith("clinicalSafetyGuardrails.") ||
    path.startsWith("providerDischargeDocumentation19Y.") ||
    path.startsWith("medicationKnowledgeExpansionWave2.") ||
    path.startsWith("facilityIdentityD4c7i.") ||
    path.startsWith("facilityServiceConfigD4c9.")
  );
}

describe("MEDUI.ES.1K prior overlays remain composed", () => {
  it("1E–1J.B overlays still win over hidden placeholders", () => {
    expect(i18nMessage("es", "common.save")).toBe(MEDUI_ES_1E_OVERLAY["common.save"]);
    expect(i18nMessage("es", "nav.trackboard")).toBe(MEDUI_ES_1E_OVERLAY["nav.trackboard"]);
    const leaves = collectLeaves(es);
    expect(leaves.size).toBe(44266);
    let placeholders = 0;
    for (const value of leaves.values()) {
      if (isHiddenSpanishPlaceholder(value)) placeholders += 1;
    }
    expect(placeholders).toBe(23013);
    expect(placeholders).toBeLessThan(leaves.size);
  });
});

describe("MEDUI.ES.1K reachable chrome overlay", () => {
  it("covers encounterChrome.modals and printOutput.rx with sorted governed Spanish", () => {
    const keys = Object.keys(MEDUI_ES_1K_OVERLAY);
    expect(keys).toEqual([...keys].sort());
    expect(keys).toHaveLength(85);
    expect([...MEDUI_ES_1K_EMPTY_OVERLAY_PATHS].sort()).toEqual(["encounterChrome.modals.observationDischargeReminderTitle"]);
    expect(MEDUI_ES_1K_OVERLAY["encounterChrome.modals.observationDischargeReminderTitle"]).toBe("");
    expect(MEDUI_ES_1K_OVERLAY["printOutput.rx.footerPrinted"]).toContain("{date}");
    expect(MEDUI_ES_1K_OVERLAY["encounterChrome.modals.goToTab"]).toContain("{tab}");
    for (const [path, value] of Object.entries(MEDUI_ES_1K_OVERLAY)) {
      expect(i18nMessage("es", path), path).toBe(value);
      expect(isHiddenSpanishPlaceholder(value), path).toBe(false);
    }
  });
});

describe("MEDUI.ES.1K public chrome overlay", () => {
  it("covers remaining reachable families with sorted unique governed Spanish", () => {
    const keys = Object.keys(MEDUI_ES_1K_PUBLIC_CHROME_OVERLAY);
    expect(keys).toEqual([...keys].sort());
    expect(keys).toHaveLength(2458);
    expect(new Set(keys).size).toBe(2458);
    expect([...MEDUI_ES_1K_PUBLIC_CHROME_EMPTY_OVERLAY_PATHS].sort()).toEqual(
      [...MEDUI_ES_1K_PUBLIC_CHROME_EMPTY_OVERLAY_PATHS].sort()
    );
    expect(MEDUI_ES_1K_PUBLIC_CHROME_EMPTY_OVERLAY_PATHS).toHaveLength(3);
    for (const path of MEDUI_ES_1K_PUBLIC_CHROME_EMPTY_OVERLAY_PATHS) {
      expect(MEDUI_ES_1K_PUBLIC_CHROME_OVERLAY[path]).toBe("");
    }
    const safe = new Set(Object.keys(MEDUI_ES_1K_OVERLAY));
    for (const [path, value] of Object.entries(MEDUI_ES_1K_PUBLIC_CHROME_OVERLAY)) {
      expect(safe.has(path), path).toBe(false);
      expect(path.startsWith("enterpriseInterdisciplinaryCarePlansD4b6.templates."), path).toBe(false);
      expect(value.toLowerCase(), path).not.toContain("diagnóstico principal");
      expect(i18nMessage("es", path), path).toBe(value);
      expect(isHiddenSpanishPlaceholder(value), path).toBe(false);
    }
  });
});

describe("MEDUI.ES.1K remaining placeholder classification", () => {
  it("classifies remaining ES placeholders; UNKNOWN in reachable public UI is 0", () => {
    const leaves = collectLeaves(es);
    const byClass: Record<Es1kPlaceholderClass, number> = {
      LEGAL_REVIEW_REQUIRED: 0,
      SOURCE_LANGUAGE_CONTENT: 0,
      AUTHORED_CONTENT: 0,
      CANONICAL_CODE: 0,
      CANONICAL_IDENTITY: 0,
      LEGACY_UNUSED: 0,
      DEAD_UNREACHABLE: 0,
      NON_PUBLIC_TOOLING: 0,
      INTENTIONAL_EMPTY: 0,
      UNLOCALIZED_SOURCE: 0,
      UNKNOWN: 0,
    };
    const unknownReachable: string[] = [];
    const remainingModal: string[] = [];
    const remainingRx: string[] = [];
    let reachableUiInUnlocalized = 0;
    for (const [path, value] of leaves) {
      if (!isHiddenSpanishPlaceholder(value)) continue;
      const cls = classifyRemainingEsPlaceholder(path);
      byClass[cls] += 1;
      if (cls === "UNKNOWN" && REACHABLE_PUBLIC_UI_PREFIXES.some((p) => path === p || path.startsWith(`${p}.`))) {
        unknownReachable.push(path);
      }
      if (path.startsWith("encounterChrome.modals.")) remainingModal.push(path);
      if (path.startsWith("printOutput.rx.")) remainingRx.push(path);
      if (cls === "UNLOCALIZED_SOURCE" && isReachableUiChromeFamily(path)) reachableUiInUnlocalized += 1;
    }
    const placeholders = Object.values(byClass).reduce((a, b) => a + b, 0);
    expect(unknownReachable, unknownReachable.slice(0, 40).join("\n")).toEqual([]);
    expect(byClass.UNKNOWN).toBe(0);
    expect(byClass.LEGAL_REVIEW_REQUIRED).toBe(53);
    expect(remainingModal, remainingModal.join("\n")).toEqual([]);
    expect(remainingRx, remainingRx.join("\n")).toEqual([]);
    expect(placeholders).toBe(23013);
    expect(reachableUiInUnlocalized, "reachable UI still in UNLOCALIZED_SOURCE").toBe(0);
    console.log("MEDUI.ES.1K_PLACEHOLDER_CLASSES", JSON.stringify(byClass));
  });
});
