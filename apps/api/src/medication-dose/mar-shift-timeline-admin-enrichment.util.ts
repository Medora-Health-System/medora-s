import {
  buildMarShiftTimelineCompletionSummary,
  formatMarShiftTimelineClinicianDisplay,
  formatMarShiftTimelineClinicianInitials,
  isIvpbSessionDoseKind,
  medicationAdministrationRowIsInfusionStart,
  medicationAdministrationRowIsInfusionStop,
  parseMedicationDoseKind,
  parseMedicationDoseStatus,
  type MarShiftTimelineAdministrationEnrichment,
} from "@medora/shared";
import type { PrismaService } from "../prisma/prisma.service";
import type { MedicationPassQueueDoseRow } from "./medication-pass-queue-dose.select";

const MAR_ENRICHMENT_SELECT = {
  id: true,
  medicationDoseInstanceId: true,
  infusionSessionId: true,
  infusionPhase: true,
  notes: true,
  administeredAt: true,
  effectiveAdministeredAt: true,
  administeredBy: {
    select: { firstName: true, lastName: true },
  },
} as const;

type MarEnrichmentRow = {
  id: string;
  medicationDoseInstanceId: string | null;
  infusionSessionId: string | null;
  infusionPhase: string | null;
  notes: string | null;
  administeredAt: Date;
  effectiveAdministeredAt: Date | null;
  administeredBy: { firstName: string | null; lastName: string | null };
};

type InfusionSessionRow = {
  id: string;
  startedAt: Date | null;
  stoppedAt: Date | null;
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
  };
}

function marEffectiveAt(row: MarEnrichmentRow): Date {
  return row.effectiveAdministeredAt ?? row.administeredAt;
}

function performerFields(row: MarEnrichmentRow): {
  at: string;
  display: string | null;
  initials: string | null;
} {
  const at = marEffectiveAt(row).toISOString();
  const display = formatMarShiftTimelineClinicianDisplay(
    row.administeredBy.firstName,
    row.administeredBy.lastName
  );
  const initials = formatMarShiftTimelineClinicianInitials(
    row.administeredBy.firstName,
    row.administeredBy.lastName
  );
  return { at, display, initials };
}

function findStartMar(rows: MarEnrichmentRow[]): MarEnrichmentRow | undefined {
  return rows.find((row) =>
    medicationAdministrationRowIsInfusionStart(row.notes, row.infusionPhase)
  );
}

function findStopMar(rows: MarEnrichmentRow[], terminalMarId: string | null): MarEnrichmentRow | undefined {
  if (terminalMarId) {
    const terminal = rows.find((row) => row.id === terminalMarId);
    if (terminal) return terminal;
  }
  return rows.find((row) =>
    medicationAdministrationRowIsInfusionStop(row.notes, row.infusionPhase)
  );
}

function resolveDoseEnrichment(
  dose: MedicationPassQueueDoseRow,
  marRows: MarEnrichmentRow[],
  session: InfusionSessionRow | undefined
): MarShiftTimelineAdministrationEnrichment {
  const parsedStatus = parseMedicationDoseStatus(dose.doseStatus);
  const parsedKind = parseMedicationDoseKind(dose.doseKind);
  if (!parsedStatus) return emptyEnrichment();

  const isIvpb = isIvpbSessionDoseKind(parsedKind ?? dose.doseKind);
  const startMar = findStartMar(marRows);
  const stopMar = findStopMar(marRows, dose.terminalMedicationAdministrationId);

  const enrichment = emptyEnrichment();

  if (isIvpb) {
    if (startMar) {
      const start = performerFields(startMar);
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
      });
      return enrichment;
    }

    if (stopMar) {
      const stop = performerFields(stopMar);
      enrichment.stoppedAt = stop.at;
      enrichment.stoppedByDisplay = stop.display;
      enrichment.stoppedByInitials = stop.initials;
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
    const admin = performerFields(terminalMar);
    enrichment.administeredAt = admin.at;
    enrichment.administeredByDisplay = admin.display;
    enrichment.administeredByInitials = admin.initials;
    enrichment.completionSummary = buildMarShiftTimelineCompletionSummary({
      doseKind: parsedKind ?? dose.doseKind,
      doseStatus: parsedStatus,
      startedAt: null,
      startedByInitials: null,
      stoppedAt: null,
      stoppedByInitials: null,
      administeredAt: enrichment.administeredAt,
      administeredByInitials: enrichment.administeredByInitials,
    });
  }

  if (parsedStatus === "HELD" && terminalMar) {
    const held = performerFields(terminalMar);
    enrichment.administeredAt = held.at;
    enrichment.administeredByDisplay = held.display;
    enrichment.administeredByInitials = held.initials;
  }

  return enrichment;
}

/** Read-only MAR / infusion enrichment for facility shift timeline cells (M1.8B.7K.3). */
export async function loadMarShiftTimelineAdministrationEnrichment(
  prisma: PrismaService,
  doses: MedicationPassQueueDoseRow[]
): Promise<Map<string, MarShiftTimelineAdministrationEnrichment>> {
  const result = new Map<string, MarShiftTimelineAdministrationEnrichment>();
  if (doses.length === 0) return result;

  const doseIds = doses.map((d) => d.id);
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

  const [marRows, sessions] = await Promise.all([
    prisma.medicationAdministration.findMany({
      where: {
        OR: [
          { medicationDoseInstanceId: { in: doseIds } },
          ...(terminalMarIds.length > 0 ? [{ id: { in: terminalMarIds } }] : []),
          ...(sessionIds.length > 0 ? [{ infusionSessionId: { in: sessionIds } }] : []),
        ],
      },
      select: MAR_ENRICHMENT_SELECT,
      orderBy: { administeredAt: "asc" },
    }),
    sessionIds.length > 0
      ? prisma.infusionSession.findMany({
          where: { id: { in: sessionIds } },
          select: { id: true, startedAt: true, stoppedAt: true },
        })
      : Promise.resolve([] as InfusionSessionRow[]),
  ]);

  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const marByDoseId = new Map<string, MarEnrichmentRow[]>();
  for (const row of marRows) {
    if (row.medicationDoseInstanceId) {
      const list = marByDoseId.get(row.medicationDoseInstanceId) ?? [];
      list.push(row);
      marByDoseId.set(row.medicationDoseInstanceId, list);
    }
  }

  for (const dose of doses) {
    const linked = marByDoseId.get(dose.id) ?? [];
    const sessionId = dose.infusionSessionId?.trim();
    const sessionRows =
      sessionId != null
        ? marRows.filter((row) => row.infusionSessionId === sessionId)
        : [];
    const merged = [...linked];
    for (const row of sessionRows) {
      if (!merged.some((existing) => existing.id === row.id)) {
        merged.push(row);
      }
    }
    if (dose.terminalMedicationAdministrationId) {
      const terminal = marRows.find((row) => row.id === dose.terminalMedicationAdministrationId);
      if (terminal && !merged.some((existing) => existing.id === terminal.id)) {
        merged.push(terminal);
      }
    }

    result.set(
      dose.id,
      resolveDoseEnrichment(dose, merged, sessionId ? sessionById.get(sessionId) : undefined)
    );
  }

  return result;
}
