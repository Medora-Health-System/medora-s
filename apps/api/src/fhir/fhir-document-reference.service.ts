import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { parseFhirReference, parseLogicalId } from "./fhir-protocol";
import { FhirSearchService, searchBundle } from "./fhir-search";

const EXPOSED_DOCUMENT_CATEGORIES = ["CLINICAL", "EMERGENCY", "REGISTRATION", "LEGAL"] as const;

type DocumentRow = {
  id: string;
  patientId: string | null;
  encounterId: string | null;
  facilityId: string | null;
  category: string;
  type: string;
  status: string;
  title: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: Date;
};

export type FhirDocumentReferenceResource = {
  resourceType: "DocumentReference";
  id: string;
  status: "current";
  type: { text: string };
  category: Array<{ text: string }>;
  subject: { reference: string };
  date: string;
  custodian: { reference: string };
  context?: { encounter: Array<{ reference: string }> };
  content: Array<{ attachment: { contentType: string; title: string; size: number } }>;
};

export function mapDocumentReference(row: DocumentRow): FhirDocumentReferenceResource {
  if (!row.patientId || !row.facilityId) throw new Error("DocumentReference source requires patient and facility");
  const title = row.title?.trim() || row.fileName;
  return {
    resourceType: "DocumentReference",
    id: row.id,
    status: "current",
    type: { text: row.type },
    category: [{ text: row.category }],
    subject: { reference: `Patient/${row.patientId}` },
    date: row.uploadedAt.toISOString(),
    custodian: { reference: `Organization/${row.facilityId}` },
    ...(row.encounterId ? { context: { encounter: [{ reference: `Encounter/${row.encounterId}` }] } } : {}),
    content: [{ attachment: { contentType: row.mimeType, title, size: row.fileSize } }],
  };
}

function exactDayBounds(value: string): { gte: Date; lt: Date } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException("Unsupported date search; use YYYY-MM-DD");
  const start = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) throw new BadRequestException("Invalid date search");
  return { gte: start, lt: new Date(start.getTime() + 86_400_000) };
}

@Injectable()
export class FhirDocumentReferenceService {
  constructor(private readonly prisma: PrismaService, private readonly search: FhirSearchService) {}

  async read(facilityId: string, rawId: string): Promise<FhirDocumentReferenceResource> {
    const id = parseLogicalId(rawId);
    const row = await this.prisma.enterpriseDocument.findFirst({
      where: {
        id,
        facilityId,
        patientId: { not: null },
        status: "ACTIVE",
        category: { in: [...EXPOSED_DOCUMENT_CATEGORIES] },
      },
      select: this.select(),
    }) as DocumentRow | null;
    if (!row) throw new NotFoundException("DocumentReference not found");
    return mapDocumentReference(row);
  }

  async find(facilityId: string, query: Record<string, unknown>) {
    const parsed = this.search.parse(query, [
      "_id",
      "patient",
      "subject",
      "encounter",
      "type",
      "category",
      "status",
      "date",
      "_count",
      "_cursor",
    ]);
    const v = parsed.values;
    const patientA = v.patient ? parseFhirReference(v.patient, "Patient").id : undefined;
    const patientB = v.subject ? parseFhirReference(v.subject, "Patient").id : undefined;
    if (patientA && patientB && patientA !== patientB) {
      return searchBundle(this.search.baseUrl(), "DocumentReference", query, [], false);
    }
    if (v.status && v.status !== "current") throw new BadRequestException("Unsupported DocumentReference status");
    const encounterId = v.encounter ? parseFhirReference(v.encounter, "Encounter").id : undefined;
    const date = v.date ? exactDayBounds(v.date) : undefined;
    const rows = await this.prisma.enterpriseDocument.findMany({
      where: {
        facilityId,
        patientId: { not: null },
        status: "ACTIVE",
        category: { in: [...EXPOSED_DOCUMENT_CATEGORIES] },
        ...(v._id ? { id: parseLogicalId(v._id) } : {}),
        ...(patientA || patientB ? { patientId: patientA ?? patientB } : {}),
        ...(encounterId ? { encounterId } : {}),
        ...(v.type ? { type: v.type } : {}),
        ...(v.category ? { category: v.category } : {}),
        ...(date ? { uploadedAt: date } : {}),
        ...(parsed.cursor ? { AND: { id: { gt: parsed.cursor } } } : {}),
      },
      select: this.select(),
      orderBy: { id: "asc" },
      take: parsed.count + 1,
    }) as DocumentRow[];
    const page = rows.slice(0, parsed.count).map(mapDocumentReference);
    return searchBundle(this.search.baseUrl(), "DocumentReference", query, page, rows.length > parsed.count);
  }

  private select() {
    return {
      id: true,
      patientId: true,
      encounterId: true,
      facilityId: true,
      category: true,
      type: true,
      status: true,
      title: true,
      fileName: true,
      mimeType: true,
      fileSize: true,
      uploadedAt: true,
    } as const;
  }
}
