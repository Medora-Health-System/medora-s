import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  formatIcd10ServerResolvedOneLineDisplay,
  GOVERNED_ICD10_CLINICIAN_LABELS_ES,
  GOVERNED_ICD10_CLINICIAN_LABELS_FR,
} from "@medora/shared";
import { appendDiagnosisToPmh } from "@/features/emergency/edTriageEfficiencyGovernance";
import {
  formatEncounterDiagnosisDisplayLabel,
  mapEncounterDiagnosisApiRowsToClinicalRecordInput,
  parseEncounterDiagnosisApiItems,
} from "@/features/emergency/encounterClinicalRecordAdapter";
import { formatPmhIcdPickLine } from "./icd10LivePresentation";
import { selectableDxPrimaryFromGovernedMaps } from "./icd10SelectableDisplayTestUtil";
import type { Icd10SearchHit } from "@/lib/chartApi";
import { buildProviderDischargeDocumentationSummaryBlock } from "@/features/emergency/providerDischargeDocumentationSummary";
import { formatInpatientDischargeDiagnosisDisplay } from "@medora/shared";

const webRoot = join(import.meta.dirname, "../../..");

function walkTsFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkTsFiles(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const r1085Es: Icd10SearchHit = {
  id: "icd-r1085",
  code: "R10.85",
  shortDescription: "Generalized abdominal pain",
  longDescription: null,
  isBillable: true,
  displayLabel: GOVERNED_ICD10_CLINICIAN_LABELS_ES.R1085,
  displayResolution: "EXACT_GOVERNED_LABEL",
};

const r1085Fr: Icd10SearchHit = {
  ...r1085Es,
  displayLabel: GOVERNED_ICD10_CLINICIAN_LABELS_FR.R1085,
};

const a421: Icd10SearchHit = {
  id: "icd-a421",
  code: "A42.1",
  shortDescription: "Abdominal actinomycosis",
  longDescription: null,
  isBillable: true,
  displayLabel: "A42.1",
  displayResolution: "UNLOCALIZED_CODE",
};

describe("MEDUI.TRILANG.DX.P3D overlay retirement", () => {
  it("PMH search display uses server one-line: ES governed, missing ES code-only", () => {
    expect(formatIcd10ServerResolvedOneLineDisplay(r1085Es).primary).toBe(
      "Dolor abdominal en varios sitios"
    );
    expect(formatIcd10ServerResolvedOneLineDisplay(r1085Fr).primary).toBe(
      "Douleur abdominale à plusieurs sites"
    );
    const missing = formatIcd10ServerResolvedOneLineDisplay(a421);
    expect(missing.primary).toBe("A42.1");
    expect(missing.metadata).toBeNull();
    expect(`${missing.primary}${missing.metadata ?? ""}`).not.toContain("—");
    expect(`${missing.primary}${missing.metadata ?? ""}`).not.toContain("·");
  });

  it("same ICD pick under EN/FR/ES persists the canonical code once", () => {
    const line = formatPmhIcdPickLine(r1085Es);
    expect(line).toBe("R10.85");
    expect(line).not.toBe(r1085Es.displayLabel);
    expect(line).not.toContain("Generalized");
    let pmh = "";
    pmh = appendDiagnosisToPmh(pmh, { ...r1085Es, displayLabel: "Generalized abdominal pain", displayResolution: "EXACT_SOURCE_LABEL" });
    pmh = appendDiagnosisToPmh(pmh, r1085Fr);
    pmh = appendDiagnosisToPmh(pmh, r1085Es);
    expect(pmh).toBe("R10.85");
    expect(pmh).not.toContain("Dolor");
    expect(pmh).not.toContain("Douleur");
    expect(pmh).not.toContain("Generalized");
  });

  it("existing and manual PMH text stay unchanged", () => {
    const existing = "Hypertension diagnosed 2018";
    expect(appendDiagnosisToPmh(existing, { ...r1085Es, code: "" })).toBe(existing);
    expect(appendDiagnosisToPmh(existing, r1085Es)).toBe(`${existing}, R10.85`);
    const manual = "HTA, diabète type 2";
    expect(appendDiagnosisToPmh(manual, { ...r1085Es, code: "" })).toBe(manual);
  });

  it("list parser preserves displayLabel and displayResolution", () => {
    const rows = parseEncounterDiagnosisApiItems(
      {
        items: [
          {
            id: "dx-1",
            encounterId: "enc-1",
            code: "R10.85",
            description: "Generalized abdominal pain",
            displayLabel: "Dolor abdominal en varios sitios",
            displayResolution: "EXACT_GOVERNED_LABEL",
            sortOrder: 0,
          },
        ],
      },
      "enc-1"
    );
    expect(rows[0]?.displayLabel).toBe("Dolor abdominal en varios sitios");
    expect(rows[0]?.displayResolution).toBe("EXACT_GOVERNED_LABEL");
    expect(rows[0]?.description).toBe("Generalized abdominal pain");
  });

  it("clinical record uses server presentation without CODE — CODE", () => {
    const exact = formatEncounterDiagnosisDisplayLabel({
      code: "R10.85",
      displayLabel: "Dolor abdominal en varios sitios",
      displayResolution: "EXACT_GOVERNED_LABEL",
    });
    expect(exact).toBe("Dolor abdominal en varios sitios");
    expect(exact).not.toContain("—");
    const missing = formatEncounterDiagnosisDisplayLabel({
      code: "A42.1",
      displayLabel: "A42.1",
      displayResolution: "UNLOCALIZED_CODE",
    });
    expect(missing).toBe("A42.1");
    expect(missing).not.toContain("—");
    const mapped = mapEncounterDiagnosisApiRowsToClinicalRecordInput(
      [
        {
          id: "dx-1",
          code: "A42.1",
          description: "Abdominal actinomycosis",
          displayLabel: "A42.1",
          displayResolution: "UNLOCALIZED_CODE",
        },
      ],
      "es"
    );
    expect(mapped[0]?.displayLabel).toBe("A42.1");
    expect(mapped[0]?.description).toBe("Abdominal actinomycosis");
  });

  it("zero production imports of diagnosisFrenchDisplayLabels", () => {
    const files = walkTsFiles(join(webRoot, "src")).concat(walkTsFiles(join(webRoot, "app")));
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      if (
        src.includes("diagnosisFrenchDisplayLabels") ||
        src.includes("getLocalizedDiagnosisDisplayLabel") ||
        src.includes("formatDiagnosisOneLineDisplay")
      ) {
        offenders.push(file.replace(webRoot + "/", ""));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("production browser files do not import governed FR/ES maps", () => {
    const files = walkTsFiles(join(webRoot, "src")).concat(walkTsFiles(join(webRoot, "app")));
    const offenders: string[] = [];
    for (const file of files) {
      if (/\.test\.(ts|tsx)$/.test(file) || /TestUtil\.ts$/.test(file)) continue;
      const src = readFileSync(file, "utf8");
      if (src.includes("GOVERNED_ICD10_CLINICIAN_LABELS")) {
        offenders.push(file.replace(webRoot + "/", ""));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("signed provider discharge summary uses stored displayName, not live locale remap", () => {
    const signedJson = {
      providerDischargeDocumentedAt: "2026-06-01T12:00:00.000Z",
      providerDischargeDocumentedByDisplayName: "Dr Test",
      providerDischargeDiagnosisRefs: [
        { encounterDiagnosisId: "dx-1", code: "R10.85", label: "Generalized abdominal pain", isPrimary: true },
      ],
      providerDischargeDiagnosisDocs: [
        {
          id: "card-1",
          sourceEncounterDiagnosisId: "dx-1",
          encounterDiagnosisId: "dx-1",
          code: "R10.85",
          displayName: "Generalized abdominal pain",
          isPrimaryDiagnosis: true,
          displayOrder: 0,
          description: "",
          diagnosisInstructions: "",
          medicationTreatment: "",
        },
      ],
    };
    const es = buildProviderDischargeDocumentationSummaryBlock(signedJson, "es");
    const fr = buildProviderDischargeDocumentationSummaryBlock(signedJson, "fr");
    const textEs = es?.lines.join("\n") ?? "";
    const textFr = fr?.lines.join("\n") ?? "";
    expect(textEs).toContain("R10.85 — Generalized abdominal pain");
    expect(textFr).toContain("R10.85 — Generalized abdominal pain");
    expect(textEs).not.toContain("Dolor abdominal en varios sitios");
    expect(textFr).not.toContain("Douleur abdominale à plusieurs sites");
    expect(textEs).not.toMatch(/R10\.85\s+—\s+R10\.85/);
  });

  it("code-only signed ED snapshot stays A42.1 without CODE — CODE", () => {
    const signedJson = {
      providerDischargeDocumentedAt: "2026-06-01T12:00:00.000Z",
      providerDischargeDocumentedByDisplayName: "Dr Test",
      providerDischargeDiagnosisRefs: [
        { encounterDiagnosisId: "dx-2", code: "A42.1", label: "A42.1", isPrimary: true },
      ],
      providerDischargeDiagnosisDocs: [
        {
          id: "card-2",
          sourceEncounterDiagnosisId: "dx-2",
          encounterDiagnosisId: "dx-2",
          code: "A42.1",
          displayName: "A42.1",
          isPrimaryDiagnosis: true,
          displayOrder: 0,
          description: "",
          diagnosisInstructions: "",
          medicationTreatment: "",
        },
      ],
    };
    const es = buildProviderDischargeDocumentationSummaryBlock(signedJson, "es")?.lines.join("\n") ?? "";
    const fr = buildProviderDischargeDocumentationSummaryBlock(signedJson, "fr")?.lines.join("\n") ?? "";
    expect(es).toContain("A42.1");
    expect(fr).toContain("A42.1");
    expect(es).not.toMatch(/A42\.1\s+—\s+A42\.1/);
    expect(fr).not.toMatch(/A42\.1\s+—\s+A42\.1/);
    expect(es).not.toMatch(/actinomicosis|actinomycose/i);
  });

  it("finalized inpatient diagnosis stays on stored snapshot across EN/FR/ES", () => {
    const stored = { code: "R10.85", description: "Generalized abdominal pain" };
    const en = formatInpatientDischargeDiagnosisDisplay(stored);
    const fr = formatInpatientDischargeDiagnosisDisplay(stored);
    const es = formatInpatientDischargeDiagnosisDisplay(stored);
    expect(en).toBe("Generalized abdominal pain (R10.85)");
    expect(fr).toBe(en);
    expect(es).toBe(en);
    expect(es).not.toContain("Dolor abdominal en varios sitios");
    expect(fr).not.toContain("Douleur abdominale à plusieurs sites");
    const board = readFileSync(
      join(webRoot, "src/features/inpatient-workspace/InpatientDischargeBoard.tsx"),
      "utf8"
    );
    expect(board).toContain("if (!providerWriteEnabled)");
    expect(board).toContain("formatInpatientDischargeDiagnosisDisplay(row)");
  });

  it("live PatientChartPrintLayout may localize; frozen chart-export uses stored description", () => {
    const livePrint = readFileSync(
      join(webRoot, "src/components/patient-chart/PatientChartPrintLayout.tsx"),
      "utf8"
    );
    expect(livePrint).toContain("liveIcd10DiagnosisPrimary");
    const exportService = readFileSync(
      join(webRoot, "../api/src/encounters/chart-export.service.ts"),
      "utf8"
    );
    const exportHtml = readFileSync(
      join(webRoot, "../api/src/encounters/chart-export-html.util.ts"),
      "utf8"
    );
    expect(exportService).not.toContain("resolveIcd10PresentationByCatalogId");
    expect(exportService).not.toContain("icd10-diagnosis-presentation");
    expect(exportHtml).toContain("d.description");
    expect(exportHtml).not.toContain("d.displayLabel");
    expect(exportHtml).not.toContain("liveIcd10DiagnosisPrimary");
  });

  it("shared governed seed maps remain available", () => {
    expect(GOVERNED_ICD10_CLINICIAN_LABELS_FR.R1085).toBe("Douleur abdominale à plusieurs sites");
    expect(GOVERNED_ICD10_CLINICIAN_LABELS_ES.R1085).toBe("Dolor abdominal en varios sitios");
  });

  it("unsigned provider discharge uses server presentation and persists English description", () => {
    const source = readFileSync(
      join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
      "utf8"
    );
    expect(source).toContain("formatIcd10ServerResolvedOneLineDisplay");
    expect(source).toContain("icd10ListLocaleQuery(language)");
    expect(source).toContain("label: row.description?.trim() || row.code");
    expect(source).toContain("storedDischargeDiagnosisPrimary");
    expect(source).not.toContain("displayName: row.displayLabel");
  });

  it("inpatient unsigned cards localize presentation only; persist uses search description helper", () => {
    const source = readFileSync(
      join(webRoot, "src/features/inpatient-workspace/InpatientDischargeBoard.tsx"),
      "utf8"
    );
    expect(source).toContain("inpatientDxTitle");
    expect(source).toContain("formatIcd10ServerResolvedOneLineDisplay");
    expect(source).toContain("addDischargeDiagnosis({ code: hit.code, description })");
    expect(source).toContain("formatInpatientDischargeDiagnosisDisplay");
    expect(source).not.toContain("description: hit.displayLabel");
  });

  it("live chart/timeline/print/header use server presentation fields", () => {
    const summary = readFileSync(join(webRoot, "src/components/patient-chart/PatientSummaryTab.tsx"), "utf8");
    const timeline = readFileSync(join(webRoot, "src/components/patient-chart/EncounterClinicalTimeline.tsx"), "utf8");
    const print = readFileSync(join(webRoot, "src/components/patient-chart/PatientChartPrintLayout.tsx"), "utf8");
    const header = readFileSync(join(webRoot, "app/app/encounters/[id]/page.tsx"), "utf8");
    const closed = readFileSync(
      join(webRoot, "src/components/encounters/EnterpriseClosedEncounterClinicalRecord.tsx"),
      "utf8"
    );
    const preview = readFileSync(join(webRoot, "src/components/encounters/EncounterChartLivePreview.ts"), "utf8");
    for (const src of [summary, timeline, print, header, closed, preview]) {
      expect(src).toContain("liveIcd10DiagnosisPrimary");
    }
    expect(header).toContain("icd10ListLocaleQuery");
    expect(closed).toContain("icd10ListLocaleQuery");
  });

  it("ROI and chart-export snapshot paths do not import live terminology overlay", () => {
    const roiFiles = [
      "src/features/documents",
    ];
    void roiFiles;
    const exportHits: string[] = [];
    for (const file of walkTsFiles(join(webRoot, "src/features/documents")).concat(
      walkTsFiles(join(webRoot, "src/lib")).filter((p) => /chart-export|chartExport|roi/i.test(p))
    )) {
      const src = readFileSync(file, "utf8");
      if (src.includes("diagnosisFrenchDisplayLabels") || src.includes("getLocalizedDiagnosisDisplayLabel")) {
        exportHits.push(file);
      }
    }
    expect(exportHits).toEqual([]);
  });

  it("exactness: sibling/category/parent codes stay UNLOCALIZED without inheritance", () => {
    expect(selectableDxPrimaryFromGovernedMaps({ code: "R11.0", description: "Nausea" }, "fr")).toBe("R11.0");
    expect(selectableDxPrimaryFromGovernedMaps({ code: "R11.0", description: "Nausea" }, "fr")).not.toBe(
      GOVERNED_ICD10_CLINICIAN_LABELS_FR.R1110
    );
    expect(selectableDxPrimaryFromGovernedMaps({ code: "L03.90", description: "Cellulitis, unspecified" }, "es")).toBe(
      "Celulitis no especificada"
    );
    expect(selectableDxPrimaryFromGovernedMaps({ code: "L03.90", description: "Cellulitis, unspecified" }, "es")).not.toBe(
      GOVERNED_ICD10_CLINICIAN_LABELS_ES.L03
    );
    expect(selectableDxPrimaryFromGovernedMaps({ code: "G43.D0", description: "Menstrual migraine, not intractable" }, "es")).toBe(
      "G43.D0"
    );
    expect(selectableDxPrimaryFromGovernedMaps({ code: "G43", description: "Migraine" }, "fr")).toBe("G43");
  });

  it("cross-language leakage of governed maps is zero for sampled codes", () => {
    const fr = selectableDxPrimaryFromGovernedMaps({ code: "R10.85", description: "Generalized abdominal pain" }, "fr");
    const es = selectableDxPrimaryFromGovernedMaps({ code: "R10.85", description: "Generalized abdominal pain" }, "es");
    const en = selectableDxPrimaryFromGovernedMaps({ code: "R10.85", description: "Generalized abdominal pain" }, "en");
    expect(fr).toBe("Douleur abdominale à plusieurs sites");
    expect(es).toBe("Dolor abdominal en varios sitios");
    expect(en).toBe("Generalized abdominal pain");
    expect(fr).not.toMatch(/dolor|abdominal pain/i);
    expect(es).not.toMatch(/douleur|abdominal pain/i);
    expect(en).not.toMatch(/douleur|dolor/i);
  });
});
