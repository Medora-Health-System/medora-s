import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ICD10_FY2026_ES_GAP_SOURCE_ID,
  ICD10_FY2026_ES_GAP_TERMINOLOGY_VERSION,
} from "./icd10TerminologyTypes.js";
import {
  composeFy2026EsGapLabel,
  reviewFy2026EsGapCandidate,
  validateFy2026EsGapLabel,
} from "./fy2026EsGapGovernedComposer.js";

const liveGapPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../apps/api/prisma/icd/fy2026-es-live-missing-codes.json",
);

type LiveGapFile = {
  liveUnresolvedCount: number;
  officialNewLabelsFound: boolean;
  codes: Array<{ code: string; family: string }>;
};

function loadLiveGap(): LiveGapFile {
  return JSON.parse(readFileSync(liveGapPath, "utf8")) as LiveGapFile;
}

describe("FY2026 Spanish gap governed composer", () => {
  it("covers every live unresolved code with a distinct exact label", () => {
    const gap = loadLiveGap();
    expect(gap.liveUnresolvedCount).toBe(486);
    expect(gap.officialNewLabelsFound).toBe(false);
    const labels = new Set<string>();
    for (const row of gap.codes) {
      const composed = composeFy2026EsGapLabel({
        code: row.code,
        shortDescription: "placeholder",
        isSelectable: true,
      });
      expect(composed.label, row.code).toBeTruthy();
      expect(composed.bucket).toBe("GOVERNED_SPANISH_LABEL_REQUIRED");
      labels.add(composed.label!);
    }
    expect(labels.size).toBe(486);
  });

  it("preserves L98 site, laterality, and severity without copying a sibling", () => {
    const right = composeFy2026EsGapLabel({
      code: "L98.A111",
      shortDescription: "Non-pressure chronic ulcer of right upper arm limited to brkdwn skin",
      isSelectable: true,
    });
    const left = composeFy2026EsGapLabel({
      code: "L98.A121",
      shortDescription: "Non-pressure chronic ulcer of left upper arm limited to brkdwn skin",
      isSelectable: true,
    });
    const abdomen = composeFy2026EsGapLabel({
      code: "L98.432",
      shortDescription: "Non-pressure chronic ulcer of abdomen with fat layer exposed",
      isSelectable: true,
    });
    expect(right.label).toBe(
      "Úlcera crónica no debida a presión en brazo derecho, limitada a la rotura de la piel",
    );
    expect(left.label).toBe(
      "Úlcera crónica no debida a presión en brazo izquierdo, limitada a la rotura de la piel",
    );
    expect(abdomen.label).toBe(
      "Úlcera crónica no debida a presión en abdomen, con exposición de la capa adiposa",
    );
    expect(right.label).not.toBe(left.label);
  });

  it("preserves S31 laterality, peritoneal penetration, and 7th character", () => {
    const init = composeFy2026EsGapLabel({
      code: "S31.106A",
      shortDescription: "Unsp opn wnd abd wall, right flank w/o penet perit cav, init",
      isSelectable: true,
    });
    const withPen = composeFy2026EsGapLabel({
      code: "S31.606A",
      shortDescription: "Unsp opn wnd abd wall, right flank w penet perit cav, init",
      isSelectable: true,
    });
    expect(init.label).toContain("flanco derecho");
    expect(init.label).toContain("sin penetración en cavidad peritoneal");
    expect(init.label).toContain("contacto inicial");
    expect(withPen.label).toContain("con penetración en cavidad peritoneal");
    expect(init.label).not.toBe(withPen.label);
    expect(
      validateFy2026EsGapLabel({
        code: "S31.106A",
        shortDescription: "Unsp opn wnd abd wall, right flank w/o penet perit cav, init",
        label: init.label!,
      }),
    ).toEqual([]);
  });

  it("does not let G35 header wording replace G35.A", () => {
    const rr = composeFy2026EsGapLabel({
      code: "G35.A",
      shortDescription: "Relapsing-remitting multiple sclerosis",
      isSelectable: true,
    });
    expect(rr.label).toBe("Esclerosis múltiple remitente-recurrente");
    expect(
      validateFy2026EsGapLabel({
        code: "G35.A",
        shortDescription: "Relapsing-remitting multiple sclerosis",
        label: rr.label!,
        parentLabel: "Esclerosis múltiple",
      }),
    ).toEqual([]);
    expect(
      validateFy2026EsGapLabel({
        code: "G35.A",
        shortDescription: "Relapsing-remitting multiple sclerosis",
        label: "Esclerosis múltiple",
        parentLabel: "Esclerosis múltiple",
      }),
    ).toContain("PARENT_LABEL_COPY");
  });

  it("keeps T78 baked-milk semantics and encounter character", () => {
    const row = reviewFy2026EsGapCandidate({
      code: "T78.070A",
      shortDescription: "Anaphyl rct d/t milk /dair prod w tolerance to bkd milk,init",
      isSelectable: true,
    });
    expect(row.label).toBe(
      "Reacción anafiláctica por leche y productos lácteos con tolerancia a la leche horneada, contacto inicial",
    );
    expect(row.reviewStatus).toBe("STRUCTURAL_CANDIDATE");
    expect(row.validationErrors).toEqual([]);
  });

  it("keeps gene identity on QA0 codes", () => {
    expect(
      composeFy2026EsGapLabel({
        code: "QA0.0101",
        shortDescription: "SCN2A-related neurodevelopmental disorder",
        isSelectable: true,
      }).label,
    ).toContain("SCN2A");
    expect(
      composeFy2026EsGapLabel({
        code: "QA0.0142",
        shortDescription: "DLG4-related synaptopathy",
        isSelectable: true,
      }).label,
    ).toContain("DLG4");
  });

  it("marks structurally valid labels as STRUCTURAL_CANDIDATE, not clinically approved", () => {
    const row = reviewFy2026EsGapCandidate({
      code: "R10.A1",
      shortDescription: "Flank pain, right side",
      isSelectable: true,
    });
    expect(row.reviewStatus).toBe("STRUCTURAL_CANDIDATE");
    expect(row.bucket).toBe("GOVERNED_SPANISH_LABEL_REQUIRED");
    expect(ICD10_FY2026_ES_GAP_SOURCE_ID).toBe("MEDORA_DX_GOVERNED_FY2026_ES_GAP");
    expect(ICD10_FY2026_ES_GAP_TERMINOLOGY_VERSION).toBe("MEDORA.TRILANG.DX.P3F7.ES.GAP.1");
  });

  it("blocks nonselectable rows instead of inheriting a category label", () => {
    const row = reviewFy2026EsGapCandidate({
      code: "G35",
      shortDescription: "Multiple sclerosis",
      isSelectable: false,
    });
    expect(row.reviewStatus).toBe("BLOCKED");
    expect(row.bucket).toBe("INVALID_OR_NONSELECTABLE");
  });
});
