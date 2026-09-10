import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { AuditService } from "../common/services/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { PatientsService } from "../patients/patients.service";
import { FhirMapperService } from "../fhir-mapper/fhir-mapper.service";
import type { FhirEncounter, FhirObservation, FhirPatient } from "../fhir-mapper/fhir-resource.types";
import type { FhirBundle } from "./fhir-bundle.types";
import type { ParsedFhirObservationSearch } from "./dto/fhir-read.schemas";
import { parseFhirObservationOpaqueId } from "./fhir-observation-id";
import { ENCOUNTER_CORE_SELECT, ENCOUNTER_NESTED_CORE_SELECT } from "../encounters/encounter-query-contracts";
import { FhirSearchService, searchBundle } from "./fhir-search";
import { parseFhirReference } from "./fhir-protocol";

@Injectable()
export class FhirResourceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientsService: PatientsService,
    private readonly audit: AuditService,
    private readonly fhirMapper: FhirMapperService,
    private readonly search: FhirSearchService
  ) {}

  async searchPatients(facilityId: string, query: Record<string, unknown>): Promise<FhirBundle> {
    const parsed = this.search.parse(query, ["_id", "identifier", "family", "given", "name", "birthdate", "gender", "_count", "_cursor"]);
    const v = parsed.values;
    const identifier = v.identifier?.includes("|") ? v.identifier.split("|").at(-1) : v.identifier;
    const patientSex = v.gender ? ({ male: "MALE", female: "FEMALE", other: "OTHER", unknown: "UNKNOWN" } as const)[v.gender as "male"] : undefined;
    if (v.gender && !patientSex) throw new BadRequestException("Invalid gender");
    const rows = await this.prisma.patient.findMany({ where: {
      facilityId,
      ...(v._id ? { id: v._id } : {}),
      ...(identifier ? { OR: [{ mrn: identifier }, { globalMrn: identifier }] } : {}),
      ...(v.family ? { lastName: { startsWith: v.family, mode: "insensitive" } } : {}),
      ...(v.given ? { firstName: { startsWith: v.given, mode: "insensitive" } } : {}),
      ...(v.name ? { OR: [{ firstName: { startsWith: v.name, mode: "insensitive" } }, { lastName: { startsWith: v.name, mode: "insensitive" } }] } : {}),
      ...(v.birthdate ? { dob: this.date(v.birthdate) } : {}), ...(patientSex ? { sex: patientSex } : {}),
      ...(parsed.cursor ? { id: { gt: parsed.cursor } } : {}),
    }, orderBy: { id: "asc" }, take: parsed.count + 1 });
    const page = rows.slice(0, parsed.count).map((p) => this.fhirMapper.toFhirPatient(p));
    return searchBundle(this.search.baseUrl(), "Patient", query, page, rows.length > parsed.count) as FhirBundle;
  }

  async searchEncounters(facilityId: string, query: Record<string, unknown>): Promise<FhirBundle> {
    const parsed = this.search.parse(query, ["_id", "patient", "subject", "date", "status", "class", "_count", "_cursor"]);
    const v = parsed.values;
    const patientRef = v.patient ?? v.subject;
    const patientId = patientRef ? parseFhirReference(patientRef, "Patient").id : undefined;
    const status = v.status ? ({ "in-progress": "OPEN", finished: "CLOSED", cancelled: "CANCELLED" } as const)[v.status as "in-progress"] : undefined;
    if (v.status && !status) throw new BadRequestException("Unsupported Encounter status");
    const type = v.class ? ({ AMB: "OUTPATIENT", IMP: "INPATIENT", EMER: "EMERGENCY" } as const)[v.class as "AMB"] : undefined;
    if (v.class && !type) throw new BadRequestException("Unsupported Encounter class");
    const date = v.date ? this.date(v.date) : undefined;
    const rows = await this.prisma.encounter.findMany({ select: ENCOUNTER_CORE_SELECT, where: { facilityId,
      ...(v._id ? { id: v._id } : {}), ...(patientId ? { patientId } : {}), ...(status ? { status } : {}), ...(type ? { type } : {}),
      ...(date ? { createdAt: { gte: date, lt: new Date(date.getTime() + 86400000) } } : {}), ...(parsed.cursor ? { id: { gt: parsed.cursor } } : {})
    }, orderBy: { id: "asc" }, take: parsed.count + 1 });
    const page = rows.slice(0, parsed.count).map((e) => this.fhirMapper.toFhirEncounter(e));
    return searchBundle(this.search.baseUrl(), "Encounter", query, page, rows.length > parsed.count) as FhirBundle;
  }

  private date(value: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException("Malformed date");
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) throw new BadRequestException("Malformed date");
    return date;
  }

  async readPatient(
    facilityId: string,
    id: string,
    userId: string | undefined,
    ip: string | undefined,
    userAgent: string | undefined
  ): Promise<FhirPatient> {
    const patient = await this.patientsService.findOne(facilityId, id, userId, ip, userAgent);
    return this.fhirMapper.toFhirPatient(patient);
  }

  async readEncounter(
    facilityId: string,
    id: string,
    userId: string | undefined,
    ip: string | undefined,
    userAgent: string | undefined
  ): Promise<FhirEncounter> {
    const encounter = await this.prisma.encounter.findFirst({
      select: ENCOUNTER_CORE_SELECT,
      where: { id, facilityId },
    });
    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    await this.audit.log(AuditAction.ENCOUNTER_VIEW, "ENCOUNTER", {
      userId,
      facilityId,
      patientId: encounter.patientId,
      encounterId: encounter.id,
      entityId: encounter.id,
      ip,
      userAgent,
      metadata: { source: "fhir" },
    });

    return this.fhirMapper.toFhirEncounter(encounter);
  }

  async searchObservations(
    facilityId: string, parsed: ParsedFhirObservationSearch,
    userId: string | undefined, ip: string | undefined, userAgent: string | undefined,
    query: Record<string, unknown> = {}
  ): Promise<FhirBundle> {
    const take = Math.min(parsed.count ?? 20, 50);
    const cursorReading = parsed.cursor ? parseFhirObservationOpaqueId(parsed.cursor) : undefined;
    if (parsed.cursor && (!cursorReading || cursorReading.kind !== "reading")) throw new BadRequestException("Invalid _cursor");
    const cursorReadingId = cursorReading?.kind === "reading" ? cursorReading.readingId : undefined;
    const requestedReading = parsed.id ? parseFhirObservationOpaqueId(parsed.id) : undefined;
    if (parsed.id && (!requestedReading || requestedReading.kind !== "reading")) return searchBundle(this.search.baseUrl(), "Observation", query, [], false) as FhirBundle;
    if (parsed.category && !["vital-signs", "http://terminology.hl7.org/CodeSystem/observation-category|vital-signs"].includes(parsed.category)) return searchBundle(this.search.baseUrl(), "Observation", query, [], false) as FhirBundle;
    if (parsed.status && parsed.status !== "final") return searchBundle(this.search.baseUrl(), "Observation", query, [], false) as FhirBundle;
    const measuredAt = parsed.date ? this.observationDay(parsed.date) : undefined;
    const code = parsed.code?.split("|").at(-1);
    const resources: FhirObservation[] = [];
    const sourceRows = new Map<string, { id: string; patientId: string; encounterId: string }>();
    let scanAfter: string | undefined;
    while (resources.length <= take) {
      const lowerBound = scanAfter ? { gt: scanAfter } : cursorReadingId ? { gte: cursorReadingId } : undefined;
      const rows = await this.prisma.triageVitalsReading.findMany({
        where: { facilityId, status: "ACTIVE", ...(requestedReading?.kind === "reading" ? { id: requestedReading.readingId } : lowerBound ? { id: lowerBound } : {}), ...(parsed.encounterId ? { encounterId: parsed.encounterId } : {}), ...(parsed.patientId ? { patientId: parsed.patientId } : {}), ...(measuredAt ? { measuredAt } : {}) },
        orderBy: { id: "asc" }, take: 51,
      });
      for (const row of rows) {
        sourceRows.set(row.id, row);
        const mapped = this.fhirMapper.vitalsToObservations(row.vitalsJson, { idBase: `reading-${row.id}`, patientReference: `Patient/${row.patientId}`, encounterReference: `Encounter/${row.encounterId}`, effectiveDateTime: row.measuredAt.toISOString() });
        for (const observation of mapped) if ((!parsed.cursor || observation.id! > parsed.cursor) && (!parsed.id || observation.id === parsed.id) && (!code || observation.code.coding?.some((coding) => coding.code === code))) resources.push(observation);
      }
      if (rows.length < 51 || requestedReading) break;
      scanAfter = rows.at(-1)!.id;
    }
    resources.sort((a, b) => (a.id ?? "").localeCompare(b.id ?? ""));
    const page = resources.slice(0, take);
    const auditedReadings = new Set<string>();
    for (const observation of page) {
      const source = parseFhirObservationOpaqueId(observation.id ?? "");
      if (!source || source.kind !== "reading" || auditedReadings.has(source.readingId)) continue;
      auditedReadings.add(source.readingId);
      const row = sourceRows.get(source.readingId);
      if (row) await this.auditObservation(row, facilityId, userId, ip, userAgent, "search");
    }
    return searchBundle(this.search.baseUrl(), "Observation", query, page, resources.length > take) as FhirBundle;
  }

  async readObservationById(
    facilityId: string, opaqueId: string, userId: string | undefined,
    ip: string | undefined, userAgent: string | undefined
  ): Promise<FhirObservation> {
    const parsed = parseFhirObservationOpaqueId(opaqueId);
    if (!parsed || parsed.kind !== "reading") throw new NotFoundException("Observation not found");
    const row = await this.prisma.triageVitalsReading.findFirst({ where: { id: parsed.readingId, facilityId, status: "ACTIVE" } });
    if (!row) throw new NotFoundException("Observation not found");
    const found = this.fhirMapper.vitalsToObservations(row.vitalsJson, { idBase: `reading-${row.id}`, patientReference: `Patient/${row.patientId}`, encounterReference: `Encounter/${row.encounterId}`, effectiveDateTime: row.measuredAt.toISOString() }).find((o) => o.id === opaqueId);
    if (!found) throw new NotFoundException("Observation not found");
    await this.auditObservation(row, facilityId, userId, ip, userAgent, "read");
    return found;
  }

  private observationDay(value: string) { const start = this.date(value); return { gte: start, lt: new Date(start.getTime() + 86400000) }; }
  private auditObservation(row: { id: string; patientId: string; encounterId: string }, facilityId: string, userId: string | undefined, ip: string | undefined, userAgent: string | undefined, interaction: "read" | "search") {
    return this.audit.log(AuditAction.ENCOUNTER_VIEW, "TRIAGE_VITALS_READING", { userId, facilityId, patientId: row.patientId, encounterId: row.encounterId, entityId: row.id, ip, userAgent, metadata: { source: "fhir", resourceType: "Observation", interaction } });
  }

}
