import { readFileSync } from "node:fs";
import { join } from "node:path";

function extractArrayEntries(source: string, key: "providers" | "exports"): string[] {
  const re = new RegExp(`${key}:\\s*\\[([\\s\\S]*?)\\],`, "m");
  const match = source.match(re);
  if (!match) return [];
  return [...match[1].matchAll(/^\s*([A-Za-z][A-Za-z0-9]*),?\s*$/gm)].map((m) => m[1]);
}

describe("MedicationMasterModule providers (19I hotfix)", () => {
  const moduleSource = readFileSync(join(__dirname, "medication-master.module.ts"), "utf8");

  it("registers each provider and export token once", () => {
    for (const key of ["providers", "exports"] as const) {
      const entries = extractArrayEntries(moduleSource, key);
      const seen = new Set<string>();
      for (const entry of entries) {
        expect(seen.has(entry)).toBe(false);
        seen.add(entry);
      }
      expect(entries).toContain("MedicationGlobalBaselineService");
      expect(entries).toContain("MedicationGlobalBaselineAutoApproveService");
      expect(entries).toContain("CatalogCanonicalReadService");
    }
  });
});
