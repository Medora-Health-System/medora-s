import { DiagnosticOutboundDeliveryStore } from "./diagnostic-outbound-delivery.store";

describe("DiagnosticOutboundDeliveryStore", () => {
  it("rejects a conflicting idempotency identity", async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{
        id: "delivery-1",
        integrationId: "integration-1",
        facilityId: "facility-1",
        orderItemId: "order-1",
        idempotencyKey: "old-key",
        domain: "LAB",
        state: "prepared",
        attemptCount: 0,
        nextAttemptAt: null,
        acknowledgedAt: null,
      }]),
    } as any;
    const store = new DiagnosticOutboundDeliveryStore(prisma);
    await expect(store.prepare({
      integrationId: "integration-1",
      facilityId: "facility-1",
      orderItemId: "order-1",
      idempotencyKey: "new-key",
      domain: "LAB",
    })).rejects.toThrow("Diagnostic delivery identity conflict");
  });

  it("requires a 2xx response before acknowledgement persistence", async () => {
    const prisma = { $executeRaw: jest.fn() } as any;
    const store = new DiagnosticOutboundDeliveryStore(prisma);
    await expect(store.acknowledge({
      id: "delivery-1", integrationId: "integration-1", facilityId: "facility-1", partnerStatusCode: 500,
    })).resolves.toBe(false);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it("returns false when facility/integration-scoped acknowledgement updates no row", async () => {
    const prisma = { $executeRaw: jest.fn().mockResolvedValue(0) } as any;
    const store = new DiagnosticOutboundDeliveryStore(prisma);
    await expect(store.acknowledge({
      id: "delivery-1", integrationId: "integration-1", facilityId: "wrong-facility", partnerStatusCode: 202,
    })).resolves.toBe(false);
  });
});
