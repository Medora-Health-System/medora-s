/**
 * INP.PROV.1B — SOAP encoding for progress-note `text` (zero-migration round trip).
 */

import { describe, expect, it } from "vitest";
import {
  appendDictationToSection,
  countProgressSoapCharacters,
  emptyProgressSoapSections,
  parseProgressNoteSoapText,
  PROGRESS_SOAP_SECTION_KEYS,
  serializeProgressNoteSoapText,
} from "./providerProgressNoteSoapInpProv1b";

describe("INP.PROV.1B progress note SOAP sections", () => {
  it("exposes the four SOAP keys and an empty template", () => {
    expect(PROGRESS_SOAP_SECTION_KEYS).toEqual([
      "SUBJECTIVE",
      "OBJECTIVE",
      "ASSESSMENT",
      "PLAN",
    ]);
    expect(emptyProgressSoapSections()).toEqual({
      SUBJECTIVE: "",
      OBJECTIVE: "",
      ASSESSMENT: "",
      PLAN: "",
    });
  });

  it("parses empty / nullish text to empty sections", () => {
    for (const value of [null, undefined, "", "   \n  "]) {
      expect(parseProgressNoteSoapText(value)).toEqual(emptyProgressSoapSections());
    }
  });

  it("keeps legacy free-text notes readable by putting them in Subjective", () => {
    const legacy = "Patient seen at bedside. No new complaints.";
    const parsed = parseProgressNoteSoapText(legacy);
    expect(parsed.SUBJECTIVE).toBe(legacy);
    expect(parsed.OBJECTIVE).toBe("");
    expect(parsed.ASSESSMENT).toBe("");
    expect(parsed.PLAN).toBe("");
  });

  it("serializes the four headers even when sections are empty", () => {
    const text = serializeProgressNoteSoapText(emptyProgressSoapSections());
    expect(text).toContain("## Subjective");
    expect(text).toContain("## Objective");
    expect(text).toContain("## Assessment");
    expect(text).toContain("## Plan");
  });

  it("round-trips authored section content", () => {
    const sections = {
      SUBJECTIVE: "Reports improved pain.",
      OBJECTIVE: "Afebrile.\nLungs clear.",
      ASSESSMENT: "Improving.",
      PLAN: "Continue current management.",
    };
    expect(parseProgressNoteSoapText(serializeProgressNoteSoapText(sections))).toEqual(sections);
  });

  it("parses headers case-insensitively and across CRLF line endings", () => {
    const raw = "## subjective\r\nline A\r\n\r\n## PLAN\r\nline B\r\n";
    const parsed = parseProgressNoteSoapText(raw);
    expect(parsed.SUBJECTIVE).toBe("line A");
    expect(parsed.PLAN).toBe("line B");
    expect(parsed.OBJECTIVE).toBe("");
  });

  it("counts characters across all sections", () => {
    expect(countProgressSoapCharacters(emptyProgressSoapSections())).toBe(0);
    expect(
      countProgressSoapCharacters({
        SUBJECTIVE: "abc",
        OBJECTIVE: "de",
        ASSESSMENT: "",
        PLAN: "f",
      })
    ).toBe(6);
  });

  it("appends dictation without ever overwriting authored text", () => {
    expect(appendDictationToSection("", "New sentence.")).toBe("New sentence.");
    expect(appendDictationToSection("Existing.", "Added.")).toBe("Existing. Added.");
    expect(appendDictationToSection("Existing. ", "Added.")).toBe("Existing. Added.");
    expect(appendDictationToSection("Existing.", "   ")).toBe("Existing.");
    expect(appendDictationToSection("Existing.", "")).toBe("Existing.");
  });

  it("keeps prior content as a prefix of the appended result", () => {
    const before = "Line one.";
    const after = appendDictationToSection(before, "Line two.");
    expect(after.startsWith(before)).toBe(true);
    expect(after).toContain("Line two.");
  });
});
