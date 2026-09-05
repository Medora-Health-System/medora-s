/**
 * Phase 19M.9 — Diagnosis & orders mobile/tablet layout hardening (source-level).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DIAGNOSIS_ORDERS_TOUCH_TARGET_MIN_PX,
  diagnosisOrdersDiagnosisCardShellStyle,
  diagnosisOrdersLabelWrapStyle,
  diagnosisOrdersListStyle,
  diagnosisOrdersTableStyle,
  diagnosisOrdersUsesCardLayout,
  resolveDiagnosisOrdersLayoutMode,
} from "@/features/emergency/diagnosisOrdersResponsiveLayout";
import { formatIcd10ServerResolvedOneLineDisplay } from "@medora/shared";

const webRoot = join(import.meta.dirname, "../..");

function readWebSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("diagnosisOrdersResponsiveLayout (19M.9)", () => {
  it("resolves layout mode by viewport width", () => {
    expect(resolveDiagnosisOrdersLayoutMode(390)).toBe("mobileCard");
    expect(resolveDiagnosisOrdersLayoutMode(767)).toBe("mobileCard");
    expect(resolveDiagnosisOrdersLayoutMode(768)).toBe("tabletCard");
    expect(resolveDiagnosisOrdersLayoutMode(1023)).toBe("tabletCard");
    expect(resolveDiagnosisOrdersLayoutMode(1199)).toBe("tabletCard");
    expect(resolveDiagnosisOrdersLayoutMode(1200)).toBe("desktopDense");
  });

  it("uses card layout on mobile and tablet only", () => {
    expect(diagnosisOrdersUsesCardLayout("mobileCard")).toBe(true);
    expect(diagnosisOrdersUsesCardLayout("tabletCard")).toBe(true);
    expect(diagnosisOrdersUsesCardLayout("desktopDense")).toBe(false);
  });

  it("stacks diagnosis cards on mobile and uses two-column grid on tablet", () => {
    expect(diagnosisOrdersListStyle("mobileCard").flexDirection).toBe("column");
    expect(diagnosisOrdersListStyle("tabletCard").gridTemplateColumns).toBe("repeat(2, minmax(0, 1fr))");
  });

  it("avoids fixed table minWidth on mobile/tablet", () => {
    expect(diagnosisOrdersTableStyle("mobileCard", 720).minWidth).toBe(0);
    expect(diagnosisOrdersTableStyle("tabletCard", 640).minWidth).toBe(0);
    expect(diagnosisOrdersTableStyle("desktopDense", 720).minWidth).toBe(720);
  });

  it("wraps French diagnosis labels safely", () => {
    const wrap = diagnosisOrdersLabelWrapStyle();
    expect(wrap.overflowWrap).toBe("anywhere");
    expect(wrap.wordBreak).toBe("break-word");
    expect(wrap.minWidth).toBe(0);

    const shell = diagnosisOrdersDiagnosisCardShellStyle();
    expect(shell.minWidth).toBe(0);
    expect(shell.width).toBe("100%");
  });

  it("defines touch-friendly minimum target size", () => {
    expect(DIAGNOSIS_ORDERS_TOUCH_TARGET_MIN_PX).toBeGreaterThanOrEqual(44);
  });
});

describe("EncounterDiagnosticsPanel responsive wiring (19M.9)", () => {
  const source = readWebSource("src/components/encounters/EncounterDiagnosticsPanel.tsx");

  it("has mobile-card responsive path with layout mode hook", () => {
    expect(source).toContain("resolveDiagnosisOrdersLayoutMode");
    expect(source).toContain('data-testid="encounter-diagnostics-panel-layout"');
    expect(source).toContain('data-layout-mode={layoutMode}');
    expect(source).toContain('layoutMode === "desktopDense"');
    expect(source).toContain("diagnosisOrdersListStyle(layoutMode)");
    expect(source).toContain("diagnosisOrdersDiagnosisCardShellStyle");
  });

  it("keeps ICD code visible and diagnosis actions reachable on cards", () => {
    expect(source).toContain("{r.code}");
    expect(source).toContain('aria-label={t("encounterConsultDiagnostics.moveUp")}');
    expect(source).toContain('aria-label={t("encounterConsultDiagnostics.moveDown")}');
    expect(source).toContain("diagnosisOrdersTouchButtonStyle");
    expect(source).toContain("diagnosisEntry.primaryBadge");
  });

  it("does not clip labels with overflow hidden on diagnosis list", () => {
    expect(source).not.toMatch(/diagnosisOrdersListStyle[\s\S]*overflow:\s*"hidden"/);
    expect(source).toContain("overflowWrap: \"anywhere\"");
    expect(source).toContain("wordBreak: \"break-word\"");
  });

  it("renders server-resolved diagnosis presentation without the browser overlay", () => {
    expect(source).toContain("formatIcd10ServerResolvedOneLineDisplay");
    expect(source).not.toContain("getLocalizedDiagnosisDisplayLabel");
    expect(
      formatIcd10ServerResolvedOneLineDisplay({
        code: "R07.9",
        displayLabel: "Douleur thoracique non précisée",
        displayResolution: "EXACT_GOVERNED_LABEL",
      }).primary
    ).toBe("Douleur thoracique non précisée");
    expect(
      formatIcd10ServerResolvedOneLineDisplay({
        code: "R07.9",
        displayLabel: "Chest pain, unspecified",
        displayResolution: "EXACT_SOURCE_LABEL",
      }).primary
    ).toBe("Chest pain, unspecified");
  });
});

describe("EmergencyErOrdersPanel responsive wiring (19M.9)", () => {
  const source = readWebSource("src/features/emergency/EmergencyErOrdersPanel.tsx");
  const cardsSource = readWebSource("src/features/emergency/ErOrdersPanelCards.tsx");

  it("uses card layout on mobile/tablet without hard minWidth overflow", () => {
    expect(source).toContain("resolveDiagnosisOrdersLayoutMode");
    expect(source).toContain('data-testid="er-orders-panel-layout"');
    expect(source).toContain("usesOrderCards");
    expect(source).toContain("ErOrderLineCard");
    expect(source).toContain("ErOrderEventCard");
    expect(source).toContain("diagnosisOrdersTableStyle(layoutMode");
    expect(source).not.toMatch(/minWidth:\s*720/);
    expect(source).not.toMatch(/minWidth:\s*640/);
  });

  it("keeps critical order fields visible in card components", () => {
    expect(cardsSource).toContain("categoryLabel");
    expect(cardsSource).toContain("orderTitle");
    expect(cardsSource).toContain("statusSection");
    expect(cardsSource).toContain("timeStr");
    expect(cardsSource).toContain("issuedPrimary");
    expect(cardsSource).toContain("titleSection");
    expect(cardsSource).toContain("fieldLabels.status");
    expect(cardsSource).toContain("fieldLabels.time");
    expect(cardsSource).toContain("fieldLabels.issued");
    expect(cardsSource).toContain("fieldLabels.attribution");
  });

  it("keeps order action buttons touch-safe with aria labels preserved", () => {
    expect(source).toContain("erOrdersTouchButtonStyle");
    expect(source).toContain('aria-label={t("cancelOrderModal.cancelOrderLineAria")}');
    expect(source).toContain("runOrderItemLifecycleAction");
    expect(source).toContain("runInfusionAction");
    expect(cardsSource).toContain("diagnosisOrdersOrderCardShellStyle(layoutMode)");
    expect(cardsSource).toContain("diagnosisOrdersTouchButtonStyle");
  });

  it("preserves desktop dense table path at >=1200px", () => {
    expect(source).toContain("usesOrderCards ?");
    expect(source).toContain("diagnosisOrdersTableStyle(layoutMode, 720)");
    expect(source).toContain("diagnosisOrdersTableStyle(layoutMode, 640)");
    expect(source).toContain('data-layout-mode={layoutMode}');
  });
});

describe("19M.9 — prior phase regression anchors", () => {
  it("19M.8 cross-device rollup still present", () => {
    const src = readWebSource("src/lib/crossDeviceRegression19M8.test.ts");
    expect(src).toContain("Phase 19M.8");
    expect(src).toContain("resolveEdDispositionLayoutMode");
  });

  it("French diagnosis search/display tests still import shared helpers", () => {
    const display = readWebSource("src/components/diagnosis/icd10P3dOverlayRetirement.test.ts");
    const search = readWebSource("src/features/emergency/diagnosisFrenchSearchAliases.test.ts");
    expect(display).toContain("formatIcd10ServerResolvedOneLineDisplay");
    expect(search).toContain('from "./diagnosisFrenchSearchAliases"');
  });
});
