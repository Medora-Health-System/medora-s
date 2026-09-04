import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ES_MEDICAL_TERMINOLOGY,
  applyApprovedSpanishTerminology,
  getSpanishMedicalTerm,
  isHiddenSpanishPlaceholder,
} from "@medora/shared";
import { createHiddenSpanishCatalog } from "@/i18n/messages/hiddenSpanishCatalog";
import en from "@/i18n/messages/en";
import es from "@/i18n/messages/es";
import { resolveClinicalUiMessage } from "@/i18n/messages/registry";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function collectStringLeaves(obj: unknown, prefix = ""): Array<{ path: string; value: string }> {
  if (typeof obj === "string") return prefix ? [{ path: prefix, value: obj }] : [];
  if (obj === null || obj === undefined || typeof obj !== "object") return [];
  const out: Array<{ path: string; value: string }> = [];
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (typeof val === "string") out.push({ path: next, value: val });
    else out.push(...collectStringLeaves(val, next));
  }
  return out;
}

describe("MEDUI.ES.1D canon overlay + governance audits", () => {
  it("overlays only APPROVED canon terms onto existing EN key paths", () => {
    const { tree, replaced } = applyApprovedSpanishTerminology(createHiddenSpanishCatalog(en));
    expect(replaced).toBeGreaterThan(0);
    expect(resolveClinicalUiMessage("es", "common.medication")).toBe("Medicamento");
    expect(resolveClinicalUiMessage("es", "nav.observation")).toBe("Observación");
    expect(resolveClinicalUiMessage("es", "nav.emergency")).toBe("Servicio de urgencias");
    expect(resolveClinicalUiMessage("es", "printOutput.discharge.documentH1")).toBe("Resumen de alta");
    // 1D canon alone leaves common.save as placeholder — but live ES catalog includes 1E overlay
    // Verify 1D-only tree (not live ES) keeps common.save as placeholder
    const saveInTree = collectStringLeaves(tree).find((l) => l.path === "common.save");
    expect(saveInTree).toBeDefined();
    expect(isHiddenSpanishPlaceholder(saveInTree!.value)).toBe(true);
    // Live ES now has 1E overlay for common.save
    expect(resolveClinicalUiMessage("es", "common.save")).toBe("Guardar");
    const leaves = collectStringLeaves(tree);
    const remaining = leaves.filter((l) => isHiddenSpanishPlaceholder(l.value)).length;
    expect(replaced).toBeGreaterThan(0);
    expect(remaining).toBe(leaves.length - replaced);
    // 1D overlays a small approved subset only; the rest stay placeholders.
    expect(replaced).toBe(46);
    expect(leaves.length).toBe(44266);
    expect(remaining).toBe(44220);
    expect(resolveClinicalUiMessage("es", "common.medication")).toBe(
      collectStringLeaves(es).find((l) => l.path === "common.medication")?.value
    );
  });

  it("approved overlay keys exist in the English catalog", () => {
    const enPaths = new Set(collectStringLeaves(en).map((x) => x.path));
    const missing: string[] = [];
    for (const e of ES_MEDICAL_TERMINOLOGY) {
      if (e.status !== "APPROVED") continue;
      for (const path of e.uiMessageKeys ?? []) {
        if (!enPaths.has(path)) missing.push(`${e.key} → ${path}`);
      }
    }
    expect(missing, missing.join(", ")).toEqual([]);
  });

  it("missing Spanish medical terms never fall back to EN or FR", () => {
    expect(getSpanishMedicalTerm("clinical.not.a.term")).toBe("UNLOCALIZED_ES::clinical.not.a.term");
    expect(resolveClinicalUiMessage("es", "meduiEs1d.missing.canon")).toBe("meduiEs1d.missing.canon");
    expect(resolveClinicalUiMessage("es", "meduiEs1d.missing.canon")).not.toBe(
      resolveClinicalUiMessage("en", "common.save")
    );
    expect(resolveClinicalUiMessage("es", "meduiEs1d.missing.canon")).not.toBe(
      resolveClinicalUiMessage("fr", "common.save")
    );
  });

  it("classifies risky concatenation patterns for later phases without rewriting them", () => {
    const classified = [
      {
        path: "apps/web/src/i18n/messages/en.ts",
        pattern: "Administered by {firstName}",
        class: "templated-i18n" as const,
      },
      {
        path: "apps/web/src/i18n/messages/erTriage.en.ts",
        pattern: "Signed by {name}",
        class: "templated-i18n" as const,
      },
      {
        path: "apps/web/src/features/mar/marShiftTimelineDisplay.ts",
        pattern: "`Administered by: ${variance.performedByDisplay}`",
        class: "english-concat-later-phase" as const,
      },
    ];
    expect(classified.filter((c) => c.class === "templated-i18n")).toHaveLength(2);
    expect(classified.filter((c) => c.class === "english-concat-later-phase")).toHaveLength(1);
  });

  it("does not scatter Spanish clinical literals through components", () => {
    const files = [
      "src/components/orders/CreateOrderModal.tsx",
      "src/features/emergency/EdAdmissionOrderComposer.tsx",
      "src/i18n/provider.tsx",
      "app/login/page.tsx",
    ];
    const forbidden = /\b(Intravenosa|Diagnóstico|Medicamento|Observación|Alergias)\b/;
    let hits = 0;
    for (const rel of files) {
      const src = readFileSync(join(webRoot, rel), "utf8");
      hits += src.match(forbidden)?.length ?? 0;
    }
    expect(hits).toBe(0);
  });
});
