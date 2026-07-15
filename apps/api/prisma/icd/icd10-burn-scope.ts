import {
  type IcdScopeFamily,
  selectScopedCodes,
  type ScopedOfficialCode,
} from "./icd10-tendon-ligament-scope";

export const BURN_SCOPE_FAMILIES: IcdScopeFamily[] = [
  ...["T20", "T21", "T22", "T23", "T24", "T25", "T26", "T27", "T28", "T30", "T31", "T32"].map((prefix) => ({
    id: `burn_${prefix.toLowerCase()}`,
    label: `Burn / corrosion ${prefix}`,
    prefixes: [prefix],
  })),
];

export const FROSTBITE_SCOPE_FAMILIES: IcdScopeFamily[] = ["T33", "T34", "T35"].map((prefix) => ({
  id: `frostbite_${prefix.toLowerCase()}`,
  label: `Frostbite ${prefix}`,
  prefixes: [prefix],
}));

export const ELECTRICAL_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "burn_lightning_t750", label: "Lightning injury (T75.0)", prefixes: ["T75.0"] },
  { id: "burn_electrical_t754", label: "Electrocution (T75.4)", prefixes: ["T75.4"] },
];

export const SUNBURN_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "burn_sunburn_l55", label: "Sunburn", prefixes: ["L55"] },
];

type OfficialRow = Parameters<typeof selectScopedCodes>[0][number];

export function selectBurnScopedCodes(rows: OfficialRow[], opts?: { billableOnly?: boolean }): ScopedOfficialCode[] {
  const families = [...BURN_SCOPE_FAMILIES, ...FROSTBITE_SCOPE_FAMILIES, ...ELECTRICAL_SCOPE_FAMILIES, ...SUNBURN_SCOPE_FAMILIES];
  return selectScopedCodes(rows, families, opts);
}
