/**
 * D4A.1 — Durable admission completion + signature certification helpers.
 * Complements medSurgNursingAdmissionD4a1.ts without a schema migration.
 */

import {
  applyNurseAdmissionSignature,
  computeAdmissionCompletionSummary,
  createProviderAdmissionHandoff,
  type MedSurgNursingAdmissionDocV1,
} from "./medSurgNursingAdmissionD4a1.js";

export function nursingAdmissionSignatureRequiresProgress(
  doc: MedSurgNursingAdmissionDocV1
): boolean {
  const summary = computeAdmissionCompletionSummary(doc);
  return summary.complete + summary.inProgress + summary.unable > 0;
}

export function finalizeNursingAdmissionForProviderHandoff(input: {
  doc: MedSurgNursingAdmissionDocV1;
  actorUserId: string;
  credentials?: string | null;
  displayName?: string | null;
  clientExpectedVersion: number;
}):
  | { ok: true; doc: MedSurgNursingAdmissionDocV1 }
  | { ok: false; code: "EXPECTED_VERSION_CONFLICT" | "INCOMPLETE_ADMISSION" } {
  const signed = applyNurseAdmissionSignature({
    doc: input.doc,
    actorUserId: input.actorUserId,
    credentials: input.credentials ?? null,
    displayName: input.displayName ?? null,
    clientExpectedVersion: input.clientExpectedVersion,
  });
  if (!signed.ok) return signed;
  return {
    ok: true,
    doc: createProviderAdmissionHandoff({
      doc: signed.doc,
      actorUserId: input.actorUserId,
    }),
  };
}

export function nursingAdmissionCompletionPercent(doc: MedSurgNursingAdmissionDocV1): number {
  const s = computeAdmissionCompletionSummary(doc);
  const actionable = s.total - s.notApplicable;
  if (actionable <= 0) return 0;
  return Math.round(((s.complete + s.unable) / actionable) * 100);
}
