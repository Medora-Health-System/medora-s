import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("platform billing operations mode", () => {
  const controller = readFileSync(join(__dirname, "platform-operations.controller.ts"), "utf8");

  it("exposes billing mode behind billing RCM view authority", () => {
    expect(controller).toContain('@Get("billing-mode")');
    expect(controller).toContain('@RequirePlatformCapabilities(["BILLING_RCM_VIEW"])billingEnvironment');
  });

  it("requires both auto export and vendor webhook before reporting outbound enabled", () => {
    expect(controller).toContain('const outboundConfigured=autoExportEnabled&&vendorWebhookConfigured');
    expect(controller).toContain('mode:outboundConfigured?"outbound_enabled":"preview_only"');
    expect(controller).toContain('canTransmitExternally:outboundConfigured');
  });

  it("returns the mode with governance data so UI state is evidence-backed", () => {
    expect(controller).toContain('return{mode:billingMode(),summary}');
  });
});
