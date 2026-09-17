import { ConfigService } from "@nestjs/config";
import { MailDeliveryError, MailNotConfiguredError, OutboundMailService } from "./outbound-mail.service";

describe("OutboundMailService", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("is not configured without SENDGRID_API_KEY and MAIL_FROM", () => {
    const mail = new OutboundMailService({ get: () => undefined } as unknown as ConfigService);
    expect(mail.isConfigured()).toBe(false);
  });

  it("fails closed instead of sending when credentials are missing", async () => {
    const mail = new OutboundMailService({ get: () => undefined } as unknown as ConfigService);
    await expect(
      mail.send({ to: "patient@example.com", subject: "x", text: "secret-link" }),
    ).rejects.toBeInstanceOf(MailNotConfiguredError);
  });

  it("posts to the named SendGrid endpoint when credentials are present", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = fetchMock as typeof fetch;
    const mail = new OutboundMailService({
      get: (key: string) => (key === "SENDGRID_API_KEY" ? "sg-test" : key === "MAIL_FROM" ? "noreply@example.com" : undefined),
    } as unknown as ConfigService);

    await mail.send({ to: "patient@example.com", subject: "Activate", text: "https://app.example/activate?code=secret" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.sendgrid.com/v3/mail/send",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("maps a non-OK SendGrid response to MailDeliveryError", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 }) as typeof fetch;
    const mail = new OutboundMailService({
      get: (key: string) => (key === "SENDGRID_API_KEY" ? "sg-test" : "noreply@example.com"),
    } as unknown as ConfigService);

    await expect(
      mail.send({ to: "patient@example.com", subject: "Activate", text: "secret-link" }),
    ).rejects.toBeInstanceOf(MailDeliveryError);
  });
});
