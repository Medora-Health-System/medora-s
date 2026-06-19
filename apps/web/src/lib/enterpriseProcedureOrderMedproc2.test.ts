/**
 * MEDPROC.2 — enterprise procedure order persistence (web guards).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildOrderItemDisplayLabelEn,
  buildOrderItemDisplayLabelFr,
} from "@medora/shared";

const webRoot = join(import.meta.dirname, "../..");
const modalSource = readFileSync(
  join(webRoot, "src/components/orders/CreateOrderModal.tsx"),
  "utf8"
);

describe("MEDPROC.2 CreateOrderModal enterprise procedure wiring", () => {
  it("sends enterpriseProcedureId for catalog selection", () => {
    expect(modalSource).toContain("_enterpriseProcedureId?.trim()");
    expect(modalSource).toContain("if (explicit) return { enterpriseProcedureId: explicit }");
  });

  it("omits enterpriseProcedureId for custom care tasks", () => {
    expect(modalSource).toContain("addCustomCareTaskLine");
    expect(modalSource).toMatch(/addCareLine\(label\)/);
  });

  it("maps canonical ids for core procedures", () => {
    expect(modalSource).toContain('procedure.id === "ekg_ecg"');
    expect(modalSource).toContain('procedure.id === "laceration_repair"');
    expect(modalSource).toContain("addCareCatalogProcedure");
  });
});

describe("MEDPROC.2 order list display fallback", () => {
  it("uses catalog label when enterpriseProcedureId exists", () => {
    expect(
      buildOrderItemDisplayLabelEn(
        {
          catalogItemType: "CARE",
          manualLabel: "Old localized snapshot",
          enterpriseProcedureId: "foley_catheter",
        },
        null,
        null,
        null
      )
    ).toBe("Foley catheter");
  });

  it("falls back to manualLabel when enterpriseProcedureId is absent", () => {
    expect(
      buildOrderItemDisplayLabelFr(
        {
          catalogItemType: "CARE",
          manualLabel: "Tâche personnalisée",
        },
        null,
        null,
        null
      )
    ).toBe("Tâche personnalisée");
  });
});
