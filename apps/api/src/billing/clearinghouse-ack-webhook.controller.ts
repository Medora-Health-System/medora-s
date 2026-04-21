import { BadRequestException, Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { ClaimAcknowledgmentService } from "./claim-acknowledgment.service";
import { ClearinghouseAckWebhookGuard } from "./clearinghouse-ack-webhook.guard";

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
      })
      .optional(),
  })
  .refine((d) => (d.rawText != null && d.rawText.length > 0) || (d.payloadBase64 != null && d.payloadBase64.length > 0), {
    message: "Provide rawText or payloadBase64",
  });

@Controller()
export class ClearinghouseAckWebhookController {
  constructor(private readonly claimAcknowledgmentService: ClaimAcknowledgmentService) {}

  @Post("billing/clearinghouse/ack-webhook")
  @UseGuards(ClearinghouseAckWebhookGuard)
  @HttpCode(200)
  async postAckWebhook(@Body() body: unknown) {
    const parsed = WebhookBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    let rawText = parsed.data.rawText ?? "";
    if (!rawText.trim() && parsed.data.payloadBase64) {
      rawText = Buffer.from(parsed.data.payloadBase64, "base64").toString("utf8");
    }
    return this.claimAcknowledgmentService.ingestInboundAckPayload({
      facilityId: parsed.data.facilityId,
      rawText,
      kind: parsed.data.kind ?? "AUTO",
      refs: parsed.data.refs,
      vendorMeta: {
        source: "WEBHOOK",
        ingestedAt: new Date().toISOString(),
      },
    });
  }
}
