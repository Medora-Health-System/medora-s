import { OrderEventType } from "@prisma/client";
import { isResultClinicianAckOrderEvent } from "./order-lifecycle-event.util";

describe("isResultClinicianAckOrderEvent", () => {
  it("identifies provider result acknowledgment audit events", () => {
    expect(
      isResultClinicianAckOrderEvent({
        eventType: OrderEventType.COMPLETED,
        metadata: {
          lifecycleOutcome: "ACKNOWLEDGED",
          source: "RESULT_SERVICE",
        },
      })
    ).toBe(true);
  });

  it("does not treat order-line acknowledge as result clinician ack", () => {
    expect(
      isResultClinicianAckOrderEvent({
        eventType: OrderEventType.STARTED,
        metadata: {
          lifecycleOutcome: "ACKNOWLEDGED",
        },
      })
    ).toBe(false);
  });
});
