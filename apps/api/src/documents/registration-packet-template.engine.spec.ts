import {
  RegistrationPacketTemplateEngine,
  type PacketConditionContext,
} from "./registration-packet-template.engine";
import { RegistrationPacketFieldType } from "@prisma/client";

describe("RegistrationPacketTemplateEngine", () => {
  const makeEngine = (prisma: any) => new RegistrationPacketTemplateEngine(prisma);

  describe("evaluateSectionVisible", () => {
    const engine = makeEngine({});

    it("shows section when no rules", () => {
      expect(engine.evaluateSectionVisible("sec-1", [], { FREESTANDING_ER: true })).toBe(true);
    });

    it("SHOW_IF FREESTANDING_ER hides when flag false", () => {
      const rules = [
        {
          sectionId: "sec-mm",
          fieldId: null,
          action: "SHOW_IF",
          conditionKey: "FREESTANDING_ER",
          conditionEquals: true,
        },
      ];
      expect(engine.evaluateSectionVisible("sec-mm", rules, { FREESTANDING_ER: false })).toBe(false);
      expect(engine.evaluateSectionVisible("sec-mm", rules, { FREESTANDING_ER: true })).toBe(true);
    });

    it("HIDE_IF MEDICARE hides when medicare true", () => {
      const rules = [
        {
          sectionId: "sec-x",
          fieldId: null,
          action: "HIDE_IF",
          conditionKey: "MEDICARE",
          conditionEquals: true,
        },
      ];
      const flags: PacketConditionContext = { MEDICARE: true };
      expect(engine.evaluateSectionVisible("sec-x", rules, flags)).toBe(false);
    });
  });

  describe("renderStructuredModel", () => {
    it("builds sections dynamically from template fields (no hard-coded section list)", async () => {
      const published = {
        id: "ver-1",
        templateId: "tpl-1",
        version: "1.0",
        template: { code: "FREESTANDING_ER", name: "Freestanding ER" },
        sections: [
          {
            id: "s-demo",
            key: "demographics",
            sortOrder: 10,
            titleJson: { en: "Patient Demographics", fr: "Démographie" },
            isRequired: true,
            fields: [
              {
                id: "f-demo",
                key: "demographics_block",
                fieldType: RegistrationPacketFieldType.DEMOGRAPHICS_BLOCK,
                sortOrder: 10,
                labelJson: null,
                contentJson: null,
              },
            ],
          },
          {
            id: "s-consent",
            key: "consent",
            sortOrder: 20,
            titleJson: { en: "Consent for Treatment", fr: "Consentement" },
            isRequired: true,
            fields: [
              {
                id: "f-consent",
                key: "consent_text",
                fieldType: RegistrationPacketFieldType.STATIC_TEXT,
                sortOrder: 10,
                labelJson: null,
                contentJson: {
                  en: "I consent to treatment.",
                  fr: "Je consens aux soins.",
                },
              },
            ],
          },
          {
            id: "s-mm",
            key: "medicareMedicaid",
            sortOrder: 30,
            titleJson: { en: "Medicare Notice", fr: "Avis Medicare" },
            isRequired: true,
            fields: [
              {
                id: "f-mm",
                key: "medicare_medicaid_text",
                fieldType: RegistrationPacketFieldType.STATIC_TEXT,
                sortOrder: 10,
                labelJson: null,
                contentJson: { en: "Non-participation notice.", fr: "Avis de non-participation." },
              },
            ],
          },
        ],
        rules: [
          {
            sectionId: "s-mm",
            fieldId: null,
            action: "SHOW_IF",
            conditionKey: "FREESTANDING_ER",
            conditionEquals: true,
          },
        ],
        themes: [],
      };

      const prisma = {
        registrationPacketTemplate: {
          findFirst: jest.fn().mockResolvedValue({ id: "tpl-1", code: "FREESTANDING_ER", isActive: true }),
        },
        registrationPacketTemplateVersion: {
          findFirst: jest.fn().mockResolvedValue(published),
        },
        registrationPacketTheme: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: "theme-1",
              facilityId: null,
              templateVersionId: "ver-1",
              templateId: "tpl-1",
              logoUrl: null,
              facilityNameOverride: null,
              addressLine: "123 Care Way",
              phone: "555-0100",
              footerJson: { en: "Generated via Medora.", fr: "Généré via Medora." },
              legalNoticesJson: { en: "Keep with chart.", fr: "Conserver au dossier." },
            },
          ]),
        },
      };

      const engine = makeEngine(prisma);
      const { model, theme, templateVersionId } = await engine.renderStructuredModel({
        templateCode: "FREESTANDING_ER",
        templateVersion: "1.0",
        locale: "en",
        facility: { id: "fac-1", name: "Wayne ER" },
        patient: { id: "pat-1", firstName: "Ada", lastName: "Lovelace", dob: "1815-12-10" },
        insurance: [{ rank: "PRIMARY", payerName: "Aetna", memberId: "M1" }],
        answers: [],
      });

      expect(templateVersionId).toBe("ver-1");
      expect(model.packetType).toBe("FREESTANDING_ER");
      expect(model.packetVersion).toBe("1.0");
      expect(model.sections.map((s) => s.id)).toEqual(["demographics", "consent", "medicareMedicaid"]);
      expect(model.sections.find((s) => s.id === "consent")?.body).toContain("I consent");
      expect(model.sections.find((s) => s.id === "demographics")?.body).toContain("Ada");
      expect(theme.addressLine).toBe("123 Care Way");
      expect(theme.footer).toContain("Medora");
    });

    it("hides medicare section when FREESTANDING_ER flag is false", async () => {
      const published = {
        id: "ver-1",
        templateId: "tpl-1",
        version: "1.0",
        template: { code: "CLINIC", name: "Clinic" },
        sections: [
          {
            id: "s-consent",
            key: "consent",
            sortOrder: 10,
            titleJson: { en: "Consent" },
            isRequired: true,
            fields: [
              {
                id: "f1",
                key: "consent_text",
                fieldType: RegistrationPacketFieldType.STATIC_TEXT,
                sortOrder: 10,
                contentJson: { en: "Consent body" },
                labelJson: null,
              },
            ],
          },
          {
            id: "s-mm",
            key: "medicareMedicaid",
            sortOrder: 20,
            titleJson: { en: "Medicare" },
            isRequired: true,
            fields: [
              {
                id: "f2",
                key: "mm",
                fieldType: RegistrationPacketFieldType.STATIC_TEXT,
                sortOrder: 10,
                contentJson: { en: "MM body" },
                labelJson: null,
              },
            ],
          },
        ],
        rules: [
          {
            sectionId: "s-mm",
            fieldId: null,
            action: "SHOW_IF",
            conditionKey: "FREESTANDING_ER",
            conditionEquals: true,
          },
        ],
        themes: [],
      };

      const prisma = {
        registrationPacketTemplate: {
          findFirst: jest.fn().mockResolvedValue({ id: "tpl-1", code: "CLINIC", isActive: true }),
        },
        registrationPacketTemplateVersion: {
          findFirst: jest.fn().mockResolvedValue(published),
        },
        registrationPacketTheme: { findMany: jest.fn().mockResolvedValue([]) },
      };

      const engine = makeEngine(prisma);
      const { model } = await engine.renderStructuredModel({
        templateCode: "CLINIC",
        locale: "en",
        facility: { id: "fac-1", name: "Clinic A" },
        patient: { id: "p1", firstName: "Pat" },
        contextFlags: { FREESTANDING_ER: false },
      });

      expect(model.sections.map((s) => s.id)).toEqual(["consent"]);
    });
  });
});
