/**
 * MEDUI.MEDS.ENTERPRISE_IVPB_RUNTIME_METADATA_REMEDIATION_WAVE.1
 * Maps enterprise IVPB catalog codes to canonical Haiti runtime rows with identical
 * search dimensions. Runtime metadata is inherited — no duplicate Haiti seed rows.
 */
export const HAITI_IVPB_RUNTIME_CATALOG_CODE_ALIASES: Readonly<Record<string, string>> = {
  DEXTROSE_5_500_ML_PERFUSION_INTRAVEINEUSE: "DEXTROSE_5_500_ML_PERFUSION_INTRAVENOUS",
  DOPAMINE_400_MG_250_ML_PERFUSION_INTRAVEINEUSE: "DOPAMINE_400MG_250ML_IV",
};

export function resolveIvpbRuntimeCatalogCodeAlias(catalogCode: string): string {
  return HAITI_IVPB_RUNTIME_CATALOG_CODE_ALIASES[catalogCode.trim()] ?? catalogCode.trim();
}
