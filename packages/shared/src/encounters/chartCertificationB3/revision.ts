import type {
  DoseInstanceSnapshot,
  InfusionSessionSnapshot,
  MarAdministrationSnapshot,
  MedicationOrderSnapshot,
  ProcedureEvidenceSnapshot,
  ReassessmentEvidenceSnapshot,
} from "./types.js";

export type MedicationProcedureRevisionInput = {
  medicationOrders: readonly MedicationOrderSnapshot[];
  marAdministrations: readonly MarAdministrationSnapshot[];
  doseInstances: readonly DoseInstanceSnapshot[];
  infusionSessions: readonly InfusionSessionSnapshot[];
  procedures: readonly ProcedureEvidenceSnapshot[];
  reassessments: readonly ReassessmentEvidenceSnapshot[];
};

function maxIso(values: Array<string | null | undefined>): string {
  let max = "";
  for (const v of values) {
    if (v && v > max) max = v;
  }
  return max || "none";
}

function sortJoin(parts: string[]): string {
  return [...parts].sort().join(",");
}

/**
 * Deterministic PHI-safe revision token from entity counts, max updatedAts,
 * and status concatenations. Not Encounter.version.
 */
export function computeMedicationProcedureRevision(
  input: MedicationProcedureRevisionInput
): string {
  const orderStatuses = sortJoin(
    input.medicationOrders.map(
      (o) =>
        `${o.orderItemId}:${o.orderStatus}/${o.itemStatus}/${o.medicationLifecycleStatus ?? ""}/${o.lifecycleState ?? ""}`
    )
  );
  const marStatuses = sortJoin(
    input.marAdministrations.map(
      (a) => `${a.id}:${a.marAction ?? ""}/${a.voided ? "V" : "A"}/${a.infusionPhase ?? ""}`
    )
  );
  const doseStatuses = sortJoin(
    input.doseInstances.map((d) => `${d.id}:${d.doseStatus}`)
  );
  const infusionStatuses = sortJoin(
    input.infusionSessions.map((i) => `${i.id}:${i.status}`)
  );
  const procedureStatuses = sortJoin(
    input.procedures.map((p) => `${p.orderItemId}:${p.performedClass}/${p.orderStatus}`)
  );
  const reassessmentStatuses = sortJoin(
    input.reassessments.map(
      (r) => `${r.id}:${r.kind}/${r.completed ? "1" : "0"}/${r.unableOrRefused ? "U" : "O"}`
    )
  );

  const maxUpdated = maxIso([
    ...input.medicationOrders.map((o) => o.updatedAt),
    ...input.marAdministrations.map((a) => a.updatedAt),
    ...input.doseInstances.map((d) => d.updatedAt),
    ...input.infusionSessions.map((i) => i.updatedAt),
    ...input.procedures.map((p) => p.updatedAt),
    ...input.reassessments.map((r) => r.updatedAt),
  ]);

  return [
    `mo=${input.medicationOrders.length}`,
    `ma=${input.marAdministrations.length}`,
    `di=${input.doseInstances.length}`,
    `inf=${input.infusionSessions.length}`,
    `pr=${input.procedures.length}`,
    `re=${input.reassessments.length}`,
    `max=${maxUpdated}`,
    `os=${orderStatuses}`,
    `ms=${marStatuses}`,
    `ds=${doseStatuses}`,
    `is=${infusionStatuses}`,
    `ps=${procedureStatuses}`,
    `rs=${reassessmentStatuses}`,
  ].join("|");
}
