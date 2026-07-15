/**
 * Seed: Freestanding ER Registration Packet Template Version 1.0
 * Mirrors the existing wizard section set (no user-facing change).
 */

import {
  PrismaClient,
  RegistrationPacketFieldType,
  RegistrationPacketTemplateStatus,
} from "@prisma/client";

type Localized = { en: string; fr: string; es?: string };

const L = (en: string, fr: string, es?: string): Localized =>
  es ? { en, fr, es } : { en, fr };

const FREESTANDING_ER_SECTIONS: Array<{
  key: string;
  sortOrder: number;
  title: Localized;
  fieldKey: string;
  fieldType: RegistrationPacketFieldType;
  content?: Localized;
  label?: Localized;
}> = [
  {
    key: "demographics",
    sortOrder: 10,
    title: L("Patient Demographics", "Données démographiques du patient", "Datos demográficos del paciente"),
    fieldKey: "demographics_block",
    fieldType: RegistrationPacketFieldType.DEMOGRAPHICS_BLOCK,
    label: L("Patient information", "Informations patient", "Información del paciente"),
  },
  {
    key: "insurance",
    sortOrder: 20,
    title: L("Insurance", "Assurance", "Seguro"),
    fieldKey: "insurance_block",
    fieldType: RegistrationPacketFieldType.INSURANCE,
    label: L("Insurance coverage", "Couverture d'assurance", "Cobertura de seguro"),
    content: L(
      "I acknowledge that the above insurance information is accurate to the best of my knowledge.",
      "Je reconnais que les informations d'assurance ci-dessus sont exactes au meilleur de ma connaissance.",
      "Reconozco que la información del seguro anterior es exacta según mi leal saber y entender.",
    ),
  },
  {
    key: "consent",
    sortOrder: 30,
    title: L("Consent for Treatment", "Consentement aux soins", "Consentimiento para el tratamiento"),
    fieldKey: "consent_text",
    fieldType: RegistrationPacketFieldType.STATIC_TEXT,
    content: L(
      "I consent to receive medical treatment, diagnostic procedures, and therapeutic interventions as deemed necessary by the attending physician and clinical staff. I understand that the practice of medicine is not an exact science, and no guarantees have been made regarding the outcome of treatment.",
      "Je consens à recevoir des soins médicaux, des procédures diagnostiques et des interventions thérapeutiques jugées nécessaires par le médecin traitant et le personnel clinique. Je comprends que la pratique médicale n'est pas une science exacte et qu'aucune garantie n'a été faite concernant le résultat du traitement.",
      "Consiento en recibir tratamiento médico, procedimientos diagnósticos e intervenciones terapéuticas que el médico tratante y el personal clínico consideren necesarios. Entiendo que la práctica de la medicina no es una ciencia exacta y que no se han hecho garantías sobre el resultado del tratamiento.",
    ),
  },
  {
    key: "aob",
    sortOrder: 40,
    title: L("Assignment of Benefits", "Cession des prestations", "Cesión de beneficios"),
    fieldKey: "aob_text",
    fieldType: RegistrationPacketFieldType.STATIC_TEXT,
    content: L(
      "I assign all medical and/or surgical benefits to the healthcare provider. I authorize direct payment to the provider for services rendered. I understand I am financially responsible for any charges not covered by my insurance, including co-payments, deductibles, and non-covered services.",
      "Je cède toutes les prestations médicales et/ou chirurgicales au prestataire de soins. J'autorise le paiement direct au prestataire pour les services rendus. Je comprends que je suis financièrement responsable de tous les frais non couverts par mon assurance, y compris les co-paiements, franchises et services non couverts.",
      "Cedo todos los beneficios médicos y/o quirúrgicos al prestador de atención médica. Autorizo el pago directo al prestador por los servicios prestados. Entiendo que soy financieramente responsable de todos los cargos no cubiertos por mi seguro, incluidos copagos, deducibles y servicios no cubiertos.",
    ),
  },
  {
    key: "privacy",
    sortOrder: 50,
    title: L("Notice of Privacy Practices (HIPAA)", "Avis de pratiques de confidentialité (HIPAA)", "Aviso de prácticas de privacidad (HIPAA)"),
    fieldKey: "privacy_text",
    fieldType: RegistrationPacketFieldType.STATIC_TEXT,
    content: L(
      "I acknowledge that I have been offered a copy of the Notice of Privacy Practices (HIPAA). I understand how my health information may be used and disclosed for treatment, payment, and healthcare operations.",
      "Je reconnais qu'on m'a offert un exemplaire de l'Avis de pratiques de confidentialité (HIPAA). Je comprends comment mes informations de santé peuvent être utilisées et divulguées pour le traitement, le paiement et les opérations de soins.",
      "Reconozco que se me ha ofrecido una copia del Aviso de prácticas de privacidad (HIPAA). Entiendo cómo se puede usar y divulgar mi información de salud para tratamiento, pago y operaciones de atención médica.",
    ),
  },
  {
    key: "rights",
    sortOrder: 60,
    title: L("Patient Bill of Rights", "Charte des droits du patient", "Carta de derechos del paciente"),
    fieldKey: "rights_text",
    fieldType: RegistrationPacketFieldType.STATIC_TEXT,
    content: L(
      "I acknowledge that I have been informed of my rights as a patient, including the right to make decisions about my care, the right to refuse treatment, the right to privacy and confidentiality, and the right to file a complaint.",
      "Je reconnais avoir été informé de mes droits en tant que patient, y compris le droit de prendre des décisions concernant mes soins, le droit de refuser le traitement, le droit à la vie privée et à la confidentialité, et le droit de déposer une plainte.",
      "Reconozco que se me ha informado de mis derechos como paciente, incluido el derecho a tomar decisiones sobre mi atención, el derecho a rechazar el tratamiento, el derecho a la privacidad y confidencialidad, y el derecho a presentar una queja.",
    ),
  },
  {
    key: "facilityNotice",
    sortOrder: 70,
    title: L("Facility Notices", "Avis de l'établissement", "Avisos del establecimiento"),
    fieldKey: "facility_notice_text",
    fieldType: RegistrationPacketFieldType.STATIC_TEXT,
    content: L(
      "I acknowledge that I have been informed of facility-specific policies, including visiting hours, advance directive information, and grievance procedures.",
      "Je reconnais avoir été informé des politiques propres à l'établissement, y compris les heures de visite, les informations sur les directives anticipées et les procédures de réclamation.",
      "Reconozco que se me ha informado de las políticas específicas del establecimiento, incluidos los horarios de visita, la información sobre directivas anticipadas y los procedimientos de reclamación.",
    ),
  },
  {
    key: "medicareMedicaid",
    sortOrder: 80,
    title: L("Medicare / Medicaid Non-Participation Notice", "Avis de non-participation Medicare / Medicaid", "Aviso de no participación en Medicare / Medicaid"),
    fieldKey: "medicare_medicaid_text",
    fieldType: RegistrationPacketFieldType.STATIC_TEXT,
    content: L(
      "Medicare and/or Medicaid participation for this facility is stated only from facility-approved configuration. If status is not configured, staff must not assert non-participation. Ask for the current written participation status before relying on any statement. No obsolete fee amounts are included.",
      "La participation Medicare et/ou Medicaid de cet établissement n'est indiquée que selon la configuration approuvée. Si le statut n'est pas configuré, le personnel ne doit pas affirmer une non-participation. Demandez le statut écrit actuel avant de vous fier à toute affirmation. Aucun montant obsolète n'est inclus.",
      "La participación en Medicare y/o Medicaid de este establecimiento se indica solo según la configuración aprobada. Si el estado no está configurado, el personal no debe afirmar la no participación. Solicite el estado escrito actual antes de confiar en cualquier declaración. No se incluyen montos obsoletos.",
    ),
  },
];

/** Idempotent upsert of FREESTANDING_ER template v1.0 + theme + medicare rule. */
export async function seedRegistrationPacketTemplates(prisma: PrismaClient): Promise<void> {
  const template = await prisma.registrationPacketTemplate.upsert({
    where: { code: "FREESTANDING_ER" },
    update: {
      name: "Freestanding ER Registration Packet",
      description: "Default freestanding emergency registration packet (Template Version 1).",
      facilityTypeScope: "FREESTANDING_ER",
      isActive: true,
    },
    create: {
      code: "FREESTANDING_ER",
      name: "Freestanding ER Registration Packet",
      description: "Default freestanding emergency registration packet (Template Version 1).",
      facilityTypeScope: "FREESTANDING_ER",
      isActive: true,
    },
  });

  const version = await prisma.registrationPacketTemplateVersion.upsert({
    where: {
      templateId_version: { templateId: template.id, version: "1.0" },
    },
    update: {
      status: RegistrationPacketTemplateStatus.PUBLISHED,
      localeDefault: "en",
      supportedLocales: ["en", "fr", "es"],
      publishedAt: new Date(),
    },
    create: {
      templateId: template.id,
      version: "1.0",
      status: RegistrationPacketTemplateStatus.PUBLISHED,
      localeDefault: "en",
      supportedLocales: ["en", "fr", "es"],
      publishedAt: new Date(),
    },
  });

  for (const sectionDef of FREESTANDING_ER_SECTIONS) {
    const section = await prisma.registrationPacketSection.upsert({
      where: {
        templateVersionId_key: {
          templateVersionId: version.id,
          key: sectionDef.key,
        },
      },
      update: {
        sortOrder: sectionDef.sortOrder,
        titleJson: sectionDef.title,
        isRequired: true,
      },
      create: {
        templateVersionId: version.id,
        key: sectionDef.key,
        sortOrder: sectionDef.sortOrder,
        titleJson: sectionDef.title,
        isRequired: true,
      },
    });

    await prisma.registrationPacketField.upsert({
      where: {
        sectionId_key: { sectionId: section.id, key: sectionDef.fieldKey },
      },
      update: {
        fieldType: sectionDef.fieldType,
        sortOrder: 10,
        labelJson: sectionDef.label ?? null,
        contentJson: sectionDef.content ?? null,
        isRequired: true,
      },
      create: {
        sectionId: section.id,
        key: sectionDef.fieldKey,
        fieldType: sectionDef.fieldType,
        sortOrder: 10,
        labelJson: sectionDef.label ?? null,
        contentJson: sectionDef.content ?? null,
        isRequired: true,
      },
    });
  }

  // Medicare/Medicaid section only for freestanding ER context (always shown for this template).
  const medicareSection = await prisma.registrationPacketSection.findUnique({
    where: {
      templateVersionId_key: {
        templateVersionId: version.id,
        key: "medicareMedicaid",
      },
    },
  });

  if (medicareSection) {
    const existingRule = await prisma.registrationPacketConditionalRule.findFirst({
      where: {
        templateVersionId: version.id,
        sectionId: medicareSection.id,
        conditionKey: "FREESTANDING_ER",
        action: "SHOW_IF",
      },
    });
    if (!existingRule) {
      await prisma.registrationPacketConditionalRule.create({
        data: {
          templateVersionId: version.id,
          sectionId: medicareSection.id,
          name: "Show Medicare/Medicaid notice for freestanding ER",
          action: "SHOW_IF",
          conditionKey: "FREESTANDING_ER",
          conditionEquals: true,
          sortOrder: 10,
        },
      });
    }
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
        footerJson: L(
          "This document was electronically generated and signed via Medora EMR.",
          "Ce document a été généré et signé électroniquement via Medora EMR.",
          "Este documento fue generado y firmado electrónicamente a través de Medora EMR.",
        ),
        legalNoticesJson: L(
          "Retain a copy of this registration package with the patient chart.",
          "Conservez une copie de ce dossier d'inscription avec le dossier du patient.",
          "Conserve una copia de este paquete de registro con la historia clínica del paciente.",
        ),
      },
    });
  }

  // Also seed URGENT_CARE / CLINIC / HOSPITAL as thin clones without medicare section (back-compat).
  for (const code of ["URGENT_CARE", "CLINIC", "HOSPITAL"] as const) {
    const names: Record<typeof code, string> = {
      URGENT_CARE: "Urgent Care Registration Packet",
      CLINIC: "Clinic Registration Packet",
      HOSPITAL: "Hospital Registration Packet",
    };
    const t = await prisma.registrationPacketTemplate.upsert({
      where: { code },
      update: {
        name: names[code],
        facilityTypeScope: code,
        isActive: true,
      },
      create: {
        code,
        name: names[code],
        facilityTypeScope: code,
        isActive: true,
      },
    });
    const v = await prisma.registrationPacketTemplateVersion.upsert({
      where: { templateId_version: { templateId: t.id, version: "1.0" } },
      update: {
        status: RegistrationPacketTemplateStatus.PUBLISHED,
        localeDefault: "en",
        supportedLocales: ["en", "fr", "es"],
        publishedAt: new Date(),
      },
      create: {
        templateId: t.id,
        version: "1.0",
        status: RegistrationPacketTemplateStatus.PUBLISHED,
        localeDefault: "en",
        supportedLocales: ["en", "fr", "es"],
        publishedAt: new Date(),
      },
    });
    for (const sectionDef of FREESTANDING_ER_SECTIONS.filter((s) => s.key !== "medicareMedicaid")) {
      const section = await prisma.registrationPacketSection.upsert({
        where: {
          templateVersionId_key: { templateVersionId: v.id, key: sectionDef.key },
        },
        update: {
          sortOrder: sectionDef.sortOrder,
          titleJson: sectionDef.title,
          isRequired: true,
        },
        create: {
          templateVersionId: v.id,
          key: sectionDef.key,
          sortOrder: sectionDef.sortOrder,
          titleJson: sectionDef.title,
          isRequired: true,
        },
      });
      await prisma.registrationPacketField.upsert({
        where: {
          sectionId_key: { sectionId: section.id, key: sectionDef.fieldKey },
        },
        update: {
          fieldType: sectionDef.fieldType,
          sortOrder: 10,
          labelJson: sectionDef.label ?? null,
          contentJson: sectionDef.content ?? null,
          isRequired: true,
        },
        create: {
          sectionId: section.id,
          key: sectionDef.fieldKey,
          fieldType: sectionDef.fieldType,
          sortOrder: 10,
          labelJson: sectionDef.label ?? null,
          contentJson: sectionDef.content ?? null,
          isRequired: true,
        },
      });
    }
  }

  console.log("Seeded registration packet templates (FREESTANDING_ER / URGENT_CARE / CLINIC / HOSPITAL v1.0)");
}

export const FREESTANDING_ER_V1_SECTION_KEYS = FREESTANDING_ER_SECTIONS.map((s) => s.key);
