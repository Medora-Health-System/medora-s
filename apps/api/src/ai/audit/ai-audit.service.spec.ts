import { Test } from "@nestjs/testing";
import { AuditAction } from "@prisma/client";
import { AuditService } from "../../common/services/audit.service";
import { AiAuditService } from "./ai-audit.service";

describe("AiAuditService", () => {
  async function createService() {
    const auditLogMock = jest.fn();
    const auditService = {
      log: auditLogMock,
    } as unknown as AuditService;

    const module = await Test.createTestingModule({
      providers: [AiAuditService, { provide: AuditService, useValue: auditService }],
    }).compile();

    return { service: module.get(AiAuditService), auditLogMock };
  }

  it("uses the explicit action as the single source of truth and logs only PHI-safe metadata", async () => {
    const { service, auditLogMock } = await createService();

    await service.log(
      "AI_REVIEW_COMPLETED",
      {
        facilityId: "fac-1",
        encounterId: "enc-1",
        snapshotVersion: "v1/abc",
        provider: "NO_OP",
      },
      "user-1"
    );

    expect(auditLogMock).toHaveBeenCalledTimes(1);
    const [action, entityType, input] = auditLogMock.mock.calls[0];
    expect(action).toBe(AuditAction.CREATE);
    expect(entityType).toBe("AI_REVIEW");
    expect(input.userId).toBe("user-1");
    expect(input.facilityId).toBe("fac-1");
    expect(input.encounterId).toBe("enc-1");
    expect(input.patientId).toBeUndefined();
    expect(input.metadata).toEqual({
      aiAction: "AI_REVIEW_COMPLETED",
      facilityId: "fac-1",
      encounterId: "enc-1",
      snapshotVersion: "v1/abc",
      suggestionId: undefined,
      category: undefined,
      provider: "NO_OP",
    });
  });

  it("maps suggestion events to VIEW and does not propagate unexpected metadata fields", async () => {
    const { service, auditLogMock } = await createService();

    await service.log(
      "AI_SUGGESTION_HELPFUL",
      {
        facilityId: "fac-1",
        encounterId: "enc-1",
        suggestionId: "sug-1",
        category: "CLINICAL_SAFETY",
        patientName: "DO NOT LOG",
        prompt: "DO NOT LOG",
        rawResponse: "DO NOT LOG",
      } as any,
      "user-1"
    );

    expect(auditLogMock).toHaveBeenCalledTimes(1);
    const [action, entityType, input] = auditLogMock.mock.calls[0];
    expect(action).toBe(AuditAction.VIEW);
    expect(entityType).toBe("AI_REVIEW");
    expect(input.metadata.aiAction).toBe("AI_SUGGESTION_HELPFUL");
    expect(input.metadata.suggestionId).toBe("sug-1");
    expect(input.metadata.category).toBe("CLINICAL_SAFETY");
    expect(input.metadata).not.toHaveProperty("patientName");
    expect(input.metadata).not.toHaveProperty("prompt");
    expect(input.metadata).not.toHaveProperty("rawResponse");
    expect(input.metadata).not.toHaveProperty("chartText");
    expect(input.metadata).not.toHaveProperty("mrn");
    expect(input.metadata).not.toHaveProperty("accessToken");
  });
});
