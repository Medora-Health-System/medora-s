/**
 * Official ICD-10-CM scope for penetrating trauma production certification.
 * Broad organ and vessel chapters are intentionally included in full; open-wound
 * chapters are restricted to penetrating / puncture descriptions and exclude bites.
 */
import {
  type IcdScopeFamily,
  selectScopedCodes,
  type ScopedOfficialCode,
} from "./icd10-tendon-ligament-scope";

export const OPEN_WOUND_PENETRATING_SCOPE_FAMILIES: IcdScopeFamily[] = [
  {
    id: "penetrating_open_wound_head",
    label: "Penetrating open wound of head",
    prefixes: ["S01"],
    includeDescriptionKeywords: ["puncture", "penet", "penetrating"],
    excludeDescriptionKeywords: ["bite", "bitten"],
  },
  {
    id: "penetrating_open_wound_neck",
    label: "Penetrating open wound of neck",
    prefixes: ["S11"],
    includeDescriptionKeywords: ["puncture", "penet", "penetrating"],
    excludeDescriptionKeywords: ["bite", "bitten"],
  },
  {
    id: "penetrating_open_wound_chest",
    label: "Penetrating open wound of thorax",
    prefixes: ["S21"],
    includeDescriptionKeywords: ["puncture", "penet", "penetrating"],
    excludeDescriptionKeywords: ["bite", "bitten"],
  },
  {
    id: "penetrating_open_wound_abdomen",
    label: "Penetrating open wound of abdomen",
    prefixes: ["S31"],
    includeDescriptionKeywords: ["puncture", "penet", "penetrating"],
    excludeDescriptionKeywords: ["bite", "bitten"],
  },
  {
    id: "penetrating_open_wound_upper_arm",
    label: "Penetrating open wound of upper arm",
    prefixes: ["S41"],
    includeDescriptionKeywords: ["puncture", "penet", "penetrating"],
    excludeDescriptionKeywords: ["bite", "bitten"],
  },
  {
    id: "penetrating_open_wound_forearm",
    label: "Penetrating open wound of forearm",
    prefixes: ["S51"],
    includeDescriptionKeywords: ["puncture", "penet", "penetrating"],
    excludeDescriptionKeywords: ["bite", "bitten"],
  },
  {
    id: "penetrating_open_wound_hand",
    label: "Penetrating open wound of wrist, hand, or finger",
    prefixes: ["S61"],
    includeDescriptionKeywords: ["puncture", "penet", "penetrating"],
    excludeDescriptionKeywords: ["bite", "bitten"],
  },
  {
    id: "penetrating_open_wound_thigh",
    label: "Penetrating open wound of thigh",
    prefixes: ["S71"],
    includeDescriptionKeywords: ["puncture", "penet", "penetrating"],
    excludeDescriptionKeywords: ["bite", "bitten"],
  },
  {
    id: "penetrating_open_wound_lower_leg",
    label: "Penetrating open wound of lower leg",
    prefixes: ["S81"],
    includeDescriptionKeywords: ["puncture", "penet", "penetrating"],
    excludeDescriptionKeywords: ["bite", "bitten"],
  },
  {
    id: "penetrating_open_wound_foot",
    label: "Penetrating open wound of ankle or foot",
    prefixes: ["S91"],
    includeDescriptionKeywords: ["puncture", "penet", "penetrating"],
    excludeDescriptionKeywords: ["bite", "bitten"],
  },
];

export const ORGAN_VASCULAR_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "penetrating_eye", label: "Penetrating injury of eye and orbit", prefixes: ["S05"], includeDescriptionKeywords: ["penetrating", "penet"] },
  { id: "penetrating_neck_vessels", label: "Injury of blood vessels at neck level", prefixes: ["S15"] },
  { id: "penetrating_thoracic_vessels", label: "Injury of blood vessels of thorax", prefixes: ["S25"] },
  { id: "penetrating_heart", label: "Injury of heart", prefixes: ["S26"] },
  { id: "penetrating_thoracic_organs", label: "Injury of other and unspecified intrathoracic organs", prefixes: ["S27"] },
  { id: "penetrating_abdominopelvic_vessels", label: "Injury of blood vessels at abdomen, lower back, and pelvis", prefixes: ["S35"] },
  { id: "penetrating_intra_abdominal_organs", label: "Injury of intra-abdominal organs", prefixes: ["S36"] },
  { id: "penetrating_urinary_pelvic_organs", label: "Injury of urinary and pelvic organs", prefixes: ["S37"] },
  { id: "penetrating_upper_arm_vessels", label: "Injury of blood vessels at shoulder and upper arm level", prefixes: ["S45"] },
  { id: "penetrating_forearm_vessels", label: "Injury of blood vessels at forearm level", prefixes: ["S55"] },
  { id: "penetrating_wrist_hand_vessels", label: "Injury of blood vessels at wrist, hand, and finger level", prefixes: ["S65"] },
  { id: "penetrating_thigh_vessels", label: "Injury of blood vessels at hip and thigh level", prefixes: ["S75"] },
  { id: "penetrating_lower_leg_vessels", label: "Injury of blood vessels at lower leg level", prefixes: ["S85"] },
  { id: "penetrating_ankle_foot_vessels", label: "Injury of blood vessels at ankle and foot level", prefixes: ["S95"] },
];

const PENETRATING_TRAUMA_SCOPE_FAMILIES = [
  ...OPEN_WOUND_PENETRATING_SCOPE_FAMILIES,
  ...ORGAN_VASCULAR_SCOPE_FAMILIES,
];

export function selectPenetratingTraumaScopedCodes(
  rows: Parameters<typeof selectScopedCodes>[0],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, PENETRATING_TRAUMA_SCOPE_FAMILIES, opts);
}
