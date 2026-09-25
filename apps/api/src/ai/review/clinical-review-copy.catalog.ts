import type { AiSuggestion } from "@medora/shared";

export type AiReviewLocale = "en" | "fr" | "es";

export const LANGUAGE_NAME: Record<AiReviewLocale, string> = { en: "English", fr: "French", es: "Spanish" };

export const DETERMINISTIC_COPY: Record<Exclude<AiReviewLocale, "en">, Record<string, { title: string; summary: string; why: string; action: string }>> = {
  es: {
    CLINICAL_SAFETY: { title: "Revisar seguridad clínica", summary: "Medora Assist identificó un hallazgo de seguridad en la documentación clínica que requiere revisión.", why: "Este hallazgo proviene de datos clínicos documentados de este encuentro y requiere confirmación del profesional clínico.", action: "Revisar historia" },
    DIAGNOSTIC_GAP: { title: "Revisar diagnóstico y estudios", summary: "Hay un posible vacío o inconsistencia en la documentación diagnóstica de este encuentro.", why: "Revise los estudios, resultados y la documentación clínica relacionada antes de continuar.", action: "Revisar diagnóstico" },
    RESULT_FOLLOWUP: { title: "Revisar seguimiento de resultados", summary: "Hay un resultado que puede requerir revisión o seguimiento documentado.", why: "Los resultados relevantes deben reconciliarse con la evaluación y el plan del encuentro.", action: "Revisar resultados" },
    MEDICATION_CONSIDERATION: { title: "Revisar medicación y tratamiento", summary: "Hay una consideración relacionada con medicamentos o tratamiento que requiere revisión clínica.", why: "La recomendación es informativa y no prescribe ni modifica órdenes.", action: "Revisar medicamentos" },
    ORDER_CONSIDERATION: { title: "Revisar órdenes clínicas", summary: "Hay una consideración relacionada con las órdenes de este encuentro.", why: "Revise las órdenes y su relación con la evaluación, los resultados y el plan documentado.", action: "Revisar órdenes" },
    REASSESSMENT_GAP: { title: "Revisar reevaluación clínica", summary: "La documentación clínica sugiere que la reevaluación puede estar ausente o incompleta.", why: "La reevaluación debe relacionar la evolución del paciente con el tratamiento, los resultados y la disposición.", action: "Revisar reevaluación" },
    DOCUMENTATION_GAP: { title: "Revisar documentación clínica", summary: "La documentación de este encuentro puede estar incompleta o pendiente.", why: "Complete o reconcilie la documentación aplicable antes de finalizar el encuentro.", action: "Revisar documentación" },
    MDM_GAP: { title: "La toma de decisiones médicas puede estar incompleta", summary: "La documentación del MDM tiene componentes clínicos pendientes de completar.", why: "Este hallazgo revisa la integridad de la documentación del MDM; no determina por sí solo que la decisión clínica sea incorrecta.", action: "Revisar toma de decisiones médicas" },
    DISPOSITION_GAP: { title: "Revisar disposición", summary: "La disposición documentada puede estar ausente o incompleta.", why: "La disposición debe ser coherente con la evaluación, los resultados, el tratamiento y la reevaluación documentados.", action: "Revisar disposición" },
    DISCHARGE_SAFETY: { title: "Revisar seguridad del alta", summary: "Hay un elemento de seguridad del alta que requiere revisión antes de finalizar el encuentro.", why: "Revise resultados pendientes, reevaluación, tratamiento, medicamentos e instrucciones de seguimiento aplicables.", action: "Revisar alta" },
    FOLLOW_UP_GAP: { title: "Revisar seguimiento", summary: "El seguimiento documentado puede estar incompleto o pendiente.", why: "El plan de seguimiento debe corresponder a la evaluación y disposición de este encuentro.", action: "Revisar seguimiento" },
    CONTRADICTION: { title: "Revisar posible inconsistencia clínica", summary: "Dos o más datos clínicos documentados del encuentro pueden requerir reconciliación.", why: "Medora Assist no decide cuál dato es correcto; señala la inconsistencia para revisión clínica.", action: "Revisar historia" },
    DUPLICATION: { title: "Revisar posible duplicación", summary: "Hay elementos documentados que pueden representar una duplicación y requieren revisión.", why: "Confirme la intención clínica antes de realizar cambios.", action: "Revisar órdenes" },
    PENDING_ACTION: { title: "Revisar elemento pendiente", summary: "Hay un elemento clínico pendiente que requiere revisión.", why: "Confirme su estado y relación con el plan actual del encuentro.", action: "Revisar historia" },
  },
  fr: {
    CLINICAL_SAFETY: { title: "Revoir la sécurité clinique", summary: "Medora Assist a détecté un élément documenté de sécurité nécessitant une revue clinique.", why: "Ce constat provient des données cliniques documentées de cette consultation et doit être confirmé par le clinicien.", action: "Consulter le dossier" },
    DIAGNOSTIC_GAP: { title: "Revoir le diagnostic et les examens", summary: "Il existe un possible manque ou une incohérence dans la documentation diagnostique de cette consultation.", why: "Revoyez les examens, résultats et la documentation clinique associée.", action: "Revoir le diagnostic" },
    RESULT_FOLLOWUP: { title: "Revoir le suivi des résultats", summary: "Un résultat peut nécessiter une revue ou un suivi documenté.", why: "Les résultats pertinents doivent être rapprochés de l'évaluation et du plan.", action: "Revoir les résultats" },
    MEDICATION_CONSIDERATION: { title: "Revoir les médicaments et le traitement", summary: "Une considération liée aux médicaments ou au traitement nécessite une revue clinique.", why: "Cette recommandation est informative et ne prescrit ni ne modifie d'ordonnance.", action: "Revoir les médicaments" },
    ORDER_CONSIDERATION: { title: "Revoir les ordres cliniques", summary: "Une considération liée aux ordres de cette consultation nécessite une revue.", why: "Revoyez les ordres avec l'évaluation, les résultats et le plan documenté.", action: "Revoir les ordres" },
    REASSESSMENT_GAP: { title: "Revoir la réévaluation clinique", summary: "La documentation clinique suggère que la réévaluation peut être absente ou incomplète.", why: "La réévaluation doit relier l'évolution du patient au traitement, aux résultats et à la disposition.", action: "Revoir la réévaluation" },
    DOCUMENTATION_GAP: { title: "Revoir la documentation clinique", summary: "La documentation de cette consultation peut être incomplète ou en attente.", why: "Complétez ou rapprochez la documentation applicable avant de finaliser la consultation.", action: "Revoir la documentation" },
    MDM_GAP: { title: "La prise de décision médicale peut être incomplète", summary: "La documentation du MDM contient des éléments cliniques à compléter.", why: "Ce constat évalue l'intégrité de la documentation du MDM; il ne détermine pas à lui seul qu'une décision clinique est incorrecte.", action: "Revoir la prise de décision médicale" },
    DISPOSITION_GAP: { title: "Revoir la disposition", summary: "La disposition documentée peut être absente ou incomplète.", why: "La disposition doit être cohérente avec l'évaluation, les résultats, le traitement et la réévaluation documentés.", action: "Revoir la disposition" },
    DISCHARGE_SAFETY: { title: "Revoir la sécurité de sortie", summary: "Un élément de sécurité de sortie nécessite une revue avant de finaliser la consultation.", why: "Revoyez les résultats en attente, la réévaluation, le traitement, les médicaments et le suivi applicables.", action: "Revoir la sortie" },
    FOLLOW_UP_GAP: { title: "Revoir le suivi", summary: "Le suivi documenté peut être incomplet ou en attente.", why: "Le plan de suivi doit correspondre à l'évaluation et à la disposition de cette consultation.", action: "Revoir le suivi" },
    CONTRADICTION: { title: "Revoir une possible incohérence clinique", summary: "Deux données cliniques documentées ou plus peuvent nécessiter un rapprochement.", why: "Medora Assist ne décide pas quelle donnée est correcte; elle signale l'incohérence pour revue clinique.", action: "Consulter le dossier" },
    DUPLICATION: { title: "Revoir une possible duplication", summary: "Des éléments documentés peuvent représenter une duplication et nécessitent une revue.", why: "Confirmez l'intention clinique avant toute modification.", action: "Revoir les ordres" },
    PENDING_ACTION: { title: "Revoir un élément en attente", summary: "Un élément clinique en attente nécessite une revue.", why: "Confirmez son état et son lien avec le plan actuel.", action: "Consulter le dossier" },
  },
};

const MDM_DOMAIN_LABELS = {
  es: { "working assessment": "evaluación clínica de trabajo", "data reviewed": "datos revisados", "risk/management reasoning": "razonamiento de riesgo y manejo", "plan/disposition reasoning": "razonamiento del plan y la disposición" },
  fr: { "working assessment": "évaluation clinique de travail", "data reviewed": "données examinées", "risk/management reasoning": "raisonnement sur le risque et la prise en charge", "plan/disposition reasoning": "raisonnement du plan et de la disposition" },
} as const;

export function localizedMdmSummary(summary: string, locale: Exclude<AiReviewLocale, "en">): string | null {
  if (summary.includes("do not contain documented clinical reasoning")) {
    return locale === "es"
      ? "La documentación del profesional está presente, pero el MDM no contiene razonamiento clínico documentado."
      : "La documentation du clinicien est présente, mais le MDM ne contient pas de raisonnement clinique documenté.";
  }
  const prefixes = ["Medical decision-making is missing documented ", "The structured MDM is missing documented "];
  const prefix = prefixes.find((candidate) => summary.startsWith(candidate));
  if (!prefix) return null;
  const raw = summary.slice(prefix.length).replace(/\.$/, "");
  const translated = raw.split(", ").map((item) => MDM_DOMAIN_LABELS[locale][item as keyof typeof MDM_DOMAIN_LABELS[typeof locale]] ?? item);
  if (!translated.length) return null;
  const joined = translated.length === 1 ? translated[0] : `${translated.slice(0, -1).join(", ")} ${locale === "es" ? "y" : "et"} ${translated.at(-1)}`;
  return locale === "es" ? `Falta documentar ${joined} en la toma de decisiones médicas.` : `Il manque la documentation de ${joined} dans la prise de décision médicale.`;
}



export function localizeDeterministicClinicalCopy(suggestion: AiSuggestion, locale: AiReviewLocale): AiSuggestion {
  if (locale === "en") return suggestion;
  const copy = DETERMINISTIC_COPY[locale][suggestion.category];
  if (!copy) return suggestion;

  let title = copy.title;
  let summary = copy.summary;
  let reasoningSummary = copy.why;

  if (suggestion.category === "MDM_GAP") {
    summary = localizedMdmSummary(suggestion.summary, locale) ?? summary;
  } else if (suggestion.category === "DOCUMENTATION_GAP" && (suggestion.title.toLowerCase().includes("unsigned") || suggestion.summary.includes("expected SIGNED"))) {
    summary = locale === "es" ? "La documentación del profesional clínico está en BORRADOR y todavía no está firmada o finalizada." : "La documentation du clinicien est encore en BROUILLON et n'est pas encore signée ou finalisée.";
  } else if (suggestion.title === "No vital signs are documented for this emergency encounter") {
    title = locale === "es" ? "No hay signos vitales documentados en este encuentro de urgencias" : "Aucun signe vital n'est documenté pour cette consultation d'urgence";
    summary = locale === "es" ? "La documentación del profesional ya comenzó, pero la historia no contiene ningún conjunto de signos vitales registrado. Confirme si se obtuvieron y documente los valores actuales si están disponibles." : "La documentation du clinicien a commencé, mais le dossier ne contient aucun ensemble de signes vitaux enregistré. Confirmez s'ils ont été obtenus et documentez les valeurs actuelles si elles sont disponibles.";
    reasoningSummary = locale === "es" ? "Este hallazgo identifica que no hay signos vitales documentados después de iniciar la evaluación clínica; no supone que no se hayan medido al lado del paciente." : "Ce constat signale l'absence de signes vitaux documentés après le début de l'évaluation clinique; il ne suppose pas qu'ils n'ont pas été mesurés au chevet.";
  } else if (suggestion.title === "Available diagnostic results are not documented as reviewed" || suggestion.title === "Available diagnostic results are not reconciled in the MDM") {
    title = locale === "es" ? "Los resultados diagnósticos disponibles no están documentados como revisados" : "Les résultats diagnostiques disponibles ne sont pas documentés comme examinés";
    summary = locale === "es" ? "Hay resultados diagnósticos disponibles en la historia, pero la toma de decisiones médicas no documenta cómo fueron revisados. Documente su revisión y relevancia clínica cuando corresponda." : "Des résultats diagnostiques sont disponibles dans le dossier, mais la prise de décision médicale ne documente pas leur examen. Documentez leur revue et leur pertinence clinique lorsque cela s'applique.";
    reasoningSummary = locale === "es" ? "Este hallazgo revisa si los datos diagnósticos disponibles están explícitamente integrados en la toma de decisiones médicas; no determina si la interpretación clínica es correcta." : "Ce constat vérifie si les données diagnostiques disponibles sont explicitement intégrées à la prise de décision médicale; il ne détermine pas si l'interprétation clinique est correcte.";
  } else if (suggestion.title === "Medication administration timestamp missing") {
    title = locale === "es" ? "Falta la hora de administración de un medicamento" : "L'heure d'administration d'un médicament est manquante";
    summary = locale === "es" ? "Una o más entradas del registro de administración están marcadas como administradas, pero no incluyen la hora de administración. Confirme y complete el registro cuando corresponda." : "Une ou plusieurs entrées du registre d'administration sont marquées comme administrées, mais l'heure d'administration est absente. Confirmez et complétez le registre lorsque cela s'applique.";
    reasoningSummary = locale === "es" ? "Este hallazgo compara únicamente la acción registrada y la hora de administración; no determina si el medicamento se administró realmente." : "Ce constat compare uniquement l'action enregistrée et l'heure d'administration; il ne détermine pas si le médicament a réellement été administré.";
  }

  return { ...suggestion, title, summary, reasoningSummary, evidence: [], recommendedActions: suggestion.recommendedActions.map((action) => ({ ...action, label: copy.action })), clinicalDisclaimer: locale === "es" ? "Requiere revisión del profesional clínico; Medora Assist no diagnostica ni ejecuta acciones clínicas de forma autónoma." : "Nécessite une revue par le clinicien; Medora Assist ne pose pas de diagnostic et n'exécute aucune action clinique de manière autonome." };
}
