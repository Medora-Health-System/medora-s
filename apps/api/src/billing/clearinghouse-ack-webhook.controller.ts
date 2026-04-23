import { BadRequestException, Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { ClaimAcknowledgmentService } from "./claim-acknowledgment.service";
import { ClearinghouseAckWebhookGuard } from "./clearinghouse-ack-webhook.guard";
import { getClearinghousePublicConfigStatus } from "./clearinghouse-config.util";

const WebhookBodySchema = z
  .object({
    facilityId: z.string().min(1),
    rawText: z.string().optional(),
    payloadBase64: z.string().optional(),
    kind: z.enum(["999", "277CA", "AUTO"]).optional(),
    refs: z
      .object({
        submissionId: z.string().optional(),
        batchId: z.string().optional(),
        transactionCtrl: z.string().optional(),
        externalReference: z.string().optional(),
      })
      .optional(),
  })
  .refine((d) => (d.rawText != null && d.rawText.length > 0) || (d.payloadBase64 != null && d.payloadBase64.length > 0), {
    message: "Provide rawText or payloadBase64",
  });

function looseFacilityId(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const v = (body as Record<string, unknown>).facilityId;
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

@Controller()
export class ClearinghouseAckWebhookController {
  constructor(private readonly claimAcknowledgmentService: ClaimAcknowledgmentService) {}

  @Post("billing/clearinghouse/ack-webhook")
  @UseGuards(ClearinghouseAckWebhookGuard)
  @HttpCode(200)
  async postAckWebhook(@Body() body: unknown) {
    const parsed = WebhookBodySchema.safeParse(body);
    if (!parsed.success) {
      const fid = looseFacilityId(body);
      if (fid) {
        const raw = typeof body === "string" ? body : JSON.stringify(body);
        await this.claimAcknowledgmentService.recordInboundAckDeadLetter({
          facilityId: fid,
          rawText: raw.length > 500_000 ? `${raw.slice(0, 500_000)}\n…[truncated]` : raw,
          source: "WEBHOOK",
          failureCode: "WEBHOOK_SCHEMA_INVALID",
          failureDetail: JSON.stringify(parsed.error.flatten()).slice(0, 8000),
          vendorMeta: { outcome: "malformed_webhook_json" },
        });
        return { ok: true, deadLettered: true as const, reason: "WEBHOOK_SCHEMA_INVALID" };
      }
      throw new BadRequestException(parsed.error.flatten());
    }
    let rawText = parsed.data.rawText ?? "";
    if (!rawText.trim() && parsed.data.payloadBase64) {
      try {
        rawText = Buffer.from(parsed.data.payloadBase64, "base64").toString("utf8");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await this.claimAcknowledgmentService.recordInboundAckDeadLetter({
          facilityId: parsed.data.facilityId,
          rawText: parsed.data.payloadBase64 ?? "",
          source: "WEBHOOK",
          failureCode: "WEBHOOK_BASE64_DECODE_FAILED",
          failureDetail: msg,
          vendorMeta: { outcome: "base64_decode_failed" },
        });
        return { ok: true, deadLettered: true as const, reason: "WEBHOOK_BASE64_DECODE_FAILED" };
      }
    }
    try {
      const pub = getClearinghousePublicConfigStatus();
      return await this.claimAcknowledgmentService.ingestInboundAckPayload({
        facilityId: parsed.data.facilityId,
        rawText,
        kind: parsed.data.kind ?? "AUTO",
        refs: parsed.data.refs,
        vendorMeta: {
          source: "WEBHOOK",
          ingestedAt: new Date().toISOString(),
          clearinghouseMode: pub.mode,
          integrationTier: pub.integrationTier,
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await this.claimAcknowledgmentService.recordInboundAckDeadLetter({
        facilityId: parsed.data.facilityId,
        rawText: rawText.length > 500_000 ? `${rawText.slice(0, 500_000)}\n…[truncated]` : rawText,
        source: "WEBHOOK",
        failureCode: "ACK_INGEST_FAILED",
        failureDetail: msg,
        vendorMeta: { outcome: "ingest_threw", source: "WEBHOOK" },
      });
      return { ok: true, deadLettered: true as const, reason: "ACK_INGEST_FAILED", detail: msg };
    }
  }
}
