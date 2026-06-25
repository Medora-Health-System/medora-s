import {
  buildMarShiftTimelineCompletionSummary,
  formatMarShiftTimelineClinicianDisplayWithRole,
  formatMarShiftTimelineClinicianInitials,
  isIvpbSessionDoseKind,
  medicationAdministrationRowIsInfusionStart,
  medicationAdministrationRowIsInfusionStop,
  parseMedicationDoseKind,
  parseMedicationDoseStatus,
  parseMedicationInfusionStopReasonFromNotes,
  type MarShiftTimelineAdministrationEnrichment,
} from "@medora/shared";
import { MedicationAdministrationInfusionPhase } from "@prisma/client";
import type { PrismaService } from "../prisma/prisma.service";
import type { MedicationPassQueueDoseRow } from "./medication-pass-queue-dose.select";

const MAR_ENRICHMENT_SELECT = {
  id: true,
  orderItemId: true,
  medicationDoseInstanceId: true,
  infusionSessionId: true,
  infusionSessionKey: true,
  infusionPhase: true,
  notes: true,
  marAction: true,
  administeredAt: true,
  effectiveAdministeredAt: true,
  administeredByUserId: true,
  administeredBy: {
    select: { firstName: true, lastName: true },
  },
} as const;

type MarEnrichmentRow = {
  id: string;
  orderItemId: string | null;
  medicationDoseInstanceId: string | null;
  infusionSessionId: string | null;
  infusionSessionKey: string | null;
  infusionPhase: string | null;
  notes: string | null;
  marAction: string | null;
  administeredAt: Date;
  effectiveAdministeredAt: Date | null;
  administeredByUserId: string;
  administeredBy: { firstName: string | null; lastName: string | null };
};

type InfusionSessionRow = {
  id: string;
  startedAt: Date | null;
  stoppedAt: Date | null;
  legacyInfusionSessionKey: string | null;
};

function emptyEnrichment(): MarShiftTimelineAdministrationEnrichment {
  return {
    startedAt: null,
    startedByDisplay: null,
    startedByInitials: null,
    stoppedAt: null,
    stoppedByDisplay: null,
    stoppedByInitials: null,
    administeredAt: null,
    administeredByDisplay: null,
    administeredByInitials: null,
    completionSummary: null,
    infusionStopReasonCode: null,
  };
}

function marEffectiveAt(row: MarEnrichmentRow): Date {
  return row.effectiveAdministeredAt ?? row.administeredAt;
}

function performerFields(
  row: MarEnrichmentRow,
  roleByUserId: Map<string, string>
): {
  at: string;
  display: string | null;
  initials: string | null;
} {
  const at = marEffectiveAt(row).toISOString();
  const roleCode = roleByUserId.get(row.administeredByUserId) ?? null;
  const display = formatMarShiftTimelineClinicianDisplayWithRole(
    row.administeredBy.firstName,
    row.administeredBy.lastName,
    roleCode
  );
  const initials = formatMarShiftTimelineClinicianInitials(
    row.administeredBy.firstName,
    row.administeredBy.lastName
  );
  return { at, display, initials };
}

function findStartMar(
  rows: MarEnrichmentRow[],
  doseId: string
): MarEnrichmentRow | undefined {
  const forDose = rows.filter(
    (row) =>
      row.medicationDoseInstanceId === doseId &&
      medicationAdministrationRowIsInfusionStart(row.notes, row.infusionPhase)
  );
  if (forDose.length > 0) return forDose[0];

  const byPhase = rows.filter(
    (row) => row.infusionPhase === MedicationAdministrationInfusionPhase.INFUSION_START
  );
  if (byPhase.length > 0) return byPhase[0];

  return rows.find((row) =>
    medicationAdministrationRowIsInfusionStart(row.notes, row.infusionPhase)
  );
}

function findStopMar(
  rows: MarEnrichmentRow[],
  doseId: string,
  terminalMarId: string | null
): MarEnrichmentRow | undefined {
  if (terminalMarId) {
    const terminal = rows.find((row) => row.id === terminalMarId);
    if (terminal) return terminal;
  }

  const forDose = rows.filter(
    (row) =>
      row.medicationDoseInstanceId === doseId &&
      (row.infusionPhase === MedicationAdministrationInfusionPhase.INFUSION_STOP ||
        medicationAdministrationRowIsInfusionStop(row.notes, row.infusionPhase))
  );
  if (forDose.length > 0) return forDose[forDose.length - 1];

  const byPhase = rows.filter(
    (row) => row.infusionPhase === MedicationAdministrationInfusionPhase.INFUSION_STOP
  );
  if (byPhase.length > 0) return byPhase[byPhase.length - 1];

  return rows.find((row) =>
    medicationAdministrationRowIsInfusionStop(row.notes, row.infusionPhase)
  );
}

function mergeMarRowsForDose(
  dose: MedicationPassQueueDoseRow,
  marRows: MarEnrichmentRow[],
  session: InfusionSessionRow | undefined
): MarEnrichmentRow[] {
  const merged: MarEnrichmentRow[] = [];
  const seen = new Set<string>();

  const push = (row: MarEnrichmentRow) => {
    if (seen.has(row.id)) return;
    seen.add(row.id);
    merged.push(row);
  };

  for (const row of marRows) {
    if (row.medicationDoseInstanceId === dose.id) push(row);
  }

  const sessionId = dose.infusionSessionId?.trim();
  if (sessionId) {
    for (const row of marRows) {
      if (row.infusionSessionId === sessionId) push(row);
    }
  }

  const orderItemId = dose.orderItemId?.trim();
  if (orderItemId) {
    for (const row of marRows) {
      if (row.orderItemId !== orderItemId) continue;
      if (
        row.infusionPhase === MedicationAdministrationInfusionPhase.INFUSION_START ||
        row.infusionPhase === MedicationAdministrationInfusionPhase.INFUSION_STOP ||
        medicationAdministrationRowIsInfusionStart(row.notes, row.infusionPhase) ||
        medicationAdministrationRowIsInfusionStop(row.notes, row.infusionPhase)
      ) {
        push(row);
        continue;
      }
      const action = row.marAction?.trim().toLowerCase() ?? "";
      if (action === "administered" || action === "refused" || action === "not_available") {
        push(row);
      }
    }
  }

  const sessionKey = session?.legacyInfusionSessionKey?.trim();
  if (sessionKey) {
    for (const row of marRows) {
      if (row.infusionSessionKey === sessionKey) push(row);
    }
  }

  if (dose.terminalMedicationAdministrationId) {
    const terminal = marRows.find((row) => row.id === dose.terminalMedicationAdministrationId);
    if (terminal) push(terminal);
  }

  return merged;
}

function resolveDoseEnrichment(
  dose: MedicationPassQueueDoseRow,
  marRows: MarEnrichmentRow[],
  session: InfusionSessionRow | undefined,
  roleByUserId: Map<string, string>,
  facilityTimeZone: string
): MarShiftTimelineAdministrationEnrichment {
  const parsedStatus = parseMedicationDoseStatus(dose.doseStatus);
  const parsedKind = parseMedicationDoseKind(dose.doseKind);
  if (!parsedStatus) return emptyEnrichment();

  const isIvpb = isIvpbSessionDoseKind(parsedKind ?? dose.doseKind);
  const startMar = findStartMar(marRows, dose.id);
  const stopMar = findStopMar(marRows, dose.id, dose.terminalMedicationAdministrationId);

  const enrichment = emptyEnrichment();

  if (isIvpb) {
    if (startMar) {
      const start = performerFields(startMar, roleByUserId);
      enrichment.startedAt = start.at;
      enrichment.startedByDisplay = start.display;
      enrichment.startedByInitials = start.initials;
    } else if (session?.startedAt) {
      enrichment.startedAt = session.startedAt.toISOString();
    }

    if (parsedStatus === "IN_PROGRESS" && enrichment.startedAt) {
      enrichment.completionSummary = buildMarShiftTimelineCompletionSummary({
        doseKind: parsedKind ?? dose.doseKind,
        doseStatus: parsedStatus,
        startedAt: enrichment.startedAt,
        startedByInitials: enrichment.startedByInitials,
        stoppedAt: null,
        stoppedByInitials: null,
        administeredAt: null,
        administeredByInitials: null,
        facilityTimeZone,
      });
      return enrichment;
    }

    if (stopMar) {
      const stop = performerFields(stopMar, roleByUserId);
      enrichment.stoppedAt = stop.at;
      enrichment.stoppedByDisplay = stop.display;
      enrichment.stoppedByInitials = stop.initials;
      enrichment.infusionStopReasonCode =
        parseMedicationInfusionStopReasonFromNotes(stopMar.notes).reasonCode;
    } else if (session?.stoppedAt) {
      enrichment.stoppedAt = session.stoppedAt.toISOString();
    }

    if (parsedStatus === "COMPLETED") {
      enrichment.completionSummary = buildMarShiftTimelineCompletionSummary({
        doseKind: parsedKind ?? dose.doseKind,
        doseStatus: parsedStatus,
        startedAt: enrichment.startedAt,
        startedByInitials: enrichment.startedByInitials,
        stoppedAt: enrichment.stoppedAt,
        stoppedByInitials: enrichment.stoppedByInitials,
        administeredAt: null,
        administeredByInitials: null,
        facilityTimeZone,
      });
    }

    return enrichment;
  }

  const terminalMar =
    stopMar ??
    (dose.terminalMedicationAdministrationId
      ? marRows.find((row) => row.id === dose.terminalMedicationAdministrationId)
      : marRows[marRows.length - 1]);

  if (terminalMar && parsedStatus === "COMPLETED") {
    const admin = performerFields(terminalMar, roleByUserId);
    enrichment.administeredAt = admin.at;
    enrichment.administeredByDisplay = admin.display;
    enrichment.administeredByInitials = admin.initials;
    enrichment.administrationNotes = terminalMar.notes?.trim() || null;
    enrichment.medicationAdministrationId = terminalMar.id;
    enrichment.marAction = terminalMar.marAction?.trim() || null;
    enrichment.completionSummary = buildMarShiftTimelineCompletionSummary({
      doseKind: parsedKind ?? dose.doseKind,
      doseStatus: parsedStatus,
      startedAt: null,
      startedByInitials: null,
      stoppedAt: null,
      stoppedByInitials: null,
      administeredAt: enrichment.administeredAt,
      administeredByInitials: enrichment.administeredByInitials,
      facilityTimeZone,
    });
  }

  if (parsedStatus === "HELD" && terminalMar) {
    const held = performerFields(terminalMar, roleByUserId);
    enrichment.administeredAt = held.at;
    enrichment.administeredByDisplay = held.display;
    enrichment.administeredByInitials = held.initials;
  }

  return enrichment;
}

async function loadPerformerRoleCodes(
  prisma: PrismaService,
  facilityId: string | undefined,
  userIds: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (!facilityId?.trim() || userIds.length === 0) return result;

  const rows = await prisma.userRole.findMany({
    where: {
      facilityId: facilityId.trim(),
      userId: { in: userIds },
      isActive: true,
    },
    select: {
      userId: true,
      role: { select: { code: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  for (const row of rows) {
    if (!result.has(row.userId)) {
      result.set(row.userId, String(row.role.code));
    }
  }

  return result;
}

/** Read-only MAR / infusion enrichment for facility shift timeline cells (M1.8B.7K.3 / K.5). */
export async function loadMarShiftTimelineAdministrationEnrichment(
  prisma: PrismaService,
  doses: MedicationPassQueueDoseRow[],
  facilityId?: string,
  facilityTimeZone?: string
): Promise<Map<string, MarShiftTimelineAdministrationEnrichment>> {
  const result = new Map<string, MarShiftTimelineAdministrationEnrichment>();
  if (doses.length === 0) return result;

  const doseIds = doses.map((d) => d.id);
  const orderItemIds = [
    ...new Set(
      doses
        .map((d) => d.orderItemId?.trim())
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const sessionIds = [
    ...new Set(
      doses
        .map((d) => d.infusionSessionId?.trim())
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const terminalMarIds = [
    ...new Set(
      doses
        .map((d) => d.terminalMedicationAdministrationId?.trim())
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const [marRowsRaw, sessions] = await Promise.all([
    prisma.medicationAdministration.findMany({
      where: {
        OR: [
          { medicationDoseInstanceId: { in: doseIds } },
          ...(terminalMarIds.length > 0 ? [{ id: { in: terminalMarIds } }] : []),
          ...(sessionIds.length > 0 ? [{ infusionSessionId: { in: sessionIds } }] : []),
          ...(orderItemIds.length > 0 ? [{ orderItemId: { in: orderItemIds } }] : []),
        ],
      },
      select: MAR_ENRICHMENT_SELECT,
      orderBy: { administeredAt: "asc" },
    }),
    sessionIds.length > 0
      ? prisma.infusionSession.findMany({
          where: { id: { in: sessionIds } },
          select: {
            id: true,
            startedAt: true,
            stoppedAt: true,
            legacyInfusionSessionKey: true,
          },
        })
      : Promise.resolve([] as InfusionSessionRow[]),
  ]);

  const marRows = marRowsRaw as MarEnrichmentRow[];

  const performerIds = [...new Set(marRows.map((row) => row.administeredByUserId))];
  const roleByUserId = await loadPerformerRoleCodes(prisma, facilityId, performerIds);

  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  for (const dose of doses) {
    const sessionId = dose.infusionSessionId?.trim();
    const merged = mergeMarRowsForDose(
      dose,
      marRows,
      sessionId ? sessionById.get(sessionId) : undefined
    );

    result.set(
      dose.id,
      resolveDoseEnrichment(
        dose,
        merged,
        sessionId ? sessionById.get(sessionId) : undefined,
        roleByUserId,
        facilityTimeZone ?? "UTC"
      )
    );
  }

  return result;
}
