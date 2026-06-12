import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveClinicalTimeZone, formatClinicalDateTimeInZone } from "@medora/shared";
import { formatClinicalInstantForFacility } from "@/lib/clinicalTimeDisplay";

describe("clinicalTimeDisplay K10B1", () => {
  it("EmergencyErOrdersPanel uses facility clinical time formatter", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/features/emergency/EmergencyErOrdersPanel.tsx"),
      "utf8"
    );
    expect(src).toContain("formatClinicalInstantForFacility");
    expect(src).not.toMatch(/o\.createdAt[\s\S]{0,120}toLocaleString\(language/);
  });

  it("English formatter shows Haiti wall clock for Morphine UTC instant", () => {
    const instant = "2026-06-12T04:34:04.246Z";
    const haiti = "America/Port-au-Prince";
    const formatted = formatClinicalInstantForFacility(instant, haiti, "en");
    expect(formatted).toMatch(/12:34\sAM|00:34/);
    expect(formatted).not.toMatch(/11:34\sPM/);
  });

  it("resolveClinicalTimeZone is single authority export", () => {
    expect(resolveClinicalTimeZone({ facilityTimeZone: "America/Port-au-Prince" })).toBe(
      "America/Port-au-Prince"
    );
  });
});
