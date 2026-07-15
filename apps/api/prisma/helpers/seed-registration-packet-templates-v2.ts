/**
 * Seed Registration Packet Template Version 2.0 — expandable US enterprise sections.
 * Idempotent. Does not mutate v1.0 signed packet history.
 * Content status: LEGAL_REVIEW (pending facility legal approval) — published for technical delivery only.
 */

import {
  LegalContentReviewStatus,
  PrismaClient,
  RegistrationPacketFieldType,
  RegistrationPacketTemplateStatus,
} from "@prisma/client";
import {
  sectionsForPacketType,
  SPECIALIZED_PACKET_TEMPLATE_CODES,
  type UsPacketSectionDef,
} from "../registration-packets/content/us-enterprise-sections-v2";

const PACKET_CODES = ["FREESTANDING_ER", "URGENT_CARE", "CLINIC", "HOSPITAL"] as const;

const NAMES: Record<(typeof PACKET_CODES)[number], { name: string; description: string }> = {
  FREESTANDING_ER: {
    name: "Freestanding Emergency Room Registration Package",
    description: "US enterprise freestanding ER registration package v2 (pending legal approval).",
  },
  URGENT_CARE: {
    name: "Urgent Care Registration Package",
    description: "US enterprise urgent care registration package v2 (pending legal approval).",
  },
  CLINIC: {
    name: "Clinic Registration Package",
    description: "US enterprise clinic registration package v2 (pending legal approval).",
  },
  HOSPITAL: {
    name: "Hospital Registration Package",
    description: "US enterprise hospital registration package v2 (pending legal approval).",
  },
};

async function upsertSection(
  prisma: PrismaClient,
  templateVersionId: string,
  def: UsPacketSectionDef,
): Promise<void> {
  const section = await prisma.registrationPacketSection.upsert({
    where: {
      templateVersionId_key: { templateVersionId, key: def.key },
    },
    update: {
      sortOrder: def.sortOrder,
      titleJson: def.title,
      conciseSummaryJson: def.conciseSummary,
      fullBodyJson: def.fullBody,
      sourceLabel: def.sourceLabel ?? null,
      sourceUrl: def.sourceUrl ?? null,
      authorityType: def.authorityType ?? null,
      legalReviewStatus: LegalContentReviewStatus.LEGAL_REVIEW,
      contentVersion: def.contentVersion,
      acknowledgmentRequired: !!def.acknowledgmentRequired,
      acknowledgmentTextJson: def.acknowledgmentText ?? null,
      separateSignatureRequired: !!def.separateSignatureRequired,
      pdfInclusionPolicy: "FULL_BODY",
      isRequired: true,
    },
    create: {
      templateVersionId,
      key: def.key,
      sortOrder: def.sortOrder,
      titleJson: def.title,
      conciseSummaryJson: def.conciseSummary,
      fullBodyJson: def.fullBody,
      sourceLabel: def.sourceLabel ?? null,
      sourceUrl: def.sourceUrl ?? null,
      authorityType: def.authorityType ?? null,
      legalReviewStatus: LegalContentReviewStatus.LEGAL_REVIEW,
      contentVersion: def.contentVersion,
      acknowledgmentRequired: !!def.acknowledgmentRequired,
      acknowledgmentTextJson: def.acknowledgmentText ?? null,
      separateSignatureRequired: !!def.separateSignatureRequired,
      pdfInclusionPolicy: "FULL_BODY",
      isRequired: true,
    },
  });

  const fieldKey = `${def.key}_text`;
  const fieldType =
    def.key === "demographics"
      ? RegistrationPacketFieldType.DEMOGRAPHICS_BLOCK
      : def.key === "insurance"
        ? RegistrationPacketFieldType.INSURANCE
        : RegistrationPacketFieldType.STATIC_TEXT;

  await prisma.registrationPacketField.upsert({
    where: { sectionId_key: { sectionId: section.id, key: fieldKey } },
    update: {
      fieldType,
      sortOrder: 10,
      contentJson: def.fullBody,
      isRequired: true,
    },
    create: {
      sectionId: section.id,
      key: fieldKey,
      fieldType,
      sortOrder: 10,
      contentJson: def.fullBody,
      isRequired: true,
    },
  });

  if (def.showIf) {
    const existing = await prisma.registrationPacketConditionalRule.findFirst({
      where: {
        templateVersionId,
        sectionId: section.id,
        conditionKey: def.showIf,
        action: "SHOW_IF",
      },
    });
    if (!existing) {
      await prisma.registrationPacketConditionalRule.create({
        data: {
          templateVersionId,
          sectionId: section.id,
          name: `Show ${def.key} when ${def.showIf}`,
          action: "SHOW_IF",
          conditionKey: def.showIf,
          conditionEquals: true,
          sortOrder: 10,
        },
      });
    }
  }
}

export async function seedRegistrationPacketTemplatesV2(prisma: PrismaClient): Promise<void> {
  for (const code of PACKET_CODES) {
    const meta = NAMES[code];
    const template = await prisma.registrationPacketTemplate.upsert({
      where: { code },
      update: {
        name: meta.name,
        description: meta.description,
        facilityTypeScope: code,
        isActive: true,
      },
      create: {
        code,
        name: meta.name,
        description: meta.description,
        facilityTypeScope: code,
        isActive: true,
      },
    });

    const version = await prisma.registrationPacketTemplateVersion.upsert({
      where: { templateId_version: { templateId: template.id, version: "2.0" } },
      update: {
        status: RegistrationPacketTemplateStatus.PUBLISHED,
        localeDefault: "en",
        supportedLocales: ["en", "fr", "es"],
        publishedAt: new Date(),
      },
      create: {
        templateId: template.id,
        version: "2.0",
        status: RegistrationPacketTemplateStatus.PUBLISHED,
        localeDefault: "en",
        supportedLocales: ["en", "fr", "es"],
        publishedAt: new Date(),
      },
    });

    for (const sectionDef of sectionsForPacketType(code)) {
      await upsertSection(prisma, version.id, sectionDef);
    }

    const existingTheme = await prisma.registrationPacketTheme.findFirst({
      where: { templateVersionId: version.id, name: "default" },
    });
    if (!existingTheme) {
      await prisma.registrationPacketTheme.create({
        data: {
          templateId: template.id,
          templateVersionId: version.id,
          name: "default",
          footerJson: {
            en: "This document was electronically generated and signed via Medora EMR.",
            fr: "Ce document a été généré et signé électroniquement via Medora EMR.",
          },
          legalNoticesJson: {
            en: "Legal sections are source-grounded and pending facility legal approval unless marked approved in configuration.",
            fr: "Les sections juridiques sont fondées sur des sources officielles et en attente d'approbation juridique de l'établissement sauf indication contraire.",
          },
        },
      });
    }
  }

  // Future-ready specialized document templates (DRAFT, inactive) — not embedded in general registration.
  for (const code of SPECIALIZED_PACKET_TEMPLATE_CODES) {
    await prisma.registrationPacketTemplate.upsert({
      where: { code },
      update: {
        name: code.replace(/_/g, " "),
        description: "Specialized document template — separate from general registration consent.",
        isActive: false,
      },
      create: {
        code,
        name: code.replace(/_/g, " "),
        description: "Specialized document template — separate from general registration consent.",
        isActive: false,
      },
    });
  }
}
