import { Injectable, NotFoundException, Optional } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { projectFacilityRuntimeConfiguration } from "@medora/shared";
import { FacilityConfigurationService } from "../../facility-configuration/facility-configuration.service";
import { PrismaService } from "../../prisma/prisma.service";
import type { DiagnosticResultStaffActor } from "../../patient-portal/records/patient-diagnostic-result-release.service";
import { PatientDiagnosticResultReleaseService } from "../../patient-portal/records/patient-diagnostic-result-release.service";
import {
  digitalCareAgeYears,
  digitalCarePatientDisplayName,
  digitalCareParseSearchDate,
  digitalCareVisitType,
} from "./digital-care-staff-workspace.util";

/**
 * Production-safe projection used only when the richer Digital Care aggregate cannot
 * be assembled. It intentionally depends on core Patient/Encounter data first so a
 * failure in an optional portal/care-plan/message projection never makes a real
 * facility patient disappear from the staff workspace.
 */
@Injectable()
export class DigitalCareStaffWorkspaceFallbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly releases: PatientDiagnosticResultReleaseService,
    @Optional() private readonly facilityConfiguration?: FacilityConfigurationService,
  ) {}

  private async configuration(facilityId: string) {
    if (!this.facilityConfiguration) return null;
    const settings = await this.facilityConfiguration.assertStaffDigitalCare(facilityId);
    return projectFacilityRuntimeConfiguration(facilityId, settings);
  }

  async roster(actor: DiagnosticResultStaffActor, query?: { q?: string; limit?: number; offset?: number }) {
    const limit = Math.min(Math.max(query?.limit ?? 40, 1), 80);
    const offset = Math.max(query?.offset ?? 0, 0);
    const needle = (query?.q ?? "").trim();
    const dob = needle ? digitalCareParseSearchDate(needle.toLowerCase()) : null;
    const where: Prisma.PatientWhereInput = {
      facilityId: actor.facilityId,
      ...(needle
        ? {
            OR: [
              { firstName: { contains: needle, mode: "insensitive" } },
              { lastName: { contains: needle, mode: "insensitive" } },
              { mrn: { contains: needle, mode: "insensitive" } },
              { phone: { contains: needle, mode: "insensitive" } },
              { email: { contains: needle, mode: "insensitive" } },
              ...(dob ? [{ dob: { gte: dob, lt: new Date(dob.getTime() + 86_400_000) } }] : []),
            ],
          }
        : {}),
    };

    const [patients, total, configuration] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          middleName: true,
          mrn: true,
          dob: true,
          sex: true,
          sexAtBirth: true,
          phone: true,
          email: true,
          address: true,
          city: true,
          country: true,
        },
        orderBy: { updatedAt: "desc" },
        skip: offset,
        take: limit,
      }),
      this.prisma.patient.count({ where }),
      this.configuration(actor.facilityId),
    ]);

    const ids = patients.map((patient) => patient.id);
    const encounters = ids.length
      ? await this.prisma.encounter.findMany({
          where: { facilityId: actor.facilityId, patientId: { in: ids } },
          select: {
            id: true,
            patientId: true,
            type: true,
            status: true,
            createdAt: true,
            dischargedAt: true,
            roomLabel: true,
            billingClassification: true,
            physicianAssigned: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : [];
    const latest = new Map<string, (typeof encounters)[number]>();
    for (const encounter of encounters) if (!latest.has(encounter.patientId)) latest.set(encounter.patientId, encounter);

    return {
      patients: patients.map((patient) => {
        const encounter = latest.get(patient.id) ?? null;
        return {
          id: patient.id,
          displayName: digitalCarePatientDisplayName(patient),
          mrn: patient.mrn ?? null,
          dob: patient.dob?.toISOString() ?? null,
          ageYears: digitalCareAgeYears(patient.dob),
          sex: patient.sexAtBirth ?? patient.sex,
          phone: patient.phone,
          email: patient.email,
          address: [patient.address, patient.city, patient.country].filter(Boolean).join(", ") || null,
          visitType: digitalCareVisitType(encounter?.type ?? null, encounter?.billingClassification ?? null),
          visitStatus: encounter?.status ?? null,
          arrivedAt: encounter?.createdAt?.toISOString() ?? null,
          dischargedAt: encounter?.dischargedAt?.toISOString() ?? null,
          unit: encounter?.roomLabel ?? null,
          attending: encounter?.physicianAssigned ? digitalCarePatientDisplayName(encounter.physicianAssigned) : null,
          encounterId: encounter?.id ?? null,
          portalActive: false,
          unreadCount: 0,
        };
      }),
      total,
      offset,
      limit,
      configuration,
    };
  }

  async workspace(actor: DiagnosticResultStaffActor, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, facilityId: actor.facilityId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        mrn: true,
        dob: true,
        sex: true,
        sexAtBirth: true,
        phone: true,
        email: true,
        address: true,
        city: true,
        country: true,
      },
    });
    if (!patient) throw new NotFoundException("Patient not found in the active facility");

    const [encounter, configuration, results] = await Promise.all([
      this.prisma.encounter.findFirst({
        where: { facilityId: actor.facilityId, patientId },
        select: {
          id: true,
          type: true,
          status: true,
          createdAt: true,
          dischargedAt: true,
          roomLabel: true,
          billingClassification: true,
          disposition: true,
          followUpDate: true,
          treatmentPlan: true,
          physicianAssigned: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.configuration(actor.facilityId),
      this.releases.list(actor, patientId).catch(() => []),
    ]);

    const attending = encounter?.physicianAssigned ? digitalCarePatientDisplayName(encounter.physicianAssigned) : null;
    const identity = {
      id: patient.id,
      displayName: digitalCarePatientDisplayName(patient),
      mrn: patient.mrn ?? null,
      dob: patient.dob?.toISOString() ?? null,
      ageYears: digitalCareAgeYears(patient.dob),
      sex: patient.sexAtBirth ?? patient.sex,
      phone: patient.phone,
      email: patient.email,
      address: [patient.address, patient.city, patient.country].filter(Boolean).join(", ") || null,
      visitType: digitalCareVisitType(encounter?.type ?? null, encounter?.billingClassification ?? null),
      visitStatus: encounter?.status ?? null,
      arrivedAt: encounter?.createdAt?.toISOString() ?? null,
      dischargedAt: encounter?.dischargedAt?.toISOString() ?? null,
      unit: encounter?.roomLabel ?? null,
      attending,
      encounterId: encounter?.id ?? null,
      portalActive: false,
      unreadCount: 0,
      insurance: null,
    };

    return {
      identity,
      configuration,
      results,
      threads: [],
      medications: { ordered: [], homeSummary: null, reconComplete: false },
      discharge: {
        diagnoses: [],
        summary: null,
        disposition: encounter?.disposition ?? null,
        followUpDate: encounter?.followUpDate?.toISOString() ?? null,
        instructions: encounter?.treatmentPlan ?? null,
        restrictions: null,
        schoolNote: null,
        workNote: null,
        followUp: null,
        acknowledgement: false,
        attending,
        status: encounter?.status ?? null,
        portalActive: false,
      },
      timeline: [],
      carePlans: [],
      followUps: [],
      appointments: [],
      activity: [],
    };
  }
}
