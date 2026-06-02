/**
 * M1.6B — Enterprise Wave 1 billing manifest (HCPCS / NDC / vaccine CPT / CVX).
 * Illustrative codes for staging — replace with licensed payer sets for production.
 */

import { ENTERPRISE_WAVE1_FORMULARY_MANIFEST } from "./enterpriseWave1FormularyManifest.js";
import type { EnterpriseWave1BillingEntry } from "./enterpriseWave1Types.js";

function ndc(last9: string): { ndc11: string; ndcDisplay: string } {
  const base = `00000${last9}`.slice(-9);
  const ndc11 = `00000${base}`.slice(-11);
  return { ndc11, ndcDisplay: `${ndc11.slice(0, 5)}-${ndc11.slice(5, 9)}-${ndc11.slice(9)}` };
}

type BillingSpec = Omit<EnterpriseWave1BillingEntry, "catalogCode">;

/** Order must match ENTERPRISE_WAVE1_FORMULARY_MANIFEST. */
const BILLING_SPECS: BillingSpec[] = [
  { hcpcs: "J3490", description: "Unclassified drug (warfarin oral)", billingUnitType: "tablet", ...ndc("00001000101") },
  { hcpcs: "J1650", description: "Enoxaparin injection", billingUnitType: "mg", ...ndc("00002000201") },
  { hcpcs: "J3490", description: "Unclassified drug (apixaban oral)", billingUnitType: "tablet", ...ndc("00004000401") },
  { hcpcs: "J3490", description: "Unclassified drug (rivaroxaban oral)", billingUnitType: "tablet", ...ndc("00005000501") },
  { hcpcs: "J3490", description: "Unclassified drug (dabigatran oral)", billingUnitType: "tablet", ...ndc("00006000601") },
  { hcpcs: "J3490", description: "Unclassified drug (edoxaban oral)", billingUnitType: "tablet", ...ndc("00007000701") },
  { hcpcs: "J1644", description: "Heparin injection (per 1000 units)", billingUnitType: "unit", ...ndc("00003000301") },
  { hcpcs: "90686", description: "Influenza virus vaccine", administrationCpt: "90471", cvxCode: "141", ...ndc("00008000801") },
  { hcpcs: "91309", description: "COVID-19 vaccine", administrationCpt: "90471", cvxCode: "309", ...ndc("00009000901") },
  { hcpcs: "90715", description: "Tdap vaccine", administrationCpt: "90471", cvxCode: "115", ...ndc("00010001001") },
  { hcpcs: "90714", description: "Td vaccine", administrationCpt: "90471", cvxCode: "113", ...ndc("00011001101") },
  { hcpcs: "90707", description: "MMR vaccine", administrationCpt: "90471", cvxCode: "03", ...ndc("00012001201") },
  { hcpcs: "90716", description: "Varicella vaccine", administrationCpt: "90471", cvxCode: "21", ...ndc("00013001301") },
  { hcpcs: "90750", description: "Zoster (Shingrix) vaccine", administrationCpt: "90471", cvxCode: "187", ...ndc("00014001401") },
  { hcpcs: "90671", description: "Pneumococcal conjugate vaccine", administrationCpt: "90471", cvxCode: "215", ...ndc("00015001501") },
  { hcpcs: "90632", description: "Hepatitis A vaccine", administrationCpt: "90471", cvxCode: "52", ...ndc("00016001601") },
  { hcpcs: "90746", description: "Hepatitis B vaccine", administrationCpt: "90471", cvxCode: "08", ...ndc("00017001701") },
  { hcpcs: "90651", description: "HPV vaccine", administrationCpt: "90471", cvxCode: "165", ...ndc("00018001801") },
  { hcpcs: "90620", description: "Meningococcal vaccine", administrationCpt: "90471", cvxCode: "147", ...ndc("00019001901") },
  { hcpcs: "90380", description: "RSV vaccine", administrationCpt: "90471", cvxCode: "303", ...ndc("00020002001") },
  { hcpcs: "J3490", description: "Unclassified drug (atorvastatin)", billingUnitType: "tablet", ...ndc("00021002101") },
  { hcpcs: "J3490", description: "Unclassified drug (rosuvastatin)", billingUnitType: "tablet", ...ndc("00022002201") },
  { hcpcs: "J3490", description: "Unclassified drug (glipizide)", billingUnitType: "tablet", ...ndc("00023002301") },
  { hcpcs: "J3490", description: "Unclassified drug (empagliflozin)", billingUnitType: "tablet", ...ndc("00024002401") },
  { hcpcs: "J3490", description: "Unclassified drug (dapagliflozin)", billingUnitType: "tablet", ...ndc("00025002501") },
  { hcpcs: "J3490", description: "Unclassified drug (semaglutide)", billingUnitType: "mg", ...ndc("00026002601") },
  { hcpcs: "J3490", description: "Unclassified drug (tirzepatide)", billingUnitType: "mg", ...ndc("00027002701") },
  { hcpcs: "J3490", description: "Unclassified drug (sertraline)", billingUnitType: "tablet", ...ndc("00028002801") },
  { hcpcs: "J3490", description: "Unclassified drug (escitalopram)", billingUnitType: "tablet", ...ndc("00029002901") },
  { hcpcs: "J3490", description: "Unclassified drug (fluoxetine)", billingUnitType: "tablet", ...ndc("00030003001") },
  { hcpcs: "J3490", description: "Unclassified drug (bupropion)", billingUnitType: "tablet", ...ndc("00031003101") },
  { hcpcs: "J3490", description: "Unclassified drug (finasteride)", billingUnitType: "tablet", ...ndc("00032003201") },
  { hcpcs: "J3490", description: "Unclassified drug (tamsulosin)", billingUnitType: "tablet", ...ndc("00033003301") },
  { hcpcs: "J3490", description: "Unclassified drug (famotidine oral)", billingUnitType: "tablet", ...ndc("00034003401") },
  { hcpcs: "J3490", description: "Unclassified drug (metoprolol oral)", billingUnitType: "tablet", ...ndc("00035003501") },
  { hcpcs: "J3490", description: "Unclassified drug (metformin)", billingUnitType: "tablet", ...ndc("00036003601") },
  { hcpcs: "J3490", description: "Unclassified drug (amlodipine)", billingUnitType: "tablet", ...ndc("00037003701") },
  { hcpcs: "J3490", description: "Unclassified drug (lisinopril)", billingUnitType: "tablet", ...ndc("00038003801") },
  { hcpcs: "J3490", description: "Unclassified drug (losartan)", billingUnitType: "tablet", ...ndc("00039003901") },
  { hcpcs: "J3490", description: "Unclassified drug (HCTZ)", billingUnitType: "tablet", ...ndc("00040004001") },
  { hcpcs: "J3490", description: "Unclassified drug (carvedilol)", billingUnitType: "tablet", ...ndc("00041004101") },
  { hcpcs: "J3490", description: "Unclassified drug (simvastatin)", billingUnitType: "tablet", ...ndc("00042004201") },
  { hcpcs: "J3490", description: "Unclassified drug (levothyroxine)", billingUnitType: "tablet", ...ndc("00043004301") },
  { hcpcs: "J3490", description: "Unclassified drug (omeprazole)", billingUnitType: "capsule", ...ndc("00044004401") },
  { hcpcs: "J3490", description: "Unclassified drug (pantoprazole)", billingUnitType: "tablet", ...ndc("00045004501") },
];

if (BILLING_SPECS.length !== ENTERPRISE_WAVE1_FORMULARY_MANIFEST.length) {
  throw new Error(
    `[wave1-billing] spec count ${BILLING_SPECS.length} != formulary ${ENTERPRISE_WAVE1_FORMULARY_MANIFEST.length}`
  );
}

export const ENTERPRISE_WAVE1_BILLING_MANIFEST: EnterpriseWave1BillingEntry[] =
  ENTERPRISE_WAVE1_FORMULARY_MANIFEST.map((entry, i) => ({
    catalogCode: entry.catalogCode,
    ...BILLING_SPECS[i]!,
  }));

export const ENTERPRISE_WAVE1_BILLING_BY_CODE: Record<string, EnterpriseWave1BillingEntry> =
  Object.fromEntries(ENTERPRISE_WAVE1_BILLING_MANIFEST.map((e) => [e.catalogCode, e]));
