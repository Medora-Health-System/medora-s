import { DiagnosisOnsetPrecision } from "@prisma/client";
import { resolveDiagnosisOnsetInput } from "./diagnosis-onset.util";

describe("resolveDiagnosisOnsetInput", () => {
  it("maps unknown to null onset", () => {
    expect(
      resolveDiagnosisOnsetInput({ onsetPrecision: DiagnosisOnsetPrecision.UNKNOWN })
    ).toEqual({
      onsetDate: null,
      onsetPrecision: DiagnosisOnsetPrecision.UNKNOWN,
    });
  });

  it("stores date-only at UTC noon", () => {
    const resolved = resolveDiagnosisOnsetInput({
      onsetDate: new Date("2026-07-14T00:00:00.000Z"),
      onsetPrecision: DiagnosisOnsetPrecision.DATE,
    });
    expect(resolved.onsetPrecision).toBe(DiagnosisOnsetPrecision.DATE);
    expect(resolved.onsetDate?.toISOString()).toBe("2026-07-14T12:00:00.000Z");
  });

  it("keeps datetime precision for full instants", () => {
    const at = new Date("2026-07-14T15:30:00.000Z");
    const resolved = resolveDiagnosisOnsetInput({
      onsetDate: at,
      onsetPrecision: DiagnosisOnsetPrecision.DATETIME,
    });
    expect(resolved.onsetPrecision).toBe(DiagnosisOnsetPrecision.DATETIME);
    expect(resolved.onsetDate?.toISOString()).toBe(at.toISOString());
  });

  it("rejects future onset", () => {
    expect(() =>
      resolveDiagnosisOnsetInput({
        onsetDate: new Date("2099-01-01T00:00:00.000Z"),
        onsetPrecision: DiagnosisOnsetPrecision.DATETIME,
        now: new Date("2026-07-14T12:00:00.000Z"),
      })
    ).toThrow(/future/i);
  });
});
