import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { createHash } from "node:crypto";
import { AuditService } from "../common/services/audit.service";
import type { DiagnosticExchangeDomain } from "../interop/integration-event.contracts";
import type { PreparedDiagnosticServiceRequest } from "../interop/diagnostic-outbound-order.contracts";
import { PrismaService } from "../prisma/prisma.service";
import { FhirClinicalService } from "./fhir-clinical.service";

const DIAGNOSTIC_TYPES = ["LAB_TEST", "IMAGING_STUDY"] as const;

@Injectable()
export class FhirDiagnosticOutboundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clinical: FhirClinicalService,
    private readonly audit: AuditService,
  ) {}

  async prepareServiceRequest(input: {
    integrationId: string;
    facilityId: string;
    orderItemId: string;
    actorUserId?: string;
  }): Promise<PreparedDiagnosticServiceRequest> {
    const integration = await this.prisma.integration.findFirst({
      where: { id: input.integrationId },
      include: {
        facilities: true,
        permissions: { select: { capabilityCode: true } },
      },
    });
    if (!integration) throw new NotFoundException("Integration not found");
    if (integration.protocol !== "FHIR_R4") throw new BadRequestException("Diagnostic outbound exchange requires FHIR R4");
    if (!(["OUTBOUND", "BIDIRECTIONAL"] as string[]).includes(String(integration.direction))) {
      throw new ForbiddenException("Integration is not authorized for outbound exchange");
    }
    if (integration.status === "DISABLED" || integration.provisioningState !== "PROVISIONED") {
      throw new ForbiddenException("Integration is not active and provisioned");
    }

    const facilityGrant = integration.facilities.find(
      (entry: any) => entry.facilityId === input.facilityId && entry.active !== false && !entry.revokedAt,
    );
    if (!facilityGrant) throw new ForbiddenException("Facility is not authorized for this integration");

    const allowed = new Set(integration.permissions.map((entry: any) => entry.capabilityCode));
    if (!allowed.has("serviceRequest.read")) {
      throw new ForbiddenException("Integration is not authorized for ServiceRequest export");
    }

    const endpoint = this.endpoint(integration.endpointConfig, String(integration.environment));
    const item = await this.prisma.orderItem.findFirst({
      where: {
        id: input.orderItemId,
        catalogItemType: { in: [...DIAGNOSTIC_TYPES] },
        order: { facilityId: input.facilityId },
      },
      select: { id: true, catalogItemType: true },
    });
    if (!item) throw new NotFoundException("Diagnostic order item not found");

    const serviceRequest = await this.clinical.read("ServiceRequest", input.facilityId, input.orderItemId) as Record<string, unknown>;
    const domain: DiagnosticExchangeDomain = item.catalogItemType === "LAB_TEST" ? "LAB" : "RADIOLOGY";
    const idempotencyKey = this.idempotencyKey(input.integrationId, input.facilityId, input.orderItemId, serviceRequest);

    await this.audit.log(AuditAction.VIEW, "FHIR_DIAGNOSTIC_OUTBOUND", {
      userId: input.actorUserId,
      facilityId: input.facilityId,
      entityId: input.orderItemId,
      metadata: {
        event: "FHIR_DIAGNOSTIC_ORDER_PREPARED",
        integrationId: input.integrationId,
        resourceType: "ServiceRequest",
        domain,
      },
    });

    return {
      integrationId: input.integrationId,
      facilityId: input.facilityId,
      orderItemId: input.orderItemId,
      resourceType: "ServiceRequest",
      idempotencyKey,
      target: {
        integrationId: input.integrationId,
        facilityId: input.facilityId,
        domain,
        baseUrl: endpoint.baseUrl,
        authMethod: endpoint.authMethod,
      },
      serviceRequest,
    };
  }

  private endpoint(value: unknown, environment: string) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new BadRequestException("Integration outbound endpoint is not configured");
    }
    const config = value as Record<string, unknown>;
    if (typeof config.baseUrl !== "string" || !config.baseUrl.trim()) {
      throw new BadRequestException("Integration outbound FHIR base URL is not configured");
    }
    const url = new URL(config.baseUrl);
    if (url.username || url.password || url.hash) throw new BadRequestException("Unsafe outbound FHIR base URL");
    const localhost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    if (url.protocol !== "https:" && !(environment === "SANDBOX" && localhost)) {
      throw new BadRequestException("Outbound FHIR base URL must use HTTPS");
    }
    const authMethod = config.authMethod;
    if (!(["NONE", "PRIVATE_KEY_JWT", "MTLS"] as unknown[]).includes(authMethod)) {
      throw new BadRequestException("Outbound authentication method is not configured");
    }
    if (environment === "PRODUCTION" && authMethod === "NONE") {
      throw new ForbiddenException("Production outbound exchange requires authenticated transport");
    }
    return { baseUrl: url.toString().replace(/\/$/, ""), authMethod: authMethod as "NONE" | "PRIVATE_KEY_JWT" | "MTLS" };
  }

  private idempotencyKey(integrationId: string, facilityId: string, orderItemId: string, serviceRequest: Record<string, unknown>) {
    const stable = JSON.stringify({
      integrationId,
      facilityId,
      orderItemId,
      status: serviceRequest.status ?? null,
      authoredOn: serviceRequest.authoredOn ?? null,
      code: serviceRequest.code ?? null,
    });
    return `medora-diag-${createHash("sha256").update(stable).digest("hex")}`;
  }
}
