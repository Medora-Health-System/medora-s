/**
 * M1.6D — Hard billing gate for Enterprise Wave 2 product activation.
 */

import {
  evaluateEnterpriseWave2BillingActivationGate,
  type EnterpriseWave2BillingSnapshot,
} from "@medora/shared";
import type { ActivationGateBlockerCode } from "./medication-product-activation-gates.util";
import { productHasEnterpriseWave2GovernanceMarker } from "./enterprise-wave2.constants";

export function productHasEnterpriseWave2LinkageMarker(governanceNotes: string | null): boolean {
  return productHasEnterpriseWave2GovernanceMarker(governanceNotes);
}

export function evaluateEnterpriseWave2ActivationBillingGate(params: {
  governanceNotes: string | null;
  snapshot: EnterpriseWave2BillingSnapshot;
}): { allowed: boolean; blockers: ActivationGateBlockerCode[] } {
  if (!productHasEnterpriseWave2LinkageMarker(params.governanceNotes)) {
    return { allowed: true, blockers: [] };
  }

  const gate = evaluateEnterpriseWave2BillingActivationGate(params.snapshot);
  const blockers: ActivationGateBlockerCode[] = [];
  for (const failure of gate.failures) {
    if (failure.includes("MedicationBillingProfile")) {
      blockers.push("BILLING_REVIEW_REQUIRED");
    } else if (failure.toLowerCase().includes("ndc")) {
      blockers.push("NDC_REVIEW_REQUIRED");
    } else if (failure.toLowerCase().includes("hcpcs") || failure.toLowerCase().includes("j-code")) {
      blockers.push("BILLING_CODE_REQUIRED");
    } else {
      blockers.push("BILLING_REVIEW_REQUIRED");
    }
  }

  return {
    allowed: gate.allowed,
    blockers: [...new Set(blockers)],
  };
}
