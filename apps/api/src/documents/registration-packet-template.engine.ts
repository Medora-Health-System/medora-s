/**
 * Registration packet template rendering engine.
 * Template + answers + context flags → StructuredPacketModel (never mutates template).
 */

import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import {
  Prisma,
  RegistrationPacketFieldType,
  RegistrationPacketTemplateStatus,
} from "@prisma/client";
import { UNLOCALIZED_CATALOG_SOURCE } from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { StructuredPacketModel } from "./packet-source.service";

export type PacketLocale = "en" | "fr" | "es" | string;

export type PacketConditionContext = {
  MINOR?: boolean;
  WORKERS_COMP?: boolean;
  SELF_PAY?: boolean;
  MEDICARE?: boolean;
  MEDICAID?: boolean;
  TRAUMA?: boolean;
  PEDIATRIC?: boolean;
  EMERGENCY?: boolean;
  URGENT_CARE?: boolean;
  FREESTANDING_ER?: boolean;
  HOSPITAL?: boolean;
  CLINIC?: boolean;
  [key: string]: boolean | undefined;
};

export type PacketAnswerInput = {
  fieldKey: string;
  sectionKey?: string;
  value: unknown;
};

export type PacketTemplateRenderInput = {
  templateCode: string;
  templateVersion?: string;
  locale: PacketLocale;
  facility: { id?: string; name?: string; addressLine?: string; phone?: string } | null;
  patient: StructuredPacketModel["patient"];
  encounter?: StructuredPacketModel["encounter"];
  insurance?: StructuredPacketModel["insurance"];
  answers?: PacketAnswerInput[];
  contextFlags?: PacketConditionContext;
  signatures?: StructuredPacketModel["signatures"];
  attestations?: string[];
  generatedAt?: string;
};

export type ResolvedPacketTheme = {
  logoUrl?: string | null;
  facilityName?: string | null;
  addressLine?: string | null;
  phone?: string | null;
  footer?: string | null;
  legalNotice?: string | null;
};

type LocalizedMap = Record<string, string>;

/**
 * Source/legal locale pick — zero cross-language fallback.
 * Missing/blank requested locale may use product-default EN before a locale is resolved.
 * Once a locale code is present, only that locale's map entry is returned.
 */
export function pickLocalized(json: unknown, locale: string): string {
  if (!json || typeof json !== "object") return "";
  const map = json as LocalizedMap;
  const raw = String(locale ?? "").trim();
  if (!raw) {
    const en = typeof map.en === "string" ? map.en.trim() : "";
    return en;
  }
  const loc = raw.toLowerCase().slice(0, 2);
  const value = map[loc];
  if (typeof value === "string" && value.trim()) return value.trim();
  return UNLOCALIZED_CATALOG_SOURCE;
}

function answerMap(answers: PacketAnswerInput[] | undefined): Map<string, unknown> {
  const m = new Map<string, unknown>();
  for (const a of answers ?? []) {
    if (a?.fieldKey) m.set(a.fieldKey, a.value);
  }
  return m;
}

function formatDemographicsBody(
  patient: StructuredPacketModel["patient"],
  locale: string,
): string {
  const labels =
    locale.startsWith("fr")
      ? { name: "Nom", dob: "Date de naissance", phone: "Téléphone", email: "E-mail", address: "Adresse" }
      : locale.startsWith("es")
        ? { name: "Nombre", dob: "Fecha de nacimiento", phone: "Teléfono", email: "Correo", address: "Dirección" }
        : { name: "Name", dob: "Date of Birth", phone: "Phone", email: "Email", address: "Address" };
  const name = [patient?.firstName, patient?.lastName].filter(Boolean).join(" ") || "—";
  const addr =
    [patient?.addressLine1, patient?.city, patient?.stateProvince, patient?.postalCode]
      .filter(Boolean)
      .join(", ") || "—";
  return [
    `${labels.name}: ${name}`,
    `${labels.dob}: ${patient?.dob || "—"}`,
    `${labels.phone}: ${patient?.phone || "—"}`,
    `${labels.email}: ${patient?.email || "—"}`,
    `${labels.address}: ${addr}`,
  ].join("\n");
}

function formatInsuranceBody(
  insurance: StructuredPacketModel["insurance"],
  acknowledgeText: string,
  locale: string,
): string {
  const labels =
    locale.startsWith("fr")
      ? { primary: "Primaire", secondary: "Secondaire" }
      : locale.startsWith("es")
        ? { primary: "Primario", secondary: "Secundario" }
        : { primary: "Primary", secondary: "Secondary" };
  const rows = Array.isArray(insurance) ? insurance : [];
  const pri = rows.find((r) => r.rank === "PRIMARY");
  const sec = rows.find((r) => r.rank === "SECONDARY");
  const line = (rank: string, row?: (typeof rows)[0]) =>
    `${rank}: ${row?.payerName || "—"}${row?.memberId ? ` · ${row.memberId}` : ""}`;
  return [line(labels.primary, pri), line(labels.secondary, sec), acknowledgeText].filter(Boolean).join("\n");
}

@Injectable()
export class RegistrationPacketTemplateEngine {
  constructor(private readonly prisma: PrismaService) {}

  async findPublishedVersion(templateCode: string, version = "1.0") {
    const template = await this.prisma.registrationPacketTemplate.findFirst({
      where: { code: templateCode, isActive: true },
    });
    if (!template) throw new NotFoundException(`Registration packet template not found: ${templateCode}`);

    const templateVersion = await this.prisma.registrationPacketTemplateVersion.findFirst({
      where: {
        templateId: template.id,
        version,
        status: RegistrationPacketTemplateStatus.PUBLISHED,
      },
      include: {
        sections: {
          orderBy: { sortOrder: "asc" },
          include: { fields: { orderBy: { sortOrder: "asc" } } },
        },
        rules: { orderBy: { sortOrder: "asc" } },
        themes: true,
        template: true,
      },
    });
    if (!templateVersion) {
      throw new NotFoundException(
        `Published registration packet template version not found: ${templateCode}@${version}`,
      );
    }
    return templateVersion;
  }

  async resolveTheme(
    templateVersionId: string,
    templateId: string,
    facilityId: string | undefined,
    locale: string,
  ): Promise<ResolvedPacketTheme> {
    const themes = await this.prisma.registrationPacketTheme.findMany({
      where: {
        OR: [
          { facilityId: facilityId || "__none__" },
          { templateVersionId },
          { templateId },
        ],
      },
      orderBy: { createdAt: "asc" },
    });
    // Prefer facility override → version → template.
    const pick =
      themes.find((t) => facilityId && t.facilityId === facilityId) ||
      themes.find((t) => t.templateVersionId === templateVersionId) ||
      themes.find((t) => t.templateId === templateId && !t.templateVersionId) ||
      themes[0];

    if (!pick) return {};
    return {
      logoUrl: pick.logoUrl,
      facilityName: pick.facilityNameOverride,
      addressLine: pick.addressLine,
      phone: pick.phone,
      footer: pickLocalized(pick.footerJson, locale),
      legalNotice: pickLocalized(pick.legalNoticesJson, locale),
    };
  }

  evaluateSectionVisible(
    sectionId: string,
    rules: Array<{
      sectionId: string | null;
      fieldId: string | null;
      action: string;
      conditionKey: string;
      conditionEquals: boolean;
    }>,
    flags: PacketConditionContext,
  ): boolean {
    const sectionRules = rules.filter((r) => r.sectionId === sectionId && !r.fieldId);
    if (sectionRules.length === 0) return true;

    for (const rule of sectionRules) {
      const flagVal = !!flags[rule.conditionKey];
      const matches = flagVal === rule.conditionEquals;
      if (rule.action === "SHOW_IF" && !matches) return false;
      if (rule.action === "HIDE_IF" && matches) return false;
    }
    return true;
  }

  /**
   * Build a StructuredPacketModel from a published template + answers.
   * Does not write to DB; caller persists snapshot + answers separately.
   */
  async renderStructuredModel(input: PacketTemplateRenderInput): Promise<{
    model: StructuredPacketModel;
    templateVersionId: string;
    theme: ResolvedPacketTheme;
    fieldIdByKey: Map<string, string>;
  }> {
    const version = input.templateVersion || "1.0";
    const locale = input.locale || "en";
    const published = await this.findPublishedVersion(input.templateCode, version);

    const flags: PacketConditionContext = {
      FREESTANDING_ER: input.templateCode === "FREESTANDING_ER",
      URGENT_CARE: input.templateCode === "URGENT_CARE",
      HOSPITAL: input.templateCode === "HOSPITAL",
      CLINIC: input.templateCode === "CLINIC",
      ...(input.contextFlags || {}),
    };

    const answers = answerMap(input.answers);
    const fieldIdByKey = new Map<string, string>();
    const sections: StructuredPacketModel["sections"] = [];

    for (const section of published.sections) {
      if (!this.evaluateSectionVisible(section.id, published.rules, flags)) continue;

      const title = pickLocalized(section.titleJson, locale);
      const bodyParts: string[] = [];

      for (const field of section.fields) {
        fieldIdByKey.set(field.key, field.id);
        const answered = answers.get(field.key);
        const staticContent = pickLocalized(field.contentJson, locale);

        switch (field.fieldType) {
          case RegistrationPacketFieldType.DEMOGRAPHICS_BLOCK:
            bodyParts.push(
              typeof answered === "string" && answered.trim()
                ? answered
                : formatDemographicsBody(input.patient, locale),
            );
            break;
          case RegistrationPacketFieldType.INSURANCE:
            bodyParts.push(
              typeof answered === "string" && answered.trim()
                ? answered
                : formatInsuranceBody(input.insurance ?? [], staticContent, locale),
            );
            break;
          case RegistrationPacketFieldType.STATIC_TEXT:
          case RegistrationPacketFieldType.ACKNOWLEDGEMENT:
            bodyParts.push(
              typeof answered === "string" && answered.trim() ? String(answered) : staticContent,
            );
            break;
          case RegistrationPacketFieldType.CHECKBOX:
            if (answered === true || answered === "true") {
              bodyParts.push(staticContent || pickLocalized(field.labelJson, locale) || field.key);
            } else if (staticContent) {
              bodyParts.push(staticContent);
            }
            break;
          case RegistrationPacketFieldType.TEXT:
          case RegistrationPacketFieldType.TEXTAREA:
          case RegistrationPacketFieldType.PHONE:
          case RegistrationPacketFieldType.DATE:
          case RegistrationPacketFieldType.ADDRESS:
          case RegistrationPacketFieldType.RELATIONSHIP:
          case RegistrationPacketFieldType.EMERGENCY_CONTACT:
          case RegistrationPacketFieldType.WITNESS:
          case RegistrationPacketFieldType.LANGUAGE:
          case RegistrationPacketFieldType.RADIO:
          case RegistrationPacketFieldType.SIGNATURE: {
            const label = pickLocalized(field.labelJson, locale);
            const value =
              answered === undefined || answered === null
                ? ""
                : typeof answered === "string"
                  ? answered
                  : JSON.stringify(answered);
            if (label && value) bodyParts.push(`${label}: ${value}`);
            else if (value) bodyParts.push(value);
            else if (staticContent) bodyParts.push(staticContent);
            break;
          }
          default:
            if (staticContent) bodyParts.push(staticContent);
        }
      }

      sections.push({
        id: section.key,
        title,
        body: bodyParts.filter(Boolean).join("\n\n") || pickLocalized(section.fullBodyJson, locale),
        conciseSummary: pickLocalized(section.conciseSummaryJson, locale) || undefined,
        fullBody:
          pickLocalized(section.fullBodyJson, locale) ||
          bodyParts.filter(Boolean).join("\n\n") ||
          undefined,
        sourceLabel: section.sourceLabel || undefined,
        sourceUrl: section.sourceUrl || undefined,
        authorityType: section.authorityType || undefined,
        contentVersion: section.contentVersion || undefined,
        legalReviewStatus: section.legalReviewStatus || undefined,
        acknowledgmentRequired: section.acknowledgmentRequired,
        acknowledgmentText: pickLocalized(section.acknowledgmentTextJson, locale) || undefined,
        separateSignatureRequired: section.separateSignatureRequired,
        reviewed: false,
        required: section.isRequired,
      });
    }

    if (sections.length === 0) {
      throw new BadRequestException("Template rendered with zero visible sections");
    }

    const theme = await this.resolveTheme(
      published.id,
      published.templateId,
      input.facility?.id,
      locale,
    );

    const facilityName =
      theme.facilityName?.trim() || input.facility?.name?.trim() || undefined;

    const model: StructuredPacketModel = {
      packetType: input.templateCode,
      packetVersion: published.version,
      locale,
      facility: input.facility?.id || facilityName
        ? {
            id: input.facility?.id,
            name: facilityName,
          }
        : null,
      patient: input.patient,
      encounter: input.encounter ?? null,
      insurance: Array.isArray(input.insurance) ? input.insurance : [],
      sections,
      signatures: Array.isArray(input.signatures) ? input.signatures : [],
      attestations: Array.isArray(input.attestations) ? input.attestations : [],
      generatedAt: input.generatedAt || new Date().toISOString(),
      finalizedAt: null,
    };

    return { model, templateVersionId: published.id, theme, fieldIdByKey };
  }

  async listPublishedTemplates() {
    return this.prisma.registrationPacketTemplate.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
      include: {
        versions: {
          where: { status: RegistrationPacketTemplateStatus.PUBLISHED },
          orderBy: { version: "asc" },
          select: {
            id: true,
            version: true,
            localeDefault: true,
            supportedLocales: true,
            publishedAt: true,
            _count: { select: { sections: true } },
          },
        },
      },
    });
  }

  async getPublishedTemplateDefinition(templateCode: string, version = "1.0") {
    const published = await this.findPublishedVersion(templateCode, version);
    return {
      templateId: published.templateId,
      templateCode: published.template.code,
      templateName: published.template.name,
      versionId: published.id,
      version: published.version,
      localeDefault: published.localeDefault,
      supportedLocales: published.supportedLocales,
      sections: published.sections.map((s) => ({
        id: s.id,
        key: s.key,
        sortOrder: s.sortOrder,
        titleJson: s.titleJson,
        helpTextJson: s.helpTextJson,
        conciseSummaryJson: s.conciseSummaryJson,
        fullBodyJson: s.fullBodyJson,
        sourceLabel: s.sourceLabel,
        sourceUrl: s.sourceUrl,
        authorityType: s.authorityType,
        legalReviewStatus: s.legalReviewStatus,
        contentVersion: s.contentVersion,
        acknowledgmentRequired: s.acknowledgmentRequired,
        acknowledgmentTextJson: s.acknowledgmentTextJson,
        separateSignatureRequired: s.separateSignatureRequired,
        pdfInclusionPolicy: s.pdfInclusionPolicy,
        isRequired: s.isRequired,
        fields: s.fields.map((f) => ({
          id: f.id,
          key: f.key,
          fieldType: f.fieldType,
          sortOrder: f.sortOrder,
          labelJson: f.labelJson,
          helpTextJson: f.helpTextJson,
          contentJson: f.contentJson,
          optionsJson: f.optionsJson,
          isRequired: f.isRequired,
        })),
      })),
      rules: published.rules.map((r) => ({
        id: r.id,
        name: r.name,
        action: r.action,
        conditionKey: r.conditionKey,
        conditionEquals: r.conditionEquals,
        sectionId: r.sectionId,
        fieldId: r.fieldId,
        sortOrder: r.sortOrder,
      })),
    };
  }

  /** Resolve published version id for packetType + packetVersion (back-compat linking). */
  async resolveTemplateVersionId(packetType: string, packetVersion: string): Promise<string | null> {
    try {
      const v = await this.findPublishedVersion(packetType, packetVersion || "1.0");
      return v.id;
    } catch {
      return null;
    }
  }

  async persistAnswers(params: {
    packetSourceId: string;
    answers: PacketAnswerInput[];
    fieldIdByKey?: Map<string, string>;
  }) {
    const { packetSourceId, answers, fieldIdByKey } = params;
    if (!answers?.length) return;

    for (const answer of answers) {
      if (!answer.fieldKey) continue;
      await this.prisma.registrationPacketAnswer.upsert({
        where: {
          packetSourceId_fieldKey: {
            packetSourceId,
            fieldKey: answer.fieldKey,
          },
        },
        update: {
          sectionKey: answer.sectionKey ?? null,
          fieldId: fieldIdByKey?.get(answer.fieldKey) ?? null,
          valueJson: answer.value as Prisma.InputJsonValue,
        },
        create: {
          packetSourceId,
          fieldKey: answer.fieldKey,
          sectionKey: answer.sectionKey ?? null,
          fieldId: fieldIdByKey?.get(answer.fieldKey) ?? null,
          valueJson: answer.value as Prisma.InputJsonValue,
        },
      });
    }
  }
}
