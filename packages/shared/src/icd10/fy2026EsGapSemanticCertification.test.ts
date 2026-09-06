import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { composeFy2026EsGapLabel } from "./fy2026EsGapGovernedComposer.js";
import {
  certifyFy2026EsGapSemantics,
  fy2026EsApprovalStage,
  fy2026EsGapIngestGate,
  summarizeFy2026EsSemantics,
  toFy2026EsSemanticReviewRecord,
} from "./fy2026EsGapSemanticCertification.js";

type LiveGapFile = {
  liveUnresolvedCount: number;
  sourceMissingButGoverned: string[];
  codes: Array<{ code: string; family: string; shortDescription: string }>;
};

function loadLiveGap(): LiveGapFile {
  return JSON.parse(
    readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../../../../apps/api/prisma/icd/fy2026-es-live-missing-codes.json"),
      "utf8",
    ),
  ) as LiveGapFile;
}

function certify(code: string, english: string, parent?: string) {
  const composed = composeFy2026EsGapLabel({ code, shortDescription: english, isSelectable: true });
  return certifyFy2026EsGapSemantics({
    code,
    shortDescription: english,
    spanish: composed.label ?? "",
    structuralStatus: "STRUCTURAL_CANDIDATE",
    parentSpanish: parent,
  });
}

describe("FY2026 Spanish gap semantic certification", () => {
  const gap = loadLiveGap();
  const englishByCode = new Map(gap.codes.map((row) => [row.code, row.shortDescription]));

  it("does not treat structural candidate status as semantic pass evidence", () => {
    const row = certify("G35.A", englishByCode.get("G35.A") ?? "", "Esclerosis múltiple");
    expect(row.semanticNotes).toContain("STRUCTURAL_PASS_IS_NOT_SEMANTIC_PASS");
    expect(row.semanticStatus).toBe("PASS");
    expect(row.spanish).not.toBe("Esclerosis múltiple");
    expect(fy2026EsApprovalStage({ semanticStatus: "PASS", approvedForLocalIngest: false })).toBe(
      "SEMANTICALLY_CERTIFIED",
    );
    expect(fy2026EsApprovalStage({ semanticStatus: "FAIL", approvedForLocalIngest: false })).toBe("PENDING_REVIEW");
  });

  it("fails a parent-copied G35.A label", () => {
    const row = certifyFy2026EsGapSemantics({
      code: "G35.A",
      shortDescription: "Relapsing-remitting multiple sclerosis",
      spanish: "Esclerosis múltiple",
      structuralStatus: "STRUCTURAL_CANDIDATE",
      parentSpanish: "Esclerosis múltiple",
    });
    expect(row.semanticStatus).toBe("FAIL");
    expect(row.semanticNotes).toContain("PARENT_LABEL_COPY");
  });

  it("fails a correct Spanish sentence with the wrong S31 wound subtype", () => {
    const row = certifyFy2026EsGapSemantics({
      code: "S31.116A",
      shortDescription: englishByCode.get("S31.116A") ?? "Laceration w/o foreign body, right flank, init",
      spanish:
        "Herida punzante de pared abdominal sin cuerpo extraño, flanco derecho, sin penetración en cavidad peritoneal, contacto inicial",
      structuralStatus: "STRUCTURAL_CANDIDATE",
    });
    expect(row.semanticStatus).toBe("FAIL");
    expect(row.semanticNotes.some((note) => note.includes("OPEN_WOUND_TYPE"))).toBe(true);
  });

  it("certifies every S31 wound, laterality, peritoneal, and 7th-character combination", () => {
    const rows = gap.codes.filter((row) => row.family === "S31").map((row) => certify(row.code, row.shortDescription));
    expect(rows).toHaveLength(108);
    expect(rows.every((row) => row.semanticStatus === "PASS")).toBe(true);
    const lac = certify("S31.116A", englishByCode.get("S31.116A") ?? "");
    const puncture = certify("S31.136A", englishByCode.get("S31.136A") ?? "");
    expect(lac.spanish).toContain("Desgarro");
    expect(puncture.spanish).toContain("Herida punzante");
    expect(lac.spanish).not.toBe(puncture.spanish);
    expect(rows.every((row) => row.spanish.includes("pared abdominal"))).toBe(true);
    expect(rows.filter((row) => row.spanish.includes("flanco derecho"))).toHaveLength(36);
    expect(rows.filter((row) => row.spanish.includes("sin penetración"))).toHaveLength(54);
    expect(rows.filter((row) => row.spanish.includes("con penetración"))).toHaveLength(54);
  });

  it("certifies every S30 site, injury type, and 7th character", () => {
    const rows = gap.codes.filter((row) => row.family === "S30").map((row) => certify(row.code, row.shortDescription));
    expect(rows).toHaveLength(30);
    expect(rows.every((row) => row.semanticStatus === "PASS")).toBe(true);
    expect(certify("S30.85AA", englishByCode.get("S30.85AA") ?? "").spanish).toContain("Cuerpo extraño");
    expect(certify("S30.81AA", englishByCode.get("S30.81AA") ?? "").spanish).toContain("Abrasión");
  });

  it("distinguishes T36 poisoning, adverse effect, underdosing, and intent", () => {
    const poison = certify("T36.AX1A", englishByCode.get("T36.AX1A") ?? "");
    const selfHarm = certify("T36.AX2A", englishByCode.get("T36.AX2A") ?? "");
    const assault = certify("T36.AX3A", englishByCode.get("T36.AX3A") ?? "");
    const undetermined = certify("T36.AX4A", englishByCode.get("T36.AX4A") ?? "");
    const adverse = certify("T36.AX5A", englishByCode.get("T36.AX5A") ?? "");
    const under = certify("T36.AX6A", englishByCode.get("T36.AX6A") ?? "");
    expect([poison, selfHarm, assault, undetermined, adverse, under].every((row) => row.semanticStatus === "PASS")).toBe(
      true,
    );
    expect(poison.spanish).toContain("Envenenamiento");
    expect(poison.spanish).toContain("accidental");
    expect(selfHarm.spanish).toContain("autolesión intencionada");
    expect(assault.spanish).toContain("agresión");
    expect(undetermined.spanish).toContain("intencionalidad sin determinar");
    expect(adverse.spanish).toContain("Efecto adverso");
    expect(under.spanish).toContain("Infradosificación");
    expect(adverse.spanish).not.toContain("Envenenamiento");
    expect(under.spanish).not.toContain("Envenenamiento");
    const mislabeled = certifyFy2026EsGapSemantics({
      code: "T36.AX5A",
      shortDescription: englishByCode.get("T36.AX5A") ?? "",
      spanish: "Envenenamiento por antibióticos fluoroquinolónicos, contacto inicial",
      structuralStatus: "STRUCTURAL_CANDIDATE",
    });
    expect(mislabeled.semanticStatus).toBe("FAIL");
  });

  it("distinguishes T65 xylazine intent and 7th character", () => {
    const rows = gap.codes.filter((row) => row.family === "T65").map((row) => certify(row.code, row.shortDescription));
    expect(rows).toHaveLength(12);
    expect(rows.every((row) => row.semanticStatus === "PASS")).toBe(true);
    expect(certify("T65.841A", englishByCode.get("T65.841A") ?? "").spanish).toContain("xilazina");
    expect(certify("T65.841A", englishByCode.get("T65.841A") ?? "").spanish).toContain("accidental");
  });

  it("preserves T78 allergen and baked-food distinction", () => {
    const milkTol = certify("T78.070A", englishByCode.get("T78.070A") ?? "");
    const milkRct = certify("T78.071A", englishByCode.get("T78.071A") ?? "");
    const egg = certify("T78.080A", englishByCode.get("T78.080A") ?? "");
    const other = certify("T78.110A", englishByCode.get("T78.110A") ?? "");
    expect([milkTol, milkRct, egg, other].every((row) => row.semanticStatus === "PASS")).toBe(true);
    expect(milkTol.spanish).toContain("tolerancia a la leche horneada");
    expect(milkRct.spanish).toContain("reactividad a la leche horneada");
    expect(other.spanish).toContain("reacciones adversas alimentarias");
    expect(other.spanish).not.toContain("Reacción anafiláctica");
  });

  it("keeps gene symbols untranslated", () => {
    expect(certify("QA0.0101", englishByCode.get("QA0.0101") ?? "").spanish).toContain("SCN2A");
    expect(certify("QA0.0142", englishByCode.get("QA0.0142") ?? "").spanish).toContain("DLG4");
    expect(certify("QA0.0151", englishByCode.get("QA0.0151") ?? "").spanish).toContain("FOXG1");
    expect(certify("QA0.0102", englishByCode.get("QA0.0102") ?? "").spanish).toContain("CACNA1A");
    expect(certify("QA0.0131", englishByCode.get("QA0.0131") ?? "").spanish).toContain("SLC6A1");
    expect(certify("E83.821", englishByCode.get("E83.821") ?? "").spanish).toContain("ENPP1");
    expect(certify("Q87.88", englishByCode.get("Q87.88") ?? "").spanish).toContain("CTNNB1");
    const stxbp = certify("QA0.0141", englishByCode.get("QA0.0141") ?? "");
    expect(stxbp.semanticStatus).toBe("PASS");
    expect(stxbp.spanish.toLowerCase()).toContain("sintaxina");
    expect(englishByCode.get("QA0.0141")).toBe("Syntaxin-binding protein 1-related disorder");
  });

  it("rejects hiperooxaluria as a misspelling of hyperoxaluria", () => {
    const row = certifyFy2026EsGapSemantics({
      code: "E72.530",
      shortDescription: "Primary hyperoxaluria, type 1",
      spanish: "Hiperooxaluria primaria, tipo 1",
      structuralStatus: "STRUCTURAL_CANDIDATE",
    });
    expect(row.semanticStatus).toBe("FAIL");
    expect(certify("E72.530", englishByCode.get("E72.530") ?? "").spanish).toBe("Hiperoxaluria primaria, tipo 1");
    expect(certify("E72.530", englishByCode.get("E72.530") ?? "").semanticStatus).toBe("PASS");
  });

  it("keeps R10 site families distinct from R10.85 and R11 parent wording", () => {
    const flank = certify("R10.A1", englishByCode.get("R10.A1") ?? "");
    const pelvic = certify("R10.21", englishByCode.get("R10.21") ?? "");
    const cannabis = certify("R11.16", englishByCode.get("R11.16") ?? "");
    expect(flank.semanticStatus).toBe("PASS");
    expect(pelvic.semanticStatus).toBe("PASS");
    expect(cannabis.semanticStatus).toBe("PASS");
    expect(flank.spanish).not.toContain("Dolor abdominal en varios sitios");
    expect(cannabis.spanish).toContain("cannabis");
    expect(cannabis.spanish.toLowerCase()).not.toBe("náuseas");
    expect(gap.codes.some((row) => row.code === "R10.85")).toBe(false);
  });

  it("preserves E11 without-complication and Z40 ovary vs fallopian semantics", () => {
    const dm = certify("E11.A", englishByCode.get("E11.A") ?? "");
    const ovary = certify("Z40.81", englishByCode.get("Z40.81") ?? "");
    const tube = certify("Z40.82", englishByCode.get("Z40.82") ?? "");
    expect(dm.semanticStatus).toBe("PASS");
    expect(dm.spanish).toContain("sin complicaciones");
    expect(ovary.semanticStatus).toBe("PASS");
    expect(tube.semanticStatus).toBe("PASS");
    expect(ovary.spanish).toContain("ovario");
    expect(ovary.spanish).not.toContain("Falopio");
    expect(tube.spanish).toContain("Falopio");
  });

  it("semantically certifies all 486 composed gap labels from official English", () => {
    expect(gap.liveUnresolvedCount).toBe(486);
    expect(gap.sourceMissingButGoverned).toEqual(["R10.85"]);
    expect(gap.codes.every((row) => row.shortDescription.trim().length > 0)).toBe(true);
    const rows = gap.codes.map((row) => certify(row.code, row.shortDescription));
    const holds = rows.filter((row) => row.semanticStatus !== "PASS");
    expect(holds, JSON.stringify(holds.map((row) => ({ code: row.code, notes: row.semanticNotes })))).toEqual([]);
    expect(rows).toHaveLength(486);
    expect(rows.filter((row) => row.family === "L98")).toHaveLength(112);
    expect(rows.filter((row) => row.family === "S30")).toHaveLength(30);
    expect(rows.filter((row) => row.family === "T65")).toHaveLength(12);
    expect(rows.filter((row) => row.family === "T78")).toHaveLength(39);
    expect(rows.filter((row) => row.family === "QA0")).toHaveLength(13);
    expect(rows.filter((row) => row.family === "G35")).toHaveLength(8);
    expect(rows.every((row) => row.structuralStatus === "STRUCTURAL_CANDIDATE")).toBe(true);
    expect(rows.every((row) => row.semanticNotes.includes("STRUCTURAL_PASS_IS_NOT_SEMANTIC_PASS"))).toBe(true);
    const matrix = rows.map((row) => toFy2026EsSemanticReviewRecord(row, false));
    expect(matrix.every((row) => row.APPROVAL_STAGE === "SEMANTICALLY_CERTIFIED")).toBe(true);
    expect(matrix.every((row) => row.STRUCTURAL_STATUS === "STRUCTURAL_CANDIDATE")).toBe(true);
    expect(matrix[0]?.CODE).toBeTruthy();
    expect(matrix[0]?.OFFICIAL_ENGLISH_DESCRIPTION).toBeTruthy();
    expect(matrix[0]?.PROPOSED_SPANISH_DESCRIPTION).toBeTruthy();
  });

  it("refuses local ingest on structural approval alone", () => {
    expect(
      fy2026EsGapIngestGate({
        approveStructurallyPassing: true,
        approveSemanticallyCertified: false,
        applyLocal: true,
      }),
    ).toEqual({ allowed: false, reason: "REFUSING_STRUCTURAL_INGEST" });
    expect(
      fy2026EsGapIngestGate({
        approveStructurallyPassing: false,
        approveSemanticallyCertified: false,
        applyLocal: true,
      }),
    ).toEqual({ allowed: false, reason: "REFUSING_INGEST" });
    expect(
      fy2026EsGapIngestGate({
        approveStructurallyPassing: false,
        approveSemanticallyCertified: true,
        applyLocal: true,
      }),
    ).toEqual({ allowed: true });
  });

  it("summarizes family totals without copying structural approval", () => {
    const rows = [
      certify("S31.106A", englishByCode.get("S31.106A") ?? ""),
      certify("T36.AX5A", englishByCode.get("T36.AX5A") ?? ""),
      certify("G35.A", englishByCode.get("G35.A") ?? "", "Esclerosis múltiple"),
    ];
    const summary = summarizeFy2026EsSemantics(rows);
    expect(summary.find((row) => row.family === "S31")?.PASS).toBe(1);
    expect(rows.every((row) => row.structuralStatus === "STRUCTURAL_CANDIDATE")).toBe(true);
  });
});
