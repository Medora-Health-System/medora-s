/**
 * MEDUI.MEDICATION.GOVERNED_ACTIVATION_FRAMEWORK.1
 * Static billing / NDC readiness lookup across enterprise wave manifests.
 */

import { ENTERPRISE_WAVE1_BILLING_BY_CODE } from "./enterpriseWave1BillingManifest.js";
import { ENTERPRISE_WAVE2_BILLING_BY_CODE } from "./enterpriseWave2BillingManifest.js";
import { ENTERPRISE_WAVE3_BILLING_BY_CODE } from "./enterpriseWave3BillingManifest.js";
import { ENTERPRISE_WAVE4_ED_HOSPITAL_BILLING_BY_CODE } from "./enterpriseWave4EdHospitalBillingManifest.js";
import { ENTERPRISE_ONCOLOGY_BILLING_BY_CODE } from "./enterpriseOncologyBillingManifest.js";
import { ENTERPRISE_NEUROLOGY_INFECTIOUS_DISEASE_BILLING_BY_CODE } from "./enterpriseNeurologyInfectiousDiseaseBillingManifest.js";
import { ENTERPRISE_CARDIOLOGY_BILLING_BY_CODE } from "./enterpriseCardiologyBillingManifest.js";
import { ENTERPRISE_IV_FLUIDS_BILLING_BY_CODE } from "./enterpriseIvFluidsBillingManifest.js";
import { MEDICATION_BILLING_NDC_BY_CATALOG_CODE } from "./medicationBillingNdcByCatalogCode.js";

export type MedicationBillingReadiness = {
  billingReady: boolean;
  ndcReady: boolean;
  hcpcs: string | null;
  ndc11: string | null;
  source: "wave1" | "wave2" | "wave3" | "wave4" | "oncology" | "neurology_infectious_disease" | "cardiology" | "iv_fluids" | "haiti_ndc_map" | "none";
};

function ndcFromEntry(entry: { ndc11?: string } | undefined): string | null {
  const n = entry?.ndc11?.trim();
  return n && n.length >= 11 ? n : null;
}

export function resolveMedicationBillingReadiness(catalogCode: string): MedicationBillingReadiness {
  const w1 = ENTERPRISE_WAVE1_BILLING_BY_CODE[catalogCode];
  if (w1) {
    const ndc = ndcFromEntry(w1);
    return {
      billingReady: Boolean(w1.hcpcs?.trim()),
      ndcReady: Boolean(ndc),
      hcpcs: w1.hcpcs ?? null,
      ndc11: ndc,
      source: "wave1",
    };
  }
  const w2 = ENTERPRISE_WAVE2_BILLING_BY_CODE[catalogCode];
  if (w2) {
    const ndc = ndcFromEntry(w2);
    return {
      billingReady: Boolean(w2.hcpcs?.trim()),
      ndcReady: Boolean(ndc),
      hcpcs: w2.hcpcs ?? null,
      ndc11: ndc,
      source: "wave2",
    };
  }
  const w3 = ENTERPRISE_WAVE3_BILLING_BY_CODE[catalogCode];
  if (w3) {
    const ndc = ndcFromEntry(w3);
    return {
      billingReady: Boolean(w3.hcpcs?.trim()),
      ndcReady: Boolean(ndc),
      hcpcs: w3.hcpcs ?? null,
      ndc11: ndc,
      source: "wave3",
    };
  }
  const w4 = ENTERPRISE_WAVE4_ED_HOSPITAL_BILLING_BY_CODE[catalogCode];
  if (w4) {
    const ndc = ndcFromEntry(w4);
    return {
      billingReady: Boolean(w4.hcpcs?.trim()),
      ndcReady: Boolean(ndc),
      hcpcs: w4.hcpcs ?? null,
      ndc11: ndc,
      source: "wave4",
    };
  }
  const oncology = ENTERPRISE_ONCOLOGY_BILLING_BY_CODE[catalogCode];
  if (oncology) {
    const ndc = ndcFromEntry(oncology);
    return {
      billingReady: Boolean(oncology.hcpcs?.trim()),
      ndcReady: Boolean(ndc),
      hcpcs: oncology.hcpcs ?? null,
      ndc11: ndc,
      source: "oncology",
    };
  }
  const neurologyInfectiousDisease = ENTERPRISE_NEUROLOGY_INFECTIOUS_DISEASE_BILLING_BY_CODE[catalogCode];
  if (neurologyInfectiousDisease) {
    const ndc = ndcFromEntry(neurologyInfectiousDisease);
    return {
      billingReady: Boolean(neurologyInfectiousDisease.hcpcs?.trim()),
      ndcReady: Boolean(ndc),
      hcpcs: neurologyInfectiousDisease.hcpcs ?? null,
      ndc11: ndc,
      source: "neurology_infectious_disease",
    };
  }
  const cardiology = ENTERPRISE_CARDIOLOGY_BILLING_BY_CODE[catalogCode];
  if (cardiology) {
    const ndc = ndcFromEntry(cardiology);
    return {
      billingReady: Boolean(cardiology.hcpcs?.trim()),
      ndcReady: Boolean(ndc),
      hcpcs: cardiology.hcpcs ?? null,
      ndc11: ndc,
      source: "cardiology",
    };
  }
  const ivFluids = ENTERPRISE_IV_FLUIDS_BILLING_BY_CODE[catalogCode];
  if (ivFluids) {
    const ndc = ndcFromEntry(ivFluids);
    return {
      billingReady: Boolean(ivFluids.hcpcs?.trim()),
      ndcReady: Boolean(ndc),
      hcpcs: ivFluids.hcpcs ?? null,
      ndc11: ndc,
      source: "iv_fluids",
    };
  }
  const haitiNdc = MEDICATION_BILLING_NDC_BY_CATALOG_CODE[catalogCode];
  if (haitiNdc) {
    return {
      billingReady: true,
      ndcReady: true,
      hcpcs: null,
      ndc11: haitiNdc.ndc11,
      source: "haiti_ndc_map",
    };
  }
  return {
    billingReady: false,
    ndcReady: false,
    hcpcs: null,
    ndc11: null,
    source: "none",
  };
}
