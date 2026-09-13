import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { AuditService } from "../common/services/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { FHIR_PROPOSAL_PERMISSIONS } from "./fhir-capability.registry";
import type { FhirRequestContext } from "./fhir-context.guard";
import { FHIR_REQUEST_POLICY, parseFhirReference } from "./fhir-protocol";
import { verifiedTerminologyVersion } from "./fhir-terminology";

const coding = z.object({
  system: z.string().url().max(256),
  version: z.string().trim().min(1).max(64).optional(),
  code: z.string().min(1).max(128),
  display: z.string().max(256).optional(),
}).strict();
const codeableConcept = z.object({
  coding: z.array(coding).min(1).max(4),
  text: z.string().max(500).optional(),
}).strict();
const reference = z.object({ reference: z.string().min(1).max(128) }).strict();
const quantity = z.object({
  value: z.number().finite(),
  unit: z.string().max(64).optional(),
  system: z.string().url().max(256).optional(),
  code: z.string().max(64).optional(),
}).strict();

const observationProposal = z.object({
  resourceType: z.literal("Observation"),
  id: z.string().max(64).optional(),
  status: z.enum(["registered", "preliminary", "final", "amended", "corrected", "cancelled"]),
  code: codeableConcept,
  subject: reference,
  encounter: reference.optional(),
  effectiveDateTime: z.string().datetime({ offset: true }),
  valueQuantity: quantity,
}).strict();

const conditionProposal = z.object({
  resourceType: z.literal("Condition"),
  id: z.string().max(64).optional(),
  clinicalStatus: codeableConcept.optional(),
  verificationStatus: codeableConcept.optional(),
  code: codeableConcept,
  subject: reference,
  encounter: reference.optional(),
  recordedDate: z.string().datetime({ offset: true }).optional(),
}).strict();

const serviceRequestProposal = z.object({
  resourceType: z.literal("ServiceRequest"),
  id: z.string().max(64).optional(),
  status: z.enum(["draft", "active", "on-hold", "revoked", "completed", "entered-in-error"]),
  intent: z.enum(["proposal", "plan", "directive", "order", "original-order", "reflex-order", "filler-order", "instance-order", "option"]),
  code: codeableConcept,
  subject: reference,
  encounter: reference.optional(),
  authoredOn: z.string().datetime({ offset: true }).optional(),
}).strict();

const diagnosticReportProposal = z.object({
  resourceType: z.literal("DiagnosticReport"),
  id: z.string().max(64).optional(),
  status: z.enum(["registered", "partial", "preliminary", "final", "amended", "corrected", "appended", "cancelled", "entered-in-error", "unknown"]),
  code: codeableConcept,
  subject: reference,
  encounter: reference.optional(),
  basedOn: z.array(reference).max(10).optional(),
  effectiveDateTime: z.string().datetime({ offset: true }).optional(),
  issued: z.string().datetime({ offset: true }).optional(),
  conclusion: z.string().max(4000).optional(),
}).strict();

export const fhirInboundProposalSchema = z.object({
  externalMessageId: z.string().trim().min(1).max(160),
  resource: z.discriminatedUnion("resourceType", [observationProposal, conditionProposal, serviceRequestProposal, diagnosticReportProposal]),
}).strict();

type ProposalInput = z.infer<typeof fhirInboundProposalSchema>;
type ProposalResource = ProposalInput["resource"];
type ExistingProposal = { id: string; requestFingerprint: string; status: string; resourceType: string; createdAt: Date };
type SourceRow = { sourceSystemIdentifier: string | null; integrationSourceSystemIdentifier: string | null };

@Injectable()
export class FhirInboundProposalService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async stage(context: FhirRequestContext, body: unknown) {
    const clientId = context.actorId;
    const integrationId = context.integrationId;
    if (context.actorType !== "machine" || !clientId || !integrationId) throw new BadRequestException("Machine integration context required");
    if (Buffer.byteLength(JSON.stringify(body ?? null)) > FHIR_REQUEST_POLICY.futureWritePayloadBytes) throw new BadRequestException("FHIR proposal payload is too large");

    const parsedResult = fhirInboundProposalSchema.safeParse(body);
    if (!parsedResult.success) throw new BadRequestException("Malformed FHIR proposal");
    const parsed = parsedResult.data;
    this.assertTerminologyVersions(parsed.resource);
    const requiredScope = this.scopeFor(parsed.resource.resourceType);
    if (!context.scopes.includes(requiredScope)) throw new ForbiddenException("FHIR proposal scope is not authorized");

    const { patientId, encounterId } = await this.validateTenantReferences(context.facilityId, parsed.resource);
    const sourceSystem = await this.resolveSourceSystem(clientId, integrationId);
    const fingerprint = createHash("sha256").update(this.canonicalJson(parsed)).digest("hex");
    const proposalId = randomUUID();
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const inserted = await tx.$executeRaw(Prisma.sql`
        INSERT INTO interop."FhirInboundProposal"
          ("id", "integrationId", "clientId", "facilityId", "sourceSystem", "externalMessageId", "resourceType", "status", "subjectPatientId", "encounterId", "requestFingerprint", "proposalJson", "createdAt", "updatedAt")
        VALUES
          (${proposalId}, ${integrationId}, ${clientId}, ${context.facilityId}, ${sourceSystem}, ${parsed.externalMessageId}, ${parsed.resource.resourceType}, 'PENDING_REVIEW', ${patientId}, ${encounterId}, ${fingerprint}, ${JSON.stringify(parsed.resource)}::jsonb, ${now}, ${now})
        ON CONFLICT ("facilityId", "clientId", "sourceSystem", "externalMessageId", "resourceType") DO NOTHING
      `);

      if (inserted === 0) {
        const existing = await this.findExisting(tx, context.facilityId, clientId, sourceSystem, parsed.externalMessageId, parsed.resource.resourceType);
        if (!existing) throw new ConflictException("FHIR proposal idempotency conflict");
        if (existing.requestFingerprint !== fingerprint) throw new ConflictException("Idempotency key was reused with different proposal content");
        return this.response(existing.id, existing.resourceType, existing.status, existing.createdAt, true);
      }

      await this.audit.log(AuditAction.UPDATE, "FHIR_INBOUND_PROPOSAL", {
        tx,
        critical: true,
        facilityId: context.facilityId,
        patientId,
        encounterId: encounterId ?? undefined,
        entityId: proposalId,
        metadata: {
          event: "FHIR_PROPOSAL_STAGED",
          actorType: "machine",
          clientId,
          integrationId,
          resourceType: parsed.resource.resourceType,
          sourceSystem,
          externalMessageIdHash: createHash("sha256").update(parsed.externalMessageId).digest("hex").slice(0, 16),
          status: "PENDING_REVIEW",
        },
      });

      return this.response(proposalId, parsed.resource.resourceType, "PENDING_REVIEW", now, false);
    });
  }

  private scopeFor(resourceType: ProposalResource["resourceType"]): string {
    const permission = FHIR_PROPOSAL_PERMISSIONS.find((item) => item.resourceType === resourceType);
    if (!permission) throw new BadRequestException("FHIR resource is not approved for staged proposals");
    return permission.code;
  }

  private assertTerminologyVersions(resource: ProposalResource) {
    const concepts = [resource.code];
    if (resource.resourceType === "Condition") {
      if (resource.clinicalStatus) concepts.push(resource.clinicalStatus);
      if (resource.verificationStatus) concepts.push(resource.verificationStatus);
    }
    for (const concept of concepts) {
      for (const entry of concept.coding) {
        const configured = verifiedTerminologyVersion(entry.system);
        if (configured && entry.version && entry.version !== configured) {
          throw new BadRequestException("FHIR coding version does not match the configured terminology release");
        }
      }
    }
  }

  private async validateTenantReferences(facilityId: string, resource: ProposalResource) {
    const subject = parseFhirReference(resource.subject.reference, "Patient");
    const encounter = resource.encounter ? parseFhirReference(resource.encounter.reference, "Encounter") : null;
    const patient = await this.prisma.patient.findFirst({ where: { id: subject.id, facilityId }, select: { id: true } });
    if (!patient) throw new NotFoundException("Referenced resource not found");
    if (encounter) {
      const row = await this.prisma.encounter.findFirst({ where: { id: encounter.id, facilityId, patientId: subject.id }, select: { id: true } });
      if (!row) throw new NotFoundException("Referenced resource not found");
    }
    if (resource.resourceType === "DiagnosticReport" && resource.basedOn?.length) {
      for (const basedOn of resource.basedOn) {
        const ref = parseFhirReference(basedOn.reference, "ServiceRequest");
        const item = await this.prisma.orderItem.findFirst({ where: { id: ref.id, order: { facilityId, patientId: subject.id } }, select: { id: true } });
        if (!item) throw new NotFoundException("Referenced resource not found");
      }
    }
    return { patientId: subject.id, encounterId: encounter?.id ?? null };
  }

  private async resolveSourceSystem(clientId: string, integrationId: string): Promise<string> {
    const [row] = await this.prisma.$queryRaw<SourceRow[]>(Prisma.sql`
      SELECT c."sourceSystemIdentifier", i."sourceSystemIdentifier" AS "integrationSourceSystemIdentifier"
      FROM interop."IntegrationClient" c
      JOIN public."Integration" i ON i."id" = c."integrationId"
      WHERE c."id" = ${clientId} AND c."integrationId" = ${integrationId}
      LIMIT 1
    `);
    if (!row) throw new NotFoundException("Integration client not found");
    return (row.sourceSystemIdentifier ?? row.integrationSourceSystemIdentifier ?? `client:${clientId}`).slice(0, 160);
  }

  private findExisting(tx: Prisma.TransactionClient, facilityId: string, clientId: string, sourceSystem: string, externalMessageId: string, resourceType: string) {
    return tx.$queryRaw<ExistingProposal[]>(Prisma.sql`
      SELECT "id", "requestFingerprint", "status", "resourceType", "createdAt"
      FROM interop."FhirInboundProposal"
      WHERE "facilityId" = ${facilityId} AND "clientId" = ${clientId} AND "sourceSystem" = ${sourceSystem}
        AND "externalMessageId" = ${externalMessageId} AND "resourceType" = ${resourceType}
      LIMIT 1
    `).then((rows) => rows[0] ?? null);
  }

  private response(id: string, resourceType: string, status: string, createdAt: Date, duplicate: boolean) {
    return {
      resourceType: "Parameters",
      parameter: [
        { name: "proposalId", valueString: id },
        { name: "resourceType", valueCode: resourceType },
        { name: "status", valueCode: status },
        { name: "createdAt", valueInstant: createdAt.toISOString() },
        { name: "duplicate", valueBoolean: duplicate },
        { name: "humanReviewRequired", valueBoolean: true },
      ],
    };
  }

  private canonicalJson(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map((entry) => this.canonicalJson(entry)).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${this.canonicalJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }
}
