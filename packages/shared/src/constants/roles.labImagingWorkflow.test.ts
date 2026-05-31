import { describe, expect, it } from "vitest";
import { roleCodesIncludeLabImagingClinicalWorkflow } from "./roles.js";

describe("LAB.ED.4 — labImagingClinicalWorkflow roles", () => {
  it.each(["ADMIN", "PROVIDER", "RN", "LAB", "RADIOLOGY"] as const)(
    "includes %s",
    (role) => {
      expect(roleCodesIncludeLabImagingClinicalWorkflow([role])).toBe(true);
    }
  );

  it.each(["FRONT_DESK", "BILLING", "PHARMACY", "MEDORA_SUPER_ADMIN"] as const)(
    "excludes %s when alone",
    (role) => {
      expect(roleCodesIncludeLabImagingClinicalWorkflow([role])).toBe(false);
    }
  );
});
