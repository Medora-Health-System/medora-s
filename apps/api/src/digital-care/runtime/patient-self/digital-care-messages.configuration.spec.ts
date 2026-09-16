import { ForbiddenException } from "@nestjs/common";
import { DigitalCareMessagesController } from "./digital-care-messages.controller";

describe("DigitalCareMessagesController facility configuration", () => {
  const principal = { portalAccountId: "portal-1", sessionId: "session-1" } as any;
  const req = { patientPrincipal: principal, headers: {} } as any;
  const messaging = {
    listThreads: jest.fn().mockResolvedValue([]),
  } as any;

  beforeEach(() => jest.clearAllMocks());

  it("blocks patient messaging when the facility disables Digital Care", async () => {
    const configuration = {
      runtimeForFacility: jest.fn().mockResolvedValue({
        modules: { digitalCare: { enabled: false, visible: false, hidden: true } },
        patientPortal: { enabled: true, messages: true },
        digitalCare: { secureMessaging: true, patientChat: true },
      }),
    } as any;
    const controller = new DigitalCareMessagesController(messaging, configuration);

    await expect(controller.list("facility-a", req)).rejects.toBeInstanceOf(ForbiddenException);
    expect(messaging.listThreads).not.toHaveBeenCalled();
  });

  it("allows patient messaging when the facility enables the complete messaging path", async () => {
    const configuration = {
      runtimeForFacility: jest.fn().mockResolvedValue({
        modules: { digitalCare: { enabled: true, visible: true, hidden: false } },
        patientPortal: { enabled: true, messages: true },
        digitalCare: { secureMessaging: true, patientChat: true },
      }),
    } as any;
    const controller = new DigitalCareMessagesController(messaging, configuration);

    await expect(controller.list("facility-a", req)).resolves.toEqual([]);
    expect(messaging.listThreads).toHaveBeenCalledWith(principal, "facility-a", expect.any(Object));
  });
});