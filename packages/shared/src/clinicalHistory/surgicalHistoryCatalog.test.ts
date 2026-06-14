import { describe, expect, it } from "vitest";
import {
  applySurgicalHistoryCatalogSelection,
  searchSurgicalHistoryCatalog,
  surgicalHistoryById,
  SURGICAL_HISTORY_CATALOG,
  SURGICAL_HISTORY_SEARCH_MIN_CHARS,
} from "./surgicalHistoryCatalog.js";

describe("surgicalHistoryCatalog (TRIAGE.2A)", () => {
  it("includes all initial governed entries", () => {
    const ids = SURGICAL_HISTORY_CATALOG.map((e) => e.id);
    for (const id of [
      "appendectomy",
      "cholecystectomy",
      "c_section",
      "hysterectomy",
      "hernia_repair",
      "tonsillectomy",
      "orthopedic_surgery",
      "cardiac_surgery_stent",
      "abdominal_surgery",
      "no_prior_surgery",
      "other",
    ]) {
      expect(ids).toContain(id);
    }
  });

  it("requires 2+ characters for search", () => {
    expect(SURGICAL_HISTORY_SEARCH_MIN_CHARS).toBe(2);
    expect(searchSurgicalHistoryCatalog("", "en")).toEqual([]);
    expect(searchSurgicalHistoryCatalog("a", "en")).toEqual([]);
  });

  it("finds appendectomy by English alias", () => {
    const hits = searchSurgicalHistoryCatalog("append", "en");
    expect(hits.some((h) => h.id === "appendectomy")).toBe(true);
  });

  it("finds cholecystectomy by French label", () => {
    const hits = searchSurgicalHistoryCatalog("choléc", "fr");
    expect(hits.some((h) => h.id === "cholecystectomy")).toBe(true);
  });

  it("no_prior_surgery clears conflicting surgical history text", () => {
    const entry = surgicalHistoryById("no_prior_surgery")!;
    expect(entry.replacesExisting).toBe(true);
    expect(entry.mutuallyExclusiveGroup).toBe("prior_surgery_status");
    expect(
      applySurgicalHistoryCatalogSelection("Appendectomy; Cholecystectomy", entry, "en")
    ).toBe("No prior surgery");
  });

  it("other appends without clearing existing text", () => {
    const entry = surgicalHistoryById("other")!;
    expect(
      applySurgicalHistoryCatalogSelection("Appendectomy", entry, "en")
    ).toBe("Appendectomy; Other");
  });

  it("manual free text is preserved when appending non-exclusive entry", () => {
    const entry = surgicalHistoryById("appendectomy")!;
    expect(applySurgicalHistoryCatalogSelection("Custom laparotomy note", entry, "en")).toBe(
      "Custom laparotomy note; Appendectomy"
    );
  });

  it("inactive entries are excluded from search", () => {
    const catalog = [
      ...SURGICAL_HISTORY_CATALOG,
      {
        id: "retired_test",
        displayNameEn: "Retired test",
        displayNameFr: "Test retiré",
        aliases: ["retiredtest"],
        category: "OTHER" as const,
        inactive: true,
      },
    ];
    expect(searchSurgicalHistoryCatalog("retiredtest", "en", catalog)).toEqual([]);
  });
});
