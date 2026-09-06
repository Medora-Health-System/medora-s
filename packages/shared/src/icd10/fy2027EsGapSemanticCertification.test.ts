import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { composeFy2027EsGapLabel } from "./fy2027EsGapGovernedComposer.js";
import {
  certifyFy2027EsGapSemantics,
  fy2027EsApprovalStage,
  fy2027EsGapIngestGate,
  summarizeFy2027EsSemantics,
  toFy2027EsSemanticReviewRecord,
} from "./fy2027EsGapSemanticCertification.js";

type Inventory = {
  count: number;
  codes: Array<{ code: string; shortDescription: string }>;
};

function loadInventory(): Inventory {
  return JSON.parse(
    readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../../../../apps/api/prisma/icd/fy2027-es-new-or-changed-codes.json"),
      "utf8",
    ),
  ) as Inventory;
}

function certify(code: string, english: string, parent?: string) {
  const composed = composeFy2027EsGapLabel({ code, shortDescription: english, isSelectable: true });
  return certifyFy2027EsGapSemantics({
    code,
    shortDescription: english,
    spanish: composed.label ?? "",
    structuralStatus: "STRUCTURAL_CANDIDATE",
    parentSpanish: parent,
  });
}

describe("FY2027 Spanish new/changed semantic certification", () => {
  const inventory = loadInventory();

  it("does not treat structural candidate status as semantic approval", () => {
    const row = certify("J4B", "Pulmonary mycetoma");
    expect(row.semanticNotes).toContain("STRUCTURAL_PASS_IS_NOT_SEMANTIC_PASS");
    expect(row.semanticStatus).toBe("PASS");
    expect(fy2027EsApprovalStage({ semanticStatus: "PASS", approvedForIngest: false })).toBe("SEMANTICALLY_CERTIFIED");
    expect(fy2027EsApprovalStage({ semanticStatus: "PASS", approvedForIngest: true })).toBe("APPROVED_FOR_INGEST");
    expect(
      fy2027EsGapIngestGate({
        approveStructurallyPassing: true,
        approveSemanticallyCertified: false,
        applyLocal: true,
      }),
    ).toEqual({ allowed: false, reason: "REFUSING_STRUCTURAL_INGEST" });
  });

  it("fails wrong laterality, intent, gene, and parent-copy labels", () => {
    const wrongSide = certifyFy2027EsGapSemantics({
      code: "M67.A01",
      shortDescription: "Plantar fasciitis, right foot",
      spanish: "Fascitis plantar, pie izquierdo",
      structuralStatus: "STRUCTURAL_CANDIDATE",
    });
    expect(wrongSide.semanticStatus).toBe("FAIL");
    const wrongGene = certifyFy2027EsGapSemantics({
      code: "QA1.790",
      shortDescription: "Familial cancer syndrome with pathogenic BRCA1 mutation",
      spanish: "Síndrome de cáncer familiar con mutación patógena BRCA2",
      structuralStatus: "STRUCTURAL_CANDIDATE",
    });
    expect(wrongGene.semanticStatus).toBe("FAIL");
    const parentCopy = certify(
      "L02.232",
      "Carbuncle of back [any part, except buttock and flank]",
      "Ántrax de espalda [cualquier parte, excepto la nalga y el flanco]",
    );
    expect(parentCopy.semanticStatus).toBe("FAIL");
    expect(parentCopy.semanticNotes).toContain("PARENT_LABEL_COPY");
  });

  it("certifies every new or changed FY2027 governed label", () => {
    const rows = inventory.codes.map((row) => certify(row.code, row.shortDescription));
    const summary = summarizeFy2027EsSemantics(rows);
    const fail = rows.filter((row) => row.semanticStatus === "FAIL");
    const review = rows.filter((row) => row.semanticStatus === "REVIEW_REQUIRED");
    expect(fail.map((row) => `${row.code}:${row.semanticNotes.join(",")}`)).toEqual([]);
    expect(review.map((row) => `${row.code}:${row.semanticNotes.join(",")}`)).toEqual([]);
    expect(rows.filter((row) => row.semanticStatus === "PASS")).toHaveLength(194);
    expect(summary.reduce((sum, family) => sum + family.PASS, 0)).toBe(194);
    const record = toFy2027EsSemanticReviewRecord(rows[0]!, false);
    expect(record.APPROVAL_STAGE).toBe("SEMANTICALLY_CERTIFIED");
  });
});
