import { BadRequestException } from "@nestjs/common";
import { MsppAlertInvestigationStatus } from "@prisma/client";
import { z } from "zod";
import { assertAlertKeyMatches, msppAlertTriageVerifySchema } from "./mspp-alert-triage.dto";

export const msppAlertInvestigationOpenSchema = msppAlertTriageVerifySchema.extend({
  summary: z.string().max(8000).optional().nullable(),
});

export const msppAlertInvestigationStatusBodySchema = msppAlertTriageVerifySchema.extend({
  investigationStatus: z.nativeEnum(MsppAlertInvestigationStatus),
});

export const msppAlertInvestigationNoteSchema = msppAlertTriageVerifySchema.extend({
  note: z.string().min(1).max(5000),
});

export const msppAlertInvestigationAssignSchema = msppAlertTriageVerifySchema.extend({
  assignedToUserId: z.string().uuid().nullable(),
});

export const msppAlertInvestigationBatchSchema = z.object({
  alertKeys: z.array(z.string().min(16)).max(500),
});

function verifyDtoShape(
  data: z.infer<typeof msppAlertTriageVerifySchema>
): void {
  assertAlertKeyMatches(data);
}

export function parseMsppAlertInvestigationOpen(body: unknown): z.infer<typeof msppAlertInvestigationOpenSchema> {
  const p = msppAlertInvestigationOpenSchema.safeParse(body ?? {});
  if (!p.success) {
    throw new BadRequestException(p.error.errors.map((e) => e.message).join(" ") || "Corps invalide.");
  }
  const { summary: _s, ...verify } = p.data;
  void _s;
  verifyDtoShape(verify);
  return p.data;
}

export function parseMsppAlertInvestigationStatusBody(
  body: unknown
): z.infer<typeof msppAlertInvestigationStatusBodySchema> {
  const p = msppAlertInvestigationStatusBodySchema.safeParse(body ?? {});
  if (!p.success) {
    throw new BadRequestException(p.error.errors.map((e) => e.message).join(" ") || "Corps invalide.");
  }
  const { investigationStatus: _st, ...verify } = p.data;
  void _st;
  verifyDtoShape(verify);
  return p.data;
}

export function parseMsppAlertInvestigationNote(body: unknown): z.infer<typeof msppAlertInvestigationNoteSchema> {
  const p = msppAlertInvestigationNoteSchema.safeParse(body ?? {});
  if (!p.success) {
    throw new BadRequestException(p.error.errors.map((e) => e.message).join(" ") || "Corps invalide.");
  }
  const { note: _n, ...verify } = p.data;
  void _n;
  verifyDtoShape(verify);
  return p.data;
}

export function parseMsppAlertInvestigationAssign(body: unknown): z.infer<typeof msppAlertInvestigationAssignSchema> {
  const p = msppAlertInvestigationAssignSchema.safeParse(body ?? {});
  if (!p.success) {
    throw new BadRequestException(p.error.errors.map((e) => e.message).join(" ") || "Corps invalide.");
  }
  const { assignedToUserId: _a, ...verify } = p.data;
  void _a;
  verifyDtoShape(verify);
  return p.data;
}

export function parseMsppAlertInvestigationBatch(body: unknown): z.infer<typeof msppAlertInvestigationBatchSchema> {
  const p = msppAlertInvestigationBatchSchema.safeParse(body ?? {});
  if (!p.success) {
    throw new BadRequestException(p.error.errors.map((e) => e.message).join(" ") || "Corps invalide.");
  }
  return p.data;
}

export type MsppAlertInvestigationOpenInput = z.infer<typeof msppAlertInvestigationOpenSchema>;
export type MsppAlertInvestigationStatusInput = z.infer<typeof msppAlertInvestigationStatusBodySchema>;
