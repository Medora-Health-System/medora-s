/**
 * Phase 19M.6 — ED disposition/discharge responsive layout (source-level).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ED_DISPOSITION_DESKTOP_SPLIT_MEDIA,
  ED_DISPOSITION_TOUCH_TARGET_MIN_PX,
  edDispositionDiagnosisCardShellStyle,
  edDispositionFieldGridStyle,
  edDispositionFollowUpRowGridStyle,
  edDispositionPreviewAsideStyle,
  edDispositionTouchButtonStyle,
  edDispositionUsesSplitLayout,
  edDispositionWorkspaceStyle,
  resolveEdDispositionLayoutMode,
} from "../features/emergency/edDispositionResponsiveLayout";

const webRoot = join(import.meta.dirname, "../..");

function readWebSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("edDispositionResponsiveLayout (19M.6)", () => {
  it("resolves layout mode by viewport width", () => {
    expect(resolveEdDispositionLayoutMode(390)).toBe("mobileStacked");
    expect(resolveEdDispositionLayoutMode(767)).toBe("mobileStacked");
    expect(resolveEdDispositionLayoutMode(768)).toBe("tabletStacked");
    expect(resolveEdDispositionLayoutMode(1023)).toBe("tabletStacked");
    expect(resolveEdDispositionLayoutMode(1024)).toBe("desktopSplit");
  });

  it("preserves a single-column clinical workspace (no sticky preview column)", () => {
    expect(edDispositionUsesSplitLayout("desktopSplit")).toBe(true);
    const style = edDispositionWorkspaceStyle("desktopSplit");
    expect(style.display).toBe("flex");
    expect(style.flexDirection).toBe("column");
    expect(style.width).toBe("100%");
    expect(style.maxWidth).toBe("100%");
    expect(style.minWidth).toBe(0);
    expect(style.gridTemplateColumns).toBeUndefined();
  });

  it("stacks workspace on mobile and tablet", () => {
    for (const mode of ["mobileStacked", "tabletStacked", "desktopSplit"] as const) {
      const style = edDispositionWorkspaceStyle(mode);
      expect(style.display).toBe("flex");
      expect(style.flexDirection).toBe("column");
      expect(style.width).toBe("100%");
      expect(style.minWidth).toBe(0);
    }
  });

  it("uses sticky preview aside only on desktop split", () => {
    const desktop = edDispositionPreviewAsideStyle("desktopSplit");
    expect(desktop.position).toBe("sticky");
    expect(desktop.overflowY).toBe("auto");

    const mobile = edDispositionPreviewAsideStyle("mobileStacked");
    expect(mobile.position).toBeUndefined();
    expect(mobile.width).toBe("100%");
  });

  it("stacks follow-up rows on mobile/tablet and wraps on desktop", () => {
    expect(edDispositionFollowUpRowGridStyle("mobileStacked").gridTemplateColumns).toBe("1fr");
    expect(edDispositionFollowUpRowGridStyle("tabletStacked").gridTemplateColumns).toBe("1fr");
    expect(edDispositionFollowUpRowGridStyle("desktopSplit").gridTemplateColumns).toContain("auto-fill");
  });

  it("keeps diagnosis cards full width without fixed min-width overflow", () => {
    const shell = edDispositionDiagnosisCardShellStyle();
    expect(shell.width).toBe("100%");
    expect(shell.minWidth).toBe(0);
    expect(shell.boxSizing).toBe("border-box");
  });

  it("stacks nursing/closure field grids on mobile", () => {
    expect(edDispositionFieldGridStyle("mobileStacked").gridTemplateColumns).toBe("1fr");
    expect(edDispositionFieldGridStyle("desktopSplit").gridTemplateColumns).toContain("220px");
  });

  it("defines touch-friendly minimum target size", () => {
    expect(ED_DISPOSITION_TOUCH_TARGET_MIN_PX).toBeGreaterThanOrEqual(44);
    const touched = edDispositionTouchButtonStyle({ padding: "4px 8px" }, "mobileStacked");
    expect(touched.minHeight).toBeGreaterThanOrEqual(44);
    const desktop = edDispositionTouchButtonStyle({ padding: "4px 8px" }, "desktopSplit");
    expect(desktop.minHeight).toBeUndefined();
  });

  it("exports desktop split media query breakpoint", () => {
    expect(ED_DISPOSITION_DESKTOP_SPLIT_MEDIA).toBe("(min-width: 1024px)");
  });
});

describe("EmergencyDispositionPanel responsive wiring (19M.6)", () => {
  const dispositionSource = readWebSource("src/features/emergency/EmergencyDispositionPanel.tsx");
  const previewSource = readWebSource("src/features/emergency/EdDispositionPreviewPanel.tsx");
  const providerSource = readWebSource("src/features/emergency/ProviderDischargeDocumentationSection.tsx");
  const nursingSource = readWebSource("src/features/emergency/NursingDischargeExecutionSection.tsx");
  const closureSource = readWebSource("src/features/emergency/EmergencyErSummaryClosureSurface.tsx");
  const closureCardSource = readWebSource("src/features/emergency/PatientDischargeInstructionsClosureCard.tsx");

  it("uses layout mode hook instead of legacy wideLayout breakpoint", () => {
    expect(dispositionSource).toContain("resolveEdDispositionLayoutMode");
    expect(dispositionSource).toContain("edDispositionWorkspaceStyle");
    expect(dispositionSource).toContain('data-testid="ed-disposition-workspace-layout"');
    expect(dispositionSource).toContain('data-layout-mode={layoutMode}');
    expect(dispositionSource).not.toContain("wideLayout");
    expect(dispositionSource).not.toContain('matchMedia("(min-width: 960px)")');
  });

  it("uses compact wrapping board chrome instead of a sticky preview column", () => {
    expect(dispositionSource).toContain("ed-disposition-outcome-group");
    expect(dispositionSource).toContain("ed-disposition-readiness");
    expect(dispositionSource).toContain("ED_DISPOSITION_RESPONSIVE_CSS");
    expect(dispositionSource).not.toContain("EdDispositionPreviewPanel");
    expect(previewSource).toContain('data-testid="ed-disposition-preview-collapsible"');
    expect(previewSource).toContain('data-testid="ed-disposition-preview-stacked"');
    expect(previewSource).toContain('data-testid="ed-disposition-preview-aside"');
    expect(previewSource).toContain("aria-expanded={expanded}");
    expect(previewSource).toContain("aria-controls={panelId}");
  });

  it("keeps save buttons reachable with touch-friendly styling", () => {
    expect(dispositionSource).toContain("edDispositionTouchButtonStyle");
    expect(nursingSource).toContain("edDispositionTouchButtonStyle");
    expect(closureCardSource).toContain("edDispositionTouchButtonStyle");
    expect(closureSource).toContain("edDispositionTouchButtonStyle");
  });

  it("stacks nursing execution fields on mobile", () => {
    expect(nursingSource).toContain("resolveEdDispositionLayoutMode");
    expect(nursingSource).toContain('layoutMode === "mobileStacked" ? "stretch"');
    expect(nursingSource).toContain('width: "100%", minWidth: 0');
  });

  it("does not expose governance hashes in preview panel wiring", () => {
    expect(dispositionSource).not.toContain("templateAppliedHash");
    expect(dispositionSource).not.toContain("governanceSnapshot");
    expect(previewSource).not.toContain("templateAppliedHash");
    expect(previewSource).not.toContain("contentHash");
  });

  it("keeps shared return precautions bottom-only in provider section", () => {
    const returnBlock = providerSource.slice(
      providerSource.indexOf("  return (\n    <div style={edDispositionSectionShellStyle()}"),
      providerSource.indexOf("export function buildProviderDischargeJsonForSave")
    );
    const sharedRenderIdx = returnBlock.indexOf("<SharedDischargePlanningSection");
    const cardsRenderIdx = returnBlock.indexOf("{selectedCards.map");
    expect(sharedRenderIdx).toBeGreaterThan(cardsRenderIdx);
    const cardBlock = providerSource.slice(
      providerSource.indexOf("const DiagnosisDocumentationCard"),
      providerSource.indexOf("const SharedDischargePlanningSection")
    );
    expect(cardBlock).not.toContain("returnPrecautions");
    expect(providerSource).toContain("returnPrecautions={providerForm.returnPrecautions}");
  });

  it("wraps French diagnosis labels safely on cards", () => {
    expect(providerSource).toContain("wordBreak: \"break-word\"");
    expect(providerSource).toContain("edDispositionDiagnosisCardShellStyle");
    expect(providerSource).toContain("getLocalizedDiagnosisDisplayLabel");
  });

  it("preserves disposition save and provider documentation semantics", () => {
    expect(dispositionSource).toContain("buildProviderDischargeJsonForSave");
    expect(dispositionSource).toContain("validateProviderDischargeDocumentation");
    expect(providerSource).toContain("applyProviderDischargeTemplateToCardByDiagnosis");
    expect(providerSource).not.toContain("templateAppliedHash");
  });
});

describe("19M.6 regression — canonical disposition and template tests still present", () => {
  it("19Z canonical disposition test file exists", () => {
    expect(readWebSource("src/features/emergency/edDisposition19Z.test.ts")).toContain("19Z");
  });

  it("19Y discharge template test file exists", () => {
    expect(readWebSource("src/features/emergency/edDisposition19Y.test.ts")).toContain("19Y");
  });

  it("prior 19M responsive test anchors remain", () => {
    expect(readWebSource("src/lib/erTrackboardResponsiveLayout19M3.test.ts")).toContain("19M.3");
    expect(readWebSource("src/lib/emergencyChartResponsiveLayout19M4.test.ts")).toContain("19M.4");
    expect(readWebSource("src/lib/providerDocumentationWorkspaceLayout19M5.test.ts")).toContain("19M.5");
    expect(readWebSource("src/lib/mobileTabletResponsivenessAudit19M1.test.ts")).toContain("19M.1");
  });
});
