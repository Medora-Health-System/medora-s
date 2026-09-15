import type {
  ProviderDischargeDiagnosisCard,
  ProviderDischargeDocumentationForm,
  ProviderDischargeFollowUpRow,
} from "@/features/emergency/providerDischargeDocumentationModel";

const SENTINEL_RE = /^(?:UNLOCALIZED_SOURCE|UNLOCALIZED_ES(?:::.+)?)$/i;

function isSentinel(value: string | null | undefined): boolean {
  return SENTINEL_RE.test((value ?? "").trim());
}

function hasEnglishTemplateSignal(value: string): boolean {
  return /\b(?:you were evaluated|stay hydrated|return for care|return precautions|take .* medicines|emergency department|emergency room|follow-up)\b/i.test(
    value
  );
}

function diagnosisDisplay(card: ProviderDischargeDiagnosisCard): string {
  const display = card.displayName.trim();
  if (display && display.toLowerCase() !== card.code.trim().toLowerCase()) return display;
  return card.code.trim() ? `diagnóstico ${card.code.trim()}` : "su diagnóstico";
}

function spanishTemplateBody(card: ProviderDischargeDiagnosisCard, facilityDisplayName: string) {
  const facility = facilityDisplayName.trim() || "esta clínica";
  const code = card.code.trim().toUpperCase();
  const display = diagnosisDisplay(card);

  if (code.startsWith("R10")) {
    return {
      description:
        `Fue evaluado/a en ${facility} por dolor abdominal. Algunas causas pueden evolucionar después de la visita; se recomienda seguimiento ambulatorio cuando sea clínicamente apropiado.`,
      diagnosisInstructions:
        "Manténgase bien hidratado/a. Consuma una dieta ligera según la tolere, salvo que su profesional clínico le haya indicado lo contrario. Descanse según sea necesario y siga las indicaciones dadas durante esta visita.",
      medicationTreatment:
        "Tome los medicamentos para el dolor o las náuseas únicamente según lo recetado o indicado durante esta visita. No inicie medicamentos nuevos sin orientación de un profesional clínico.",
      returnPrecautions:
        "Busque atención médica si el dolor empeora, aparece fiebre, los vómitos persisten, observa sangre en las heces o el vómito, se desmaya, presenta nueva distensión abdominal, no puede retener líquidos o aparece cualquier otro síntoma preocupante. Busque atención urgente o de emergencia de inmediato si los síntomas son intensos o empeoran rápidamente.",
    };
  }

  if (code.startsWith("R11")) {
    return {
      description: `Fue evaluado/a en ${facility} por náuseas y/o vómitos. Los síntomas pueden cambiar después de la visita; realice seguimiento según las indicaciones recibidas.`,
      diagnosisInstructions:
        "Tome líquidos en pequeñas cantidades y con frecuencia. Avance la dieta gradualmente según la tolere y descanse. Siga las recomendaciones específicas de su profesional clínico.",
      medicationTreatment:
        "Use los medicamentos recetados o recomendados durante esta visita exactamente según las indicaciones. No inicie medicamentos nuevos sin consultar a un profesional clínico.",
      returnPrecautions:
        "Busque atención médica si no puede retener líquidos, presenta signos de deshidratación, dolor intenso, sangre en el vómito, fiebre persistente, desmayo o empeoramiento de los síntomas. Busque atención urgente o de emergencia de inmediato si presenta síntomas graves.",
    };
  }

  return {
    description: `Fue evaluado/a en ${facility} por ${display}. Algunas afecciones pueden evolucionar después de la visita; realice el seguimiento recomendado cuando sea clínicamente apropiado.`,
    diagnosisInstructions:
      "Siga las indicaciones entregadas durante esta visita, descanse según sea necesario y manténgase hidratado/a si no tiene una restricción médica de líquidos. Comuníquese con su profesional clínico si tiene dudas sobre su recuperación.",
    medicationTreatment:
      "Tome únicamente los medicamentos recetados o recomendados durante esta visita y siga exactamente las instrucciones de uso. No inicie medicamentos nuevos sin orientación de un profesional clínico.",
    returnPrecautions:
      "Busque atención médica si los síntomas empeoran, aparecen síntomas nuevos preocupantes o no mejora como se esperaba. Busque atención urgente o de emergencia de inmediato si presenta síntomas graves o se siente inseguro/a en casa.",
  };
}

const SPANISH_TIMING: Record<string, string> = {
  "within 1–2 days": "en 1–2 días",
  "within 1–2 days or as clinically appropriate": "en 1–2 días o según corresponda clínicamente",
  "within 1–2 days or as directed": "en 1–2 días o según las indicaciones",
  "within 24 hours": "en las próximas 24 horas",
  "within 24 hours or as directed": "en las próximas 24 horas o según las indicaciones",
  "within 48–72 hours or as directed": "en 48–72 horas o según las indicaciones",
  "within 24–72 hours or as directed": "en 24–72 horas o según las indicaciones",
  "within 24–48 hours or as directed": "en 24–48 horas o según las indicaciones",
  "within 1 week": "en 1 semana",
  "within 1 week or as directed": "en 1 semana o según las indicaciones",
  "within 2 weeks": "en 2 semanas",
  "within 2 weeks or as directed": "en 2 semanas o según las indicaciones",
  "within 3–5 days or as directed": "en 3–5 días o según las indicaciones",
  "within 3–7 days or as directed": "en 3–7 días o según las indicaciones",
  "within 7–14 days or as directed": "en 7–14 días o según las indicaciones",
  "as directed": "según las indicaciones",
  "urgent / as directed": "urgente / según las indicaciones",
  "if symptoms persist": "si los síntomas persisten",
  "if symptoms persist or as directed": "si los síntomas persisten o según las indicaciones",
  "if new or worsening symptoms develop": "si aparecen síntomas nuevos o empeoran",
  "for recurrent or worsening symptoms": "si los síntomas reaparecen o empeoran",
};

function defaultSpanishTimingForSpecialty(specialty: string): string {
  switch (specialty) {
    case "PRIMARY_CARE":
      return "en 1–2 días o según las indicaciones";
    case "ED_RECHECK":
      return "de inmediato si empeora o según las indicaciones";
    default:
      return "según corresponda clínicamente";
  }
}

function localizeFollowUpRow(row: ProviderDischargeFollowUpRow, locale: string): ProviderDischargeFollowUpRow {
  const timing = row.timing.trim();
  const comments = row.comments.trim();
  if (locale !== "es") {
    return {
      ...row,
      timing: isSentinel(timing) ? "" : row.timing,
      comments: isSentinel(comments) ? "" : row.comments,
      providerOrFacility: isSentinel(row.providerOrFacility) ? "" : row.providerOrFacility,
    };
  }

  const localizedTiming =
    isSentinel(timing) ? defaultSpanishTimingForSpecialty(row.specialty)
    : SPANISH_TIMING[timing] ?? timing;

  return {
    ...row,
    timing: localizedTiming,
    comments: isSentinel(comments) ? "" : row.comments,
    providerOrFacility: isSentinel(row.providerOrFacility) ? "" : row.providerOrFacility,
  };
}

function localizeSpanishCard(
  card: ProviderDischargeDiagnosisCard,
  facilityDisplayName: string
): ProviderDischargeDiagnosisCard {
  const body = spanishTemplateBody(card, facilityDisplayName);
  const shouldReplaceTemplateText =
    card.templateMeta?.providerConfirmed !== true &&
    (card.templateMeta?.appliedLocale !== "es" ||
      hasEnglishTemplateSignal(card.description) ||
      hasEnglishTemplateSignal(card.diagnosisInstructions) ||
      hasEnglishTemplateSignal(card.medicationTreatment) ||
      hasEnglishTemplateSignal(card.returnPrecautions));

  return {
    ...card,
    ...(shouldReplaceTemplateText ? body : {}),
    followUps: card.followUps.map((row) => localizeFollowUpRow(row, "es")),
    ...(shouldReplaceTemplateText && card.templateMeta ?
      {
        templateMeta: {
          ...card.templateMeta,
          appliedLocale: "es" as const,
          templateAppliedHash: undefined,
        },
      }
    : {}),
  };
}

function localizeSpanishSharedPrecautions(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || isSentinel(trimmed) || hasEnglishTemplateSignal(trimmed)) {
    return "Busque atención médica si los síntomas empeoran, aparecen síntomas nuevos preocupantes o no mejora como se esperaba. Busque atención urgente o de emergencia de inmediato si presenta síntomas graves o se siente inseguro/a en casa.";
  }
  return value;
}

const SPANISH_WORK_SCHOOL: Record<string, string> = {
  "May return today": "Puede reincorporarse hoy",
  "May return tomorrow": "Puede reincorporarse mañana",
  "May return in 2 days": "Puede reincorporarse en 2 días",
  "No work/school until medically cleared": "Sin trabajo/escuela hasta autorización médica",
  "Activity restriction": "Restricción de actividad",
};

function localizeSpanishWorkSchool(value: string): string {
  if (!value.trim() || isSentinel(value)) return "";
  return value
    .split("\n")
    .map((line) => SPANISH_WORK_SCHOOL[line.trim()] ?? line)
    .join("\n");
}

/**
 * Clinic-only presentation safety net for the shared EN/FR discharge template engine.
 * Spanish native template bodies are not yet present in the shared registry, so Clinic
 * uses a conservative Spanish patient-facing body for unconfirmed template-generated
 * cards rather than leaking English or localization sentinels. Provider-confirmed text
 * is never overwritten.
 */
export function localizeClinicDischargeFormForPresentation(
  form: ProviderDischargeDocumentationForm,
  locale: string,
  facilityDisplayName: string
): ProviderDischargeDocumentationForm {
  const normalizedLocale = locale.trim().toLowerCase();
  const diagnosisDocs =
    normalizedLocale === "es" ?
      form.diagnosisDocs.map((card) => localizeSpanishCard(card, facilityDisplayName))
    : form.diagnosisDocs.map((card) => ({
        ...card,
        followUps: card.followUps.map((row) => localizeFollowUpRow(row, normalizedLocale)),
      }));

  return {
    ...form,
    diagnosisDocs,
    followUps: form.followUps.map((row) => localizeFollowUpRow(row, normalizedLocale)),
    returnPrecautions:
      normalizedLocale === "es" ? localizeSpanishSharedPrecautions(form.returnPrecautions)
      : isSentinel(form.returnPrecautions) ? ""
      : form.returnPrecautions,
    returnWorkSchool:
      normalizedLocale === "es" ? localizeSpanishWorkSchool(form.returnWorkSchool)
      : isSentinel(form.returnWorkSchool) ? ""
      : form.returnWorkSchool,
  };
}

export function clinicDischargeFormContainsVisibleSentinel(form: ProviderDischargeDocumentationForm): boolean {
  const values = [
    form.returnPrecautions,
    form.returnWorkSchool,
    ...form.followUps.flatMap((row) => [row.providerOrFacility, row.timing, row.comments]),
    ...form.diagnosisDocs.flatMap((card) => [
      card.description,
      card.diagnosisInstructions,
      card.medicationTreatment,
      card.returnPrecautions,
      ...card.followUps.flatMap((row) => [row.providerOrFacility, row.timing, row.comments]),
    ]),
  ];
  return values.some((value) => isSentinel(value));
}
