import {
  ENCOUNTER_MAR_LIST_DEFAULT_LIMIT,
  ENCOUNTER_MAR_LIST_MAX_LIMIT,
  ENCOUNTER_ORDER_EVENTS_LIST_DEFAULT_LIMIT,
  ENCOUNTER_ORDER_EVENTS_LIST_MAX_LIMIT,
  parseOptionalPositiveInt,
  resolveBoundedListLimit,
} from "./encounter-clinical-read-limits";

describe("encounter-clinical-read-limits", () => {
  it("resolveBoundedListLimit uses default when missing or invalid", () => {
    expect(resolveBoundedListLimit(undefined, 200, 500)).toBe(200);
    expect(resolveBoundedListLimit(0, 200, 500)).toBe(200);
    expect(resolveBoundedListLimit(-1, 200, 500)).toBe(200);
  });

  it("resolveBoundedListLimit caps explicit overrides", () => {
    expect(resolveBoundedListLimit(250, ENCOUNTER_ORDER_EVENTS_LIST_DEFAULT_LIMIT, ENCOUNTER_ORDER_EVENTS_LIST_MAX_LIMIT)).toBe(250);
    expect(resolveBoundedListLimit(999, ENCOUNTER_MAR_LIST_DEFAULT_LIMIT, ENCOUNTER_MAR_LIST_MAX_LIMIT)).toBe(
      ENCOUNTER_MAR_LIST_MAX_LIMIT
    );
  });

  it("parseOptionalPositiveInt rejects non-positive values", () => {
    expect(parseOptionalPositiveInt(undefined)).toBeUndefined();
    expect(parseOptionalPositiveInt("")).toBeUndefined();
    expect(parseOptionalPositiveInt("abc")).toBeUndefined();
    expect(parseOptionalPositiveInt("50")).toBe(50);
  });
});
