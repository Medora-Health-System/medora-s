/**
 * Phase 19Y.2A / 19Y.4A — deterministic SHA-256 for provider discharge template governance hashes.
 * Pure-JS implementation (browser + Node/vitest identical output).
 */

import type { ProviderDischargeFollowUpRow } from "./providerDischargeDocumentationModel";
import type {
  ProviderDischargeTemplateLocale,
  ProviderDischargeTemplateSuggestedTextBody,
} from "./providerDischargeTemplateLocale";
import { getProviderDischargeSuggestedTextBody } from "./providerDischargeTemplateLocale";
import { normalizeObGynSafetyForHash } from "./providerDischargeTemplateObGynGovernance";
import type { ProviderDischargeTemplateObGynSafety } from "./providerDischargeTemplateObGynGovernance";
import {
  normalizeBehavioralHealthSafetyForHash,
  type ProviderDischargeTemplateBehavioralHealthSafety,
} from "./providerDischargeTemplateBehavioralHealthGovernance";
import {
  normalizeTraumaMskSafetyForHash,
  type ProviderDischargeTemplateTraumaMskSafety,
} from "./providerDischargeTemplateTraumaMskGovernance";
import {
  normalizeCardioHighRiskSafetyForHash,
  type ProviderDischargeTemplateCardioHighRiskSafety,
} from "./providerDischargeTemplateCardioHighRiskGovernance";
import {
  normalizeInfectiousRiskSafetyForHash,
  type ProviderDischargeTemplateInfectiousRiskSafety,
} from "./providerDischargeTemplateInfectiousRiskGovernance";
import {
  normalizeRenalElectrolyteSafetyForHash,
  type ProviderDischargeTemplateRenalElectrolyteSafety,
} from "./providerDischargeTemplateRenalElectrolyteGovernance";

export type ProviderDischargeTemplateHashSource = {
  id: string;
  version: string;
  suggestedText: {
    en: ProviderDischargeTemplateSuggestedTextBody;
    fr: ProviderDischargeTemplateSuggestedTextBody;
  };
  sourceReferences: Array<{
    label: string;
    url?: string;
    publisher?: string;
    accessedAt?: string;
  }>;
  defaultFollowUps?: ProviderDischargeFollowUpRow[];
  specialtyCategory?: string;
  riskCategory?: string;
  clinicalReviewStatus?: "draft" | "reviewed" | "approved";
  effectiveFrom?: string;
  effectiveTo?: string;
  /** Phase 19Y.7A — pediatric safety semantics included in applied hash when present. */
  escalationSeverity?: "routine" | "urgent" | "emergency";
  minimumEscalationLevel?: "routine" | "urgent" | "emergency";
  requiresReevaluationWarning?: boolean;
  requiresCaregiverObservationWindow?: boolean;
  caregiverObservationWindowHours?: number;
  requiredDangerSignCategories?: readonly string[];
  obGynSafety?: ProviderDischargeTemplateObGynSafety;
  behavioralHealthSafety?: ProviderDischargeTemplateBehavioralHealthSafety;
  traumaMskSafety?: ProviderDischargeTemplateTraumaMskSafety;
  cardioHighRiskSafety?: ProviderDischargeTemplateCardioHighRiskSafety;
  infectiousRiskSafety?: ProviderDischargeTemplateInfectiousRiskSafety;
  renalElectrolyteSafety?: ProviderDischargeTemplateRenalElectrolyteSafety;
};

export type ProviderDischargeTemplateHashPayload = {
  templateId: string;
  templateVersion: string;
  appliedLocale: ProviderDischargeTemplateLocale;
  description: string;
  diagnosisInstructions: string;
  medicationTreatment: string;
  returnPrecautions: string;
  returnWorkSchool?: string;
  treatment?: string;
  caregiverInstructions?: string;
  defaultFollowUps?: Array<{
    specialty: string;
    providerOrFacility: string;
    timing: string;
    phone: string;
    address: string;
    comments: string;
  }>;
  sourceReferences: Array<{
    label: string;
    url?: string;
    publisher?: string;
    accessedAt?: string;
  }>;
  specialtyCategory?: string;
  riskCategory?: string;
  clinicalReviewStatus?: "draft" | "reviewed" | "approved";
  effectiveFrom?: string;
  effectiveTo?: string;
  escalationSeverity?: "routine" | "urgent" | "emergency";
  minimumEscalationLevel?: "routine" | "urgent" | "emergency";
  requiresReevaluationWarning?: boolean;
  requiresCaregiverObservationWindow?: boolean;
  caregiverObservationWindowHours?: number;
  requiredDangerSignCategories?: string[];
  obGynSafety?: Record<string, boolean>;
  behavioralHealthSafety?: Record<string, boolean>;
  traumaMskSafety?: Record<string, boolean>;
  cardioHighRiskSafety?: Record<string, boolean>;
  infectiousRiskSafety?: Record<string, boolean>;
  renalElectrolyteSafety?: Record<string, boolean>;
};

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
  }
  return JSON.stringify(String(value));
}

function normalizeFollowUpForHash(row: ProviderDischargeFollowUpRow) {
  return {
    specialty: row.specialty.trim(),
    providerOrFacility: row.providerOrFacility.trim(),
    timing: row.timing.trim(),
    phone: row.phone.trim(),
    address: row.address.trim(),
    comments: row.comments.trim(),
  };
}

/** Build canonical hash input from a registry template for one locale (no cross-locale fallback). */
export function buildProviderDischargeTemplateHashPayload(
  template: ProviderDischargeTemplateHashSource,
  locale: ProviderDischargeTemplateLocale
): ProviderDischargeTemplateHashPayload {
  const text = getProviderDischargeSuggestedTextBody(template, locale);
  const payload: ProviderDischargeTemplateHashPayload = {
    templateId: template.id,
    templateVersion: template.version,
    appliedLocale: locale,
    description: text.description,
    diagnosisInstructions: text.diagnosisInstructions,
    medicationTreatment: text.medicationTreatment,
    returnPrecautions: text.returnPrecautions,
    sourceReferences: template.sourceReferences.map((ref) => ({
      label: ref.label,
      ...(ref.url ? { url: ref.url } : {}),
      ...(ref.publisher ? { publisher: ref.publisher } : {}),
      ...(ref.accessedAt ? { accessedAt: ref.accessedAt } : {}),
    })),
  };

  if (text.returnWorkSchool?.trim()) payload.returnWorkSchool = text.returnWorkSchool.trim();
  if (text.treatment?.trim()) payload.treatment = text.treatment.trim();
  if (text.caregiverInstructions?.trim()) {
    payload.caregiverInstructions = text.caregiverInstructions.trim();
  }
  if (template.defaultFollowUps?.length) {
    payload.defaultFollowUps = template.defaultFollowUps.map(normalizeFollowUpForHash);
  }
  if (template.specialtyCategory?.trim()) payload.specialtyCategory = template.specialtyCategory.trim();
  if (template.riskCategory?.trim()) payload.riskCategory = template.riskCategory.trim();
  if (template.clinicalReviewStatus) payload.clinicalReviewStatus = template.clinicalReviewStatus;
  if (template.effectiveFrom?.trim()) payload.effectiveFrom = template.effectiveFrom.trim();
  if (template.effectiveTo?.trim()) payload.effectiveTo = template.effectiveTo.trim();
  if (template.escalationSeverity) payload.escalationSeverity = template.escalationSeverity;
  if (template.minimumEscalationLevel) payload.minimumEscalationLevel = template.minimumEscalationLevel;
  if (template.requiresReevaluationWarning === true) {
    payload.requiresReevaluationWarning = true;
  }
  if (template.requiresCaregiverObservationWindow === true) {
    payload.requiresCaregiverObservationWindow = true;
  }
  if (template.caregiverObservationWindowHours !== undefined) {
    payload.caregiverObservationWindowHours = template.caregiverObservationWindowHours;
  }
  if (template.requiredDangerSignCategories?.length) {
    payload.requiredDangerSignCategories = [...template.requiredDangerSignCategories].sort();
  }
  const obGynSafety = normalizeObGynSafetyForHash(template.obGynSafety);
  if (obGynSafety) payload.obGynSafety = obGynSafety;
  const behavioralHealthSafety = normalizeBehavioralHealthSafetyForHash(template.behavioralHealthSafety);
  if (behavioralHealthSafety) payload.behavioralHealthSafety = behavioralHealthSafety;
  const traumaMskSafety = normalizeTraumaMskSafetyForHash(template.traumaMskSafety);
  if (traumaMskSafety) payload.traumaMskSafety = traumaMskSafety;
  const cardioHighRiskSafety = normalizeCardioHighRiskSafetyForHash(template.cardioHighRiskSafety);
  if (cardioHighRiskSafety) payload.cardioHighRiskSafety = cardioHighRiskSafety;
  const infectiousRiskSafety = normalizeInfectiousRiskSafetyForHash(template.infectiousRiskSafety);
  if (infectiousRiskSafety) payload.infectiousRiskSafety = infectiousRiskSafety;
  const renalElectrolyteSafety = normalizeRenalElectrolyteSafetyForHash(template.renalElectrolyteSafety);
  if (renalElectrolyteSafety) payload.renalElectrolyteSafety = renalElectrolyteSafety;

  return payload;
}

/** SHA-256 hex digest of the locale-specific applied template suggestion bundle. */
export function computeProviderDischargeTemplateAppliedHash(
  template: ProviderDischargeTemplateHashSource,
  locale: ProviderDischargeTemplateLocale
): string {
  return sha256HexUtf8(providerDischargeTemplateHashCanonicalString(template, locale));
}

/** Canonical stable string used as SHA-256 input (for tests and audit tooling). */
export function providerDischargeTemplateHashCanonicalString(
  template: ProviderDischargeTemplateHashSource,
  locale: ProviderDischargeTemplateLocale
): string {
  return stableStringify(buildProviderDischargeTemplateHashPayload(template, locale));
}

function sha256HexUtf8(message: string): string {
  const bytes = new TextEncoder().encode(message);
  return bytesToHex(sha256(bytes));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function sha256(data: Uint8Array): Uint8Array {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  const padded = padSha256Input(data);
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);

  const w = new Uint32Array(64);
  for (let i = 0; i < padded.length; i += 64) {
    for (let t = 0; t < 16; t++) {
      const j = i + t * 4;
      w[t] =
        (padded[j]! << 24) |
        (padded[j + 1]! << 16) |
        (padded[j + 2]! << 8) |
        padded[j + 3]!;
    }
    for (let t = 16; t < 64; t++) {
      w[t] = (sigma1(w[t - 2]!) + w[t - 7]! + sigma0(w[t - 15]!) + w[t - 16]!) >>> 0;
    }

    let a = h[0]!;
    let b = h[1]!;
    let c = h[2]!;
    let d = h[3]!;
    let e = h[4]!;
    let f = h[5]!;
    let g = h[6]!;
    let hi = h[7]!;

    for (let t = 0; t < 64; t++) {
      const t1 = (hi + caps1(e) + ch(e, f, g) + K[t]! + w[t]!) >>> 0;
      const t2 = (caps0(a) + maj(a, b, c)) >>> 0;
      hi = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }

    h[0] = (h[0]! + a) >>> 0;
    h[1] = (h[1]! + b) >>> 0;
    h[2] = (h[2]! + c) >>> 0;
    h[3] = (h[3]! + d) >>> 0;
    h[4] = (h[4]! + e) >>> 0;
    h[5] = (h[5]! + f) >>> 0;
    h[6] = (h[6]! + g) >>> 0;
    h[7] = (h[7]! + hi) >>> 0;
  }

  const out = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    out[i * 4] = (h[i]! >>> 24) & 0xff;
    out[i * 4 + 1] = (h[i]! >>> 16) & 0xff;
    out[i * 4 + 2] = (h[i]! >>> 8) & 0xff;
    out[i * 4 + 3] = h[i]! & 0xff;
  }
  return out;
}

function padSha256Input(data: Uint8Array): Uint8Array {
  const bitLen = data.length * 8;
  const padLen = ((56 - ((data.length + 1) % 64)) + 64) % 64;
  const total = data.length + 1 + padLen + 8;
  const out = new Uint8Array(total);
  out.set(data);
  out[data.length] = 0x80;
  const view = new DataView(out.buffer);
  view.setUint32(total - 4, bitLen >>> 0, false);
  view.setUint32(total - 8, Math.floor(bitLen / 0x100000000), false);
  return out;
}

function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

function caps0(x: number): number {
  return (rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22)) >>> 0;
}

function caps1(x: number): number {
  return (rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25)) >>> 0;
}

function sigma0(x: number): number {
  return (rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3)) >>> 0;
}

function sigma1(x: number): number {
  return (rotr(x, 17) ^ rotr(x, 19) ^ (x >>> 10)) >>> 0;
}

function ch(x: number, y: number, z: number): number {
  return ((x & y) ^ (~x & z)) >>> 0;
}

function maj(x: number, y: number, z: number): number {
  return ((x & y) ^ (x & z) ^ (y & z)) >>> 0;
}
