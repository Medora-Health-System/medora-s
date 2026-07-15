/**
 * Shared vitalsJson merge for triage PUT — mirrors EmergencyTriagePanel merge behavior.
 * Preserves unknown keys on vitalsJson and medoraErTriageV1 blob merge.
 * Canonical storage: tempC (°C), weightKg, heightCm — US entry units converted here.
 */

import {
  attachTriageCarryForwardMetaToVitalsJson,
  canonicalHeightCm,
  canonicalTemperatureCelsius,
  canonicalWeightKg,
  isOxygenDeliveryDevice,
  isVitalTemperatureSite,
  type OxygenDeliveryDevice,
  type TriageCarryForwardMeta,
  type VitalTemperatureSite,
} from "@medora/shared";
import {
  MEDORA_ER_TRIAGE_V1_KEY,
  mergeMedoraErTriageV1Blob,
  type ErTriageV1Form,
} from "./medoraErTriageV1";

function parsePainScoreForStorage(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = parseInt(trimmed, 10);
  if (Number.isNaN(n)) return null;
  return Math.min(10, Math.max(0, n));
}

/** Vitals + allergy note + ER V1 blob — same fields used by mergeVitalsJsonForSave in triage. */
export type VitalsJsonMergeFormInput = {
  tempC: string;
  hr: string;
  rr: string;
  bpSys: string;
  bpDia: string;
  spo2: string;
  weightKg: string;
  heightCm: string;
  painScore: string;
  allergyNote: string;
  erV1: ErTriageV1Form;
  /** Entry unit for `tempC` string (defaults to °C). */
  tempInputUnit?: "C" | "F";
  weightInputUnit?: "kg" | "lb";
  heightInputMode?: "cm" | "ftin";
  heightFeet?: string;
  heightInches?: string;
  temperatureSite?: string;
  oxygenDevice?: string;
  oxygenFlowLpm?: string;
  oxygenFiO2Percent?: string;
  oxygenDeviceNotes?: string;
};

/** Merge GET vitalsJson with form fields so unknown keys are kept on PUT. */
export function mergeVitalsJsonForSave(
  previous: unknown,
  form: VitalsJsonMergeFormInput,
  carryForwardMeta?: TriageCarryForwardMeta | null
): Record<string, unknown> | null {
  const base =
    previous && typeof previous === "object" && !Array.isArray(previous)
      ? { ...(previous as Record<string, unknown>) }
      : {};
  const tempCanon = canonicalTemperatureCelsius(form.tempC, form.tempInputUnit);
  const wCanon = canonicalWeightKg(form.weightKg, form.weightInputUnit);
  const hCanon = canonicalHeightCm({
    heightCmStr: form.heightCm,
    heightInputMode: form.heightInputMode,
    heightFeetStr: form.heightFeet,
    heightInchesStr: form.heightInches,
  });
  const siteRaw = (form.temperatureSite ?? "").trim();
  const temperatureSite: VitalTemperatureSite | null =
    siteRaw && isVitalTemperatureSite(siteRaw) ? siteRaw : null;
  const deviceRaw = (form.oxygenDevice ?? "").trim();
  const oxygenDevice: OxygenDeliveryDevice | null =
    deviceRaw && isOxygenDeliveryDevice(deviceRaw) ? deviceRaw : null;
  const flowParsed = form.oxygenFlowLpm?.trim()
    ? Number(form.oxygenFlowLpm.trim())
    : null;
  const fio2Parsed = form.oxygenFiO2Percent?.trim()
    ? Number(form.oxygenFiO2Percent.trim())
    : null;
  const notes = (form.oxygenDeviceNotes ?? "").trim().slice(0, 500);

  const patch: Record<string, number | string | null> = {
    tempC: tempCanon,
    hr: form.hr ? parseInt(form.hr, 10) : null,
    rr: form.rr ? parseInt(form.rr, 10) : null,
    bpSys: form.bpSys ? parseInt(form.bpSys, 10) : null,
    bpDia: form.bpDia ? parseInt(form.bpDia, 10) : null,
    spo2: form.spo2 ? parseInt(form.spo2, 10) : null,
    weightKg: wCanon,
    heightCm: hCanon,
    painScore: parsePainScoreForStorage(form.painScore),
    allergyNote: (() => {
      const t = form.allergyNote.trim();
      return t.length > 0 ? t.slice(0, 2000) : null;
    })(),
    temperatureSite,
    oxygenDevice,
    oxygenFlowLpm:
      oxygenDevice && oxygenDevice !== "ROOM_AIR" && flowParsed != null && Number.isFinite(flowParsed)
        ? flowParsed
        : null,
    oxygenFiO2Percent:
      oxygenDevice && oxygenDevice !== "ROOM_AIR" && fio2Parsed != null && Number.isFinite(fio2Parsed)
        ? fio2Parsed
        : null,
    oxygenDeviceNotes: notes.length > 0 ? notes : null,
  };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete base[k];
    else base[k] = v;
  }
  Object.keys(base).forEach((key) => {
    const v = base[key];
    if (v === null || v === undefined) delete base[key];
  });

  const erV1Synced: ErTriageV1Form = {
    ...form.erV1,
    painScale0to10: form.painScore.trim() || form.erV1.painScale0to10,
  };
  const erBlob = mergeMedoraErTriageV1Blob(previous, erV1Synced);
  if (erBlob) base[MEDORA_ER_TRIAGE_V1_KEY] = erBlob;
  else delete base[MEDORA_ER_TRIAGE_V1_KEY];

  return attachTriageCarryForwardMetaToVitalsJson(
    Object.keys(base).length ? base : null,
    carryForwardMeta ?? null
  );
}
