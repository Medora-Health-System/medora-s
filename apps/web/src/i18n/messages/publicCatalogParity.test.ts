import { describe, expect, it } from "vitest";
import { hiddenSpanishPlaceholder, isHiddenSpanishPlaceholder, PUBLIC_UI_LAST_RESORT_COPY } from "@medora/shared";
import { resolveClinicalUiMessage } from "@/i18n/messages/registry";
import en from "./en";
import fr from "./fr";
import es from "./es";
import {
  applyEnglishSourceForRemainingSentinels,
  createHiddenSpanishCatalog,
} from "./hiddenSpanishCatalog";
import { MEDUI_PUBLIC_CATALOG_COMPLETE_OVERLAY } from "./meduiPublicCatalogCompleteOverlay";
import {
  CRITICAL_PUBLIC_UI_NAMESPACES,
  FROZEN_LEGAL_SOURCE_PATHS,
  auditPublicCatalogParity,
  collectMessageLeaves,
  formatCatalogParityReport,
  isFrozenLegalSourcePath,
  isSourceLanguageContentPath,
} from "./publicCatalogParity";

function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

describe("public catalog parity (EN/FR/ES)", () => {
  it("prints audit summary and requires PASS", () => {
    const report = auditPublicCatalogParity(en, fr, es);
    // eslint-disable-next-line no-console
    console.log(formatCatalogParityReport(report));
    expect(report.findings.slice(0, 25), formatCatalogParityReport(report)).toEqual([]);
    expect(report.VERDICT).toBe("PASS");
    expect(report.ES_SENTINELS).toBe(0);
    expect(report.RAW_KEYS).toBe(0);
    expect(report.EMPTY_KEYS).toBe(0);
    expect(report.EXTRA_KEYS).toBe(0);
    expect(report.EN_COMPLETE).toBe(true);
    expect(report.FR_COMPLETE).toBe(true);
    expect(report.ES_COMPLETE).toBe(true);
  });

  it("has no public ES sentinels, UNLOCALIZED_SOURCE, or empty-when-EN-has-text", () => {
    const esLeaves = collectMessageLeaves(es);
    const enLeaves = collectMessageLeaves(en);
    const sentinels: string[] = [];
    for (const [path, value] of esLeaves) {
      if (isHiddenSpanishPlaceholder(value) || value === "UNLOCALIZED_SOURCE") sentinels.push(path);
      if (!value.trim() && (enLeaves.get(path) ?? "").trim()) sentinels.push(`EMPTY:${path}`);
    }
    expect(sentinels, sentinels.slice(0, 20).join("\n")).toEqual([]);
  });

  it("covers critical route namespaces in all three public locales", () => {
    for (const ns of CRITICAL_PUBLIC_UI_NAMESPACES) {
      expect(getByPath(en, ns), `EN missing ${ns}`).toBeTypeOf("object");
      expect(getByPath(fr, ns), `FR missing ${ns}`).toBeTypeOf("object");
      expect(getByPath(es, ns), `ES missing ${ns}`).toBeTypeOf("object");
      const esLeaves = collectMessageLeaves(getByPath(es, ns), ns);
      for (const [path, value] of esLeaves) {
        expect(isHiddenSpanishPlaceholder(value), path).toBe(false);
        expect(value).not.toBe("UNLOCALIZED_SOURCE");
      }
    }
  });

  it("keeps legally frozen packet/EMTALA bodies as English source, not Spanish overlays", () => {
    for (const path of FROZEN_LEGAL_SOURCE_PATHS) {
      expect(MEDUI_PUBLIC_CATALOG_COMPLETE_OVERLAY[path], path).toBeUndefined();
      expect(isFrozenLegalSourcePath(path)).toBe(true);
      const enVal = getByPath(en, path);
      const esVal = getByPath(es, path);
      expect(typeof enVal, path).toBe("string");
      expect(typeof esVal, path).toBe("string");
      expect(isHiddenSpanishPlaceholder(esVal as string), path).toBe(false);
      expect(esVal, path).toBe(enVal);
      expect(resolveClinicalUiMessage("es", path), path).toBe(enVal);
      expect(resolveClinicalUiMessage("es", path), path).not.toMatch(/^UNLOCALIZED_ES::/);
    }
  });

  it("keeps complaint-intel / template source packs in English provenance", () => {
    const sample = [
      "providerDocumentationComplaintIntel.abdominal.diffAppendicitis",
      "encounterClinicTab.snippetImpression0",
    ];
    for (const path of sample) {
      if (!isSourceLanguageContentPath(path) && !path.startsWith("providerDocumentationComplaintIntel.")) {
        continue;
      }
      const enVal = getByPath(en, path);
      const esVal = getByPath(es, path);
      if (typeof enVal !== "string" || typeof esVal !== "string") continue;
      expect(MEDUI_PUBLIC_CATALOG_COMPLETE_OVERLAY[path], path).toBeUndefined();
      expect(isHiddenSpanishPlaceholder(esVal), path).toBe(false);
      expect(esVal, path).toBe(enVal);
    }
  });

  it("resolver never returns sentinel syntax for public locales", () => {
    expect(resolveClinicalUiMessage("es", "reportsOps.title")).not.toMatch(/^UNLOCALIZED_ES::/);
    expect(resolveClinicalUiMessage("es", "goLiveReadiness.title")).not.toMatch(/^UNLOCALIZED_ES::/);
    expect(resolveClinicalUiMessage("es", "medicalExamAnalytics.pageTitle")).not.toMatch(/^UNLOCALIZED_ES::/);
    expect(resolveClinicalUiMessage("es", "encounterRoom.waitingRoom")).toBe("Sala de espera");
    expect(resolveClinicalUiMessage("es", "reportsOps.title")).toBe(
      MEDUI_PUBLIC_CATALOG_COMPLETE_OVERLAY["reportsOps.title"]
    );
    const missing = "meduiPublicCatalog.missing.key";
    expect(resolveClinicalUiMessage("es", missing)).toBe(missing);
    expect(resolveClinicalUiMessage("en", missing)).toBe(missing);
    expect(resolveClinicalUiMessage("fr", missing)).toBe(missing);
  });
});
function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe("public catalog parity governance", () => {
  it("applyEnglishSourceForRemainingSentinels does not copy English for ungoverned paths", () => {
    const source = { legal: "Legal text", source: "Source text", public: "Public text" };
    const hidden = createHiddenSpanishCatalog(source);
    const { tree, copied } = applyEnglishSourceForRemainingSentinels(hidden, source);
    expect(copied).toBe(0);
    expect((tree as Record<string, string>).legal).toMatch(/^UNLOCALIZED_ES::/);
    expect((tree as Record<string, string>).public).toMatch(/^UNLOCALIZED_ES::/);
  });

  it("applyEnglishSourceForRemainingSentinels copies governed frozen legal paths", () => {
    const source = {
      esignature: { patientAttestation: "Patient attestation", other: "Other" },
    };
    const hidden = createHiddenSpanishCatalog(source);
    const { tree, copied } = applyEnglishSourceForRemainingSentinels(hidden, source);
    expect(copied).toBe(1);
    expect((tree as Record<string, Record<string, string>>).esignature.patientAttestation).toBe(
      "Patient attestation"
    );
    expect((tree as Record<string, Record<string, string>>).esignature.other).toMatch(
      /^UNLOCALIZED_ES::/
    );
  });

  it("applyEnglishSourceForRemainingSentinels copies governed source-language clinical paths", () => {
    const source = {
      providerDocumentationComplaintIntel: {
        abdominal: { diffAppendicitis: "Diff appendicitis" },
      },
    };
    const hidden = createHiddenSpanishCatalog(source);
    const { tree, copied } = applyEnglishSourceForRemainingSentinels(hidden, source);
    expect(copied).toBe(1);
    expect(
      (tree as Record<string, Record<string, Record<string, string>>>).providerDocumentationComplaintIntel
        .abdominal.diffAppendicitis
    ).toBe("Diff appendicitis");
  });

  it("EN_COMPLETE fails when the English catalog is actually incomplete", () => {
    const brokenEn = { reportsOps: { title: "reportsOps.title" }, common: { save: "Save" } };
    const brokenFr = { reportsOps: { title: "Rapports" }, common: { save: "Enregistrer" } };
    const brokenEs = { reportsOps: { title: "Informes" }, common: { save: "Guardar" } };
    const report = auditPublicCatalogParity(brokenEn, brokenFr, brokenEs);
    expect(report.EN_COMPLETE).toBe(false);
    expect(report.VERDICT).toBe("FAIL");
    expect(
      report.findings.some((f) => f.code === "EN_INCOMPLETE" && f.path === "reportsOps.title")
    ).toBe(true);
  });

  it("Spanish parity detects sentinels, raw keys, and unintended generic English fallback", () => {
    const sentinelEs = deepClone(es) as Record<string, unknown>;
    (sentinelEs.reportsOps as Record<string, unknown>).title = hiddenSpanishPlaceholder(
      "reportsOps.title"
    );
    let report = auditPublicCatalogParity(en, fr, sentinelEs);
    expect(report.ES_COMPLETE).toBe(false);
    expect(report.VERDICT).toBe("FAIL");
    expect(
      report.findings.some((f) => f.code === "ES_SENTINEL" && f.path === "reportsOps.title")
    ).toBe(true);

    const rawEs = deepClone(es) as Record<string, unknown>;
    (rawEs.reportsOps as Record<string, unknown>).title = "reportsOps.title";
    report = auditPublicCatalogParity(en, fr, rawEs);
    expect(report.RAW_KEYS).toBeGreaterThan(0);
    expect(report.VERDICT).toBe("FAIL");
    expect(
      report.findings.some((f) => f.code === "RAW_KEY_VALUE" && f.path === "reportsOps.title")
    ).toBe(true);

    const fallbackEs = deepClone(es) as Record<string, unknown>;
    (fallbackEs.reportsOps as Record<string, unknown>).title = PUBLIC_UI_LAST_RESORT_COPY.es;
    report = auditPublicCatalogParity(en, fr, fallbackEs);
    expect(report.ES_COMPLETE).toBe(false);
    expect(report.VERDICT).toBe("FAIL");
    expect(
      report.findings.some((f) => f.code === "ES_GENERIC_FALLBACK" && f.path === "reportsOps.title")
    ).toBe(true);
  });

  it("classification-based governance remains enforced for legal and source-language paths", () => {
    for (const path of FROZEN_LEGAL_SOURCE_PATHS) {
      expect(isFrozenLegalSourcePath(path), path).toBe(true);
    }
    expect(
      isSourceLanguageContentPath("providerDocumentationComplaintIntel.abdominal.diffAppendicitis")
    ).toBe(true);
    expect(isFrozenLegalSourcePath("reportsOps.title")).toBe(false);
    expect(isSourceLanguageContentPath("reportsOps.title")).toBe(false);
  });
});
