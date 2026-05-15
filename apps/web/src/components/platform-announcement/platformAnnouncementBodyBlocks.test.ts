import { describe, expect, it } from "vitest";
import {
  SECTION_HEADER_MAX_LENGTH,
  getBulletLineContent,
  parsePlatformAnnouncementBody,
} from "./platformAnnouncementBodyBlocks";

describe("getBulletLineContent", () => {
  it("detects • prefix after leading spaces", () => {
    expect(getBulletLineContent("  • First item")).toBe("First item");
  });

  it("detects - prefix", () => {
    expect(getBulletLineContent("- Fix bug")).toBe("Fix bug");
  });

  it("detects * prefix", () => {
    expect(getBulletLineContent("* Note")).toBe("Note");
  });

  it("returns null for normal text", () => {
    expect(getBulletLineContent("Not a bullet")).toBeNull();
    expect(getBulletLineContent("-no space")).toBeNull();
  });
});

describe("parsePlatformAnnouncementBody", () => {
  it("returns empty array for whitespace-only body", () => {
    expect(parsePlatformAnnouncementBody("")).toEqual([]);
    expect(parsePlatformAnnouncementBody("  \n  \t  ")).toEqual([]);
  });

  it("maps empty lines to spacers", () => {
    const blocks = parsePlatformAnnouncementBody("A\n\nB");
    expect(blocks).toEqual([
      { type: "paragraph", lines: ["A"] },
      { type: "spacer" },
      { type: "paragraph", lines: ["B"] },
    ]);
  });

  it("groups consecutive bullets into one list", () => {
    const blocks = parsePlatformAnnouncementBody("- one\n- two\n• three");
    expect(blocks).toEqual([{ type: "bulletList", items: ["one", "two", "three"] }]);
  });

  it("treats a single short line before bullets as header (no blank between)", () => {
    const blocks = parsePlatformAnnouncementBody("What changed\n- a\n- b");
    expect(blocks).toEqual([
      { type: "header", text: "What changed" },
      { type: "bulletList", items: ["a", "b"] },
    ]);
  });

  it("treats short line before bullets as header when separated by empty lines", () => {
    const blocks = parsePlatformAnnouncementBody("Notes\n\n\n- x");
    expect(blocks).toEqual([
      { type: "header", text: "Notes" },
      { type: "spacer" },
      { type: "spacer" },
      { type: "bulletList", items: ["x"] },
    ]);
  });

  it("does not treat a long line before bullets as header", () => {
    const long = "x".repeat(SECTION_HEADER_MAX_LENGTH + 1);
    const blocks = parsePlatformAnnouncementBody(`${long}\n- item`);
    expect(blocks[0]).toEqual({ type: "paragraph", lines: [long] });
    expect(blocks[1]).toEqual({ type: "bulletList", items: ["item"] });
  });

  it("does not treat multiple lines before bullets as header", () => {
    const blocks = parsePlatformAnnouncementBody("Line one\nLine two\n- a");
    expect(blocks).toEqual([
      { type: "paragraph", lines: ["Line one", "Line two"] },
      { type: "bulletList", items: ["a"] },
    ]);
  });

  it("preserves paragraph lines and script-like text as plain content", () => {
    const malicious = "<img src=x onerror=alert(1)>";
    const blocks = parsePlatformAnnouncementBody(`Intro\n\n${malicious}`);
    expect(blocks[0]).toEqual({ type: "paragraph", lines: ["Intro"] });
    expect(blocks[2]).toEqual({ type: "paragraph", lines: [malicious] });
  });
});
