import { describe, expect, it } from "vitest";
import {
  enterpriseChartCertificationStageAEnabled,
  enterpriseChartCertificationStageAEnabledFromProcessEnv,
} from "./enterpriseChartCertificationStageAFeatureFlag.js";

describe("enterpriseChartCertificationStageAFeatureFlag", () => {
  it("defaults OFF", () => {
    expect(enterpriseChartCertificationStageAEnabled(null)).toBe(false);
    expect(enterpriseChartCertificationStageAEnabled({})).toBe(false);
    expect(enterpriseChartCertificationStageAEnabledFromProcessEnv({})).toBe(false);
  });

  it("enables on truthy env values", () => {
    expect(
      enterpriseChartCertificationStageAEnabled({
        NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_A: "true",
      })
    ).toBe(true);
    expect(
      enterpriseChartCertificationStageAEnabled({
        ENTERPRISE_CHART_CERTIFICATION_STAGE_A: "1",
      })
    ).toBe(true);
  });
});
