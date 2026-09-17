import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(process.cwd());
const read = (path: string) => readFileSync(join(webRoot, path), "utf8");

describe("legacy Provider board retirement", () => {
  it("removes the old Provider board from the authenticated sidebar", () => {
    const nav = read("src/components/app-shell/sidebarNavConfig.ts");
    expect(nav).not.toContain('{href:"/app/provider",labelKey:"nav.provider"');
  });

  it("keeps the legacy URL only as a compatibility redirect into canonical Medora routing", () => {
    const page = read("app/app/provider/page.tsx");
    expect(page).toContain('redirect("/app")');
    expect(page).not.toContain("fetchOpenEncounters");
    expect(page).not.toContain("ProcedureWorkQueuePanel");
    expect(page).not.toContain("clinicalDashboard.providerTitle");
  });

  it("does not remove the separate medication recommendation feature", () => {
    const recommendations = read("app/app/provider/medication-recommendations/page.tsx");
    expect(recommendations).toContain("MedicationRecommendation");
  });
});
