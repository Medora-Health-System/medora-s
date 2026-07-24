import { describe, expect, it } from "vitest";
import {
  buildGraphicalHospitalUnitTreeV1,
  buildHospitalUnitRegistryV1,
} from "@medora/shared";
import {
  HOSPITAL_UNIT_MAP_CARD,
  HOSPITAL_UNIT_MAP_SERVICE_LINES,
  hospitalUnitMapExcludesRehabilitation,
} from "./hospitalUnitMapConfig";
import { filterHospitalUnitMap, projectHospitalUnitMap } from "./projectHospitalUnitMap";

describe("MEDUI.D4A.3.1 Hospital Unit Map", () => {
  it("defines exactly six service lines in product order without Rehabilitation", () => {
    expect(HOSPITAL_UNIT_MAP_SERVICE_LINES).toHaveLength(6);
    expect(hospitalUnitMapExcludesRehabilitation()).toBe(true);
    expect(HOSPITAL_UNIT_MAP_SERVICE_LINES.map((l) => l.id)).toEqual([
      "medical-surgical",
      "critical-care",
      "pediatric",
      "obgyn",
      "behavioral-health",
      "other-specialty",
    ]);
    expect(HOSPITAL_UNIT_MAP_SERVICE_LINES.some((l) => l.id.includes("rehab"))).toBe(false);
    expect(
      HOSPITAL_UNIT_MAP_SERVICE_LINES.some((l) =>
        l.sourceServiceLineCodes.includes("REHABILITATION")
      )
    ).toBe(false);
  });

  it("keeps compact card sizing within the approved band", () => {
    expect(HOSPITAL_UNIT_MAP_CARD.widthPx).toBeGreaterThanOrEqual(170);
    expect(HOSPITAL_UNIT_MAP_CARD.widthPx).toBeLessThanOrEqual(190);
    expect(HOSPITAL_UNIT_MAP_CARD.minHeightPx).toBeGreaterThanOrEqual(70);
    expect(HOSPITAL_UNIT_MAP_CARD.maxHeightPx).toBeLessThanOrEqual(80);
  });

  it("projects API units onto the map and preserves Open board routes", () => {
    const registry = buildHospitalUnitRegistryV1({
      facilityId: "fac-1",
      placementAvailability: "FEATURE_DISABLED",
      patients: [],
      includeDevelopmentFixtures: false,
    });
    const tree = buildGraphicalHospitalUnitTreeV1(registry);
    const model = projectHospitalUnitMap(tree);

    expect(model.serviceLines).toHaveLength(6);
    expect(model.root.route).toBe("/app/hospitalisation/inpatient/all");

    const ms = model.serviceLines.find((s) => s.id === "medical-surgical");
    const icu = model.serviceLines.find((s) => s.id === "critical-care");
    const other = model.serviceLines.find((s) => s.id === "other-specialty");

    expect(ms?.units.some((u) => u.code === "MS")).toBe(true);
    expect(ms?.units.find((u) => u.code === "MS")?.route).toContain("/units/ms");
    expect(icu?.units.find((u) => u.code === "ICU")?.route).toContain("/units/icu");
    expect(other?.units.find((u) => u.code === "OBS")?.opensObservationWorkspace).toBe(true);

    // Empty specialty lines still render a placeholder unit with service-line fallback route
    const peds = model.serviceLines.find((s) => s.id === "pediatric");
    expect(peds?.units[0]?.isMapPlaceholder).toBe(true);
    expect(peds?.units[0]?.route).toBe("/app/hospitalisation/inpatient/pediatrics");
  });

  it("never includes a Rehabilitation column when projecting", () => {
    const registry = buildHospitalUnitRegistryV1({
      facilityId: "fac-1",
      placementAvailability: "FEATURE_DISABLED",
      patients: [],
      includeDevelopmentFixtures: true,
    });
    const tree = buildGraphicalHospitalUnitTreeV1(registry);
    const model = projectHospitalUnitMap(tree);
    expect(model.serviceLines.every((s) => s.id !== ("rehabilitation" as typeof s.id))).toBe(
      true
    );
    expect(
      model.serviceLines.every((s) => !s.config.sourceServiceLineCodes.includes("REHABILITATION"))
    ).toBe(true);
  });

  it("filters map lines by query without dropping Open board routes", () => {
    const registry = buildHospitalUnitRegistryV1({
      facilityId: "fac-1",
      placementAvailability: "FEATURE_DISABLED",
      patients: [],
      includeDevelopmentFixtures: false,
    });
    const tree = buildGraphicalHospitalUnitTreeV1(registry);
    const model = projectHospitalUnitMap(tree);
    const filtered = filterHospitalUnitMap(model, "icu");
    expect(filtered.some((s) => s.id === "critical-care")).toBe(true);
    expect(filtered.find((s) => s.id === "critical-care")?.units[0]?.route).toContain(
      "/units/icu"
    );
  });

  it("uses required inline emoji glyphs in config", () => {
    const emojis = HOSPITAL_UNIT_MAP_SERVICE_LINES.map((l) => l.emoji);
    expect(emojis).toEqual(["🩺", "🫀", "🧸", "🤰", "🧠", "•••"]);
  });
});
