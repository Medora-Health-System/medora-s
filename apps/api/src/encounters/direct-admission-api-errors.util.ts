import { NotFoundException } from "@nestjs/common";
import {
  DIRECT_ADMISSION_ERROR_MESSAGES_FR,
  type DirectAdmissionErrorCode,
} from "@medora/shared";

/** Structured 404 for direct admission — exposes stable `code` / `errorCode` for web i18n. */
export function directAdmissionNotFound(code: DirectAdmissionErrorCode): NotFoundException {
  const message = DIRECT_ADMISSION_ERROR_MESSAGES_FR[code];
  return new NotFoundException({ statusCode: 404, message, code, errorCode: code });
}
