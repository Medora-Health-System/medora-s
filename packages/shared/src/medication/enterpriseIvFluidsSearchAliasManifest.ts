/**
 * MEDUI.MEDICATION.IV_FLUIDS_RUNTIME_SEARCH_AND_DB_BACKFILL.1
 * Clinical abbreviation aliases for activated IV fluid catalog codes.
 */

export type IvFluidSearchAliasEntry = {
  catalogCode: string;
  genericName: string;
  displayHint: string;
  aliases: readonly string[];
  searchTerms: readonly string[];
};

function entry(
  catalogCode: string,
  genericName: string,
  displayHint: string,
  aliases: readonly string[],
  searchTerms: readonly string[]
): IvFluidSearchAliasEntry {
  return { catalogCode, genericName, displayHint, aliases, searchTerms };
}

/** Shared NS abbreviation tokens applied to all normal-saline catalog codes. */
const NS_SHARED_ALIASES = [
  "ns",
  "nss",
  "normal saline",
  "sodium chloride",
  "saline",
  "nacl",
  "0.9% ns",
  "0.9 ns",
] as const;

const D5W_SHARED_ALIASES = ["d5", "d5w", "dextrose", "dextrose 5", "dextrose water", "dextrose 5%", "glucose 5%"] as const;

const HALF_NS_ALIASES = [
  "half normal saline",
  "half ns",
  "1/2 ns",
  "0.45 ns",
  "0.45% ns",
  "0.45% sodium chloride",
  "045 ns",
] as const;

const D5_HALF_ALIASES = [
  "d5 half normal",
  "d5 1/2 ns",
  "d5 0.45 ns",
  "d5 0.45",
  "d5 half ns",
  "dextrose half normal",
] as const;

const D5NS_ALIASES = ["d5ns", "d5 ns", "d5 0.9 ns", "d5 0.9% ns", "dextrose normal saline"] as const;

const D5LR_ALIASES = ["d5lr", "d5 lr", "d5 ringer", "d5 lactated ringer", "dextrose lr"] as const;

const LR_ALIASES = [
  "lr",
  "lactated ringer",
  "lactated ringers",
  "ringer lactate",
  "ringer's lactate",
  "rl",
  "lactated ringers solution",
] as const;

export const ENTERPRISE_IV_FLUIDS_SEARCH_ALIAS_MANIFEST: IvFluidSearchAliasEntry[] = [
  entry(
    "SODIUM_CHLORIDE_0_9_250_ML_PERFUSION_INTRAVEINEUSE",
    "Sodium chloride",
    "NS 0.9% 250 mL",
    [...NS_SHARED_ALIASES, "ns 250", "normal saline 250"],
    [...NS_SHARED_ALIASES, "250 ml", "250ml"]
  ),
  entry(
    "SODIUM_CHLORIDE_0_9_500_ML_PERFUSION_INTRAVEINEUSE",
    "Sodium chloride",
    "NS 0.9% 500 mL",
    [...NS_SHARED_ALIASES, "ns 500", "normal saline 500"],
    [...NS_SHARED_ALIASES, "500 ml", "500ml"]
  ),
  entry(
    "NORMAL_SALINE_0.9_500_ML_PERFUSION_INTRAVENOUS",
    "Normal Saline",
    "NS 0.9% 500 mL",
    [...NS_SHARED_ALIASES, "ns 500", "normal saline 500"],
    [...NS_SHARED_ALIASES, "500 ml", "500ml"]
  ),
  entry(
    "SODIUM_CHLORIDE_0_9_1000_ML_PERFUSION_INTRAVEINEUSE",
    "Sodium chloride",
    "NS 0.9% 1000 mL",
    [...NS_SHARED_ALIASES, "ns 1000", "normal saline 1000", "ns 1l"],
    [...NS_SHARED_ALIASES, "1000 ml", "1 l", "1l"]
  ),
  entry(
    "NORMAL_SALINE_0.9_1_L_PERFUSION_INTRAVENOUS",
    "Normal Saline",
    "NS 0.9% 1000 mL",
    [...NS_SHARED_ALIASES, "ns 1000", "normal saline 1000", "ns 1l"],
    [...NS_SHARED_ALIASES, "1000 ml", "1 l", "1l"]
  ),
  entry(
    "SODIUM_CHLORIDE_0_9_10_ML_FLUSH_INTRAVEINEUSE",
    "Sodium chloride",
    "NS flush 10 mL",
    [...NS_SHARED_ALIASES, "saline flush", "ns flush", "line flush", "flush"],
    ["saline flush", "ns flush", "line flush", "10 ml", "rinçage"]
  ),
  entry(
    "DEXTROSE_5_250_ML_PERFUSION_INTRAVEINEUSE",
    "Dextrose",
    "D5W 250 mL",
    [...D5W_SHARED_ALIASES, "d5w 250"],
    [...D5W_SHARED_ALIASES, "250 ml"]
  ),
  entry(
    "DEXTROSE_5_500_ML_PERFUSION_INTRAVEINEUSE",
    "Dextrose",
    "D5W 500 mL",
    [...D5W_SHARED_ALIASES, "d5w 500"],
    [...D5W_SHARED_ALIASES, "500 ml"]
  ),
  entry(
    "DEXTROSE_5_500_ML_PERFUSION_INTRAVENOUS",
    "Dextrose",
    "D5W 500 mL",
    [...D5W_SHARED_ALIASES, "d5w 500"],
    [...D5W_SHARED_ALIASES, "500 ml"]
  ),
  entry(
    "DEXTROSE_5_1000_ML_PERFUSION_INTRAVEINEUSE",
    "Dextrose",
    "D5W 1000 mL",
    [...D5W_SHARED_ALIASES, "d5w 1000", "d5w 1l"],
    [...D5W_SHARED_ALIASES, "1000 ml", "1 l"]
  ),
  entry(
    "SODIUM_CHLORIDE_0_45_500_ML_PERFUSION_INTRAVEINEUSE",
    "Sodium chloride",
    "0.45% NS 500 mL",
    [...HALF_NS_ALIASES, "half normal 500"],
    [...HALF_NS_ALIASES, "500 ml"]
  ),
  entry(
    "SODIUM_CHLORIDE_0_45_1000_ML_PERFUSION_INTRAVEINEUSE",
    "Sodium chloride",
    "0.45% NS 1000 mL",
    [...HALF_NS_ALIASES, "half normal 1000"],
    [...HALF_NS_ALIASES, "1000 ml", "1 l"]
  ),
  entry(
    "DEXTROSE_SALINE_5_0_45_PERFUSION_INTRAVEINEUSE",
    "Dextrose + Saline",
    "D5 0.45% NS",
    [...D5_HALF_ALIASES],
    [...D5_HALF_ALIASES, "maintenance fluid"]
  ),
  entry(
    "DEXTROSE_SALINE_5_PER_0.9_PERFUSION_INTRAVENOUS",
    "Dextrose + Saline",
    "D5 0.9% NS",
    [...D5NS_ALIASES],
    [...D5NS_ALIASES]
  ),
  entry(
    "DEXTROSE_5_RINGER_LACTATE_1000_ML_PERFUSION_INTRAVEINEUSE",
    "Dextrose + Ringer Lactate",
    "D5 LR 1000 mL",
    [...D5LR_ALIASES],
    [...D5LR_ALIASES, "1000 ml"]
  ),
  entry(
    "RINGER_LACTATE_500_ML_PERFUSION_INTRAVENOUS",
    "Ringer Lactate",
    "LR 500 mL",
    [...LR_ALIASES, "lr 500"],
    [...LR_ALIASES, "500 ml"]
  ),
  entry(
    "RINGER_LACTATE_1_L_PERFUSION_INTRAVENOUS",
    "Ringer Lactate",
    "LR 1000 mL",
    [...LR_ALIASES, "lr 1000", "lr 1l"],
    [...LR_ALIASES, "1000 ml", "1 l"]
  ),
  entry(
    "PLASMALYTE_1000_ML_PERFUSION_INTRAVEINEUSE",
    "Plasma-Lyte",
    "Plasma-Lyte 1000 mL",
    ["plasmalyte", "plasma lyte", "plasma-lyte", "balanced crystalloid"],
    ["plasmalyte", "plasma lyte", "balanced crystalloid", "1000 ml"]
  ),
  entry(
    "NORMOSOL_1000_ML_PERFUSION_INTRAVEINEUSE",
    "Normosol",
    "Normosol 1000 mL",
    ["normosol", "normosol-r", "balanced crystalloid"],
    ["normosol", "1000 ml"]
  ),
];

export const ENTERPRISE_IV_FLUIDS_SEARCH_ALIAS_BY_CODE = Object.fromEntries(
  ENTERPRISE_IV_FLUIDS_SEARCH_ALIAS_MANIFEST.map((row) => [row.catalogCode, row])
) as Record<string, IvFluidSearchAliasEntry>;

/** Query-level expansions for short clinical abbreviations (merged into catalog search). */
export const IV_FLUID_SEARCH_QUERY_EXPANSIONS: Readonly<Record<string, readonly string[]>> = {
  ns: ["normal saline", "sodium chloride", "saline", "nss", "nacl"],
  nss: ["normal saline", "sodium chloride", "saline", "ns"],
  saline: ["normal saline", "sodium chloride", "ns"],
  "normal saline": ["ns", "sodium chloride", "saline"],
  "sodium chloride": ["normal saline", "ns", "saline"],
  "saline flush": ["ns flush", "line flush"],
  d5: ["d5w", "dextrose", "dextrose 5", "dextrose water"],
  d5w: ["d5", "dextrose", "dextrose 5", "dextrose water"],
  dextrose: ["d5", "d5w", "dextrose 5"],
  "d5 1/2 ns": ["d5 0.45 ns", "d5 half normal", "dextrose 0.45", "half normal saline"],
  "d5 0.45": ["d5 0.45 ns", "d5 half normal", "half normal saline"],
  "d5 0.45 ns": ["d5 half normal", "d5 1/2 ns", "half normal saline"],
  d5ns: ["d5 ns", "d5 0.9 ns", "dextrose normal saline"],
  "d5 ns": ["d5ns", "d5 0.9 ns"],
  d5lr: ["d5 lr", "d5 lactated ringer", "dextrose lr"],
  "d5 lr": ["d5lr", "d5 lactated ringer"],
  lr: ["lactated ringer", "ringer lactate", "lactated ringers", "rl"],
  "lactated ringer": ["lr", "ringer lactate", "rl"],
  "ringer lactate": ["lr", "lactated ringer", "rl"],
  "half normal saline": ["0.45 ns", "1/2 ns", "0.45% ns"],
  "1/2 ns": ["half normal saline", "0.45 ns", "d5 1/2 ns"],
  "0.45 ns": ["half normal saline", "1/2 ns"],
  plasmalyte: ["plasma lyte", "plasma-lyte", "plasmalyte"],
  "plasma lyte": ["plasmalyte", "plasma-lyte"],
  normosol: ["normosol-r"],
};

export function buildIvFluidSearchQueryExpansions(): Readonly<Record<string, readonly string[]>> {
  return IV_FLUID_SEARCH_QUERY_EXPANSIONS;
}
