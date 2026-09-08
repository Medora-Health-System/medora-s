import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { AdminIntegrationsService } from "./admin-integrations.service";
import { FhirCapabilityRegistry } from "../fhir/fhir-capability.registry";

describe("AdminIntegrationsService security contract", () => {
  beforeAll(() => { process.env.MEDORA_INTEROP_ENABLED = "true"; });
  afterAll(() => { delete process.env.MEDORA_INTEROP_ENABLED; });
  const authorizedUser = { id: "u", isActive: true, canCreateFacilities: true, userRoles: [{ id: "r" }] };
  const prisma: any = { user: { findUnique: jest.fn().mockResolvedValue(authorizedUser) }, facility: { count: jest.fn().mockResolvedValue(1) }, integration: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() } };
  const audit: any = { log: jest.fn() };
  const service = new AdminIntegrationsService(prisma, audit, new FhirCapabilityRegistry());
  test("normal user is denied by database-backed platform authority", async () => { prisma.user.findUnique.mockResolvedValueOnce({ ...authorizedUser, canCreateFacilities: false }); await expect(service.list("u")).rejects.toBeInstanceOf(ForbiddenException); });
  test("permissions cannot exceed live capability registry", async () => { await expect(service.create("u", { protocol: "FHIR_R4", permissionCodes: ["patient.delete"], facilityIds: [] })).rejects.toBeInstanceOf(BadRequestException); });
  test("facility authorization is explicit and active facilities are verified", async () => { prisma.facility.count.mockResolvedValueOnce(0); await expect(service.create("u", { protocol: "FHIR_R4", permissionCodes: [], facilityIds: ["00000000-0000-0000-0000-000000000001"] })).rejects.toThrow("Unknown or inactive facility"); });
});
