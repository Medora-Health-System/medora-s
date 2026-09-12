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

  it("logs AI_REVIEW_REQUESTED with metadata-only payload", async () => {
    const { service, auditLogMock } = await createService();
    await service.log(
      "AI_REVIEW_REQUESTED",
      {
        aiAction: "AI_REVIEW_REQUESTED",
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
    expect(input.metadata).toEqual(
      expect.objectContaining({
        aiAction: "AI_REVIEW_REQUESTED",
        facilityId: "fac-1",
        encounterId: "enc-1",
        snapshotVersion: "v1/abc",
        provider: "NO_OP",
      })
    );
  });

  it("logs AI_SUGGESTION_DISPLAYED as VIEW action", async () => {
    const { service, auditLogMock } = await createService();
    await service.log(
      "AI_SUGGESTION_DISPLAYED",
      {
        aiAction: "AI_SUGGESTION_DISPLAYED",
        facilityId: "fac-1",
        encounterId: "enc-1",
        suggestionId: "sug-1",
        category: "CLINICAL_SAFETY",
        provider: "NO_OP",
      },
      "user-1"
    );

    expect(auditLogMock).toHaveBeenCalledTimes(1);
    const [action] = auditLogMock.mock.calls[0];
    expect(action).toBe(AuditAction.VIEW);
  });

  it("does not include raw prompts or responses in metadata", async () => {
    const { service, auditLogMock } = await createService();
    await service.log(
      "AI_REVIEW_COMPLETED",
      {
        aiAction: "AI_REVIEW_COMPLETED",
        facilityId: "fac-1",
        encounterId: "enc-1",
        snapshotVersion: "v1/abc",
      },
      "user-1"
    );

    const metadata = auditLogMock.mock.calls[0][2].metadata;
    expect(metadata).not.toHaveProperty("prompt");
    expect(metadata).not.toHaveProperty("rawResponse");
    expect(metadata).not.toHaveProperty("chartText");
    expect(metadata).not.toHaveProperty("mrn");
    expect(metadata).not.toHaveProperty("accessToken");
  });
});
