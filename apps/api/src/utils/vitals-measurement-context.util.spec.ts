import { BadRequestException } from "@nestjs/common";
import {
  normalizeVitalsMeasurementContext,
  resolveMeasuredAt,
  VITALS_MEASURED_AT_FUTURE_TOLERANCE_MS,
} from "./vitals-measurement-context.util";

describe("vitals-measurement-context.util", () => {
  it("keeps temperature site and oxygen device on vitalsJson", () => {
    const next = normalizeVitalsMeasurementContext({
      tempC: 37.2,
      spo2: 97,
      temperatureSite: "ORAL",
      oxygenDevice: "NASAL_CANNULA",
      oxygenFlowLpm: 2,
    });
    expect(next.temperatureSite).toBe("ORAL");
    expect(next.oxygenDevice).toBe("NASAL_CANNULA");
    expect(next.oxygenFlowLpm).toBe(2);
  });

  it("clears flow and FiO2 for room air", () => {
    const next = normalizeVitalsMeasurementContext({
      spo2: 98,
      oxygenDevice: "ROOM_AIR",
      oxygenFlowLpm: 2,
      oxygenFiO2Percent: 40,
    });
    expect(next.oxygenDevice).toBe("ROOM_AIR");
    expect(next.oxygenFlowLpm).toBeUndefined();
    expect(next.oxygenFiO2Percent).toBeUndefined();
  });

  it("rejects invalid temperature site", () => {
    expect(() =>
      normalizeVitalsMeasurementContext({ temperatureSite: "MOUTH" })
    ).toThrow(BadRequestException);
  });

  it("accepts measuredAt within future tolerance", () => {
    const now = new Date("2026-07-14T15:00:00.000Z");
    const ok = new Date(now.getTime() + VITALS_MEASURED_AT_FUTURE_TOLERANCE_MS - 1000);
    expect(resolveMeasuredAt(ok.toISOString(), now).toISOString()).toBe(ok.toISOString());
  });

  it("rejects measuredAt beyond future tolerance", () => {
    const now = new Date("2026-07-14T15:00:00.000Z");
    const future = new Date(now.getTime() + VITALS_MEASURED_AT_FUTURE_TOLERANCE_MS + 60_000);
    expect(() => resolveMeasuredAt(future.toISOString(), now)).toThrow(BadRequestException);
  });

  it("defaults measuredAt to now when omitted", () => {
    const now = new Date("2026-07-14T15:00:00.000Z");
    expect(resolveMeasuredAt(undefined, now).toISOString()).toBe(now.toISOString());
  });
});
