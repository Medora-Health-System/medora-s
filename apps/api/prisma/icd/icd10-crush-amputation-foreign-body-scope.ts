/**
 * Official ICD-10-CM prefix scopes for crush, traumatic amputation, and foreign-body
 * production certification. Derived from CMS chapter structure, not sample rows.
 */
import type { IcdScopeFamily, ScopedOfficialCode } from "./icd10-tendon-ligament-scope";
import { rowInFamily, selectScopedCodes } from "./icd10-tendon-ligament-scope";

export type { IcdScopeFamily, ScopedOfficialCode };

/** Crushing injuries of head, neck, trunk, and extremities + traumatic muscle ischemia. */
export const CRUSH_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "crush_head_face", label: "Crush — head / face", prefixes: ["S07"] },
  { id: "crush_neck", label: "Crush — neck", prefixes: ["S17"] },
  {
    id: "crush_chest",
    label: "Crush — chest",
    prefixes: ["S28"],
    includeDescriptionKeywords: ["crush"],
    excludeDescriptionKeywords: ["amputat"],
  },
  {
    id: "crush_abdomen_pelvis",
    label: "Crush — abdomen / pelvis / genitalia",
    prefixes: ["S38"],
    includeDescriptionKeywords: ["crush"],
    excludeDescriptionKeywords: ["amputat"],
  },
  { id: "crush_shoulder_upper_arm", label: "Crush — shoulder / upper arm", prefixes: ["S47"] },
  { id: "crush_elbow_forearm", label: "Crush — elbow / forearm", prefixes: ["S57"] },
  { id: "crush_wrist_hand_finger", label: "Crush — wrist / hand / finger", prefixes: ["S67"] },
  { id: "crush_hip_thigh", label: "Crush — hip / thigh", prefixes: ["S77"] },
  { id: "crush_knee_lower_leg", label: "Crush — knee / lower leg", prefixes: ["S87"] },
  { id: "crush_ankle_foot_toe", label: "Crush — ankle / foot / toe", prefixes: ["S97"] },
  { id: "crush_traumatic_ischemia", label: "Crush — traumatic ischemia / prolonged compression", prefixes: ["T79.6"] },
];

/** Traumatic amputation of head parts, trunk, and extremities (excludes scalp avulsion S08.0). */
export const AMPUTATION_SCOPE_FAMILIES: IcdScopeFamily[] = [
  {
    id: "amp_head",
    label: "Amputation — head parts",
    prefixes: ["S08"],
    includeDescriptionKeywords: ["amputat"],
  },
  {
    id: "amp_thorax",
    label: "Amputation — thorax / breast",
    prefixes: ["S28"],
    includeDescriptionKeywords: ["amputat"],
  },
  {
    id: "amp_abdomen_pelvis",
    label: "Amputation — abdomen / pelvis / genitalia",
    prefixes: ["S38"],
    includeDescriptionKeywords: ["amputat"],
  },
  { id: "amp_shoulder_arm", label: "Amputation — shoulder / upper arm", prefixes: ["S48"] },
  { id: "amp_forearm", label: "Amputation — forearm", prefixes: ["S58"] },
  { id: "amp_wrist_hand_finger", label: "Amputation — wrist / hand / finger", prefixes: ["S68"] },
  { id: "amp_hip_thigh", label: "Amputation — hip / thigh", prefixes: ["S78"] },
  { id: "amp_lower_leg", label: "Amputation — lower leg", prefixes: ["S88"] },
  { id: "amp_ankle_foot_toe", label: "Amputation — ankle / foot / toe", prefixes: ["S98"] },
];

/** Foreign bodies: cavities (T15–T19), open wound with FB, penetrating ocular FB, superficial FB. */
export const FOREIGN_BODY_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "fb_eye", label: "Foreign body — eye", prefixes: ["T15"] },
  { id: "fb_ear", label: "Foreign body — ear", prefixes: ["T16"] },
  { id: "fb_respiratory", label: "Foreign body — respiratory tract (incl. nose)", prefixes: ["T17"] },
  { id: "fb_gi", label: "Foreign body — alimentary tract", prefixes: ["T18"] },
  { id: "fb_gu", label: "Foreign body — genitourinary tract", prefixes: ["T19"] },
  {
    id: "fb_ocular_penetrating",
    label: "Foreign body — penetrating wound eyeball",
    prefixes: ["S05.5"],
    includeDescriptionKeywords: ["foreign body"],
  },
  {
    id: "fb_open_wound",
    label: "Foreign body — open wound with foreign body",
    prefixes: ["S01", "S11", "S21", "S31", "S41", "S51", "S61", "S71", "S81", "S91"],
    includeDescriptionKeywords: ["foreign body", "w fb"],
    excludeDescriptionKeywords: ["without foreign body", "w/o foreign body", "wo foreign body"],
  },
  {
    id: "fb_superficial",
    label: "Foreign body — superficial",
    prefixes: ["S00", "S10", "S20", "S30", "S40", "S50", "S60", "S70", "S80", "S90"],
    includeDescriptionKeywords: ["superficial foreign body", "superficial fb"],
  },
];

export function selectCrushScopedCodes(
  rows: Parameters<typeof selectScopedCodes>[0],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, CRUSH_SCOPE_FAMILIES, opts);
}

export function selectAmputationScopedCodes(
  rows: Parameters<typeof selectScopedCodes>[0],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, AMPUTATION_SCOPE_FAMILIES, opts);
}

export function selectForeignBodyScopedCodes(
  rows: Parameters<typeof selectScopedCodes>[0],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, FOREIGN_BODY_SCOPE_FAMILIES, opts);
}

export function codeInAnyFamily(
  row: Parameters<typeof rowInFamily>[0],
  families: IcdScopeFamily[],
): boolean {
  return families.some((f) => rowInFamily(row, f));
}
