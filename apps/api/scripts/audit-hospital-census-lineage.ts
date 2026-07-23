/**
 * D4A.2.8-HF2 — READ-ONLY forensic audit: hospital census, encounter lineage, bed linkage.
 *
 * SAFETY:
 * - No create / update / delete / upsert / migrate / seed
 * - No PHI dump (names, DOB, MRN, addresses, phones, free text redacted)
 * - Outputs IDs, lifecycle states, timestamps, linkage fields + invariant report
 *
 * Usage (local dry-run against apps/api/.env DATABASE_URL):
 *   cd apps/api && \
 *   FACILITY_ID=<uuid> ENCOUNTER_ID=<uuid> BED_KEY=MS:1 \
 *   npx ts-node --transpile-only scripts/audit-hospital-census-lineage.ts
 *
 * Production (operator; read-only DATABASE_URL only):
 *   FACILITY_ID=90395a66-20d0-4165-aa76-e37ba3d520ed \
 *   ENCOUNTER_ID=8ad88df5-68e0-4fc8-9ca6-2eb116d32ced \
 *   BED_KEY=MS:1 \
 *   DATABASE_URL="$PRODUCTION_READONLY_DATABASE_URL" \
 *   npx ts-node --transpile-only scripts/audit-hospital-census-lineage.ts
 *
 * Or via npm script:
 *   npm run audit:hospital-census-lineage --workspace=@medora/api
 */

import { PrismaClient, Prisma } from "@prisma/client";
import {
  AUTHORITATIVE_HOSPITAL_CENSUS_LINEAGE_RECOVERY_CERTIFICATION_ID,
  buildFacilityInvariantReport,
  evaluateHospitalCensusEligibility,
  hospitalEpisodeFoundationEnabledFromProcessEnv,
  readHospitalLineagePointers,
  reconcileBedAgainstCensus,
  resolveEncounterCanonicalBedKey,
  resolveHospitalEncounterAuthority,
  type HospitalEncounterAuthorityInput,
} from "@medora/shared";

const prisma = new PrismaClient();

const CERT = AUTHORITATIVE_HOSPITAL_CENSUS_LINEAGE_RECOVERY_CERTIFICATION_ID;

function env(name: string): string {
  return String(process.env[name] ?? "").trim();
}

function maskDatabaseUrl(url: string | undefined): string {
  if (!url?.trim()) return "unset";
  try {
    const parsed = new URL(url.replace(/^postgres(ql)?:\/\//, "http://"));
    return `${parsed.hostname}:${parsed.port || "5432"}${parsed.pathname}`;
  } catch {
    return "configured";
  }
}

function redactText(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value);
  if (!s.trim()) return null;
  return `[REDACTED len=${s.length}]`;
}

function iso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function foundationSelect(): boolean {
  return hospitalEpisodeFoundationEnabledFromProcessEnv();
}

type EncRow = {
  id: string;
  facilityId: string;
  patientId: string;
  type: string;
  status: string;
  billingClassification: string | null;
  admissionSummaryJson: unknown;
  roomLabel: string | null;
  admittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  dischargedAt: Date | null;
  hospitalEpisodeId?: string | null;
  workflowState: string | null;
};

function toAuthority(row: EncRow): HospitalEncounterAuthorityInput {
  return {
    id: row.id,
    facilityId: row.facilityId,
    patientId: row.patientId,
    type: row.type,
    status: row.status,
    billingClassification: row.billingClassification,
    admissionSummaryJson: row.admissionSummaryJson,
    roomLabel: row.roomLabel,
    admittedAt: row.admittedAt,
    createdAt: row.createdAt,
    hospitalEpisodeId: row.hospitalEpisodeId ?? null,
    dischargedAt: row.dischargedAt,
  };
}

function encSelect(): Prisma.EncounterSelect {
  const base: Prisma.EncounterSelect = {
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
    updatedAt: true,
    dischargedAt: true,
    workflowState: true,
  };
  if (foundationSelect()) {
    return { ...base, hospitalEpisodeId: true };
  }
  return base;
}

function summarizeEncounter(row: EncRow, expectedFacilityId: string) {
  const lineage = readHospitalLineagePointers(toAuthority(row));
  const census = evaluateHospitalCensusEligibility({
    encounter: toAuthority(row),
    expectedFacilityId,
  });
  const bedKey = resolveEncounterCanonicalBedKey({
    roomLabel: row.roomLabel,
    type: row.type,
    admissionSummaryJson: row.admissionSummaryJson,
  });
  return {
    id: row.id,
    facilityId: row.facilityId,
    patientId: row.patientId,
    type: row.type,
    status: row.status,
    workflowState: row.workflowState,
    billingClassification: row.billingClassification,
    roomLabel: row.roomLabel,
    canonicalBedKey: bedKey,
    admittedAt: iso(row.admittedAt),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    dischargedAt: iso(row.dischargedAt),
    hospitalEpisodeId: row.hospitalEpisodeId ?? null,
    facilityMatchesExpected: row.facilityId === expectedFacilityId,
    censusEligibility: census,
    lineage,
    // PHI-safe: only presence flags for free-text fields
    freeTextPresent: {
      chiefComplaint: false, // not selected
      admissionDiagnosis: Boolean(
        (row.admissionSummaryJson as { admissionDiagnosis?: unknown } | null)?.admissionDiagnosis
      ),
      notes: false,
    },
  };
}

async function sectionA(encounterId: string, facilityId: string) {
  const row = (await prisma.encounter.findUnique({
    where: { id: encounterId },
    select: encSelect(),
  })) as EncRow | null;

  const resolution = resolveHospitalEncounterAuthority({
    requestedEncounterId: encounterId,
    expectedFacilityId: facilityId,
    foundById: row ? toAuthority(row) : null,
    workspace: "ANY",
  });

  return {
    section: "A_ENCOUNTER_BY_ID_NO_FACILITY_FILTER",
    requestedEncounterId: encounterId,
    expectedFacilityId: facilityId,
    found: row ? summarizeEncounter(row, facilityId) : null,
    resolution,
    note:
      row && row.facilityId !== facilityId
        ? "FACILITY_MISMATCH — must never be collapsed to NOT_FOUND"
        : row
          ? "Encounter exists"
          : "Encounter not found globally",
  };
}

async function sectionB(patientId: string, facilityId: string) {
  if (!patientId) {
    return { section: "B_PATIENT_ENCOUNTERS", skipped: true, reason: "no patientId from A" };
  }
  const rows = (await prisma.encounter.findMany({
    where: { patientId },
    select: encSelect(),
    orderBy: { createdAt: "asc" },
    take: 100,
  })) as EncRow[];

  return {
    section: "B_ALL_ENCOUNTERS_SAME_PATIENT",
    patientId,
    count: rows.length,
    encounters: rows.map((r) => summarizeEncounter(r, facilityId)),
  };
}

async function sectionC(facilityId: string, bedKey: string) {
  const open = (await prisma.encounter.findMany({
    where: { facilityId, status: "OPEN", roomLabel: { not: null } },
    select: encSelect(),
    take: 500,
  })) as EncRow[];

  const matching = open.filter((r) => {
    const key = resolveEncounterCanonicalBedKey({
      roomLabel: r.roomLabel,
      type: r.type,
      admissionSummaryJson: r.admissionSummaryJson,
    });
    if (!key) return false;
    const display = (r.roomLabel ?? "").toUpperCase();
    const want = bedKey.toUpperCase().replace(/-/g, ":");
    return (
      key.toUpperCase() === want ||
      key.toUpperCase().replace(":", "-") === bedKey.toUpperCase() ||
      display.includes(bedKey.toUpperCase().replace(":", "-")) ||
      display.includes(bedKey.split(":").pop() ?? "")
    );
  });

  const placements = await prisma.internalPlacementRequest
    .findMany({
      where: {
        facilityId,
        OR: [
          { assignedBedKey: { contains: bedKey.replace(":", "-"), mode: "insensitive" } },
          { assignedBedKey: { contains: bedKey, mode: "insensitive" } },
          { assignedBedKey: bedKey },
        ],
      },
      select: {
        id: true,
        status: true,
        assignedBedKey: true,
        originatingEncounterId: true,
        receivingEncounterId: true,
        receivingEncounterLifecycle: true,
        requestedEncounterType: true,
        patientId: true,
        createdAt: true,
        updatedAt: true,
      },
      take: 50,
    })
    .catch((err: unknown) => ({
      error: err instanceof Error ? err.message : "placement_query_failed",
      rows: [] as never[],
    }));

  const bedAudits = await prisma.auditLog
    .findMany({
      where: {
        facilityId,
        entityType: "FacilityBed",
        OR: [{ entityId: bedKey }, { entityId: bedKey.replace(":", "-") }],
      },
      select: {
        id: true,
        action: true,
        entityId: true,
        encounterId: true,
        createdAt: true,
        metadata: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    })
    .catch(() => []);

  return {
    section: "C_BED_MS1_AUTHORITATIVE_ASSIGNMENT",
    bedKey,
    openEncountersMatchingBed: matching.map((r) => summarizeEncounter(r, facilityId)),
    internalPlacementRequests:
      Array.isArray(placements) ? placements : { error: (placements as { error: string }).error },
    recentBedAuditEvents: bedAudits.map((a) => ({
      id: a.id,
      action: a.action,
      entityId: a.entityId,
      encounterId: a.encounterId,
      createdAt: iso(a.createdAt),
      metadataEvent:
        a.metadata && typeof a.metadata === "object" && !Array.isArray(a.metadata)
          ? String((a.metadata as { event?: unknown }).event ?? "")
          : null,
      // never dump reasonText / names from metadata
    })),
  };
}

async function sectionD(patientId: string, facilityId: string) {
  if (!patientId) {
    return { section: "D_ADMISSION_LIFECYCLE_SEQUENCE", skipped: true };
  }
  const audits = await prisma.auditLog.findMany({
    where: {
      patientId,
      OR: [
        { action: { in: ["ENCOUNTER_CREATE", "ENCOUNTER_UPDATE", "CHART_OPEN", "CHART_ACCESS"] } },
        {
          metadata: {
            path: ["event"],
            string_contains: "ADMISSION",
          },
        },
      ],
    },
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      encounterId: true,
      facilityId: true,
      createdAt: true,
      metadata: true,
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return {
    section: "D_ADMISSION_LIFECYCLE_SEQUENCE",
    patientId,
    expectedFacilityId: facilityId,
    events: audits.map((a) => {
      const meta =
        a.metadata && typeof a.metadata === "object" && !Array.isArray(a.metadata)
          ? (a.metadata as Record<string, unknown>)
          : {};
      return {
        id: a.id,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        encounterId: a.encounterId,
        facilityId: a.facilityId,
        facilityMatchesExpected: a.facilityId === facilityId,
        createdAt: iso(a.createdAt),
        metadataEvent: strOrNull(meta.event),
        metadataCategory: strOrNull(meta.category),
        // redact free-text metadata values
        metadataKeys: Object.keys(meta),
      };
    }),
  };
}

function strOrNull(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

async function sectionE(facilityId: string) {
  const rows = (await prisma.encounter.findMany({
    where: { facilityId, status: "OPEN", type: "INPATIENT" },
    select: encSelect(),
    take: 500,
  })) as EncRow[];

  const observationCandidates = rows
    .map((r) => {
      const census = evaluateHospitalCensusEligibility({
        encounter: toAuthority(r),
        expectedFacilityId: facilityId,
      });
      return { summary: summarizeEncounter(r, facilityId), census };
    })
    .filter(
      (x) =>
        x.census.clinicalContext === "OBSERVATION" ||
        x.census.reasons.length > 0 ||
        x.summary.lineage.requestedEncounterType === "OBSERVATION"
    );

  return {
    section: "E_BROAD_OBSERVATION_CANDIDATES",
    facilityId,
    openInpatientTypeCount: rows.length,
    observationClassifiedCount: observationCandidates.filter(
      (x) => x.census.clinicalContext === "OBSERVATION" && x.census.eligible
    ).length,
    candidates: observationCandidates.map((x) => ({
      id: x.summary.id,
      eligible: x.census.eligible,
      clinicalContext: x.census.clinicalContext,
      reasons: x.census.reasons,
      roomLabel: x.summary.roomLabel,
      canonicalBedKey: x.summary.canonicalBedKey,
      lineage: x.summary.lineage,
    })),
  };
}

async function sectionF(facilityId: string, encounterId: string, patientId: string | null) {
  const enc = await prisma.encounter.findUnique({
    where: { id: encounterId },
    select: { id: true, facilityId: true, patientId: true },
  });

  const patient =
    patientId || enc?.patientId
      ? await prisma.patient.findUnique({
          where: { id: patientId || enc!.patientId },
          select: { id: true, facilityId: true },
        })
      : null;

  let episodeMismatch: unknown = null;
  if (foundationSelect() && (patientId || enc?.patientId)) {
    const episodes = await prisma.hospitalEpisode
      .findMany({
        where: { patientId: patientId || enc!.patientId },
        select: {
          id: true,
          facilityId: true,
          patientId: true,
          status: true,
          originatingEncounterId: true,
          openedAt: true,
          closedAt: true,
        },
        take: 20,
      })
      .catch((e: unknown) => ({ error: e instanceof Error ? e.message : "episode_query_failed" }));
    episodeMismatch = episodes;
  }

  const placements = patientId || enc?.patientId
    ? await prisma.internalPlacementRequest
        .findMany({
          where: { patientId: patientId || enc!.patientId },
          select: {
            id: true,
            facilityId: true,
            patientId: true,
            originatingEncounterId: true,
            receivingEncounterId: true,
            status: true,
            assignedBedKey: true,
          },
          take: 20,
        })
        .catch(() => [])
    : [];

  return {
    section: "F_FACILITY_SCOPING_MISMATCHES",
    expectedFacilityId: facilityId,
    encounterFacilityId: enc?.facilityId ?? null,
    encounterFacilityMismatch: enc ? enc.facilityId !== facilityId : null,
    patientFacilityId: patient?.facilityId ?? null,
    patientFacilityMismatch: patient ? patient.facilityId !== facilityId : null,
    hospitalEpisodes: episodeMismatch,
    placementFacilityMismatches: (Array.isArray(placements) ? placements : []).filter(
      (p) => p.facilityId !== facilityId
    ),
    hospitalEpisodeFoundationEnabled: foundationSelect(),
  };
}

async function main() {
  const facilityId = env("FACILITY_ID");
  const encounterId = env("ENCOUNTER_ID");
  const bedKey = env("BED_KEY") || "MS:1";

  const report: Record<string, unknown> = {
    certification: CERT,
    mode: "READ_ONLY",
    generatedAt: new Date().toISOString(),
    database: maskDatabaseUrl(process.env.DATABASE_URL),
    hospitalEpisodeFoundationEnabled: foundationSelect(),
    inputs: { facilityId, encounterId, bedKey },
    productionForensicStatus:
      maskDatabaseUrl(process.env.DATABASE_URL).includes("localhost") ||
      maskDatabaseUrl(process.env.DATABASE_URL).includes("127.0.0.1")
        ? "LOCAL_DRY_RUN_NOT_PRODUCTION"
        : "OPERATOR_RUN",
    phiPolicy: "Names/DOB/MRN/addresses/phones/free-text redacted or omitted",
  };

  if (!facilityId || !encounterId) {
    report.error =
      "FACILITY_ID and ENCOUNTER_ID are required. BED_KEY optional (default MS:1).";
    report.productionForensicStatus = "PENDING_OPERATOR_RUN";
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = 2;
    return;
  }

  // Prove read-only: refuse if AUDIT_ALLOW_WRITES is somehow set to mutate — we never mutate anyway.
  if (env("AUDIT_FORCE_WRITE") === "1") {
    report.error = "Refusing to run: AUDIT_FORCE_WRITE is set. This script is read-only.";
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = 3;
    return;
  }

  const a = await sectionA(encounterId, facilityId);
  report.A = a;
  const patientId =
    a.found && typeof a.found === "object" && a.found && "patientId" in a.found
      ? String((a.found as { patientId: string }).patientId)
      : "";

  report.B = await sectionB(patientId, facilityId);
  report.C = await sectionC(facilityId, bedKey);
  report.D = await sectionD(patientId, facilityId);
  report.E = await sectionE(facilityId);
  report.F = await sectionF(facilityId, encounterId, patientId || null);

  // Facility invariant snapshot (open encounters only, PHI-safe)
  const openRows = (await prisma.encounter.findMany({
    where: { facilityId, status: "OPEN" },
    select: encSelect(),
    take: 1000,
  })) as EncRow[];

  const occupiedIds: string[] = [];
  for (const r of openRows) {
    const key = resolveEncounterCanonicalBedKey({
      roomLabel: r.roomLabel,
      type: r.type,
      admissionSummaryJson: r.admissionSummaryJson,
    });
    if (!key) continue;
    const want = bedKey.toUpperCase().replace(/-/g, ":");
    if (key.toUpperCase() === want || key.toUpperCase().startsWith(want.split(":")[0] + ":")) {
      // collect all hospital-unit occupants for board-like occupied count
    }
    if (r.roomLabel) occupiedIds.push(r.id);
  }

  // Approximate board occupied: open with resolvable hospital bed key (MS/OBS/ICU)
  const boardOccupantIds = openRows
    .map((r) => ({
      id: r.id,
      key: resolveEncounterCanonicalBedKey({
        roomLabel: r.roomLabel,
        type: r.type,
        admissionSummaryJson: r.admissionSummaryJson,
      }),
      type: r.type,
    }))
    .filter((x) => x.key && !x.key.startsWith("ED:"))
    .map((x) => x.id);

  const invariant = buildFacilityInvariantReport({
    facilityId,
    encounters: openRows.map(toAuthority),
    occupiedBedOccupantIds: boardOccupantIds,
  });

  const targetOccupant = openRows.find((r) => {
    const key = resolveEncounterCanonicalBedKey({
      roomLabel: r.roomLabel,
      type: r.type,
      admissionSummaryJson: r.admissionSummaryJson,
    });
    return key?.toUpperCase() === bedKey.toUpperCase().replace(/-/g, ":");
  });

  report.bedReconciliation = reconcileBedAgainstCensus({
    bedKeyRaw: bedKey,
    occupant: targetOccupant ? toAuthority(targetOccupant) : null,
    expectedFacilityId: facilityId,
    censusEligibleEncounterIdsOnSameBed: openRows
      .filter((r) => {
        const elig = evaluateHospitalCensusEligibility({
          encounter: toAuthority(r),
          expectedFacilityId: facilityId,
        });
        if (!elig.countsTowardHospitalCensus) return false;
        const key = resolveEncounterCanonicalBedKey({
          roomLabel: r.roomLabel,
          type: r.type,
          admissionSummaryJson: r.admissionSummaryJson,
        });
        return key?.toUpperCase() === bedKey.toUpperCase().replace(/-/g, ":");
      })
      .map((r) => r.id),
  });

  report.invariantReport = invariant;
  report.redactionSample = {
    patientName: redactText("SAMPLE_NAME_NEVER_FROM_DB"),
    note: "Production rows never include patient names/MRN/DOB in this audit output.",
  };

  // Proven cause hints from this run (code+data); never invent rows that weren't read
  const hints: string[] = [];
  if (a.resolution && typeof a.resolution === "object" && "category" in a.resolution) {
    hints.push(`resolution_category=${String((a.resolution as { category?: string }).category)}`);
  }
  if (invariant.occupiedBedsWithoutCensusEncounter > 0) {
    hints.push("BED_CENSUS_DIVERGENCE");
  }
  if (invariant.edOccupantsOnHospitalBeds > 0) {
    hints.push("ED_ON_HOSPITAL_BED");
  }
  report.causeHintsFromThisRun = hints;

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((err) => {
    console.error(
      JSON.stringify(
        {
          certification: CERT,
          mode: "READ_ONLY",
          error: err instanceof Error ? err.message : String(err),
          productionForensicStatus: "PENDING_OPERATOR_RUN",
          database: maskDatabaseUrl(process.env.DATABASE_URL),
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
