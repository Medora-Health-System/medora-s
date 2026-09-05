import { describe, expect, it } from "vitest";
import { buildGovernedIcd10TerminologySeedPlan } from "./buildGovernedIcd10TerminologySeed.js";
import {
  pickRankedEligibleClinicianLabel,
  resolveIcd10DiagnosisDisplay,
  resolveIcd10DiagnosisDisplayForDocument,
  resolveIcd10SearchHitDisplay,
} from "./icd10DisplayResolver.js";
import { buildGovernedSpanishSearchAliasSeeds } from "./icd10GovernedSearchAliases.js";
import { GOVERNED_ICD10_CLINICIAN_LABELS } from "./governedIcd10ClinicianLabels.js";
import type { Icd10CatalogDisplaySource, Icd10TerminologyDisplayRow } from "./icd10TerminologyTypes.js";
import {
  ICD10_CM_CODE_SYSTEM,
  ICD10_GOVERNED_SOURCE_ID,
  ICD10_GOVERNED_TERMINOLOGY_VERSION,
  ICD10_SOURCE_PRIORITY,
} from "./icd10TerminologyTypes.js";
import { buildOrderedDiagnosisCodesForClaimExport } from "../claimDiagnosisCodes.js";
import { buildDiagnosisPointerIndex } from "../diagnosisPointerIndex.js";

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

const R11_FAMILY = ["R11.0", "R11.1", "R11.2", "R11.10", "R11.11", "R11.12"] as const;
const R11_EN: Record<(typeof R11_FAMILY)[number], string> = {
  "R11.0": "Nausea",
  "R11.1": "Vomiting",
  "R11.2": "Nausea with vomiting, unspecified",
  "R11.10": "Vomiting, unspecified",
  "R11.11": "Vomiting without nausea",
  "R11.12": "Projectile vomiting",
};

const SCREENSHOT_CODES = ["A42.1", "I77.811", "R14.0", "G43.D1", "G43.D0", "R10.85"] as const;

describe("MEDUI.TRILANG.DX.P2 ICD display resolver", () => {
  it("EN uses official catalog English as EXACT_SOURCE", () => {
    const result = resolveIcd10DiagnosisDisplay({
      codeSystem: SYSTEM,
      releaseVersion: RELEASE,
      code: "R10.85",
      locale: "en",
      catalog: catalog("R10.85", "Abdominal pain, unspecified site"),
      terminologyRows: [clinicianRow("R10.85", "fr", "Douleur abdominale à plusieurs sites")],
    });
    expect(result).toMatchObject({
      code: "R10.85",
      displayName: "Abdominal pain, unspecified site",
      exactness: "EXACT_SOURCE",
      provenance: "OFFICIAL_SOURCE",
      localized: true,
      sourceKind: "CATALOG_SOURCE",
    });
  });

  it("FR/ES return UNLOCALIZED_CODE rather than English", () => {
    for (const locale of ["fr", "es"] as const) {
      const result = resolveIcd10DiagnosisDisplay({
        codeSystem: SYSTEM,
        releaseVersion: RELEASE,
        code: "A42.1",
        locale,
        catalog: catalog("A42.1", "Abdominal actinomycosis"),
        terminologyRows: [],
      });
      expect(result.displayName).toBe("A42.1");
      expect(result.exactness).toBe("UNLOCALIZED_CODE");
      expect(result.localized).toBe(false);
      expect(result.sourceKind).toBe("UNLOCALIZED_CODE");
      expect(result.displayName).not.toMatch(/actinomycosis/i);
    }
  });

  it("does not return another language", () => {
    const result = resolveIcd10DiagnosisDisplay({
      codeSystem: SYSTEM,
      releaseVersion: RELEASE,
      code: "R10.85",
      locale: "fr",
      catalog: catalog("R10.85", "Abdominal pain"),
      terminologyRows: [clinicianRow("R10.85", "es", "Dolor abdominal en varios sitios")],
    });
    expect(result.displayName).toBe("R10.85");
    expect(result.exactness).toBe("UNLOCALIZED_CODE");
  });

  it("never uses CONSUMER labels for clinician UI", () => {
    const result = resolveIcd10DiagnosisDisplay({
      codeSystem: SYSTEM,
      releaseVersion: RELEASE,
      code: "R10.85",
      locale: "es",
      catalog: catalog("R10.85", "Abdominal pain"),
      terminologyRows: [
        clinicianRow("R10.85", "es", "Dolor de panza", {
          labelRegister: "CONSUMER",
          provenance: "LICENSED_VENDOR",
          exactness: "EXACT_SOURCE",
        }),
      ],
    });
    expect(result.displayName).toBe("R10.85");
    expect(result.exactness).toBe("UNLOCALIZED_CODE");
  });

  it("never uses a search alias as displayName", () => {
    const result = resolveIcd10DiagnosisDisplay({
      codeSystem: SYSTEM,
      releaseVersion: RELEASE,
      code: "R10.85",
      locale: "es",
      catalog: catalog("R10.85", "Abdominal pain"),
      terminologyRows: [],
    });
    expect(result.displayName).not.toBe("dolor abdominal");
    expect(result.displayName).toBe("R10.85");
  });

  it("precedence is MEDORA_GOVERNED > LICENSED_VENDOR > OFFICIAL_SOURCE", () => {
    const rows: Icd10TerminologyDisplayRow[] = [
      clinicianRow("R10.85", "fr", "Officiel", {
        provenance: "OFFICIAL_SOURCE",
        exactness: "EXACT_SOURCE",
      }),
      clinicianRow("R10.85", "fr", "Fournisseur", {
        provenance: "LICENSED_VENDOR",
        exactness: "EXACT_SOURCE",
      }),
      clinicianRow("R10.85", "fr", "Gouverné Medora", {
        provenance: "MEDORA_GOVERNED",
        exactness: "EXACT_GOVERNED",
      }),
    ];
    const governed = resolveIcd10DiagnosisDisplay({
      codeSystem: SYSTEM,
      releaseVersion: RELEASE,
      code: "R10.85",
      locale: "fr",
      catalog: catalog("R10.85", "Abdominal pain"),
      terminologyRows: rows,
    });
    expect(governed.displayName).toBe("Gouverné Medora");
    expect(governed.provenance).toBe("MEDORA_GOVERNED");

    const vendor = resolveIcd10DiagnosisDisplay({
      codeSystem: SYSTEM,
      releaseVersion: RELEASE,
      code: "R10.85",
      locale: "fr",
      catalog: catalog("R10.85", "Abdominal pain"),
      terminologyRows: rows.filter((row) => row.provenance !== "MEDORA_GOVERNED"),
    });
    expect(vendor.displayName).toBe("Fournisseur");
    expect(vendor.provenance).toBe("LICENSED_VENDOR");

    const official = resolveIcd10DiagnosisDisplay({
      codeSystem: SYSTEM,
      releaseVersion: RELEASE,
      code: "R10.85",
      locale: "fr",
      catalog: catalog("R10.85", "Abdominal pain"),
      terminologyRows: rows.filter((row) => row.provenance === "OFFICIAL_SOURCE"),
    });
    expect(official.displayName).toBe("Officiel");
    expect(official.provenance).toBe("OFFICIAL_SOURCE");
  });

  it("ignores PENDING_REVIEW/REJECTED/SUPERSEDED clinician rows", () => {
    for (const status of ["PENDING_REVIEW", "REJECTED", "SUPERSEDED"] as const) {
      const result = resolveIcd10DiagnosisDisplay({
        codeSystem: SYSTEM,
        releaseVersion: RELEASE,
        code: "R10.85",
        locale: "fr",
        catalog: catalog("R10.85", "Abdominal pain"),
        terminologyRows: [clinicianRow("R10.85", "fr", "Ne pas afficher", { status })],
      });
      expect(result.exactness).toBe("UNLOCALIZED_CODE");
    }
  });

  it("preserves vendor source while governed override is the effective display", () => {
    const rows = [
      clinicianRow("R10.85", "es", "Vendor label", {
        provenance: "LICENSED_VENDOR",
        exactness: "EXACT_SOURCE",
        isEffective: false,
      }),
      clinicianRow("R10.85", "es", "Approved Medora label", {
        provenance: "MEDORA_GOVERNED",
        isEffective: true,
      }),
    ];
    const result = resolveIcd10DiagnosisDisplay({
      codeSystem: SYSTEM,
      releaseVersion: RELEASE,
      code: "R10.85",
      locale: "es",
      catalog: catalog("R10.85", "Abdominal pain"),
      terminologyRows: rows,
    });
    expect(result.displayName).toBe("Approved Medora label");
    expect(result.provenance).toBe("MEDORA_GOVERNED");
    expect(rows.find((row) => row.provenance === "LICENSED_VENDOR")?.preferredLabel).toBe("Vendor label");
  });

  it("keeps two licensed vendors as distinct source records and ranks by sourcePriority", () => {
    const imo = clinicianRow("R10.85", "es", "IMO label", {
      provenance: "LICENSED_VENDOR",
      exactness: "EXACT_SOURCE",
      sourceId: "IMO_CONTRACT_A",
      terminologyVersion: "IMO.2026.1",
      sourcePriority: 40,
      isEffective: false,
    });
    const other = clinicianRow("R10.85", "es", "Other vendor label", {
      provenance: "LICENSED_VENDOR",
      exactness: "EXACT_SOURCE",
      sourceId: "OTHER_VENDOR_B",
      terminologyVersion: "OTHER.2026.1",
      sourcePriority: 60,
      isEffective: false,
    });
    const ranked = pickRankedEligibleClinicianLabel([other, imo]);
    expect(ranked?.sourceId).toBe("IMO_CONTRACT_A");
    expect(ranked?.preferredLabel).toBe("IMO label");
    expect(pickRankedEligibleClinicianLabel([other, imo, clinicianRow("R10.85", "es", "Approved Medora label")])?.provenance).toBe(
      "MEDORA_GOVERNED",
    );
  });

  it("recomputes vendor as effective when Medora override is SUPERSEDED", () => {
    const vendor = clinicianRow("R10.85", "es", "Vendor label", {
      provenance: "LICENSED_VENDOR",
      exactness: "EXACT_SOURCE",
      sourceId: "IMO_CONTRACT_A",
      terminologyVersion: "IMO.2026.1",
      sourcePriority: ICD10_SOURCE_PRIORITY.LICENSED_VENDOR,
      status: "APPROVED",
    });
    const superseded = clinicianRow("R10.85", "es", "Approved Medora label", {
      status: "SUPERSEDED",
    });
    const ranked = pickRankedEligibleClinicianLabel([vendor, superseded]);
    expect(ranked?.preferredLabel).toBe("Vendor label");
    expect(ranked?.provenance).toBe("LICENSED_VENDOR");
  });

  it("ranks same-source versions by explicit sourcePriority, not lexical terminologyVersion", () => {
    const v2026 = clinicianRow("R10.85", "es", "Vendor 2026.1", {
      provenance: "LICENSED_VENDOR",
      exactness: "EXACT_SOURCE",
      sourceId: "TEST_VENDOR",
      terminologyVersion: "2026.1",
      sourcePriority: 50,
    });
    const v2027 = clinicianRow("R10.85", "es", "Vendor 2026.2", {
      provenance: "LICENSED_VENDOR",
      exactness: "EXACT_SOURCE",
      sourceId: "TEST_VENDOR",
      terminologyVersion: "2026.2",
      sourcePriority: 40,
    });
    const lexicalTrap = clinicianRow("R10.85", "es", "Vendor 9.0 lexical", {
      provenance: "LICENSED_VENDOR",
      exactness: "EXACT_SOURCE",
      sourceId: "TEST_VENDOR",
      terminologyVersion: "9.0",
      sourcePriority: 60,
    });
    expect(pickRankedEligibleClinicianLabel([v2026, v2027, lexicalTrap])?.preferredLabel).toBe("Vendor 2026.2");
    expect(pickRankedEligibleClinicianLabel([v2026, v2027])?.terminologyVersion).toBe("2026.2");
  });

  it("does not attach FY2025 terminology to FY2026 identity", () => {
    const result = resolveIcd10DiagnosisDisplay({
      codeSystem: SYSTEM,
      releaseVersion: "FY2026",
      code: "R10.85",
      locale: "es",
      catalog: { ...catalog("R10.85", "Abdominal pain"), releaseVersion: "FY2026" },
      terminologyRows: [
        clinicianRow("R10.85", "es", "Etiqueta FY2025", { releaseVersion: "FY2025", isEffective: true }),
      ],
    });
    expect(result.displayName).toBe("R10.85");
    expect(result.exactness).toBe("UNLOCALIZED_CODE");
  });

  it("does not attach a different codeSystem row", () => {
    const result = resolveIcd10DiagnosisDisplay({
      codeSystem: SYSTEM,
      releaseVersion: RELEASE,
      code: "R10.85",
      locale: "fr",
      catalog: catalog("R10.85", "Abdominal pain"),
      terminologyRows: [clinicianRow("R10.85", "fr", "CIM", { codeSystem: "ICD-10" })],
    });
    expect(result.exactness).toBe("UNLOCALIZED_CODE");
  });
});

describe("MEDUI.TRILANG.DX.P2 R11 exactness", () => {
  it("keeps distinct canonical identity with no parent/sibling/prefix inheritance", () => {
    const terminologyRows = [
      clinicianRow("R11.10", "fr", "Vomissements non précisés"),
      clinicianRow("R11.10", "es", "Vómitos no especificados"),
    ];
    const seen = new Set<string>();
    for (const code of R11_FAMILY) {
      const en = resolveIcd10DiagnosisDisplay({
        codeSystem: SYSTEM,
        releaseVersion: RELEASE,
        code,
        locale: "en",
        catalog: catalog(code, R11_EN[code]),
        terminologyRows,
      });
      expect(en.code).toBe(code);
      expect(en.displayName).toBe(R11_EN[code]);
      expect(seen.has(en.displayName)).toBe(false);
      seen.add(en.displayName);

      for (const locale of ["fr", "es"] as const) {
        const result = resolveIcd10DiagnosisDisplay({
          codeSystem: SYSTEM,
          releaseVersion: RELEASE,
          code,
          locale,
          catalog: catalog(code, R11_EN[code]),
          terminologyRows,
        });
        if (code === "R11.10") {
          expect(result.localized).toBe(true);
          expect(result.exactness).toBe("EXACT_GOVERNED");
        } else {
          expect(result.displayName).toBe(code);
          expect(result.exactness).toBe("UNLOCALIZED_CODE");
          expect(result.displayName).not.toBe("Vomissements non précisés");
          expect(result.displayName).not.toBe("Vómitos no especificados");
          expect(result.displayName).not.toBe(R11_EN[code]);
        }
      }
    }
  });
});

describe("MEDUI.TRILANG.DX.P2 category negative tests", () => {
  it("L03 child must not inherit L03 category label", () => {
    const result = resolveIcd10DiagnosisDisplay({
      codeSystem: SYSTEM,
      releaseVersion: RELEASE,
      code: "L03.90",
      locale: "fr",
      catalog: catalog("L03.90", "Cellulitis, unspecified"),
      terminologyRows: [clinicianRow("L03", "fr", "Cellulite")],
    });
    expect(result.displayName).toBe("L03.90");
    expect(result.exactness).toBe("UNLOCALIZED_CODE");
  });

  it("G43 child must not inherit G43 category label", () => {
    for (const code of ["G43.D0", "G43.D1"] as const) {
      const result = resolveIcd10DiagnosisDisplay({
        codeSystem: SYSTEM,
        releaseVersion: RELEASE,
        code,
        locale: "es",
        catalog: catalog(code, "Abdominal migraine"),
        terminologyRows: [clinicianRow("G43", "es", "Migraña")],
      });
      expect(result.displayName).toBe(code);
      expect(result.exactness).toBe("UNLOCALIZED_CODE");
    }
  });
});

describe("MEDUI.TRILANG.DX.P2 screenshot goldens", () => {
  const r1085 = [
    clinicianRow("R10.85", "fr", "Douleur abdominale à plusieurs sites"),
    clinicianRow("R10.85", "es", "Dolor abdominal en varios sitios"),
  ];

  it("R10.85 is the only screenshot code with governed FR/ES clinician labels", () => {
    for (const code of SCREENSHOT_CODES) {
      for (const locale of ["fr", "es"] as const) {
        const result = resolveIcd10DiagnosisDisplay({
          codeSystem: SYSTEM,
          releaseVersion: RELEASE,
          code,
          locale,
          catalog: catalog(code, "English official"),
          terminologyRows: r1085,
        });
        expect(result.code).toBe(code);
        if (code === "R10.85") {
          expect(result.exactness).toBe("EXACT_GOVERNED");
          expect(result.provenance).toBe("MEDORA_GOVERNED");
          expect(result.localized).toBe(true);
          expect(result.displayName).toBe(
            locale === "fr" ? "Douleur abdominale à plusieurs sites" : "Dolor abdominal en varios sitios",
          );
        } else {
          expect(result.displayName).toBe(code);
          expect(result.exactness).toBe("UNLOCALIZED_CODE");
          expect(result.displayName).not.toBe("English official");
        }
      }
    }
  });
});

describe("MEDUI.TRILANG.DX.P2 export foundation", () => {
  it("print/chart/ROI helper is render-time and does not invent translations", () => {
    const result = resolveIcd10DiagnosisDisplayForDocument({
      codeSystem: SYSTEM,
      releaseVersion: RELEASE,
      code: "A42.1",
      documentLocale: "es",
      catalog: catalog("A42.1", "Abdominal actinomycosis"),
      terminologyRows: [],
    });
    expect(result.displayName).toBe("A42.1");
    expect(result.exactness).toBe("UNLOCALIZED_CODE");
  });
});

describe("MEDUI.TRILANG.DX.P2 billing identity", () => {
  it("claim diagnosis export uses Diagnosis.code only, never display labels", () => {
    const codes = buildOrderedDiagnosisCodesForClaimExport(
      [{ code: "R10.85" }, { code: "A42.1" }],
      [{ sourceModule: "DIAGNOSIS", diagnosisCodes: null, code: "Dolor abdominal en varios sitios" }],
    );
    expect(codes).toEqual(["R10.85", "A42.1"]);
    expect(codes).not.toContain("Dolor abdominal en varios sitios");
    const pointers = buildDiagnosisPointerIndex([
      { id: "d1", code: "R10.85" },
      { id: "d2", code: "A42.1" },
    ]);
    expect(pointers.map((row) => row.code)).toEqual(["R10.85", "A42.1"]);
  });
});

describe("MEDUI.TRILANG.DX.P2 search match vs display", () => {
  it("ES search DTO English never becomes displayName when an exact ES label exists", () => {
    const cat = catalog("R10.85", "Abdominal pain, unspecified site");
    const { searchMatchText, display } = resolveIcd10SearchHitDisplay({
      locale: "es",
      searchHit: { code: "R10.85", shortDescription: cat.shortDescription },
      catalog: cat,
      terminologyRows: [clinicianRow("R10.85", "es", "Dolor abdominal en varios sitios", { isEffective: true })],
    });
    expect(searchMatchText).toBe("Abdominal pain, unspecified site");
    expect(display.displayName).toBe("Dolor abdominal en varios sitios");
    expect(display.displayName).not.toBe(searchMatchText);
  });

  it("FR search DTO English never becomes displayName when an exact FR label exists", () => {
    const cat = catalog("R10.85", "Abdominal pain, unspecified site");
    const { searchMatchText, display } = resolveIcd10SearchHitDisplay({
      locale: "fr",
      searchHit: { code: "R10.85", shortDescription: cat.shortDescription },
      catalog: cat,
      terminologyRows: [clinicianRow("R10.85", "fr", "Douleur abdominale à plusieurs sites", { isEffective: true })],
    });
    expect(searchMatchText).toBe("Abdominal pain, unspecified site");
    expect(display.displayName).toBe("Douleur abdominale à plusieurs sites");
    expect(display.sourceKind).toBe("TERMINOLOGY_ROW");
    expect(display.displayName).not.toBe(searchMatchText);
  });

  it("ES/FR search with no exact label is UNLOCALIZED_CODE, not English DTO", () => {
    const cat = catalog("A42.1", "Abdominal actinomycosis");
    for (const locale of ["es", "fr"] as const) {
      const { display } = resolveIcd10SearchHitDisplay({
        locale,
        searchHit: { code: "A42.1", shortDescription: cat.shortDescription },
        catalog: cat,
        terminologyRows: [],
      });
      expect(display.displayName).toBe("A42.1");
      expect(display.exactness).toBe("UNLOCALIZED_CODE");
      expect(display.displayName).not.toBe("Abdominal actinomycosis");
    }
  });

  it("alias match never becomes displayName", () => {
    const cat = catalog("R10.85", "Abdominal pain, unspecified site");
    const { display } = resolveIcd10SearchHitDisplay({
      locale: "es",
      searchHit: { code: "R10.85", shortDescription: cat.shortDescription },
      catalog: cat,
      terminologyRows: [clinicianRow("R10.85", "es", "Dolor abdominal en varios sitios", { isEffective: true })],
      matchedAliasText: "dolor abdominal",
    });
    expect(display.displayName).not.toBe("dolor abdominal");
    expect(display.displayName).toBe("Dolor abdominal en varios sitios");
  });
});

describe("MEDUI.TRILANG.DX.P2 governed seed transform", () => {
  it("uses structured maps and rejects codes absent from the target release", () => {
    const maps = {
      fr: {
        R1085: "Douleur abdominale à plusieurs sites",
        R1110: "Vomissements non précisés",
        Z9999: "Code fantôme",
      },
      es: {
        R1085: "Dolor abdominal en varios sitios",
        R1110: "Vómitos no especificados",
        Z9999: "Código fantasma",
      },
    };
    const catalogByNormalizedCode = new Map([
      [
        "R1085",
        {
          id: "cat-r1085",
          code: "R10.85",
          normalizedCode: "R1085",
          codeSystem: SYSTEM,
          releaseVersion: RELEASE,
        },
      ],
      [
        "R1110",
        {
          id: "cat-r1110",
          code: "R11.10",
          normalizedCode: "R1110",
          codeSystem: SYSTEM,
          releaseVersion: RELEASE,
        },
      ],
    ]);
    const plan = buildGovernedIcd10TerminologySeedPlan({
      maps,
      catalogByNormalizedCode,
      expectedReleaseVersion: RELEASE,
    });
    expect(plan.detectedFr).toBe(3);
    expect(plan.detectedEs).toBe(3);
    expect(plan.terminologyVersion).toBe(ICD10_GOVERNED_TERMINOLOGY_VERSION);
    expect(plan.acceptedTerminology).toHaveLength(4);
    expect(plan.acceptedTerminology.every((row) => row.isEffective)).toBe(true);
    expect(plan.acceptedTerminology.every((row) => row.sourceId === ICD10_GOVERNED_SOURCE_ID)).toBe(true);
    expect(plan.acceptedTerminology.every((row) => row.terminologyVersion === ICD10_GOVERNED_TERMINOLOGY_VERSION)).toBe(true);
    expect(plan.acceptedTerminology.every((row) => row.provenance === "MEDORA_GOVERNED")).toBe(true);
    expect(plan.rejected).toEqual([
      {
        normalizedCode: "Z9999",
        locale: "fr",
        label: "Code fantôme",
        reason: "CODE_NOT_IN_TARGET_RELEASE",
      },
      {
        normalizedCode: "Z9999",
        locale: "es",
        label: "Código fantasma",
        reason: "CODE_NOT_IN_TARGET_RELEASE",
      },
    ]);
    expect(plan.acceptedAliases.map((row) => `${row.normalizedCode}:${row.aliasText}`).sort()).toEqual([
      "R1085:dolor abdominal",
      "R1110:vómito",
      "R1110:vómitos",
    ]);
  });

  it("rejects category/header catalog rows even when the exact code exists", () => {
    const maps = {
      fr: { L03: "Cellulite", L0390: "Cellulite, non précisée" },
      es: { L03: "Celulitis", L0390: "Celulitis no especificada" },
    };
    const catalogByNormalizedCode = new Map([
      [
        "L03",
        {
          id: "cat-l03",
          code: "L03",
          normalizedCode: "L03",
          codeSystem: SYSTEM,
          releaseVersion: RELEASE,
          isSelectable: false,
          isBillable: false,
        },
      ],
      [
        "L0390",
        {
          id: "cat-l0390",
          code: "L03.90",
          normalizedCode: "L0390",
          codeSystem: SYSTEM,
          releaseVersion: RELEASE,
          isSelectable: true,
          isBillable: true,
        },
      ],
    ]);
    const plan = buildGovernedIcd10TerminologySeedPlan({
      maps,
      catalogByNormalizedCode,
      expectedReleaseVersion: RELEASE,
    });
    expect(plan.acceptedTerminology.map((row) => row.code).sort()).toEqual(["L03.90", "L03.90"]);
    expect(plan.rejectedCategoryHeader).toBe(2);
    expect(plan.rejected.map((row) => `${row.locale}:${row.normalizedCode}:${row.reason}`).sort()).toEqual([
      "es:L03:NOT_SELECTABLE_CATEGORY_HEADER",
      "fr:L03:NOT_SELECTABLE_CATEGORY_HEADER",
    ]);
  });

  it("does not substitute an invalid governed code with a nearby FY2026 code", () => {
    const maps = {
      fr: { S030XXA: "Luxation de la mâchoire", T141: "Lésion traumatique, non précisée" },
      es: { S030XXA: "Luxación de la mandíbula", T141: "Lesión traumática no especificada" },
    };
    const catalogByNormalizedCode = new Map([
      [
        "S0300XA",
        {
          id: "cat-s0300xa",
          code: "S03.00XA",
          normalizedCode: "S0300XA",
          codeSystem: SYSTEM,
          releaseVersion: RELEASE,
          isSelectable: true,
          isBillable: true,
        },
      ],
      [
        "T1490XA",
        {
          id: "cat-t1490xa",
          code: "T14.90XA",
          normalizedCode: "T1490XA",
          codeSystem: SYSTEM,
          releaseVersion: RELEASE,
          isSelectable: true,
          isBillable: true,
        },
      ],
    ]);
    const plan = buildGovernedIcd10TerminologySeedPlan({
      maps,
      catalogByNormalizedCode,
      expectedReleaseVersion: RELEASE,
    });
    expect(plan.acceptedTerminology).toHaveLength(0);
    expect(plan.rejectedAbsent).toBe(4);
    expect(plan.rejected.every((row) => row.reason === "CODE_NOT_IN_TARGET_RELEASE")).toBe(true);
    expect(plan.rejected.some((row) => row.normalizedCode === "S0300XA")).toBe(false);
    expect(plan.rejected.some((row) => row.normalizedCode === "T1490XA")).toBe(false);
  });

  it("does not indiscriminately alias generic dolor", () => {
    const aliases = buildGovernedSpanishSearchAliasSeeds(new Set(["R1085", "R079"]));
    expect(aliases.some((row) => row.aliasText === "dolor")).toBe(false);
    expect(aliases.some((row) => row.normalizedCode === "R079")).toBe(false);
    expect(aliases.some((row) => row.aliasText === "náusea")).toBe(false);
  });

  it("loads the shared 89-code source of truth", () => {
    expect(Object.keys(GOVERNED_ICD10_CLINICIAN_LABELS.fr)).toHaveLength(89);
    expect(Object.keys(GOVERNED_ICD10_CLINICIAN_LABELS.es)).toHaveLength(89);
  });
});
