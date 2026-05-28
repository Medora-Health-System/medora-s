import { Injectable, NotFoundException } from "@nestjs/common";
import {
  evaluateFacilityBillingIdentityComplete,
  resolveEncounterBillingExportReadiness,
  type BillingClassification,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { resolvePrimaryCoverage } from "../billing/claim-coverage-resolution.util";
import { facilityBillingWorkflowSelect, facilityWorkflowConfigFromRow } from "./facility-billing-workflow.util";

const facilityIdentitySelect = {
  billingLegalName: true,
  billingAddressLine1: true,
  billingCity: true,
  billingStateProvince: true,
  billingPostalCode: true,
  billingCountry: true,
  billingNpi: true,
  taxIdEin: true,
} as const;

@Injectable()
export class BillingExportReadinessService {
  constructor(private readonly prisma: PrismaService) {}

  async getForEncounter(params: { encounterId: string; facilityId: string }) {
    const { encounterId, facilityId } = params;

    const [encounter, facility] = await Promise.all([
      this.prisma.encounter.findFirst({
        where: { id: encounterId, facilityId },
        select: {
          id: true,
          status: true,
          billingClassification: true,
          createdAt: true,
          patientId: true,
        },
      }),
      this.prisma.facility.findFirst({
        where: { id: facilityId },
        select: {
          ...facilityIdentitySelect,
          ...facilityBillingWorkflowSelect,
        },
      }),
    ]);

    if (!encounter) throw new NotFoundException("Encounter not found");
    if (!facility) throw new NotFoundException("Facility not found");

    const [diagnosisCount, procedureCodeCount, payerResolution] = await Promise.all([
      this.prisma.diagnosis.count({
        where: { facilityId, encounterId, status: "ACTIVE" },
      }),
      this.prisma.billingEvent.count({
        where: {
          facilityId,
          encounterId,
          OR: [
            { procedureCode: { not: null } },
            { hcpcsCode: { not: null } },
            { code: { not: null } },
          ],
        },
      }),
      resolvePrimaryCoverage(this.prisma, {
        facilityId,
        patientId: encounter.patientId,
        serviceDate: encounter.createdAt,
      }),
    ]);

    const facilityBillingIdentityComplete = evaluateFacilityBillingIdentityComplete(facility);
    const workflowConfig = facilityWorkflowConfigFromRow(facility);

    const readiness = resolveEncounterBillingExportReadiness({
      billingClassification: encounter.billingClassification as BillingClassification,
      facilityBillingIdentityComplete,
      hasPrimaryDiagnosis: diagnosisCount > 0,
      hasProcedureCodes: procedureCodeCount > 0,
      hasPayer: payerResolution.ok,
      facilityBillingWorkflowMode: workflowConfig.billingClassificationMode,
      encounterStatus: encounter.status,
    });

    return {
      encounterId: encounter.id,
      facilityId,
      billingClassification: encounter.billingClassification,
      ...readiness,
      facilityBillingIdentityComplete,
      hasPrimaryDiagnosis: diagnosisCount > 0,
      hasProcedureCodes: procedureCodeCount > 0,
      hasPayer: payerResolution.ok,
      previewOnly: true,
    };
  }
}
