/**
 * MEDUI.ES.1I — Clinic / Dental / Billing / ancillary governed Spanish overlay.
 */
import { describe, expect, it } from "vitest";
import {
  PUBLICLY_SELECTABLE_PRODUCT_UI_LANGUAGES,
  productUiLanguageSelectOptions,
  pickCatalogDisplayLabelForProductUi,
} from "@/i18n/config";
import {
  applyApprovedSpanishTerminology,
  ES_MEDICAL_TERMINOLOGY,
  getSpanishMedicalTerm,
  isHiddenSpanishPlaceholder,
  existingOrderDisplayLabel,
} from "@medora/shared";
import { resolveClinicalUiMessage } from "@/i18n/messages/registry";
import { i18nMessage } from "@/lib/i18nMessagesLookup";
import { resolveClientUiLanguage } from "@/i18n/resolveClientUiLanguage";
import {
  catalogSearchItemFullDisplayLine,
  getCatalogSearchItemDisplayLabel,
} from "@/lib/catalogDisplayLabel";
import type { CatalogSearchItem } from "@/lib/catalogSearchTypes";
import en from "./en";
import fr from "./fr";
import es, { applyGovernedSpanishOverlay } from "./es";
import { createHiddenSpanishCatalog } from "./hiddenSpanishCatalog";
import { MEDUI_ES_1E_OVERLAY } from "./meduiEs1eCorePlatformOverlay";
import { MEDUI_ES_1F_OVERLAY } from "./meduiEs1fEmergencyDepartmentOverlay";
import { MEDUI_ES_1G_OVERLAY } from "./meduiEs1gHospitalInpatientObservationOverlay";
import { MEDUI_ES_1H_OVERLAY } from "./meduiEs1hOrdersMarPharmacyDiagnosticsOverlay";
import {
  MEDUI_ES_1I_EMPTY_OVERLAY_PATHS,
  MEDUI_ES_1I_OVERLAY,
} from "./meduiEs1iClinicDentalBillingAncillaryOverlay";

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

function isSentenceLike(value: string): boolean {
  const withoutTokens = value.replace(/\{[^{}]+\}|\{\{[^{}]+\}\}/g, " ");
  return /\S\s\S/.test(withoutTokens) && /(^|[^\p{L}])\p{Ll}\p{L}{3,}/u.test(withoutTokens);
}

function interpolationTokens(value: string): string[] {
  return [...value.matchAll(/\{[^{}]+\}|\{\{[^{}]+\}\}/g)].map((m) => m[0]).sort();
}

function matches1iPrefix(path: string, prefixes: string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(`${p}.`));
}

function classify1iPath(path: string): string {
  if (path === "clinicCare" || path.startsWith("clinicCare")) return "CLINIC";
  if (path === "dentalCare" || path.startsWith("dentalCare")) return "DENTAL";
  if (matches1iPrefix(path, ["codingIntegrityReview", "procedureRevenueReview", "procedureBillingReadiness"])) {
    return "BILLING_REVIEW";
  }
  if (
    matches1iPrefix(path, [
      "billingPage",
      "billingClassification",
      "billingExportReadiness",
      "billingLedgerReadiness",
      "billingGovernance",
      "facilityFeeReadiness",
      "chargeCaptureReview",
    ])
  ) {
    return "BILLING_UI";
  }
  if (
    matches1iPrefix(path, [
      "revenueCycle",
      "revenueClaimSubmission",
      "revenueClaimAudit",
      "revenuePayment",
      "exportMonitoring",
    ])
  ) {
    return "RCM_CONNECTORS";
  }
  if (matches1iPrefix(path, ["claimAssemblyPreview"])) return "CLAIM_VALIDATION_UI";
  if (matches1iPrefix(path, ["encounterClinicTab"])) return "GENERIC_DEPENDENCY_REQUIRED_BY_1I";
  return "OUT_OF_SCOPE";
}

function countPlaceholders(tree: unknown): { totalLeaves: number; placeholders: number } {
  const leaves = collectLeaves(tree);
  let placeholders = 0;
  for (const value of leaves.values()) {
    if (isHiddenSpanishPlaceholder(value)) placeholders += 1;
  }
  return { totalLeaves: leaves.size, placeholders };
}

const STABLE_CODES = new Set([
  "CPT",
  "HCPCS",
  "ICD-10-CM",
  "ICD-10-PCS",
  "NDC",
  "CDT",
  "837P",
  "837I",
  "837D",
  "CMS-1500",
  "UB-04",
  "NPI",
  "MRN",
  "DOS",
  "ERA",
  "ACK",
  "X12",
]);

const VENDORS = new Set(["Change Healthcare", "Availity", "Office Ally"]);

const SNIPPET_SUBSTR = ["snippetImpression", "snippetPlan", "observationMdmSnippet"];

const J1K_PREFIXES = [
  "printOutput",
  "admin",
  "catalogAudit",
  "catalogImport",
  "medicationMaster",
  "medicationGovernance",
  "goLive",
  "mspp",
  "diseaseReports",
  "publicHealth",
];

describe("MEDUI.ES.1I overlay ownership", () => {
  it("does not overlap earlier overlays and stays inside 1I classes", () => {
    const earlier = new Set([
      ...Object.keys(MEDUI_ES_1E_OVERLAY),
      ...Object.keys(MEDUI_ES_1F_OVERLAY),
      ...Object.keys(MEDUI_ES_1G_OVERLAY),
      ...Object.keys(MEDUI_ES_1H_OVERLAY),
    ]);
    const outOfScope: string[] = [];
    for (const path of Object.keys(MEDUI_ES_1I_OVERLAY)) {
      expect(earlier.has(path), path).toBe(false);
      const cls = classify1iPath(path);
      if (cls === "OUT_OF_SCOPE") outOfScope.push(path);
      expect(SNIPPET_SUBSTR.some((s) => path.includes(s)), path).toBe(false);
      expect(J1K_PREFIXES.some((p) => path === p || path.startsWith(`${p}.`)), path).toBe(false);
    }
    expect(outOfScope).toEqual([]);
  });

  it("does not claim 1J print/legal bodies or 1K catalog-admin modules", () => {
    for (const path of Object.keys(MEDUI_ES_1I_OVERLAY)) {
      expect(path.startsWith("printOutput"), path).toBe(false);
      expect(path.startsWith("providerDocumentationComplaintIntel"), path).toBe(false);
      expect(path.startsWith("providerDischargeDocumentation19Y"), path).toBe(false);
    }
    expect(isHiddenSpanishPlaceholder(getByPath(es, "printOutput.erPacket.finalDiagnosis") as string)).toBe(true);
  });

  it("does not overlay authored insert snippets", () => {
    for (const path of [
      "encounterClinicTab.snippetImpression0",
      "encounterClinicTab.snippetPlan0",
      "encounterClinicTab.observationMdmSnippetContinuedRationale",
    ]) {
      expect(MEDUI_ES_1I_OVERLAY[path], path).toBeUndefined();
      expect(isHiddenSpanishPlaceholder(getByPath(es, path) as string), path).toBe(true);
    }
  });
});

describe("MEDUI.ES.1I REVIEW_REQUIRED governance", () => {
  it("does not bypass remaining REVIEW_REQUIRED Spanish", () => {
    const reviewRequiredSpanish = ES_MEDICAL_TERMINOLOGY.filter((e) => e.status === "REVIEW_REQUIRED").map((e) => e.es);
    const bypasses: Array<{ path: string; value: string }> = [];
    for (const [path, value] of Object.entries(MEDUI_ES_1I_OVERLAY)) {
      if (reviewRequiredSpanish.includes(value)) bypasses.push({ path, value });
    }
    expect(bypasses).toEqual([]);
    expect(reviewRequiredSpanish).toContain("Diagnóstico principal de egreso");
    expect(getByPath(es, "billingPage.billingSide_PROFESSIONAL")).toBe("Profesional");
    expect(getByPath(es, "revenuePayment.table.claim")).toBe("Reclamación");
    expect(getByPath(es, "billingPage.billingEditRevenueCode")).toBe("Código de ingresos");
    expect(getByPath(es, "billingPage.identityTerm_subscriber")).toBe("Titular");
    expect(getByPath(es, "revenueCycle.table.claimStatus")).toBe("Estado de la reclamación");
    expect(MEDUI_ES_1I_OVERLAY["billingPage.billingSide_PROFESSIONAL"]).toBeUndefined();
    expect(MEDUI_ES_1I_OVERLAY["revenuePayment.table.claim"]).toBeUndefined();
  });

  it("keeps principal diagnosis REVIEW_REQUIRED and unlocalized", () => {
    const entry = ES_MEDICAL_TERMINOLOGY.find((e) => e.key === "clinical.dx.principalDiagnosis");
    expect(entry?.status).toBe("REVIEW_REQUIRED");
    expect(entry?.uiMessageKeys ?? []).toEqual([]);
    expect(Object.values(MEDUI_ES_1I_OVERLAY)).not.toContain("Diagnóstico principal de egreso");
  });

  it("keeps primary diagnosis linguistically distinct from principal diagnosis", () => {
    const primary = ES_MEDICAL_TERMINOLOGY.find((e) => e.key === "clinical.dx.primaryDiagnosis");
    const principal = ES_MEDICAL_TERMINOLOGY.find((e) => e.key === "clinical.dx.principalDiagnosis");
    expect(primary?.status).toBe("APPROVED");
    expect(primary?.es).toBe("Diagnóstico primario");
    expect(getSpanishMedicalTerm("clinical.dx.primaryDiagnosis")).toBe("Diagnóstico primario");
    expect(principal?.status).toBe("REVIEW_REQUIRED");
    expect(principal?.uiMessageKeys ?? []).toEqual([]);
    expect(primary?.uiMessageKeys ?? []).not.toContain("clinical.dx.principalDiagnosis");
    expect(getByPath(es, "printOutput.discharge.primaryDiagnosis")).toBe("Diagnóstico primario");
    expect(getByPath(es, "printOutput.discharge.primaryDiagnosis")).not.toBe(principal?.es);

    const primaryDiagnosisOverlayKeys = [
      "billingExportReadiness.reason.MISSING_DIAGNOSIS",
      "chargeCaptureReview.reason.MISSING_PRIMARY_DIAGNOSIS",
      "claimAssemblyPreview.reason.MISSING_PRIMARY_DIAGNOSIS",
      "codingIntegrityReview.completeness.hasPrimaryDiagnosis",
      "codingIntegrityReview.reason.MISSING_PRIMARY_DIAGNOSIS",
      "facilityFeeReadiness.reason.MISSING_PRIMARY_DIAGNOSIS",
    ] as const;
    for (const path of primaryDiagnosisOverlayKeys) {
      const overlayValue = MEDUI_ES_1I_OVERLAY[path];
      const live = getByPath(es, path);
      expect(overlayValue, path).toBeDefined();
      expect(overlayValue, path).toMatch(/diagnóstico primario/i);
      expect(overlayValue, path).not.toMatch(/principal/i);
      expect(overlayValue, path).not.toBe(principal?.es);
      expect(live, path).toBe(overlayValue);
      expect(isHiddenSpanishPlaceholder(live as string), path).toBe(false);
    }
    expect(getByPath(es, "codingIntegrityReview.completeness.hasPrimaryDiagnosis")).toBe(
      "Diagnóstico primario presente",
    );

    const firstDiagnosisKeys = Object.keys(MEDUI_ES_1I_OVERLAY).filter((path) =>
      /first(Active)?Diagnosis|first diagnosis|first active diagnosis/i.test(path),
    );
    expect(firstDiagnosisKeys).toEqual([]);
    expect(getSpanishMedicalTerm("clinical.dx.primaryDiagnosis")).not.toBe(
      getSpanishMedicalTerm("clinical.dx.principalDiagnosis"),
    );
    expect(getSpanishMedicalTerm("clinical.dx.principalDiagnosis")).not.toBe("Diagnóstico primario");
  });
});

describe("MEDUI.ES.1I Clinic / Dental / Billing isolation", () => {
  it("localizes Clinic, Dental, Billing, and RCM chrome without EN/FR copy", () => {
    const keys = [
      "clinicCareD4c1.title",
      "clinicCareD4c2.views.provider",
      "dentalCareD5a2.nav.provider",
      "dentalCareD5a4.subtitle",
      "billingPage.claimPreviewTitle",
      "revenueCycle.title",
      "claimAssemblyPreview.cardTitle",
      "encounterClinicTab.title",
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
    }
  });

  it("preserves canonical billing codes and connector names", () => {
    const enLeaves = collectLeaves(en);
    for (const [path, value] of Object.entries(MEDUI_ES_1I_OVERLAY)) {
      const enVal = enLeaves.get(path) ?? "";
      if (STABLE_CODES.has(enVal) || VENDORS.has(enVal)) {
        expect(value, path).toBe(enVal);
      }
      expect(value).not.toMatch(/Código CPT traducido|descripción CDT/i);
    }
    expect(getByPath(es, "billingPage.billingCodeType_CPT")).toBe("CPT");
    expect(getByPath(es, "billingPage.billingCodeType_HCPCS")).toBe("HCPCS");
    expect(getByPath(es, "billingPage.clearinghouseVendor_change")).toBe("Change Healthcare");
  });

  it("preserves tooth / surface tokens and does not invent CDT descriptions", () => {
    const tooth = i18nMessage("es", "dentalCareD5a4.toothAria");
    const enTooth = i18nMessage("en", "dentalCareD5a4.toothAria");
    if (typeof tooth === "string" && typeof enTooth === "string" && enTooth.includes("{")) {
      expect(interpolationTokens(tooth)).toEqual(interpolationTokens(enTooth));
    }
    for (const [path, value] of Object.entries(MEDUI_ES_1I_OVERLAY)) {
      if (!path.startsWith("dentalCare")) continue;
      expect(value, path).not.toMatch(/\b(occlusal surface of tooth eighteen|CDT D[0-9]{4} .+\b)/i);
    }
  });

  it("ES prose never copies EN or FR source strings", () => {
    const enLeaves = collectLeaves(en);
    const frLeaves = collectLeaves(fr);
    const enIdenticalProse: string[] = [];
    for (const [path, value] of Object.entries(MEDUI_ES_1I_OVERLAY)) {
      if (value === "") continue;
      const enVal = enLeaves.get(path);
      const frVal = frLeaves.get(path);
      if (enVal && isSentenceLike(enVal) && value === enVal && !STABLE_CODES.has(enVal) && !VENDORS.has(enVal)) {
        enIdenticalProse.push(path);
      }
      if (frVal && isSentenceLike(frVal)) {
        expect(value, `${path} copies FR`).not.toBe(frVal);
      }
    }
    expect(enIdenticalProse).toEqual([]);
  });
});

describe("MEDUI.ES.1I diagnosis / procedure display isolation", () => {
  const dx: CatalogSearchItem = {
    id: "dx-j18",
    code: "J18.9",
    type: "LAB_TEST",
    displayNameEn: "Pneumonia, unspecified organism",
    displayNameFr: "Pneumonie, organisme non précisé",
    secondaryText: "J18.9 · ICD-10-CM",
    secondaryTextFr: "J18.9 · CIM-10",
    secondaryTextEn: "J18.9 · ICD-10-CM",
  };
  const proc: CatalogSearchItem = {
    id: "cpt-99213",
    code: "99213",
    type: "MEDICATION",
    displayNameEn: "Office visit established patient",
    displayNameFr: "Consultation patient connu",
    secondaryText: "99213 · CPT",
    secondaryTextFr: "99213 · CPT",
    secondaryTextEn: "99213 · CPT",
  };

  it("ES catalog display never selects EN or FR localized descriptions", () => {
    expect(getCatalogSearchItemDisplayLabel(dx, "es")).not.toBe("Pneumonia, unspecified organism");
    expect(getCatalogSearchItemDisplayLabel(dx, "es")).not.toBe("Pneumonie, organisme non précisé");
    expect(getCatalogSearchItemDisplayLabel(proc, "es")).not.toBe("Office visit established patient");
    expect(getCatalogSearchItemDisplayLabel(proc, "es")).not.toBe("Consultation patient connu");
    expect(
      pickCatalogDisplayLabelForProductUi("es", {
        displayNameEn: "Pneumonia, unspecified organism",
        displayNameFr: "Pneumonie, organisme non précisé",
        code: "J18.9",
      }),
    ).toBe("J18.9");
    expect(catalogSearchItemFullDisplayLine(dx, "es")).not.toMatch(/Pneumonia|Pneumonie/);
  });

  it("persist/reload keeps canonical code identity while ES display stays locale-specific", () => {
    const reloaded = existingOrderDisplayLabel(
      {
        id: "lab-es",
        type: "LAB",
        items: [
          {
            catalogItemType: "LAB_TEST",
            displayLabelEn: "Complete Blood Count",
            displayLabelFr: "Numération formule sanguine",
            catalogLabTest: {
              code: "CBC",
              displayNameEn: "Complete Blood Count",
              displayNameFr: "Numération formule sanguine",
            },
          },
        ],
      },
      "es",
    );
    expect(reloaded).not.toMatch(/Complete Blood Count|Numération/);
    expect(i18nMessage("en", "clinicCareD4c1.title")).toBe("Clinic Care");
    expect(i18nMessage("es", "clinicCareD4c1.title")).toBe("Atención clínica");
  });
});

describe("MEDUI.ES.1I interpolation and six-direction isolation", () => {
  it("preserves interpolation tokens on every overlay path", () => {
    const enLeaves = collectLeaves(en);
    for (const [path, value] of Object.entries(MEDUI_ES_1I_OVERLAY)) {
      const enVal = enLeaves.get(path);
      expect(enVal, path).toBeDefined();
      expect(interpolationTokens(value), path).toEqual(interpolationTokens(enVal as string));
    }
  });

  it("EN/FR/ES 1I chrome do not leak across languages", () => {
    const scoped = [
      "clinicCareD4c1.title",
      "dentalCareD5a2.title",
      "billingPage.claimPreviewTitle",
      "revenueCycle.title",
      "revenueClaimSubmission.title",
      "claimAssemblyPreview.cardTitle",
    ];
    for (const key of scoped) {
      const enVal = i18nMessage("en", key);
      const frVal = i18nMessage("fr", key);
      const esVal = i18nMessage("es", key);
      expect(esVal).not.toBe(enVal);
      expect(esVal).not.toBe(frVal);
      if (enVal && frVal && enVal !== frVal) expect(enVal).not.toBe(frVal);
      expect(isHiddenSpanishPlaceholder(esVal)).toBe(false);
    }
  });

  it("missing ES keys never fall back to EN or FR", () => {
    const missing = "meduiEs1i.missing.clinic.key";
    expect(resolveClinicalUiMessage("es", missing)).toBe(missing);
    expect(resolveClinicalUiMessage("en", missing)).toBe(missing);
    expect(resolveClinicalUiMessage("fr", missing)).toBe(missing);
  });
});

describe("MEDUI.ES.1I public exposure", () => {
  it("Español remains hidden from public product UI selectors", () => {
    expect([...PUBLICLY_SELECTABLE_PRODUCT_UI_LANGUAGES]).toEqual(["fr", "en"]);
    expect(productUiLanguageSelectOptions().map((o) => o.value)).toEqual(["fr", "en"]);
    expect(productUiLanguageSelectOptions().some((o) => /español/i.test(o.label))).toBe(false);
  });

  it("patient preferredLanguage es does not activate product UI Spanish", () => {
    expect(resolveClientUiLanguage({ storedLanguage: "es" })).not.toBe("es");
  });
});

describe("MEDUI.ES.1I overlay accounting", () => {
  it("computes exact placeholder and overlay counts", () => {
    const overlayEntries = Object.entries(MEDUI_ES_1I_OVERLAY);
    const overlayPaths = overlayEntries.map(([path]) => path);
    expect(new Set(overlayPaths).size, "duplicate overlay key paths").toBe(overlayPaths.length);

    const hidden = createHiddenSpanishCatalog(en);
    const { tree: afterCanon } = applyApprovedSpanishTerminology(hidden);
    const { tree: after1e } = applyGovernedSpanishOverlay(afterCanon, MEDUI_ES_1E_OVERLAY);
    const { tree: after1f } = applyGovernedSpanishOverlay(after1e, MEDUI_ES_1F_OVERLAY);
    const { tree: after1g } = applyGovernedSpanishOverlay(after1f, MEDUI_ES_1G_OVERLAY);
    const { tree: after1h } = applyGovernedSpanishOverlay(after1g, MEDUI_ES_1H_OVERLAY);
    const before1i = countPlaceholders(after1h);

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
      const cls = classify1iPath(path);
      byClass[cls] = (byClass[cls] || 0) + 1;
      if (cls === "OUT_OF_SCOPE") outOfScope.push(path);
      if (reviewRequiredUiKeys.has(path)) reviewRequiredOverlays.push(path);
      if (value === "") emptyOverlayEntries.push(path);
      const prior = getByPath(after1h, path);
      if (typeof prior !== "string" || !isHiddenSpanishPlaceholder(prior)) notReplacing.push(path);
      const enVal = enLeaves.get(path);
      expect(enVal, `overlay path missing in EN: ${path}`).toBeDefined();
      if (value === "") expect(enVal).toBe("");
      else expect(interpolationTokens(value), `token parity: ${path}`).toEqual(interpolationTokens(enVal as string));
    }

    const { tree: after1iTree, replaced } = applyGovernedSpanishOverlay(after1h, MEDUI_ES_1I_OVERLAY);
    const after = countPlaceholders(after1iTree);

    expect(outOfScope).toEqual([]);
    expect(reviewRequiredOverlays).toEqual([]);
    expect(notReplacing).toEqual([]);
    expect([...emptyOverlayEntries].sort()).toEqual([...MEDUI_ES_1I_EMPTY_OVERLAY_PATHS].sort());
    expect(byClass.ANCILLARY ?? 0).toBe(0);

    const report = {
      totalEsStringLeaves: before1i.totalLeaves,
      placeholdersBefore1i: before1i.placeholders,
      placeholdersAfter1i: after.placeholders,
      placeholdersReplacedBy1i: replaced,
      overlayEntriesTotal: overlayEntries.length,
      uniqueOverlayPaths: overlayPaths.length,
      nonEmptyOverlayEntries: overlayEntries.length - emptyOverlayEntries.length,
      emptyOverlayEntries,
      overlaysActuallyReplacingPlaceholders: replaced,
      overlaysNotReplacingPlaceholders: notReplacing,
      byClass,
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(report, null, 2));

    expect(before1i.totalLeaves).toBe(44266);
    expect(replaced).toBe(overlayEntries.length);
    expect(after.placeholders).toBe(before1i.placeholders - replaced);
    expect(overlayEntries.length).toBe(2777);
    expect(before1i.placeholders).toBe(31049);
    expect(after.placeholders).toBe(28272);
  });

  it("overlay keys are sorted and live es exposes every 1I overlay value", () => {
    const keys = Object.keys(MEDUI_ES_1I_OVERLAY);
    expect(keys).toEqual([...keys].sort());
    const buckets = new Set(keys.map(classify1iPath));
    for (const cls of [
      "CLINIC",
      "DENTAL",
      "BILLING_UI",
      "BILLING_REVIEW",
      "RCM_CONNECTORS",
      "CLAIM_VALIDATION_UI",
      "GENERIC_DEPENDENCY_REQUIRED_BY_1I",
    ]) {
      expect(buckets.has(cls), cls).toBe(true);
    }
    expect(buckets.has("OUT_OF_SCOPE")).toBe(false);
    expect(buckets.has("ANCILLARY")).toBe(false);
    for (const [path, value] of Object.entries(MEDUI_ES_1I_OVERLAY)) {
      expect(getByPath(es, path), path).toBe(value);
    }
  });
});
