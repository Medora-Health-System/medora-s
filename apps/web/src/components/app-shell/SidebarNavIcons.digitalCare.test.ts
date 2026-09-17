import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const iconsPath = join(__dirname, "SidebarNavIcons.tsx");
const twemojiDir = join(__dirname, "../../../public/twemoji");

describe("Digital Care sidebar icon", () => {
  it("renders a local SVG for Digital Care and never a missing twemoji asset", () => {
    const src = readFileSync(iconsPath, "utf8");
    expect(src).toContain('href==="/app/digital-care"');
    expect(src).toContain('testId="sidebar-icon-digital-care"');
    expect(src).toContain("function IconDigitalCare");
    expect(src).not.toContain("1f4f1.svg");
    expect(src).not.toMatch(/["']\/app\/digital-care["']\s*:\s*["'][^"']+\.svg["']/);

    const twemojiFiles = readdirSync(twemojiDir);
    expect(twemojiFiles).not.toContain("1f4f1.svg");
    expect(existsSync(join(twemojiDir, "1f4f1.svg"))).toBe(false);

    const mapped = [...src.matchAll(/"\/app\/[^"]+":"([^"]+\.svg)"/g)].map((match) => match[1]);
    for (const file of mapped) {
      expect(existsSync(join(twemojiDir, file)), `missing twemoji ${file}`).toBe(true);
    }
  });
});
