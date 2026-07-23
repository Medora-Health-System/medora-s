import { NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import {
  DIRECT_ADMISSION_ERROR_MESSAGES_FR,
  type DirectAdmissionErrorCode,
} from "@medora/shared";

/** Structured 404 for direct admission — exposes stable `code` / `errorCode` for web i18n. */
export function directAdmissionNotFound(code: DirectAdmissionErrorCode): NotFoundException {
  const message = DIRECT_ADMISSION_ERROR_MESSAGES_FR[code];
  return new NotFoundException({ statusCode: 404, message, code, errorCode: code });
}

/** Schema compatibility failure (e.g. P2022 on Encounter.hospitalEpisodeId) — no PHI. */
export function directAdmissionSchemaIncompatible(requestId?: string | null): ServiceUnavailableException {
  const code: DirectAdmissionErrorCode = "DIRECT_ADMISSION_SCHEMA_INCOMPATIBLE";
  const message = DIRECT_ADMISSION_ERROR_MESSAGES_FR[code];
  return new ServiceUnavailableException({
    statusCode: 503,
    message,
    code,
    errorCode: code,
    requestId: requestId ?? null,
  });
}

export function isPrismaMissingHospitalEpisodeIdColumn(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; meta?: { column?: string; modelName?: string } };
  if (e.code !== "P2022") return false;
  const col = String(e.meta?.column ?? "");
  return (
    col.includes("hospitalEpisodeId") ||
    col === "Encounter.hospitalEpisodeId" ||
    (String(e.meta?.modelName ?? "") === "Encounter" && col.includes("hospitalEpisode"))
  );
}
