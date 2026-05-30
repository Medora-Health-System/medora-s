/**
 * EDOC.TEST.2 — universal runtime coverage harness (save → summary → export → ROI → audit).
 */

import { AuditAction } from "@prisma/client";
import {
  assertClinicalDocumentationAuditMetadataPhiSafe,
  buildClinicalDocumentationAuditMetadata,
  ensureClinicalDocumentationLegalDisplaySummary,
  summarizeClinicalDocumentationPayload,
  type ClinicalDocumentationCategory,
} from "@medora/shared";
import {
  assertClinicalDocumentationLegalCoverage,
  buildClinicalDocumentationLegalCoverageService,
  type AssertClinicalDocumentationLegalCoverageOptions,
} from "./clinical-documentation-legal-coverage.harness";
import type { EdocRuntimeCoverageFixture } from "./clinical-documentation-runtime-coverage.fixtures";

/** Sensitive cards — audit metadata must not echo PHI-bearing payload fields. */
export const SENSITIVE_RUNTIME_AUDIT_CARD_IDS = new Set<string>([
  // behavioral
  "suicide_precautions_documentation",
  "suicide_risk_monitoring",
  "elopement_risk_assessment",
  "elopement_monitoring",
  "behavioral_observation",
  "agitation_violence_risk_assessment",
  "one_to_one_observation_check",
  "environmental_safety_check",
  "behavioral_escalation_event",
  // restraints
  "restraint_initiation",
  "restraint_reassessment",
  "restraint_renewal",
  "restraint_face_to_face",
  "restraint_discontinuation",
  // belongings
  "belongings_inventory",
  "valuables_inventory",
  "belongings_secured_bagged",
  "belongings_transfer_security",
  "belongings_release_representative",
  "belongings_return_patient",
  "belongings_altered_patient",
  // blood products
  "blood_product_verification",
  "blood_product_pre_assessment",
  "blood_product_initiation",
  "blood_product_reassessment",
  "blood_product_completion",
  "blood_product_reaction",
  "massive_transfusion_protocol_event",
  // high alert
  "high_alert_infusion_verification",
  "high_alert_infusion_initiation",
  "high_alert_infusion_titration",
  "high_alert_infusion_reassessment",
  "high_alert_infusion_hold",
  "high_alert_infusion_completion",
  // sedation
  "sedation_pre_assessment",
  "sedation_timeout",
  "sedation_initiation",
  "sedation_monitoring",
  "sedation_reassessment",
  "sedation_recovery_monitoring",
  "sedation_recovery_score",
  "sedation_discharge_readiness",
  // high-risk scores (EDOC.23B)
  "score_cssrs",
  "score_abuse",
  "score_human_trafficking",
  "score_sdoh",
]);

const SENSITIVE_AUDIT_FORBIDDEN_METADATA_KEYS = [
  "notes",
  "narrative",
  "payloadJson",
  "admissionReason",
  "goalDescription",
  "lactateValue",
  "suspectedSource",
  "antibioticNameReferenced",
  "recipientName",
  "receivedBySecurityName",
  "wishToBeDead",
  "physicalAbuseConcern",
  "unableToSpeakFreely",
  "foodInsecurity",
] as const;

const SENSITIVE_AUDIT_FORBIDDEN_PAYLOAD_KEYS = [
  "notes",
  "narrative",
  "admissionReason",
  "goalDescription",
  "lactateValue",
  "suspectedSource",
  "antibioticNameReferenced",
  "recipientName",
  "receivedBySecurityName",
  "wishToBeDead",
  "physicalAbuseConcern",
  "unableToSpeakFreely",
  "foodInsecurity",
  "substance",
  "amount",
] as const;

/** EDOC.TEST.2 — end-to-end runtime coverage for one card (reuses EDOC.TEST.1 legal harness). */
export async function assertClinicalDocumentationRuntimeCoverage(
  fixture: EdocRuntimeCoverageFixture & { entryId?: string }
): Promise<void> {
  const legalFixture: AssertClinicalDocumentationLegalCoverageOptions = {
    cardId: fixture.cardId,
    category: fixture.category,
    payload: fixture.payload,
    entryId: fixture.entryId ?? `edoc-runtime-${fixture.cardId}`,
  };
  await assertClinicalDocumentationLegalCoverage(legalFixture);
}

/** EDOC.TEST.2 — audit create path must not leak PHI for sensitive cards. */
export async function assertClinicalDocumentationAuditSafety(
  cardId: string,
  payload: Record<string, unknown>,
  category: string
): Promise<void> {
  if (!SENSITIVE_RUNTIME_AUDIT_CARD_IDS.has(cardId)) {
    return;
  }

  const { svc, audit } = buildClinicalDocumentationLegalCoverageService({
    entryId: `edoc-runtime-audit-${cardId}`,
  });

  await svc.createEntry(
    "f1",
    "e1",
    {
      category: category as ClinicalDocumentationCategory,
      cardId,
      payloadJson: payload,
    },
    "u1"
  );

  const createAuditCall = audit.log.mock.calls.find(
    (call) => call[0] === AuditAction.ENCOUNTER_CLINICAL_DOCUMENTATION_CREATED
  );
  expect(createAuditCall).toBeDefined();
  const auditMeta = createAuditCall?.[2]?.metadata as Record<string, unknown>;
  assertClinicalDocumentationAuditMetadataPhiSafe(auditMeta);

  for (const key of SENSITIVE_AUDIT_FORBIDDEN_METADATA_KEYS) {
    expect(auditMeta).not.toHaveProperty(key);
  }

  const metaJson = JSON.stringify(auditMeta);
  for (const key of SENSITIVE_AUDIT_FORBIDDEN_PAYLOAD_KEYS) {
    if (payload[key] !== undefined && payload[key] !== null && payload[key] !== "") {
      const serialized = JSON.stringify(payload[key]);
      if (serialized.length > 2) {
        expect(metaJson).not.toContain(serialized.slice(1, -1));
      }
    }
  }

  const summaryLineCount = ensureClinicalDocumentationLegalDisplaySummary(cardId, payload, "en").length;
  const builtMeta = buildClinicalDocumentationAuditMetadata({
    encounterId: "enc-1",
    patientId: "pat-1",
    entryId: "entry-1",
    category,
    cardId,
    authorUserId: "user-1",
    authorRole: "RN",
    payloadKeyCount: Object.keys(payload).length,
    summaryLineCount,
  });
  assertClinicalDocumentationAuditMetadataPhiSafe(builtMeta as Record<string, unknown>);
}

/** Returns true when legal display would use EDOC.LEGAL.1 generic fallback lines. */
export function clinicalDocumentationPayloadUsesLegalFallback(
  cardId: string,
  payload: Record<string, unknown>,
  locale: "en" | "fr" = "en"
): boolean {
  const dedicated = summarizeClinicalDocumentationPayload(cardId, payload, locale);
  if (dedicated.length > 0) return false;
  const legal = ensureClinicalDocumentationLegalDisplaySummary(cardId, payload, locale);
  return legal.some((line) => line.key === "Structured payload saved" || line.key === "Données structurées enregistrées");
}
