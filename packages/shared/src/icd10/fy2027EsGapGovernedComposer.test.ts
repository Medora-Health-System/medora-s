import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { composeFy2027EsGapLabel, reviewFy2027EsGapCandidate } from "./fy2027EsGapGovernedComposer.js";

type Inventory = {
  count: number;
  codes: Array<{ code: string; shortDescription: string; family: string }>;
};

function loadInventory(): Inventory {
  return JSON.parse(
    readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../../../../apps/api/prisma/icd/fy2027-es-new-or-changed-codes.json"),
      "utf8",
    ),
  ) as Inventory;
}

describe("FY2027 Spanish new/changed governed composer", () => {
  const inventory = loadInventory();

  it("covers every new or description-changed FY2027 code with a distinct exact label", () => {
    expect(inventory.count).toBe(194);
    const labels = new Set<string>();
    for (const row of inventory.codes) {
      const composed = composeFy2027EsGapLabel({
        code: row.code,
        shortDescription: row.shortDescription,
        isSelectable: true,
      });
      expect(composed.label, row.code).toBeTruthy();
      expect(composed.bucket).toBe("GOVERNED_SPANISH_LABEL_REQUIRED");
      expect(composed.blockedReason).toBeNull();
      labels.add(composed.label!);
    }
    expect(labels.size).toBe(194);
  });

  it("does not copy parent FY2026 back labels onto the FY2027 flank-exclusion concepts", () => {
    const back = composeFy2027EsGapLabel({
      code: "L02.232",
      shortDescription: "Carbuncle of back [any part, except buttock and flank]",
      isSelectable: true,
    });
    const flank = composeFy2027EsGapLabel({
      code: "L02.237",
      shortDescription: "Carbuncle of flank",
      isSelectable: true,
    });
    expect(back.label).toContain("flanco");
    expect(back.label).toContain("nalga");
    expect(flank.label).toBe("Ántrax del flanco");
    expect(back.label).not.toBe(flank.label);
    expect(back.label).not.toBe("Ántrax de espalda [cualquier parte, excepto la nalga]");
  });

  it("preserves laterality, encounter, intent, and gene identity", () => {
    const right = composeFy2027EsGapLabel({
      code: "M67.A01",
      shortDescription: "Plantar fasciitis, right foot",
      isSelectable: true,
    });
    const left = composeFy2027EsGapLabel({
      code: "M67.A02",
      shortDescription: "Plantar fasciitis, left foot",
      isSelectable: true,
    });
    const init = composeFy2027EsGapLabel({
      code: "T65.851A",
      shortDescription: "Toxic effect of medetomidine, accidental, init",
      isSelectable: true,
    });
    const selfHarm = composeFy2027EsGapLabel({
      code: "T65.852A",
      shortDescription: "Toxic effect of medetomidine, self-harm, initial encounter",
      isSelectable: true,
    });
    const brca1 = composeFy2027EsGapLabel({
      code: "QA1.790",
      shortDescription: "Familial cancer syndrome with pathogenic BRCA1 mutation",
      isSelectable: true,
    });
    const brca2 = composeFy2027EsGapLabel({
      code: "QA1.791",
      shortDescription: "Familial cancer syndrome with pathogenic BRCA2 mutation",
      isSelectable: true,
    });
    expect(right.label).toContain("pie derecho");
    expect(left.label).toContain("pie izquierdo");
    expect(init.label).toContain("contacto inicial");
    expect(init.label).toContain("accidental");
    expect(selfHarm.label).toContain("autolesión intencionada");
    expect(selfHarm.label).not.toContain("accidental");
    expect(brca1.label).toContain("BRCA1");
    expect(brca2.label).toContain("BRCA2");
    expect(brca1.label).not.toBe(brca2.label);
  });

  it("structurally reviews all inventory rows as candidates", () => {
    for (const row of inventory.codes) {
      const reviewed = reviewFy2027EsGapCandidate({
        code: row.code,
        shortDescription: row.shortDescription,
        isSelectable: true,
      });
      expect(reviewed.reviewStatus, `${row.code} ${reviewed.validationErrors.join(",")}`).toBe("STRUCTURAL_CANDIDATE");
    }
  });
});
