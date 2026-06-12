import { BadRequestException } from "@nestjs/common";
import {
  MEDICATION_INFUSION_ERROR_MESSAGES_FR,
  type MedicationInfusionErrorCode,
} from "@medora/shared";

/** Structured 400 for infusion actions — exposes stable `code` / `errorCode` for web i18n. */
export function medicationInfusionBadRequest(code: MedicationInfusionErrorCode): BadRequestException {
  const message = MEDICATION_INFUSION_ERROR_MESSAGES_FR[code];
  return new BadRequestException({ statusCode: 400, message, code, errorCode: code });
}
