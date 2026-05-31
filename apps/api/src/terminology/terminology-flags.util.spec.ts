import {
  isEnvFlagTrue,
  isTerminologyBackfillEnabled,
  isTerminologyReadClassifierEnabled,
  isTerminologySearchClassifierEnabled,
} from "./terminology-flags.util";

describe("terminology-flags.util", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.TERMINOLOGY_READ_CLASSIFIER;
    delete process.env.TERMINOLOGY_SEARCH_CLASSIFIER;
    delete process.env.TERMINOLOGY_BACKFILL_ENABLED;
  });

  afterAll(() => {
    process.env = env;
  });

  it("isEnvFlagTrue returns false when unset", () => {
    expect(isEnvFlagTrue("TERMINOLOGY_READ_CLASSIFIER")).toBe(false);
  });

  it('isEnvFlagTrue returns false for "TRUE" and "1"', () => {
    process.env.TERMINOLOGY_READ_CLASSIFIER = "TRUE";
    expect(isEnvFlagTrue("TERMINOLOGY_READ_CLASSIFIER")).toBe(false);
    process.env.TERMINOLOGY_READ_CLASSIFIER = "1";
    expect(isEnvFlagTrue("TERMINOLOGY_READ_CLASSIFIER")).toBe(false);
  });

  it('isEnvFlagTrue returns true only for literal "true"', () => {
    process.env.TERMINOLOGY_READ_CLASSIFIER = "true";
    expect(isEnvFlagTrue("TERMINOLOGY_READ_CLASSIFIER")).toBe(true);
  });

  it("read/search/backfill flags default false", () => {
    expect(isTerminologyReadClassifierEnabled()).toBe(false);
    expect(isTerminologySearchClassifierEnabled()).toBe(false);
    expect(isTerminologyBackfillEnabled()).toBe(false);
  });
});
