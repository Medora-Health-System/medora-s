/**
 * D2.5 — merge pathway board payloads into nursingAssessment (JSON-only).
 */

import {
  ER_AMA_DISPOSITION_V1_KEY,
  ER_DECEASED_DISPOSITION_V1_KEY,
  ER_ELOPEMENT_DISPOSITION_V1_KEY,
  ER_LWBS_DISPOSITION_V1_KEY,
  ER_OTHER_DISPOSITION_V1_KEY,
  readAmaDispositionV1,
  readDeceasedDispositionV1,
  readElopementDispositionV1,
  readLwbsDispositionV1,
  readOtherDispositionV1,
  type AmaDispositionV1,
  type DeceasedDispositionV1,
  type ElopementDispositionV1,
  type LwbsDispositionV1,
  type OtherDispositionV1,
} from "@medora/shared";
import type { ErDispositionOutcomeUi } from "./emergencyDispositionV1";

export function emptyAmaDispositionForm(): AmaDispositionV1 {
  return readAmaDispositionV1(null);
}
export function emptyLwbsDispositionForm(): LwbsDispositionV1 {
  return readLwbsDispositionV1(null);
}
export function emptyElopementDispositionForm(): ElopementDispositionV1 {
  return readElopementDispositionV1(null);
}
export function emptyDeceasedDispositionForm(): DeceasedDispositionV1 {
  return readDeceasedDispositionV1(null);
}
export function emptyOtherDispositionForm(): OtherDispositionV1 {
  return readOtherDispositionV1(null);
}

export function mergePathwayBoardsIntoNursingAssessment(
  nursingAssessment: unknown,
  outcome: ErDispositionOutcomeUi,
  boards: {
    ama: AmaDispositionV1;
    lwbs: LwbsDispositionV1;
    elopement: ElopementDispositionV1;
    deceased: DeceasedDispositionV1;
    other: OtherDispositionV1;
  }
): Record<string, unknown> {
  const base =
    nursingAssessment && typeof nursingAssessment === "object" && !Array.isArray(nursingAssessment)
      ? { ...(nursingAssessment as Record<string, unknown>) }
      : {};

  if (outcome === "AMA") base[ER_AMA_DISPOSITION_V1_KEY] = { ...boards.ama, source: "CURRENT" };
  if (outcome === "LWBS") base[ER_LWBS_DISPOSITION_V1_KEY] = { ...boards.lwbs, source: "CURRENT" };
  if (outcome === "ELOPEMENT") {
    base[ER_ELOPEMENT_DISPOSITION_V1_KEY] = { ...boards.elopement, source: "CURRENT" };
  }
  if (outcome === "DECEASED") {
    base[ER_DECEASED_DISPOSITION_V1_KEY] = { ...boards.deceased, source: "CURRENT" };
  }
  if (outcome === "OTHER") base[ER_OTHER_DISPOSITION_V1_KEY] = { ...boards.other, source: "CURRENT" };
  return base;
}
