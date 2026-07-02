import { describe, expect, it, vi, afterEach } from "vitest";
import {
  SUMMARY_CLINICAL_RECORD_V2_STORAGE_KEY,
  isSummaryClinicalRecordV2Enabled,
} from "./summaryClinicalRecordFeatureFlag";

describe("summaryClinicalRecordFeatureFlag", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.stubGlobal("window", undefined);
  });

  it("defaults to legacy when env flag is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_SUMMARY_CLINICAL_RECORD_V2", "");
    expect(isSummaryClinicalRecordV2Enabled()).toBe(false);
  });

  it("enables V2 when NEXT_PUBLIC_SUMMARY_CLINICAL_RECORD_V2=true", () => {
    vi.stubEnv("NEXT_PUBLIC_SUMMARY_CLINICAL_RECORD_V2", "true");
    expect(isSummaryClinicalRecordV2Enabled()).toBe(true);
  });

  it("reads dev localStorage override when not production", () => {
    vi.stubEnv("NEXT_PUBLIC_SUMMARY_CLINICAL_RECORD_V2", "");
    vi.stubEnv("NODE_ENV", "development");
    const getItem = vi.fn().mockReturnValue("true");
    vi.stubGlobal("window", {
      localStorage: { getItem },
    } as unknown as Window & typeof globalThis);
    expect(isSummaryClinicalRecordV2Enabled()).toBe(true);
    expect(getItem).toHaveBeenCalledWith(SUMMARY_CLINICAL_RECORD_V2_STORAGE_KEY);
  });

  it("ignores localStorage in production", () => {
    vi.stubEnv("NEXT_PUBLIC_SUMMARY_CLINICAL_RECORD_V2", "");
    vi.stubEnv("NODE_ENV", "production");
    const getItem = vi.fn().mockReturnValue("true");
    vi.stubGlobal("window", {
      localStorage: { getItem },
    } as unknown as Window & typeof globalThis);
    expect(isSummaryClinicalRecordV2Enabled()).toBe(false);
    expect(getItem).not.toHaveBeenCalled();
  });
});
