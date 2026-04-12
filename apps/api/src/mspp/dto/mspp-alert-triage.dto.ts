import { BadRequestException } from "@nestjs/common";
import { MsppAlertTriageStatus } from "@prisma/client";
import { z } from "zod";
import { computeMsppAlertKey } from "../mspp-alert-triage-key";

export const msppAlertTriageVerifySchema = z.object({
  alertKey: z.string().min(16),
  scope: z.enum(["DEPARTMENT", "COMMUNE"]),
  diseaseCode: z.string().min(1).max(80),
  departmentId: z.string().uuid(),
  geoCommuneId: z.string().uuid().nullable(),
  window: z.object({
    currentStart: z.string().min(10),
    currentEnd: z.string().min(10),
  }),
  escalationLevel: z.enum(["URGENT", "PRIORITY", "WATCH"]),
});

export type MsppAlertTriageVerifyDto = z.infer<typeof msppAlertTriageVerifySchema>;

export const msppAlertTriageAcknowledgeSchema = msppAlertTriageVerifySchema;

export const msppAlertTriageStatusSchema = msppAlertTriageVerifySchema.extend({
  triageStatus: z.nativeEnum(MsppAlertTriageStatus),
});

export const msppAlertTriageNoteSchema = msppAlertTriageVerifySchema.extend({
  triageNote: z.string().max(5000),
});

export const msppAlertTriageAssignSchema = msppAlertTriageVerifySchema.extend({
  assignedToUserId: z.string().uuid().nullable(),
});

export function parseMsppAlertTriageVerify(body: unknown): MsppAlertTriageVerifyDto {
  const p = msppAlertTriageVerifySchema.safeParse(body ?? {});
  if (!p.success) {
    throw new BadRequestException(p.error.errors.map((e) => e.message).join(" ") || "Corps invalide.");
  }
  assertAlertKeyMatches(p.data);
  return p.data;
}

export function parseMsppAlertTriageAcknowledge(body: unknown): MsppAlertTriageVerifyDto {
  return parseMsppAlertTriageVerify(body);
}

export function parseMsppAlertTriageStatus(body: unknown): z.infer<typeof msppAlertTriageStatusSchema> {
  const p = msppAlertTriageStatusSchema.safeParse(body ?? {});
  if (!p.success) {
    throw new BadRequestException(p.error.errors.map((e) => e.message).join(" ") || "Corps invalide.");
  }
  assertAlertKeyMatches(p.data);
  return p.data;
}

export function parseMsppAlertTriageNote(body: unknown): z.infer<typeof msppAlertTriageNoteSchema> {
  const p = msppAlertTriageNoteSchema.safeParse(body ?? {});
  if (!p.success) {
    throw new BadRequestException(p.error.errors.map((e) => e.message).join(" ") || "Corps invalide.");
  }
  assertAlertKeyMatches(p.data);
  return p.data;
}

export function parseMsppAlertTriageAssign(body: unknown): z.infer<typeof msppAlertTriageAssignSchema> {
  const p = msppAlertTriageAssignSchema.safeParse(body ?? {});
  if (!p.success) {
    throw new BadRequestException(p.error.errors.map((e) => e.message).join(" ") || "Corps invalide.");
  }
  assertAlertKeyMatches(p.data);
  return p.data;
}

/** Exported for MSPP alert investigations and other consumers that share `alertKey` rules. */
export function assertAlertKeyMatches(dto: MsppAlertTriageVerifyDto): void {
  const expected = computeMsppAlertKey({
    scope: dto.scope,
    diseaseCode: dto.diseaseCode,
    departmentId: dto.departmentId,
    geoCommuneId: dto.geoCommuneId,
    windowCurrentStartIso: dto.window.currentStart,
    windowCurrentEndIso: dto.window.currentEnd,
  });
  if (expected !== dto.alertKey) {
    throw new BadRequestException("Clé d'alerte invalide ou fenêtre non concordante.");
  }
}
