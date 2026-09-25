import type { AiLocalizedCopy } from "./ai-localized-copy.js";
import { interpolateAiLocalizedCopy } from "./ai-localized-copy.js";

export const MEDORA_ASSIST_DISCLAIMER: AiLocalizedCopy = {
  en: "This is clinical decision support for clinician review only. It does not diagnose, treat, or change the chart.",
  es: "Esto es apoyo a la decisión clínica y requiere revisión del clínico. No diagnostica, no trata y no modifica la historia.",
  fr: "Il s’agit d’une aide à la décision clinique nécessitant une revue par le clinicien. Elle ne pose pas de diagnostic, ne traite pas et ne modifie pas le dossier.",
};

export const MEDORA_ASSIST_REVIEW_ACTION: AiLocalizedCopy = {
  en: "Review",
  es: "Revisar",
  fr: "Réviser",
};

const FINDING_COPY = {
  criticalResultUnacknowledged: {
    title: {
      en: "Critical result without documented reconciliation",
      es: "Resultado crítico sin conciliación documentada",
      fr: "Résultat critique sans conciliation documentée",
    },
    summary: {
      en: "A critical result is documented, but provider acknowledgement is not recorded. Review the result and document how it was addressed before continuing care.",
      es: "Hay un resultado crítico documentado, pero no consta el acuse de recibo del profesional. Revise el resultado y documente cómo se abordó antes de continuar la atención.",
      fr: "Un résultat critique est documenté, mais l’accusé de réception du professionnel n’est pas enregistré. Relisez le résultat et documentez la conduite adoptée avant de poursuivre les soins.",
    },
  },
  criticalResultNamed: {
    title: {
      en: "Critical result without documented reconciliation",
      es: "Resultado crítico sin conciliación documentada",
      fr: "Résultat critique sans conciliation documentée",
    },
    summary: {
      en: "{study} is marked critical, but provider acknowledgement is not recorded. Review the result and document how it was addressed before continuing care.",
      es: "{study} está marcado como crítico, pero no consta el acuse de recibo del profesional. Revise el resultado y documente cómo se abordó antes de continuar la atención.",
      fr: "{study} est marqué critique, mais l’accusé de réception du professionnel n’est pas enregistré. Relisez le résultat et documentez la conduite adoptée avant de poursuivre les soins.",
    },
  },
  pendingDiagnosticAtDischarge: {
    title: {
      en: "Pending diagnostic study at discharge",
      es: "Estudio diagnóstico pendiente al alta",
      fr: "Examen diagnostique en attente à la sortie",
    },
    summary: {
      en: "{study} remains pending while discharge is being prepared. Document how the result will be reviewed and communicated if follow-up is required.",
      es: "{study} sigue pendiente mientras se prepara el alta. Documente cómo se revisará y comunicará el resultado si se requiere seguimiento.",
      fr: "{study} reste en attente pendant la préparation de la sortie. Documentez comment le résultat sera relu et communiqué si un suivi est nécessaire.",
    },
  },
  criticalResultAtDischarge: {
    title: {
      en: "Critical result remains before discharge",
      es: "Resultado crítico pendiente antes del alta",
      fr: "Résultat critique encore présent avant la sortie",
    },
    summary: {
      en: "A critical result remains documented before discharge. Review whether it has been addressed in the assessment and disposition plan.",
      es: "Un resultado crítico permanece documentado antes del alta. Revise si se abordó en la evaluación y el plan de disposición.",
      fr: "Un résultat critique reste documenté avant la sortie. Vérifiez s’il a été pris en compte dans l’évaluation et le plan de sortie.",
    },
  },
  criticalResultNamedAtDischarge: {
    title: {
      en: "Critical result remains before discharge",
      es: "Resultado crítico pendiente antes del alta",
      fr: "Résultat critique encore présent avant la sortie",
    },
    summary: {
      en: "A critical {study} result remains documented before discharge. Review whether the result has been addressed in the assessment and disposition plan.",
      es: "Un resultado crítico de {study} permanece documentado antes del alta. Revise si el resultado se abordó en la evaluación y el plan de disposición.",
      fr: "Un résultat critique de {study} reste documenté avant la sortie. Vérifiez s’il a été pris en compte dans l’évaluation et le plan de sortie.",
    },
  },
  missingDisposition: {
    title: {
      en: "Disposition is not documented",
      es: "La disposición no está documentada",
      fr: "La destination n’est pas documentée",
    },
    summary: {
      en: "This encounter is closed, but a disposition value is not documented. Review and complete the disposition before the chart is finalized.",
      es: "Este encuentro está cerrado, pero no hay un valor de disposición documentado. Complete la disposición antes de finalizar la historia.",
      fr: "Cette rencontre est clôturée, mais aucune destination n’est documentée. Complétez la destination avant de finaliser le dossier.",
    },
  },
  missingCheckout: {
    title: {
      en: "Clinic checkout destination is not documented",
      es: "El destino de salida de consulta no está documentado",
      fr: "La destination de sortie de clinique n’est pas documentée",
    },
    summary: {
      en: "This clinic encounter is closed, but an ambulatory checkout destination is not documented.",
      es: "Este encuentro de consulta está cerrado, pero no se documentó el destino de salida ambulatoria.",
      fr: "Cette rencontre de clinique est clôturée, mais la destination de sortie ambulatoire n’est pas documentée.",
    },
  },
  unsignedDocumentation: {
    title: {
      en: "Provider documentation is not signed",
      es: "La documentación del profesional no está firmada",
      fr: "La documentation du professionnel n’est pas signée",
    },
    summary: {
      en: "Provider documentation is present but not signed. Review the note and complete signature if the documentation is ready.",
      es: "Hay documentación del profesional, pero no está firmada. Revise la nota y complete la firma si la documentación está lista.",
      fr: "La documentation du professionnel est présente mais n’est pas signée. Relisez la note et signez-la si elle est prête.",
    },
  },
  openFollowUp: {
    title: {
      en: "Follow-up remains incomplete",
      es: "El seguimiento permanece incompleto",
      fr: "Le suivi reste incomplet",
    },
    summary: {
      en: "A follow-up item is documented but is not marked completed or cancelled. Review the follow-up plan before the encounter is finalized.",
      es: "Hay un elemento de seguimiento documentado que no está marcado como completado o cancelado. Revise el plan de seguimiento antes de finalizar el encuentro.",
      fr: "Un élément de suivi est documenté mais n’est ni complété ni annulé. Relisez le plan de suivi avant de finaliser la rencontre.",
    },
  },
  missingFollowUp: {
    title: {
      en: "Follow-up instructions are missing",
      es: "Faltan instrucciones de seguimiento",
      fr: "Les consignes de suivi manquent",
    },
    summary: {
      en: "Follow-up instructions have not been documented for this discharge.",
      es: "No se han documentado instrucciones de seguimiento para esta alta.",
      fr: "Aucune consigne de suivi n’a été documentée pour cette sortie.",
    },
  },
  marUnknownOrder: {
    title: {
      en: "Administration is not linked to a medication order",
      es: "La administración no está vinculada a una orden de medicamento",
      fr: "L’administration n’est pas liée à une ordonnance de médicament",
    },
    summary: {
      en: "Medication order and administration records may require reconciliation before the encounter is finalized.",
      es: "Las órdenes de medicamento y los registros de administración pueden requerir conciliación antes de finalizar el encuentro.",
      fr: "Les ordonnances de médicament et les administrations peuvent nécessiter une conciliation avant la clôture de la rencontre.",
    },
  },
  marUnresolvedOrder: {
    title: {
      en: "Medication order and administration may need reconciliation",
      es: "La orden y la administración del medicamento pueden requerir conciliación",
      fr: "L’ordonnance et l’administration du médicament peuvent nécessiter une conciliation",
    },
    summary: {
      en: "Medication order and administration records may require reconciliation before the encounter is finalized.",
      es: "Las órdenes de medicamento y los registros de administración pueden requerir conciliación antes de finalizar el encuentro.",
      fr: "Les ordonnances de médicament et les administrations peuvent nécessiter une conciliation avant la clôture de la rencontre.",
    },
  },
  marUnresolvedNamed: {
    title: {
      en: "Medication order and administration may need reconciliation",
      es: "La orden y la administración del medicamento pueden requerir conciliación",
      fr: "L’ordonnance et l’administration du médicament peuvent nécessiter une conciliation",
    },
    summary: {
      en: "{medication} has an active order, but a matching administered MAR event was not identified. Medication order and administration records may require reconciliation before the encounter is finalized.",
      es: "{medication} tiene una orden activa, pero no se identificó un evento MAR de administración coincidente. Las órdenes y administraciones pueden requerir conciliación antes de finalizar el encuentro.",
      fr: "{medication} a une ordonnance active, mais aucun événement MAR d’administration correspondant n’a été identifié. Une conciliation peut être nécessaire avant la clôture.",
    },
  },
  marActionMismatch: {
    title: {
      en: "MAR action does not match an active medication order",
      es: "La acción MAR no coincide con una orden activa de medicamento",
      fr: "L’action MAR ne correspond pas à une ordonnance active",
    },
    summary: {
      en: "Medication order and administration records may require reconciliation before the encounter is finalized.",
      es: "Las órdenes de medicamento y los registros de administración pueden requerir conciliación antes de finalizar el encuentro.",
      fr: "Les ordonnances de médicament et les administrations peuvent nécessiter une conciliation avant la clôture de la rencontre.",
    },
  },
  duplicateMedication: {
    title: {
      en: "Duplicate active medication orders",
      es: "Órdenes activas duplicadas de medicamento",
      fr: "Ordonnances actives en double pour un médicament",
    },
    summary: {
      en: "Two active orders for {medication} are present in this encounter. Confirm whether both orders are intentional.",
      es: "Hay dos órdenes activas de {medication} en este encuentro. Confirme si ambas órdenes son intencionales.",
      fr: "Deux ordonnances actives de {medication} sont présentes dans cette rencontre. Confirmez si les deux sont intentionnelles.",
    },
  },
  tachycardiaWithoutReassessment: {
    title: {
      en: "Tachycardia without a later heart-rate reassessment",
      es: "Taquicardia sin reevaluación posterior de la frecuencia cardíaca",
      fr: "Tachycardie sans réévaluation ultérieure de la fréquence cardiaque",
    },
    summary: {
      en: "Persistent or unresolved tachycardia may require reassessment. A heart rate of {hr}/min is documented, but a subsequent heart rate or clinical reassessment was not identified.",
      es: "Una taquicardia persistente o no resuelta puede requerir reevaluación. Se documentó una frecuencia cardíaca de {hr}/min, pero no se identificó una frecuencia cardíaca o reevaluación clínica posterior.",
      fr: "Une tachycardie persistente ou non résolue peut nécessiter une réévaluation. Une fréquence cardiaque de {hr}/min est documentée, mais aucune fréquence cardiaque ni réévaluation clinique ultérieure n’a été identifiée.",
    },
  },
  hypotensionWithoutReassessment: {
    title: {
      en: "Low blood pressure without a later reassessment",
      es: "Presión arterial baja sin reevaluación posterior",
      fr: "Pression artérielle basse sans réévaluation ultérieure",
    },
    summary: {
      en: "A systolic blood pressure of {sbp} mmHg is documented, but a subsequent blood-pressure measurement was not identified. Review whether reassessment is needed.",
      es: "Se documentó una presión sistólica de {sbp} mmHg, pero no se identificó una medición posterior. Revise si se requiere reevaluación.",
      fr: "Une pression systolique de {sbp} mmHg est documentée, mais aucune mesure ultérieure n’a été identifiée. Vérifiez si une réévaluation est nécessaire.",
    },
  },
  hypoxiaWithoutReassessment: {
    title: {
      en: "Low oxygen saturation without a later reassessment",
      es: "Saturación de oxígeno baja sin reevaluación posterior",
      fr: "Saturation en oxygène basse sans réévaluation ultérieure",
    },
    summary: {
      en: "An oxygen saturation of {spo2}% is documented, but a subsequent SpO2 measurement was not identified. Review whether reassessment is needed.",
      es: "Se documentó una saturación de oxígeno de {spo2}%, pero no se identificó una medición posterior de SpO2. Revise si se requiere reevaluación.",
      fr: "Une saturation en oxygène de {spo2} % est documentée, mais aucune mesure SpO2 ultérieure n’a été identifiée. Vérifiez si une réévaluation est nécessaire.",
    },
  },
  painMedWithoutReassessment: {
    title: {
      en: "Analgesic given without a later pain reassessment",
      es: "Analgésico administrado sin reevaluación posterior del dolor",
      fr: "Analgésique administré sans réévaluation ultérieure de la douleur",
    },
    summary: {
      en: "{medication} administration is documented, but a subsequent pain reassessment was not identified.",
      es: "Está documentada la administración de {medication}, pero no se identificó una reevaluación posterior del dolor.",
      fr: "L’administration de {medication} est documentée, mais aucune réévaluation ultérieure de la douleur n’a été identifiée.",
    },
  },
  ivFluidsWithoutHrReassessment: {
    title: {
      en: "IV fluid treatment without a later heart-rate reassessment",
      es: "Líquidos IV sin reevaluación posterior de la frecuencia cardíaca",
      fr: "Remplissage IV sans réévaluation ultérieure de la fréquence cardiaque",
    },
    summary: {
      en: "IV fluid treatment is documented after tachycardia, but a subsequent heart rate or treatment-response assessment was not identified.",
      es: "Hay tratamiento con líquidos IV documentado después de taquicardia, pero no se identificó una frecuencia cardíaca o evaluación de respuesta posterior.",
      fr: "Un remplissage IV est documenté après une tachycardie, mais aucune fréquence cardiaque ni évaluation de réponse ultérieure n’a été identifiée.",
    },
  },
  clinicTransferIncomplete: {
    title: {
      en: "Emergency transfer documentation is incomplete",
      es: "La documentación del traslado a urgencias está incompleta",
      fr: "La documentation du transfert vers les urgences est incomplète",
    },
    summary: {
      en: "Transfer to the emergency department is selected, but the transfer reason is incomplete.",
      es: "Está seleccionado el traslado al servicio de urgencias, pero el motivo del traslado está incompleto.",
      fr: "Le transfert vers le service d’urgences est sélectionné, mais le motif du transfert est incomplet.",
    },
  },
  clinicTransferIncompleteDestination: {
    title: {
      en: "Emergency transfer documentation is incomplete",
      es: "La documentación del traslado a urgencias está incompleta",
      fr: "La documentation du transfert vers les urgences est incomplète",
    },
    summary: {
      en: "Transfer to the emergency department is selected, but the destination is incomplete.",
      es: "Está seleccionado el traslado al servicio de urgencias, pero el destino está incompleto.",
      fr: "Le transfert vers le service d’urgences est sélectionné, mais la destination est incomplète.",
    },
  },
  clinicTransferIncompleteTransport: {
    title: {
      en: "Emergency transfer documentation is incomplete",
      es: "La documentación del traslado a urgencias está incompleta",
      fr: "La documentation du transfert vers les urgences est incomplète",
    },
    summary: {
      en: "Transfer to the emergency department is selected, but the transport method is incomplete.",
      es: "Está seleccionado el traslado al servicio de urgencias, pero el método de transporte está incompleto.",
      fr: "Le transfert vers le service d’urgences est sélectionné, mais le mode de transport est incomplet.",
    },
  },
  transitionReassessmentMissing: {
    title: {
      en: "No reassessment entry found after treatment before transition",
      es: "No se encontró una entrada de reevaluación después del tratamiento antes de la transición",
      fr: "Aucune entrée de réévaluation trouvée après le traitement avant la transition",
    },
    summary: {
      en: "Treatment is documented and a transition of care is underway, but no later reassessment entry was found in the reassessment documentation reviewed by Medora Assist. Review the patient response to treatment and document reassessment when appropriate.",
      es: "Hay tratamiento documentado y se está realizando una transición de atención, pero Medora Assist no encontró una entrada de reevaluación posterior en la documentación de reevaluación revisada. Revise la respuesta del paciente al tratamiento y documente la reevaluación cuando corresponda.",
      fr: "Un traitement est documenté et une transition de soins est en cours, mais Medora Assist n’a trouvé aucune entrée de réévaluation ultérieure dans la documentation de réévaluation examinée. Revoyez la réponse du patient au traitement et documentez la réévaluation lorsque cela s’applique.",
    },
  },
  transitionReassessmentUntimed: {
    title: {
      en: "Reassessment time is not available before transition",
      es: "La hora de reevaluación no está disponible antes de la transición",
      fr: "L’heure de réévaluation n’est pas disponible avant la transition",
    },
    summary: {
      en: "A reassessment is documented, but its clinical time is not available to determine whether it occurred after the latest treatment.",
      es: "Hay una reevaluación documentada, pero no está disponible la hora clínica necesaria para determinar si ocurrió después del último tratamiento.",
      fr: "Une réévaluation est documentée, mais son heure clinique n’est pas disponible pour déterminer si elle a eu lieu après le dernier traitement.",
    },
  },
  transitionReassessmentPredatesTreatment: {
    title: {
      en: "Latest reassessment predates the last treatment event",
      es: "La última reevaluación es anterior al último tratamiento",
      fr: "La dernière réévaluation est antérieure au dernier traitement",
    },
    summary: {
      en: "A transition of care is underway, and the latest reassessment entry reviewed by Medora Assist occurred before the most recent treatment. Review the patient response and document a later reassessment when appropriate.",
      es: "Se está realizando una transición de atención y la entrada de reevaluación más reciente revisada por Medora Assist ocurrió antes del tratamiento más reciente. Revise la respuesta del paciente y documente una reevaluación posterior cuando corresponda.",
      fr: "Une transition de soins est en cours et l’entrée de réévaluation la plus récente examinée par Medora Assist est antérieure au traitement le plus récent. Revoyez la réponse du patient et documentez une réévaluation ultérieure lorsque cela s’applique.",
    },
  },
} as const;

export type MedoraAssistFindingKey = keyof typeof FINDING_COPY;

export function medoraAssistFindingCopy(
  key: MedoraAssistFindingKey,
  vars: Record<string, string> = {}
): { title: AiLocalizedCopy; summary: AiLocalizedCopy } {
  const entry = FINDING_COPY[key];
  return {
    title: interpolateAiLocalizedCopy(entry.title, vars),
    summary: interpolateAiLocalizedCopy(entry.summary, vars),
  };
}
