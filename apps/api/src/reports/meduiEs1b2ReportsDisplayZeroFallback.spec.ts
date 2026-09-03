import { readFileSync } from "node:fs";
import { join } from "node:path";
import { medicationCatalogLabelForReport } from "./report-catalog-display.util";
import { minutesBetween } from "./ed-reports-time.util";

describe("MEDUI.ES.1B.2 report medication display zero-fallback", () => {
  const med = {
    displayNameEn: "Morphine",
    displayNameFr: "Morphine injectable",
    code: "MORPH",
  };

  it("EN report uses English label only", () => {
    expect(medicationCatalogLabelForReport(med, "en")).toBe("Morphine");
    expect(medicationCatalogLabelForReport(med, "en")).not.toBe("Morphine injectable");
  });

  it("EN missing localized label does not use French", () => {
    const label = medicationCatalogLabelForReport({ ...med, displayNameEn: "" }, "en");
    expect(label).toBe("MORPH");
    expect(label).not.toBe("Morphine injectable");
  });

  it("FR report uses French label only", () => {
    expect(medicationCatalogLabelForReport(med, "fr")).toBe("Morphine injectable");
    expect(medicationCatalogLabelForReport(med, "fr")).not.toBe("Morphine");
  });

  it("FR missing localized label does not use English", () => {
    const label = medicationCatalogLabelForReport({ ...med, displayNameFr: "" }, "fr");
    expect(label).toBe("MORPH");
    expect(label).not.toBe("Morphine");
  });

  it("unsupported es does not receive EN or FR labels", () => {
    const label = medicationCatalogLabelForReport(med, "es");
    expect(label).toBe("MORPH");
    expect(label).not.toBe("Morphine");
    expect(label).not.toBe("Morphine injectable");
  });

  it("display helper does not change duration calculations", () => {
    const door = new Date("2026-01-01T00:00:00.000Z");
    const end = new Date("2026-01-01T00:45:00.000Z");
    expect(minutesBetween(door, end)).toBe(45);
    expect(medicationCatalogLabelForReport(med, "fr")).toBe("Morphine injectable");
    expect(minutesBetween(door, end)).toBe(45);
  });

  it("reports.service no longer coalesces displayNameFr || displayNameEn", () => {
    const src = readFileSync(join(__dirname, "reports.service.ts"), "utf8");
    expect(src).not.toMatch(/displayNameFr\?\.trim\(\)\s*\|\|\s*m\.displayNameEn/);
    expect(src).toContain("medicationCatalogLabelForReport");
    expect(src).toContain("minutesBetween");
  });
});
