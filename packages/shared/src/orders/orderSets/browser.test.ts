import { describe, expect, it } from "vitest";
import {
  activeEnterpriseOrderSets,
  enterpriseOrderSetByCode,
} from "./registry.js";
import {
  buildEnterpriseOrderSetBrowserModel,
  filterEnterpriseOrderSetsForBrowser,
  getEnterpriseOrderSetCategoryLabel,
  getEnterpriseOrderSetCategorySortOrder,
  groupEnterpriseOrderSetsByCategory,
  resolveEnterpriseOrderSetBrowserCategory,
} from "./browser.js";
import { ENTERPRISE_ORDER_SET_CATEGORIES } from "./types.js";

describe("enterpriseOrderSetBrowser (MEDUI.ORDERSETS.ENTERPRISE_PHASE_5)", () => {
  it("groups active registry by category in stable sort order", () => {
    const groups = groupEnterpriseOrderSetsByCategory(activeEnterpriseOrderSets(), "en");
    expect(groups.length).toBeGreaterThan(0);
    for (let i = 1; i < groups.length; i += 1) {
      expect(getEnterpriseOrderSetCategorySortOrder(groups[i]!.category)).toBeGreaterThan(
        getEnterpriseOrderSetCategorySortOrder(groups[i - 1]!.category)
      );
    }
    const total = groups.reduce((sum, group) => sum + group.sets.length, 0);
    expect(total).toBe(activeEnterpriseOrderSets().length);
  });

  it("sorts sets alphabetically within each category", () => {
    const groups = groupEnterpriseOrderSetsByCategory(activeEnterpriseOrderSets(), "en");
    for (const group of groups) {
      const names = group.sets.map((set) => set.displayNameEn);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
    }
  });

  it("filters search across all categories when query is set", () => {
    const results = filterEnterpriseOrderSetsForBrowser({ query: "sepsis", locale: "en" });
    expect(results.some((set) => set.code === "ed_sepsis_v1")).toBe(true);
    const model = buildEnterpriseOrderSetBrowserModel({
      query: "sepsis",
      activeCategory: null,
      locale: "en",
    });
    expect(model.mode).toBe("search");
    expect(model.searchResults.length).toBeGreaterThan(0);
    expect(model.groups).toEqual([]);
  });

  it("browse mode exposes sets only for active category", () => {
    const model = buildEnterpriseOrderSetBrowserModel({
      query: "",
      activeCategory: "NEURO",
      locale: "en",
    });
    expect(model.mode).toBe("browse");
    expect(model.activeCategory).toBe("NEURO");
    expect(model.categorySets.every((set) => set.category === "NEURO")).toBe(true);
    expect(model.categorySets.some((set) => set.code === "ed_headache_v1")).toBe(true);
  });

  it("resolves category labels in English and French", () => {
    expect(getEnterpriseOrderSetCategoryLabel("ORTHOPEDICS", "en")).toContain("Orthopedics");
    expect(getEnterpriseOrderSetCategoryLabel("ORTHOPEDICS", "fr")).toContain("Orthopédie");
  });

  it("active registry has no duplicate order set codes", () => {
    const codes = activeEnterpriseOrderSets().map((set) => set.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("falls back to first populated category when preferred is missing", () => {
    const groups = groupEnterpriseOrderSetsByCategory(activeEnterpriseOrderSets(), "en");
    const resolved = resolveEnterpriseOrderSetBrowserCategory(null, groups);
    expect(resolved).toBeTruthy();
    expect(ENTERPRISE_ORDER_SET_CATEGORIES).toContain(resolved!);
  });

  it("category filter scopes browse list", () => {
    const chest = enterpriseOrderSetByCode("ed_chest_pain_v1")!;
    const scoped = filterEnterpriseOrderSetsForBrowser({
      query: "",
      category: chest.category,
      locale: "en",
    });
    expect(scoped.every((set) => set.category === chest.category)).toBe(true);
    expect(scoped.some((set) => set.code === chest.code)).toBe(true);
  });
});
