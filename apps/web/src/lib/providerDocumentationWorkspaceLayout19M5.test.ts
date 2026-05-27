/**
 * Phase 19M.5 — provider documentation responsive layout (source-level).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PROVIDER_DOCUMENTATION_DESKTOP_SPLIT_MEDIA,
  PROVIDER_DOCUMENTATION_TABLET_SPLIT_MEDIA,
  PROVIDER_DOCUMENTATION_TOUCH_TARGET_MIN_PX,
  providerDocumentationStickyHeaderStyle,
  providerDocumentationSummaryAsideStyle,
  providerDocumentationWorkspaceLayoutStyle,
  resolveProviderDocumentationLayoutMode,
} from "./providerDocumentationWorkspaceLayout";

const webRoot = join(import.meta.dirname, "../..");

function readWebSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("providerDocumentationWorkspaceLayout (19M.5)", () => {
  it("resolves layout mode by viewport width", () => {
    expect(resolveProviderDocumentationLayoutMode(390)).toBe("stacked");
    expect(resolveProviderDocumentationLayoutMode(1023)).toBe("stacked");
    expect(resolveProviderDocumentationLayoutMode(1024)).toBe("tabletSplit");
    expect(resolveProviderDocumentationLayoutMode(1279)).toBe("tabletSplit");
    expect(resolveProviderDocumentationLayoutMode(1280)).toBe("desktopSplit");
    expect(resolveProviderDocumentationLayoutMode(1920)).toBe("desktopSplit");
  });

  it("preserves desktop two-column grid at >=1280px", () => {
    const style = providerDocumentationWorkspaceLayoutStyle("desktopSplit");
    expect(style.display).toBe("grid");
    expect(style.gridTemplateColumns).toBe("minmax(0, 1fr) minmax(260px, 320px)");
  });

  it("uses narrower side panel on tablet landscape", () => {
    const style = providerDocumentationWorkspaceLayoutStyle("tabletSplit");
    expect(style.display).toBe("grid");
    expect(style.gridTemplateColumns).toBe("minmax(0, 1fr) minmax(220px, 260px)");
  });

  it("stacks vertically on mobile/tablet portrait", () => {
    const style = providerDocumentationWorkspaceLayoutStyle("stacked");
    expect(style.display).toBe("flex");
    expect(style.flexDirection).toBe("column");
    expect(style.width).toBe("100%");
    expect(style.minWidth).toBe(0);
  });

  it("removes sticky summary aside on stacked layout", () => {
    const stacked = providerDocumentationSummaryAsideStyle("stacked");
    expect(stacked.position).toBeUndefined();
    expect(stacked.width).toBe("100%");

    const desktop = providerDocumentationSummaryAsideStyle("desktopSplit");
    expect(desktop.position).toBe("sticky");
    expect(desktop.overflowY).toBe("auto");
  });

  it("uses non-sticky action header on stacked layout", () => {
    expect(providerDocumentationStickyHeaderStyle("stacked").position).toBe("relative");
    expect(providerDocumentationStickyHeaderStyle("desktopSplit").position).toBe("sticky");
  });

  it("defines touch-friendly minimum target size", () => {
    expect(PROVIDER_DOCUMENTATION_TOUCH_TARGET_MIN_PX).toBeGreaterThanOrEqual(44);
  });

  it("exports breakpoint media queries for workspace hook", () => {
    expect(PROVIDER_DOCUMENTATION_DESKTOP_SPLIT_MEDIA).toBe("(min-width: 1280px)");
    expect(PROVIDER_DOCUMENTATION_TABLET_SPLIT_MEDIA).toBe("(min-width: 1024px)");
  });
});

describe("ProviderDocumentationWorkspace responsive wiring (19M.5)", () => {
  const workspaceSource = readWebSource("src/components/encounters/ProviderDocumentationWorkspace.tsx");
  const mdmSource = readWebSource("src/components/encounters/ProviderDocumentationTemplateDropdown.tsx");

  it("uses layout mode hook instead of fixed two-column grid", () => {
    expect(workspaceSource).toContain("resolveProviderDocumentationLayoutMode");
    expect(workspaceSource).toContain("providerDocumentationWorkspaceLayoutStyle");
    expect(workspaceSource).toContain('data-testid="provider-documentation-workspace-layout"');
    expect(workspaceSource).toContain('data-layout-mode={layoutMode}');
    expect(workspaceSource).not.toMatch(
      /display: "grid", gridTemplateColumns: "minmax\(0, 1fr\) minmax\(260px, 320px\)"/
    );
  });

  it("stacks summary panel below editor on mobile with collapsible panel", () => {
    expect(workspaceSource).toContain('data-testid="provider-documentation-summary-stacked"');
    expect(workspaceSource).toContain("providerDocumentationWorkspace.mobileSummaryPanel");
    expect(workspaceSource).toContain('data-testid="provider-documentation-summary-aside"');
  });

  it("does not introduce horizontal overflow helpers on workspace root", () => {
    expect(workspaceSource).not.toContain("overflowX: \"scroll\"");
    expect(workspaceSource).not.toContain("minWidth: 320");
  });

  it("uses touch-friendly header buttons on stacked layout", () => {
    expect(workspaceSource).toContain("providerDocumentationTouchFriendlyButtonStyle");
    expect(workspaceSource).toContain("layoutMode === \"stacked\"");
  });

  it("preserves MDM multi-select apply/cancel workflow", () => {
    expect(mdmSource).toContain("provider-documentation-mdm-apply-selected");
    expect(mdmSource).toContain("provider-documentation-mdm-cancel-selection");
    expect(mdmSource).toContain("aria-multiselectable");
    expect(mdmSource).toContain("applyMdmTemplatePendingSelections");
  });

  it("improves MDM mobile scroll and touch targets", () => {
    expect(mdmSource).toContain("50vh");
    expect(mdmSource).toContain("PROVIDER_DOCUMENTATION_TOUCH_TARGET_MIN_PX");
  });

  it("preserves autosave and save behavior wiring", () => {
    expect(workspaceSource).toContain("shouldAutosaveProviderDocumentation");
    expect(workspaceSource).toContain("runManualSave");
    expect(workspaceSource).toContain('data-testid="provider-documentation-save-button"');
    expect(workspaceSource).not.toMatch(/SpeechRecognition|webkitSpeechRecognition|getUserMedia/i);
  });

  it("preserves dictation focus affordances without engine changes", () => {
    expect(workspaceSource).toContain("focusDictationField");
    expect(workspaceSource).toContain("MicrophoneGlyph");
    expect(workspaceSource).toContain("dictationNextSection");
  });
});
