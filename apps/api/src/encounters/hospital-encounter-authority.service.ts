/**
 * D4A.2.8-HF2 — Server authority for hospital encounter resolution,
 * census eligibility, lineage redirect, and bed reconciliation.
 *
 * Pre-D3B safe (hospitalEpisodeFoundationEnabled=false): never select hospitalEpisodeId.
 */

import { Injectable, Logger } from "@nestjs/common";
import { EncounterStatus, EncounterType } from "@prisma/client";
import {
  AUTHORITATIVE_HOSPITAL_CENSUS_LINEAGE_RECOVERY_CERTIFICATION_ID,
  buildFacilityInvariantReport,
  evaluateHospitalCensusEligibility,
  hospitalEpisodeFoundationEnabledFromProcessEnv,
  readHospitalLineagePointers,
  reconcileBedAgainstCensus,
  resolveEncounterCanonicalBedKey,
  resolveHospitalEncounterAuthority,
  type BedCensusReconciliationV1,
  type HospitalCensusEligibilityV1,
  type HospitalCensusFacilityInvariantReportV1,
  type HospitalEncounterAuthorityInput,
  type HospitalEncounterResolutionV1,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import {
  SchemaCompatibleEncounterRepository,
  type CompatibleEncounterProjection,
} from "./schema-compatible-encounter.repository";
import { FacilityBedBoardService } from "../facilities/facility-bed-board.service";

export type HospitalAuthorityResolveOptions = {
  workspace?: "INPATIENT" | "OBSERVATION" | "ANY";
  /** When true, attempt unambiguous same-patient same-facility lineage redirect. */
  allowLineageRedirect?: boolean;
};

@Injectable()
export class HospitalEncounterAuthorityService {
  private readonly logger = new Logger(HospitalEncounterAuthorityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encounters: SchemaCompatibleEncounterRepository,
    private readonly bedBoard: FacilityBedBoardService
  ) {}

  certification(): string {
    return AUTHORITATIVE_HOSPITAL_CENSUS_LINEAGE_RECOVERY_CERTIFICATION_ID;
  }

  private toInput(row: CompatibleEncounterProjection): HospitalEncounterAuthorityInput {
    return {
      id: row.id,
      facilityId: row.facilityId,
      patientId: row.patientId,
      type: String(row.type),
      status: String(row.status),
      billingClassification: row.billingClassification,
      admissionSummaryJson: row.admissionSummaryJson,
      roomLabel: row.roomLabel,
      admittedAt: row.admittedAt,
      createdAt: row.createdAt,
      hospitalEpisodeId: row.hospitalEpisodeId,
    };
  }

  async evaluateCensusEligibility(
    expectedFacilityId: string,
    encounterId: string
  ): Promise<HospitalCensusEligibilityV1> {
    const row = await this.encounters.findEncounterByIdForAuthority(encounterId);
    return evaluateHospitalCensusEligibility({
      encounter: row ? this.toInput(row) : null,
      expectedFacilityId,
    });
  }

  /**
   * Resolve requested encounter for workspace / census consumers.
   * Loads by ID first (no facility filter) so FACILITY_MISMATCH is never hidden as NOT_FOUND.
   */
  async resolveRequestedEncounter(
    expectedFacilityId: string,
    requestedEncounterId: string,
    options?: HospitalAuthorityResolveOptions
  ): Promise<HospitalEncounterResolutionV1> {
    const requested = String(requestedEncounterId ?? "").trim();
    const facilityId = String(expectedFacilityId ?? "").trim();
    const workspace = options?.workspace ?? "ANY";

    const found = requested
      ? await this.encounters.findEncounterByIdForAuthority(requested)
      : null;

    let lineageDestination: CompatibleEncounterProjection | null = null;
    if (options?.allowLineageRedirect && found) {
      lineageDestination = await this.findUnambiguousLineageDestination(found, facilityId);
    }

    const resolution = resolveHospitalEncounterAuthority({
      requestedEncounterId: requested,
      expectedFacilityId: facilityId,
      foundById: found ? this.toInput(found) : null,
      lineageDestination: lineageDestination ? this.toInput(lineageDestination) : null,
      workspace,
    });

    this.logger.log(
      JSON.stringify({
        event: "hospital_encounter_resolution",
        certification: this.certification(),
        requestedEncounterId: requested || null,
        expectedFacilityId: facilityId || null,
        ok: resolution.ok,
        category: resolution.ok ? null : resolution.category,
        resolvedEncounterId: resolution.ok ? resolution.resolvedEncounterId : null,
        redirected: resolution.ok ? resolution.redirected : false,
        actualFacilityId: resolution.ok ? resolution.facilityId : resolution.actualFacilityId ?? null,
        actualEncounterType: resolution.ok
          ? resolution.encounterType
          : resolution.actualEncounterType ?? null,
        censusEligible: resolution.ok
          ? resolution.census.eligible
          : resolution.census.eligible,
        censusReasons: resolution.ok ? resolution.census.reasons : resolution.census.reasons,
        hospitalEpisodeFoundationEnabled: hospitalEpisodeFoundationEnabledFromProcessEnv(),
        // no PHI
      })
    );

    return resolution;
  }

  /**
   * Same-patient + same-facility destination only.
   * Prefers open INPATIENT that lists requested as originating ED / source / observation.
   * Returns null when zero or >1 candidates (never guess).
   */
  private async findUnambiguousLineageDestination(
    source: CompatibleEncounterProjection,
    expectedFacilityId: string
  ): Promise<CompatibleEncounterProjection | null> {
    const facilityId = String(source.facilityId ?? "").trim();
    if (!facilityId || (expectedFacilityId && facilityId !== expectedFacilityId)) {
      return null;
    }

    const sourceType = String(source.type).toUpperCase();
    // Only redirect FROM source ED (or closed/non-census) TO hospital destination
    if (sourceType !== "EMERGENCY" && sourceType !== "INPATIENT") {
      return null;
    }

    const sourceCensus = evaluateHospitalCensusEligibility({
      encounter: this.toInput(source),
      expectedFacilityId: facilityId,
    });
    // If source already counts toward hospital census, do not redirect away
    if (sourceCensus.countsTowardHospitalCensus && sourceType === "INPATIENT") {
      return null;
    }

    const openHospital = await this.encounters.findOpenHospitalEncountersForCensus(facilityId, {
      take: 500,
    });
    const candidates = openHospital.filter((row) => {
      if (row.patientId !== source.patientId) return false;
      if (row.id === source.id) return false;
      const lineage = readHospitalLineagePointers(this.toInput(row));
      return (
        lineage.originatingEdEncounterId === source.id ||
        lineage.sourceEncounterId === source.id ||
        lineage.observationEncounterId === source.id ||
        lineage.receivingEncounterId === source.id
      );
    });

    if (candidates.length !== 1) {
      if (candidates.length > 1) {
        this.logger.warn(
          JSON.stringify({
            event: "hospital_census_reconciliation_warning",
            code: "LINEAGE_AMBIGUOUS",
            sourceEncounterId: source.id,
            facilityId,
            candidateCount: candidates.length,
            candidateIds: candidates.map((c) => c.id),
          })
        );
      }
      return null;
    }
    return candidates[0] ?? null;
  }

  async reconcileBed(
    facilityId: string,
    bedKey: string
  ): Promise<BedCensusReconciliationV1> {
    const fid = String(facilityId ?? "").trim();
    const key = String(bedKey ?? "").trim();
    const bedRow = await this.bedBoard.getEffectiveBedRow(fid, key).catch(() => null);
    const occupantId = String(bedRow?.occupantEncounterId ?? "").trim();
    const occupant = occupantId
      ? await this.encounters.findEncounterByIdForAuthority(occupantId)
      : null;

    const hospital = await this.encounters.findOpenHospitalEncountersForCensus(fid);
    const onBed = hospital
      .filter((e) => {
        const bk = resolveEncounterCanonicalBedKey({
          roomLabel: e.roomLabel,
          type: e.type,
          admissionSummaryJson: e.admissionSummaryJson,
        });
        return bk === key || bk === key.replace("-", ":");
      })
      .filter((e) =>
        evaluateHospitalCensusEligibility({
          encounter: this.toInput(e),
          expectedFacilityId: fid,
        }).countsTowardHospitalCensus
      )
      .map((e) => e.id);

    const result = reconcileBedAgainstCensus({
      bedKeyRaw: key,
      occupant: occupant ? this.toInput(occupant) : null,
      expectedFacilityId: fid,
      censusEligibleEncounterIdsOnSameBed: onBed,
    });

    if (result.warnings.length) {
      this.logger.warn(
        JSON.stringify({
          event: "hospital_census_reconciliation_warning",
          facilityId: fid,
          bedKey: result.bedKey,
          occupantEncounterId: result.occupantEncounterId,
          occupantType: result.occupantType,
          warnings: result.warnings,
          censusEncounterIdsOnBed: result.censusEncounterIdsOnBed,
        })
      );
    }
    return result;
  }

  /** Admin-only: facility counts, no PHI. */
  async getFacilityReconciliationReport(
    facilityId: string
  ): Promise<HospitalCensusFacilityInvariantReportV1 & { certification: string }> {
    const fid = String(facilityId ?? "").trim();
    const [hospital, bedView] = await Promise.all([
      this.encounters.findOpenHospitalEncountersForCensus(fid),
      this.bedBoard.getBedBoard(fid).catch(() => null),
    ]);

    // Also load open non-hospital occupants that may occupy beds (ED on MS)
    const foundationOn = hospitalEpisodeFoundationEnabledFromProcessEnv();
    const openAll = await this.prisma.encounter.findMany({
      where: { facilityId: fid, status: EncounterStatus.OPEN },
      select: {
        id: true,
        facilityId: true,
        patientId: true,
        type: true,
        status: true,
        billingClassification: true,
        admissionSummaryJson: true,
        roomLabel: true,
        admittedAt: true,
        createdAt: true,
        ...(foundationOn ? { hospitalEpisodeId: true } : {}),
      },
      take: 1000,
    });

    const occupiedIds: string[] = [];
    if (bedView?.units) {
      for (const unit of bedView.units) {
        for (const bed of unit.beds ?? []) {
          const occ = String(bed.occupantEncounterId ?? "").trim();
          if (
            occ &&
            (String(bed.status ?? "").toUpperCase() === "OCCUPIED" || Boolean(bed.occupantEncounterId))
          ) {
            occupiedIds.push(occ);
          }
        }
      }
    }

    const inputs: HospitalEncounterAuthorityInput[] = openAll.map((r) => ({
      id: r.id,
      facilityId: r.facilityId,
      patientId: r.patientId,
      type: String(r.type),
      status: String(r.status),
      billingClassification: r.billingClassification ?? null,
      admissionSummaryJson: r.admissionSummaryJson,
      roomLabel: r.roomLabel,
      admittedAt: r.admittedAt,
      createdAt: r.createdAt,
      hospitalEpisodeId:
        foundationOn && "hospitalEpisodeId" in r
          ? ((r as { hospitalEpisodeId?: string | null }).hospitalEpisodeId ?? null)
          : null,
    }));

    // Ensure census hospital rows included
    for (const h of hospital) {
      if (!inputs.some((i) => i.id === h.id)) inputs.push(this.toInput(h));
    }

    const report = buildFacilityInvariantReport({
      facilityId: fid,
      encounters: inputs,
      occupiedBedOccupantIds: occupiedIds,
    });

    if (report.warnings.length) {
      this.logger.warn(
        JSON.stringify({
          event: "hospital_census_reconciliation_warning",
          ...report,
        })
      );
    }

    return {
      ...report,
      certification: this.certification(),
    };
  }

  /** Map authority failure → bootstrap resolution shape used by existing UI. */
  toBootstrapResolution(resolution: HospitalEncounterResolutionV1): {
    ok: boolean;
    category?: string;
    requestedEncounterId: string | null;
    writersEnabled: boolean;
    actualEncounterType?: string | null;
    messageCode?: string;
    encounterId?: string;
    encounterType?: "INPATIENT" | "OBSERVATION";
    clinicalContext?: "INPATIENT" | "OBSERVATION";
    facilityId?: string;
    patientId?: string;
    status?: string;
    hospitalEpisodeId?: string | null;
    redirectedFromEncounterId?: string | null;
  } {
    if (!resolution.ok) {
      return {
        ok: false,
        category: resolution.category,
        requestedEncounterId: resolution.requestedEncounterId,
        writersEnabled: false,
        actualEncounterType: resolution.actualEncounterType ?? null,
        messageCode: resolution.messageCode,
      };
    }
    const ctx =
      resolution.clinicalContext === "OBSERVATION" ? "OBSERVATION" : "INPATIENT";
    return {
      ok: true,
      requestedEncounterId: resolution.requestedEncounterId,
      writersEnabled: true,
      encounterId: resolution.resolvedEncounterId,
      encounterType: ctx,
      clinicalContext: ctx,
      facilityId: resolution.facilityId,
      patientId: resolution.patientId,
      status: resolution.status,
      hospitalEpisodeId: resolution.hospitalEpisodeId,
      redirectedFromEncounterId: resolution.redirected
        ? resolution.requestedEncounterId
        : null,
    };
  }

  /** Guard: hospital bed assignment must target an open hospital-eligible encounter. */
  assertAssignableHospitalEncounter(input: {
    encounterType: string;
    status: string;
  }): { ok: true } | { ok: false; reason: string } {
    if (String(input.status).toUpperCase() !== "OPEN") {
      return { ok: false, reason: "STATUS_NOT_OPEN" };
    }
    if (String(input.encounterType).toUpperCase() === EncounterType.EMERGENCY) {
      return { ok: false, reason: "SOURCE_ED_ENCOUNTER" };
    }
    if (String(input.encounterType).toUpperCase() !== EncounterType.INPATIENT) {
      return { ok: false, reason: "TYPE_NOT_HOSPITAL" };
    }
    return { ok: true };
  }
}
