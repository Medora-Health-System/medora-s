/**
 * INP.DIS.1H — sessionStorage discharge-order notify dedup.
 */

import { describe, expect, it, beforeEach } from "vitest";
import {
  clearInpatientDischargeOrderNotifyMemory,
  inpatientDischargeOrderNotifyKey,
  markInpatientDischargeOrderNotified,
  nextUnackedInpatientDischargeOrder,
  wasInpatientDischargeOrderNotified,
} from "./inpatientDischargeOrderNotify";

describe("INP.DIS.1H discharge order notify dedup", () => {
  beforeEach(() => {
    clearInpatientDischargeOrderNotifyMemory();
    if (typeof sessionStorage !== "undefined") sessionStorage.clear();
  });

  it("does not re-select after mark (poll-safe)", () => {
    const row = {
      encounterId: "enc-1",
      patientName: "Jehu Garcia",
      unitRoomBed: "MS-3",
      nurseUserId: "rn-1",
      dischargeAwareness: {
        providerFinalized: true,
        providerFinalizedAt: "2026-08-28T12:34:00.000Z",
        dispositionCode: "HOME",
        tone: "ordinary",
      },
    };
    const ctx = { currentUserId: "rn-1", roles: ["RN"] };
    expect(nextUnackedInpatientDischargeOrder([row], ctx)?.encounterId).toBe("enc-1");
    const key = inpatientDischargeOrderNotifyKey(
      row.encounterId,
      row.dischargeAwareness.providerFinalizedAt
    );
    markInpatientDischargeOrderNotified(key);
    expect(wasInpatientDischargeOrderNotified(key)).toBe(true);
    expect(nextUnackedInpatientDischargeOrder([row], ctx)).toBeNull();
  });

  it("draft / no finalize → no candidate", () => {
    expect(
      nextUnackedInpatientDischargeOrder(
        [
          {
            encounterId: "enc-2",
            patientName: "X",
            unitRoomBed: null,
            dischargeAwareness: null,
          },
        ],
        { currentUserId: "rn-1", roles: ["RN"] }
      )
    ).toBeNull();
  });
});
