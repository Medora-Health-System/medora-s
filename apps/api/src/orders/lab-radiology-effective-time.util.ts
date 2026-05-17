import { BadRequestException } from "@nestjs/common";
import type { LabRadEffectiveTimeValidationCode } from "@medora/shared";
import {
  labRadEffectiveTimesDiffer,
  parseLabRadiologyEffectiveClinicalTimeIso,
  toLabRadiologyEffectiveClinicalTimeIsoUtc,
  validateLabRadiologyEffectiveClinicalTime,
} from "@medora/shared";

export function parseLabRadEffectiveTimeIso(iso: string): Date {
  const d = parseLabRadiologyEffectiveClinicalTimeIso(iso);
  if (!d) {
    throw new BadRequestException(labRadEffectiveTimeValidationMessage("INVALID_TIME"));
  }
  return d;
}

export function labRadEffectiveTimeValidationMessage(code: LabRadEffectiveTimeValidationCode): string {
  switch (code) {
    case "FUTURE_TIME":
      return "L'heure clinique ne peut pas être dans le futur.";
    case "BEFORE_ENCOUNTER":
      return "L'heure clinique ne peut pas précéder le début de la consultation.";
    case "REASON_REQUIRED":
      return "Un motif est requis pour cet ajustement d'heure.";
    case "REASON_TOO_SHORT_FOR_LARGE_BACKDATE":
      return "Un motif détaillé est requis pour les corrections d'heure importantes.";
    case "NOT_READY":
      return "Cette étape du workflow n'est pas encore documentée.";
    case "WRONG_WORKFLOW":
      return "Ajustement d'heure non autorisé pour ce type de ligne.";
    case "INVALID_TIME":
    default:
      return "Horodatage invalide.";
  }
}

export function encounterAnchorAt(encounter: { createdAt: Date; admittedAt: Date | null }): Date {
  if (encounter.admittedAt && encounter.admittedAt.getTime() < encounter.createdAt.getTime()) {
    return encounter.admittedAt;
  }
  return encounter.createdAt;
}

export function validateLabRadAdjust(input: {
  effectiveTime: Date;
  now: Date;
  encounter: { createdAt: Date; admittedAt: Date | null };
  documentedAt: Date;
  orderCreatedAt: Date;
  orderItemCreatedAt: Date;
  adjustmentVersion: number;
  reason: string | null;
}): Date {
  const validation = validateLabRadiologyEffectiveClinicalTime({
    effectiveTime: input.effectiveTime,
    now: input.now,
    encounterAnchorAt: encounterAnchorAt(input.encounter),
    documentedAt: input.documentedAt,
    orderCreatedAt: input.orderCreatedAt,
    orderItemCreatedAt: input.orderItemCreatedAt,
    adjustmentVersion: input.adjustmentVersion,
    reason: input.reason,
  });
  if (!validation.ok) {
    throw new BadRequestException(labRadEffectiveTimeValidationMessage(validation.code));
  }
  return new Date(toLabRadiologyEffectiveClinicalTimeIsoUtc(input.effectiveTime));
}

export function wasLabRadTimeAdjusted(
  effectiveAt: Date | null | undefined,
  documentedAt: Date | null | undefined,
  version: number
): boolean {
  if ((version ?? 0) > 0) return true;
  if (!effectiveAt || !documentedAt) return false;
  return labRadEffectiveTimesDiffer(effectiveAt, documentedAt);
}
