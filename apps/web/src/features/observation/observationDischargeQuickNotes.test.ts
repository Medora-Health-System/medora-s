import { describe, expect, it } from "vitest";
import { appendQuickNoteToField } from "./observationDischargeQuickNotes";

describe("appendQuickNoteToField", () => {
  it("returns snippet when current empty", () => {
    expect(appendQuickNoteToField("", "  Hello  ")).toBe("Hello");
  });

  it("appends with newline when current has text", () => {
    expect(appendQuickNoteToField("Line A", "Line B")).toBe("Line A\nLine B");
  });

  it("trims trailing whitespace on current before append", () => {
    expect(appendQuickNoteToField("A  \n", "B")).toBe("A\nB");
  });

  it("ignores empty snippet", () => {
    expect(appendQuickNoteToField("A", "   ")).toBe("A");
  });
});
