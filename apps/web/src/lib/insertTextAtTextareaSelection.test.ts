import { describe, expect, it } from "vitest";
import { insertTextAtTextareaSelection } from "./insertTextAtTextareaSelection";

describe("insertTextAtTextareaSelection", () => {
  it("inserts at end with paragraph gap when note already has text", () => {
    const r = insertTextAtTextareaSelection("Hello", 5, 5, "World");
    expect(r.value).toBe("Hello\n\nWorld");
    expect(r.caret).toBe(r.value.length);
  });

  it("inserts into empty note without leading newlines", () => {
    const r = insertTextAtTextareaSelection("", 0, 0, "First line");
    expect(r.value).toBe("First line");
    expect(r.caret).toBe("First line".length);
  });

  it("does not add extra newlines when caret after existing newline", () => {
    const r = insertTextAtTextareaSelection("A\n", 2, 2, "B");
    expect(r.value).toBe("A\nB");
  });

  it("replacement mode does not inject paragraph gaps", () => {
    const r = insertTextAtTextareaSelection("aaXXbb", 2, 4, "YY");
    expect(r.value).toBe("aaYYbb");
    expect(r.caret).toBe(4);
  });

  it("trims insert and ignores carriage returns", () => {
    const r = insertTextAtTextareaSelection("", 0, 0, "  \r\nHi\r\n  ");
    expect(r.value).toBe("Hi");
  });

  it("respects maxLength", () => {
    const r = insertTextAtTextareaSelection("ab", 1, 1, "XXXX", { maxLength: 4 });
    expect(r.value).toBe("a\n\nX");
    expect(r.caret).toBe(4);
  });
});
