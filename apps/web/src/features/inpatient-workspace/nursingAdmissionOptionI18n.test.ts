/**
 * MEDUI.INP.2B.2 — Option label i18n resolution (not key parity only).
 */
import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";
import {
  resolveNursingAdmissionOptionLabel,
  resolveNursingAdmissionFieldLabel,
} from "./nursingAdmissionOptionI18n";

const tEn = (key: string) => {
  const parts = key.split(".");
  let cur: unknown = en;
  for (const p of parts) {
    if (cur && typeof cur === "object") cur = (cur as Record<string, unknown>)[p];
    else return key;
  }
  return typeof cur === "string" ? cur : key;
};

const tFr = (key: string) => {
  const parts = key.split(".");
  let cur: unknown = fr;
  for (const p of parts) {
    if (cur && typeof cur === "object") cur = (cur as Record<string, unknown>)[p];
    else return key;
  }
  return typeof cur === "string" ? cur : key;
};

describe("nursingAdmissionOptionI18n", () => {
  it("resolves mode of arrival labels in EN and FR", () => {
    expect(resolveNursingAdmissionOptionLabel(tEn, "AMBULATORY")).toBe("Ambulatory");
    expect(resolveNursingAdmissionOptionLabel(tFr, "AMBULATORY")).toBe("Marche");
    expect(resolveNursingAdmissionOptionLabel(tEn, "STRETCHER")).toBe("Stretcher");
    expect(resolveNursingAdmissionOptionLabel(tFr, "STRETCHER")).toBe("Brancard");
  });

  it("resolves admission source labels in FR without English leakage", () => {
    const label = resolveNursingAdmissionOptionLabel(tFr, "EMERGENCY_DEPARTMENT");
    expect(label).toBe("Service des urgences");
    expect(label).not.toMatch(/Emergency Department/i);
  });

  it("resolves yes/no/unknown in FR", () => {
    expect(resolveNursingAdmissionOptionLabel(tFr, "YES")).toBe("Oui");
    expect(resolveNursingAdmissionOptionLabel(tFr, "NO")).toBe("Non");
    expect(resolveNursingAdmissionOptionLabel(tFr, "UNKNOWN")).toBe("Inconnu");
  });

  it("resolves structured field labels in FR", () => {
    const label = resolveNursingAdmissionFieldLabel(tFr, "modeOfArrival");
    expect(label).toContain("arrivée");
    expect(label).not.toBe("Mode Of Arrival");
  });

  it("resolves condition-on-arrival labels differently in EN vs FR where applicable", () => {
    expect(resolveNursingAdmissionOptionLabel(tEn, "GUARDED")).toBe("Guarded");
    expect(resolveNursingAdmissionOptionLabel(tFr, "GUARDED")).toBe("Sous surveillance");
  });
});
