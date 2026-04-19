import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { AuditService } from "../common/services/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { PatientsService } from "../patients/patients.service";
import { FhirMapperService } from "../fhir-mapper/fhir-mapper.service";
import type { FhirEncounter, FhirObservation, FhirPatient } from "../fhir-mapper/fhir-resource.types";
import type { FhirBundle } from "./fhir-bundle.types";
import type { ParsedFhirObservationSearch } from "./dto/fhir-read.schemas";
import { parseFhirObservationOpaqueId } from "./fhir-observation-id";

@Injectable()
export class FhirResourceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientsService: PatientsService,
    private readonly audit: AuditService,
    private readonly fhirMapper: FhirMapperService
  ) {}

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
