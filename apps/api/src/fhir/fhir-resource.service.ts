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
    const patientId = patientRef ? patientRef.replace(/^Patient\//, "") : undefined;
    if (patientId && !/^[0-9a-f-]{36}$/i.test(patientId)) throw new BadRequestException("Malformed patient reference");
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
    facilityId: string,
    parsed: ParsedFhirObservationSearch,
    userId: string | undefined,
    ip: string | undefined,
    userAgent: string | undefined
  ): Promise<FhirBundle> {
    const resources: FhirObservation[] = [];

    if (parsed.encounterId) {
      const encounter = await this.prisma.encounter.findFirst({
      select: ENCOUNTER_CORE_SELECT,
      where: { id: parsed.encounterId, facilityId },
      });
      if (!encounter) {
        throw new NotFoundException("Encounter not found");
      }
      if (parsed.patientId && encounter.patientId !== parsed.patientId) {
        throw new NotFoundException("Encounter does not match subject patient");
      }

      await this.audit.log(AuditAction.ENCOUNTER_VIEW, "ENCOUNTER", {
        userId,
        facilityId,
        patientId: encounter.patientId,
        encounterId: encounter.id,
        entityId: encounter.id,
        ip,
        userAgent,
        metadata: { source: "fhir", fhirObservationSearch: true },
      });

      resources.push(
        ...this.fhirMapper.vitalsToObservations(encounter.vitals, {
          idBase: encounter.id,
          patientReference: `Patient/${encounter.patientId}`,
          encounterReference: `Encounter/${encounter.id}`,
          effectiveDateTime: encounter.updatedAt.toISOString(),
        })
      );
    } else if (parsed.patientId) {
      const patient = await this.prisma.patient.findFirst({
        where: { id: parsed.patientId, facilityId },
      });
      if (!patient) {
        throw new NotFoundException("Patient not found");
      }

      await this.audit.log(AuditAction.PATIENT_VIEW, "PATIENT", {
        userId,
        facilityId,
        patientId: patient.id,
        entityId: patient.id,
        ip,
        userAgent,
        metadata: { source: "fhir", fhirObservationSearch: true },
      });

      const effective = patient.latestVitalsAt?.toISOString();
      resources.push(
        ...this.fhirMapper.vitalsToObservations(patient.latestVitalsJson, {
          idBase: `${patient.id}-latest`,
          patientReference: `Patient/${patient.id}`,
          effectiveDateTime: effective,
        })
      );
    }

    return this.toObservationSearchBundle(resources);
  }

  async readObservationById(
    facilityId: string,
    opaqueId: string,
    userId: string | undefined,
    ip: string | undefined,
    userAgent: string | undefined
  ): Promise<FhirObservation> {
    const parsed = parseFhirObservationOpaqueId(opaqueId);
    if (!parsed) {
      throw new NotFoundException("Observation not found");
    }

    if (parsed.kind === "encounter") {
      const encounter = await this.prisma.encounter.findFirst({
      select: ENCOUNTER_CORE_SELECT,
      where: { id: parsed.encounterId, facilityId },
      });
      if (!encounter) {
        throw new NotFoundException("Observation not found");
      }
      await this.audit.log(AuditAction.ENCOUNTER_VIEW, "ENCOUNTER", {
        userId,
        facilityId,
        patientId: encounter.patientId,
        encounterId: encounter.id,
        entityId: encounter.id,
        ip,
        userAgent,
        metadata: { source: "fhir", fhirObservationRead: true },
      });
      const list = this.fhirMapper.vitalsToObservations(encounter.vitals, {
        idBase: encounter.id,
        patientReference: `Patient/${encounter.patientId}`,
        encounterReference: `Encounter/${encounter.id}`,
        effectiveDateTime: encounter.updatedAt.toISOString(),
      });
      const found = list.find((o) => o.id === opaqueId);
      if (!found) {
        throw new NotFoundException("Observation not found");
      }
      return found;
    }

    const patient = await this.prisma.patient.findFirst({
      where: { id: parsed.patientId, facilityId },
    });
    if (!patient) {
      throw new NotFoundException("Observation not found");
    }
    await this.audit.log(AuditAction.PATIENT_VIEW, "PATIENT", {
      userId,
      facilityId,
      patientId: patient.id,
      entityId: patient.id,
      ip,
      userAgent,
      metadata: { source: "fhir", fhirObservationRead: true },
    });
    const list = this.fhirMapper.vitalsToObservations(patient.latestVitalsJson, {
      idBase: `${patient.id}-latest`,
      patientReference: `Patient/${patient.id}`,
      effectiveDateTime: patient.latestVitalsAt?.toISOString(),
    });
    const found = list.find((o) => o.id === opaqueId);
    if (!found) {
      throw new NotFoundException("Observation not found");
    }
    return found;
  }

  private toObservationSearchBundle(resources: FhirObservation[]): FhirBundle {
    return {
      resourceType: "Bundle",
      type: "searchset",
      total: resources.length,
      entry: resources.map((resource) => ({
        fullUrl: resource.id ? `/fhir/Observation/${encodeURIComponent(resource.id)}` : undefined,
        resource,
      })),
    };
  }
}
