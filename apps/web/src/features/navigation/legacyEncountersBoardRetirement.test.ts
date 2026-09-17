import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SIDEBAR_NAV_ITEMS } from "@/components/app-shell/sidebarNavConfig";

const webRoot = join(__dirname, "../..");
const appRoot = join(webRoot, "../app/app");

function read(path: string): string {
  return readFileSync(join(webRoot, path), "utf8");
}

describe("legacy Encounters board retirement", () => {
  it("removes only the duplicate list board from navigation", () => {
    expect(SIDEBAR_NAV_ITEMS.some((item) => item.href === "/app/encounters")).toBe(false);
    const icons = read("components/app-shell/SidebarNavIcons.tsx");
    expect(icons).not.toContain('"/app/encounters":"1f4c4.svg"');
  });

  it("keeps an old-list compatibility redirect into the canonical Medora workspace", () => {
    const listPage = readFileSync(join(appRoot, "encounters/page.tsx"), "utf8");
    expect(listPage).toContain('redirect("/app")');
    expect(listPage).not.toContain("fetchOpenEncounters");
    expect(listPage).not.toContain("EncountersLegacyOpenList");
    expect(existsSync(join(appRoot, "encounters/EncountersLegacyOpenList.tsx"))).toBe(false);
  });

  it("preserves the authoritative encounter chart and clinical engines", () => {
    expect(existsSync(join(appRoot, "encounters/[id]/page.tsx"))).toBe(true);
    expect(existsSync(join(appRoot, "encounters/[id]/layout.tsx"))).toBe(true);
    const detail = readFileSync(join(appRoot, "encounters/[id]/page.tsx"), "utf8");
    expect(detail).toContain("encounterId");
    expect(detail).toContain("/app/encounters/");
  });
});
