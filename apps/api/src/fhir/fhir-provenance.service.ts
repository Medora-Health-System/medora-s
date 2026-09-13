import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { AuditService } from "../common/services/audit.service";
import { hashCanonicalJson } from "../encounters/chart-export-hash.util";
import { PrismaService } from "../prisma/prisma.service";
import { FhirSearchService, searchBundle } from "./fhir-search";
import { parseFhirReference, parseLogicalId } from "./fhir-protocol";

const SEARCH_PARAMS = ["_id", "target", "patient", "agent", "recorded", "_count", "_cursor"] as const;

type Row = {
  id: string;
  encounterId: string;
  facilityId: string;
  patientId: string;
  versionNumber: number;
  signedAt: Date;
  signedByUserId: string;
  clinicalSnapshotJson: unknown;
  snapshotHash: string;
  previousVersionId: string | null;
  createdAt: Date;
};

@Injectable()
export class FhirProvenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: FhirSearchService,
    private readonly audit: AuditService,
  ) {}

  async read(facilityId: string, rawId: string) {
    const id = parseLogicalId(rawId);
    const row = await this.prisma.encounterProviderDocumentationVersion.findFirst({
      where: { id, facilityId },
      select: {
        id: true,
        encounterId: true,
        facilityId: true,
        patientId: true,
        versionNumber: true,
        signedAt: true,
        signedByUserId: true,
        clinicalSnapshotJson: true,
        snapshotHash: true,
        previousVersionId: true,
        createdAt: true,
      },
    });
    if (!row) throw new NotFoundException("Provenance not found");
    await this.assertSnapshotIntegrity(row as Row);
    return this.map(row as Row);
  }

  async searchProvenance(facilityId: string, query: Record<string, unknown>) {
    const parsed = this.search.parse(query, SEARCH_PARAMS, "Provenance");
    const values = parsed.values;
    const id = values._id ? parseLogicalId(values._id) : undefined;
    const encounterId = values.target ? parseFhirReference(values.target, "Encounter").id : undefined;
    const patientId = values.patient ? parseFhirReference(values.patient, "Patient").id : undefined;
    const agentId = values.agent ? parseFhirReference(values.agent, "Practitioner").id : undefined;
    const recorded = values.recorded ? this.day(values.recorded) : undefined;

    const rows = await this.prisma.encounterProviderDocumentationVersion.findMany({
      where: {
        facilityId,
        ...(id ? { id } : {}),
        ...(encounterId ? { encounterId } : {}),
        ...(patientId ? { patientId } : {}),
        ...(agentId ? { signedByUserId: agentId } : {}),
        ...(recorded ? { signedAt: recorded } : {}),
        ...(parsed.cursor ? { id: { gt: parsed.cursor } } : {}),
      },
      select: {
        id: true,
        encounterId: true,
        facilityId: true,
        patientId: true,
        versionNumber: true,
        signedAt: true,
        signedByUserId: true,
        clinicalSnapshotJson: true,
        snapshotHash: true,
        previousVersionId: true,
        createdAt: true,
      },
      orderBy: { id: "asc" },
      take: parsed.count + 1,
    });

    const pageRows = rows.slice(0, parsed.count) as Row[];
    for (const row of pageRows) await this.assertSnapshotIntegrity(row);
    return searchBundle(this.search.baseUrl(), "Provenance", query, pageRows.map((row) => this.map(row)), rows.length > parsed.count);
  }

  private map(row: Row) {
    return {
      resourceType: "Provenance",
      id: row.id,
      target: [
        { reference: `Encounter/${row.encounterId}` },
        { reference: `Patient/${row.patientId}` },
      ],
      recorded: row.signedAt.toISOString(),
      activity: {
        coding: [{ system: "http://terminology.hl7.org/CodeSystem/v3-DataOperation", code: "CREATE", display: "create" }],
      },
      agent: [{
        type: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/provenance-participant-type", code: "author", display: "Author" }] },
        who: { reference: `Practitioner/${row.signedByUserId}` },
        onBehalfOf: { reference: `Organization/${row.facilityId}` },
      }],
      entity: [
        {
          role: row.previousVersionId ? "revision" : "source",
          what: {
            identifier: {
              system: "urn:medora:provider-documentation-snapshot-sha256",
              value: row.snapshotHash,
            },
          },
        },
        ...(row.previousVersionId ? [{ role: "revision", what: { reference: `Provenance/${row.previousVersionId}` } }] : []),
      ],
      extension: [{
        url: "https://medoras.com/fhir/StructureDefinition/provider-documentation-version",
        valueInteger: row.versionNumber,
      }],
    };
  }

  private async assertSnapshotIntegrity(row: Row) {
    const actual = hashCanonicalJson(row.clinicalSnapshotJson).hash;
    if (actual === row.snapshotHash) return;
    await this.audit.log(AuditAction.VIEW, "FHIR_PROVENANCE_INTEGRITY", {
      facilityId: row.facilityId,
      patientId: row.patientId,
      encounterId: row.encounterId,
      entityId: row.id,
      critical: true,
      metadata: {
        event: "FHIR_PROVENANCE_SOURCE_INTEGRITY_FAILURE",
        resourceType: "Provenance",
        versionNumber: row.versionNumber,
      },
    });
    throw new ServiceUnavailableException("Provenance source integrity verification failed");
  }

  private day(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new NotFoundException("Malformed recorded date");
    const start = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(start.valueOf()) || start.toISOString().slice(0, 10) !== value) throw new NotFoundException("Malformed recorded date");
    return { gte: start, lt: new Date(start.getTime() + 86_400_000) };
  }
}
