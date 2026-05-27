import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  emptyProviderDocumentationWorkspaceState,
} from "./providerDocumentationModel";
import { providerDocumentationStateSignature } from "./providerDocumentationDraftStorage";
import { shouldAutosaveProviderDocumentation } from "./providerDocumentationAutosave";

const WORKSPACE_SOURCE = readFileSync(
  new URL("../components/encounters/ProviderDocumentationWorkspace.tsx", import.meta.url),
  "utf8"
);

const EN_MESSAGES = readFileSync(new URL("../i18n/messages/en.ts", import.meta.url), "utf8");

function stickyHeaderSource(): string {
  const start = WORKSPACE_SOURCE.indexOf('data-testid="provider-documentation-sticky-header"');
  const end = WORKSPACE_SOURCE.indexOf('data-testid="provider-documentation-workspace-layout"');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return WORKSPACE_SOURCE.slice(start, end);
}

describe("providerDocumentationHeaderUx (19R.1)", () => {
  it("does not render visible autosave status in the sticky header", () => {
    const header = stickyHeaderSource();
    expect(header).not.toContain("autosaveStatusLabelKey");
    expect(header).not.toContain("autosaveIdle");
    expect(header).not.toContain("autosaveSaved");
  });

  it("does not render visible dictation labels in the sticky header", () => {
    const header = stickyHeaderSource();
    expect(header).not.toContain("dictationReady");
    expect(header).not.toContain("dictationActiveSection");
    expect(header).not.toContain("dictationInstruction");
    expect(header).not.toContain("dictationDragonHelp");
  });

  it("uses shortened navigation button labels", () => {
    expect(EN_MESSAGES).toContain('dictationPreviousSection: "Previous"');
    expect(EN_MESSAGES).toContain('dictationNextSection: "Next"');
    expect(EN_MESSAGES).toContain('dictationFocusHpi: "HPI"');
    expect(EN_MESSAGES).toContain('dictationFocusRos: "ROS"');
    expect(EN_MESSAGES).toContain('dictationFocusExam: "Physical Exam"');
    expect(EN_MESSAGES).toContain('dictationFocusMdm: "MDM"');
    expect(EN_MESSAGES).toContain('dictationFocusImpression: "Impression"');
    expect(EN_MESSAGES).toContain('dictationFocusPlan: "Plan"');
  });

  it("still renders save and sign buttons in the sticky header", () => {
    const header = stickyHeaderSource();
    expect(header).toContain('data-testid="provider-documentation-save-button"');
    expect(header).toContain('data-testid="provider-documentation-sign-button"');
    expect(header).toContain("providerDocumentationWorkspace.save");
    expect(header).toContain("providerDocumentationWorkspace.signFinalize");
  });

  it("preserves focus navigation behavior for section jumps", () => {
    expect(WORKSPACE_SOURCE).toContain('data-testid="provider-documentation-header-nav"');
    expect(WORKSPACE_SOURCE).toContain("focusDictationSection");
    expect(WORKSPACE_SOURCE).toContain("focusRelativeDictationTarget");
    expect(WORKSPACE_SOURCE).toContain("scrollIntoView");
    expect(WORKSPACE_SOURCE).toContain("setExpandedSections");
  });

  it("preserves autosave behavior while hiding sticky autosave labels", () => {
    expect(WORKSPACE_SOURCE).toContain("AUTOSAVE_DEBOUNCE_MS");
    expect(WORKSPACE_SOURCE).toContain("shouldAutosaveProviderDocumentation");
    expect(WORKSPACE_SOURCE).toContain("setAutosaveStatus");
    expect(WORKSPACE_SOURCE).toContain("autosaveStatusLabelKey");

    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "Draft text";
    const signature = providerDocumentationStateSignature(state);
    expect(
      shouldAutosaveProviderDocumentation({
        currentSignature: `${signature}-changed`,
        lastSavedSignature: signature,
        hasContent: true,
      })
    ).toBe(true);
  });

  it("keeps dictation affordances on fields without sticky dictation banner", () => {
    expect(WORKSPACE_SOURCE).toContain("voiceReadyField");
    expect(WORKSPACE_SOURCE).toContain("focusDictationField");
    expect(WORKSPACE_SOURCE).toContain("MicrophoneGlyph");
  });
});
