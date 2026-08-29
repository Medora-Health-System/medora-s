/**
 * INP.DIS.1F.2 — Tests for disposition print fact collection.
 */

import { describe, expect, it } from "vitest";
import { collectInpatientDispositionPrintFacts } from "./inpatientDispositionPrintInpDis1f2.js";
import { emptyInpatientProviderDischarge } from "./inpatientProviderDischargeInpDis1b.js";
import { emptyInpatientNursingDischarge } from "./inpatientNursingDischargeInpDis1d.js";
import type { InpatientProviderDischargeV1C } from "./inpatientProviderDischargeInpDis1c.js";

describe("collectInpatientDispositionPrintFacts", () => {
  it("preserves ELOPED clinical code and eloped facts; skips empties", () => {
    const provider = emptyInpatientProviderDischarge() as InpatientProviderDischargeV1C;
    provider.finalDisposition = {
      code: "ELOPED",
      eloped: {
        lastKnownLocation: "Ward 3",
        providerNotified: true,
        notes: "",
      },
    };
    const nursing = emptyInpatientNursingDischarge();
    nursing.eloped = {
      discoveredAt: "2026-08-28T12:00:00.000Z",
      chargeNurseNotified: true,
    };
    const facts = collectInpatientDispositionPrintFacts({
      inpatientProviderDischarge: provider,
      inpatientNursingDischarge: nursing,
    });
    expect(facts.find((f) => f.key === "clinicalDispositionCode")?.value).toBe("ELOPED");
    expect(facts.find((f) => f.key === "eloped.lastKnownLocation")?.value).toBe("Ward 3");
    expect(facts.find((f) => f.key === "eloped.providerNotified")?.value).toBe("YES");
    expect(facts.find((f) => f.key === "nursing.eloped.discoveredAt")?.value).toContain("2026");
    expect(facts.some((f) => f.key === "eloped.notes")).toBe(false);
  });

  it("includes transfer packet and nursing document flags when present", () => {
    const provider = emptyInpatientProviderDischarge() as InpatientProviderDischargeV1C;
    provider.finalDisposition = {
      code: "TRANSFER_ACUTE_CARE",
      transfer: {
        receivingHospital: "General Hospital",
        reasonCode: "HIGHER_LEVEL_OF_CARE",
        documentsSent: "Summary + MAR",
      },
    };
    const nursing = emptyInpatientNursingDischarge();
    nursing.handoff = {
      reportCalled: true,
      documentsSent: {
        dischargeSummary: true,
        imaging: true,
        other: true,
        otherDetails: "Wound photos",
      },
    };
    const facts = collectInpatientDispositionPrintFacts({
      inpatientProviderDischarge: provider,
      inpatientNursingDischarge: nursing,
    });
    expect(facts.find((f) => f.key === "receivingHospital")?.value).toBe("General Hospital");
    expect(facts.find((f) => f.key === "transferReason")?.value).toBe("HIGHER_LEVEL_OF_CARE");
    expect(facts.find((f) => f.key === "nursing.docs.imaging")?.value).toBe("YES");
    expect(facts.find((f) => f.key === "nursing.docs.otherDetails")?.value).toBe("Wound photos");
  });

  it("includes AMA checklist without inventing form/witness fields", () => {
    const provider = emptyInpatientProviderDischarge() as InpatientProviderDischargeV1C;
    provider.finalDisposition = {
      code: "AGAINST_MEDICAL_ADVICE",
      ama: {
        capacityDocumented: true,
        risksDiscussed: true,
        notes: "Patient declined stay",
      },
    };
    const facts = collectInpatientDispositionPrintFacts({
      inpatientProviderDischarge: provider,
    });
    expect(facts.find((f) => f.key === "ama.capacityDocumented")?.value).toBe("YES");
    expect(facts.some((f) => f.key.toLowerCase().includes("witness"))).toBe(false);
    expect(facts.some((f) => f.key.toLowerCase().includes("formSigned"))).toBe(false);
  });
});
