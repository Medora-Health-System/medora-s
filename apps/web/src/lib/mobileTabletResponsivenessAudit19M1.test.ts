/**
 * Phase 19M.1 — lightweight responsive audit anchors (source-level, no DOM/Playwright).
 * Documents established patterns and known gaps until 19M.2–19M.8 fix phases land.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const webRoot = join(import.meta.dirname, "../..");

function readWebSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("19M.1 mobile/tablet responsiveness audit anchors", () => {
  it("audit document exists", () => {
    const doc = readFileSync(join(webRoot, "../../docs/ui/mobile-tablet-responsiveness-audit-19M1.md"), "utf8");
    expect(doc).toContain("Phase 19M.1");
    expect(doc).toContain("19M.2");
  });

  it("disposition panel implements wideLayout breakpoint (good pattern)", () => {
    const src = readWebSource("src/features/emergency/EmergencyDispositionPanel.tsx");
    expect(src).toContain('matchMedia("(min-width: 960px)")');
    expect(src).toContain("wideLayout");
  });

  it("triage and nursing reassessment panels implement wideLayout breakpoint", () => {
    for (const file of [
      "src/features/emergency/EmergencyTriagePanel.tsx",
      "src/features/emergency/EmergencyNursingReassessmentPanel.tsx",
    ]) {
      const src = readWebSource(file);
      expect(src, file).toContain('matchMedia("(min-width: 960px)")');
    }
  });

  it("lab and radiology worklists include MedoraCardActionsMediaStyle", () => {
    expect(readWebSource("app/app/lab-worklist/page.tsx")).toContain("MedoraCardActionsMediaStyle");
    expect(readWebSource("app/app/rad-worklist/page.tsx")).toContain("MedoraCardActionsMediaStyle");
  });

  it("AppShell mobile drawer resolves C1 shell blocker (19M.2)", () => {
    const src = readWebSource("src/components/app-shell/AppShell.tsx");
    expect(src).toContain('data-testid="app-shell-mobile-menu-button"');
    expect(src).toContain("APP_SHELL_DESKTOP_NAV_MEDIA");
  });

  it("ProviderDocumentationWorkspace implements responsive layout (19M.5)", () => {
    const src = readWebSource("src/components/encounters/ProviderDocumentationWorkspace.tsx");
    expect(src).toContain("resolveProviderDocumentationLayoutMode");
    expect(src).toContain('data-testid="provider-documentation-workspace-layout"');
    expect(src).toContain('data-testid="provider-documentation-summary-stacked"');
    expect(src).not.toMatch(
      /display: "grid", gridTemplateColumns: "minmax\(0, 1fr\) minmax\(260px, 320px\)"/
    );
  });

  it("documents pharmacy worklist gap: wide table without overflow wrapper (update in 19M.7)", () => {
    const src = readWebSource("app/app/pharmacy-worklist/page.tsx");
    expect(src).toContain("<table");
    expect(src).not.toContain("overflowX");
    expect(src).not.toContain("overflow-x-auto");
  });

  it("documents active workspace gap: 10-column dashboard grid (update in 19M.4)", () => {
    const src = readWebSource("src/features/emergency/EmergencyActiveWorkspaceView.tsx");
    expect(src).toContain('gridTemplateColumns: "repeat(10, minmax(0, 1fr))"');
  });
});
