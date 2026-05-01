/**
 * Shared vitalsJson merge for triage PUT — mirrors EmergencyTriagePanel merge behavior.
 * Preserves unknown keys on vitalsJson and medoraErTriageV1 blob merge.
 * Canonical storage: tempC (°C), weightKg, heightCm — US entry units converted here.
 */

import {
  canonicalHeightCm,
  canonicalTemperatureCelsius,
  canonicalWeightKg,
} from "@medora/shared";
import {
  MEDORA_ER_TRIAGE_V1_KEY,
  mergeMedoraErTriageV1Blob,
  type ErTriageV1Form,
} from "./medoraErTriageV1";

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
  allergyNote: string;
  erV1: ErTriageV1Form;
  /** Entry unit for `tempC` string (defaults to °C). */
  tempInputUnit?: "C" | "F";
  weightInputUnit?: "kg" | "lb";
  heightInputMode?: "cm" | "ftin";
  heightFeet?: string;
  heightInches?: string;
};

/** Merge GET vitalsJson with form fields so unknown keys are kept on PUT. */
export function mergeVitalsJsonForSave(
  previous: unknown,
  form: VitalsJsonMergeFormInput
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
  const patch: Record<string, number | string | null> = {
    tempC: tempCanon,
    hr: form.hr ? parseInt(form.hr, 10) : null,
    rr: form.rr ? parseInt(form.rr, 10) : null,
    bpSys: form.bpSys ? parseInt(form.bpSys, 10) : null,
    bpDia: form.bpDia ? parseInt(form.bpDia, 10) : null,
    spo2: form.spo2 ? parseInt(form.spo2, 10) : null,
    weightKg: wCanon,
    heightCm: hCanon,
    allergyNote: (() => {
      const t = form.allergyNote.trim();
      return t.length > 0 ? t.slice(0, 2000) : null;
    })(),
  };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete base[k];
    else base[k] = v;
  }
  Object.keys(base).forEach((key) => {
    const v = base[key];
    if (v === null || v === undefined) delete base[key];
  });

  const erBlob = mergeMedoraErTriageV1Blob(previous, form.erV1);
  if (erBlob) base[MEDORA_ER_TRIAGE_V1_KEY] = erBlob;
  else delete base[MEDORA_ER_TRIAGE_V1_KEY];

  return Object.keys(base).length === 0 ? null : base;
}
