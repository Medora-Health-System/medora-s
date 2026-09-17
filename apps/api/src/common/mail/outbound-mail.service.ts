import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type OutboundMailMessage = {
  to: string;
  subject: string;
  text: string;
};

export class MailNotConfiguredError extends Error {
  constructor() {
    super("Outbound email is not configured");
    this.name = "MailNotConfiguredError";
  }
}

export class MailDeliveryError extends Error {
  constructor() {
    super("Mail delivery failed");
    this.name = "MailDeliveryError";
  }
}

/**
 * Thin outbound mail adapter around the existing named SendGrid integration.
 * Credentials come only from ConfigService env (SENDGRID_API_KEY + MAIL_FROM).
 * Invitation send must fail closed when those are absent — never log message bodies.
 */
@Injectable()
export class OutboundMailService {
  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey() && this.fromAddress());
  }

  async send(message: OutboundMailMessage): Promise<void> {
    const apiKey = this.apiKey();
    const from = this.fromAddress();
    if (!apiKey || !from) {
      throw new MailNotConfiguredError();
    }

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: message.to }] }],
        from: { email: from },
        subject: message.subject,
        content: [{ type: "text/plain", value: message.text }],
      }),
    });

    if (!response.ok) {
      throw new MailDeliveryError();
    }
  }

  private apiKey(): string | null {
    const value = this.config.get<string>("SENDGRID_API_KEY")?.trim();
    return value ? value : null;
  }

  private fromAddress(): string | null {
    const value = this.config.get<string>("MAIL_FROM")?.trim();
    return value ? value : null;
  }
}
