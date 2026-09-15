import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { clinicalWritingLanguageTag } from "./ClinicalWritingGuard";

const webRoot = join(import.meta.dirname, "../../..");
const guardSource = readFileSync(
  join(webRoot, "src/components/clinical-writing/ClinicalWritingGuard.tsx"),
  "utf8"
);
const providerSource = readFileSync(join(webRoot, "src/i18n/provider.tsx"), "utf8");

describe("language-aware clinical writing corrector", () => {
  it("uses the product locale BCP-47 language for English, French and Spanish", () => {
    expect(clinicalWritingLanguageTag("en")).toMatch(/^en(?:-|$)/i);
    expect(clinicalWritingLanguageTag("fr")).toMatch(/^fr(?:-|$)/i);
    expect(clinicalWritingLanguageTag("es")).toMatch(/^es(?:-|$)/i);
  });

  it("is mounted once at the product i18n root so triage and medical documentation inherit it", () => {
    expect(providerSource).toContain('import { ClinicalWritingGuard }');
    expect(providerSource).toContain("<ClinicalWritingGuard language={language} />");
  });

  it("enables suggestion-only spelling and never silently rewrites clinical text", () => {
    expect(guardSource).toContain('setAttribute("spellcheck", "true")');
    expect(guardSource).toContain('setAttribute("autocorrect", "off")');
    expect(guardSource).not.toContain("fetch(");
    expect(guardSource).not.toContain("apiFetch(");
  });

  it("covers dynamically mounted textareas/text inputs/contenteditable while excluding non-prose controls", () => {
    expect(guardSource).toContain("MutationObserver");
    expect(guardSource).toContain('querySelectorAll("textarea, input, [contenteditable=\'true\']")');
    expect(guardSource).toContain('new Set(["", "text"])');
    expect(guardSource).toContain("data-medora-writing-corrector-off");
  });
});
