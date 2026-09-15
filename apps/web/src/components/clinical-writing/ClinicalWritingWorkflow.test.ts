import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const guardSource = fs.readFileSync(path.join(__dirname, "ClinicalWritingGuard.tsx"), "utf8");

describe("ClinicalWritingGuard workflow integration", () => {
  it("keeps explicit acceptance and controlled textarea input semantics", () => {
    expect(guardSource).toContain('dispatchEvent(new Event("input", { bubbles: true }))');
    expect(guardSource).toContain('onClick={acceptSuggestion}');
  });

  it("allows keyboard focus to move from the note to its suggestion without losing ownership", () => {
    expect(guardSource).toContain("suggestionButtonRef.current === focused");
    expect(guardSource).toContain("document.activeElement === suggestionButtonRef.current");
  });

  it("dismisses a suggestion with Escape and on unrelated focus changes", () => {
    expect(guardSource).toContain('event.key === "Escape"');
    expect(guardSource).toContain("current.element === focused || suggestionButtonRef.current === focused");
  });

  it("keeps suggestions discoverable to assistive technology", () => {
    expect(guardSource).toContain('aria-label={label}');
    expect(guardSource).toContain('data-medora-clinical-suggestion="true"');
  });
});
