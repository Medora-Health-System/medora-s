import { describe, expect, it } from "vitest";
import { datetimeLocalValueToUtcIso } from "./medicationAdministrationEffectiveTimeDisplay";
import {
  buildMarCreateEffectiveTimeRequestFields,
  buildMarPatchEffectiveTimeRequestBody,
  marRecordModalEffectiveTimeClientError,
  marRecordModalShowsLargeBackdateSupervisoryWarning,
} from "./marRecordModalEffectiveTime";

describe("marRecordModalEffectiveTime", () => {
  const t = (k: string) =>
    (
      ({
        "marTab.adminTime.invalidTime": "invalid",
        "marTab.adminTime.reasonRequired": "reason required",
        "marTab.adminTime.reasonTooShortForLargeBackdate": "too short",
      }) as Record<string, string>
    )[k] ?? k;

  it("returns null payload when no local time", () => {
    expect(
      buildMarCreateEffectiveTimeRequestFields({
        effectiveTimeLocal: "",
        effectiveTimeReason: "",
        toUtcIso: () => "2026-05-16T13:00:00.000Z",
      })
    ).toBeNull();
  });

  it("PATCH body uses effectiveAdministeredTime key (not effectiveAdministeredAt)", () => {
    const body = buildMarPatchEffectiveTimeRequestBody({
      effectiveTimeUtcIso: "2026-05-16T13:00:00.000Z",
      reason: "Delayed documentation correction",
    });
    expect(body.effectiveAdministeredTime).toBe("2026-05-16T13:00:00.000Z");
    expect(body.reason).toBe("Delayed documentation correction");
    expect("effectiveAdministeredAt" in body).toBe(false);
  });

  it("includes effectiveAdministeredAt in create payload when set", () => {
    const payload = buildMarCreateEffectiveTimeRequestFields({
      effectiveTimeLocal: "2026-05-16T08:00",
      effectiveTimeReason: "charting delay",
      toUtcIso: () => "2026-05-16T13:00:00.000Z",
    });
    expect(payload?.effectiveAdministeredAt).toBe("2026-05-16T13:00:00.000Z");
    expect(payload?.effectiveAdministeredAtReason).toBe("charting delay");
  });

  it("UTC ISO payload ends with Z", () => {
    const payload = buildMarCreateEffectiveTimeRequestFields({
      effectiveTimeLocal: "2026-05-16T08:00",
      effectiveTimeReason: "",
      toUtcIso: datetimeLocalValueToUtcIso,
    });
    expect(payload?.effectiveAdministeredAt).toMatch(/Z$/);
  });

  it("shows supervisory warning when delta exceeds 24h", () => {
    const documented = new Date("2026-05-16T14:00:00.000Z");
    expect(
      marRecordModalShowsLargeBackdateSupervisoryWarning({
        effectiveTimeLocal: "2026-05-14T08:00",
        documentedAt: documented,
        toUtcIso: () => "2026-05-14T13:00:00.000Z",
      })
    ).toBe(true);
    expect(
      marRecordModalShowsLargeBackdateSupervisoryWarning({
        effectiveTimeLocal: "2026-05-16T13:00",
        documentedAt: documented,
        toUtcIso: () => "2026-05-16T13:00:00.000Z",
      })
    ).toBe(false);
  });

  it("requires reason for large backdate at create", () => {
    const documented = new Date("2026-05-16T14:00:00.000Z");
    const err = marRecordModalEffectiveTimeClientError({
      effectiveTimeLocal: "2026-05-15T08:00",
      effectiveTimeReason: "",
      documentedAt: documented,
      orderCreatedAt: documented,
      orderItemCreatedAt: documented,
      orderCancelledAt: null,
      controlledMedication: false,
      toUtcIso: () => "2026-05-15T13:00:00.000Z",
      t,
    });
    expect(err).toBe("reason required");
  });
});
