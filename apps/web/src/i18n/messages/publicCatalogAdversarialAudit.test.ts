/**
 * Adversarial public-catalog audit: actual Spanish vs English-copy masking.
 */
import { describe, expect, it } from "vitest";
import {
  applyApprovedSpanishTerminology,
  isHiddenSpanishPlaceholder,
  PUBLIC_UI_LAST_RESORT_COPY,
} from "@medora/shared";
import en from "./en";
import fr from "./fr";
import es from "./es";
import { applyGovernedSpanishOverlay } from "./es";
import { createHiddenSpanishCatalog } from "./hiddenSpanishCatalog";
import { MEDUI_ES_1E_OVERLAY } from "./meduiEs1eCorePlatformOverlay";
import { MEDUI_ES_1F_OVERLAY } from "./meduiEs1fEmergencyDepartmentOverlay";
import { MEDUI_ES_1G_OVERLAY } from "./meduiEs1gHospitalInpatientObservationOverlay";
import { MEDUI_ES_1H_OVERLAY } from "./meduiEs1hOrdersMarPharmacyDiagnosticsOverlay";
import { MEDUI_ES_1I_OVERLAY } from "./meduiEs1iClinicDentalBillingAncillaryOverlay";
import { MEDUI_ES_1JB_OVERLAY } from "./meduiEs1jSafeChromeOverlay";
import { MEDUI_ES_1K_OVERLAY } from "./meduiEs1kSafeChromeOverlay";
import { MEDUI_ES_1K_PUBLIC_CHROME_OVERLAY } from "./meduiEs1kPublicChromeOverlay";
import { MEDUI_ES_1K1_OVERLAY } from "./meduiEs1k1ReachabilityHotfixOverlay";
import { MEDUI_TRILANG_1_CLINICAL_CHROME_OVERLAY } from "./meduiTrilang1ClinicalChromeOverlay";
import { MEDUI_TRILANG_2_OVERLAY } from "./meduiTrilang2ClinicalWorkspaceOverlay";
import { MEDUI_PUBLIC_CATALOG_COMPLETE_OVERLAY } from "./meduiPublicCatalogCompleteOverlay";
import {
  auditPublicCatalogParity,
  collectMessageLeaves,
  isFrozenLegalSourcePath,
  isSourceLanguageContentPath,
} from "./publicCatalogParity";

const STABLE_CODE_RE =
  /^(CPT|HCPCS|ICD-?10|RxNorm|LOINC|NPI|MRN|ERA|X12|NDC|HCPCS|MSPP|ESI|STAT|STEMI|MAR|EKG|ECG|UUID|UTC|DR|HT|PHI|ROI|RCM|FHIR|HL7|MFA|NPI)$/i;

const IDENTICAL_PROPER_NOUNS = new Set([
  "Medora",
  "Medora-S",
  "Haiti",
  "Haïti",
  "MSPP",
  "ESI",
  "STAT",
  "STEMI",
  "MAR",
  "EKG",
  "ECG",
  "MRN",
  "NPI",
  "CPT",
  "ICD-10",
  "RxNorm",
  "LOINC",
  "HCPCS",
  "ERA",
  "X12",
  "No",
  "no",
  "Hospital",
  "Manual",
  "Legal",
  "Actor",
  "Plan",
  "Total",
  "Oral",
  "Real",
  "Roles",
  "Sandbox",
  "Slack",
  "Webhook",
  "Hospital",
  "e-Doc",
  "Hash ✓",
  "RxCUI",
  "FC",
  "FR",
]);

function isAllowedIdenticalChrome(enVal: string, esVal: string): boolean {
  if (enVal === esVal && !enVal.trim()) return true;
  const trimmed = enVal.trim();
  if (trimmed === "—" || trimmed === "-" || trimmed === "…" || trimmed === "*" || trimmed === " *") return true;
  if (/^\{[^{}]+\}$/.test(trimmed)) return true;
  if (/\{[^{}]+\}/.test(trimmed) && /^[^{}A-Za-z]*(\{[^{}]+\}[^{}A-Za-z]*)+$/.test(trimmed.replace(/\s/g, " "))) {
    return trimmed === esVal;
  }
  if (/^[A-Z0-9][A-Z0-9._\-/]{0,32}$/.test(trimmed) && trimmed === esVal) return true;
  if (STABLE_CODE_RE.test(trimmed) && trimmed === esVal) return true;
  if (IDENTICAL_PROPER_NOUNS.has(trimmed) && trimmed === esVal) return true;
  if (/^\d+(%|\/\d+|×)?$/.test(trimmed) && trimmed === esVal) return true;
  if (trimmed.includes("MINISTÈRE DE LA SANTÉ") && trimmed === esVal) return true;
  if (/Healthcare|Availity|Office Ally|Change Healthcare/i.test(trimmed) && trimmed === esVal) return true;
  if (trimmed === ")" || trimmed === "(") return true;
  return false;
}

const ENGLISH_PROSE_RE =
  /\b(the|and|with|from|this|that|these|those|please|click|select|cannot|unable|already|before|after|must|should|will|required|settings|dashboard|users|access|reports|orders|results|diagnoses|loading|success|warning|delete|create|search|filter|try again|not found|went wrong|save changes)\b/i;

const FRENCH_SPECIFIC_RE =
  /[œç]|l'|d'|n'|qu'|\b(les|des|une|aux|pour|avec|sans|cette|vous|nous|être|sont|dans)\b/i;

function looksLikeEnglishProse(value: string): boolean {
  return ENGLISH_PROSE_RE.test(value) && /[A-Za-z]{3,}/.test(value);
}

function looksLikeFrenchSpecific(value: string): boolean {
  return FRENCH_SPECIFIC_RE.test(value);
}

function isSharedCognate(esVal: string, frVal: string, enVal: string): boolean {
  if (esVal !== frVal || esVal === enVal) return false;
  return !looksLikeFrenchSpecific(esVal);
}

function classifyRemainingSentinelPath(path: string): string {
  if (isFrozenLegalSourcePath(path)) return "LEGAL_SOURCE_CONTENT";
  if (isSourceLanguageContentPath(path)) return "CLINICAL_TEMPLATE_SOURCE";
  if (path.startsWith("providerDischargeDocumentation") || path.startsWith("nursingDischargeNotes")) {
    return "CLINICAL_TEMPLATE_SOURCE";
  }
  if (path.startsWith("printOutput.")) return "PRINT_SOURCE";
  if (path.startsWith("handbook") || path.startsWith("frenchHandbook")) return "INTERNAL_ONLY";
  if (path.includes(".test") || path.startsWith("_tmp")) return "TEST_ONLY";
  if (
    path.startsWith("catalogImport") ||
    path.startsWith("catalogAdmin") ||
    path.startsWith("catalogAudit")
  ) {
    return "CATALOG_SOURCE";
  }
  if (path.startsWith("platformAdmin")) return "INTERNAL_ONLY";
  return "PUBLIC_PRODUCT_CHROME";
}

function buildSpanishTreeBeforeEnglishCopy(): unknown {
  const hidden = createHiddenSpanishCatalog(en);
  const { tree: afterCanon } = applyApprovedSpanishTerminology(hidden);
  const { tree: after1e } = applyGovernedSpanishOverlay(afterCanon, MEDUI_ES_1E_OVERLAY);
  const { tree: after1f } = applyGovernedSpanishOverlay(after1e, MEDUI_ES_1F_OVERLAY);
  const { tree: after1g } = applyGovernedSpanishOverlay(after1f, MEDUI_ES_1G_OVERLAY);
  const { tree: after1h } = applyGovernedSpanishOverlay(after1g, MEDUI_ES_1H_OVERLAY);
  const { tree: after1i } = applyGovernedSpanishOverlay(after1h, MEDUI_ES_1I_OVERLAY);
  const { tree: after1jb } = applyGovernedSpanishOverlay(after1i, MEDUI_ES_1JB_OVERLAY);
  const { tree: after1k } = applyGovernedSpanishOverlay(after1jb, MEDUI_ES_1K_OVERLAY);
  const { tree: after1kPublic } = applyGovernedSpanishOverlay(after1k, MEDUI_ES_1K_PUBLIC_CHROME_OVERLAY);
  const { tree: after1k1 } = applyGovernedSpanishOverlay(after1kPublic, MEDUI_ES_1K1_OVERLAY);
  const { tree: afterTrilang1 } = applyGovernedSpanishOverlay(after1k1, MEDUI_TRILANG_1_CLINICAL_CHROME_OVERLAY);
  const { tree: afterTrilang2 } = applyGovernedSpanishOverlay(afterTrilang1, MEDUI_TRILANG_2_OVERLAY);
  const { tree: afterPublicComplete } = applyGovernedSpanishOverlay(
    afterTrilang2,
    MEDUI_PUBLIC_CATALOG_COMPLETE_OVERLAY
  );
  return afterPublicComplete;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe("adversarial Spanish fallback audit", () => {
  it("classifies remaining sentinels before English provenance copy", () => {
    const beforeCopy = buildSpanishTreeBeforeEnglishCopy();
    const enLeaves = collectMessageLeaves(en);
    const remaining = collectMessageLeaves(beforeCopy);
    const byClass: Record<string, number> = {};
    const publicChromeSentinels: string[] = [];
    let sentinels = 0;
    for (const [path, value] of remaining) {
      if (!isHiddenSpanishPlaceholder(value)) continue;
      sentinels += 1;
      const cls = classifyRemainingSentinelPath(path);
      byClass[cls] = (byClass[cls] ?? 0) + 1;
      if (cls === "PUBLIC_PRODUCT_CHROME") publicChromeSentinels.push(path);
    }
    const report = {
      TOTAL_LEAVES: remaining.size,
      SENTINELS_BEFORE_EN_COPY: sentinels,
      byClass,
      PUBLIC_PRODUCT_CHROME_SENTINEL_SAMPLE: publicChromeSentinels.slice(0, 40),
      PUBLIC_PRODUCT_CHROME_SENTINEL_COUNT: publicChromeSentinels.length,
      EN_LEAF_COUNT: enLeaves.size,
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(report, null, 2));
    expect(publicChromeSentinels, publicChromeSentinels.slice(0, 25).join("\n")).toEqual([]);
    expect(sentinels).toBe(20280);
    expect(byClass.LEGAL_SOURCE_CONTENT).toBe(53);
    expect(byClass.CLINICAL_TEMPLATE_SOURCE).toBe(20227);
  });

  it("counts actual Spanish vs EN/FR/unavailable fallbacks on public chrome", () => {
    const enLeaves = collectMessageLeaves(en);
    const frLeaves = collectMessageLeaves(fr);
    const esLeaves = collectMessageLeaves(es);
    let translated = 0;
    let enFallback = 0;
    let frFallback = 0;
    let unavailable = 0;
    let sourceEnProvenance = 0;
    let allowedIdentical = 0;
    const enFallbackSamples: string[] = [];
    const frFallbackSamples: string[] = [];
    const publicEnFallback: string[] = [];
    const publicFrFallback: string[] = [];

    const unavailablePaths: string[] = [];
    for (const [path, esVal] of esLeaves) {
      const enVal = enLeaves.get(path) ?? "";
      const frVal = frLeaves.get(path) ?? "";
      if (esVal === PUBLIC_UI_LAST_RESORT_COPY.es) {
        unavailable += 1;
        unavailablePaths.push(`${path} en=${JSON.stringify(enVal)}`);
        continue;
      }
      const sourceOrLegal = isSourceLanguageContentPath(path) || isFrozenLegalSourcePath(path);
      if (esVal === enVal) {
        if (isAllowedIdenticalChrome(enVal, esVal) || !looksLikeEnglishProse(enVal)) {
          allowedIdentical += 1;
          continue;
        }
        if (sourceOrLegal) {
          sourceEnProvenance += 1;
          continue;
        }
        enFallback += 1;
        if (enFallbackSamples.length < 80) enFallbackSamples.push(`${path} = ${esVal.slice(0, 100)}`);
        publicEnFallback.push(path);
        continue;
      }
      if (esVal === frVal && esVal !== enVal) {
        if (
          isSharedCognate(esVal, frVal, enVal) ||
          isSourceLanguageContentPath(path) ||
          isFrozenLegalSourcePath(path)
        ) {
          translated += 1;
          continue;
        }
        frFallback += 1;
        if (frFallbackSamples.length < 20) frFallbackSamples.push(`${path} = ${esVal.slice(0, 80)}`);
        if (!sourceOrLegal) publicFrFallback.push(path);
        continue;
      }
      translated += 1;
    }

    const report = {
      SPANISH_KEYS_TRANSLATED_ACTUALLY: translated,
      SPANISH_KEYS_FALLING_BACK_TO_ENGLISH: enFallback,
      SPANISH_KEYS_FALLING_BACK_TO_FRENCH: frFallback,
      SPANISH_KEYS_USING_GENERIC_UNAVAILABLE: unavailable,
      SOURCE_OR_LEGAL_EN_PROVENANCE: sourceEnProvenance,
      ALLOWED_IDENTICAL: allowedIdentical,
      PUBLIC_ENGLISH_FALLBACK_COUNT: publicEnFallback.length,
      PUBLIC_FRENCH_FALLBACK_COUNT: publicFrFallback.length,
      UNAVAILABLE_PATHS: unavailablePaths,
      EN_FALLBACK_SAMPLE: enFallbackSamples,
      FR_FALLBACK_SAMPLE: frFallbackSamples,
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(report, null, 2));
    const realUnavailable = unavailablePaths.filter((row) => !/en="(Unavailable|Not available)"/i.test(row));
    expect(realUnavailable, realUnavailable.join("\n")).toEqual([]);
    expect(unavailablePaths.every((row) => /en="(Unavailable|Not available)"/.test(row))).toBe(true);
    expect(publicEnFallback, publicEnFallback.slice(0, 25).join("\n")).toEqual([]);
    expect(publicFrFallback, publicFrFallback.slice(0, 25).join("\n")).toEqual([]);
    expect(enFallback).toBe(0);
    expect(frFallback).toBe(0);
  });

  it("fails i18n:audit when a public Spanish key is removed", () => {
    const broken = deepClone(es) as Record<string, unknown>;
    const reports = broken.reportsOps as Record<string, unknown> | undefined;
    expect(reports?.title).toBeTypeOf("string");
    delete reports!.title;
    const report = auditPublicCatalogParity(en, fr, broken);
    expect(report.ES_COMPLETE).toBe(false);
    expect(report.VERDICT).toBe("FAIL");
    expect(report.findings.some((f) => f.code === "ES_MISSING" && f.path === "reportsOps.title")).toBe(true);
  });

  it("does not treat generic unavailable copy as a complete translation", () => {
    const poisoned = deepClone(es) as Record<string, unknown>;
    (poisoned.reportsOps as Record<string, unknown>).title = PUBLIC_UI_LAST_RESORT_COPY.es;
    const leaves = collectMessageLeaves(poisoned);
    expect(leaves.get("reportsOps.title")).toBe("No disponible");
    expect(leaves.get("reportsOps.title")).not.toBe(collectMessageLeaves(en).get("reportsOps.title"));
    expect(PUBLIC_UI_LAST_RESORT_COPY.es).toBe("No disponible");
    const report = auditPublicCatalogParity(en, fr, poisoned);
    expect(report.VERDICT).toBe("FAIL");
    expect(report.ES_COMPLETE).toBe(false);
    expect(report.findings.some((f) => f.code === "ES_GENERIC_FALLBACK" && f.path === "reportsOps.title")).toBe(
      true
    );
  });
});
