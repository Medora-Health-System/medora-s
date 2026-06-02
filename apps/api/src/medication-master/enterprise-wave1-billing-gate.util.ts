/**
 * M1.6B — Hard billing gate for Enterprise Wave 1 product activation.
 */

import {
  evaluateEnterpriseWave1BillingActivationGate,
  type EnterpriseWave1BillingSnapshot,
} from "@medora/shared";
import type { ActivationGateBlockerCode } from "./medication-product-activation-gates.util";
import { ENTERPRISE_M16B_WAVE1_LINKAGE_MARKER } from "./enterprise-wave1.constants";

export function productHasEnterpriseWave1LinkageMarker(governanceNotes: string | null): boolean {
  return (governanceNotes ?? "").includes(ENTERPRISE_M16B_WAVE1_LINKAGE_MARKER);
}

export function evaluateEnterpriseWave1ActivationBillingGate(params: {
  governanceNotes: string | null;
  snapshot: EnterpriseWave1BillingSnapshot;
}): { allowed: boolean; blockers: ActivationGateBlockerCode[] } {
  if (!productHasEnterpriseWave1LinkageMarker(params.governanceNotes)) {
    return { allowed: true, blockers: [] };
  }

  const gate = evaluateEnterpriseWave1BillingActivationGate(params.snapshot);
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
