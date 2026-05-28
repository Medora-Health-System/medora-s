import { Injectable, NotFoundException } from "@nestjs/common";
import {
  evaluateFacilityBillingIdentityComplete,
  resolveEncounterBillingExportReadiness,
  resolveProfessionalFacilityBillingLedger,
  type BillingClassification,
} from "@medora/shared";
import { BillingSide } from "@prisma/client";
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
export class BillingLedgerReadinessService {
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
          providerId: true,
          physicianAssignedUserId: true,
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

    const [diagnosisCount, procedureCodeCount, payerResolution, billingEvents] = await Promise.all([
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
      this.prisma.billingEvent.findMany({
        where: { facilityId, encounterId, reviewStatus: { not: "VOIDED" } },
        select: { billingSide: true },
      }),
    ]);

    const facilityBillingIdentityComplete = evaluateFacilityBillingIdentityComplete(facility);
    const workflowConfig = facilityWorkflowConfigFromRow(facility);
    const hasProfessionalProvider = Boolean(
      encounter.physicianAssignedUserId?.trim() || encounter.providerId?.trim(),
    );

    const exportReadiness = resolveEncounterBillingExportReadiness({
      billingClassification: encounter.billingClassification as BillingClassification,
      facilityBillingIdentityComplete,
      hasPrimaryDiagnosis: diagnosisCount > 0,
      hasProcedureCodes: procedureCodeCount > 0,
      hasPayer: payerResolution.ok,
      facilityBillingWorkflowMode: workflowConfig.billingClassificationMode,
      encounterStatus: encounter.status,
    });

    const ledger = resolveProfessionalFacilityBillingLedger({
      billingClassification: encounter.billingClassification as BillingClassification,
      billingExportRoute: exportReadiness.route,
      hasPrimaryDiagnosis: diagnosisCount > 0,
      hasProfessionalProvider,
      hasProcedureCodes: procedureCodeCount > 0,
      hasFacilityBillingIdentity: facilityBillingIdentityComplete,
      hasPayer: payerResolution.ok,
      encounterStatus: encounter.status,
      facilityBillingWorkflowMode: workflowConfig.billingClassificationMode,
    });

    let professionalLedgerLineCount = 0;
    let facilityLedgerLineCount = 0;
    for (const row of billingEvents) {
      if (row.billingSide === BillingSide.PROFESSIONAL || row.billingSide === BillingSide.BOTH) {
        professionalLedgerLineCount++;
      }
      if (row.billingSide === BillingSide.FACILITY || row.billingSide === BillingSide.BOTH) {
        facilityLedgerLineCount++;
      }
      if (row.billingSide === BillingSide.UNKNOWN) {
        professionalLedgerLineCount++;
        facilityLedgerLineCount++;
      }
    }

    return {
      encounterId: encounter.id,
      facilityId,
      billingClassification: encounter.billingClassification,
      exportRoute: exportReadiness.route,
      ...ledger,
      ledgerPreview: {
        professionalLineCount: professionalLedgerLineCount,
        facilityLineCount: facilityLedgerLineCount,
      },
      previewOnly: true as const,
    };
  }
}
