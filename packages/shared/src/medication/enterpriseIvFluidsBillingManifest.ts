/**
 * MEDUI.MEDICATION.IV_FLUIDS_PROVIDER_ORDERING_EXPANSION.1
 * Billing / NDC manifest for IV fluid catalog remediation.
 */

export type IvFluidNdcConfidence = "verified" | "review" | "placeholder";

export type EnterpriseIvFluidBillingEntry = {
  catalogCode: string;
  hcpcs: string;
  description: string;
  billingUnitType: string;
  ndc11: string;
  ndcDisplay: string;
  ndcConfidence: IvFluidNdcConfidence;
};

const HYDRATION = (catalogCode: string, description: string, ndcSuffix: string): EnterpriseIvFluidBillingEntry => ({
  catalogCode,
  hcpcs: "J7030",
  description,
  billingUnitType: "mL",
  ndc11: `0000071${ndcSuffix}`,
  ndcDisplay: `00000-71${ndcSuffix.slice(0, 2)}-${ndcSuffix.slice(2)}`,
  ndcConfidence: "review",
});

export const ENTERPRISE_IV_FLUIDS_BILLING_MANIFEST: EnterpriseIvFluidBillingEntry[] = [
  HYDRATION("SODIUM_CHLORIDE_0_9_250_ML_PERFUSION_INTRAVEINEUSE", "Normal saline 0.9% 250 mL", "0101"),
  HYDRATION("SODIUM_CHLORIDE_0_9_500_ML_PERFUSION_INTRAVEINEUSE", "Normal saline 0.9% 500 mL", "0102"),
  HYDRATION("SODIUM_CHLORIDE_0_9_10_ML_FLUSH_INTRAVEINEUSE", "Normal saline flush 10 mL", "0103"),
  HYDRATION("SODIUM_CHLORIDE_0_45_500_ML_PERFUSION_INTRAVEINEUSE", "Half normal saline 0.45% 500 mL", "0104"),
  HYDRATION("SODIUM_CHLORIDE_0_45_1000_ML_PERFUSION_INTRAVEINEUSE", "Half normal saline 0.45% 1000 mL", "0105"),
  HYDRATION("DEXTROSE_5_250_ML_PERFUSION_INTRAVEINEUSE", "Dextrose 5% 250 mL", "0106"),
  HYDRATION("DEXTROSE_5_500_ML_PERFUSION_INTRAVEINEUSE", "Dextrose 5% 500 mL", "0107"),
  HYDRATION("DEXTROSE_SALINE_5_0_45_PERFUSION_INTRAVEINEUSE", "D5 0.45% NS 1000 mL", "0108"),
  HYDRATION("DEXTROSE_5_RINGER_LACTATE_1000_ML_PERFUSION_INTRAVEINEUSE", "D5 Lactated Ringer 1000 mL", "0109"),
  HYDRATION("PLASMALYTE_1000_ML_PERFUSION_INTRAVEINEUSE", "Plasma-Lyte 1000 mL", "0110"),
  HYDRATION("NORMOSOL_1000_ML_PERFUSION_INTRAVEINEUSE", "Normosol 1000 mL", "0111"),
  HYDRATION("NORMAL_SALINE_0.9_500_ML_PERFUSION_INTRAVENOUS", "Normal saline 0.9% 500 mL (Haiti)", "0112"),
  HYDRATION("NORMAL_SALINE_0.9_1_L_PERFUSION_INTRAVENOUS", "Normal saline 0.9% 1 L (Haiti)", "0113"),
  HYDRATION("DEXTROSE_5_500_ML_PERFUSION_INTRAVENOUS", "Dextrose 5% 500 mL (Haiti)", "0114"),
  HYDRATION("DEXTROSE_SALINE_5_PER_0.9_PERFUSION_INTRAVENOUS", "D5 0.9% NS (Haiti)", "0115"),
  HYDRATION("RINGER_LACTATE_500_ML_PERFUSION_INTRAVENOUS", "Lactated Ringer 500 mL (Haiti)", "0116"),
  HYDRATION("RINGER_LACTATE_1_L_PERFUSION_INTRAVENOUS", "Lactated Ringer 1 L (Haiti)", "0117"),
];

export const ENTERPRISE_IV_FLUIDS_BILLING_BY_CODE = Object.fromEntries(
  ENTERPRISE_IV_FLUIDS_BILLING_MANIFEST.map((entry) => [entry.catalogCode, entry])
) as Record<string, EnterpriseIvFluidBillingEntry>;
