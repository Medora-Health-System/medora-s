import type { Prisma } from "@prisma/client";

export const NURSING_ASSESSMENT_JSON_EVENT_SOURCE = "NURSING_ASSESSMENT_JSON" as const;

export const NURSING_ASSESSMENT_NAMESPACE_ER_PROVIDER_MSE_V1 = "erProviderMseV1" as const;
export const NURSING_ASSESSMENT_NAMESPACE_NURSING_EVAL_V1 = "nursingEvalV1" as const;

/** Namespace slice from full `nursingAssessment` JSON (undefined if absent / not an object root). */
export function getNursingAssessmentNamespace(nursingAssessment: unknown, namespaceKey: string): unknown {
  if (!nursingAssessment || typeof nursingAssessment !== "object" || Array.isArray(nursingAssessment)) {
    return undefined;
  }
  return (nursingAssessment as Record<string, unknown>)[namespaceKey];
}

function jsonTokenForCompare(v: unknown): string {
  if (v === undefined) return "__missing__";
  if (typeof v === "object" && v !== null) {
    try {
      return JSON.stringify(v);
    } catch {
      return "__invalid__";
    }
  }
  return JSON.stringify(v);
}

/**
 * True when the namespace slice of `nursingAssessment` JSON changed between previous and next full blobs.
 */
export function nursingAssessmentNamespaceChanged(
  prevNursingAssessment: unknown,
  nextNursingAssessment: unknown,
  namespaceKey: string
): boolean {
  return (
    jsonTokenForCompare(getNursingAssessmentNamespace(prevNursingAssessment, namespaceKey)) !==
    jsonTokenForCompare(getNursingAssessmentNamespace(nextNursingAssessment, namespaceKey))
  );
}

/**
 * Deep-clone snapshot for Prisma JSON + standard payload shape for MSE / nursing eval save events.
 */
export function nursingAssessmentJsonSnapshotPayload(
  namespace:
    | typeof NURSING_ASSESSMENT_NAMESPACE_ER_PROVIDER_MSE_V1
    | typeof NURSING_ASSESSMENT_NAMESPACE_NURSING_EVAL_V1,
  snapshot: unknown
): Prisma.InputJsonValue {
  const base: Record<string, unknown> = {
    source: NURSING_ASSESSMENT_JSON_EVENT_SOURCE,
    namespace,
  };
  if (snapshot !== undefined && snapshot !== null && typeof snapshot === "object") {
    base.snapshot = JSON.parse(JSON.stringify(snapshot));
  }
  return JSON.parse(JSON.stringify(base)) as Prisma.InputJsonValue;
}
