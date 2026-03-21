import { BadRequestException } from "@nestjs/common";
import type { SafeParseReturnType } from "zod";

/**
 * Lève une 400 avec le premier message Zod (souvent déjà en français côté schémas partagés),
 * sinon « Données invalides ».
 */
export function assertZodBody<T>(parsed: SafeParseReturnType<unknown, T>): T {
  if (parsed.success) return parsed.data;
  const msg = parsed.error.issues[0]?.message ?? "Données invalides";
  throw new BadRequestException(msg, { cause: parsed.error });
}
