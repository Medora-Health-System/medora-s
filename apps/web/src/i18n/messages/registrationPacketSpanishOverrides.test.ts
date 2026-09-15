import { describe, expect, it } from "vitest";
import { sectionCatalogForTemplate } from "@/features/documents/usRegistrationPacketContent";
import { resolveRegistrationPacketSpanishOverride } from "@/i18n/messages/registrationPacketSpanishOverrides";

const templates = ["FREESTANDING_ER", "URGENT_CARE", "CLINIC", "HOSPITAL"] as const;

function allSections() {
  const byKey = new Map<string, ReturnType<typeof sectionCatalogForTemplate>[number]>();
  for (const template of templates) {
    for (const section of sectionCatalogForTemplate(template, { emtalaApplicable: true })) {
      byKey.set(section.key, section);
    }
  }
  return [...byKey.values()];
}

describe("Spanish Registration Packet localization", () => {
  it("has Spanish summary and full legal copy for every packet section", () => {
    for (const section of allSections()) {
      const summary = resolveRegistrationPacketSpanishOverride("es", section.summaryKey);
      const full = resolveRegistrationPacketSpanishOverride("es", section.fullKey);
      expect(summary, `${section.summaryKey} should be localized`).toBeTruthy();
      expect(full, `${section.fullKey} should be localized`).toBeTruthy();
      expect(summary).not.toMatch(/\b(I|you|your|this|the|and)\b/i);
    }
  });

  it("localizes the previously frozen visible legal chrome", () => {
    expect(resolveRegistrationPacketSpanishOverride("es", "packetWizard.legalPendingNotice"))
      .toContain("pendiente de aprobación legal final");
    expect(resolveRegistrationPacketSpanishOverride("es", "packetWizard.sectionAcknowledge"))
      .toBe("Reconozco que he leído esta sección.");
    expect(resolveRegistrationPacketSpanishOverride("es", "esignature.patientAttestation"))
      .toContain("Certifico");
    expect(resolveRegistrationPacketSpanishOverride("es", "esignature.staffAttestation"))
      .toContain("Certifico");
  });

  it("never overrides English or French with Spanish copy", () => {
    expect(resolveRegistrationPacketSpanishOverride("en", "packetWizard.consentSummary")).toBeUndefined();
    expect(resolveRegistrationPacketSpanishOverride("fr", "packetWizard.consentSummary")).toBeUndefined();
  });
});
