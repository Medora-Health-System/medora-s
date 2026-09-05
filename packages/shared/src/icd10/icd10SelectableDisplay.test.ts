import { describe, expect, it } from "vitest";
import { resolveIcd10DiagnosisDisplay } from "./icd10DisplayResolver.js";
import {
  formatIcd10ServerResolvedOneLineDisplay,
  mapIcd10ExactnessToDisplayResolution,
} from "./icd10SelectableDisplay.js";
import type { Icd10CatalogDisplaySource, Icd10TerminologyDisplayRow } from "./icd10TerminologyTypes.js";
import {
  ICD10_CM_CODE_SYSTEM,
  ICD10_GOVERNED_SOURCE_ID,
  ICD10_GOVERNED_TERMINOLOGY_VERSION,
  ICD10_SOURCE_PRIORITY,
} from "./icd10TerminologyTypes.js";

const RELEASE = "FY2026";
const SYSTEM = ICD10_CM_CODE_SYSTEM;

function catalog(code: string, english: string): Icd10CatalogDisplaySource {
  return {
    code,
    codeSystem: SYSTEM,
    releaseVersion: RELEASE,
    shortDescription: english,
    longDescription: english,
  };
}

function clinicianRow(
  code: string,
  locale: string,
  preferredLabel: string,
  extras: Partial<Icd10TerminologyDisplayRow> = {},
): Icd10TerminologyDisplayRow {
  return {
    codeSystem: SYSTEM,
    releaseVersion: RELEASE,
    code,
    locale,
    preferredLabel,
    labelRegister: "CLINICIAN_PREFERRED",
    provenance: "MEDORA_GOVERNED",
    exactness: "EXACT_GOVERNED",
    status: "APPROVED",
    sourceId: ICD10_GOVERNED_SOURCE_ID,
    terminologyVersion: ICD10_GOVERNED_TERMINOLOGY_VERSION,
    sourcePriority: ICD10_SOURCE_PRIORITY.MEDORA_GOVERNED,
    ...extras,
  };
}

describe("MEDUI.TRILANG.DX.P3 selectable display contract", () => {
  it("maps P2 exactness onto API displayResolution names", () => {
    expect(mapIcd10ExactnessToDisplayResolution("EXACT_SOURCE")).toBe("EXACT_SOURCE_LABEL");
    expect(mapIcd10ExactnessToDisplayResolution("EXACT_GOVERNED")).toBe("EXACT_GOVERNED_LABEL");
    expect(mapIcd10ExactnessToDisplayResolution("UNLOCALIZED_CODE")).toBe("UNLOCALIZED_CODE");
  });

  it("EN exact source displays English without duplicating the code", () => {
    const resolved = resolveIcd10DiagnosisDisplay({
      codeSystem: SYSTEM,
      releaseVersion: RELEASE,
      code: "R10.85",
      locale: "en",
      catalog: catalog("R10.85", "Abdominal pain, unspecified site"),
      terminologyRows: [clinicianRow("R10.85", "es", "Dolor abdominal en varios sitios")],
    });
    const line = formatIcd10ServerResolvedOneLineDisplay({
      code: resolved.code,
      displayLabel: resolved.displayName,
      displayResolution: mapIcd10ExactnessToDisplayResolution(resolved.exactness),
    });
    expect(resolved.exactness).toBe("EXACT_SOURCE");
    expect(line.primary).toBe("Abdominal pain, unspecified site");
    expect(line.metadata).toBe("R10.85");
    expect(`${line.primary} ${line.metadata ?? ""}`).not.toMatch(/Abdominal pain, unspecified site.*Abdominal pain/);
  });

  it("ES exact governed R10.85 displays the approved Spanish label", () => {
    const resolved = resolveIcd10DiagnosisDisplay({
      codeSystem: SYSTEM,
      releaseVersion: RELEASE,
      code: "R10.85",
      locale: "es",
      catalog: catalog("R10.85", "Abdominal pain, unspecified site"),
      terminologyRows: [clinicianRow("R10.85", "es", "Dolor abdominal en varios sitios")],
    });
    const line = formatIcd10ServerResolvedOneLineDisplay({
      code: resolved.code,
      displayLabel: resolved.displayName,
      displayResolution: mapIcd10ExactnessToDisplayResolution(resolved.exactness),
    });
    expect(resolved.exactness).toBe("EXACT_GOVERNED");
    expect(line.primary).toBe("Dolor abdominal en varios sitios");
    expect(line.primary).not.toMatch(/abdominal pain/i);
    expect(line.metadata).toBe("R10.85");
  });

  it("FR exact governed R10.85 displays the approved French label", () => {
    const resolved = resolveIcd10DiagnosisDisplay({
      codeSystem: SYSTEM,
      releaseVersion: RELEASE,
      code: "R10.85",
      locale: "fr",
      catalog: catalog("R10.85", "Abdominal pain, unspecified site"),
      terminologyRows: [clinicianRow("R10.85", "fr", "Douleur abdominale à plusieurs sites")],
    });
    expect(mapIcd10ExactnessToDisplayResolution(resolved.exactness)).toBe("EXACT_GOVERNED_LABEL");
    expect(resolved.displayName).toBe("Douleur abdominale à plusieurs sites");
  });

  it.each(["A42.1", "I77.811", "R14.0", "G43.D0", "G43.D1"] as const)(
    "ES missing exact label for %s is code-only",
    (code) => {
      const resolved = resolveIcd10DiagnosisDisplay({
        codeSystem: SYSTEM,
        releaseVersion: RELEASE,
        code,
        locale: "es",
        catalog: catalog(code, "English source must not display"),
        terminologyRows: [],
      });
      const line = formatIcd10ServerResolvedOneLineDisplay({
        code: resolved.code,
        displayLabel: resolved.displayName,
        displayResolution: mapIcd10ExactnessToDisplayResolution(resolved.exactness),
      });
      expect(resolved.exactness).toBe("UNLOCALIZED_CODE");
      expect(line.primary).toBe(code);
      expect(line.metadata).toBeNull();
      expect(line.primary).not.toContain("English");
      expect(`${line.primary}${line.metadata ?? ""}`).not.toContain("—");
      expect(`${line.primary}${line.metadata ?? ""}`).not.toContain("·");
    },
  );

  it.each(["A42.1", "I77.811", "R14.0", "G43.D0", "G43.D1"] as const)(
    "FR missing exact label for %s is code-only",
    (code) => {
      const resolved = resolveIcd10DiagnosisDisplay({
        codeSystem: SYSTEM,
        releaseVersion: RELEASE,
        code,
        locale: "fr",
        catalog: catalog(code, "English source must not display"),
        terminologyRows: [clinicianRow(code, "es", "Etiqueta española")],
      });
      const line = formatIcd10ServerResolvedOneLineDisplay({
        code: resolved.code,
        displayLabel: resolved.displayName,
        displayResolution: mapIcd10ExactnessToDisplayResolution(resolved.exactness),
      });
      expect(line.primary).toBe(code);
      expect(line.metadata).toBeNull();
      expect(line.primary).not.toContain("English");
      expect(line.primary).not.toContain("Etiqueta");
    },
  );

  it("does not use search alias text as displayLabel", () => {
    const resolved = resolveIcd10DiagnosisDisplay({
      codeSystem: SYSTEM,
      releaseVersion: RELEASE,
      code: "R10.85",
      locale: "es",
      catalog: catalog("R10.85", "Abdominal pain, unspecified site"),
      terminologyRows: [],
    });
    expect(resolved.displayName).toBe("R10.85");
    expect(resolved.displayName).not.toBe("dolor abdominal");
  });

  it("rejects PENDING_REVIEW, REJECTED, SUPERSEDED, consumer, parent, sibling, and cross-identity labels", () => {
    const catalogRow = catalog("L03.90", "Cellulitis, unspecified");
    const blocked: Icd10TerminologyDisplayRow[] = [
      clinicianRow("L03.90", "es", "pending", { status: "PENDING_REVIEW" }),
      clinicianRow("L03.90", "es", "rejected", { status: "REJECTED" }),
      clinicianRow("L03.90", "es", "superseded", { status: "SUPERSEDED" }),
      clinicianRow("L03.90", "es", "consumer", { labelRegister: "CONSUMER" }),
      clinicianRow("L03", "es", "parent category"),
      clinicianRow("L03.91", "es", "sibling"),
      clinicianRow("L03.90", "es", "wrong release", { releaseVersion: "FY2025" }),
      clinicianRow("L03.90", "es", "wrong system", { codeSystem: "ICD-10" }),
    ];
    const resolved = resolveIcd10DiagnosisDisplay({
      codeSystem: SYSTEM,
      releaseVersion: RELEASE,
      code: "L03.90",
      locale: "es",
      catalog: catalogRow,
      terminologyRows: blocked,
    });
    expect(resolved.exactness).toBe("UNLOCALIZED_CODE");
    expect(resolved.displayName).toBe("L03.90");
  });

  it("R11 siblings cannot satisfy each other", () => {
    const rows = [
      clinicianRow("R11.0", "es", "Náuseas"),
      clinicianRow("R11.1", "es", "Vómitos"),
      clinicianRow("R11.2", "es", "Náuseas con vómitos"),
      clinicianRow("R11.10", "es", "Vómitos, no especificados"),
      clinicianRow("R11.11", "es", "Vómitos sin náuseas"),
      clinicianRow("R11.12", "es", "Vómitos de origen fecal"),
    ];
    for (const code of ["R11.0", "R11.1", "R11.2", "R11.10", "R11.11", "R11.12"] as const) {
      const others = rows.filter((row) => row.code !== code);
      const resolved = resolveIcd10DiagnosisDisplay({
        codeSystem: SYSTEM,
        releaseVersion: RELEASE,
        code,
        locale: "es",
        catalog: catalog(code, "English source must not inherit"),
        terminologyRows: others,
      });
      expect(resolved.displayName).toBe(code);
      expect(resolved.exactness).toBe("UNLOCALIZED_CODE");
    }
  });

  it("G43 parent cannot label G43.D0 or G43.D1", () => {
    const parent = clinicianRow("G43", "es", "Migraña");
    for (const code of ["G43.D0", "G43.D1"] as const) {
      const resolved = resolveIcd10DiagnosisDisplay({
        codeSystem: SYSTEM,
        releaseVersion: RELEASE,
        code,
        locale: "es",
        catalog: catalog(code, "English migraine variant"),
        terminologyRows: [parent],
      });
      expect(resolved.displayName).toBe(code);
    }
  });
});
