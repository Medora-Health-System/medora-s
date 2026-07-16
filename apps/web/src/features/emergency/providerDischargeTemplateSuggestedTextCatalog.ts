/**
 * Localized narrative bodies for clinician discharge templates (Phase 19Y.4A+).
 * EN strings mirror legacy registry wording; FR is clinician-facing draft education text.
 */

import {
  localizedSuggestedText,
  type ProviderDischargeTemplateSuggestedText,
} from "./providerDischargeTemplateLocale";

export const CHEST_PAIN_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for chest pain. Symptoms may evolve after an emergency visit; outpatient follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Rest as needed. Take medications only as prescribed or directed during this visit. Avoid driving or operating machinery if you take sedating medicine. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take medications only as prescribed or directed during this visit. Do not start, stop, or change medications without clinician guidance.",
      returnPrecautions:
        "Return immediately or call emergency services for returning or worsening chest pain, shortness of breath, fainting, heavy sweating, new weakness, new neurologic symptoms, or any other concerning symptoms.",
      returnWorkSchool:
        "Return to work or school when you feel able and as directed by your clinician.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une douleur thoracique. Les signes peuvent évoluer après une visite aux urgences ; un suivi ambulatoire est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Reposez-vous selon vos besoins. Prenez les médicaments uniquement selon la prescription ou les indications données pendant cette visite. Évitez de conduire ou d'utiliser des machines si vous prenez des médicaments sédatifs. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les médicaments uniquement selon la prescription ou les indications données pendant cette visite. Ne commencez pas, n'arrêtez pas et ne modifiez pas un traitement sans l'avis d'un clinicien.",
      returnPrecautions:
        "Retournez immédiatement aux urgences ou appelez les services d'urgence en cas de douleur thoracique récidivante ou aggravée, d'essoufflement, d'évanouissement, de transpiration profuse, de nouvelle faiblesse, de nouveaux signes neurologiques ou de tout autre signe préoccupant.",
      returnWorkSchool:
        "Reprenez le travail ou les cours lorsque vous vous sentez apte et selon les instructions de votre clinicien.",
    }
  );

export const ABDOMINAL_PAIN_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for abdominal pain. Some causes may evolve after you leave; outpatient follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Stay hydrated. Eat a light diet as tolerated unless your clinician advised otherwise. Rest as needed. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take pain or anti-nausea medicines only as prescribed or directed during this visit. Do not start new medications without clinician guidance.",
      returnPrecautions:
        "Return for care if pain worsens, fever develops, vomiting persists, you see blood in stool or vomit, faint, develop new abdominal swelling, cannot keep fluids down, or have other concerning symptoms.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une douleur abdominale. Certaines causes peuvent évoluer après votre départ ; un suivi ambulatoire est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Maintenez une bonne hydratation. Suivez un régime léger selon vos tolérances sauf avis contraire de votre clinicien. Reposez-vous selon vos besoins. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les antidouleur ou anti-nausée uniquement selon la prescription ou les indications données pendant cette visite. N'introduisez pas de nouveaux médicaments sans avis médical.",
      returnPrecautions:
        "Reconsultez aux urgences si la douleur s'aggrave, si de la fièvre apparaît, si les vomissements persistent, si vous voyez du sang dans les selles ou les vomissements, si vous vous évanouissez, si une nouvelle distension abdominale apparaît, si vous ne pouvez pas boire, ou en présence d'autres signes préoccupants.",
    }
  );

export const HEADACHE_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for headache. Symptoms may change after an emergency visit; outpatient follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Rest in a quiet, dark room as needed. Stay hydrated. Take medications only as prescribed or directed during this visit. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take headache or pain medicines only as prescribed or directed during this visit. Avoid medication overuse unless your clinician advised otherwise.",
      returnPrecautions:
        "Return immediately for sudden worst headache of life, weakness, numbness, confusion, trouble speaking, vision changes, fever with neck stiffness, persistent vomiting, or worsening symptoms.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des céphalées. Les signes peuvent évoluer après une visite aux urgences ; un suivi ambulatoire est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Reposez-vous dans une pièce calme et sombre si besoin. Maintenez une bonne hydratation. Prenez les médicaments uniquement selon la prescription ou les indications données pendant cette visite. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les médicaments contre la douleur ou la céphalée uniquement selon la prescription ou les indications données pendant cette visite. Évitez le surusage de médicaments sauf avis contraire de votre clinicien.",
      returnPrecautions:
        "Retournez immédiatement aux urgences en cas de céphalée soudaine la plus intense de votre vie, de faiblesse, d'engourdissement, de confusion, de difficulté à parler, de troubles de la vision, de fièvre avec raideur de la nuque, de vomissements persistants ou d'aggravation des signes.",
    }
  );

export const URI_COUGH_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for cough or upper respiratory symptoms. Many of these illnesses improve with supportive care; outpatient follow-up is recommended if symptoms persist or worsen.",
      diagnosisInstructions:
        "Rest and stay hydrated. Use over-the-counter medicines only as directed on the label or by your clinician. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take cough, fever, or pain medicines only as prescribed or directed during this visit. Finish antibiotics only if they were prescribed for you.",
      returnPrecautions:
        "Return for care if you develop shortness of breath, chest pain, persistent high fever, signs of dehydration, blue lips or confusion, inability to tolerate fluids, or worsening symptoms.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une toux ou des signes d'infection des voies respiratoires supérieures. Beaucoup de ces affections s'améliorent avec des soins de confort ; un suivi ambulatoire est recommandé si les signes persistent ou s'aggravent.",
      diagnosisInstructions:
        "Reposez-vous et maintenez une bonne hydratation. N'utilisez des médicaments en vente libre que conformément à la notice ou aux indications de votre clinicien. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les antitussifs, antipyrétiques ou antalgiques uniquement selon la prescription ou les indications données pendant cette visite. Terminez une antibiothérapie seulement si elle vous a été prescrite.",
      returnPrecautions:
        "Reconsultez aux urgences en cas d'essoufflement, de douleur thoracique, de fièvre élevée persistante, de signes de déshydratation, de lèvres bleutées ou de confusion, d'impossibilité de boire, ou d'aggravation des signes.",
    }
  );

export const UTI_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for urinary symptoms. Symptoms may persist briefly after an emergency visit; outpatient follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Drink fluids as tolerated unless your clinician restricted fluids. Take antibiotics or other medicines exactly as prescribed. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take antibiotics and urinary symptom medicines only as prescribed or directed during this visit. Do not share antibiotics or stop early unless your clinician advised you to do so.",
      returnPrecautions:
        "Return for care if you develop fever, flank or back pain, vomiting, worsening urinary symptoms, weakness or confusion, inability to tolerate antibiotics or fluids, or other concerning symptoms.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des troubles liés aux voies urinaires. Les signes peuvent persister brièvement après une visite aux urgences ; un suivi ambulatoire est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Buvez selon vos tolérances sauf restriction hydrique indiquée par votre clinicien. Suivez le traitement antibiotique ou autre exactement comme prescrit. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les antibiotiques et autres traitements liés aux mictions uniquement selon la prescription ou les indications données pendant cette visite. Ne partagez pas d'antibiotiques et n'arrêtez pas précocement sauf avis médical contraire.",
      returnPrecautions:
        "Reconsultez aux urgences en cas de fièvre, de douleur lombaire ou des flancs, de vomissements, d'aggravation des troubles urinaires, de faiblesse ou de confusion, d'intolérance aux antibiotiques ou aux liquides, ou d'autres signes préoccupants.",
    }
  );

export const WOUND_LACERATION_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "Your laceration or wound was evaluated in the emergency department. Healing requires keeping the area clean and monitoring for infection; outpatient follow-up may be needed for wound checks.",
      diagnosisInstructions:
        "Keep the wound clean and dry. Change dressings as instructed. Avoid soaking the wound unless your clinician cleared you to do so. Return precautions for infection or bleeding were reviewed.",
      medicationTreatment:
        "Take wound-related antibiotics or pain medicine only as prescribed or directed during this visit. Keep dressing supplies as instructed.",
      returnPrecautions:
        "Return for care if you develop increasing pain, spreading redness, warmth, swelling, pus or drainage, fever, bleeding that does not stop, numbness, red streaking, wound reopening, or other concerning changes.",
      returnWorkSchool:
        "Protect the wound from strain or contamination; return to activity as directed by your clinician.",
    },
    {
      description:
        "Votre lacération ou plaie a été évaluée aux urgences. La guérison nécessite de garder la zone propre et de surveiller une infection ; un suivi ambulatoire peut être nécessaire pour le contrôle de la plaie.",
      diagnosisInstructions:
        "Gardez la plaie propre et sèche. Changez les pansements selon les instructions. Évitez de faire tremper la plaie sauf autorisation de votre clinicien. Les consignes de retour en cas d'infection ou de saignement ont été revues.",
      medicationTreatment:
        "Prenez les antibiotiques ou antalgiques indiqués pour la plaie uniquement selon la prescription ou les indications données pendant cette visite. Conservez le matériel de pansement comme indiqué.",
      returnPrecautions:
        "Reconsultez aux urgences en cas de douleur croissante, de rougeur qui s'étend, de chaleur, de tuméfaction, de pus ou d'écoulement, de fièvre, de saignement qui ne s'arrête pas, d'engourdissement, de traînées rouges, de réouverture de la plaie ou d'autres changements préoccupants.",
      returnWorkSchool:
        "Protégez la plaie contre l'effort et la contamination ; reprenez l'activité selon les instructions de votre clinicien.",
    }
  );

export const ANIMAL_BITE_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "Your animal bite wound was evaluated in the emergency department. Bite wounds can become infected quickly; careful wound care and timely follow-up are important.",
      diagnosisInstructions:
        "Keep the wound clean and dry. Change dressings as instructed. Complete wound care exactly as directed. If antibiotics were prescribed, take every dose as scheduled. Follow tetanus or rabies instructions if given. Contact animal control or continue animal observation as directed for rabies risk. Follow up in 24–48 hours for high-risk wounds or sooner if advised.",
      medicationTreatment:
        "Take antibiotics, pain medicine, tetanus, or rabies-related treatments only as prescribed or directed during this visit. Do not start new medications without clinician guidance. Do not stop antibiotics early unless your clinician tells you to.",
      returnPrecautions:
        "Return immediately for worsening pain, swelling, redness, pus, fever, red streaking, numbness, weakness, decreased movement, spreading warmth, wound reopening, or any concern for rabies exposure. Also return if the animal becomes ill, dies, or cannot be observed as planned. Return to the emergency department immediately if symptoms worsen, new concerning symptoms develop, or you feel unsafe at home.",
      returnWorkSchool:
        "Protect the bite wound from strain or contamination; return to work or school as directed by your clinician.",
    },
    {
      description:
        "Votre plaie par morsure animale a été évaluée aux urgences. Les morsures peuvent s'infecter rapidement ; des soins de plaie rigoureux et un suivi rapide sont importants.",
      diagnosisInstructions:
        "Gardez la plaie propre et sèche. Changez les pansements selon les instructions. Suivez exactement les soins de plaie indiqués. Si des antibiotiques ont été prescrits, prenez chaque dose comme prévu. Suivez les consignes antitétaniques ou antirabiques si elles ont été données. Contactez le contrôle animalier ou poursuivez l'observation de l'animal selon les instructions pour le risque de rage. Prévoyez un suivi dans les 24 à 48 heures pour les plaies à haut risque, ou plus tôt si indiqué.",
      medicationTreatment:
        "Prenez les antibiotiques, antalgiques, traitements antitétaniques ou antirabiques uniquement selon la prescription ou les indications données pendant cette visite. N'introduisez pas de nouveaux médicaments sans avis médical. N'arrêtez pas les antibiotiques précocement sauf avis médical contraire.",
      returnPrecautions:
        "Reconsultez immédiatement en cas de douleur croissante, tuméfaction, rougeur, pus, fièvre, traînées rouges, engourdissement, faiblesse, diminution des mouvements, chaleur qui s'étend, réouverture de la plaie, ou toute préoccupation d'exposition à la rage. Reconsultez aussi si l'animal tombe malade, meurt, ou ne peut pas être observé comme prévu. Retournez aux urgences immédiatement si les symptômes s'aggravent, si de nouveaux signes inquiétants apparaissent ou si vous ne vous sentez pas en sécurité à domicile.",
      returnWorkSchool:
        "Protégez la plaie de morsure contre l'effort et la contamination ; reprenez le travail ou l'école selon les instructions de votre clinicien.",
    }
  );

function humanBiteHighRiskWoundSuggestedText(
  descriptionEn: string,
  instructionsEn: string,
  descriptionFr: string,
  instructionsFr: string,
): ProviderDischargeTemplateSuggestedText {
  return localizedSuggestedText(
    {
      description: descriptionEn,
      diagnosisInstructions: `${instructionsEn} Keep the wound clean and dry. Change dressings as instructed. Complete antibiotics if prescribed. Update tetanus immunization if directed. Arrange hand or orthopedic follow-up when advised.`,
      medicationTreatment: "Take antibiotics, pain medicine, and tetanus-related treatments only as prescribed or directed during this visit. Do not stop antibiotics early unless your clinician tells you to.",
      returnPrecautions: "Return immediately for fever, spreading redness, red streaking, pus or drainage, increasing pain or swelling, numbness, weakness, decreased finger or hand motion, or wound reopening.",
      returnWorkSchool: "Protect the wound from strain or contamination; return to work or school as directed by your clinician.",
    },
    {
      description: descriptionFr,
      diagnosisInstructions: `${instructionsFr} Gardez la plaie propre et sèche. Changez les pansements selon les instructions. Terminez les antibiotiques s'ils ont été prescrits. Mettez à jour la vaccination antitétanique si indiqué. Organisez un suivi de la main ou en orthopédie lorsque conseillé.`,
      medicationTreatment: "Prenez les antibiotiques, antalgiques et traitements antitétaniques uniquement selon la prescription ou les indications de cette visite. N'arrêtez pas les antibiotiques précocement sauf avis contraire.",
      returnPrecautions: "Reconsultez immédiatement en cas de fièvre, rougeur qui s'étend, traînées rouges, pus ou écoulement, douleur ou gonflement croissants, engourdissement, faiblesse, diminution des mouvements de la main ou des doigts, ou réouverture de la plaie.",
      returnWorkSchool: "Protégez la plaie contre l'effort et la contamination ; reprenez le travail ou l'école selon les instructions de votre clinicien.",
    },
  );
}

export const HUMAN_BITE_SUGGESTED_TEXT = humanBiteHighRiskWoundSuggestedText(
  "Your human bite wound was evaluated in the emergency department. These wounds can become infected quickly and may involve deep hand structures.",
  "Follow infection precautions and wound care exactly as directed.",
  "Votre plaie par morsure humaine a été évaluée aux urgences. Ces plaies peuvent s'infecter rapidement et atteindre des structures profondes de la main.",
  "Suivez exactement les précautions d'infection et les soins de plaie indiqués.",
);
export const FIGHT_BITE_SUGGESTED_TEXT = localizedSuggestedText(
  {
    description:
      "Your fight-bite or clenched-fist wound was evaluated in the emergency department. These injuries can involve joints or tendons even when the skin wound looks small.",
    diagnosisInstructions:
      "Protect the hand, elevate as directed, and keep all hand-surgery or orthopedic follow-up. Complete antibiotics if prescribed. Update tetanus immunization if directed.",
    medicationTreatment:
      "Take antibiotics, pain medicine, and tetanus-related treatments only as prescribed or directed during this visit. Do not stop antibiotics early unless your clinician tells you to.",
    returnPrecautions:
      "Return immediately for increasing hand swelling, spreading redness, pus, fever, increasing knuckle or MCP pain, inability to move a finger, pain with finger extension, numbness, color change, or worsening weakness.",
    returnWorkSchool:
      "Protect the hand from strain or contamination; return to work or school as directed by your clinician.",
  },
  {
    description:
      "Votre morsure du poing a été évaluée aux urgences. Ces blessures peuvent atteindre une articulation ou un tendon même si la plaie cutanée paraît petite.",
    diagnosisInstructions:
      "Protégez la main, élévez-la selon les consignes, et respectez le suivi de chirurgie de la main ou d'orthopédie. Terminez les antibiotiques s'ils ont été prescrits. Mettez à jour la vaccination antitétanique si indiqué.",
    medicationTreatment:
      "Prenez les antibiotiques, antalgiques et traitements antitétaniques uniquement selon la prescription ou les indications de cette visite. N'arrêtez pas les antibiotiques précocement sauf avis contraire.",
    returnPrecautions:
      "Reconsultez immédiatement en cas de gonflement croissant de la main, rougeur qui s'étend, pus, fièvre, douleur croissante de l'articulation métacarpophalangienne, impossibilité de bouger un doigt, douleur à l'extension du doigt, engourdissement, changement de couleur ou faiblesse croissante.",
    returnWorkSchool:
      "Protégez la main contre l'effort et la contamination ; reprenez le travail ou l'école selon les instructions de votre clinicien.",
  },
);

export const ANIMAL_BITE_RABIES_FOLLOWUP_SUGGESTED_TEXT = localizedSuggestedText(
  {
    description:
      "You were given specific follow-up instructions related to animal bite rabies risk assessment.",
    diagnosisInstructions:
      "Continue animal observation or testing as directed. Keep all public-health or animal-control appointments. Complete any rabies-related treatments only if they were ordered for you.",
    medicationTreatment:
      "Take rabies vaccine, rabies immunoglobulin, or other medicines only if prescribed or administered during this visit. Do not start rabies treatment on your own.",
    returnPrecautions:
      "Return immediately if the animal becomes ill, dies, escapes observation, or if you develop fever, headache, confusion, unusual tingling near the wound, or other concerning symptoms.",
    returnWorkSchool:
      "Follow clinician and public-health guidance before returning to high-risk activities.",
  },
  {
    description:
      "Des consignes spécifiques de suivi liées à l'évaluation du risque de rage après morsure animale vous ont été données.",
    diagnosisInstructions:
      "Poursuivez l'observation ou les tests de l'animal selon les consignes. Respectez tous les rendez-vous de santé publique ou de contrôle animalier. Ne suivez un traitement antirabique que s'il a été prescrit.",
    medicationTreatment:
      "Prenez le vaccin antirabique, l'immunoglobuline antirabique ou d'autres médicaments uniquement s'ils ont été prescrits ou administrés pendant cette visite. N'entreprenez pas un traitement antirabique de votre propre initiative.",
    returnPrecautions:
      "Reconsultez immédiatement si l'animal tombe malade, meurt, échappe à l'observation, ou si vous présentez fièvre, céphalées, confusion, fourmillements inhabituels près de la plaie ou d'autres signes inquiétants.",
    returnWorkSchool:
      "Suivez les consignes du clinicien et de la santé publique avant de reprendre des activités à risque.",
  },
);

export const INFECTED_TRAUMATIC_WOUND_SUGGESTED_TEXT = humanBiteHighRiskWoundSuggestedText(
  "You were evaluated for an infected traumatic wound.",
  "Continue wound care and infection monitoring exactly as directed.",
  "Vous avez été pris en charge pour une plaie traumatique infectée.",
  "Poursuivez exactement les soins de plaie et la surveillance d'infection indiqués.",
);

export const BITE_CELLULITIS_SUGGESTED_TEXT = humanBiteHighRiskWoundSuggestedText(
  "You were evaluated for cellulitis associated with a bite or contaminated wound.",
  "Complete antibiotics if prescribed and recheck promptly if infection worsens.",
  "Vous avez été pris en charge pour une cellulite associée à une morsure ou une plaie contaminée.",
  "Terminez les antibiotiques s'ils ont été prescrits et reconsultez rapidement si l'infection s'aggrave.",
);

export const POST_BITE_ABSCESS_DRAINAGE_SUGGESTED_TEXT = humanBiteHighRiskWoundSuggestedText(
  "You were evaluated after drainage of an abscess related to a bite or contaminated wound.",
  "Keep wound packing or dressing care exactly as directed and arrange wound check as advised.",
  "Vous avez été pris en charge après drainage d'un abcès lié à une morsure ou une plaie contaminée.",
  "Respectez exactement les soins de pansement ou de mèche et organisez le contrôle de plaie conseillé.",
);

export const TETANUS_FOLLOWUP_SUGGESTED_TEXT = localizedSuggestedText(
  {
    description:
      "Tetanus immunization status was reviewed during this emergency visit.",
    diagnosisInstructions:
      "Follow any tetanus vaccine or immunoglobulin plan that was ordered for you. Keep immunization records updated.",
    medicationTreatment:
      "Receive tetanus vaccine or immunoglobulin only as ordered. Do not self-administer tetanus treatments.",
    returnPrecautions:
      "Return for severe local reaction, difficulty breathing, hives, muscle stiffness, spasms, fever, or other concerning symptoms after immunization.",
    returnWorkSchool:
      "Resume usual activity as directed after immunization unless your clinician advises otherwise.",
  },
  {
    description:
      "Le statut de vaccination antitétanique a été revu pendant cette visite aux urgences.",
    diagnosisInstructions:
      "Suivez tout plan de vaccin antitétanique ou d'immunoglobuline qui vous a été prescrit. Tenez à jour vos documents de vaccination.",
    medicationTreatment:
      "Recevez le vaccin antitétanique ou l'immunoglobuline uniquement selon la prescription. N'administrez pas vous-même de traitement antitétanique.",
    returnPrecautions:
      "Reconsultez en cas de réaction locale sévère, difficulté respiratoire, urticaire, raideur musculaire, spasmes, fièvre ou autres signes inquiétants après vaccination.",
    returnWorkSchool:
      "Reprenez vos activités habituelles selon les consignes après vaccination, sauf avis contraire.",
  },
);
export const HIGH_RISK_HAND_WOUND_SUGGESTED_TEXT = humanBiteHighRiskWoundSuggestedText(
  "You were evaluated for a high-risk hand wound.",
  "Keep hand elevation and wound care as directed and arrange specialty follow-up when advised.",
  "Vous avez été pris en charge pour une plaie à haut risque de la main.",
  "Maintenez l'élévation de la main et les soins de plaie indiqués, et organisez un suivi spécialisé lorsque conseillé.",
);
export const CONTAMINATED_WOUND_SUGGESTED_TEXT = humanBiteHighRiskWoundSuggestedText(
  "You were evaluated for a contaminated traumatic wound.",
  "Continue wound cleansing and infection monitoring as directed.",
  "Vous avez été pris en charge pour une plaie traumatique contaminée.",
  "Poursuivez le nettoyage de la plaie et la surveillance d'infection selon les consignes.",
);
export const WATER_EXPOSED_WOUND_SUGGESTED_TEXT = humanBiteHighRiskWoundSuggestedText(
  "You were evaluated for a water-exposed wound.",
  "Keep the wound clean and dry after discharge and watch closely for infection.",
  "Vous avez été pris en charge pour une plaie exposée à l'eau.",
  "Gardez la plaie propre et sèche après le départ et surveillez étroitement une infection.",
);
export const DELAYED_WOUND_SUGGESTED_TEXT = humanBiteHighRiskWoundSuggestedText(
  "You were evaluated for a delayed wound presentation.",
  "Because presentation was delayed, infection monitoring and early follow-up are especially important.",
  "Vous avez été pris en charge pour une plaie présentée de façon retardée.",
  "Parce que la présentation était retardée, la surveillance d'infection et un suivi précoce sont particulièrement importants.",
);
export const DEEP_CONTAMINATED_WOUND_SUGGESTED_TEXT = humanBiteHighRiskWoundSuggestedText(
  "You were evaluated for a deep or heavily contaminated wound with infection risk.",
  "Follow wound care, infection precautions, antibiotics, and specialty follow-up exactly as directed.",
  "Vous avez été pris en charge pour une plaie profonde ou fortement contaminée avec risque d'infection.",
  "Suivez exactement les soins de plaie, les précautions d'infection, les antibiotiques et le suivi spécialisé indiqués.",
  );

export const NAUSEA_VOMITING_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for nausea or vomiting. Symptoms may evolve after an emergency visit; outpatient follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Start with small sips of clear fluids as tolerated. Advance diet slowly as directed. Rest as needed. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take anti-nausea or other medicines only as prescribed or directed during this visit. Do not start new medications without clinician guidance.",
      returnPrecautions:
        "Return for care if vomiting persists, you cannot keep fluids down, you see blood in vomit, develop severe or worsening abdominal pain, fever, signs of dehydration, weakness, fainting, or other concerning symptoms.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des nausées ou des vomissements. Les signes peuvent évoluer après une visite aux urgences ; un suivi ambulatoire est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Commencez par de petites gorgées de liquides clairs selon vos tolérances. Réintroduisez l'alimentation lentement selon les consignes. Reposez-vous selon vos besoins. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les anti-nausée ou autres médicaments uniquement selon la prescription ou les indications données pendant cette visite. N'introduisez pas de nouveaux médicaments sans avis médical.",
      returnPrecautions:
        "Reconsultez aux urgences si les vomissements persistent, si vous ne pouvez pas boire, si vous voyez du sang dans les vomissements, en cas de douleur abdominale sévère ou aggravée, de fièvre, de signes de déshydratation, de faiblesse, d'évanouissement ou d'autres signes préoccupants.",
    }
  );

export const GASTROENTERITIS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for diarrhea or gastroenteritis. Symptoms may persist briefly after an emergency visit; outpatient follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Stay hydrated with oral rehydration fluids or clear liquids as tolerated. Wash hands frequently to reduce spread. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take anti-diarrheal, anti-nausea, or antibiotic medicines only as prescribed or directed during this visit.",
      returnPrecautions:
        "Return for care if you develop bloody stool, severe abdominal pain, persistent fever, dehydration, inability to keep fluids down, worsening weakness, or other concerning symptoms.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une diarrhée ou une gastro-entérite. Les signes peuvent persister brièvement après une visite aux urgences ; un suivi ambulatoire est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Maintenez une bonne hydratation avec des solutions de réhydratation orale ou des liquides clairs selon vos tolérances. Lavez-vous les mains souvent pour limiter la transmission. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les antidiarrhéiques, anti-nausée ou antibiotiques uniquement selon la prescription ou les indications données pendant cette visite.",
      returnPrecautions:
        "Reconsultez aux urgences en cas de selles sanglantes, de douleur abdominale sévère, de fièvre persistante, de déshydratation, d'impossibilité de boire, d'aggravation de la faiblesse ou d'autres signes préoccupants.",
    }
  );

export const BACK_PAIN_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for back pain. Symptoms may evolve after an emergency visit; outpatient follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Avoid heavy lifting or twisting unless your clinician advised otherwise. Use heat or ice as directed. Return to activity gradually. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take pain or muscle-relaxant medicines only as prescribed or directed during this visit. Avoid sedating medicines before driving unless cleared by your clinician.",
      returnPrecautions:
        "Return immediately for new leg weakness, numbness in the groin or saddle area, bowel or bladder dysfunction, fever, rapidly worsening pain, inability to walk, or other concerning neurologic symptoms.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une douleur du dos. Les signes peuvent évoluer après une visite aux urgences ; un suivi ambulatoire est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Évitez les efforts lourds ou les torsions sauf avis contraire de votre clinicien. Utilisez la chaleur ou le froid selon les consignes. Reprenez l'activité progressivement. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les antalgiques ou myorelaxants uniquement selon la prescription ou les indications données pendant cette visite. Évitez les médicaments sédatifs avant de conduire sauf accord de votre clinicien.",
      returnPrecautions:
        "Retournez immédiatement aux urgences en cas de nouvelle faiblesse des jambes, d'engourdissement de l'entrejambe ou de la région en selle, de troubles intestinal ou urinaire, de fièvre, de douleur qui s'aggrave rapidement, d'impossibilité de marcher ou d'autres signes neurologiques préoccupants.",
    }
  );

export const DENTAL_PAIN_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for dental or tooth pain. Definitive dental care is usually needed on an outpatient basis; follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Maintain oral hygiene as tolerated. Avoid chewing on the affected side if advised. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take pain or antibiotic medicines only as prescribed or directed during this visit. Do not share antibiotics or stop early unless your clinician advised you to do so.",
      returnPrecautions:
        "Return for care if you develop facial swelling, trouble swallowing, trouble breathing, fever, worsening pain, or spreading redness or swelling.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une douleur dentaire. Les soins dentaires définitifs se font généralement en consultation externe ; un suivi ambulatoire est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Maintenez une hygiène bucco-dentaire selon vos tolérances. Évitez de mastiquer du côté touché si cela est conseillé. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les antalgiques ou antibiotiques uniquement selon la prescription ou les indications données pendant cette visite. Ne partagez pas d'antibiotiques et n'arrêtez pas précocement sauf avis médical contraire.",
      returnPrecautions:
        "Reconsultez aux urgences en cas de gonflement du visage, de difficulté à avaler, de difficulté à respirer, de fièvre, d'aggravation de la douleur ou d'extension de la rougeur ou du gonflement.",
    }
  );

export const OTITIS_PHARYNGITIS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for ear pain or sore throat. Symptoms may persist briefly after an emergency visit; outpatient follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Rest and stay hydrated. Use comfort measures as directed. Finish antibiotics only if they were prescribed for you. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take pain, fever, or antibiotic medicines only as prescribed or directed during this visit.",
      returnPrecautions:
        "Return for care if you develop trouble breathing or swallowing, neck swelling, drooling, persistent fever, worsening pain, dehydration, or other concerning symptoms.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une otalgie ou un mal de gorge. Les signes peuvent persister brièvement après une visite aux urgences ; un suivi ambulatoire est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Reposez-vous et maintenez une bonne hydratation. Utilisez les mesures de confort indiquées. Terminez une antibiothérapie seulement si elle vous a été prescrite. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les antipyrétiques, antalgiques ou antibiotiques uniquement selon la prescription ou les indications données pendant cette visite.",
      returnPrecautions:
        "Reconsultez aux urgences en cas de difficulté à respirer ou à avaler, de gonflement du cou, d'hypersalivation, de fièvre persistante, d'aggravation de la douleur, de déshydratation ou d'autres signes préoccupants.",
    }
  );

export const HYPERTENSION_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for elevated blood pressure or hypertension. Blood pressure can vary; ongoing outpatient follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Take blood pressure medicines only as prescribed or directed. Limit salt if your clinician advised you to do so. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take blood pressure or related medicines only as prescribed or directed during this visit. Do not stop or change blood pressure medicines without clinician guidance.",
      returnPrecautions:
        "Return immediately for chest pain, shortness of breath, severe headache, neurologic symptoms, vision changes, confusion, weakness, or other concerning symptoms.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une pression artérielle élevée ou une hypertension. La tension peut varier ; un suivi ambulatoire régulier est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Prenez les traitements antihypertenseurs uniquement selon la prescription ou les indications données. Limitez le sel si votre clinicien vous l'a recommandé. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les antihypertenseurs ou traitements apparentés uniquement selon la prescription ou les indications données pendant cette visite. N'arrêtez pas et ne modifiez pas votre traitement antihypertenseur sans avis médical.",
      returnPrecautions:
        "Retournez immédiatement aux urgences en cas de douleur thoracique, d'essoufflement, de céphalée sévère, de signes neurologiques, de troubles de la vision, de confusion, de faiblesse ou d'autres signes préoccupants.",
    }
  );

export const CELLULITIS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a skin infection or cellulitis. Outpatient follow-up is recommended to monitor response to treatment when clinically appropriate.",
      diagnosisInstructions:
        "Keep the affected area clean and elevated as directed. Mark the edge of redness if your clinician advised you to do so. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take antibiotics and pain medicines only as prescribed or directed during this visit. Finish antibiotics unless your clinician told you otherwise.",
      returnPrecautions:
        "Return for care if redness spreads, fever develops, pain or swelling increases, pus or drainage appears, red streaking occurs, you cannot tolerate medications, or symptoms worsen.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une infection cutanée ou une cellulite. Un suivi ambulatoire est recommandé pour surveiller la réponse au traitement lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Gardez la zone touchée propre et surélevée selon les consignes. Tracez la limite de la rougeur si votre clinicien vous l'a demandé. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les antibiotiques et antalgiques uniquement selon la prescription ou les indications données pendant cette visite. Terminez l'antibiothérapie sauf indication contraire de votre clinicien.",
      returnPrecautions:
        "Reconsultez aux urgences si la rougeur s'étend, si de la fièvre apparaît, si la douleur ou le gonflement augmentent, en cas d'écoulement ou de pus, de traînées rouges, d'intolérance aux médicaments ou d'aggravation des signes.",
    }
  );

export const DEHYDRATION_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for dehydration. Fluid balance may take time to restore; outpatient follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Drink fluids as tolerated unless your clinician restricted fluids. Use oral rehydration solutions if directed. Rest as needed. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take medicines only as prescribed or directed during this visit. Continue fluids as instructed.",
      returnPrecautions:
        "Return for care if you cannot keep fluids down, faint, become confused, have decreased urination, develop worsening weakness, persistent fever, worsening vomiting or diarrhea, or other concerning symptoms.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une déshydratation. Le rétablissement de l'équilibre hydrique peut prendre du temps ; un suivi ambulatoire est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Buvez selon vos tolérances sauf restriction hydrique indiquée par votre clinicien. Utilisez des solutions de réhydratation orale si c'est indiqué. Reposez-vous selon vos besoins. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les médicaments uniquement selon la prescription ou les indications données pendant cette visite. Continuez les liquides selon les instructions.",
      returnPrecautions:
        "Reconsultez aux urgences si vous ne pouvez pas boire, si vous vous évanouissez, si vous êtes désorienté, si la diurèse diminue, si la faiblesse s'aggrave, si la fièvre persiste, si les vomissements ou la diarrhée s'aggravent, ou en présence d'autres signes préoccupants.",
    }
  );

export const ASTHMA_EXACERBATION_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for an asthma exacerbation. Breathing symptoms may change after an emergency visit; outpatient follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Use your rescue inhaler only as prescribed or directed. Avoid known triggers when possible. Rest as needed. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take asthma medicines, including rescue and controller medicines, only as prescribed or directed during this visit. Do not stop or change asthma medicines without clinician guidance.",
      returnPrecautions:
        "Return immediately for worsening shortness of breath, chest tightness, persistent wheezing, blue lips, trouble speaking, fever, or needing rescue medication more often than directed.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une exacerbation d'asthme. Les signes respiratoires peuvent évoluer après une visite aux urgences ; un suivi ambulatoire est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Utilisez votre bronchodilatateur de secours uniquement selon la prescription ou les indications reçues. Évitez les déclencheurs connus lorsque c'est possible. Reposez-vous selon vos besoins. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les traitements de l'asthme, y compris les médicaments de secours et de fond, uniquement selon la prescription ou les indications données pendant cette visite. N'arrêtez ni ne modifiez un traitement sans avis médical.",
      returnPrecautions:
        "Reconsultez immédiatement aux urgences en cas d'essoufflement aggravé, d'oppression thoracique, de sifflements persistants, de lèvres bleues, de difficulté à parler, de fièvre, ou si vous avez besoin du traitement de secours plus souvent que prescrit.",
    }
  );

export const COPD_EXACERBATION_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a COPD exacerbation. Breathing symptoms may persist briefly after an emergency visit; outpatient follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Use inhalers and oxygen only as prescribed or directed. Rest and pace activity as tolerated. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take COPD medicines, including inhalers and antibiotics if prescribed, only as directed during this visit. Finish antibiotics unless your clinician told you otherwise.",
      returnPrecautions:
        "Return for care if shortness of breath worsens, chest pain develops, fever occurs, confusion appears, lips turn blue, sputum increases, or you cannot tolerate medications.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une exacerbation de BPCO. Les signes respiratoires peuvent persister brièvement après une visite aux urgences ; un suivi ambulatoire est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Utilisez les inhalateurs et l'oxygène uniquement selon la prescription ou les indications reçues. Reposez-vous et adaptez votre activité selon vos tolérances. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les traitements de la BPCO, y compris les inhalateurs et les antibiotiques s'ils ont été prescrits, uniquement selon les indications données pendant cette visite. Terminez les antibiotiques sauf avis contraire de votre clinicien.",
      returnPrecautions:
        "Reconsultez aux urgences si l'essoufflement s'aggrave, si une douleur thoracique apparaît, si de la fièvre survient, si vous êtes confus, si vos lèvres deviennent bleues, si les expectorations augmentent, ou si vous ne tolérez pas les médicaments.",
    }
  );

export const BRONCHITIS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for bronchitis. Symptoms may persist for days after an emergency visit; outpatient follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Rest, stay hydrated, and use comfort measures as directed. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take cough, fever, or antibiotic medicines only as prescribed or directed during this visit. Finish antibiotics only if they were prescribed for you.",
      returnPrecautions:
        "Return for care if you develop shortness of breath, chest pain, persistent fever, coughing blood, worsening symptoms, or dehydration.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une bronchite. Les signes peuvent persister plusieurs jours après une visite aux urgences ; un suivi ambulatoire est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Reposez-vous, maintenez une bonne hydratation et suivez les mesures de confort indiquées. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les antitussifs, antipyrétiques ou antibiotiques uniquement selon la prescription ou les indications données pendant cette visite. Terminez les antibiotiques seulement s'ils vous ont été prescrits.",
      returnPrecautions:
        "Reconsultez aux urgences en cas d'essoufflement, de douleur thoracique, de fièvre persistante, de toux avec sang, d'aggravation des signes ou de déshydratation.",
    }
  );

export const PNEUMONIA_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for pneumonia. Recovery may take time after an emergency visit; outpatient follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Rest and stay hydrated. Take medicines exactly as prescribed. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take antibiotics and other medicines only as prescribed or directed during this visit. Finish antibiotics unless your clinician told you otherwise.",
      returnPrecautions:
        "Return for care if shortness of breath worsens, chest pain develops, fever persists, confusion appears, weakness increases, or you cannot tolerate fluids or medications.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une pneumonie. La récupération peut prendre du temps après une visite aux urgences ; un suivi ambulatoire est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Reposez-vous et maintenez une bonne hydratation. Prenez les médicaments exactement comme prescrit. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les antibiotiques et autres médicaments uniquement selon la prescription ou les indications données pendant cette visite. Terminez les antibiotiques sauf avis contraire de votre clinicien.",
      returnPrecautions:
        "Reconsultez aux urgences si l'essoufflement s'aggrave, si une douleur thoracique apparaît, si la fièvre persiste, si vous êtes confus, si la faiblesse augmente, ou si vous ne tolérez pas les liquides ou les médicaments.",
    }
  );

export const SYNCOPE_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department after fainting or syncope. Further outpatient evaluation may be needed when clinically appropriate.",
      diagnosisInstructions:
        "Rest and hydrate as tolerated. Avoid driving or operating machinery until cleared by your clinician if advised. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take medicines only as prescribed or directed during this visit. Report new medicines that may affect blood pressure or heart rhythm to your clinician.",
      returnPrecautions:
        "Return immediately for recurrent fainting, chest pain, shortness of breath, palpitations, neurologic symptoms, or injury from a fall.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences après un malaise ou un épisode syncopal. Une évaluation ambulatoire complémentaire peut être nécessaire lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Reposez-vous et hydratez-vous selon vos tolérances. Évitez de conduire ou d'utiliser des machines tant que votre clinicien ne vous a pas autorisé, si cela vous a été conseillé. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les médicaments uniquement selon la prescription ou les indications données pendant cette visite. Signalez tout nouveau traitement pouvant affecter la tension ou le rythme cardiaque à votre clinicien.",
      returnPrecautions:
        "Reconsultez immédiatement aux urgences en cas de malaise récidivant, de douleur thoracique, d'essoufflement, de palpitations, de signes neurologiques ou de blessure liée à une chute.",
    }
  );

export const VERTIGO_DIZZINESS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for dizziness or vertigo. Symptoms may fluctuate after an emergency visit; outpatient follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Move slowly when changing position. Rest as needed and stay hydrated. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take dizziness or anti-nausea medicines only as prescribed or directed during this visit. Avoid sedating medicines before driving unless cleared by your clinician.",
      returnPrecautions:
        "Return immediately for new weakness, trouble speaking, severe headache, chest pain, fainting, persistent vomiting, or worsening dizziness.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des vertiges ou des étourdissements. Les signes peuvent fluctuer après une visite aux urgences ; un suivi ambulatoire est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Levez-vous et changez de position lentement. Reposez-vous selon vos besoins et maintenez une bonne hydratation. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les médicaments contre les vertiges ou les nausées uniquement selon la prescription ou les indications données pendant cette visite. Évitez les médicaments sédatifs avant de conduire sauf avis contraire de votre clinicien.",
      returnPrecautions:
        "Reconsultez immédiatement aux urgences en cas de nouvelle faiblesse, de trouble de la parole, de céphalée intense, de douleur thoracique, d'évanouissement, de vomissements persistants ou d'aggravation des vertiges.",
    }
  );

export const KIDNEY_STONE_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for kidney stone symptoms or flank pain. Outpatient follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Drink fluids as tolerated unless your clinician restricted fluids. Strain urine if your clinician advised you to do so. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take pain medicines and other treatments only as prescribed or directed during this visit. Do not start new medicines without clinician guidance.",
      returnPrecautions:
        "Return for care if fever develops, pain is uncontrolled, vomiting persists, you cannot urinate, flank pain worsens, or weakness or confusion appears.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des signes évocateurs de calcul rénal ou une douleur lombaire/flanc. Un suivi ambulatoire est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Buvez selon vos tolérances sauf restriction indiquée par votre clinicien. Filtrez les urines si votre clinicien vous l'a conseillé. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les antidouleurs et autres traitements uniquement selon la prescription ou les indications données pendant cette visite. N'introduisez pas de nouveaux médicaments sans avis médical.",
      returnPrecautions:
        "Reconsultez aux urgences en cas de fièvre, de douleur non contrôlée, de vomissements persistants, d'impossibilité d'uriner, d'aggravation de la douleur du flanc, ou de faiblesse ou confusion.",
    }
  );

export const CONSTIPATION_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for constipation. Symptoms may take time to improve; outpatient follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Increase fluids and fiber as tolerated unless your clinician advised otherwise. Stay active as directed. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take laxatives or other bowel medicines only as prescribed or directed during this visit.",
      returnPrecautions:
        "Return for care if you develop severe or worsening abdominal pain, vomiting, abdominal swelling, fever, blood in stool, or inability to pass stool or gas.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une constipation. Les signes peuvent mettre du temps à s'améliorer ; un suivi ambulatoire est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Augmentez les liquides et les fibres selon vos tolérances sauf avis contraire de votre clinicien. Restez actif selon les indications reçues. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les laxatifs ou autres médicaments intestinaux uniquement selon la prescription ou les indications données pendant cette visite.",
      returnPrecautions:
        "Reconsultez aux urgences en cas de douleur abdominale intense ou aggravée, de vomissements, de distension abdominale, de fièvre, de sang dans les selles, ou d'impossibilité d'évacuer selles ou gaz.",
    }
  );

export const ALLERGIC_REACTION_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for an allergic reaction without anaphylaxis. Outpatient follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Avoid known triggers when possible. Monitor the rash or hives as directed. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take antihistamines, steroids, or other allergy medicines only as prescribed or directed during this visit.",
      returnPrecautions:
        "Return immediately for trouble breathing, swelling of the throat, tongue, or lips, fainting, vomiting, worsening rash, or symptoms returning after medication wears off.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une réaction allergique sans anaphylaxie. Un suivi ambulatoire est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Évitez les déclencheurs connus lorsque c'est possible. Surveillez l'éruption ou les urticaires selon les indications reçues. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les antihistaminiques, corticoïdes ou autres médicaments contre l'allergie uniquement selon la prescription ou les indications données pendant cette visite.",
      returnPrecautions:
        "Reconsultez immédiatement aux urgences en cas de difficulté respiratoire, de gonflement de la gorge, de la langue ou des lèvres, d'évanouissement, de vomissements, d'aggravation de l'éruption, ou si les signes reviennent après la fin de l'effet du médicament.",
    }
  );

export const MINOR_HEAD_INJURY_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a minor head injury or concussion. Recovery may take days to weeks; outpatient follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Rest as directed. Avoid sports, heavy activity, and driving until cleared by your clinician if advised. Have a responsible adult monitor you as directed. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take pain medicines only as prescribed or directed during this visit. Avoid sedating medicines before driving unless cleared by your clinician.",
      returnPrecautions:
        "Return immediately for worsening headache, repeated vomiting, confusion, seizure, weakness or numbness, trouble waking, behavior change, or vision changes.",
      returnWorkSchool:
        "Return to work, school, or sports only as directed by your clinician.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour un traumatisme crânien mineur ou une commotion. La récupération peut prendre plusieurs jours à semaines ; un suivi ambulatoire est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Reposez-vous selon les indications reçues. Évitez le sport, les efforts importants et la conduite tant que votre clinicien ne vous a pas autorisé, si cela vous a été conseillé. Faites-vous surveiller par un adulte responsable selon les indications. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les antidouleurs uniquement selon la prescription ou les indications données pendant cette visite. Évitez les médicaments sédatifs avant de conduire sauf avis contraire de votre clinicien.",
      returnPrecautions:
        "Reconsultez immédiatement aux urgences en cas de céphalée aggravée, de vomissements répétés, de confusion, de convulsion, de faiblesse ou engourdissement, de difficulté à se réveiller, de changement de comportement ou de trouble visuel.",
      returnWorkSchool:
        "Reprenez le travail, les cours ou le sport uniquement selon les instructions de votre clinicien.",
    }
  );

export const TIA_STROKE_LIKE_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for TIA or stroke-like symptoms. Symptoms may recur or evolve; further outpatient follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Take medicines only as prescribed or directed during this visit. Avoid driving or unsafe activities if instructed or if symptoms recur. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take stroke-prevention or other medicines only as prescribed or directed during this visit. Do not start, stop, or change medicines without clinician guidance.",
      returnPrecautions:
        "Return immediately for new or recurrent weakness or numbness, facial droop, trouble speaking, vision change, severe headache, confusion, or trouble walking.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour un AIT ou des signes évoquant un accident vasculaire cérébral. Les signes peuvent récidiver ou évoluer ; un suivi ambulatoire complémentaire est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Prenez les médicaments uniquement selon la prescription ou les indications données pendant cette visite. Évitez de conduire ou les activités à risque si cela vous a été conseillé ou si les signes réapparaissent. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les traitements de prévention vasculaire ou autres médicaments uniquement selon la prescription ou les indications reçues pendant cette visite. N'introduisez ni n'arrêtez un traitement sans avis médical.",
      returnPrecautions:
        "Reconsultez immédiatement aux urgences en cas de nouvelle faiblesse ou engourdissement, d'asymétrie du visage, de trouble de la parole, de trouble visuel, de céphalée intense, de confusion ou de difficulté à marcher.",
    }
  );

export const SEIZURE_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department after a seizure. Further outpatient follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Rest as directed. Avoid driving, swimming alone, climbing, or operating machinery until cleared by your clinician if applicable. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take seizure or other medicines only as prescribed or directed during this visit. Do not miss doses unless your clinician advised you otherwise.",
      returnPrecautions:
        "Return immediately for recurrent seizure, prolonged seizure activity, injury, severe headache, confusion, fever with neck stiffness, or weakness or numbness.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences après une crise convulsive. Un suivi ambulatoire complémentaire est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Reposez-vous selon les indications reçues. Évitez de conduire, de nager seul, de grimper ou d'utiliser des machines tant que votre clinicien ne vous a pas autorisé, si applicable. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les antépileptiques ou autres médicaments uniquement selon la prescription ou les indications données pendant cette visite. Ne sautez pas de doses sauf avis contraire de votre clinicien.",
      returnPrecautions:
        "Reconsultez immédiatement aux urgences en cas de nouvelle crise, de crise prolongée, de blessure, de céphalée intense, de confusion, de fièvre avec raideur de la nuque, ou de faiblesse ou engourdissement.",
    }
  );

export const PALPITATIONS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for palpitations. Symptoms may recur; further outpatient follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Rest as needed and avoid caffeine or stimulants unless your clinician advised otherwise. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take heart-rate or other medicines only as prescribed or directed during this visit.",
      returnPrecautions:
        "Return immediately for chest pain, shortness of breath, fainting, worsening palpitations, weakness, or new neurologic symptoms.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des palpitations. Les signes peuvent récidiver ; un suivi ambulatoire complémentaire est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Reposez-vous selon vos besoins et évitez caféine ou stimulants sauf avis contraire de votre clinicien. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les médicaments cardiaques ou autres traitements uniquement selon la prescription ou les indications données pendant cette visite.",
      returnPrecautions:
        "Reconsultez immédiatement aux urgences en cas de douleur thoracique, d'essoufflement, d'évanouissement, de palpitations aggravées, de faiblesse ou de nouveaux signes neurologiques.",
    }
  );

export const SHORTNESS_OF_BREATH_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for shortness of breath. Breathing symptoms may recur or evolve; further outpatient follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Rest and pace activity as directed. Use inhalers or oxygen only as prescribed. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take breathing medicines only as prescribed or directed during this visit.",
      returnPrecautions:
        "Return immediately for worsening breathing, chest pain, fainting, blue lips, confusion, fever, or new swelling.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour un essoufflement. Les signes respiratoires peuvent récidiver ou évoluer ; un suivi ambulatoire complémentaire est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Reposez-vous et adaptez votre activité selon les indications reçues. Utilisez les inhalateurs ou l'oxygène uniquement selon la prescription. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les médicaments respiratoires uniquement selon la prescription ou les indications données pendant cette visite.",
      returnPrecautions:
        "Reconsultez immédiatement aux urgences en cas d'essoufflement aggravé, de douleur thoracique, d'évanouissement, de lèvres bleues, de confusion, de fièvre ou de nouveaux gonflements.",
    }
  );

export const CHEST_WALL_PAIN_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for chest wall pain. Symptoms may persist briefly; outpatient follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Avoid heavy lifting or activities that worsen pain unless your clinician advised otherwise. Use heat or ice as directed. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take pain medicines only as prescribed or directed during this visit.",
      returnPrecautions:
        "Return immediately for worsening chest pain, shortness of breath, sweating, fainting, new weakness, or pain that does not behave like prior musculoskeletal pain.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une douleur pariétale thoracique. Les signes peuvent persister brièvement ; un suivi ambulatoire est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Évitez les efforts ou activités qui aggravent la douleur sauf avis contraire de votre clinicien. Appliquez chaleur ou froid selon les indications. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les antidouleurs uniquement selon la prescription ou les indications données pendant cette visite.",
      returnPrecautions:
        "Reconsultez immédiatement aux urgences en cas de douleur thoracique aggravée, d'essoufflement, de transpiration, d'évanouissement, de nouvelle faiblesse, ou de douleur atypique par rapport à vos douleurs musculo-squelettiques habituelles.",
    }
  );

export const EPISTAXIS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for epistaxis (nosebleed). Outpatient follow-up is recommended if bleeding recurs when clinically appropriate.",
      diagnosisInstructions:
        "Avoid nose blowing, heavy lifting, or straining as directed. Use saline spray or humidification if advised. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take medicines only as prescribed or directed during this visit. Report blood-thinning medicines to your clinician.",
      returnPrecautions:
        "Return for care if bleeding does not stop, you feel dizzy or faint, vomit blood, have trouble breathing, have recurrent heavy bleeding, or bleed while on blood thinners.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour un épistaxis (saignement de nez). Un suivi ambulatoire est recommandé en cas de récidive lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Évitez de vous moucher fort, les efforts ou la tension abdominale selon les indications reçues. Utilisez un spray salin ou l'humidification si conseillé. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les médicaments uniquement selon la prescription ou les indications données pendant cette visite. Signalez les anticoagulants à votre clinicien.",
      returnPrecautions:
        "Reconsultez aux urgences si le saignement ne s'arrête pas, si vous vous sentez étourdi ou vous évanouissez, si vous vomissez du sang, si vous avez du mal à respirer, si les saignements abondants récidivent, ou si vous saignez sous anticoagulant.",
    }
  );

export const HYPOGLYCEMIA_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for hypoglycemia (low blood sugar). Low blood sugar may recur; further outpatient follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Eat regular meals and carry fast-acting sugar as directed if you have diabetes or are at risk. Avoid driving if you feel unwell. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take diabetes or other medicines only as prescribed or directed during this visit. Do not change insulin or diabetes medicines without clinician guidance.",
      returnPrecautions:
        "Return for care if low blood sugar recurs, you become confused, faint, have a seizure, cannot eat or drink, or vomit.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une hypoglycémie (baisse de la glycémie). Une hypoglycémie peut récidiver ; un suivi ambulatoire complémentaire est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Prenez vos repas régulièrement et gardez une source de sucre rapide sur vous si indiqué. Évitez de conduire si vous ne vous sentez pas bien. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les traitements du diabète ou autres médicaments uniquement selon la prescription ou les indications reçues pendant cette visite. Ne modifiez pas l'insuline ou les antidiabétiques sans avis médical.",
      returnPrecautions:
        "Reconsultez aux urgences si l'hypoglycémie récidive, si vous êtes confus, si vous vous évanouissez, si vous avez une crise, si vous ne pouvez pas manger ou boire, ou si vous vomissez.",
    }
  );

export const HYPERGLYCEMIA_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for hyperglycemia (high blood sugar). Blood sugar may remain elevated; further outpatient follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Take medicines and monitor blood sugar as directed. Stay hydrated unless restricted. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take diabetes or other medicines only as prescribed or directed during this visit. Do not change insulin or diabetes medicines without clinician guidance.",
      returnPrecautions:
        "Return for care if you vomit, develop abdominal pain, become confused, feel weak, have trouble breathing, have very high readings, or cannot tolerate fluids or medications.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une hyperglycémie (élévation de la glycémie). La glycémie peut rester élevée ; un suivi ambulatoire complémentaire est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Prenez vos médicaments et surveillez la glycémie selon les indications reçues. Maintenez une bonne hydratation sauf restriction. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les traitements du diabète ou autres médicaments uniquement selon la prescription ou les indications reçues pendant cette visite. Ne modifiez pas l'insuline ou les antidiabétiques sans avis médical.",
      returnPrecautions:
        "Reconsultez aux urgences si vous vomissez, si une douleur abdominale apparaît, si vous êtes confus, si vous vous affaiblissez, si vous avez du mal à respirer, si les valeurs sont très élevées, ou si vous ne tolérez pas les liquides ou les médicaments.",
    }
  );

export const ALCOHOL_INTOXICATION_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for alcohol intoxication. Further outpatient follow-up and support resources may be appropriate when clinically indicated.",
      diagnosisInstructions:
        "Avoid driving or operating machinery. Do not mix alcohol with sedating medicines. Rest and hydrate as tolerated. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take medicines only as prescribed or directed during this visit.",
      returnPrecautions:
        "Return for care if you become confused, vomit repeatedly, have trouble breathing, are injured, symptoms worsen, or withdrawal symptoms develop.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une intoxication alcoolique. Un suivi ambulatoire et des ressources de soutien peuvent être appropriés lorsque c'est cliniquement indiqué.",
      diagnosisInstructions:
        "Évitez de conduire ou d'utiliser des machines. Ne mélangez pas l'alcool avec des médicaments sédatifs. Reposez-vous et hydratez-vous selon vos tolérances. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les médicaments uniquement selon la prescription ou les indications données pendant cette visite.",
      returnPrecautions:
        "Reconsultez aux urgences si vous devenez confus, si vous vomissez de façon répétée, si vous avez du mal à respirer, si vous êtes blessé, si les signes s'aggravent, ou si des signes de sevrage apparaissent.",
    }
  );

export const ANXIETY_PANIC_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for anxiety or panic symptoms. Symptoms may recur; further outpatient follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Use coping strategies as directed. Avoid driving or unsafe activities if you feel unwell. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment:
        "Take anxiety or other medicines only as prescribed or directed during this visit.",
      returnPrecautions:
        "Return immediately for chest pain, shortness of breath, fainting, thoughts of self-harm, worsening anxiety, or inability to function.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour de l'anxiété ou des signes de crise d'angoisse. Les signes peuvent récidiver ; un suivi ambulatoire complémentaire est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Utilisez les stratégies de gestion indiquées. Évitez de conduire ou les activités à risque si vous ne vous sentez pas bien. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment:
        "Prenez les anxiolytiques ou autres médicaments uniquement selon la prescription ou les indications données pendant cette visite.",
      returnPrecautions:
        "Reconsultez immédiatement aux urgences en cas de douleur thoracique, d'essoufflement, d'évanouissement, d'idées auto-agressives, d'anxiété aggravée ou d'incapacité à fonctionner.",
    }
  );

const PEDIATRIC_MED_EN =
  "Give medications only as prescribed or directed during this visit. Do not start, stop, or change your child's medications without clinician guidance.";
const PEDIATRIC_MED_FR =
  "Administrez les médicaments uniquement selon la prescription ou les indications reçues pendant cette visite. N'introduisez pas, n'arrêtez pas et ne modifiez pas un traitement sans l'avis du clinicien.";

export const PEDIATRIC_FEVER_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText = localizedSuggestedText(
  {
    description:
      "Your child was evaluated in the emergency department for fever. Fever may change after an emergency visit; pediatric or primary care follow-up is recommended when clinically appropriate.",
    diagnosisInstructions:
      "Caregiver should follow clinician instructions for comfort measures and monitoring. Return precautions for worsening or concerning symptoms were reviewed with the caregiver.",
    medicationTreatment: PEDIATRIC_MED_EN,
    returnPrecautions:
      "Return immediately or call 911 if your child has trouble breathing, is very lethargic or difficult to wake, shows signs of dehydration, has a seizure, develops a new rash, has persistent or worsening fever despite care, or has other concerning symptoms. Caregiver should seek immediate care when worried.",
    caregiverInstructions:
      "Caregiver: monitor temperature, activity, hydration, and breathing. Follow instructions from your child's clinician and keep follow-up appointments with pediatrics or primary care.",
  },
  {
    description:
      "Votre enfant a été pris en charge aux urgences pour de la fièvre. La fièvre peut évoluer après une visite aux urgences ; un suivi pédiatrique ou en soins primaires est recommandé lorsque c'est cliniquement pertinent.",
    diagnosisInstructions:
      "Le parent ou tuteur doit suivre les instructions du clinicien pour le confort et la surveillance. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues avec le responsable.",
    medicationTreatment: PEDIATRIC_MED_FR,
    returnPrecautions:
      "Retournez immédiatement aux urgences ou appelez le 911 si votre enfant a du mal à respirer, est très léthargique ou difficile à réveiller, présente des signes de déshydratation, fait une crise convulsive, développe une nouvelle éruption cutanée, a une fièvre persistante ou qui s'aggrave malgré les soins, ou présente d'autres signes inquiétants. Consultez immédiatement en cas d'inquiétude.",
    caregiverInstructions:
      "Parent/tuteur : surveillez la température, l'activité, l'hydratation et la respiration. Suivez les instructions du clinicien de votre enfant et respectez les rendez-vous de suivi en pédiatrie ou en soins primaires.",
  }
);

export const PEDIATRIC_VIRAL_SYNDROME_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "Your child was evaluated in the emergency department for a viral illness. Many viral illnesses improve with supportive care; outpatient follow-up is recommended if symptoms persist or worsen.",
      diagnosisInstructions:
        "Caregiver should provide supportive care only as directed during this visit. Monitor activity, hydration, and breathing. Return precautions were reviewed with the caregiver.",
      medicationTreatment: PEDIATRIC_MED_EN,
      returnPrecautions:
        "Return immediately or call 911 if your child has trouble breathing, cannot keep fluids down, shows signs of dehydration, becomes very lethargic, or has worsening symptoms. Caregiver should seek immediate care when concerned.",
      caregiverInstructions:
        "Caregiver: observe your child closely at home and follow comfort measures as directed. Contact your clinician if symptoms persist beyond expected recovery.",
    },
    {
      description:
        "Votre enfant a été pris en charge aux urgences pour une maladie virale. De nombreuses infections virales s'améliorent avec des soins de confort ; un suivi ambulatoire est recommandé si les signes persistent ou s'aggravent.",
      diagnosisInstructions:
        "Le parent ou tuteur doit prodiguer des soins de confort uniquement selon les indications reçues pendant cette visite. Surveillez l'activité, l'hydratation et la respiration. Les consignes de retour ont été revues avec l'accompagnant.",
      medicationTreatment: PEDIATRIC_MED_FR,
      returnPrecautions:
        "Retournez immédiatement aux urgences ou appelez le 911 si votre enfant a du mal à respirer, ne peut pas boire, présente des signes de déshydratation, devient très léthargique ou si les signes s'aggravent. Consultez immédiatement en cas d'inquiétude.",
      caregiverInstructions:
        "Parent/tuteur : observez votre enfant de près à domicile et suivez les mesures de confort indiquées. Contactez votre clinicien si les signes persistent au-delà de la récupération attendue.",
    }
  );

export const PEDIATRIC_URI_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText = localizedSuggestedText(
  {
    description:
      "Your child was evaluated in the emergency department for upper respiratory symptoms such as congestion or cough. Outpatient follow-up is recommended if symptoms persist or worsen.",
    diagnosisInstructions:
      "Caregiver should use comfort measures as directed. Monitor breathing, fluid intake, and activity. Return precautions were reviewed with the guardian.",
    medicationTreatment: PEDIATRIC_MED_EN,
    returnPrecautions:
      "Return immediately or call 911 if your child has trouble breathing, blue lips, poor fluid intake, signs of dehydration, high fever with concern, or worsening symptoms. Caregiver should seek immediate care when worried.",
    caregiverInstructions:
      "Caregiver: keep your child hydrated and comfortable as directed. Watch for changes in breathing or feeding.",
  },
  {
    description:
      "Votre enfant a été pris en charge aux urgences pour des signes respiratoires supérieurs tels que congestion ou toux. Un suivi ambulatoire est recommandé si les signes persistent ou s'aggravent.",
    diagnosisInstructions:
      "Le parent ou tuteur doit utiliser les mesures de confort selon les indications reçues. Surveillez la respiration, l'hydratation et l'activité. Les consignes de retour ont été revues avec le responsable.",
    medicationTreatment: PEDIATRIC_MED_FR,
    returnPrecautions:
      "Retournez immédiatement aux urgences ou appelez le 911 si votre enfant a du mal à respirer, présente des lèvres bleutées, boit mal, montre des signes de déshydratation, a une fièvre élevée inquiétante ou si les signes s'aggravent. Consultez immédiatement en cas d'inquiétude.",
    caregiverInstructions:
      "Parent/tuteur : maintenez l'hydratation et le confort de votre enfant selon les indications. Surveillez toute modification de la respiration ou de l'alimentation.",
  }
);

export const PEDIATRIC_OTITIS_MEDIA_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "Your child was evaluated in the emergency department for ear pain consistent with otitis media. Outpatient follow-up with pediatrics or primary care is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Caregiver should follow pain and comfort instructions as directed. Finish antibiotics only if prescribed during this visit. Return precautions were reviewed with the caregiver.",
      medicationTreatment: PEDIATRIC_MED_EN,
      returnPrecautions:
        "Return immediately or call 911 if ear pain worsens, swelling develops behind the ear, fever persists or returns, drainage or bleeding occurs, your child becomes lethargic, or symptoms worsen. Caregiver should seek immediate care when concerned.",
      caregiverInstructions:
        "Caregiver: monitor ear pain, fever, and activity. Keep follow-up with pediatrics or primary care as arranged.",
    },
    {
      description:
        "Votre enfant a été pris en charge aux urgences pour une otalgie compatible avec une otite moyenne. Un suivi ambulatoire en pédiatrie ou en soins primaires est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Le parent ou tuteur doit suivre les consignes de confort et de douleur selon les indications reçues. Terminez une antibiothérapie seulement si elle a été prescrite pendant cette visite. Les consignes de retour ont été revues avec l'accompagnant.",
      medicationTreatment: PEDIATRIC_MED_FR,
      returnPrecautions:
        "Retournez immédiatement aux urgences ou appelez le 911 si la douleur auriculaire s'aggrave, si une tuméfaction apparaît derrière l'oreille, si la fièvre persiste ou revient, s'il y a écoulement ou saignement, si votre enfant devient léthargique ou si les signes s'aggravent. Consultez immédiatement en cas d'inquiétude.",
      caregiverInstructions:
        "Parent/tuteur : surveillez la douleur auriculaire, la fièvre et l'activité. Respectez le suivi en pédiatrie ou en soins primaires prévu.",
    }
  );

export const PEDIATRIC_GASTROENTERITIS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "Your child was evaluated in the emergency department for vomiting or diarrhea. Symptoms may persist briefly after an emergency visit; outpatient follow-up is recommended if they worsen.",
      diagnosisInstructions:
        "Caregiver should focus on hydration and diet as directed during this visit. Return precautions were reviewed with the guardian.",
      medicationTreatment: PEDIATRIC_MED_EN,
      returnPrecautions:
        "Return immediately or call 911 if there is blood in stool or vomit, signs of dehydration, persistent vomiting, severe abdominal pain, lethargy, or worsening symptoms. Caregiver should seek immediate care when worried.",
      caregiverInstructions:
        "Caregiver: offer small amounts of fluids as directed and monitor urine output and activity.",
    },
    {
      description:
        "Votre enfant a été pris en charge aux urgences pour des vomissements ou une diarrhée. Les signes peuvent persister brièvement après une visite aux urgences ; un suivi ambulatoire est recommandé s'ils s'aggravent.",
      diagnosisInstructions:
        "Le parent ou tuteur doit privilégier l'hydratation et l'alimentation selon les indications reçues. Les consignes de retour ont été revues avec le responsable.",
      medicationTreatment: PEDIATRIC_MED_FR,
      returnPrecautions:
        "Retournez immédiatement aux urgences ou appelez le 911 en cas de sang dans les selles ou les vomissements, de signes de déshydratation, de vomissements persistants, de douleur abdominale intense, de léthargie ou d'aggravation des signes. Consultez immédiatement en cas d'inquiétude.",
      caregiverInstructions:
        "Parent/tuteur : proposez de petites quantités de liquide selon les indications et surveillez la diurèse et l'activité.",
    }
  );

export const PEDIATRIC_MILD_DEHYDRATION_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "Your child was evaluated in the emergency department for mild dehydration. Continued hydration and caregiver monitoring are important after an emergency visit.",
      diagnosisInstructions:
        "Caregiver should give fluids as directed during this visit. Monitor urine, tears, activity, and alertness. Return precautions were reviewed with the caregiver.",
      medicationTreatment: PEDIATRIC_MED_EN,
      returnPrecautions:
        "Return immediately or call 911 if urination decreases significantly, your child is very lethargic or difficult to wake, vomiting prevents fluids, or symptoms worsen. Caregiver should seek immediate care when concerned.",
      caregiverInstructions:
        "Caregiver: encourage fluids as directed and watch for fewer wet diapers, dry mouth, or decreased activity.",
    },
    {
      description:
        "Votre enfant a été pris en charge aux urgences pour une déshydratation légère. L'hydratation continue et la surveillance par le responsable sont importantes après une visite aux urgences.",
      diagnosisInstructions:
        "Le parent ou tuteur doit donner des liquides selon les indications reçues. Surveillez la diurèse, les larmes, l'activité et la vigilance. Les consignes de retour ont été revues avec l'accompagnant.",
      medicationTreatment: PEDIATRIC_MED_FR,
      returnPrecautions:
        "Retournez immédiatement aux urgences ou appelez le 911 si la diurèse diminue nettement, si votre enfant est très léthargique ou difficile à réveiller, si les vomissements empêchent de boire, ou si les signes s'aggravent. Consultez immédiatement en cas d'inquiétude.",
      caregiverInstructions:
        "Parent/tuteur : encouragez les liquides selon les indications et surveillez une baisse des changes humides, une bouche sèche ou une baisse d'activité.",
    }
  );

export const PEDIATRIC_CONSTIPATION_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "Your child was evaluated in the emergency department for constipation. Diet and fluid changes may help when directed by your clinician; follow-up is recommended if symptoms persist.",
      diagnosisInstructions:
        "Caregiver should follow diet and fluid guidance only as directed during this visit. Return precautions were reviewed with the guardian.",
      medicationTreatment: PEDIATRIC_MED_EN,
      returnPrecautions:
        "Return immediately or call 911 if your child has severe abdominal pain, repeated vomiting, abdominal swelling, blood in stool, or worsening symptoms. Caregiver should seek immediate care when worried.",
      caregiverInstructions:
        "Caregiver: follow fiber and fluid guidance as directed and monitor bowel movements and comfort.",
    },
    {
      description:
        "Votre enfant a été pris en charge aux urgences pour une constipation. Des changements alimentaires et hydriques peuvent aider selon les indications du clinicien ; un suivi est recommandé si les signes persistent.",
      diagnosisInstructions:
        "Le parent ou tuteur doit suivre les conseils alimentaires et hydriques uniquement selon les indications reçues. Les consignes de retour ont été revues avec le responsable.",
      medicationTreatment: PEDIATRIC_MED_FR,
      returnPrecautions:
        "Retournez immédiatement aux urgences ou appelez le 911 si votre enfant a une douleur abdominale intense, des vomissements répétés, une distension abdominale, du sang dans les selles ou une aggravation des signes. Consultez immédiatement en cas d'inquiétude.",
      caregiverInstructions:
        "Parent/tuteur : suivez les conseils sur les fibres et les liquides selon les indications et surveillez les selles et le confort.",
    }
  );

export const PEDIATRIC_ASTHMA_EXACERBATION_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "Your child was evaluated in the emergency department for wheezing or breathing symptoms related to asthma. Symptoms may recur; follow-up with pediatrics is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Caregiver should follow the asthma action plan or instructions given during this visit. Monitor breathing and activity. Return precautions were reviewed with the caregiver.",
      medicationTreatment: PEDIATRIC_MED_EN,
      returnPrecautions:
        "Return immediately or call 911 if breathing worsens, rescue medicine is needed more often than directed, lips turn blue, your child cannot speak in full sentences, or symptoms worsen. Caregiver should seek immediate care when concerned.",
      caregiverInstructions:
        "Caregiver: watch for increased wheezing, cough, or work of breathing. Follow rescue and controller medicine instructions exactly as directed.",
    },
    {
      description:
        "Votre enfant a été pris en charge aux urgences pour une respiration sifflante ou des signes respiratoires liés à l'asthme. Les signes peuvent récidiver ; un suivi en pédiatrie est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Le parent ou tuteur doit suivre le plan d'action ou les consignes reçues pendant cette visite. Surveillez la respiration et l'activité. Les consignes de retour ont été revues avec l'accompagnant.",
      medicationTreatment: PEDIATRIC_MED_FR,
      returnPrecautions:
        "Retournez immédiatement aux urgences ou appelez le 911 si la respiration s'aggrave, si un médicament de secours est nécessaire plus souvent que prévu, si les lèvres deviennent bleues, si votre enfant ne peut plus parler normalement ou si les signes s'aggravent. Consultez immédiatement en cas d'inquiétude.",
      caregiverInstructions:
        "Parent/tuteur : surveillez toute augmentation des sibilances, de la toux ou de la difficulté respiratoire. Suivez exactement les consignes pour les médicaments de secours et d'entretien.",
    }
  );

export const PEDIATRIC_RASH_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText = localizedSuggestedText(
  {
    description:
      "Your child was evaluated in the emergency department for a rash. Rashes may change after an emergency visit; outpatient follow-up is recommended if spread, fever, or other concerns develop.",
    diagnosisInstructions:
      "Caregiver should monitor the rash and follow skin care instructions as directed. Return precautions were reviewed with the guardian.",
    medicationTreatment: PEDIATRIC_MED_EN,
    returnPrecautions:
      "Return immediately or call 911 if the rash becomes purple, involves mouth or eye lining, spreads rapidly with swelling, is accompanied by trouble breathing, fever with lethargy, or worsening symptoms. Caregiver should seek immediate care when worried.",
    caregiverInstructions:
      "Caregiver: note whether the rash is spreading, changing color, or associated with fever or discomfort.",
  },
  {
    description:
      "Votre enfant a été pris en charge aux urgences pour une éruption cutanée. Une éruption peut évoluer après une visite aux urgences ; un suivi ambulatoire est recommandé en cas d'extension, de fièvre ou d'autres signes inquiétants.",
    diagnosisInstructions:
      "Le parent ou tuteur doit surveiller l'éruption et suivre les soins cutanés selon les indications reçues. Les consignes de retour ont été revues avec le responsable.",
    medicationTreatment: PEDIATRIC_MED_FR,
    returnPrecautions:
      "Retournez immédiatement aux urgences ou appelez le 911 si l'éruption devient violacée, touche la bouche ou les yeux, s'étend rapidement avec gonflement, s'accompagne de difficulté respiratoire, de fièvre avec léthargie ou d'aggravation des signes. Consultez immédiatement en cas d'inquiétude.",
    caregiverInstructions:
      "Parent/tuteur : notez si l'éruption s'étend, change de couleur ou s'accompagne de fièvre ou d'inconfort.",
  }
);

export const PEDIATRIC_MINOR_HEAD_INJURY_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "Your child was evaluated in the emergency department after a minor head injury. Caregiver observation at home is important; follow-up is recommended if new or worsening symptoms develop.",
      diagnosisInstructions:
        "Caregiver should follow activity and observation instructions as directed during this visit. Return precautions were reviewed with the guardian.",
      medicationTreatment: PEDIATRIC_MED_EN,
      returnPrecautions:
        "Return immediately or call 911 for repeated vomiting, worsening headache, confusion, seizure, trouble waking your child, unusual behavior, weakness, or worsening symptoms. Caregiver should seek immediate care when concerned.",
      caregiverInstructions:
        "Caregiver: observe your child closely for the next day as directed. Wake for checks only if your clinician instructed you to do so.",
    },
    {
      description:
        "Votre enfant a été pris en charge aux urgences après un traumatisme crânien mineur. La surveillance par le responsable à domicile est importante ; un suivi est recommandé si de nouveaux signes ou une aggravation apparaissent.",
      diagnosisInstructions:
        "Le parent ou tuteur doit suivre les consignes d'activité et de surveillance selon les indications reçues. Les consignes de retour ont été revues avec l'accompagnant.",
      medicationTreatment: PEDIATRIC_MED_FR,
      returnPrecautions:
        "Retournez immédiatement aux urgences ou appelez le 911 en cas de vomissements répétés, de céphalée aggravée, de confusion, de crise convulsive, de difficulté à réveiller votre enfant, de comportement inhabituel, de faiblesse ou d'aggravation des signes. Consultez immédiatement en cas d'inquiétude.",
      caregiverInstructions:
        "Parent/tuteur : observez votre enfant de près selon les indications reçues. Réveillez pour contrôle seulement si le clinicien vous l'a demandé.",
    }
  );

export const PEDIATRIC_FEBRILE_SEIZURE_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "Your child was evaluated in the emergency department after a febrile seizure. Febrile seizures can recur; caregiver observation and timely follow-up are important after an emergency visit.",
      diagnosisInstructions:
        "Caregiver should follow comfort and monitoring instructions as directed during this visit. Return precautions were reviewed with the guardian.",
      medicationTreatment: PEDIATRIC_MED_EN,
      returnPrecautions:
        "Return immediately or call 911 for another seizure, a seizure lasting longer than expected, trouble breathing, neck stiffness, very lethargic behavior, persistent or worsening fever, unusual behavior or confusion, or worsening symptoms. Caregiver should seek immediate care when concerned.",
      caregiverInstructions:
        "Caregiver: monitor breathing, alertness, temperature, and activity closely. Follow instructions from your child's clinician and keep follow-up with pediatrics or primary care.",
    },
    {
      description:
        "Votre enfant a été pris en charge aux urgences après une crise convulsive fébrile. Une récidive est possible ; la surveillance par le responsable et un suivi rapide sont importants après une visite aux urgences.",
      diagnosisInstructions:
        "Le parent ou tuteur doit suivre les consignes de confort et de surveillance selon les indications reçues. Les consignes de retour ont été revues avec l'accompagnant.",
      medicationTreatment: PEDIATRIC_MED_FR,
      returnPrecautions:
        "Retournez immédiatement aux urgences ou appelez le 911 en cas de nouvelle crise convulsive, d'une crise plus longue que prévu, de difficulté respiratoire, de raideur de la nuque, de léthargie marquée, de fièvre persistante ou qui s'aggrave, de comportement inhabituel ou de confusion, ou si les signes s'aggravent. Consultez immédiatement en cas d'inquiétude.",
      caregiverInstructions:
        "Parent/tuteur : surveillez de près la respiration, la vigilance, la température et l'activité. Suivez les instructions du clinicien de votre enfant et respectez le suivi en pédiatrie ou en soins primaires.",
    }
  );

export const PEDIATRIC_ABDOMINAL_PAIN_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "Your child was evaluated in the emergency department for abdominal pain. Abdominal pain in children can change after an emergency visit; outpatient follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Caregiver should follow diet, comfort, and monitoring instructions as directed during this visit. Return precautions were reviewed with the caregiver.",
      medicationTreatment: PEDIATRIC_MED_EN,
      returnPrecautions:
        "Return immediately or call 911 if pain worsens, pain moves to the lower right abdomen, repeated vomiting occurs, fever develops or persists, blood appears in stool or vomit, signs of dehydration appear, the abdomen becomes swollen, your child becomes lethargic, or symptoms worsen. Caregiver should seek immediate care when worried.",
      caregiverInstructions:
        "Caregiver: note whether pain, vomiting, fever, or activity changes. Follow instructions from your child's clinician and keep follow-up appointments.",
    },
    {
      description:
        "Votre enfant a été pris en charge aux urgences pour une douleur abdominale. La douleur abdominale chez l'enfant peut évoluer après une visite aux urgences ; un suivi ambulatoire est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Le parent ou tuteur doit suivre les consignes alimentaires, de confort et de surveillance selon les indications reçues. Les consignes de retour ont été revues avec le responsable.",
      medicationTreatment: PEDIATRIC_MED_FR,
      returnPrecautions:
        "Retournez immédiatement aux urgences ou appelez le 911 si la douleur s'aggrave, si elle se déplace vers le bas-ventre droit, en cas de vomissements répétés, de fièvre nouvelle ou persistante, de sang dans les selles ou les vomissements, de signes de déshydratation, de distension abdominale, de léthargie ou d'aggravation des signes. Consultez immédiatement en cas d'inquiétude.",
      caregiverInstructions:
        "Parent/tuteur : notez toute modification de la douleur, des vomissements, de la fièvre ou de l'activité. Suivez les instructions du clinicien de votre enfant et respectez les rendez-vous de suivi.",
    }
  );

export const PEDIATRIC_VOMITING_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "Your child was evaluated in the emergency department for vomiting. Vomiting may persist briefly after an emergency visit; caregiver monitoring of hydration and comfort is important.",
      diagnosisInstructions:
        "Caregiver should focus on hydration and diet as directed during this visit. Return precautions were reviewed with the guardian.",
      medicationTreatment: PEDIATRIC_MED_EN,
      returnPrecautions:
        "Return immediately or call 911 for green or bloody vomit, severe abdominal pain, signs of dehydration, lethargy, persistent vomiting, inability to keep fluids down, or worsening symptoms. Caregiver should seek immediate care when concerned.",
      caregiverInstructions:
        "Caregiver: offer small amounts of fluids as directed and monitor urine output, tears, and activity.",
    },
    {
      description:
        "Votre enfant a été pris en charge aux urgences pour des vomissements. Les vomissements peuvent persister brièvement après une visite aux urgences ; la surveillance de l'hydratation et du confort par le responsable est importante.",
      diagnosisInstructions:
        "Le parent ou tuteur doit privilégier l'hydratation et l'alimentation selon les indications reçues. Les consignes de retour ont été revues avec l'accompagnant.",
      medicationTreatment: PEDIATRIC_MED_FR,
      returnPrecautions:
        "Retournez immédiatement aux urgences ou appelez le 911 en cas de vomissements verts ou sanglants, de douleur abdominale intense, de signes de déshydratation, de léthargie, de vomissements persistants, d'incapacité à boire, ou si les signes s'aggravent. Consultez immédiatement en cas d'inquiétude.",
      caregiverInstructions:
        "Parent/tuteur : proposez de petites quantités de liquide selon les indications et surveillez la diurèse, les larmes et l'activité.",
    }
  );

export const PEDIATRIC_DEHYDRATION_ESCALATION_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "Your child was evaluated in the emergency department for worsening dehydration concerns. Continued hydration and close caregiver monitoring are essential after an emergency visit.",
      diagnosisInstructions:
        "Caregiver should give fluids as directed during this visit. Monitor urine, tears, mouth moisture, alertness, and activity. Return precautions were reviewed with the caregiver.",
      medicationTreatment: PEDIATRIC_MED_EN,
      returnPrecautions:
        "Return immediately or call 911 if urination decreases significantly, your child has dry mouth or no tears, is very lethargic or difficult to wake, cannot keep fluids down, has persistent vomiting, or symptoms worsen. Caregiver should seek immediate care when worried.",
      caregiverInstructions:
        "Caregiver: encourage fluids as directed and watch for fewer wet diapers, dry mouth, sunken eyes, or decreased activity.",
    },
    {
      description:
        "Votre enfant a été pris en charge aux urgences pour une déshydratation préoccupante. L'hydratation continue et une surveillance étroite par le responsable sont essentielles après une visite aux urgences.",
      diagnosisInstructions:
        "Le parent ou tuteur doit donner des liquides selon les indications reçues. Surveillez la diurèse, les larmes, l'humidité buccale, la vigilance et l'activité. Les consignes de retour ont été revues avec l'accompagnant.",
      medicationTreatment: PEDIATRIC_MED_FR,
      returnPrecautions:
        "Retournez immédiatement aux urgences ou appelez le 911 si la diurèse diminue nettement, si votre enfant a la bouche sèche ou ne produit plus de larmes, est très léthargique ou difficile à réveiller, ne peut pas boire, a des vomissements persistants, ou si les signes s'aggravent. Consultez immédiatement en cas d'inquiétude.",
      caregiverInstructions:
        "Parent/tuteur : encouragez les liquides selon les indications et surveillez une baisse des changes humides, une bouche sèche, des yeux enfoncés ou une baisse d'activité.",
    }
  );

export const PEDIATRIC_RSV_BRONCHIOLITIS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "Your child was evaluated in the emergency department for bronchiolitis or an RSV-related respiratory illness. Breathing symptoms may change after an emergency visit; caregiver monitoring is important.",
      diagnosisInstructions:
        "Caregiver should follow comfort and breathing support instructions as directed during this visit. Return precautions were reviewed with the guardian.",
      medicationTreatment: PEDIATRIC_MED_EN,
      returnPrecautions:
        "Return immediately or call 911 if breathing worsens, retractions or heavy work of breathing develop, lips turn blue, poor feeding or poor fluid intake occurs, pauses in breathing are noticed, signs of dehydration appear, or symptoms worsen. Caregiver should seek immediate care when concerned.",
      caregiverInstructions:
        "Caregiver: monitor breathing, feeding, hydration, and activity. Follow instructions from your child's clinician and keep follow-up with pediatrics.",
    },
    {
      description:
        "Votre enfant a été pris en charge aux urgences pour une bronchiolite ou une infection respiratoire liée au VRS. Les signes respiratoires peuvent évoluer après une visite aux urgences ; la surveillance par le responsable est importante.",
      diagnosisInstructions:
        "Le parent ou tuteur doit suivre les consignes de confort et de soutien respiratoire selon les indications reçues. Les consignes de retour ont été revues avec le responsable.",
      medicationTreatment: PEDIATRIC_MED_FR,
      returnPrecautions:
        "Retournez immédiatement aux urgences ou appelez le 911 si la respiration s'aggrave, si des tirages ou une difficulté respiratoire importante apparaissent, si les lèvres deviennent bleues, si l'alimentation ou l'hydratation diminue, en cas de pauses respiratoires, de signes de déshydratation, ou si les signes s'aggravent. Consultez immédiatement en cas d'inquiétude.",
      caregiverInstructions:
        "Parent/tuteur : surveillez la respiration, l'alimentation, l'hydratation et l'activité. Suivez les instructions du clinicien de votre enfant et respectez le suivi en pédiatrie.",
    }
  );

export const PEDIATRIC_CROUP_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "Your child was evaluated in the emergency department for croup. Croup symptoms often change with activity and time of day; caregiver monitoring after an emergency visit is important.",
      diagnosisInstructions:
        "Caregiver should follow comfort and breathing instructions as directed during this visit. Return precautions were reviewed with the caregiver.",
      medicationTreatment: PEDIATRIC_MED_EN,
      returnPrecautions:
        "Return immediately or call 911 if stridor is present at rest, breathing worsens, lips turn blue, drooling increases, your child becomes lethargic, or symptoms worsen. Caregiver should seek immediate care when worried.",
      caregiverInstructions:
        "Caregiver: monitor breathing sounds, activity, and hydration. Follow instructions from your child's clinician.",
    },
    {
      description:
        "Votre enfant a été pris en charge aux urgences pour un croup. Les signes du croup peuvent varier selon l'activité et le moment de la journée ; la surveillance par le responsable après une visite aux urgences est importante.",
      diagnosisInstructions:
        "Le parent ou tuteur doit suivre les consignes de confort et de respiration selon les indications reçues. Les consignes de retour ont été revues avec l'accompagnant.",
      medicationTreatment: PEDIATRIC_MED_FR,
      returnPrecautions:
        "Retournez immédiatement aux urgences ou appelez le 911 si un stridor est présent au repos, si la respiration s'aggrave, si les lèvres deviennent bleues, si la salivation excessive augmente, si votre enfant devient léthargique, ou si les signes s'aggravent. Consultez immédiatement en cas d'inquiétude.",
      caregiverInstructions:
        "Parent/tuteur : surveillez les bruits respiratoires, l'activité et l'hydratation. Suivez les instructions du clinicien de votre enfant.",
    }
  );

export const PEDIATRIC_ALLERGIC_REACTION_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "Your child was evaluated in the emergency department for an allergic reaction. Allergic symptoms can recur or worsen; caregiver monitoring and follow-up are important after an emergency visit.",
      diagnosisInstructions:
        "Caregiver should follow allergy and medication instructions as directed during this visit. Return precautions were reviewed with the guardian.",
      medicationTreatment: PEDIATRIC_MED_EN,
      returnPrecautions:
        "Return immediately or call 911 for swelling of the lips, tongue, or throat, trouble breathing, repeated vomiting, fainting or collapse, a rapidly worsening rash, or other concerning symptoms. Caregiver should seek immediate care when concerned.",
      caregiverInstructions:
        "Caregiver: watch for return of hives, swelling, breathing changes, or vomiting. Follow instructions from your child's clinician and avoid known triggers as directed.",
    },
    {
      description:
        "Votre enfant a été pris en charge aux urgences pour une réaction allergique. Les signes allergiques peuvent récidiver ou s'aggraver ; la surveillance par le responsable et un suivi sont importants après une visite aux urgences.",
      diagnosisInstructions:
        "Le parent ou tuteur doit suivre les consignes sur l'allergie et les médicaments selon les indications reçues. Les consignes de retour ont été revues avec le responsable.",
      medicationTreatment: PEDIATRIC_MED_FR,
      returnPrecautions:
        "Retournez immédiatement aux urgences ou appelez le 911 en cas de gonflement des lèvres, de la langue ou de la gorge, de difficulté respiratoire, de vomissements répétés, d'évanouissement, d'éruption qui s'aggrave rapidement, ou d'autres signes inquiétants. Consultez immédiatement en cas d'inquiétude.",
      caregiverInstructions:
        "Parent/tuteur : surveillez toute réapparition d'urticaire, de gonflement, de modification respiratoire ou de vomissements. Suivez les instructions du clinicien de votre enfant et évitez les déclencheurs connus selon les indications.",
    }
  );

export const PEDIATRIC_CONCUSSION_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "Your child was evaluated in the emergency department for a concussion. Caregiver observation at home is important after a head injury; follow-up is recommended if new or worsening symptoms develop.",
      diagnosisInstructions:
        "Caregiver should follow activity and observation instructions as directed during this visit. Return precautions were reviewed with the guardian.",
      medicationTreatment: PEDIATRIC_MED_EN,
      returnPrecautions:
        "Return immediately or call 911 for repeated vomiting, worsening headache, confusion, seizure, trouble waking your child, unusual behavior or behavior change, weakness, or worsening symptoms. Caregiver should seek immediate care when concerned.",
      caregiverInstructions:
        "Caregiver: observe your child closely as directed. Limit activity only as instructed by your clinician and keep follow-up appointments.",
    },
    {
      description:
        "Votre enfant a été pris en charge aux urgences pour une commotion cérébrale. La surveillance par le responsable à domicile est importante après un traumatisme crânien ; un suivi est recommandé si de nouveaux signes ou une aggravation apparaissent.",
      diagnosisInstructions:
        "Le parent ou tuteur doit suivre les consignes d'activité et de surveillance selon les indications reçues. Les consignes de retour ont été revues avec l'accompagnant.",
      medicationTreatment: PEDIATRIC_MED_FR,
      returnPrecautions:
        "Retournez immédiatement aux urgences ou appelez le 911 en cas de vomissements répétés, de céphalée aggravée, de confusion, de crise convulsive, de difficulté à réveiller votre enfant, de comportement inhabituel ou de changement de comportement, de faiblesse, ou d'aggravation des signes. Consultez immédiatement en cas d'inquiétude.",
      caregiverInstructions:
        "Parent/tuteur : observez votre enfant de près selon les indications reçues. Limitez l'activité seulement selon les consignes du clinicien et respectez les rendez-vous de suivi.",
    }
  );

export const PEDIATRIC_WHEEZING_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "Your child was evaluated in the emergency department for wheezing or noisy breathing. Breathing symptoms may recur; caregiver monitoring and follow-up with pediatrics are recommended when clinically appropriate.",
      diagnosisInstructions:
        "Caregiver should follow breathing and medication instructions as directed during this visit. Return precautions were reviewed with the caregiver.",
      medicationTreatment: PEDIATRIC_MED_EN,
      returnPrecautions:
        "Return immediately or call 911 if breathing worsens, rescue medicine is needed more often than directed, lips turn blue, your child has trouble speaking or feeding because of breathing, or symptoms worsen. Caregiver should seek immediate care when worried.",
      caregiverInstructions:
        "Caregiver: watch for increased wheezing, cough, or work of breathing. Follow rescue and maintenance medicine instructions exactly as directed.",
    },
    {
      description:
        "Votre enfant a été pris en charge aux urgences pour une respiration sifflante ou bruyante. Les signes respiratoires peuvent récidiver ; la surveillance par le responsable et un suivi en pédiatrie sont recommandés lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Le parent ou tuteur doit suivre les consignes respiratoires et médicamenteuses selon les indications reçues. Les consignes de retour ont été revues avec l'accompagnant.",
      medicationTreatment: PEDIATRIC_MED_FR,
      returnPrecautions:
        "Retournez immédiatement aux urgences ou appelez le 911 si la respiration s'aggrave, si un médicament de secours est nécessaire plus souvent que prévu, si les lèvres deviennent bleues, si votre enfant a du mal à parler ou à s'alimenter à cause de la respiration, ou si les signes s'aggravent. Consultez immédiatement en cas d'inquiétude.",
      caregiverInstructions:
        "Parent/tuteur : surveillez toute augmentation des sibilances, de la toux ou de la difficulté respiratoire. Suivez exactement les consignes pour les médicaments de secours et d'entretien.",
    }
  );

export const PEDIATRIC_INFLUENZA_LIKE_ILLNESS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "Your child was evaluated in the emergency department for influenza-like illness. Symptoms may persist after an emergency visit; caregiver monitoring and outpatient follow-up are recommended when clinically appropriate.",
      diagnosisInstructions:
        "Caregiver should provide supportive care as directed during this visit. Monitor temperature, hydration, breathing, and activity. Return precautions were reviewed with the guardian.",
      medicationTreatment: PEDIATRIC_MED_EN,
      returnPrecautions:
        "Return immediately or call 911 if your child has trouble breathing, signs of dehydration, persistent or worsening fever, very lethargic behavior, difficulty waking, or worsening symptoms. Caregiver should seek immediate care when concerned.",
      caregiverInstructions:
        "Caregiver: monitor fever, fluids, breathing, and activity. Follow instructions from your child's clinician and keep follow-up with pediatrics or primary care.",
    },
    {
      description:
        "Votre enfant a été pris en charge aux urgences pour un tableau grippal. Les signes peuvent persister après une visite aux urgences ; la surveillance par le responsable et un suivi ambulatoire sont recommandés lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Le parent ou tuteur doit prodiguer des soins de confort selon les indications reçues. Surveillez la température, l'hydratation, la respiration et l'activité. Les consignes de retour ont été revues avec le responsable.",
      medicationTreatment: PEDIATRIC_MED_FR,
      returnPrecautions:
        "Retournez immédiatement aux urgences ou appelez le 911 si votre enfant a du mal à respirer, présente des signes de déshydratation, a une fièvre persistante ou qui s'aggrave, est très léthargique, est difficile à réveiller, ou si les signes s'aggravent. Consultez immédiatement en cas d'inquiétude.",
      caregiverInstructions:
        "Parent/tuteur : surveillez la fièvre, les liquides, la respiration et l'activité. Suivez les instructions du clinicien de votre enfant et respectez le suivi en pédiatrie ou en soins primaires.",
    }
  );

const OBGYN_MED_EN =
  "Take medications only as prescribed or directed during this visit. Do not start, stop, or change medications without clinician guidance.";
const OBGYN_MED_FR =
  "Prenez les médicaments uniquement selon la prescription ou les indications reçues pendant cette visite. N'introduisez pas, n'arrêtez pas et ne modifiez pas un traitement sans l'avis du clinicien.";

export const OBGYN_VAGINAL_BLEEDING_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for vaginal bleeding. Bleeding may change after an emergency visit; close follow-up with OB/GYN is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Monitor bleeding, dizziness, and pain as directed during this visit. Pregnancy-related symptoms may require close follow-up. Return precautions were reviewed.",
      medicationTreatment: OBGYN_MED_EN,
      returnPrecautions:
        "Return immediately for heavy bleeding, dizziness, severe pelvic pain, fainting, shoulder pain, or fever. Seek emergency care if symptoms worsen. Follow up with OB/GYN as directed.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des saignements vaginaux. Les saignements peuvent évoluer après une visite aux urgences ; un suivi rapproché en OB/GYN est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Surveillez les saignements, les étourdissements et la douleur selon les indications reçues. Les signes liés à une grossesse peuvent nécessiter un suivi rapproché. Les consignes de retour ont été revues.",
      medicationTreatment: OBGYN_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas de saignement abondant, d'étourdissements, de douleur pelvienne intense, d'évanouissement, de douleur à l'épaule ou de fièvre. Consultez en urgence si les signes s'aggravent. Suivez le suivi OB/GYN selon les directives.",
    }
  );

export const OBGYN_PELVIC_PAIN_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for pelvic pain. Pelvic pain may evolve after an emergency visit; OB/GYN follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Symptoms may evolve after this visit. Monitor pain, fever, and bleeding as directed. Return precautions were reviewed.",
      medicationTreatment: OBGYN_MED_EN,
      returnPrecautions:
        "Return immediately for worsening pain, fever, fainting, vomiting, bleeding, shoulder pain, or dizziness. Seek emergency care when concerned. Follow up with OB/GYN as directed.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une douleur pelvienne. La douleur pelvienne peut évoluer après une visite aux urgences ; un suivi OB/GYN est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Les signes peuvent évoluer après cette visite. Surveillez la douleur, la fièvre et les saignements selon les indications reçues. Les consignes de retour ont été revues.",
      medicationTreatment: OBGYN_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur, de fièvre, d'évanouissement, de vomissements, de saignements, de douleur à l'épaule ou d'étourdissements. Consultez en urgence si inquiétude. Suivez le suivi OB/GYN selon les directives.",
    }
  );

export const OBGYN_DYSMENORRHEA_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for painful menstrual cramps. Symptoms may persist briefly after an emergency visit; outpatient follow-up is recommended if pain worsens.",
      diagnosisInstructions:
        "Use comfort measures only as directed during this visit. Monitor pain and bleeding. Return precautions were reviewed.",
      medicationTreatment: OBGYN_MED_EN,
      returnPrecautions:
        "Return immediately for worsening pain, fever, heavy bleeding, dizziness, or fainting. Seek emergency care when concerned.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des crampes menstruelles douloureuses. Les signes peuvent persister brièvement après une visite aux urgences ; un suivi ambulatoire est recommandé si la douleur s'aggrave.",
      diagnosisInstructions:
        "Utilisez les mesures de confort uniquement selon les indications reçues. Surveillez la douleur et les saignements. Les consignes de retour ont été revues.",
      medicationTreatment: OBGYN_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur, de fièvre, de saignement abondant, d'étourdissements ou d'évanouissement. Consultez en urgence si inquiétude.",
    }
  );

export const OBGYN_HYPEREMESIS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for nausea and vomiting during pregnancy. Symptoms may persist after an emergency visit; hydration and close follow-up are important.",
      diagnosisInstructions:
        "Monitor hydration, intake, and dizziness as directed during this visit. Take medications only as directed. Return precautions were reviewed.",
      medicationTreatment: OBGYN_MED_EN,
      returnPrecautions:
        "Return immediately if you cannot tolerate fluids, have worsening vomiting, dizziness, fainting, or worsening symptoms. Seek emergency care when concerned. Follow up with OB/GYN as directed.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des nausées et vomissements pendant la grossesse. Les signes peuvent persister après une visite aux urgences ; l'hydratation et un suivi rapproché sont importants.",
      diagnosisInstructions:
        "Surveillez l'hydratation, les apports et les étourdissements selon les indications reçues. Prenez les médicaments uniquement selon les directives. Les consignes de retour ont été revues.",
      medicationTreatment: OBGYN_MED_FR,
      returnPrecautions:
        "Retournez immédiatement si vous ne pouvez pas boire, si les vomissements s'aggravent, en cas d'étourdissements, d'évanouissement ou d'aggravation des signes. Consultez en urgence si inquiétude. Suivez le suivi OB/GYN selon les directives.",
    }
  );

export const OBGYN_EARLY_PREGNANCY_SYMPTOMS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for early pregnancy symptoms. Symptoms during early pregnancy may evolve; OB/GYN follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Symptoms may evolve after this visit. Monitor pain, bleeding, and overall symptoms as directed. Return precautions were reviewed.",
      medicationTreatment: OBGYN_MED_EN,
      returnPrecautions:
        "Return immediately for pain, bleeding, fainting, fever, shoulder pain, dizziness, or worsening symptoms. Seek emergency care when concerned. Follow up with OB/GYN as directed.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des signes du début de grossesse. Les signes en début de grossesse peuvent évoluer ; un suivi OB/GYN est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Les signes peuvent évoluer après cette visite. Surveillez la douleur, les saignements et l'état général selon les indications reçues. Les consignes de retour ont été revues.",
      medicationTreatment: OBGYN_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas de douleur, de saignements, d'évanouissement, de fièvre, de douleur à l'épaule, d'étourdissements ou d'aggravation des signes. Consultez en urgence si inquiétude. Suivez le suivi OB/GYN selon les directives.",
    }
  );

export const OBGYN_THREATENED_MISCARRIAGE_PRECAUTIONS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for bleeding or cramping during early pregnancy. Symptoms during early pregnancy may require close follow-up. The guidance below is precautionary only.",
      diagnosisInstructions:
        "This information supports monitoring only and does not replace clinician judgment. Monitor bleeding and pain as directed. Return precautions were reviewed.",
      medicationTreatment: OBGYN_MED_EN,
      returnPrecautions:
        "Return immediately for heavy bleeding, severe pain, dizziness, fainting, shoulder pain, or fever. Seek emergency care if symptoms worsen. Follow up with OB/GYN as directed.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des saignements ou crampes en début de grossesse. Les signes en début de grossesse peuvent nécessiter un suivi rapproché. Les conseils ci-dessous sont uniquement préventifs.",
      diagnosisInstructions:
        "Ces informations servent à la surveillance et ne remplacent pas le jugement du clinicien. Surveillez les saignements et la douleur selon les indications reçues. Les consignes de retour ont été revues.",
      medicationTreatment: OBGYN_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas de saignement abondant, de douleur intense, d'étourdissements, d'évanouissement, de douleur à l'épaule ou de fièvre. Consultez en urgence si les signes s'aggravent. Suivez le suivi OB/GYN selon les directives.",
    }
  );

export const OBGYN_VAGINITIS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for vaginal discharge or irritation. Symptoms may persist briefly after an emergency visit; outpatient follow-up is recommended if symptoms worsen.",
      diagnosisInstructions:
        "Your health information is kept private and confidential. Follow comfort and hygiene instructions only as directed during this visit. Return precautions were reviewed.",
      medicationTreatment: OBGYN_MED_EN,
      returnPrecautions:
        "Return immediately for fever, severe pelvic pain, worsening symptoms, or fainting. Seek emergency care when concerned.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des pertes vaginales ou une irritation. Les signes peuvent persister brièvement après une visite aux urgences ; un suivi ambulatoire est recommandé s'ils s'aggravent.",
      diagnosisInstructions:
        "Vos informations de santé restent privées et confidentielles. Suivez les consignes de confort et d'hygiène uniquement selon les indications reçues. Les consignes de retour ont été revues.",
      medicationTreatment: OBGYN_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas de fièvre, de douleur pelvienne intense, d'aggravation des signes ou d'évanouissement. Consultez en urgence si inquiétude.",
    }
  );

export const OBGYN_UTI_PREGNANCY_PRECAUTIONS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for urinary symptoms during pregnancy. Urinary symptoms during pregnancy may require close follow-up with OB/GYN when clinically appropriate.",
      diagnosisInstructions:
        "Take medications only as directed during this visit. Monitor fever, pain, and hydration. Return precautions were reviewed.",
      medicationTreatment: OBGYN_MED_EN,
      returnPrecautions:
        "Return immediately for fever, flank pain, vomiting, fainting, or worsening symptoms. Seek emergency care when concerned. Follow up with OB/GYN as directed.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des signes urinaires pendant la grossesse. Des signes urinaires pendant la grossesse peuvent nécessiter un suivi rapproché en OB/GYN lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Prenez les médicaments uniquement selon les indications reçues. Surveillez la fièvre, la douleur et l'hydratation. Les consignes de retour ont été revues.",
      medicationTreatment: OBGYN_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas de fièvre, de douleur lombaire, de vomissements, d'évanouissement ou d'aggravation des signes. Consultez en urgence si inquiétude. Suivez le suivi OB/GYN selon les directives.",
    }
  );

export const OBGYN_ROUND_LIGAMENT_PAIN_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for pregnancy-related abdominal or pelvic discomfort consistent with round ligament pain. Symptoms may recur during pregnancy; OB/GYN follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Use comfort measures only as directed during this visit. Monitor pain and overall pregnancy symptoms. Return precautions were reviewed.",
      medicationTreatment: OBGYN_MED_EN,
      returnPrecautions:
        "Return immediately for worsening pain, bleeding, fever, regular contractions, or concerning changes in pregnancy symptoms. Seek emergency care when worried. Follow up with OB/GYN as directed.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une gêne abdominale ou pelvienne liée à la grossesse, compatible avec une douleur des ligaments ronds. Les signes peuvent récidiver pendant la grossesse ; un suivi OB/GYN est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Utilisez les mesures de confort uniquement selon les indications reçues. Surveillez la douleur et les signes généraux de la grossesse. Les consignes de retour ont été revues.",
      medicationTreatment: OBGYN_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur, de saignements, de fièvre, de contractions régulières ou de signes inquiétants liés à la grossesse. Consultez en urgence si inquiétude. Suivez le suivi OB/GYN selon les directives.",
    }
  );

export const OBGYN_POSTPARTUM_WARNING_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for postpartum symptoms. Postpartum symptoms can change quickly; close follow-up and emergency precautions are important.",
      diagnosisInstructions:
        "Monitor bleeding, breathing, blood pressure symptoms, and overall recovery as directed during this visit. Return precautions were reviewed.",
      medicationTreatment: OBGYN_MED_EN,
      returnPrecautions:
        "Return immediately for heavy bleeding, chest pain, shortness of breath, fever, severe headache, leg swelling, fainting, or worsening symptoms. Seek emergency care when concerned. Follow up with OB/GYN as directed.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des signes post-partum. Les signes post-partum peuvent évoluer rapidement ; un suivi rapproché et des consignes d'urgence sont importants.",
      diagnosisInstructions:
        "Surveillez les saignements, la respiration, les signes liés à la tension artérielle et la récupération générale selon les indications reçues. Les consignes de retour ont été revues.",
      medicationTreatment: OBGYN_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas de saignement abondant, de douleur thoracique, d'essoufflement, de fièvre, de céphalée intense, de gonflement des jambes, d'évanouissement ou d'aggravation des signes. Consultez en urgence si inquiétude. Suivez le suivi OB/GYN selon les directives.",
    }
  );

const BH_MED_EN = "Take medicines only as prescribed or directed during this visit.";
const BH_MED_FR =
  "Prenez les médicaments uniquement selon la prescription ou les indications reçues pendant cette visite.";

const BH_RETURN_PRECAUTIONS_EN =
  "Return immediately for thoughts of self-harm, thoughts of harming others, worsening anxiety, worsening depression, hallucinations, confusion, severe agitation, or withdrawal symptoms. Call 911 or use the crisis line when concerned. Use crisis resources as directed.";

const BH_RETURN_PRECAUTIONS_FR =
  "Retournez immédiatement pour des idées de se faire du mal, des idées de faire du mal à autrui, une aggravation de l'anxiété, une aggravation de la dépression, des hallucinations, de la confusion, de l'agitation sévère ou des symptômes de sevrage. Appelez le 911 ou utilisez la ligne de crise si inquiétude. Utilisez les ressources de crise selon les directives.";

const BH_SUBSTANCE_RESOURCES_EN =
  " Follow up with behavioral health and substance use treatment or recovery resources as directed. Avoid alcohol or substances as directed.";

const BH_SUBSTANCE_RESOURCES_FR =
  " Suivez le suivi en santé comportementale et les ressources de traitement des troubles liés aux substances ou de rétablissement selon les directives. Évitez l'alcool ou les substances selon les indications reçues.";

export const BEHAVIORAL_HEALTH_ANXIETY_PANIC_SYMPTOMS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for anxiety or panic symptoms. Symptoms may recur or worsen after an emergency visit; behavioral health follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Use calming strategies and medicines only as directed during this visit. Return for chest pain, shortness of breath, or symptoms that feel different from prior panic episodes. Follow up with behavioral health as directed.",
      medicationTreatment: BH_MED_EN,
      returnPrecautions: `${BH_RETURN_PRECAUTIONS_EN} Follow up with behavioral health as directed.`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour de l'anxiété ou des signes de crise d'angoisse. Les symptômes peuvent récidiver ou s'aggraver après une visite aux urgences ; un suivi en santé comportementale est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Utilisez des stratégies apaisantes et les médicaments uniquement selon les indications reçues pendant cette visite. Reconsultez en cas de douleur thoracique, d'essoufflement ou de signes différents de vos épisodes d'angoisse habituels. Suivez le suivi en santé comportementale selon les directives.",
      medicationTreatment: BH_MED_FR,
      returnPrecautions: `${BH_RETURN_PRECAUTIONS_FR} Suivez le suivi en santé comportementale selon les directives.`,
    }
  );

export const BEHAVIORAL_HEALTH_DEPRESSION_CRISIS_PRECAUTIONS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department during a period of worsening depression or emotional distress. Symptoms may change after an emergency visit; precautionary follow-up is recommended.",
      diagnosisInstructions:
        "Take medicines only as directed. Use crisis resources as directed. Follow up with behavioral health when recommended. This note does not document a formal suicide risk assessment.",
      medicationTreatment: BH_MED_EN,
      returnPrecautions: BH_RETURN_PRECAUTIONS_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pendant une période d'aggravation de la dépression ou de détresse émotionnelle. Les symptômes peuvent évoluer après une visite aux urgences ; un suivi préventif est recommandé.",
      diagnosisInstructions:
        "Prenez les médicaments uniquement selon les indications reçues. Utilisez les ressources de crise selon les directives. Suivez le suivi en santé comportementale lorsque recommandé. Cette note ne documente pas une évaluation formelle du risque suicidaire.",
      medicationTreatment: BH_MED_FR,
      returnPrecautions: BH_RETURN_PRECAUTIONS_FR,
    }
  );

export const BEHAVIORAL_HEALTH_SUICIDAL_IDEATION_PRECAUTIONS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for concerns related to thoughts of self-harm. Your emergency care information is private and confidential. Symptoms and safety concerns may change after an emergency visit.",
      diagnosisInstructions:
        "Use crisis resources as directed. Follow clinician instructions for follow-up and support. This note provides precautionary guidance only and does not document suicide risk assessment findings or a safety plan.",
      medicationTreatment: BH_MED_EN,
      returnPrecautions: `${BH_RETURN_PRECAUTIONS_EN} Return immediately for thoughts of self-harm or harm to others.`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des préoccupations liées à des idées de se faire du mal. Vos informations de soins aux urgences sont privées et confidentielles. Les symptômes et les préoccupations de sécurité peuvent évoluer après une visite aux urgences.",
      diagnosisInstructions:
        "Utilisez les ressources de crise selon les directives. Suivez les instructions du clinicien pour le suivi et le soutien. Cette note fournit uniquement des consignes préventives et ne documente pas les résultats d'une évaluation du risque suicidaire ni un plan de sécurité.",
      medicationTreatment: BH_MED_FR,
      returnPrecautions: `${BH_RETURN_PRECAUTIONS_FR} Retournez immédiatement pour des idées de se faire du mal ou de faire du mal à autrui.`,
    }
  );

export const BEHAVIORAL_HEALTH_ALCOHOL_INTOXICATION_FOLLOW_UP_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department related to alcohol use. Symptoms may continue to change after an emergency visit; this note does not confirm sobriety or resolution of intoxication.",
      diagnosisInstructions:
        `Avoid driving or operating machinery. Do not mix alcohol with sedating medicines. Rest and hydrate as tolerated.${BH_SUBSTANCE_RESOURCES_EN} Return precautions were reviewed.`,
      medicationTreatment: BH_MED_EN,
      returnPrecautions:
        "Return for confusion, falls, repeated vomiting, trouble breathing, injury, worsening symptoms, or withdrawal symptoms. Call 911 or use the crisis line when concerned.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour un motif lié à l'usage d'alcool. Les signes peuvent continuer à évoluer après une visite aux urgences ; cette note ne confirme ni sobriété ni résolution d'une intoxication.",
      diagnosisInstructions:
        `Évitez de conduire ou d'utiliser des machines. Ne mélangez pas l'alcool avec des médicaments sédatifs. Reposez-vous et hydratez-vous selon vos tolérances.${BH_SUBSTANCE_RESOURCES_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: BH_MED_FR,
      returnPrecautions:
        "Reconsultez en cas de confusion, de chutes, de vomissements répétés, de difficulté respiratoire, de blessure, d'aggravation des signes ou de symptômes de sevrage. Appelez le 911 ou utilisez la ligne de crise si inquiétude.",
    }
  );

export const BEHAVIORAL_HEALTH_ALCOHOL_WITHDRAWAL_PRECAUTIONS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for symptoms that may be related to alcohol withdrawal. Withdrawal symptoms can worsen; close monitoring and follow-up are important.",
      diagnosisInstructions:
        `Take medicines only as directed during this visit.${BH_SUBSTANCE_RESOURCES_EN} Return precautions for withdrawal symptoms were reviewed.`,
      medicationTreatment: BH_MED_EN,
      returnPrecautions:
        "Return immediately for tremors, confusion, hallucinations, seizures, severe agitation, chest pain, trouble breathing, or worsening withdrawal symptoms. Call 911 or use the crisis line when concerned.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des signes pouvant être liés à un sevrage alcoolique. Les symptômes de sevrage peuvent s'aggraver ; une surveillance rapprochée et un suivi sont importants.",
      diagnosisInstructions:
        `Prenez les médicaments uniquement selon les indications reçues pendant cette visite.${BH_SUBSTANCE_RESOURCES_FR} Les consignes de retour pour les symptômes de sevrage ont été revues.`,
      medicationTreatment: BH_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas de tremblements, de confusion, d'hallucinations, de convulsions, d'agitation sévère, de douleur thoracique, de difficulté respiratoire ou d'aggravation des symptômes de sevrage. Appelez le 911 ou utilisez la ligne de crise si inquiétude.",
    }
  );

export const BEHAVIORAL_HEALTH_SUBSTANCE_USE_RESOURCES_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for concerns related to substance use. Your care information is private and confidential. Outpatient support and follow-up resources may be appropriate when clinically indicated.",
      diagnosisInstructions:
        `Follow clinician instructions during this visit.${BH_SUBSTANCE_RESOURCES_EN} This note does not document legal findings or involuntary treatment decisions.`,
      medicationTreatment: BH_MED_EN,
      returnPrecautions: `${BH_RETURN_PRECAUTIONS_EN}${BH_SUBSTANCE_RESOURCES_EN}`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des préoccupations liées à l'usage de substances. Vos informations de soins sont privées et confidentielles. Un soutien ambulatoire et des ressources de suivi peuvent être appropriés lorsque c'est cliniquement indiqué.",
      diagnosisInstructions:
        `Suivez les instructions du clinicien pendant cette visite.${BH_SUBSTANCE_RESOURCES_FR} Cette note ne documente pas de conclusions juridiques ni de décisions de traitement involontaire.`,
      medicationTreatment: BH_MED_FR,
      returnPrecautions: `${BH_RETURN_PRECAUTIONS_FR}${BH_SUBSTANCE_RESOURCES_FR}`,
    }
  );

export const BEHAVIORAL_HEALTH_OPIOID_OVERDOSE_AFTERCARE_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department after a suspected opioid overdose or related emergency. Symptoms may recur; emergency precautions and substance-use follow-up are important.",
      diagnosisInstructions:
        `Take medicines only as directed. Do not use opioids or sedating substances unless prescribed and supervised.${BH_SUBSTANCE_RESOURCES_EN} Return precautions were reviewed.`,
      medicationTreatment: BH_MED_EN,
      returnPrecautions:
        "Return immediately for trouble breathing, decreased responsiveness, confusion, severe sleepiness, blue lips or skin, chest pain, or recurrent overdose symptoms. Call 911 or use the crisis line when concerned.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences après une suspicion de surdose d'opioïdes ou une urgence connexe. Les symptômes peuvent récidiver ; des consignes d'urgence et un suivi en usage de substances sont importants.",
      diagnosisInstructions:
        `Prenez les médicaments uniquement selon les indications reçues. N'utilisez pas d'opioïdes ou de substances sédatives sauf prescription et supervision.${BH_SUBSTANCE_RESOURCES_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: BH_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas de difficulté respiratoire, de baisse de vigilance, de confusion, de somnolence importante, de lèvres ou peau bleutées, de douleur thoracique ou de signes récurrents de surdose. Appelez le 911 ou utilisez la ligne de crise si inquiétude.",
    }
  );

export const BEHAVIORAL_HEALTH_CRISIS_FOLLOW_UP_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department during a behavioral health crisis or severe emotional distress. Symptoms may change after an emergency visit; follow-up is recommended.",
      diagnosisInstructions:
        "Use crisis resources as directed. Follow clinician instructions. Follow up with behavioral health as directed. This note provides neutral precautionary guidance only.",
      medicationTreatment: BH_MED_EN,
      returnPrecautions: BH_RETURN_PRECAUTIONS_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences lors d'une crise de santé comportementale ou d'une détresse émotionnelle importante. Les symptômes peuvent évoluer après une visite aux urgences ; un suivi est recommandé.",
      diagnosisInstructions:
        "Utilisez les ressources de crise selon les directives. Suivez les instructions du clinicien. Suivez le suivi en santé comportementale selon les directives. Cette note fournit uniquement des consignes préventives neutres.",
      medicationTreatment: BH_MED_FR,
      returnPrecautions: BH_RETURN_PRECAUTIONS_FR,
    }
  );

export const BEHAVIORAL_HEALTH_INSOMNIA_STRESS_REACTION_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for insomnia, acute stress, or related symptoms. Symptoms may recur or worsen; conservative monitoring and follow-up are recommended.",
      diagnosisInstructions:
        "Use sleep hygiene and stress-reduction strategies as directed. Take medicines only as prescribed. Follow up with behavioral health when recommended.",
      medicationTreatment: BH_MED_EN,
      returnPrecautions: `${BH_RETURN_PRECAUTIONS_EN} Return for severe anxiety, panic symptoms, or symptoms that interfere with daily function.`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour de l'insomnie, un stress aigu ou des signes connexes. Les symptômes peuvent récidiver ou s'aggraver ; une surveillance prudente et un suivi sont recommandés.",
      diagnosisInstructions:
        "Appliquez les mesures d'hygiène du sommeil et de réduction du stress selon les indications reçues. Prenez les médicaments uniquement selon la prescription. Suivez le suivi en santé comportementale lorsque recommandé.",
      medicationTreatment: BH_MED_FR,
      returnPrecautions: `${BH_RETURN_PRECAUTIONS_FR} Reconsultez en cas d'anxiété sévère, de crise d'angoisse ou de signes gênant les activités quotidiennes.`,
    }
  );

export const BEHAVIORAL_HEALTH_GRIEF_ADJUSTMENT_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for grief, adjustment, or emotional distress symptoms. Your care information is private and confidential. Supportive follow-up may be appropriate when clinically indicated.",
      diagnosisInstructions:
        "Use supportive coping strategies as directed. Follow up with behavioral health when recommended. This note does not document psychiatric diagnoses beyond clinician-selected documentation.",
      medicationTreatment: BH_MED_EN,
      returnPrecautions: BH_RETURN_PRECAUTIONS_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des signes de deuil, d'adaptation ou de détresse émotionnelle. Vos informations de soins sont privées et confidentielles. Un suivi de soutien peut être approprié lorsque c'est cliniquement indiqué.",
      diagnosisInstructions:
        "Utilisez des stratégies d'adaptation de soutien selon les indications reçues. Suivez le suivi en santé comportementale lorsque recommandé. Cette note ne documente pas de diagnostics psychiatriques au-delà de la documentation choisie par le clinicien.",
      medicationTreatment: BH_MED_FR,
      returnPrecautions: BH_RETURN_PRECAUTIONS_FR,
    }
  );

const MSK_MED_EN = "Take pain medicines only as prescribed or directed during this visit.";
const MSK_MED_FR =
  "Prenez les antidouleurs uniquement selon la prescription ou les indications reçues pendant cette visite.";

const MSK_ACTIVITY_EN =
  "Activity should follow provider guidance. Use activity limits and support devices only as directed. Gradual return as directed.";
const MSK_ACTIVITY_FR =
  "L'activité doit suivre les indications du clinicien. Respectez les limites d'activité et les aides de support uniquement selon les directives reçues. Reprise progressive selon les directives.";

const MSK_LIMB_ESCALATION_EN =
  "Return immediately for worsening pain, numbness, weakness, swelling, discoloration, or inability to move. Seek emergency care for worsening symptoms.";
const MSK_LIMB_ESCALATION_FR =
  "Retournez immédiatement en cas d'aggravation de la douleur, d'engourdissement, de faiblesse, d'enflure, de changement de couleur ou d'incapacité à bouger. Consultez en urgence en cas d'aggravation.";

const MSK_SPINE_ESCALATION_EN =
  "Return immediately for weakness, numbness, difficulty walking, loss of bladder or bowel control, severe headache, vomiting, confusion, or worsening pain. Seek emergency care for worsening symptoms.";
const MSK_SPINE_ESCALATION_FR =
  "Retournez immédiatement en cas de faiblesse, d'engourdissement, de difficulté à marcher, de perte de contrôle de la vessie ou de l'intestin, de mal de tête sévère, de vomissements, de confusion ou d'aggravation de la douleur. Consultez en urgence en cas d'aggravation.";

export const TRAUMA_MSK_ANKLE_SPRAIN_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for pain or injury involving the ankle. Symptoms may change after the visit.",
      diagnosisInstructions: `${MSK_ACTIVITY_EN} Return precautions were reviewed.`,
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_LIMB_ESCALATION_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une douleur ou une blessure à la cheville. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions: `${MSK_ACTIVITY_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_LIMB_ESCALATION_FR,
    }
  );

export const TRAUMA_MSK_WRIST_SPRAIN_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for pain or injury involving the wrist. Symptoms may change after the visit.",
      diagnosisInstructions: `${MSK_ACTIVITY_EN} Return precautions were reviewed.`,
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_LIMB_ESCALATION_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une douleur ou une blessure au poignet. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions: `${MSK_ACTIVITY_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_LIMB_ESCALATION_FR,
    }
  );

export const TRAUMA_MSK_KNEE_INJURY_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for pain or injury involving the knee. Symptoms may change after the visit.",
      diagnosisInstructions: `${MSK_ACTIVITY_EN} Return precautions were reviewed.`,
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_LIMB_ESCALATION_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une douleur ou une blessure au genou. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions: `${MSK_ACTIVITY_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_LIMB_ESCALATION_FR,
    }
  );

export const TRAUMA_MSK_SHOULDER_PAIN_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for pain or injury involving the shoulder. Symptoms may change after the visit.",
      diagnosisInstructions: `${MSK_ACTIVITY_EN} Return precautions were reviewed.`,
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_LIMB_ESCALATION_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une douleur ou une blessure à l'épaule. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions: `${MSK_ACTIVITY_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_LIMB_ESCALATION_FR,
    }
  );

export const TRAUMA_MSK_BACK_STRAIN_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for back strain or back pain after injury. Symptoms may change after the visit.",
      diagnosisInstructions: `${MSK_ACTIVITY_EN} Return precautions were reviewed.`,
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_SPINE_ESCALATION_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une entorse ou une douleur dorsale après un traumatisme. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions: `${MSK_ACTIVITY_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_SPINE_ESCALATION_FR,
    }
  );

const spineSuggestedText = (description: string, frDescription: string, precautions = MSK_SPINE_ESCALATION_EN, frPrecautions = MSK_SPINE_ESCALATION_FR) =>
  localizedSuggestedText(
    { description, diagnosisInstructions: `${MSK_ACTIVITY_EN} Return precautions were reviewed.`, medicationTreatment: MSK_MED_EN, returnPrecautions: precautions },
    { description: frDescription, diagnosisInstructions: `${MSK_ACTIVITY_FR} Les consignes de retour ont été revues.`, medicationTreatment: MSK_MED_FR, returnPrecautions: frPrecautions },
  );
export const SPINE_CERVICAL_STRAIN_SUGGESTED_TEXT = spineSuggestedText("You were evaluated for cervical strain or neck pain.", "Vous avez été pris en charge pour une entorse cervicale ou une douleur au cou.");
export const SPINE_THORACIC_STRAIN_SUGGESTED_TEXT = spineSuggestedText("You were evaluated for thoracic back strain.", "Vous avez été pris en charge pour une entorse thoracique.");
export const SPINE_LUMBAR_STRAIN_SUGGESTED_TEXT = spineSuggestedText("You were evaluated for lumbar strain.", "Vous avez été pris en charge pour une entorse lombaire.");
export const SPINE_MECHANICAL_BACK_PAIN_SUGGESTED_TEXT = spineSuggestedText("You were evaluated for mechanical back pain.", "Vous avez été pris en charge pour une douleur dorsale mécanique.");
export const SPINE_CERVICAL_RADICULOPATHY_SUGGESTED_TEXT = spineSuggestedText("You were evaluated for cervical radicular symptoms.", "Vous avez été pris en charge pour des symptômes radiculaires cervicaux.");
export const SPINE_LUMBAR_RADICULOPATHY_SCIATICA_SUGGESTED_TEXT = spineSuggestedText("You were evaluated for lumbar radiculopathy or sciatica.", "Vous avez été pris en charge pour une radiculopathie lombaire ou une sciatique.");
export const SPINE_DISC_HERNIATION_SUGGESTED_TEXT = spineSuggestedText("You were evaluated for disc-related back symptoms.", "Vous avez été pris en charge pour des symptômes dorsaux liés à un disque.");
export const SPINE_STENOSIS_SUGGESTED_TEXT = spineSuggestedText("You were evaluated for spinal stenosis symptoms.", "Vous avez été pris en charge pour des symptômes de sténose rachidienne.");
export const SPINE_VERTEBRAL_COMPRESSION_FRACTURE_SUGGESTED_TEXT = spineSuggestedText("You were evaluated for vertebral compression fracture.", "Vous avez été pris en charge pour une fracture-compression vertébrale.");
export const SPINE_STABLE_VERTEBRAL_FRACTURE_SUGGESTED_TEXT = spineSuggestedText("You were evaluated after a stable vertebral fracture.", "Vous avez été pris en charge après une fracture vertébrale stable.");
export const SPINE_POST_TRAUMA_EVALUATION_SUGGESTED_TEXT = spineSuggestedText("You were evaluated after spinal trauma.", "Vous avez été pris en charge après un traumatisme rachidien.");
export const SPINE_POST_CAUDA_RED_FLAG_EVALUATION_SUGGESTED_TEXT = spineSuggestedText(
  "You were evaluated for spinal red-flag symptoms. Return immediately for new or worsening weakness, numbness in the saddle area, difficulty walking, urinary retention, incontinence, or bowel changes.",
  "Vous avez été pris en charge pour des signes d’alerte rachidiens. Retournez immédiatement en cas de faiblesse nouvelle ou aggravée, d’engourdissement en selle, de difficulté à marcher, de rétention urinaire, d’incontinence ou de modification intestinale.",
  "Return immediately for new or worsening weakness, saddle numbness, difficulty walking, urinary retention, incontinence, or bowel changes.",
  "Retournez immédiatement en cas de faiblesse nouvelle ou aggravée, d’engourdissement en selle, de difficulté à marcher, de rétention urinaire, d’incontinence ou de modification intestinale.",
);
export const SPINE_INFECTION_FOLLOWUP_SUGGESTED_TEXT = spineSuggestedText(
  "You were evaluated for a possible spinal infection. This instruction set is used only when the clinician explicitly selects discharge after completed evaluation. Return immediately for fever, worsening back pain, new weakness, numbness, difficulty walking, urinary retention, or confusion.",
  "Vous avez été pris en charge pour une possible infection rachidienne. Ces consignes ne s’appliquent que si le clinicien choisit explicitement une sortie après évaluation complète. Retournez immédiatement en cas de fièvre, d’aggravation de la douleur dorsale, de faiblesse nouvelle, d’engourdissement, de difficulté à marcher, de rétention urinaire ou de confusion.",
  "Return immediately for fever, worsening back pain, new weakness, numbness, difficulty walking, urinary retention, or confusion.",
  "Retournez immédiatement en cas de fièvre, d’aggravation de la douleur dorsale, de faiblesse nouvelle, d’engourdissement, de difficulté à marcher, de rétention urinaire ou de confusion.",
);

export const TRAUMA_MSK_NECK_STRAIN_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for neck strain or neck pain after injury. Symptoms may change after the visit.",
      diagnosisInstructions: `${MSK_ACTIVITY_EN} Return precautions were reviewed.`,
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_SPINE_ESCALATION_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une entorse ou une douleur cervicale après un traumatisme. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions: `${MSK_ACTIVITY_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_SPINE_ESCALATION_FR,
    }
  );

export const TRAUMA_MSK_CONTUSION_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a contusion (bruise) after injury. Symptoms may change after the visit.",
      diagnosisInstructions: `${MSK_ACTIVITY_EN} Return precautions were reviewed.`,
      medicationTreatment: MSK_MED_EN,
      returnPrecautions:
        "Return immediately for worsening swelling, severe pain, numbness, weakness, skin color change, or inability to move the injured area. Seek emergency care for worsening symptoms.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour un contusion (ecchymose) après un traumatisme. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions: `${MSK_ACTIVITY_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: MSK_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'enflure qui s'aggrave, de douleur intense, d'engourdissement, de faiblesse, de changement de couleur de la peau ou d'incapacité à bouger la zone blessée. Consultez en urgence en cas d'aggravation.",
    }
  );

export const TRAUMA_MSK_RIB_INJURY_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for rib or chest wall injury after trauma. Symptoms may change after the visit.",
      diagnosisInstructions: `${MSK_ACTIVITY_EN} Return precautions were reviewed.`,
      medicationTreatment: MSK_MED_EN,
      returnPrecautions:
        "Return immediately for difficulty breathing, worsening chest pain, fever, coughing blood, fainting, or worsening pain. Seek emergency care when concerned.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une blessure des côtes ou de la paroi thoracique après un traumatisme. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions: `${MSK_ACTIVITY_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: MSK_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas de difficulté à respirer, d'aggravation de la douleur thoracique, de fièvre, de toux avec sang, d'évanouissement ou d'aggravation de la douleur. Consultez en urgence si inquiétude.",
    }
  );

export const TRAUMA_MSK_MINOR_FRACTURE_PRECAUTIONS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a possible bone injury. Symptoms may change after the visit; follow clinician instructions for splint, cast, or support devices.",
      diagnosisInstructions:
        "Use splint, cast, or support devices only as directed. Follow up with orthopedics as directed. Activity should follow provider guidance. This note does not state a specific fracture type unless documented separately by your clinician.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions:
        "Return immediately for worsening pain, numbness, color change, severe swelling, severe pain, a tight splint or cast, or inability to move fingers or toes. Seek emergency care for worsening symptoms.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une possible lésion osseuse. Les symptômes peuvent évoluer après la visite ; suivez les instructions du clinicien pour attelle, plâtre ou aide de support.",
      diagnosisInstructions:
        "Utilisez attelle, plâtre ou aide de support uniquement selon les directives reçues. Suivez le suivi en orthopédie selon les directives. L'activité doit suivre les indications du clinicien. Cette note ne précise pas un type de fracture sauf documentation distincte par votre clinicien.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur, d'engourdissement, de changement de couleur, d'enflure importante, de douleur intense, d'attelle ou plâtre trop serré, ou d'incapacité à bouger les doigts ou orteils. Consultez en urgence en cas d'aggravation.",
    }
  );

export const TRAUMA_MSK_MVC_SORENESS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for soreness or symptoms after a motor vehicle collision. Symptoms may change after the visit.",
      diagnosisInstructions: `${MSK_ACTIVITY_EN} Return precautions were reviewed.`,
      medicationTreatment: MSK_MED_EN,
      returnPrecautions:
        "Return immediately for worsening headache, vomiting, confusion, weakness, numbness, chest pain, shortness of breath, abdominal pain, or worsening symptoms. Seek emergency care when concerned.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des courbatures ou symptômes après une collision de véhicule. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions: `${MSK_ACTIVITY_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: MSK_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas de mal de tête sévère, de vomissements, de confusion, de faiblesse, d'engourdissement, de douleur thoracique, de difficulté à respirer, de douleur abdominale ou d'aggravation des symptômes. Consultez en urgence si inquiétude.",
    }
  );

export const TRAUMA_MSK_FRACTURE_HIP_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a possible hip (proximal femur) fracture. Hip fractures often need orthopedic surgery, and many patients need a hospital stay; if you are going home today, follow the instructions below and keep your scheduled orthopedic follow-up.",
      diagnosisInstructions:
        "Keep weight off the injured leg and use a walker, wheelchair, or crutches only as directed. Use a brace, splint, or other support device only as directed. Ice and elevate the leg as directed to reduce swelling. Activity should follow provider guidance.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions:
        "Return immediately or go to the nearest emergency department for worsening pain, numbness, weakness, inability to move the leg, swelling that worsens, discoloration of the foot or toes, chest pain, shortness of breath, or fever. Seek emergency care for worsening symptoms.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une possible fracture de la hanche (fémur proximal). Les fractures de la hanche nécessitent souvent une chirurgie orthopédique, et de nombreux patients doivent être hospitalisés ; si vous rentrez à la maison aujourd'hui, suivez les instructions ci-dessous et respectez le suivi orthopédique prévu.",
      diagnosisInstructions:
        "Évitez de mettre du poids sur la jambe blessée et utilisez un déambulateur, un fauteuil roulant ou des béquilles uniquement selon les directives reçues. Utilisez une attelle, un plâtre ou une autre aide de support uniquement selon les directives. Glace et surélévation de la jambe selon les directives pour réduire l'enflure. L'activité doit suivre les indications du clinicien.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions:
        "Retournez immédiatement ou allez à l'urgence la plus proche en cas d'aggravation de la douleur, d'engourdissement, de faiblesse, d'incapacité à bouger la jambe, d'enflure qui s'aggrave, de changement de couleur du pied ou des orteils, de douleur thoracique, de difficulté à respirer ou de fièvre. Consultez en urgence en cas d'aggravation.",
    }
  );

export const TRAUMA_MSK_FRACTURE_HAND_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a possible hand, finger, or wrist bone fracture. Symptoms may change after the visit; follow clinician instructions for splint, cast, or support devices.",
      diagnosisInstructions:
        "Use a splint, cast, or support device only as directed. Ice and elevate the hand above the level of the heart as directed to reduce swelling. Keep the hand elevated when resting. Follow up with orthopedics or hand surgery as directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_LIMB_ESCALATION_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une possible fracture osseuse de la main, du doigt ou du poignet. Les symptômes peuvent évoluer après la visite ; suivez les instructions du clinicien pour attelle, plâtre ou aide de support.",
      diagnosisInstructions:
        "Utilisez une attelle, un plâtre ou une aide de support uniquement selon les directives reçues. Glace et surélévation de la main au-dessus du niveau du cœur selon les directives pour réduire l'enflure. Gardez la main surélevée au repos. Suivez le suivi en orthopédie ou en chirurgie de la main selon les directives.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_LIMB_ESCALATION_FR,
    }
  );

export const TRAUMA_MSK_FRACTURE_FACIAL_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a possible facial, nasal, orbital, or jaw (mandible) bone fracture. Symptoms may change after the visit.",
      diagnosisInstructions:
        "Ice and elevate the head (sleep with your head raised) as directed to reduce swelling. Eat a soft diet only as directed if you have a jaw injury. Activity should follow provider guidance. Follow up as directed for repeat facial or eye evaluation.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions:
        "Return immediately for worsening pain, worsening swelling, vision changes, double vision, new numbness of the face, new difficulty opening the mouth or biting normally, fever, or worsening symptoms. Seek emergency care for worsening symptoms.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une possible fracture osseuse du visage, du nez, de l'orbite ou de la mâchoire (mandibule). Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions:
        "Glace et surélévation de la tête (dormez la tête relevée) selon les directives pour réduire l'enflure. Alimentation molle uniquement selon les directives en cas de blessure à la mâchoire. L'activité doit suivre les indications du clinicien. Suivez le suivi selon les directives pour une nouvelle évaluation du visage ou des yeux.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur, d'aggravation de l'enflure, de changement de vision, de vision double, de nouvel engourdissement du visage, de nouvelle difficulté à ouvrir la bouche ou à mordre normalement, de fièvre ou d'aggravation des symptômes. Consultez en urgence en cas d'aggravation.",
    }
  );

export const TRAUMA_MSK_FRACTURE_SPINE_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a possible spinal (vertebral) fracture. Symptoms may change after the visit; follow clinician instructions for brace use and activity limits.",
      diagnosisInstructions:
        "Use a back or neck brace only as directed. Activity should follow provider guidance; avoid bending, lifting, or twisting unless directed otherwise. Take pain medicines only as prescribed. Follow up with orthopedics as directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_SPINE_ESCALATION_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une possible fracture vertébrale (colonne). Les symptômes peuvent évoluer après la visite ; suivez les instructions du clinicien pour l'utilisation d'un corset et les limites d'activité.",
      diagnosisInstructions:
        "Utilisez un corset dorsal ou cervical uniquement selon les directives reçues. L'activité doit suivre les indications du clinicien ; évitez de vous pencher, de soulever des objets ou de vous tordre sauf indication contraire. Prenez les antidouleurs uniquement selon la prescription reçue. Suivez le suivi en orthopédie selon les directives.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_SPINE_ESCALATION_FR,
    }
  );

export const TRAUMA_MSK_FRACTURE_OPEN_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for an open (compound) fracture, where the broken bone was associated with a break in the skin. Open fractures typically need surgery and intravenous antibiotics, and many patients need a hospital stay; if you are going home today, follow the instructions below closely.",
      diagnosisInstructions:
        "Keep the injured area elevated and use a splint or immobilization device only as directed. Keep the dressing clean and dry as directed. Take antibiotics exactly as prescribed and finish the full course. Follow up with orthopedic surgery as directed.",
      medicationTreatment:
        "Take pain medicines and antibiotics only as prescribed or directed during this visit. Finish the full antibiotic course even if you feel better.",
      returnPrecautions:
        "Return immediately or go to the nearest emergency department for severe pain, worsening swelling, numbness, discoloration, inability to move the limb, fever, chills, spreading redness, or worsening symptoms. Seek emergency care for worsening symptoms.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une fracture ouverte (composée), où l'os cassé était associé à une ouverture de la peau. Les fractures ouvertes nécessitent généralement une chirurgie et des antibiotiques intraveineux, et de nombreux patients doivent être hospitalisés ; si vous rentrez à la maison aujourd'hui, suivez attentivement les instructions ci-dessous.",
      diagnosisInstructions:
        "Gardez la zone blessée surélevée et utilisez une attelle ou un dispositif d'immobilisation uniquement selon les directives reçues. Gardez le pansement propre et sec selon les directives. Prenez les antibiotiques exactement comme prescrit et terminez le traitement complet. Suivez le suivi en chirurgie orthopédique selon les directives.",
      medicationTreatment:
        "Prenez les antidouleurs et les antibiotiques uniquement selon la prescription ou les indications reçues pendant cette visite. Terminez le traitement antibiotique complet même si vous vous sentez mieux.",
      returnPrecautions:
        "Retournez immédiatement ou allez à l'urgence la plus proche en cas de douleur intense, d'enflure qui s'aggrave, d'engourdissement, de changement de couleur, d'incapacité à bouger le membre, de fièvre, de frissons, de rougeur qui s'étend ou d'aggravation des symptômes. Consultez en urgence en cas d'aggravation.",
    }
  );

export const TRAUMA_MSK_DISLOCATION_SHOULDER_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a shoulder dislocation or acromioclavicular joint injury. Symptoms may change after the visit.",
      diagnosisInstructions:
        "Use a sling or immobilization device only as directed. Ice and elevate as directed to reduce swelling. Avoid overhead activity until cleared. Follow up with orthopedics as directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_LIMB_ESCALATION_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une luxation de l'épaule ou une blessure de l'articulation acromio-claviculaire. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions:
        "Utilisez une écharpe ou un dispositif d'immobilisation uniquement selon les directives. Glace et surélévation selon les directives pour réduire l'enflure. Évitez les mouvements au-dessus de la tête jusqu'à autorisation. Suivez le suivi en orthopédie selon les directives.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_LIMB_ESCALATION_FR,
    }
  );

export const TRAUMA_MSK_DISLOCATION_ELBOW_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for an elbow dislocation or nursemaid elbow (radial head subluxation). Symptoms may change after the visit.",
      diagnosisInstructions:
        "Use a sling or splint only as directed. Limit lifting and forceful elbow use until follow-up. Watch hand color, warmth, and sensation. Follow up with orthopedics or your clinician as directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_LIMB_ESCALATION_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une luxation du coude ou un poignet de bonne (subluxation de la tête radiale). Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions:
        "Utilisez une écharpe ou une attelle uniquement selon les directives. Limitez le soulèvement et l'usage forcé du coude jusqu'au suivi. Surveillez la couleur, la chaleur et la sensibilité de la main. Suivez le suivi en orthopédie ou avec votre clinicien selon les directives.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_LIMB_ESCALATION_FR,
    }
  );

export const TRAUMA_MSK_DISLOCATION_HIP_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a hip dislocation. Hip dislocations often need urgent reduction and orthopedic care; if you are going home today, follow the instructions below closely.",
      diagnosisInstructions:
        "Keep weight off the affected leg and use assistive devices only as directed. Use immobilization only as directed. Follow up with orthopedic surgery as directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions:
        "Return immediately for worsening pain, numbness, weakness, inability to move the leg, foot discoloration, chest pain, shortness of breath, or fever. Seek emergency care for worsening symptoms.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une luxation de la hanche. Les luxations de la hanche nécessitent souvent une réduction urgente et une prise en charge orthopédique ; si vous rentrez à la maison aujourd'hui, suivez attentivement les instructions ci-dessous.",
      diagnosisInstructions:
        "Évitez de mettre du poids sur la jambe atteinte et utilisez des aides à la marche uniquement selon les directives. Utilisez l'immobilisation uniquement selon les directives. Suivez le suivi en chirurgie orthopédique selon les directives.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur, d'engourdissement, de faiblesse, d'incapacité à bouger la jambe, de changement de couleur du pied, de douleur thoracique, de difficulté à respirer ou de fièvre. Consultez en urgence en cas d'aggravation.",
    }
  );

export const TRAUMA_MSK_DISLOCATION_PATELLA_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a kneecap (patella) dislocation or related knee joint dislocation. Symptoms may change after the visit.",
      diagnosisInstructions:
        "Use a knee immobilizer or brace only as directed. Ice and elevate the knee as directed. Limit weight-bearing as directed. Follow up with orthopedics as directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_LIMB_ESCALATION_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une luxation de la rotule ou une luxation articulaire du genou associée. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions:
        "Utilisez une attelle ou une orthèse de genou uniquement selon les directives. Glace et surélévation du genou selon les directives. Limitez la mise en charge selon les directives. Suivez le suivi en orthopédie selon les directives.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_LIMB_ESCALATION_FR,
    }
  );

export const TRAUMA_MSK_DISLOCATION_HAND_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a hand, finger, thumb, or wrist dislocation. Symptoms may change after the visit.",
      diagnosisInstructions:
        "Use a splint only as directed. Ice and elevate the hand above the heart as directed. Keep the splint clean and dry. Follow up with orthopedics or hand surgery as directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_LIMB_ESCALATION_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une luxation de la main, du doigt, du pouce ou du poignet. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions:
        "Utilisez une attelle uniquement selon les directives. Glace et surélévation de la main au-dessus du cœur selon les directives. Gardez l'attelle propre et sèche. Suivez le suivi en orthopédie ou en chirurgie de la main selon les directives.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_LIMB_ESCALATION_FR,
    }
  );

export const TRAUMA_MSK_DISLOCATION_JAW_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a jaw (TMJ) dislocation. Symptoms may change after the visit.",
      diagnosisInstructions:
        "Eat a soft diet only as directed. Avoid wide mouth opening, hard chewing, and yawning forcefully. Follow up as directed for maxillofacial or ENT evaluation.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions:
        "Return immediately for inability to close the mouth, worsening pain, new facial numbness, difficulty breathing, or recurrent jaw locking. Seek emergency care for worsening symptoms.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une luxation de la mâchoire (ATM). Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions:
        "Alimentation molle uniquement selon les directives. Évitez d'ouvrir largement la bouche, de mâcher des aliments durs et de bâiller avec force. Suivez le suivi maxillo-facial ou ORL selon les directives.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'incapacité à fermer la bouche, d'aggravation de la douleur, de nouvel engourdissement du visage, de difficulté à respirer ou de blocage récidivant de la mâchoire. Consultez en urgence en cas d'aggravation.",
    }
  );

export const TRAUMA_MSK_DISLOCATION_GENERIC_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a joint dislocation. Symptoms may change after the visit.",
      diagnosisInstructions:
        "Use a splint, brace, or immobilization device only as directed. Ice and elevate as directed. Limit activity as directed. Follow up with orthopedics as directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_LIMB_ESCALATION_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une luxation articulaire. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions:
        "Utilisez une attelle, une orthèse ou un dispositif d'immobilisation uniquement selon les directives. Glace et surélévation selon les directives. Limitez l'activité selon les directives. Suivez le suivi en orthopédie selon les directives.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_LIMB_ESCALATION_FR,
    }
  );

export const TRAUMA_MSK_SPRAIN_GENERIC_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a sprain or strain. Symptoms may change after the visit.",
      diagnosisInstructions:
        "Rest, ice, compression, and elevation as directed. Use a brace or wrap only as directed. Limit activity and return to sport only when cleared. Follow up as directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_LIMB_ESCALATION_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une entorse ou une élongation. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions:
        "Repos, glace, compression et surélévation selon les directives. Utilisez une orthèse ou un bandage uniquement selon les directives. Limitez l'activité et ne reprenez le sport que lorsqu'autorisé. Suivez le suivi selon les directives.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_LIMB_ESCALATION_FR,
    }
  );

export const TRAUMA_MSK_TENDON_ACHILLES_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for an Achilles tendon injury. Symptoms may change after the visit.",
      diagnosisInstructions:
        "Use the boot, cast, or immobilization device only as directed. Do not bear weight unless cleared. Follow orthopedic or sports-medicine follow-up as directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_LIMB_ESCALATION_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une lésion du tendon d'Achille. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions:
        "Utilisez la botte, le plâtre ou le dispositif d'immobilisation uniquement selon les directives. Ne portez pas de poids sauf autorisation. Suivez le suivi en orthopédie ou médecine du sport selon les directives.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_LIMB_ESCALATION_FR,
    }
  );

export const TRAUMA_MSK_TENDON_EXTENSOR_MECHANISM_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a quadriceps or patellar tendon injury. Symptoms may change after the visit.",
      diagnosisInstructions:
        "Keep the knee immobilized as directed. Do not bear weight unless cleared. Follow orthopedic follow-up urgently as directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_LIMB_ESCALATION_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une lésion du tendon du quadriceps ou du tendon rotulien. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions:
        "Gardez le genou immobilisé selon les directives. Ne portez pas de poids sauf autorisation. Suivez le suivi orthopédique en urgence selon les directives.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_LIMB_ESCALATION_FR,
    }
  );

export const TRAUMA_MSK_TENDON_SHOULDER_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a shoulder tendon injury such as rotator cuff or biceps tendon injury. Symptoms may change after the visit.",
      diagnosisInstructions:
        "Use a sling only as directed. Limit lifting and overhead activity. Follow orthopedic or sports-medicine follow-up as directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_LIMB_ESCALATION_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une lésion tendineuse de l'épaule, comme une lésion de la coiffe ou du biceps. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions:
        "Utilisez une écharpe uniquement selon les directives. Limitez le port de charges et les mouvements au-dessus de la tête. Suivez le suivi en orthopédie ou médecine du sport selon les directives.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_LIMB_ESCALATION_FR,
    }
  );

export const TRAUMA_MSK_TENDON_HAND_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a hand or finger tendon injury. Symptoms may change after the visit.",
      diagnosisInstructions:
        "Keep the splint on as directed. Do not remove the tendon splint without clinician advice. Follow hand-surgery follow-up as directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_LIMB_ESCALATION_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une lésion tendineuse de la main ou du doigt. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions:
        "Gardez l'attelle selon les directives. Ne retirez pas l'attelle tendineuse sans avis clinique. Suivez le suivi en chirurgie de la main selon les directives.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_LIMB_ESCALATION_FR,
    }
  );

export const TRAUMA_MSK_TENDON_GENERIC_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a tendon injury. Symptoms may change after the visit.",
      diagnosisInstructions:
        "Use immobilization and activity limits only as directed. Protect the injured tendon and follow specialty follow-up as directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_LIMB_ESCALATION_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une lésion tendineuse. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions:
        "Utilisez l'immobilisation et les limites d'activité uniquement selon les directives. Protégez le tendon blessé et suivez le suivi spécialisé selon les directives.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_LIMB_ESCALATION_FR,
    }
  );

export const TRAUMA_MSK_LIGAMENT_KNEE_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a knee ligament injury. Symptoms may change after the visit.",
      diagnosisInstructions:
        "Use the brace as directed. Limit weight-bearing if instructed. Do not return to sport until cleared. Follow orthopedic or sports-medicine follow-up as directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_LIMB_ESCALATION_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une lésion ligamentaire du genou. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions:
        "Utilisez l'orthèse selon les directives. Limitez l'appui si indiqué. Ne reprenez le sport que lorsqu'autorisé. Suivez le suivi en orthopédie ou médecine du sport selon les directives.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_LIMB_ESCALATION_FR,
    }
  );

export const TRAUMA_MSK_LIGAMENT_ANKLE_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for an ankle ligament injury, including high-ankle or syndesmotic injury when applicable. Symptoms may change after the visit.",
      diagnosisInstructions:
        "Use the brace or boot as directed. Protect weight-bearing as instructed. Follow orthopedic follow-up as directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_LIMB_ESCALATION_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une lésion ligamentaire de la cheville, y compris une entorse haute ou une lésion de la syndesmose le cas échéant. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions:
        "Utilisez l'orthèse ou la botte selon les directives. Protégez l'appui selon les indications. Suivez le suivi orthopédique selon les directives.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_LIMB_ESCALATION_FR,
    }
  );

export const TRAUMA_MSK_LIGAMENT_HAND_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a thumb or finger ligament injury. Symptoms may change after the visit.",
      diagnosisInstructions:
        "Keep the splint or thumb spica immobilization as directed. Follow hand-surgery follow-up as directed for stability assessment.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_LIMB_ESCALATION_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une lésion ligamentaire du pouce ou du doigt. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions:
        "Gardez l'attelle ou l'immobilisation en spica du pouce selon les directives. Suivez le suivi en chirurgie de la main selon les directives pour évaluer la stabilité.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_LIMB_ESCALATION_FR,
    }
  );

export const TRAUMA_MSK_LIGAMENT_UPPER_EXTREMITY_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a wrist or elbow ligament injury. Symptoms may change after the visit.",
      diagnosisInstructions:
        "Use the splint or brace as directed. Limit loading of the joint. Follow orthopedic or hand-surgery follow-up as directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_LIMB_ESCALATION_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une lésion ligamentaire du poignet ou du coude. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions:
        "Utilisez l'attelle ou l'orthèse selon les directives. Limitez la charge sur l'articulation. Suivez le suivi en orthopédie ou chirurgie de la main selon les directives.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_LIMB_ESCALATION_FR,
    }
  );

export const TRAUMA_MSK_LIGAMENT_SHOULDER_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a shoulder or acromioclavicular ligament injury. Symptoms may change after the visit.",
      diagnosisInstructions:
        "Use a sling as directed. Limit overhead activity. Follow orthopedic follow-up as directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_LIMB_ESCALATION_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une lésion ligamentaire de l'épaule ou acromio-claviculaire. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions:
        "Utilisez une écharpe selon les directives. Limitez les mouvements au-dessus de la tête. Suivez le suivi orthopédique selon les directives.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_LIMB_ESCALATION_FR,
    }
  );

export const TRAUMA_MSK_LIGAMENT_GENERIC_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a ligament injury. Symptoms may change after the visit.",
      diagnosisInstructions:
        "Use bracing and activity limits as directed. Protect the injured ligament and follow specialty follow-up as directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_LIMB_ESCALATION_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une lésion ligamentaire. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions:
        "Utilisez l'orthèse et les limites d'activité selon les directives. Protégez le ligament blessé et suivez le suivi spécialisé selon les directives.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_LIMB_ESCALATION_FR,
    }
  );

export const TRAUMA_MSK_CRUSH_HAND_FINGER_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description: "You were evaluated in the emergency department for a crush injury of the hand or finger. Symptoms may change after the visit.",
      diagnosisInstructions: "Elevate the hand. Use ice if directed. Keep dressings clean and dry. Watch for increasing pain, numbness, pale or cold fingers, or pain with finger stretch. Follow specialty follow-up as directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_LIMB_ESCALATION_EN + " Also return for dark urine, severe swelling, or pain out of proportion to the injury.",
    },
    {
      description: "Vous avez été pris en charge aux urgences pour un écrasement de la main ou du doigt. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions: "Surélevez la main. Utilisez de la glace si indiqué. Gardez les pansements propres et secs. Surveillez une douleur croissante, un engourdissement, des doigts pâles ou froids, ou une douleur à l'étirement. Suivez le suivi spécialisé selon les directives.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_LIMB_ESCALATION_FR + " Revenez aussi pour des urines foncées, un gonflement sévère ou une douleur disproportionnée.",
    }
  );

export const TRAUMA_MSK_CRUSH_UPPER_EXTREMITY_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description: "You were evaluated for an upper-extremity crush injury. Symptoms may change after the visit.",
      diagnosisInstructions: "Elevate the limb. Protect the injured area. Monitor swelling, sensation, color, and pain with passive stretch. Follow orthopedic follow-up as directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_LIMB_ESCALATION_EN + " Return for dark urine or severe increasing pain.",
    },
    {
      description: "Vous avez été pris en charge pour un écrasement du membre supérieur. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions: "Surélevez le membre. Protégez la zone blessée. Surveillez le gonflement, la sensibilité, la couleur et la douleur à l'étirement passif. Suivez le suivi orthopédique selon les directives.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_LIMB_ESCALATION_FR + " Revenez pour des urines foncées ou une douleur sévère croissante.",
    }
  );

export const TRAUMA_MSK_CRUSH_LOWER_EXTREMITY_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description: "You were evaluated for a lower-extremity crush injury. Symptoms may change after the visit.",
      diagnosisInstructions: "Elevate the limb. Follow weight-bearing limits as directed. Monitor compartment and perfusion warning signs. Follow specialty follow-up as directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_LIMB_ESCALATION_EN + " Return for inability to walk safely, dark urine, or severe pain.",
    },
    {
      description: "Vous avez été pris en charge pour un écrasement du membre inférieur. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions: "Surélevez le membre. Respectez les consignes d'appui. Surveillez les signes de loges et de perfusion. Suivez le suivi spécialisé selon les directives.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_LIMB_ESCALATION_FR + " Revenez si marche impossible, urines foncées ou douleur sévère.",
    }
  );

export const TRAUMA_MSK_CRUSH_FOOT_TOE_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description: "You were evaluated for a crush injury of the foot or toe. Symptoms may change after the visit.",
      diagnosisInstructions: "Elevate the foot. Keep dressings clean. Limit weight-bearing if instructed. Watch for worsening swelling, numbness, or color change.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_LIMB_ESCALATION_EN,
    },
    {
      description: "Vous avez été pris en charge pour un écrasement du pied ou de l'orteil. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions: "Surélevez le pied. Gardez les pansements propres. Limitez l'appui si indiqué. Surveillez un gonflement, un engourdissement ou un changement de couleur.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_LIMB_ESCALATION_FR,
    }
  );

export const TRAUMA_MSK_CRUSH_CHEST_ABDOMEN_PELVIS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description: "You were evaluated for a torso crush injury. Many of these injuries require observation, admission, or transfer rather than routine home care alone.",
      diagnosisInstructions: "Follow the disposition plan given by your clinician. Monitor breathing, abdominal pain, dizziness, and urine color. Do not ignore worsening chest or abdominal pain.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: "Return immediately for shortness of breath, severe chest or abdominal pain, fainting, vomiting blood, dark urine, confusion, or any concerning symptom.",
    },
    {
      description: "Vous avez été pris en charge pour un écrasement du tronc. Beaucoup de ces blessures nécessitent observation, hospitalisation ou transfert plutôt que des soins à domicile seuls.",
      diagnosisInstructions: "Suivez le plan de disposition donné par votre clinicien. Surveillez la respiration, la douleur abdominale, les étourdissements et la couleur des urines.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: "Retournez immédiatement pour essoufflement, douleur thoracique ou abdominale sévère, évanouissement, vomissements de sang, urines foncées, confusion ou tout signe préoccupant.",
    }
  );

export const TRAUMA_MSK_CRUSH_PROLONGED_COMPRESSION_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description: "You were evaluated after prolonged compression or crush syndrome concern. Close monitoring of muscle injury and kidney risk may be required.",
      diagnosisInstructions: "Follow hydration and lab follow-up instructions exactly. Watch for dark urine, severe pain, swelling, numbness, severe muscle pain, weakness, or confusion. Specialty or hospital follow-up may be required.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: "Return immediately for dark urine, severe muscle pain, weakness, irregular heartbeat symptoms, confusion, or inability to urinate.",
    },
    {
      description: "Vous avez été pris en charge après une compression prolongée ou une suspicion de crush syndrome. Une surveillance de la lésion musculaire et du risque rénal peut être nécessaire.",
      diagnosisInstructions: "Suivez exactement les consignes d'hydratation et de bilans. Surveillez des urines foncées, une douleur intense, une enflure, un engourdissement, une douleur musculaire sévère, une faiblesse ou une confusion.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: "Retournez immédiatement pour urines foncées, douleur musculaire sévère, faiblesse, symptômes de rythme cardiaque irrégulier, confusion ou impossibilité d'uriner.",
    }
  );

export const TRAUMA_MSK_CRUSH_DEGLOVING_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description: "You were evaluated for a degloving or severe soft-tissue crush injury. Reconstructive specialty care is often required.",
      diagnosisInstructions: "Keep dressings clean and dry. Do not remove specialty dressings unless directed. Elevate if instructed. Follow plastics or orthopedic follow-up urgently as directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_LIMB_ESCALATION_EN + " Return for increasing foul drainage, fever, or tissue color change.",
    },
    {
      description: "Vous avez été pris en charge pour un dégantage ou un écrasement sévère des tissus mous. Des soins reconstructeurs sont souvent nécessaires.",
      diagnosisInstructions: "Gardez les pansements propres et secs. Ne retirez pas les pansements spécialisés sauf indication. Surélevez si indiqué. Suivez le suivi en chirurgie plastique ou orthopédie en urgence selon les directives.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_LIMB_ESCALATION_FR + " Revenez pour écoulement malodorant, fièvre ou changement de couleur des tissus.",
    }
  );

export const TRAUMA_MSK_CRUSH_COMPARTMENT_RISK_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description: "You were evaluated for a crush injury with compartment syndrome concern. Urgent return precautions are critical.",
      diagnosisInstructions: "Elevate as directed. Do not ignore increasing pain, numbness, pale or cold limb, or pain with passive stretch. Follow urgent specialty instructions exactly.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: "Return immediately for pain out of proportion, increasing numbness, pale or cold limb, severe swelling, or pain with stretch.",
    },
    {
      description: "Vous avez été pris en charge pour un écrasement avec risque de syndrome des loges. Les consignes de retour urgent sont essentielles.",
      diagnosisInstructions: "Surélevez selon les directives. N'ignorez pas une douleur croissante, un engourdissement, un membre pâle ou froid, ou une douleur à l'étirement passif.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: "Retournez immédiatement pour douleur disproportionnée, engourdissement croissant, membre pâle ou froid, gonflement sévère ou douleur à l'étirement.",
    }
  );

export const TRAUMA_MSK_CRUSH_GENERIC_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description: "You were evaluated for a crush injury. Symptoms may change after the visit.",
      diagnosisInstructions: "Elevate and protect the injured area. Monitor swelling, sensation, color, and urine color if instructed. Follow specialty follow-up as directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: MSK_LIMB_ESCALATION_EN + " Return for dark urine or severe increasing pain.",
    },
    {
      description: "Vous avez été pris en charge pour un écrasement. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions: "Surélevez et protégez la zone blessée. Surveillez le gonflement, la sensibilité, la couleur et la couleur des urines si indiqué. Suivez le suivi spécialisé selon les directives.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: MSK_LIMB_ESCALATION_FR + " Revenez pour urines foncées ou douleur sévère croissante.",
    }
  );

function burnSuggestedText(
  descriptionEn: string,
  instructionsEn: string,
  returnEn: string,
  descriptionFr: string,
  instructionsFr: string,
  returnFr: string
): ProviderDischargeTemplateSuggestedText {
  return localizedSuggestedText(
    {
      description: descriptionEn,
      diagnosisInstructions: `Keep the wound clean and protect the dressing as instructed. ${instructionsEn} Arrange follow-up within 24–48 hours or as directed.`,
      medicationTreatment: "Use pain treatment only as prescribed or recommended by your clinician; do not start medicines on your own.",
      returnPrecautions: `Return urgently for increasing pain, spreading redness, swelling, fever, pus or foul drainage, or a wet/loose dressing. ${returnEn}`,
    },
    {
      description: descriptionFr,
      diagnosisInstructions: `Gardez la brûlure propre et protégez le pansement selon les consignes. ${instructionsFr} Organisez un suivi dans les 24 à 48 heures ou selon les directives.`,
      medicationTreatment: "Utilisez le traitement contre la douleur seulement tel que prescrit ou recommandé par votre clinicien; ne commencez pas de médicament de votre propre initiative.",
      returnPrecautions: `Retournez rapidement pour douleur croissante, rougeur qui s'étend, gonflement, fièvre, pus ou écoulement malodorant, ou pansement mouillé ou déplacé. ${returnFr}`,
    }
  );
}

export const BURN_SUPERFICIAL_SUGGESTED_TEXT = burnSuggestedText(
  "You were evaluated for a superficial burn.",
  "Avoid friction and sun exposure; do not break blisters if they develop.",
  "Return for blistering over a large area or symptoms that are getting worse instead of better.",
  "Vous avez été pris en charge pour une brûlure superficielle.",
  "Évitez les frottements et l'exposition au soleil; ne percez pas les cloques si elles apparaissent.",
  "Retournez si des cloques couvrent une grande zone ou si les symptômes s'aggravent au lieu de s'améliorer."
);
export const BURN_PARTIAL_THICKNESS_SUGGESTED_TEXT = burnSuggestedText(
  "You were evaluated for a partial-thickness burn.",
  "Do not remove the dressing or break blisters unless your clinician told you to do so.",
  "Return for new numbness, worsening blistering, or skin that becomes pale, dark, or tight.",
  "Vous avez été pris en charge pour une brûlure d'épaisseur partielle.",
  "Ne retirez pas le pansement et ne percez pas les cloques sauf consigne du clinicien.",
  "Retournez pour un nouvel engourdissement, des cloques qui s'aggravent, ou une peau pâle, foncée ou tendue."
);
export const BURN_FULL_THICKNESS_FOLLOWUP_SUGGESTED_TEXT = burnSuggestedText(
  "You were evaluated for a deep or full-thickness burn.",
  "Keep the dressing intact and follow burn-specialty or surgical instructions without delay.",
  "Return immediately for numbness, a cold or pale area, rapidly increasing swelling, or any breathing difficulty.",
  "Vous avez été pris en charge pour une brûlure profonde ou de pleine épaisseur.",
  "Gardez le pansement intact et suivez sans délai les consignes du spécialiste des brûlures ou du chirurgien.",
  "Retournez immédiatement pour engourdissement, zone froide ou pâle, gonflement rapide ou toute difficulté respiratoire."
);
export const BURN_FACE_SUGGESTED_TEXT = burnSuggestedText(
  "You were evaluated for a facial burn.",
  "Protect the facial dressing and avoid products near the eyes, mouth, or nose unless prescribed.",
  "Return immediately for hoarseness, cough, soot in the mouth, trouble swallowing, eye pain, vision change, or breathing difficulty.",
  "Vous avez été pris en charge pour une brûlure du visage.",
  "Protégez le pansement du visage et évitez les produits près des yeux, de la bouche ou du nez sauf prescription.",
  "Retournez immédiatement pour voix rauque, toux, suie dans la bouche, difficulté à avaler, douleur oculaire, changement de vision ou difficulté respiratoire."
);
export const BURN_HAND_SUGGESTED_TEXT = burnSuggestedText(
  "You were evaluated for a hand burn.",
  "Keep the hand elevated when resting and move the fingers only as instructed.",
  "Return immediately for numbness, tingling, blue/pale/cold fingers, increasing tightness, or inability to move the fingers.",
  "Vous avez été pris en charge pour une brûlure de la main.",
  "Gardez la main surélevée au repos et bougez les doigts seulement selon les consignes.",
  "Retournez immédiatement pour engourdissement, fourmillements, doigts bleus, pâles ou froids, tension croissante ou incapacité à bouger les doigts."
);
export const BURN_FOOT_SUGGESTED_TEXT = burnSuggestedText(
  "You were evaluated for a foot burn.",
  "Elevate the foot and limit walking or pressure as directed to protect the dressing.",
  "Return immediately for numbness, tingling, blue/pale/cold toes, worsening swelling, or inability to walk safely.",
  "Vous avez été pris en charge pour une brûlure du pied.",
  "Surélevez le pied et limitez la marche ou l'appui selon les directives pour protéger le pansement.",
  "Retournez immédiatement pour engourdissement, fourmillements, orteils bleus, pâles ou froids, gonflement qui s'aggrave ou marche non sécuritaire."
);
export const BURN_EYE_SUGGESTED_TEXT = burnSuggestedText(
  "You were evaluated for an eye burn.",
  "Do not rub the eye or use drops unless prescribed; protect the eye as directed.",
  "Return immediately for worsening eye pain, light sensitivity, reduced vision, persistent tearing, or inability to open the eye.",
  "Vous avez été pris en charge pour une brûlure de l'œil.",
  "Ne frottez pas l'œil et n'utilisez pas de gouttes sauf prescription; protégez l'œil selon les consignes.",
  "Retournez immédiatement pour douleur oculaire croissante, sensibilité à la lumière, baisse de vision, larmoiement persistant ou incapacité à ouvrir l'œil."
);
export const BURN_CHEMICAL_SUGGESTED_TEXT = burnSuggestedText(
  "You were evaluated for a chemical burn or corrosion.",
  "Follow decontamination and dressing instructions exactly; do not apply neutralizing substances or home remedies.",
  "Return immediately for renewed burning after rinsing, eye exposure, worsening pain, breathing symptoms, or a chemical exposure that was not fully irrigated.",
  "Vous avez été pris en charge pour une brûlure chimique ou une corrosion.",
  "Suivez exactement les consignes de décontamination et de pansement; n'appliquez pas de produit neutralisant ni de remède maison.",
  "Retournez immédiatement si la sensation de brûlure reprend après le rinçage, en cas d'exposition de l'œil, douleur croissante, symptômes respiratoires ou décontamination incomplète."
);
export const BURN_ELECTRICAL_SUGGESTED_TEXT = burnSuggestedText(
  "You were evaluated for an electrical or lightning injury.",
  "Keep entry and exit wounds covered as directed and follow arranged reassessment even if the skin injury appears small.",
  "Return immediately for chest pain, palpitations, fainting, confusion, weakness, dark urine, worsening pain, or numbness.",
  "Vous avez été pris en charge pour une blessure électrique ou par la foudre.",
  "Gardez les points d'entrée et de sortie couverts selon les consignes et respectez le contrôle prévu même si la lésion cutanée paraît petite.",
  "Retournez immédiatement pour douleur thoracique, palpitations, évanouissement, confusion, faiblesse, urines foncées, douleur croissante ou engourdissement."
);
export const BURN_INHALATION_AFTERCARE_SUGGESTED_TEXT = burnSuggestedText(
  "You were evaluated after smoke inhalation or an airway burn.",
  "Avoid smoke and irritants and follow the breathing and wound-care plan given by your clinician.",
  "Return immediately for shortness of breath, wheezing, hoarseness, persistent cough, confusion, severe headache, or worsening facial swelling.",
  "Vous avez été pris en charge après inhalation de fumée ou brûlure des voies aériennes.",
  "Évitez la fumée et les irritants et suivez le plan respiratoire et les soins de brûlure remis par votre clinicien.",
  "Retournez immédiatement pour essoufflement, sifflement, voix rauque, toux persistante, confusion, céphalée intense ou gonflement du visage qui s'aggrave."
);
export const FROSTBITE_SUGGESTED_TEXT = burnSuggestedText(
  "You were evaluated for frostbite or a cold injury.",
  "Keep the area clean, dry, protected from cold, and do not rub it or apply direct heat.",
  "Return immediately for pale, blue, black, numb, cold, or increasingly swollen skin, or new blisters.",
  "Vous avez été pris en charge pour une gelure ou une lésion due au froid.",
  "Gardez la zone propre, sèche, protégée du froid; ne la frottez pas et n'appliquez pas de chaleur directe.",
  "Retournez immédiatement pour peau pâle, bleue, noire, engourdie, froide ou de plus en plus gonflée, ou apparition de nouvelles cloques."
);
export const SUNBURN_SUGGESTED_TEXT = burnSuggestedText(
  "You were evaluated for sunburn.",
  "Protect the skin from further sun exposure, keep the area cool, and maintain hydration as directed.",
  "Return for extensive blistering, fever, vomiting, dizziness, fainting, dehydration, or worsening pain.",
  "Vous avez été pris en charge pour un coup de soleil.",
  "Protégez la peau d'une nouvelle exposition solaire, gardez la zone fraîche et maintenez une bonne hydratation selon les consignes.",
  "Retournez pour cloques étendues, fièvre, vomissements, étourdissements, évanouissement, déshydratation ou douleur croissante."
);

function penetratingTraumaSuggestedText(
  descriptionEn: string,
  instructionsEn: string,
  returnEn: string,
  descriptionFr: string,
  instructionsFr: string,
  returnFr: string
): ProviderDischargeTemplateSuggestedText {
  return localizedSuggestedText(
    {
      description: descriptionEn,
      diagnosisInstructions: `Keep the wound clean and covered as instructed. Do not remove an impaled object. ${instructionsEn} Arrange the follow-up directed by your clinician.`,
      medicationTreatment: "Take pain medicine, antibiotics, tetanus treatment, or other medicines only as prescribed. Do not start, stop, or share medicines without clinician guidance.",
      returnPrecautions: `Return immediately for bleeding that does not stop with direct pressure, worsening pain, numbness, weakness, pale or cold skin, fever, drainage, or other concerning symptoms. ${returnEn}`,
    },
    {
      description: descriptionFr,
      diagnosisInstructions: `Gardez la plaie propre et couverte selon les consignes. Ne retirez pas un objet empalé. ${instructionsFr} Organisez le suivi indiqué par votre clinicien.`,
      medicationTreatment: "Prenez les antalgiques, antibiotiques, traitement antitétanique ou autres médicaments uniquement selon la prescription. Ne commencez pas, n'arrêtez pas et ne partagez pas de médicaments sans avis clinique.",
      returnPrecautions: `Retournez immédiatement en cas de saignement qui ne s'arrête pas avec une pression directe, douleur croissante, engourdissement, faiblesse, peau pâle ou froide, fièvre, écoulement ou autre signe préoccupant. ${returnFr}`,
    }
  );
}

export const PENETRATING_WOUND_MINOR_SUGGESTED_TEXT = penetratingTraumaSuggestedText("You were evaluated for a minor penetrating wound.", "Avoid soaking the wound and protect it from contamination.", "Return for increasing swelling, redness, pus, or wound reopening.", "Vous avez été pris en charge pour une plaie pénétrante mineure.", "Évitez de faire tremper la plaie et protégez-la de la contamination.", "Retournez pour gonflement croissant, rougeur, pus ou réouverture de la plaie.");
export const GUNSHOT_WOUND_EXTREMITY_SUGGESTED_TEXT = penetratingTraumaSuggestedText("You were evaluated after a gunshot wound to an extremity.", "Keep the limb elevated as directed and check color, warmth, sensation, and movement.", "Return immediately for new bleeding, increasing swelling, weakness, numbness, or a cold/pale limb.", "Vous avez été pris en charge après une blessure par balle à un membre.", "Gardez le membre surélevé selon les consignes et surveillez la couleur, la chaleur, la sensibilité et les mouvements.", "Retournez immédiatement pour nouveau saignement, gonflement croissant, faiblesse, engourdissement ou membre froid/pâle.");
export const STAB_WOUND_MINOR_SUGGESTED_TEXT = penetratingTraumaSuggestedText("You were evaluated for a minor stab wound.", "Keep the wound protected and do not probe it at home.", "Return immediately for bleeding, fever, worsening pain, or any new weakness.", "Vous avez été pris en charge pour une plaie mineure par arme blanche.", "Gardez la plaie protégée et ne l'explorez pas à domicile.", "Retournez immédiatement pour saignement, fièvre, douleur croissante ou nouvelle faiblesse.");
export const RETAINED_PROJECTILE_SUGGESTED_TEXT = penetratingTraumaSuggestedText("You were evaluated with a retained projectile or bullet fragment.", "Do not attempt to remove or manipulate the projectile; follow the imaging and specialist plan.", "Return immediately for bleeding, infection, new weakness, numbness, or worsening pain.", "Vous avez été pris en charge avec un projectile ou fragment de balle retenu.", "N'essayez pas de retirer ni de manipuler le projectile; suivez le plan d'imagerie et de spécialiste.", "Retournez immédiatement pour saignement, infection, nouvelle faiblesse, engourdissement ou douleur croissante.");
export const PENETRATING_HAND_INJURY_SUGGESTED_TEXT = penetratingTraumaSuggestedText("You were evaluated for a penetrating hand injury.", "Elevate the hand and move fingers only as directed.", "Return immediately for numbness, weakness, inability to move fingers, or pale/blue/cold fingers.", "Vous avez été pris en charge pour une blessure pénétrante de la main.", "Surélevez la main et bougez les doigts seulement selon les consignes.", "Retournez immédiatement pour engourdissement, faiblesse, incapacité à bouger les doigts ou doigts pâles, bleus ou froids.");
export const PENETRATING_FOOT_INJURY_SUGGESTED_TEXT = penetratingTraumaSuggestedText("You were evaluated for a penetrating foot injury.", "Limit weight bearing as directed and keep the foot elevated.", "Return immediately for inability to walk, numbness, or pale/blue/cold toes.", "Vous avez été pris en charge pour une blessure pénétrante du pied.", "Limitez l'appui selon les consignes et surélevez le pied.", "Retournez immédiatement pour incapacité à marcher, engourdissement ou orteils pâles, bleus ou froids.");
export const PENETRATING_FACE_SUGGESTED_TEXT = penetratingTraumaSuggestedText("You were evaluated for a penetrating facial injury.", "Protect the area and do not place products in the wound unless instructed.", "Return immediately for vision changes, trouble breathing or swallowing, bleeding, confusion, or worsening swelling.", "Vous avez été pris en charge pour une blessure pénétrante du visage.", "Protégez la zone et n'appliquez aucun produit dans la plaie sans consigne.", "Retournez immédiatement pour changement de vision, difficulté à respirer ou avaler, saignement, confusion ou gonflement croissant.");
export const PENETRATING_EYE_FOLLOWUP_SUGGESTED_TEXT = penetratingTraumaSuggestedText("You were evaluated for a penetrating eye injury.", "Do not rub, press on, or remove anything from the eye; use the eye shield if provided.", "Return immediately for worsening eye pain, reduced vision, vomiting, severe headache, or drainage.", "Vous avez été pris en charge pour une blessure pénétrante de l'œil.", "Ne frottez pas, n'appuyez pas sur l'œil et ne retirez rien de l'œil; utilisez la coque oculaire si elle a été fournie.", "Retournez immédiatement pour douleur oculaire croissante, baisse de vision, vomissements, mal de tête sévère ou écoulement.");
export const PENETRATING_CHEST_SUGGESTED_TEXT = penetratingTraumaSuggestedText("You were evaluated after a penetrating chest injury. Such injuries often require admission or transfer; discharge applies only after clinician evaluation.", "Follow the trauma plan exactly and avoid exertion.", "Return immediately for shortness of breath, chest pain, coughing blood, fainting, confusion, or any worsening symptom.", "Vous avez été pris en charge après une blessure pénétrante du thorax. Ces blessures nécessitent souvent une admission ou un transfert; le retour à domicile ne s'applique qu'après évaluation clinique.", "Suivez exactement le plan de traumatologie et évitez les efforts.", "Retournez immédiatement pour essoufflement, douleur thoracique, crachats de sang, évanouissement, confusion ou aggravation.");
export const PENETRATING_ABDOMEN_SUGGESTED_TEXT = penetratingTraumaSuggestedText("You were evaluated after a penetrating abdominal injury. Such injuries often require admission or transfer; discharge applies only after clinician evaluation.", "Follow the trauma plan exactly and avoid eating or drinking restrictions only as directed.", "Return immediately for worsening abdominal pain, vomiting, fainting, abdominal swelling, bleeding, or fever.", "Vous avez été pris en charge après une blessure pénétrante de l'abdomen. Ces blessures nécessitent souvent une admission ou un transfert; le retour à domicile ne s'applique qu'après évaluation clinique.", "Suivez exactement le plan de traumatologie et les consignes d'alimentation ou de boisson.", "Retournez immédiatement pour douleur abdominale croissante, vomissements, évanouissement, distension abdominale, saignement ou fièvre.");
export const PENETRATING_NECK_SUGGESTED_TEXT = penetratingTraumaSuggestedText("You were evaluated after a penetrating neck injury. Such injuries often require admission or transfer; discharge applies only after clinician evaluation.", "Keep the area protected and follow the trauma plan exactly.", "Return immediately for trouble breathing, swallowing, voice change, bleeding, weakness, confusion, or increasing neck swelling.", "Vous avez été pris en charge après une blessure pénétrante du cou. Ces blessures nécessitent souvent une admission ou un transfert; le retour à domicile ne s'applique qu'après évaluation clinique.", "Gardez la zone protégée et suivez exactement le plan de traumatologie.", "Retournez immédiatement pour difficulté à respirer, avaler, changement de voix, saignement, faiblesse, confusion ou gonflement croissant du cou.");
export const PENETRATING_HEAD_SUGGESTED_TEXT = penetratingTraumaSuggestedText("You were evaluated after a penetrating head injury. Such injuries often require admission or transfer; discharge applies only after clinician evaluation.", "Have a responsible adult monitor you if directed and avoid alcohol or sedating medicines unless prescribed.", "Return immediately for severe headache, vomiting, confusion, seizure, weakness, vision change, or bleeding.", "Vous avez été pris en charge après une blessure pénétrante de la tête. Ces blessures nécessitent souvent une admission ou un transfert; le retour à domicile ne s'applique qu'après évaluation clinique.", "Faites-vous surveiller par un adulte responsable si indiqué et évitez l'alcool ou les médicaments sédatifs sauf prescription.", "Retournez immédiatement pour mal de tête sévère, vomissements, confusion, convulsion, faiblesse, changement de vision ou saignement.");
export const POST_WOUND_EXPLORATION_SUGGESTED_TEXT = PENETRATING_WOUND_MINOR_SUGGESTED_TEXT;
export const POST_FOREIGN_BODY_REMOVAL_SUGGESTED_TEXT = RETAINED_PROJECTILE_SUGGESTED_TEXT;
export const POST_TOURNIQUET_EXTREMITY_SUGGESTED_TEXT = GUNSHOT_WOUND_EXTREMITY_SUGGESTED_TEXT;

function blastPolytraumaSuggestedText(descriptionEn: string, returnEn: string, descriptionFr: string, returnFr: string): ProviderDischargeTemplateSuggestedText {
  return localizedSuggestedText(
    {
      description: descriptionEn,
      diagnosisInstructions: "Follow the trauma plan and activity restrictions provided by your clinician. Blast-related symptoms can be delayed; keep all directed follow-up.",
      medicationTreatment: "Take medicines only as prescribed. Do not start, stop, or share medicines without clinician guidance.",
      returnPrecautions: `Return immediately for trouble breathing, chest pain, worsening abdominal pain, vomiting, confusion, weakness, fainting, new hearing loss, increasing pain, or any worsening symptom. ${returnEn}`,
    },
    {
      description: descriptionFr,
      diagnosisInstructions: "Suivez le plan de traumatologie et les restrictions d'activité indiqués par votre clinicien. Des symptômes liés à l'explosion peuvent être retardés; respectez tous les suivis indiqués.",
      medicationTreatment: "Prenez les médicaments uniquement selon la prescription. Ne commencez pas, n'arrêtez pas et ne partagez pas de médicaments sans avis clinique.",
      returnPrecautions: `Retournez immédiatement en cas de difficulté à respirer, douleur thoracique, douleur abdominale croissante, vomissements, confusion, faiblesse, évanouissement, nouvelle perte auditive, douleur croissante ou aggravation. ${returnFr}`,
    },
  );
}

export const BLAST_EAR_INJURY_SUGGESTED_TEXT = blastPolytraumaSuggestedText("You were evaluated for blast-related ear injury.", "Return for ringing, vertigo, drainage, reduced hearing, or severe ear pain.", "Vous avez été pris en charge pour une blessure de l'oreille liée à une explosion.", "Retournez pour acouphènes, vertiges, écoulement, baisse d'audition ou douleur auriculaire sévère.");
export const BLAST_LUNG_AFTERCARE_SUGGESTED_TEXT = blastPolytraumaSuggestedText("You were evaluated after possible blast-related pressure injury.", "Return immediately for shortness of breath, cough, coughing blood, or worsening chest pain.", "Vous avez été pris en charge après un possible effet de pression lié à une explosion.", "Retournez immédiatement pour essoufflement, toux, crachats de sang ou douleur thoracique croissante.");
export const BLAST_ABDOMINAL_OBSERVATION_SUGGESTED_TEXT = blastPolytraumaSuggestedText("You were evaluated after blast exposure with abdominal injury concern.", "Return immediately for worsening abdominal pain, repeated vomiting, distension, fainting, or bleeding.", "Vous avez été pris en charge après une exposition à une explosion avec préoccupation de blessure abdominale.", "Retournez immédiatement pour douleur abdominale croissante, vomissements répétés, distension, évanouissement ou saignement.");
export const BLAST_MILD_TBI_SUGGESTED_TEXT = blastPolytraumaSuggestedText("You were evaluated for possible blast-related mild head injury.", "Have a responsible adult monitor you as directed; return for worsening headache, vomiting, confusion, seizure, or weakness.", "Vous avez été pris en charge pour un possible traumatisme crânien léger lié à une explosion.", "Faites-vous surveiller par un adulte responsable selon les consignes; retournez pour mal de tête croissant, vomissements, confusion, convulsion ou faiblesse.");
export const BLAST_FRAGMENT_WOUND_SUGGESTED_TEXT = blastPolytraumaSuggestedText("You were evaluated for fragment or shrapnel injury after an explosion.", "Do not probe or remove retained material; return for bleeding, numbness, weakness, fever, or drainage.", "Vous avez été pris en charge pour une blessure par fragment ou éclat après une explosion.", "N'explorez pas et ne retirez pas de matériel retenu; retournez pour saignement, engourdissement, faiblesse, fièvre ou écoulement.");
export const BLAST_BURN_AFTERCARE_SUGGESTED_TEXT = blastPolytraumaSuggestedText("You were evaluated for an explosion-related burn.", "Keep the burn protected and return for breathing symptoms, spreading redness, fever, drainage, or worsening pain.", "Vous avez été pris en charge pour une brûlure liée à une explosion.", "Gardez la brûlure protégée et retournez pour symptômes respiratoires, rougeur qui s'étend, fièvre, écoulement ou douleur croissante.");
export const BLAST_CRUSH_AFTERCARE_SUGGESTED_TEXT = blastPolytraumaSuggestedText("You were evaluated after blast-related compression or entrapment.", "Return for increasing swelling, numbness, weakness, dark urine, reduced urine, or worsening limb pain.", "Vous avez été pris en charge après compression ou ensevelissement lié à une explosion.", "Retournez pour gonflement croissant, engourdissement, faiblesse, urines foncées, diminution des urines ou douleur croissante d'un membre.");
export const POST_STRUCTURAL_COLLAPSE_SUGGESTED_TEXT = BLAST_CRUSH_AFTERCARE_SUGGESTED_TEXT;
export const POLYTRAUMA_FOLLOWUP_SUGGESTED_TEXT = blastPolytraumaSuggestedText("You were evaluated for multiple injuries after trauma.", "Keep all trauma follow-up and return immediately for a new or worsening symptom.", "Vous avez été pris en charge pour plusieurs blessures après un traumatisme.", "Respectez tous les suivis de traumatologie et retournez immédiatement pour un symptôme nouveau ou aggravé.");
export const BLAST_INJURY_MINOR_SUGGESTED_TEXT = blastPolytraumaSuggestedText("You were evaluated after explosion exposure.", "Return for delayed breathing, abdominal, neurologic, hearing, burn, or crush symptoms.", "Vous avez été pris en charge après une exposition à une explosion.", "Retournez pour symptômes respiratoires, abdominaux, neurologiques, auditifs, de brûlure ou d'écrasement retardés.");

export const TRAUMA_MSK_AMPUTATION_FINGER_THUMB_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description: "You were evaluated for a traumatic finger or thumb amputation. Specialty care is often time-sensitive.",
      diagnosisInstructions: "Keep dressings clean and dry. Elevate the hand. Control bleeding as instructed. Take antibiotics if prescribed. Follow hand-surgery or transfer instructions exactly. Amputated-part storage instructions apply only if your clinician provided them.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: "Return immediately for uncontrolled bleeding, increasing pain, fever, foul drainage, or dressing soaked through.",
    },
    {
      description: "Vous avez été pris en charge pour une amputation traumatique du doigt ou du pouce. Les soins spécialisés sont souvent urgents.",
      diagnosisInstructions: "Gardez les pansements propres et secs. Surélevez la main. Contrôlez le saignement selon les consignes. Prenez les antibiotiques si prescrits. Suivez exactement les consignes de chirurgie de la main ou de transfert.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: "Retournez immédiatement pour saignement non contrôlé, douleur croissante, fièvre, écoulement malodorant ou pansement saturé.",
    }
  );

export const TRAUMA_MSK_AMPUTATION_HAND_UPPER_EXTREMITY_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description: "You were evaluated for a traumatic hand or upper-extremity amputation. Admission or transfer is commonly required.",
      diagnosisInstructions: "Follow hemorrhage-control and dressing care exactly. Keep the limb elevated if instructed. Follow operative or transfer center instructions without delay.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: "Return immediately for uncontrolled bleeding, pale or cold remaining limb, severe pain, fever, or dressing failure.",
    },
    {
      description: "Vous avez été pris en charge pour une amputation traumatique de la main ou du membre supérieur. L'hospitalisation ou le transfert est souvent nécessaire.",
      diagnosisInstructions: "Suivez exactement le contrôle de l'hémorragie et les soins de pansement. Surélevez le membre si indiqué. Suivez sans délai les consignes opératoires ou de transfert.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: "Retournez immédiatement pour saignement non contrôlé, membre restant pâle ou froid, douleur sévère, fièvre ou échec du pansement.",
    }
  );

export const TRAUMA_MSK_AMPUTATION_TOE_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description: "You were evaluated for a traumatic toe amputation.",
      diagnosisInstructions: "Keep stump dressings clean and dry. Elevate the foot. Limit weight-bearing if instructed. Follow orthopedic follow-up as directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions:
        "Return immediately for uncontrolled bleeding, worsening pain, numbness, swelling, fever, foul drainage, or inability to walk safely.",
    },
    {
      description: "Vous avez été pris en charge pour une amputation traumatique d'orteil.",
      diagnosisInstructions: "Gardez les pansements de moignon propres et secs. Surélevez le pied. Limitez l'appui si indiqué. Suivez le suivi orthopédique selon les directives.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions:
        "Retournez immédiatement pour saignement non contrôlé, aggravation de la douleur, engourdissement, enflure, fièvre, écoulement malodorant ou marche impossible.",
    }
  );

export const TRAUMA_MSK_AMPUTATION_FOOT_LOWER_EXTREMITY_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description: "You were evaluated for a traumatic foot or lower-extremity amputation. Specialty or transfer care is commonly required.",
      diagnosisInstructions: "Follow stump dressing and bleeding precautions exactly. Do not bear weight unless cleared. Follow orthopedic or transfer instructions urgently.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: "Return immediately for uncontrolled bleeding, fever, foul drainage, severe pain, or dressing failure.",
    },
    {
      description: "Vous avez été pris en charge pour une amputation traumatique du pied ou du membre inférieur. Des soins spécialisés ou un transfert sont souvent nécessaires.",
      diagnosisInstructions: "Suivez exactement les soins de moignon et les précautions de saignement. N'appuyez pas sauf autorisation. Suivez en urgence les consignes orthopédiques ou de transfert.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: "Retournez immédiatement pour saignement non contrôlé, fièvre, écoulement malodorant, douleur sévère ou échec du pansement.",
    }
  );

export const TRAUMA_MSK_AMPUTATION_PARTIAL_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description: "You were evaluated for a partial traumatic amputation. This is not treated as a simple laceration.",
      diagnosisInstructions: "Protect any remaining tissue bridge. Keep dressings clean. Elevate the part. Follow urgent specialty instructions for salvage versus revision.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: "Return immediately for bleeding, color change of remaining tissue, severe pain, fever, or dressing failure.",
    },
    {
      description: "Vous avez été pris en charge pour une amputation traumatique partielle. Ce n'est pas traité comme une simple lacération.",
      diagnosisInstructions: "Protégez tout pont tissulaire restant. Gardez les pansements propres. Surélevez. Suivez les consignes spécialisées urgentes pour sauvetage ou révision.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: "Retournez immédiatement pour saignement, changement de couleur des tissus restants, douleur sévère, fièvre ou échec du pansement.",
    }
  );

export const TRAUMA_MSK_AMPUTATION_COMPLETE_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description: "You were evaluated for a complete traumatic amputation.",
      diagnosisInstructions: "Follow stump care and bleeding precautions. Follow specialty or transfer instructions. Amputated-part preservation instructions apply only if your clinician provided them for this visit.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: "Return immediately for uncontrolled bleeding, fever, foul drainage, or severe increasing pain.",
    },
    {
      description: "Vous avez été pris en charge pour une amputation traumatique complète.",
      diagnosisInstructions: "Suivez les soins de moignon et les précautions de saignement. Suivez les consignes spécialisées ou de transfert. Les consignes de préservation du segment amputé s'appliquent seulement si votre clinicien les a données.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: "Retournez immédiatement pour saignement non contrôlé, fièvre, écoulement malodorant ou douleur sévère croissante.",
    }
  );

export const TRAUMA_MSK_AMPUTATION_POSTOPERATIVE_OR_FOLLOWUP_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description: "You were evaluated for amputation stump care or postoperative follow-up.",
      diagnosisInstructions: "Keep the stump clean and dry as directed. Watch for infection. Follow prosthetic or specialty follow-up as directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions:
        "Return immediately for fever, spreading redness, foul drainage, stump breakdown, worsening pain, numbness, or swelling.",
    },
    {
      description: "Vous avez été pris en charge pour des soins de moignon ou un suivi postopératoire d'amputation.",
      diagnosisInstructions: "Gardez le moignon propre et sec selon les directives. Surveillez l'infection. Suivez le suivi prothétique ou spécialisé selon les directives.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions:
        "Retournez immédiatement pour fièvre, rougeur extensive, écoulement malodorant, dégradation du moignon, aggravation de la douleur, engourdissement ou enflure.",
    }
  );

export const TRAUMA_MSK_AMPUTATION_GENERIC_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description: "You were evaluated for a traumatic amputation.",
      diagnosisInstructions: "Follow dressing, bleeding, and specialty or transfer instructions exactly. Elevate if directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: "Return immediately for uncontrolled bleeding, fever, foul drainage, or severe pain.",
    },
    {
      description: "Vous avez été pris en charge pour une amputation traumatique.",
      diagnosisInstructions: "Suivez exactement les consignes de pansement, de saignement et de spécialité ou transfert. Surélevez si indiqué.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: "Retournez immédiatement pour saignement non contrôlé, fièvre, écoulement malodorant ou douleur sévère.",
    }
  );

export const TRAUMA_MSK_FOREIGN_BODY_EYE_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description: "You were evaluated for an eye foreign body.",
      diagnosisInstructions: "Do not rub the eye. Use drops or ointment only if prescribed. Avoid contact lenses until cleared. Follow ophthalmology instructions urgently if given.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: "Return immediately for vision loss, severe eye pain, light sensitivity, pus, or increasing redness.",
    },
    {
      description: "Vous avez été pris en charge pour un corps étranger de l'œil.",
      diagnosisInstructions: "Ne frottez pas l'œil. Utilisez gouttes ou pommade seulement si prescrites. Évitez les lentilles jusqu'à autorisation. Suivez en urgence les consignes d'ophtalmologie si données.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: "Retournez immédiatement pour perte de vision, douleur oculaire sévère, photophobie, pus ou rougeur croissante.",
    }
  );

export const TRAUMA_MSK_FOREIGN_BODY_EAR_NOSE_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description: "You were evaluated for an ear or nose foreign body.",
      diagnosisInstructions: "Do not insert objects to remove remaining material. Keep the area clean and dry. Follow ENT follow-up if directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions:
        "Return immediately for worsening pain, swelling, bleeding, fever, drainage, difficulty breathing, vomiting, or hearing change.",
    },
    {
      description: "Vous avez été pris en charge pour un corps étranger de l'oreille ou du nez.",
      diagnosisInstructions: "N'introduisez pas d'objets pour retirer un reste. Gardez la zone propre et sèche. Suivez le suivi ORL si indiqué.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions:
        "Retournez immédiatement pour aggravation de la douleur, enflure, saignement, fièvre, écoulement, difficulté à respirer, vomissements ou changement d'audition.",
    }
  );

export const TRAUMA_MSK_FOREIGN_BODY_SKIN_SOFT_TISSUE_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description: "You were evaluated for a soft-tissue foreign body.",
      diagnosisInstructions: "Keep the wound clean and dry. Watch for retained-fragment symptoms. Update tetanus care if advised. Follow wound check as directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: "Return for increasing redness, pus, fever, spreading swelling, numbness, or persistent foreign-body sensation.",
    },
    {
      description: "Vous avez été pris en charge pour un corps étranger des tissus mous.",
      diagnosisInstructions: "Gardez la plaie propre et sèche. Surveillez les symptômes de fragment retenu. Mettez à jour le tétanos si conseillé. Suivez le contrôle de plaie selon les directives.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: "Revenez pour rougeur croissante, pus, fièvre, gonflement extensif, engourdissement ou sensation persistante de corps étranger.",
    }
  );

export const TRAUMA_MSK_FOREIGN_BODY_HAND_FINGER_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description: "You were evaluated for a hand or finger foreign body.",
      diagnosisInstructions: "Keep the wound clean. Elevate the hand. Watch for infection or residual fragment symptoms. Follow hand-surgery follow-up if directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: "Return for increasing pain, redness, pus, fever, numbness, or inability to move the finger.",
    },
    {
      description: "Vous avez été pris en charge pour un corps étranger de la main ou du doigt.",
      diagnosisInstructions: "Gardez la plaie propre. Surélevez la main. Surveillez l'infection ou un fragment résiduel. Suivez le suivi en chirurgie de la main si indiqué.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: "Revenez pour douleur croissante, rougeur, pus, fièvre, engourdissement ou impossibilité de bouger le doigt.",
    }
  );

export const TRAUMA_MSK_FOREIGN_BODY_FOOT_TOE_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description: "You were evaluated for a foot or toe foreign body.",
      diagnosisInstructions: "Keep the wound clean and dry. Limit weight-bearing if instructed. Watch for infection or residual fragment symptoms.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions:
        "Return immediately for worsening pain, numbness, swelling, redness, pus, fever, or inability to walk safely.",
    },
    {
      description: "Vous avez été pris en charge pour un corps étranger du pied ou de l'orteil.",
      diagnosisInstructions: "Gardez la plaie propre et sèche. Limitez l'appui si indiqué. Surveillez l'infection ou un fragment résiduel.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions:
        "Retournez immédiatement pour aggravation de la douleur, engourdissement, enflure, rougeur, pus, fièvre ou marche impossible.",
    }
  );

export const TRAUMA_MSK_FOREIGN_BODY_FISHHOOK_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description: "You were evaluated for a fishhook injury.",
      diagnosisInstructions: "Keep the wound clean after removal. Watch for infection. Complete tetanus care if advised. Follow wound check as directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions:
        "Return immediately for worsening pain, numbness, swelling, redness, pus, fever, or retained-hook concern.",
    },
    {
      description: "Vous avez été pris en charge pour une blessure par hameçon.",
      diagnosisInstructions: "Gardez la plaie propre après retrait. Surveillez l'infection. Complétez le tétanos si conseillé. Suivez le contrôle de plaie selon les directives.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions:
        "Retournez immédiatement pour aggravation de la douleur, engourdissement, enflure, rougeur, pus, fièvre ou suspicion d'hameçon retenu.",
    }
  );

export const TRAUMA_MSK_FOREIGN_BODY_INGESTED_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description: "You were evaluated for a swallowed foreign body. Home care alone is not always appropriate.",
      diagnosisInstructions: "Follow diet and observation instructions exactly. Seek care urgently for drooling, vomiting, chest pain, or inability to swallow. Specialty follow-up may be required.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: "Return immediately for breathing difficulty, drooling, vomiting, severe chest or abdominal pain, or inability to swallow saliva.",
    },
    {
      description: "Vous avez été pris en charge pour un corps étranger avalé. Les soins à domicile seuls ne sont pas toujours appropriés.",
      diagnosisInstructions: "Suivez exactement les consignes alimentaires et d'observation. Consultez en urgence pour bave, vomissements, douleur thoracique ou impossibilité d'avaler.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: "Retournez immédiatement pour difficulté respiratoire, bave, vomissements, douleur thoracique ou abdominale sévère, ou impossibilité d'avaler la salive.",
    }
  );

export const TRAUMA_MSK_FOREIGN_BODY_ASPIRATED_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description: "You were evaluated for a possible aspirated airway foreign body. This can be an emergency.",
      diagnosisInstructions: "Follow airway and specialty instructions exactly. Do not delay transfer or specialist care if recommended.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: "Return immediately for breathing difficulty, wheezing, blue lips, choking, or sudden cough with distress.",
    },
    {
      description: "Vous avez été pris en charge pour un possible corps étranger inhalé des voies aériennes. Cela peut être une urgence.",
      diagnosisInstructions: "Suivez exactement les consignes respiratoires et spécialisées. Ne retardez pas le transfert ou les soins spécialisés si recommandés.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: "Retournez immédiatement pour difficulté respiratoire, sifflement, lèvres bleues, étouffement ou toux soudaine avec détresse.",
    }
  );

export const TRAUMA_MSK_FOREIGN_BODY_RETAINED_FRAGMENT_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description: "You were evaluated for a retained foreign-body fragment concern.",
      diagnosisInstructions: "Keep the wound clean. Watch for infection. Follow imaging or specialty follow-up as directed. Residual fragment symptoms can appear later.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions: "Return for increasing redness, pus, fever, numbness, or persistent foreign-body sensation.",
    },
    {
      description: "Vous avez été pris en charge pour un fragment de corps étranger retenu suspecté.",
      diagnosisInstructions: "Gardez la plaie propre. Surveillez l'infection. Suivez l'imagerie ou le suivi spécialisé selon les directives. Les symptômes de fragment résiduel peuvent apparaître plus tard.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions: "Revenez pour rougeur croissante, pus, fièvre, engourdissement ou sensation persistante de corps étranger.",
    }
  );

export const TRAUMA_MSK_FOREIGN_BODY_GENERIC_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description: "You were evaluated for a foreign body injury.",
      diagnosisInstructions: "Keep the area clean. Watch for infection and residual fragment symptoms. Follow specialty follow-up as directed.",
      medicationTreatment: MSK_MED_EN,
      returnPrecautions:
        "Return immediately for worsening pain, numbness, swelling, redness, pus, fever, or persistent foreign-body sensation.",
    },
    {
      description: "Vous avez été pris en charge pour une blessure avec corps étranger.",
      diagnosisInstructions: "Gardez la zone propre. Surveillez l'infection et les symptômes de fragment résiduel. Suivez le suivi spécialisé selon les directives.",
      medicationTreatment: MSK_MED_FR,
      returnPrecautions:
        "Retournez immédiatement pour aggravation de la douleur, engourdissement, enflure, rougeur, pus, fièvre ou sensation persistante de corps étranger.",
    }
  );


const CARDIO_MED_EN = "Take medications only as prescribed or directed during this visit.";
const CARDIO_MED_FR =
  "Prenez les médicaments uniquement selon la prescription ou les indications reçues pendant cette visite.";

const CARDIO_FOLLOW_UP_EN = "Follow provider recommendations and follow up as directed during this visit.";
const CARDIO_FOLLOW_UP_FR =
  "Suivez les recommandations du clinicien et le suivi selon les directives reçues pendant cette visite.";

const CARDIO_GENERAL_RETURN_EN =
  "Return immediately or call 911 for chest pain, shortness of breath, fainting, severe weakness, new neurologic symptoms, trouble speaking, severe headache, or worsening symptoms.";
const CARDIO_GENERAL_RETURN_FR =
  "Retournez immédiatement ou appelez le 911 en cas de douleur thoracique, d'essoufflement, d'évanouissement, de faiblesse importante, de nouveaux symptômes neurologiques, de difficulté à parler, de mal de tête sévère ou d'aggravation.";

const CARDIO_NEURO_RETURN_EN =
  "Return immediately for weakness, numbness, trouble speaking, severe headache, confusion, or one-sided symptoms.";
const CARDIO_NEURO_RETURN_FR =
  "Retournez immédiatement en cas de faiblesse, d'engourdissement, de difficulté à parler, de mal de tête sévère, de confusion ou de symptômes d'un côté.";

const CARDIO_DRIVING_EN = "Avoid driving or operating machinery as directed during this visit.";
const CARDIO_DRIVING_FR =
  "Évitez de conduire ou d'utiliser des machines selon les directives reçues pendant cette visite.";

const CARDIO_FLUID_RETURN_EN = "Return for worsening shortness of breath, swelling, or weight gain.";
const CARDIO_FLUID_RETURN_FR =
  "Consultez en cas d'aggravation de l'essoufflement, d'enflure ou de prise de poids.";

const CARDIO_PE_RETURN_EN =
  "Return immediately for chest pain, shortness of breath, coughing blood, or one-sided leg swelling.";
const CARDIO_PE_RETURN_FR =
  "Retournez immédiatement en cas de douleur thoracique, d'essoufflement, de cracher du sang ou d'enflure d'une jambe.";

const CARDIO_SYNCOPE_RETURN_EN =
  "Return for recurrent fainting or if you faint again. Seek care for fall risk or injury from a fall.";
const CARDIO_SYNCOPE_RETURN_FR =
  "Consultez en cas d'évanouissement récurrent ou de nouvel évanouissement. Consultez en cas de risque de chute ou de blessure après une chute.";

const CARDIO_CHEST_PAIN_RETURN_EN =
  "Return immediately for chest pain, shortness of breath, or fainting. Call 911 for worsening symptoms.";
const CARDIO_CHEST_PAIN_RETURN_FR =
  "Retournez immédiatement en cas de douleur thoracique, d'essoufflement ou d'évanouissement. Appelez le 911 en cas d'aggravation.";

const CARDIO_ANTICOAG_RETURN_EN =
  "Return for bleeding, fainting, chest pain, shortness of breath, weakness, or new neurologic symptoms. Follow up and take medications only as directed.";
const CARDIO_ANTICOAG_RETURN_FR =
  "Consultez en cas de saignement, d'évanouissement, de douleur thoracique, d'essoufflement, de faiblesse ou de nouveaux symptômes neurologiques. Suivez le suivi et prenez les médicaments uniquement selon les directives.";

export const CARDIO_HYPERTENSION_ELEVATED_BP_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for elevated blood pressure or hypertension concerns. Symptoms may evolve after discharge.",
      diagnosisInstructions: `${CARDIO_FOLLOW_UP_EN} Return precautions were reviewed.`,
      medicationTreatment: CARDIO_MED_EN,
      returnPrecautions: CARDIO_GENERAL_RETURN_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une pression artérielle élevée ou des signes d'hypertension. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: `${CARDIO_FOLLOW_UP_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: CARDIO_MED_FR,
      returnPrecautions: CARDIO_GENERAL_RETURN_FR,
    }
  );

export const HIGH_RISK_MEDICAL_FATIGUE_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for fatigue or decreased energy. Symptoms may evolve after discharge.",
      diagnosisInstructions: `${CARDIO_FOLLOW_UP_EN} Return precautions were reviewed.`,
      medicationTreatment: CARDIO_MED_EN,
      returnPrecautions: CARDIO_GENERAL_RETURN_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une fatigue ou une baisse d'énergie. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: `${CARDIO_FOLLOW_UP_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: CARDIO_MED_FR,
      returnPrecautions: CARDIO_GENERAL_RETURN_FR,
    }
  );

export const HIGH_RISK_MEDICAL_GENERAL_WEAKNESS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for generalized weakness. Symptoms may evolve after discharge.",
      diagnosisInstructions: `${CARDIO_FOLLOW_UP_EN} Return precautions were reviewed.`,
      medicationTreatment: CARDIO_MED_EN,
      returnPrecautions: CARDIO_GENERAL_RETURN_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une faiblesse généralisée. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: `${CARDIO_FOLLOW_UP_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: CARDIO_MED_FR,
      returnPrecautions: CARDIO_GENERAL_RETURN_FR,
    }
  );

export const HIGH_RISK_MEDICAL_DIZZINESS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for dizziness or lightheadedness. Symptoms may evolve after discharge.",
      diagnosisInstructions: `${CARDIO_FOLLOW_UP_EN} ${CARDIO_DRIVING_EN} Return precautions were reviewed.`,
      medicationTreatment: CARDIO_MED_EN,
      returnPrecautions: `${CARDIO_NEURO_RETURN_EN} ${CARDIO_GENERAL_RETURN_EN}`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des étourdissements ou des vertiges. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: `${CARDIO_FOLLOW_UP_FR} ${CARDIO_DRIVING_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: CARDIO_MED_FR,
      returnPrecautions: `${CARDIO_NEURO_RETURN_FR} ${CARDIO_GENERAL_RETURN_FR}`,
    }
  );

export const HIGH_RISK_MEDICAL_HEADACHE_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for headache. Symptoms may evolve after discharge.",
      diagnosisInstructions: `${CARDIO_FOLLOW_UP_EN} Return precautions were reviewed.`,
      medicationTreatment: CARDIO_MED_EN,
      returnPrecautions: `${CARDIO_NEURO_RETURN_EN} ${CARDIO_GENERAL_RETURN_EN}`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des céphalées. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: `${CARDIO_FOLLOW_UP_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: CARDIO_MED_FR,
      returnPrecautions: `${CARDIO_NEURO_RETURN_FR} ${CARDIO_GENERAL_RETURN_FR}`,
    }
  );

export const HIGH_RISK_MEDICAL_LEG_SWELLING_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for leg swelling. Symptoms may evolve after discharge.",
      diagnosisInstructions: `${CARDIO_FOLLOW_UP_EN} Return precautions were reviewed.`,
      medicationTreatment: CARDIO_MED_EN,
      returnPrecautions: CARDIO_PE_RETURN_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une enflure d'une jambe. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: `${CARDIO_FOLLOW_UP_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: CARDIO_MED_FR,
      returnPrecautions: CARDIO_PE_RETURN_FR,
    }
  );

export const CARDIO_CHEST_PAIN_FOLLOW_UP_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for chest pain. Symptoms may evolve after discharge.",
      diagnosisInstructions:
        "Follow provider recommendations. Follow up with cardiology as directed. Take medications only as directed. This note does not replace provider documentation of test results.",
      medicationTreatment: CARDIO_MED_EN,
      returnPrecautions: CARDIO_CHEST_PAIN_RETURN_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une douleur thoracique. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions:
        "Suivez les recommandations du clinicien. Suivez le suivi en cardiologie selon les directives. Prenez les médicaments uniquement selon les directives. Cette note ne remplace pas la documentation clinicien des résultats d'examens.",
      medicationTreatment: CARDIO_MED_FR,
      returnPrecautions: CARDIO_CHEST_PAIN_RETURN_FR,
    }
  );

export const CARDIO_SYNCOPE_FOLLOW_UP_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department after fainting or syncope. Symptoms may evolve after discharge.",
      diagnosisInstructions: `${CARDIO_FOLLOW_UP_EN} ${CARDIO_DRIVING_EN} Return precautions were reviewed.`,
      medicationTreatment: CARDIO_MED_EN,
      returnPrecautions: `${CARDIO_SYNCOPE_RETURN_EN} ${CARDIO_GENERAL_RETURN_EN}`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences après un évanouissement ou une syncope. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: `${CARDIO_FOLLOW_UP_FR} ${CARDIO_DRIVING_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: CARDIO_MED_FR,
      returnPrecautions: `${CARDIO_SYNCOPE_RETURN_FR} ${CARDIO_GENERAL_RETURN_FR}`,
    }
  );

export const CARDIO_AFIB_RATE_CONTROLLED_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for atrial fibrillation or related heart rhythm concerns. Symptoms may evolve after discharge.",
      diagnosisInstructions: `${CARDIO_FOLLOW_UP_EN} Follow up with cardiology as directed.`,
      medicationTreatment: CARDIO_MED_EN,
      returnPrecautions: CARDIO_ANTICOAG_RETURN_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une fibrillation auriculaire ou un trouble du rythme cardiaque connexe. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: `${CARDIO_FOLLOW_UP_FR} Suivez le suivi en cardiologie selon les directives.`,
      medicationTreatment: CARDIO_MED_FR,
      returnPrecautions: CARDIO_ANTICOAG_RETURN_FR,
    }
  );

export const CARDIO_HEART_FAILURE_SYMPTOMS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for heart failure symptoms such as shortness of breath or swelling. Symptoms may evolve after discharge.",
      diagnosisInstructions: `${CARDIO_FOLLOW_UP_EN} Follow up with cardiology as directed.`,
      medicationTreatment: CARDIO_MED_EN,
      returnPrecautions: `${CARDIO_FLUID_RETURN_EN} ${CARDIO_GENERAL_RETURN_EN}`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des signes d'insuffisance cardiaque tels que l'essoufflement ou l'enflure. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: `${CARDIO_FOLLOW_UP_FR} Suivez le suivi en cardiologie selon les directives.`,
      medicationTreatment: CARDIO_MED_FR,
      returnPrecautions: `${CARDIO_FLUID_RETURN_FR} ${CARDIO_GENERAL_RETURN_FR}`,
    }
  );

const INFECTIOUS_FOLLOW_UP_EN = "Follow up with your primary care clinician as directed.";
const INFECTIOUS_FOLLOW_UP_FR = "Suivez le suivi avec votre médecin de premier recours selon les directives.";

const INFECTIOUS_MED_EN =
  "Take medications only as prescribed or directed during this visit. Do not start, stop, or change medications without clinician guidance.";
const INFECTIOUS_MED_FR =
  "Prenez les médicaments uniquement selon la prescription ou les indications reçues pendant cette visite. Ne commencez pas, n'arrêtez pas et ne modifiez pas un traitement sans l'avis d'un clinicien.";

const INFECTIOUS_RESULT_CAUTION_EN = "This note does not replace provider documentation of test results.";
const INFECTIOUS_RESULT_CAUTION_FR =
  "Cette note ne remplace pas la documentation clinicien des résultats d'examens.";

const INFECTIOUS_RETURN_IF_WORSE_EN = "Symptoms may worsen after discharge. Seek urgent care if symptoms worsen.";
const INFECTIOUS_RETURN_IF_WORSE_FR =
  "Les symptômes peuvent s'aggraver après le congé. Consultez en urgence si les symptômes s'aggravent.";

const INFECTIOUS_FEVER_RETURN_EN =
  "Return immediately or call 911 for fever, worsening fever, shaking chills, or confusion.";
const INFECTIOUS_FEVER_RETURN_FR =
  "Retournez immédiatement ou appelez le 911 en cas de fièvre, d'aggravation de la fièvre, de frissons ou de confusion.";

const INFECTIOUS_RESPIRATORY_RETURN_EN =
  "Return immediately for trouble breathing, worsening cough, chest pain, or blue lips.";
const INFECTIOUS_RESPIRATORY_RETURN_FR =
  "Retournez immédiatement en cas de difficulté à respirer, d'aggravation de la toux, de douleur thoracique ou de lèvres bleues.";

const INFECTIOUS_HYDRATION_RETURN_EN =
  "Return for care if unable to drink, worsening vomiting, worsening diarrhea, dehydration, decreased urination, dizziness, or weakness.";
const INFECTIOUS_HYDRATION_RETURN_FR =
  "Consultez en cas d'incapable de boire, de vomissements, de diarrhée, de déshydratation, de diminution des urines, d'étourdissements ou de faiblesse.";

const INFECTIOUS_NEURO_RETURN_EN =
  "Return immediately for confusion, severe headache, stiff neck, weakness, seizures, or trouble waking up.";
const INFECTIOUS_NEURO_RETURN_FR =
  "Retournez immédiatement en cas de confusion, de mal de tête sévère, de raideur du cou, de faiblesse, de convulsions ou de difficulté à réveiller.";

const INFECTIOUS_RASH_RETURN_EN =
  "Return immediately for spreading rash, skin peeling, swelling, breathing difficulty, or facial swelling.";
const INFECTIOUS_RASH_RETURN_FR =
  "Retournez immédiatement en cas d'éruption qui s'aggrave, de peau qui pèle, d'enflure, de difficulté à respirer ou d'enflure du visage.";

const INFECTIOUS_FULL_RETURN_EN = [
  INFECTIOUS_FEVER_RETURN_EN,
  INFECTIOUS_RESPIRATORY_RETURN_EN,
  INFECTIOUS_HYDRATION_RETURN_EN,
  INFECTIOUS_NEURO_RETURN_EN,
  INFECTIOUS_RASH_RETURN_EN,
  INFECTIOUS_RETURN_IF_WORSE_EN,
].join(" ");

const INFECTIOUS_FULL_RETURN_FR = [
  INFECTIOUS_FEVER_RETURN_FR,
  INFECTIOUS_RESPIRATORY_RETURN_FR,
  INFECTIOUS_HYDRATION_RETURN_FR,
  INFECTIOUS_NEURO_RETURN_FR,
  INFECTIOUS_RASH_RETURN_FR,
  INFECTIOUS_RETURN_IF_WORSE_FR,
].join(" ");

export const INFECTIOUS_FEVER_UNKNOWN_SOURCE_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for fever without a clear source identified during this visit. Symptoms may evolve after discharge.",
      diagnosisInstructions: `${INFECTIOUS_FOLLOW_UP_EN} ${INFECTIOUS_RESULT_CAUTION_EN} Return precautions were reviewed.`,
      medicationTreatment: INFECTIOUS_MED_EN,
      returnPrecautions: `${INFECTIOUS_FEVER_RETURN_EN} ${INFECTIOUS_RETURN_IF_WORSE_EN}`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour de la fièvre sans source claire identifiée pendant cette visite. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: `${INFECTIOUS_FOLLOW_UP_FR} ${INFECTIOUS_RESULT_CAUTION_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: INFECTIOUS_MED_FR,
      returnPrecautions: `${INFECTIOUS_FEVER_RETURN_FR} ${INFECTIOUS_RETURN_IF_WORSE_FR}`,
    }
  );

export const INFECTIOUS_UPPER_RESPIRATORY_INFECTION_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for upper respiratory infection symptoms. Symptoms may evolve after discharge.",
      diagnosisInstructions: `${INFECTIOUS_FOLLOW_UP_EN} Rest and hydration as tolerated. Return precautions were reviewed.`,
      medicationTreatment: INFECTIOUS_MED_EN,
      returnPrecautions: `${INFECTIOUS_RESPIRATORY_RETURN_EN} ${INFECTIOUS_RETURN_IF_WORSE_EN}`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des signes d'infection des voies respiratoires supérieures. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: `${INFECTIOUS_FOLLOW_UP_FR} Reposez-vous et hydratez-vous selon tolérance. Les consignes de retour ont été revues.`,
      medicationTreatment: INFECTIOUS_MED_FR,
      returnPrecautions: `${INFECTIOUS_RESPIRATORY_RETURN_FR} ${INFECTIOUS_RETURN_IF_WORSE_FR}`,
    }
  );

export const INFECTIOUS_VIRAL_SYNDROME_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a possible viral illness with flu-like symptoms. Symptoms may evolve after discharge.",
      diagnosisInstructions: "Rest and stay hydrated as tolerated. Return precautions were reviewed.",
      medicationTreatment: INFECTIOUS_MED_EN,
      returnPrecautions: `${INFECTIOUS_FEVER_RETURN_EN} ${INFECTIOUS_HYDRATION_RETURN_EN} ${INFECTIOUS_RETURN_IF_WORSE_EN}`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une possible maladie virale avec signes pseudo-grippaux. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: "Reposez-vous et hydratez-vous selon tolérance. Les consignes de retour ont été revues.",
      medicationTreatment: INFECTIOUS_MED_FR,
      returnPrecautions: `${INFECTIOUS_FEVER_RETURN_FR} ${INFECTIOUS_HYDRATION_RETURN_FR} ${INFECTIOUS_RETURN_IF_WORSE_FR}`,
    }
  );

export const INFECTIOUS_PHARYNGITIS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for sore throat or pharyngitis symptoms. Symptoms may evolve after discharge.",
      diagnosisInstructions: "Rest, fluids, and throat comfort measures as tolerated. Return precautions were reviewed.",
      medicationTreatment: INFECTIOUS_MED_EN,
      returnPrecautions: `${INFECTIOUS_FEVER_RETURN_EN} ${INFECTIOUS_HYDRATION_RETURN_EN} ${INFECTIOUS_RETURN_IF_WORSE_EN}`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour un mal de gorge ou des signes de pharyngite. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions:
        "Reposez-vous, hydratez-vous et utilisez des mesures de confort pour la gorge selon tolérance. Les consignes de retour ont été revues.",
      medicationTreatment: INFECTIOUS_MED_FR,
      returnPrecautions: `${INFECTIOUS_FEVER_RETURN_FR} ${INFECTIOUS_HYDRATION_RETURN_FR} ${INFECTIOUS_RETURN_IF_WORSE_FR}`,
    }
  );

export const INFECTIOUS_SINUSITIS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for sinusitis symptoms. Symptoms may evolve after discharge.",
      diagnosisInstructions: "Rest and nasal comfort measures as tolerated. Return precautions were reviewed.",
      medicationTreatment: INFECTIOUS_MED_EN,
      returnPrecautions: `${INFECTIOUS_FEVER_RETURN_EN} ${INFECTIOUS_NEURO_RETURN_EN} ${INFECTIOUS_RETURN_IF_WORSE_EN}`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des signes de sinusite. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions:
        "Reposez-vous et utilisez des mesures de confort nasal selon tolérance. Les consignes de retour ont été revues.",
      medicationTreatment: INFECTIOUS_MED_FR,
      returnPrecautions: `${INFECTIOUS_FEVER_RETURN_FR} ${INFECTIOUS_NEURO_RETURN_FR} ${INFECTIOUS_RETURN_IF_WORSE_FR}`,
    }
  );

export const INFECTIOUS_PNEUMONIA_FOLLOWUP_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for pneumonia-related symptoms requiring outpatient follow-up. Symptoms may evolve after discharge.",
      diagnosisInstructions: `${INFECTIOUS_FOLLOW_UP_EN} ${INFECTIOUS_RESULT_CAUTION_EN} Return precautions were reviewed.`,
      medicationTreatment: INFECTIOUS_MED_EN,
      returnPrecautions: `${INFECTIOUS_RESPIRATORY_RETURN_EN} ${INFECTIOUS_FEVER_RETURN_EN} ${INFECTIOUS_RETURN_IF_WORSE_EN}`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des signes liés à une pneumonie nécessitant un suivi ambulatoire. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: `${INFECTIOUS_FOLLOW_UP_FR} ${INFECTIOUS_RESULT_CAUTION_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: INFECTIOUS_MED_FR,
      returnPrecautions: `${INFECTIOUS_RESPIRATORY_RETURN_FR} ${INFECTIOUS_FEVER_RETURN_FR} ${INFECTIOUS_RETURN_IF_WORSE_FR}`,
    }
  );

export const INFECTIOUS_COVID_LIKE_ILLNESS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a COVID-like respiratory illness. Symptoms may evolve after discharge.",
      diagnosisInstructions: "Rest, hydration, and isolation precautions as directed. Return precautions were reviewed.",
      medicationTreatment: INFECTIOUS_MED_EN,
      returnPrecautions: `${INFECTIOUS_RESPIRATORY_RETURN_EN} ${INFECTIOUS_HYDRATION_RETURN_EN} ${INFECTIOUS_RETURN_IF_WORSE_EN}`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une maladie respiratoire de type COVID. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions:
        "Reposez-vous, hydratez-vous et suivez les consignes d'isolement selon les directives. Les consignes de retour ont été revues.",
      medicationTreatment: INFECTIOUS_MED_FR,
      returnPrecautions: `${INFECTIOUS_RESPIRATORY_RETURN_FR} ${INFECTIOUS_HYDRATION_RETURN_FR} ${INFECTIOUS_RETURN_IF_WORSE_FR}`,
    }
  );

export const GI_INFECTIOUS_GASTROENTERITIS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for infectious gastroenteritis symptoms. Symptoms may evolve after discharge.",
      diagnosisInstructions: "Stay hydrated with small sips as tolerated. Return precautions were reviewed.",
      medicationTreatment: INFECTIOUS_MED_EN,
      returnPrecautions: `${INFECTIOUS_HYDRATION_RETURN_EN} ${INFECTIOUS_RETURN_IF_WORSE_EN}`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des signes de gastro-entérite infectieuse. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: "Hydratez-vous par petites gorgées selon tolérance. Les consignes de retour ont été revues.",
      medicationTreatment: INFECTIOUS_MED_FR,
      returnPrecautions: `${INFECTIOUS_HYDRATION_RETURN_FR} ${INFECTIOUS_RETURN_IF_WORSE_FR}`,
    }
  );

export const INFECTIOUS_CELLULITIS_FOLLOWUP_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for cellulitis requiring outpatient follow-up. Symptoms may evolve after discharge.",
      diagnosisInstructions: `${INFECTIOUS_FOLLOW_UP_EN} Wound and skin care as directed. Return precautions were reviewed.`,
      medicationTreatment: INFECTIOUS_MED_EN,
      returnPrecautions: `${INFECTIOUS_FEVER_RETURN_EN} ${INFECTIOUS_RASH_RETURN_EN} ${INFECTIOUS_RETURN_IF_WORSE_EN}`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une cellulite nécessitant un suivi ambulatoire. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: `${INFECTIOUS_FOLLOW_UP_FR} Soins de la peau et de la plaie selon les directives. Les consignes de retour ont été revues.`,
      medicationTreatment: INFECTIOUS_MED_FR,
      returnPrecautions: `${INFECTIOUS_FEVER_RETURN_FR} ${INFECTIOUS_RASH_RETURN_FR} ${INFECTIOUS_RETURN_IF_WORSE_FR}`,
    }
  );

export const SEPSIS_RISK_RETURN_PRECAUTIONS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for symptoms that may be associated with serious infection or sepsis risk. Symptoms may evolve after discharge.",
      diagnosisInstructions: `${INFECTIOUS_FOLLOW_UP_EN} ${INFECTIOUS_RESULT_CAUTION_EN} Return precautions were reviewed in detail.`,
      medicationTreatment: INFECTIOUS_MED_EN,
      returnPrecautions: INFECTIOUS_FULL_RETURN_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des signes pouvant être associés à une infection grave ou un risque de sepsis. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: `${INFECTIOUS_FOLLOW_UP_FR} ${INFECTIOUS_RESULT_CAUTION_FR} Les consignes de retour ont été revues en détail.`,
      medicationTreatment: INFECTIOUS_MED_FR,
      returnPrecautions: INFECTIOUS_FULL_RETURN_FR,
    }
  );

const RENAL_FOLLOW_UP_PCP_EN = "Follow up with your primary care clinician as directed.";
const RENAL_FOLLOW_UP_PCP_FR = "Suivez le suivi avec votre médecin de premier recours selon les directives.";

const RENAL_FOLLOW_UP_NEPHROLOGY_EN = "Follow up with nephrology as directed.";
const RENAL_FOLLOW_UP_NEPHROLOGY_FR = "Suivez le suivi en néphrologie selon les directives.";

const RENAL_FOLLOW_UP_UROLOGY_EN = "Follow up with urology as directed.";
const RENAL_FOLLOW_UP_UROLOGY_FR = "Suivez le suivi en urologie selon les directives.";

const RENAL_MED_EN =
  "Take medications exactly as directed during this visit. Continue medications as prescribed.";
const RENAL_MED_FR =
  "Prenez les médicaments exactement selon les directives reçues pendant cette visite. Continuez les médicaments selon la prescription.";

const RENAL_RESULT_CAUTION_EN = "This note does not replace provider documentation of test results.";
const RENAL_RESULT_CAUTION_FR =
  "Cette note ne remplace pas la documentation clinicien des résultats d'examens.";

const RENAL_HYDRATION_RETURN_EN =
  "Return immediately if unable to keep fluids down, worsening vomiting, dizziness, weakness, or dehydration.";
const RENAL_HYDRATION_RETURN_FR =
  "Retournez immédiatement en cas d'incapable de garder les liquides, de vomissements, d'étourdissements, de faiblesse ou de déshydratation.";

const RENAL_DIALYSIS_RETURN_EN =
  "Return immediately for missed dialysis, shortness of breath, swelling, or chest pain.";
const RENAL_DIALYSIS_RETURN_FR =
  "Retournez immédiatement en cas de dialyse manquée, d'essoufflement, d'enflure ou de douleur thoracique.";

const RENAL_OBSTRUCTION_RETURN_EN =
  "Return immediately for inability to urinate, worsening flank pain, fever, or vomiting.";
const RENAL_OBSTRUCTION_RETURN_FR =
  "Retournez immédiatement en cas d'incapacité à uriner, de douleur au flanc, de fièvre ou de vomissements.";

const RENAL_ELECTROLYTE_RETURN_EN =
  "Return immediately for weakness, palpitations, fainting, or confusion.";
const RENAL_ELECTROLYTE_RETURN_FR =
  "Retournez immédiatement en cas de faiblesse, de palpitations, d'évanouissement ou de confusion.";

const RENAL_CATHETER_RETURN_EN =
  "Return immediately if catheter not draining, blood in urine, fever, or worsening pain.";
const RENAL_CATHETER_RETURN_FR =
  "Retournez immédiatement si le cathéter ne draine pas, en cas de sang dans les urines, de fièvre ou de douleur croissante.";

const RENAL_RETURN_IF_WORSE_EN =
  "Symptoms may worsen after discharge. Seek urgent medical care if symptoms worsen. Return immediately for concerning changes.";
const RENAL_RETURN_IF_WORSE_FR =
  "Les symptômes peuvent s'aggraver après le congé. Consultez en urgence si les symptômes s'aggravent. Retournez immédiatement en cas de changements préoccupants.";

export const RENAL_AKI_FOLLOWUP_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for acute kidney injury concerns requiring outpatient follow-up. Your condition may change after discharge.",
      diagnosisInstructions: `${RENAL_FOLLOW_UP_NEPHROLOGY_EN} ${RENAL_FOLLOW_UP_PCP_EN} ${RENAL_RESULT_CAUTION_EN} Return precautions were reviewed.`,
      medicationTreatment: RENAL_MED_EN,
      returnPrecautions: `${RENAL_HYDRATION_RETURN_EN} ${RENAL_ELECTROLYTE_RETURN_EN} ${RENAL_RETURN_IF_WORSE_EN}`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des signes d'insuffisance rénale aiguë nécessitant un suivi ambulatoire. Votre état peut évoluer après le congé.",
      diagnosisInstructions: `${RENAL_FOLLOW_UP_NEPHROLOGY_FR} ${RENAL_FOLLOW_UP_PCP_FR} ${RENAL_RESULT_CAUTION_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: RENAL_MED_FR,
      returnPrecautions: `${RENAL_HYDRATION_RETURN_FR} ${RENAL_ELECTROLYTE_RETURN_FR} ${RENAL_RETURN_IF_WORSE_FR}`,
    }
  );

export const RENAL_DEHYDRATION_FOLLOWUP_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for dehydration with kidney-related follow-up needs. Symptoms may evolve after discharge.",
      diagnosisInstructions: `${RENAL_FOLLOW_UP_PCP_EN} Hydrate with small sips as tolerated. Return precautions were reviewed.`,
      medicationTreatment: RENAL_MED_EN,
      returnPrecautions: `${RENAL_HYDRATION_RETURN_EN} ${RENAL_RETURN_IF_WORSE_EN}`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une déshydratation avec besoins de suivi rénal. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: `${RENAL_FOLLOW_UP_PCP_FR} Hydratez-vous par petites gorgées selon tolérance. Les consignes de retour ont été revues.`,
      medicationTreatment: RENAL_MED_FR,
      returnPrecautions: `${RENAL_HYDRATION_RETURN_FR} ${RENAL_RETURN_IF_WORSE_FR}`,
    }
  );

export const RENAL_ELECTROLYTE_ABNORMALITY_FOLLOWUP_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for electrolyte abnormality concerns requiring outpatient follow-up. Symptoms may evolve after discharge.",
      diagnosisInstructions: `${RENAL_FOLLOW_UP_NEPHROLOGY_EN} ${RENAL_FOLLOW_UP_PCP_EN} ${RENAL_RESULT_CAUTION_EN} Return precautions were reviewed.`,
      medicationTreatment: RENAL_MED_EN,
      returnPrecautions: `${RENAL_ELECTROLYTE_RETURN_EN} ${RENAL_HYDRATION_RETURN_EN} ${RENAL_RETURN_IF_WORSE_EN}`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une anomalie électrolytique nécessitant un suivi ambulatoire. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: `${RENAL_FOLLOW_UP_NEPHROLOGY_FR} ${RENAL_FOLLOW_UP_PCP_FR} ${RENAL_RESULT_CAUTION_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: RENAL_MED_FR,
      returnPrecautions: `${RENAL_ELECTROLYTE_RETURN_FR} ${RENAL_HYDRATION_RETURN_FR} ${RENAL_RETURN_IF_WORSE_FR}`,
    }
  );

export const UROLOGY_RENAL_COLIC_FOLLOWUP_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for renal colic or kidney stone symptoms requiring outpatient follow-up. Pain and symptoms may change after discharge.",
      diagnosisInstructions: `${RENAL_FOLLOW_UP_UROLOGY_EN} ${RENAL_FOLLOW_UP_PCP_EN} ${RENAL_RESULT_CAUTION_EN} Return precautions were reviewed.`,
      medicationTreatment: RENAL_MED_EN,
      returnPrecautions: `${RENAL_OBSTRUCTION_RETURN_EN} ${RENAL_HYDRATION_RETURN_EN} ${RENAL_RETURN_IF_WORSE_EN}`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une colique néphrétique ou des signes de calcul rénal nécessitant un suivi ambulatoire. La douleur et les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: `${RENAL_FOLLOW_UP_UROLOGY_FR} ${RENAL_FOLLOW_UP_PCP_FR} ${RENAL_RESULT_CAUTION_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: RENAL_MED_FR,
      returnPrecautions: `${RENAL_OBSTRUCTION_RETURN_FR} ${RENAL_HYDRATION_RETURN_FR} ${RENAL_RETURN_IF_WORSE_FR}`,
    }
  );

export const UROLOGY_UTI_FOLLOWUP_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for urinary tract infection symptoms requiring outpatient follow-up. Symptoms may evolve after discharge.",
      diagnosisInstructions: `${RENAL_FOLLOW_UP_PCP_EN} Return precautions were reviewed.`,
      medicationTreatment: RENAL_MED_EN,
      returnPrecautions: `${RENAL_HYDRATION_RETURN_EN} ${RENAL_RETURN_IF_WORSE_EN}`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des signes d'infection urinaire nécessitant un suivi ambulatoire. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: `${RENAL_FOLLOW_UP_PCP_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: RENAL_MED_FR,
      returnPrecautions: `${RENAL_HYDRATION_RETURN_FR} ${RENAL_RETURN_IF_WORSE_FR}`,
    }
  );

export const UROLOGY_PYELONEPHRITIS_FOLLOWUP_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for pyelonephritis or kidney infection symptoms requiring outpatient follow-up. Symptoms may evolve after discharge.",
      diagnosisInstructions: `${RENAL_FOLLOW_UP_PCP_EN} ${RENAL_RESULT_CAUTION_EN} Return precautions were reviewed.`,
      medicationTreatment: RENAL_MED_EN,
      returnPrecautions: `${RENAL_HYDRATION_RETURN_EN} ${RENAL_OBSTRUCTION_RETURN_EN} ${RENAL_RETURN_IF_WORSE_EN}`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une pyélonéphrite ou des signes d'infection rénale nécessitant un suivi ambulatoire. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: `${RENAL_FOLLOW_UP_PCP_FR} ${RENAL_RESULT_CAUTION_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: RENAL_MED_FR,
      returnPrecautions: `${RENAL_HYDRATION_RETURN_FR} ${RENAL_OBSTRUCTION_RETURN_FR} ${RENAL_RETURN_IF_WORSE_FR}`,
    }
  );

export const UROLOGY_HEMATURIA_FOLLOWUP_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for blood in the urine (hematuria) requiring outpatient follow-up. Symptoms may evolve after discharge.",
      diagnosisInstructions: `${RENAL_FOLLOW_UP_UROLOGY_EN} ${RENAL_FOLLOW_UP_PCP_EN} ${RENAL_RESULT_CAUTION_EN} Return precautions were reviewed.`,
      medicationTreatment: RENAL_MED_EN,
      returnPrecautions: `${RENAL_OBSTRUCTION_RETURN_EN} ${RENAL_CATHETER_RETURN_EN} ${RENAL_RETURN_IF_WORSE_EN}`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour du sang dans les urines (hématurie) nécessitant un suivi ambulatoire. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: `${RENAL_FOLLOW_UP_UROLOGY_FR} ${RENAL_FOLLOW_UP_PCP_FR} ${RENAL_RESULT_CAUTION_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: RENAL_MED_FR,
      returnPrecautions: `${RENAL_OBSTRUCTION_RETURN_FR} ${RENAL_CATHETER_RETURN_FR} ${RENAL_RETURN_IF_WORSE_FR}`,
    }
  );

export const UROLOGY_URINARY_RETENTION_FOLLOWUP_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for urinary retention or difficulty urinating requiring outpatient follow-up. Symptoms may change after discharge.",
      diagnosisInstructions: `${RENAL_FOLLOW_UP_UROLOGY_EN} ${RENAL_FOLLOW_UP_PCP_EN} Return precautions were reviewed.`,
      medicationTreatment: RENAL_MED_EN,
      returnPrecautions: `${RENAL_OBSTRUCTION_RETURN_EN} ${RENAL_RETURN_IF_WORSE_EN}`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une rétention urinaire ou une difficulté à uriner nécessitant un suivi ambulatoire. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: `${RENAL_FOLLOW_UP_UROLOGY_FR} ${RENAL_FOLLOW_UP_PCP_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: RENAL_MED_FR,
      returnPrecautions: `${RENAL_OBSTRUCTION_RETURN_FR} ${RENAL_RETURN_IF_WORSE_FR}`,
    }
  );

export const UROLOGY_FOLEY_CATHETER_PRECAUTIONS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for Foley or urinary catheter care and precautions. Symptoms may evolve after discharge.",
      diagnosisInstructions: `${RENAL_FOLLOW_UP_UROLOGY_EN} ${RENAL_FOLLOW_UP_PCP_EN} Catheter care instructions were reviewed as directed during this visit.`,
      medicationTreatment: RENAL_MED_EN,
      returnPrecautions: `${RENAL_CATHETER_RETURN_EN} ${RENAL_OBSTRUCTION_RETURN_EN} ${RENAL_RETURN_IF_WORSE_EN}`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour les soins et consignes d'un cathéter urinaire ou de Foley. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: `${RENAL_FOLLOW_UP_UROLOGY_FR} ${RENAL_FOLLOW_UP_PCP_FR} Les consignes de soins du cathéter ont été revues selon les directives reçues pendant cette visite.`,
      medicationTreatment: RENAL_MED_FR,
      returnPrecautions: `${RENAL_CATHETER_RETURN_FR} ${RENAL_OBSTRUCTION_RETURN_FR} ${RENAL_RETURN_IF_WORSE_FR}`,
    }
  );

export const DIALYSIS_RETURN_PRECAUTIONS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for dialysis-related concerns and return precautions. Your condition may change after discharge.",
      diagnosisInstructions: `${RENAL_FOLLOW_UP_NEPHROLOGY_EN} ${RENAL_FOLLOW_UP_PCP_EN} ${RENAL_RESULT_CAUTION_EN} Return precautions were reviewed in detail.`,
      medicationTreatment: RENAL_MED_EN,
      returnPrecautions: `${RENAL_DIALYSIS_RETURN_EN} ${RENAL_ELECTROLYTE_RETURN_EN} ${RENAL_HYDRATION_RETURN_EN} ${RENAL_RETURN_IF_WORSE_EN}`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des préoccupations liées à la dialyse et les consignes de retour. Votre état peut évoluer après le congé.",
      diagnosisInstructions: `${RENAL_FOLLOW_UP_NEPHROLOGY_FR} ${RENAL_FOLLOW_UP_PCP_FR} ${RENAL_RESULT_CAUTION_FR} Les consignes de retour ont été revues en détail.`,
      medicationTreatment: RENAL_MED_FR,
      returnPrecautions: `${RENAL_DIALYSIS_RETURN_FR} ${RENAL_ELECTROLYTE_RETURN_FR} ${RENAL_HYDRATION_RETURN_FR} ${RENAL_RETURN_IF_WORSE_FR}`,
    }
  );

const ENDO_FOLLOW_UP_PCP_EN = "Follow up with your primary care clinician as directed.";
const ENDO_FOLLOW_UP_PCP_FR = "Suivez le suivi avec votre médecin de premier recours selon les directives.";

const ENDO_FOLLOW_UP_ENDOCRINOLOGY_EN = "Follow up with endocrinology as directed.";
const ENDO_FOLLOW_UP_ENDOCRINOLOGY_FR = "Suivez le suivi en endocrinologie selon les directives.";

const ENDO_MED_EN = "Take medications exactly as directed during this visit. Continue medications as prescribed.";
const ENDO_MED_FR =
  "Prenez les médicaments exactement selon les directives reçues pendant cette visite. Continuez les médicaments selon la prescription.";

const ENDO_INSULIN_MED_EN =
  "Take insulin exactly as directed. Do not skip insulin. Continue other medications as prescribed.";
const ENDO_INSULIN_MED_FR =
  "Prenez l'insuline exactement comme prescrite. Ne sautez pas l'insuline. Continuez les autres médicaments selon la prescription.";

const ENDO_RESULT_CAUTION_EN = "This note does not replace provider documentation of test results.";
const ENDO_RESULT_CAUTION_FR =
  "Cette note ne remplace pas la documentation clinicien des résultats d'examens.";

const ENDO_GLUCOSE_RETURN_EN =
  "Return immediately for worsening weakness, confusion, vomiting, excessive thirst, excessive urination, or fainting.";
const ENDO_GLUCOSE_RETURN_FR =
  "Retournez immédiatement en cas de faiblesse qui s'aggrave, de confusion, de vomissements, de soif excessive, d'urination fréquente ou d'évanouissement.";

const ENDO_HYDRATION_RETURN_EN =
  "Return immediately if unable to keep fluids down, worsening vomiting, dehydration, or dizziness.";
const ENDO_HYDRATION_RETURN_FR =
  "Retournez immédiatement en cas d'incapable de garder les liquides, de vomissements, de déshydratation ou d'étourdissements.";

const ENDO_NEURO_RETURN_EN = "Return immediately for confusion, seizures, trouble waking up, or weakness.";
const ENDO_NEURO_RETURN_FR =
  "Retournez immédiatement en cas de confusion, de convulsions, de difficulté à réveiller ou de faiblesse.";

const ENDO_INSULIN_RETURN_EN = "Seek care for worsening symptoms.";
const ENDO_INSULIN_RETURN_FR = "Consultez pour aggravation des symptômes.";

const ENDO_RETURN_IF_WORSE_EN =
  "Symptoms may worsen after discharge. Return immediately for concerning changes.";
const ENDO_RETURN_IF_WORSE_FR =
  "Les symptômes peuvent s'aggraver après le congé. Retournez immédiatement en cas de changements préoccupants.";

const ENDO_FULL_GLUCOSE_HYDRATION_RETURN_EN = `${ENDO_GLUCOSE_RETURN_EN} ${ENDO_HYDRATION_RETURN_EN} ${ENDO_RETURN_IF_WORSE_EN}`;
const ENDO_FULL_GLUCOSE_HYDRATION_RETURN_FR = `${ENDO_GLUCOSE_RETURN_FR} ${ENDO_HYDRATION_RETURN_FR} ${ENDO_RETURN_IF_WORSE_FR}`;

const ENDO_FULL_GLUCOSE_NEURO_RETURN_EN = `${ENDO_GLUCOSE_RETURN_EN} ${ENDO_NEURO_RETURN_EN} ${ENDO_RETURN_IF_WORSE_EN}`;
const ENDO_FULL_GLUCOSE_NEURO_RETURN_FR = `${ENDO_GLUCOSE_RETURN_FR} ${ENDO_NEURO_RETURN_FR} ${ENDO_RETURN_IF_WORSE_FR}`;

const ENDO_DKA_RETURN_EN = `${ENDO_GLUCOSE_RETURN_EN} ${ENDO_HYDRATION_RETURN_EN} ${ENDO_NEURO_RETURN_EN} ${ENDO_RETURN_IF_WORSE_EN}`;
const ENDO_DKA_RETURN_FR = `${ENDO_GLUCOSE_RETURN_FR} ${ENDO_HYDRATION_RETURN_FR} ${ENDO_NEURO_RETURN_FR} ${ENDO_RETURN_IF_WORSE_FR}`;

export const DIABETES_HYPERGLYCEMIA_FOLLOWUP_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for diabetes-related hyperglycemia symptoms requiring outpatient follow-up. Symptoms may evolve after discharge.",
      diagnosisInstructions: `${ENDO_FOLLOW_UP_PCP_EN} ${ENDO_RESULT_CAUTION_EN} Return precautions were reviewed.`,
      medicationTreatment: ENDO_MED_EN,
      returnPrecautions: ENDO_FULL_GLUCOSE_HYDRATION_RETURN_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des signes d'hyperglycémie liés au diabète nécessitant un suivi ambulatoire. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: `${ENDO_FOLLOW_UP_PCP_FR} ${ENDO_RESULT_CAUTION_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: ENDO_MED_FR,
      returnPrecautions: ENDO_FULL_GLUCOSE_HYDRATION_RETURN_FR,
    }
  );

export const DIABETES_HYPOGLYCEMIA_FOLLOWUP_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for diabetes-related hypoglycemia symptoms requiring outpatient follow-up. Symptoms may change after discharge.",
      diagnosisInstructions: `${ENDO_FOLLOW_UP_PCP_EN} ${ENDO_RESULT_CAUTION_EN} Return precautions were reviewed.`,
      medicationTreatment: ENDO_MED_EN,
      returnPrecautions: ENDO_FULL_GLUCOSE_NEURO_RETURN_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des signes d'hypoglycémie liés au diabète nécessitant un suivi ambulatoire. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: `${ENDO_FOLLOW_UP_PCP_FR} ${ENDO_RESULT_CAUTION_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: ENDO_MED_FR,
      returnPrecautions: ENDO_FULL_GLUCOSE_NEURO_RETURN_FR,
    }
  );

export const DIABETES_DKA_RETURN_PRECAUTIONS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for diabetic ketoacidosis-related concerns and return precautions. Your condition may change after discharge.",
      diagnosisInstructions: `${ENDO_FOLLOW_UP_PCP_EN} ${ENDO_RESULT_CAUTION_EN} Return precautions were reviewed in detail.`,
      medicationTreatment: ENDO_MED_EN,
      returnPrecautions: ENDO_DKA_RETURN_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des préoccupations liées à l'acidocétose diabétique et les consignes de retour. Votre état peut évoluer après le congé.",
      diagnosisInstructions: `${ENDO_FOLLOW_UP_PCP_FR} ${ENDO_RESULT_CAUTION_FR} Les consignes de retour ont été revues en détail.`,
      medicationTreatment: ENDO_MED_FR,
      returnPrecautions: ENDO_DKA_RETURN_FR,
    }
  );

export const DIABETES_INSULIN_MANAGEMENT_PRECAUTIONS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for diabetes insulin management and precautions. Symptoms may evolve after discharge.",
      diagnosisInstructions: `${ENDO_FOLLOW_UP_PCP_EN} ${ENDO_RESULT_CAUTION_EN} Insulin management instructions were reviewed as directed during this visit.`,
      medicationTreatment: ENDO_INSULIN_MED_EN,
      returnPrecautions: `${ENDO_GLUCOSE_RETURN_EN} ${ENDO_INSULIN_RETURN_EN} ${ENDO_RETURN_IF_WORSE_EN}`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour la gestion de l'insuline et les consignes liées au diabète. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: `${ENDO_FOLLOW_UP_PCP_FR} ${ENDO_RESULT_CAUTION_FR} Les consignes de gestion de l'insuline ont été revues selon les directives reçues pendant cette visite.`,
      medicationTreatment: ENDO_INSULIN_MED_FR,
      returnPrecautions: `${ENDO_GLUCOSE_RETURN_FR} ${ENDO_INSULIN_RETURN_FR} ${ENDO_RETURN_IF_WORSE_FR}`,
    }
  );

export const ENDOCRINE_THYROID_SYMPTOM_FOLLOWUP_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for thyroid-related symptoms requiring outpatient follow-up. Symptoms may evolve after discharge.",
      diagnosisInstructions: `${ENDO_FOLLOW_UP_ENDOCRINOLOGY_EN} ${ENDO_RESULT_CAUTION_EN} Return precautions were reviewed.`,
      medicationTreatment: ENDO_MED_EN,
      returnPrecautions: `${ENDO_NEURO_RETURN_EN} ${ENDO_RETURN_IF_WORSE_EN}`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des signes liés à la thyroïde nécessitant un suivi ambulatoire. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: `${ENDO_FOLLOW_UP_ENDOCRINOLOGY_FR} ${ENDO_RESULT_CAUTION_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: ENDO_MED_FR,
      returnPrecautions: `${ENDO_NEURO_RETURN_FR} ${ENDO_RETURN_IF_WORSE_FR}`,
    }
  );

export const METABOLIC_DEHYDRATION_FOLLOWUP_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for metabolic dehydration concerns requiring outpatient follow-up. Symptoms may evolve after discharge.",
      diagnosisInstructions: "Hydrate with small sips as tolerated. Return precautions were reviewed.",
      medicationTreatment: ENDO_MED_EN,
      returnPrecautions: `${ENDO_HYDRATION_RETURN_EN} ${ENDO_RETURN_IF_WORSE_EN}`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une déshydratation d'origine métabolique nécessitant un suivi ambulatoire. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: "Hydratez-vous par petites gorgées selon tolérance. Les consignes de retour ont été revues.",
      medicationTreatment: ENDO_MED_FR,
      returnPrecautions: `${ENDO_HYDRATION_RETURN_FR} ${ENDO_RETURN_IF_WORSE_FR}`,
    }
  );

export const METABOLIC_NAUSEA_WEAKNESS_FOLLOWUP_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for metabolic nausea and weakness requiring outpatient follow-up. Symptoms may evolve after discharge.",
      diagnosisInstructions: `${ENDO_RESULT_CAUTION_EN} Return precautions were reviewed.`,
      medicationTreatment: ENDO_MED_EN,
      returnPrecautions: ENDO_FULL_GLUCOSE_HYDRATION_RETURN_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des nausées et une faiblesse d'origine métabolique nécessitant un suivi ambulatoire. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: `${ENDO_RESULT_CAUTION_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: ENDO_MED_FR,
      returnPrecautions: ENDO_FULL_GLUCOSE_HYDRATION_RETURN_FR,
    }
  );

export const METABOLIC_ELECTROLYTE_FOLLOWUP_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for metabolic electrolyte concerns requiring outpatient follow-up. Symptoms may evolve after discharge.",
      diagnosisInstructions: `${ENDO_FOLLOW_UP_ENDOCRINOLOGY_EN} ${ENDO_RESULT_CAUTION_EN} Return precautions were reviewed.`,
      medicationTreatment: ENDO_MED_EN,
      returnPrecautions: ENDO_FULL_GLUCOSE_NEURO_RETURN_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour des préoccupations électrolytiques d'origine métabolique nécessitant un suivi ambulatoire. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: `${ENDO_FOLLOW_UP_ENDOCRINOLOGY_FR} ${ENDO_RESULT_CAUTION_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: ENDO_MED_FR,
      returnPrecautions: ENDO_FULL_GLUCOSE_NEURO_RETURN_FR,
    }
  );

export const ENDOCRINE_POLYURIA_POLYDIPSIA_FOLLOWUP_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for polyuria and polydipsia symptoms requiring outpatient follow-up. Symptoms may evolve after discharge.",
      diagnosisInstructions: `${ENDO_FOLLOW_UP_PCP_EN} ${ENDO_RESULT_CAUTION_EN} Return precautions were reviewed.`,
      medicationTreatment: ENDO_MED_EN,
      returnPrecautions: ENDO_FULL_GLUCOSE_HYDRATION_RETURN_EN,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une polyurie et une polydipsie nécessitant un suivi ambulatoire. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: `${ENDO_FOLLOW_UP_PCP_FR} ${ENDO_RESULT_CAUTION_FR} Les consignes de retour ont été revues.`,
      medicationTreatment: ENDO_MED_FR,
      returnPrecautions: ENDO_FULL_GLUCOSE_HYDRATION_RETURN_FR,
    }
  );

export const DIABETES_SICK_DAY_PRECAUTIONS_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for diabetes sick-day precautions and follow-up needs. Symptoms may evolve after discharge.",
      diagnosisInstructions: `${ENDO_FOLLOW_UP_PCP_EN} ${ENDO_RESULT_CAUTION_EN} Sick-day precautions were reviewed.`,
      medicationTreatment: ENDO_INSULIN_MED_EN,
      returnPrecautions: `${ENDO_HYDRATION_RETURN_EN} ${ENDO_INSULIN_RETURN_EN} ${ENDO_RETURN_IF_WORSE_EN}`,
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour les consignes de jour de maladie liées au diabète. Les symptômes peuvent évoluer après le congé.",
      diagnosisInstructions: `${ENDO_FOLLOW_UP_PCP_FR} ${ENDO_RESULT_CAUTION_FR} Les consignes de jour de maladie ont été revues.`,
      medicationTreatment: ENDO_INSULIN_MED_FR,
      returnPrecautions: `${ENDO_HYDRATION_RETURN_FR} ${ENDO_INSULIN_RETURN_FR} ${ENDO_RETURN_IF_WORSE_FR}`,
    }
  );

export const TYPE_2_DIABETES_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for type 2 diabetes-related care needs. Continue routine diabetes self-care and outpatient follow-up as discussed during this visit.",
      diagnosisInstructions:
        "Follow the diabetes care plan reviewed during this visit. Monitor blood sugar at home if you have a monitor and know your targets. Do not change your usual diabetes medications without clinician guidance.",
      medicationTreatment:
        "Use only medications prescribed or specifically recommended during this visit. Do not start new medications without clinician guidance.",
      returnPrecautions:
        "Return to the emergency department immediately for symptoms of very high or low blood sugar, confusion, severe vomiting, dehydration, chest pain, or if you feel unsafe at home.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour un besoin de suivi lié au diabète de type 2. Poursuivez l'autosurveillance habituelle et le suivi ambulatoire selon les consignes reçues.",
      diagnosisInstructions:
        "Suivez le plan de soins du diabète revu lors de cette visite. Surveillez la glycémie à domicile si vous disposez d'un appareil et connaissez vos cibles. Ne modifiez pas vos médicaments habituels sans avis clinique.",
      medicationTreatment:
        "Utilisez uniquement les médicaments prescrits ou recommandés spécifiquement lors de cette visite. N'introduisez pas de nouveaux médicaments sans l'avis d'un clinicien.",
      returnPrecautions:
        "Retournez aux urgences immédiatement en cas de glycémie très élevée ou très basse, de confusion, de vomissements sévères, de déshydratation, de douleur thoracique ou si vous ne vous sentez pas en sécurité à domicile.",
    }
  );

export const GENERIC_ED_DISCHARGE_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for [diagnosis]. Symptoms may evolve after an emergency visit.",
      diagnosisInstructions:
        "Follow the care instructions discussed during your visit. Take medications only as prescribed or specifically recommended during this visit. Keep fluids, food, activity, wound care, and restrictions as directed for your condition.",
      medicationTreatment:
        "Use only medications prescribed or specifically recommended during this visit. Do not start, stop, or change medications without clinician guidance.",
      returnPrecautions:
        "Return to the emergency department immediately if symptoms worsen, new concerning symptoms develop, or you feel unsafe at home.",
      returnWorkSchool: "Return to work or school when you feel able and as directed by your clinician.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour [diagnosis]. Les symptômes peuvent évoluer après une visite aux urgences.",
      diagnosisInstructions:
        "Suivez les consignes de soins discutées lors de votre visite. Prenez les médicaments uniquement selon la prescription ou les recommandations spécifiques reçues lors de cette visite. Maintenez l'hydratation, l'alimentation, l'activité, les soins de plaie et les restrictions selon les directives pour votre état.",
      medicationTreatment:
        "Utilisez uniquement les médicaments prescrits ou recommandés spécifiquement lors de cette visite. N'introduisez pas, n'arrêtez pas et ne modifiez pas vos médicaments sans l'avis d'un clinicien.",
      returnPrecautions:
        "Retournez aux urgences immédiatement si les symptômes s'aggravent, si de nouveaux signes inquiétants apparaissent ou si vous ne vous sentez pas en sécurité à domicile.",
      returnWorkSchool: "Reprenez le travail ou les cours lorsque vous vous sentez apte et selon les directives de votre clinicien.",
    }
  );

export const VACCINATION_VISIT_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were seen in the emergency department for vaccination or immunization needs. Outpatient follow-up may be needed to complete recommended vaccines or monitoring.",
      diagnosisInstructions:
        "Follow vaccine instructions given during this visit. Monitor for injection-site soreness, mild fever, or fatigue as discussed. Keep your vaccination record available for future visits.",
      medicationTreatment:
        "Use only medications prescribed or specifically recommended during this visit. Do not start new medications without clinician guidance.",
      returnPrecautions:
        "Return to the emergency department immediately for severe allergic reaction symptoms (trouble breathing, swelling of face or throat, widespread rash, fainting), high fever, or if you feel unsafe at home.",
    },
    {
      description:
        "Vous avez consulté aux urgences pour un besoin de vaccination ou d'immunisation. Un suivi ambulatoire peut être nécessaire pour compléter les vaccins recommandés ou la surveillance.",
      diagnosisInstructions:
        "Suivez les consignes vaccinales reçues lors de cette visite. Surveillez une douleur au site d'injection, une fièvre légère ou une fatigue selon les indications reçues. Conservez votre carnet de vaccination pour les prochaines visites.",
      medicationTreatment:
        "Utilisez uniquement les médicaments prescrits ou recommandés spécifiquement lors de cette visite. N'introduisez pas de nouveaux médicaments sans l'avis d'un clinicien.",
      returnPrecautions:
        "Retournez aux urgences immédiatement en cas de réaction allergique sévère (difficulté à respirer, gonflement du visage ou de la gorge, éruption généralisée, évanouissement), de fièvre élevée ou si vous ne vous sentez pas en sécurité à domicile.",
    }
  );

export const WELLNESS_VISIT_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a general health visit or routine follow-up concern. Continue routine care with your primary clinician as recommended.",
      diagnosisInstructions:
        "Follow any lifestyle, screening, or preventive care recommendations discussed during this visit. Keep scheduled primary care appointments.",
      medicationTreatment:
        "Use only medications prescribed or specifically recommended during this visit. Do not start new medications without clinician guidance.",
      returnPrecautions:
        "Return to the emergency department immediately if new severe symptoms develop, symptoms worsen, or you feel unsafe at home.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une visite de santé générale ou un suivi de routine. Poursuivez les soins habituels avec votre médecin traitant selon les recommandations.",
      diagnosisInstructions:
        "Suivez les recommandations de mode de vie, de dépistage ou de soins préventifs discutées lors de cette visite. Respectez vos rendez-vous de soins primaires.",
      medicationTreatment:
        "Utilisez uniquement les médicaments prescrits ou recommandés spécifiquement lors de cette visite. N'introduisez pas de nouveaux médicaments sans l'avis d'un clinicien.",
      returnPrecautions:
        "Retournez aux urgences immédiatement si de nouveaux symptômes sévères apparaissent, si les symptômes s'aggravent ou si vous ne vous sentez pas en sécurité à domicile.",
    }
  );

/**
 * Phase 10 — head/facial trauma discharge templates (concussion, ICH, skull/facial fractures,
 * dental/jaw, ear/nose hematomas, facial laceration).
 */

const HEAD_FACIAL_MED_EN = "Take pain medicines only as prescribed or directed during this visit.";
const HEAD_FACIAL_MED_FR =
  "Prenez les antidouleurs uniquement selon la prescription ou les indications données pendant cette visite.";

export const CONCUSSION_MILD_TBI_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a concussion (mild traumatic brain injury). Most people recover within days to a few weeks; outpatient follow-up is recommended when clinically appropriate.",
      diagnosisInstructions:
        "Rest as directed for the first day or two, then return gradually to light activity as tolerated. Do not return to sports, contact activity, or play until cleared by a clinician — a repeat head injury before you have recovered can be dangerous. Avoid driving, biking, or operating machinery if you have concussion symptoms. Have a responsible adult monitor you as directed. Return precautions for worsening or concerning neurologic symptoms were reviewed.",
      medicationTreatment:
        "Take pain medicines only as prescribed or directed during this visit. Avoid sedating medicines before driving unless cleared by your clinician.",
      returnPrecautions:
        "Return immediately for worsening headache, repeated vomiting, confusion, seizure, weakness or numbness, trouble waking, slurred speech, unequal pupils, behavior change, or vision changes.",
      returnWorkSchool:
        "Return to work, school, or sports (return-to-play) only in a gradual, stepwise manner and only as directed by your clinician.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une commotion cérébrale (traumatisme crânien léger). La plupart des personnes récupèrent en quelques jours à quelques semaines ; un suivi ambulatoire est recommandé lorsque c'est cliniquement pertinent.",
      diagnosisInstructions:
        "Reposez-vous selon les indications les premiers jours, puis reprenez progressivement une activité légère selon votre tolérance. Ne reprenez pas le sport, les activités de contact ou le jeu avant l'autorisation d'un clinicien — un nouveau traumatisme crânien avant la guérison complète peut être dangereux. Évitez de conduire, faire du vélo ou utiliser des machines si vous avez des symptômes de commotion. Faites-vous surveiller par un adulte responsable selon les indications. Les consignes de retour en cas de signes neurologiques inquiétants ou d'aggravation ont été revues.",
      medicationTreatment: HEAD_FACIAL_MED_FR,
      returnPrecautions:
        "Reconsultez immédiatement aux urgences en cas de céphalée aggravée, de vomissements répétés, de confusion, de convulsion, de faiblesse ou engourdissement, de difficulté à se réveiller, de trouble de l'élocution, de pupilles inégales, de changement de comportement ou de trouble visuel.",
      returnWorkSchool:
        "Reprenez le travail, les cours ou le sport (retour au jeu) uniquement de façon progressive et par étapes, et seulement selon les instructions de votre clinicien.",
    }
  );

export const POST_HEAD_INJURY_OBSERVATION_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated and observed in the emergency department after a head injury. No specific fracture or bleeding requiring intervention was identified during this observation period; symptoms may still evolve.",
      diagnosisInstructions:
        "Have a responsible adult observe you as directed for the first 24 hours. Rest as directed and avoid strenuous activity, contact sports, or driving until symptoms fully resolve or you are cleared by a clinician. Return precautions for worsening or concerning symptoms were reviewed.",
      medicationTreatment: HEAD_FACIAL_MED_EN,
      returnPrecautions:
        "Return immediately for worsening headache, repeated vomiting, confusion, seizure, weakness or numbness, trouble waking, behavior change, or vision changes.",
      returnWorkSchool:
        "Return to work, school, or sports only as directed by your clinician after the observation period.",
    },
    {
      description:
        "Vous avez été évalué et observé aux urgences après un traumatisme crânien. Aucune fracture ni saignement nécessitant une intervention n'a été identifié pendant cette période d'observation ; les symptômes peuvent encore évoluer.",
      diagnosisInstructions:
        "Faites-vous observer par un adulte responsable selon les indications pendant les 24 premières heures. Reposez-vous selon les indications et évitez les efforts intenses, les sports de contact ou la conduite jusqu'à la résolution complète des symptômes ou l'autorisation d'un clinicien. Les consignes de retour en cas d'aggravation ou de signes inquiétants ont été revues.",
      medicationTreatment: HEAD_FACIAL_MED_FR,
      returnPrecautions:
        "Reconsultez immédiatement aux urgences en cas de céphalée aggravée, de vomissements répétés, de confusion, de convulsion, de faiblesse ou engourdissement, de difficulté à se réveiller, de changement de comportement ou de trouble visuel.",
      returnWorkSchool:
        "Reprenez le travail, les cours ou le sport uniquement selon les instructions de votre clinicien après la période d'observation.",
    }
  );

export const SKULL_FRACTURE_FOLLOWUP_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a skull fracture after this evaluation. Skull fractures can be associated with underlying brain injury; close observation and follow-up are important.",
      diagnosisInstructions:
        "Rest as directed. Avoid contact sports, heavy activity, and driving until cleared by your clinician. Have a responsible adult monitor you as directed. Keep the area clean and avoid pressure on the fracture site. Follow up as directed for repeat neurologic or neurosurgical evaluation.",
      medicationTreatment: HEAD_FACIAL_MED_EN,
      returnPrecautions:
        "Return immediately for worsening headache, repeated vomiting, confusion, seizure, weakness or numbness, trouble waking, clear fluid draining from the nose or ear, new bruising behind the ear or around the eyes, or vision changes.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une fracture du crâne après cette évaluation. Les fractures du crâne peuvent être associées à une lésion cérébrale sous-jacente ; une surveillance étroite et un suivi sont importants.",
      diagnosisInstructions:
        "Reposez-vous selon les indications. Évitez les sports de contact, les efforts importants et la conduite jusqu'à l'autorisation de votre clinicien. Faites-vous surveiller par un adulte responsable selon les indications. Gardez la zone propre et évitez toute pression sur le site de la fracture. Suivez le suivi selon les directives pour une nouvelle évaluation neurologique ou neurochirurgicale.",
      medicationTreatment: HEAD_FACIAL_MED_FR,
      returnPrecautions:
        "Retournez immédiatement aux urgences en cas de céphalée aggravée, de vomissements répétés, de confusion, de convulsion, de faiblesse ou engourdissement, de difficulté à se réveiller, d'écoulement de liquide clair du nez ou de l'oreille, de nouvelle ecchymose derrière l'oreille ou autour des yeux, ou de trouble visuel.",
    }
  );

export const INTRACRANIAL_HEMORRHAGE_FOLLOWUP_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated for a traumatic intracranial hemorrhage (bleeding around or in the brain). This documentation is used only after clinician evaluation and an explicit decision that outpatient management is appropriate; this is not routine concussion rest advice. Intracranial hemorrhage carries a higher risk of delayed complications than a simple concussion.",
      diagnosisInstructions:
        "Have a responsible adult observe you closely as directed. Rest as directed and avoid any contact sports, heavy exertion, alcohol, blood thinners not approved by your clinician, and driving until specifically cleared. Keep all scheduled follow-up imaging and neurosurgery or neurology appointments — do not skip these.",
      medicationTreatment:
        "Take pain medicines only as prescribed or directed during this visit. Do not take aspirin, NSAIDs (such as ibuprofen), or blood thinners unless specifically approved by your clinician, as these can increase bleeding risk.",
      returnPrecautions:
        "Return immediately or call emergency services for worsening headache, repeated vomiting, confusion, drowsiness or difficulty waking, seizure, new weakness or numbness, unequal pupils, slurred speech, or any worsening neurologic symptoms. This bleeding requires close follow-up even if you feel better.",
    },
    {
      description:
        "Vous avez été évalué pour une hémorragie intracrânienne traumatique (saignement autour ou dans le cerveau). Cette documentation n'est utilisée qu'après évaluation clinique et décision explicite qu'une prise en charge ambulatoire est appropriée ; il ne s'agit pas de conseils de repos habituels pour une commotion. Une hémorragie intracrânienne comporte un risque plus élevé de complications retardées qu'une simple commotion.",
      diagnosisInstructions:
        "Faites-vous surveiller étroitement par un adulte responsable selon les indications. Reposez-vous selon les indications et évitez tout sport de contact, effort intense, alcool, anticoagulants non approuvés par votre clinicien et la conduite jusqu'à autorisation spécifique. Respectez tous les rendez-vous d'imagerie de suivi et de neurochirurgie ou neurologie prévus — ne les manquez pas.",
      medicationTreatment:
        "Prenez les antidouleurs uniquement selon la prescription ou les indications données pendant cette visite. Ne prenez pas d'aspirine, d'anti-inflammatoires (comme l'ibuprofène) ou d'anticoagulants sauf autorisation spécifique de votre clinicien, car cela peut augmenter le risque de saignement.",
      returnPrecautions:
        "Retournez immédiatement aux urgences ou appelez les services d'urgence en cas de céphalée aggravée, de vomissements répétés, de confusion, de somnolence ou de difficulté à se réveiller, de convulsion, de nouvelle faiblesse ou engourdissement, de pupilles inégales, de trouble de l'élocution ou de tout symptôme neurologique qui s'aggrave. Ce saignement nécessite un suivi étroit même si vous vous sentez mieux.",
    }
  );

export const NASAL_FRACTURE_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a nasal fracture (broken nose). Swelling may hide the final shape of the nose for several days.",
      diagnosisInstructions:
        "Ice the nose as directed to reduce swelling. Avoid blowing your nose forcefully. Avoid contact sports and activities that could re-injure the nose until cleared. Follow up as directed with ENT or your clinician once swelling decreases, for reassessment of alignment and septal hematoma.",
      medicationTreatment: HEAD_FACIAL_MED_EN,
      returnPrecautions:
        "Return immediately for worsening pain, worsening swelling, difficulty breathing through the nose, persistent or heavy nosebleed, clear fluid draining from the nose, vision changes, or fever.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une fracture nasale (nez cassé). L'enflure peut masquer la forme définitive du nez pendant plusieurs jours.",
      diagnosisInstructions:
        "Glace sur le nez selon les directives pour réduire l'enflure. Évitez de vous moucher fort. Évitez les sports de contact et les activités pouvant blesser à nouveau le nez jusqu'à l'autorisation. Suivez le suivi en ORL ou avec votre clinicien selon les directives une fois l'enflure réduite, pour réévaluer l'alignement et rechercher un hématome de la cloison nasale.",
      medicationTreatment: HEAD_FACIAL_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur, d'aggravation de l'enflure, de difficulté à respirer par le nez, de saignement de nez persistant ou important, d'écoulement de liquide clair du nez, de changement de vision ou de fièvre.",
    }
  );

export const ORBITAL_FRACTURE_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for an orbital (eye socket) fracture. Eye function and vision must be protected while this heals.",
      diagnosisInstructions:
        "Avoid blowing your nose or straining, which can push air into the eye socket. Use ice as directed to reduce swelling. Avoid contact sports and activities that risk re-injury until cleared. Follow up as directed for repeat eye (ophthalmology) and facial (ENT or maxillofacial) evaluation.",
      medicationTreatment: HEAD_FACIAL_MED_EN,
      returnPrecautions:
        "Return immediately for worsening pain, worsening swelling, double vision, vision loss or vision changes, inability to move the eye normally, new numbness of the face, or fever.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une fracture de l'orbite (cavité de l'œil). La fonction visuelle et la vision doivent être protégées pendant la guérison.",
      diagnosisInstructions:
        "Évitez de vous moucher ou de forcer, ce qui peut pousser de l'air dans la cavité orbitaire. Utilisez de la glace selon les directives pour réduire l'enflure. Évitez les sports de contact et les activités à risque de nouvelle blessure jusqu'à l'autorisation. Suivez le suivi selon les directives pour une nouvelle évaluation ophtalmologique et faciale (ORL ou maxillo-faciale).",
      medicationTreatment: HEAD_FACIAL_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur, d'aggravation de l'enflure, de vision double, de perte de vision ou de changement de vision, d'incapacité à bouger l'œil normalement, de nouvel engourdissement du visage ou de fièvre.",
    }
  );

export const MANDIBULAR_FRACTURE_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a mandible (lower jaw) fracture. Proper healing depends on limiting jaw movement and following diet restrictions.",
      diagnosisInstructions:
        "Eat a soft or liquid diet only as directed. Avoid wide mouth opening, hard or chewy foods, and contact sports until cleared. If your jaw was wired or banded, keep emergency wire cutters available as instructed. Follow up as directed with oral/maxillofacial surgery or ENT.",
      medicationTreatment: HEAD_FACIAL_MED_EN,
      returnPrecautions:
        "Return immediately for worsening pain, worsening swelling, new numbness of the face or lip, difficulty breathing, inability to close the mouth, drooling you cannot control, or new difficulty biting or misaligned bite.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une fracture de la mandibule (mâchoire inférieure). Une bonne guérison dépend de la limitation des mouvements de la mâchoire et du respect des restrictions alimentaires.",
      diagnosisInstructions:
        "Alimentation molle ou liquide uniquement selon les directives. Évitez d'ouvrir grand la bouche, les aliments durs ou collants et les sports de contact jusqu'à l'autorisation. Si votre mâchoire a été fixée par fils ou élastiques, gardez des ciseaux coupe-fils d'urgence disponibles selon les indications. Suivez le suivi en chirurgie orale/maxillo-faciale ou ORL selon les directives.",
      medicationTreatment: HEAD_FACIAL_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur, d'aggravation de l'enflure, de nouvel engourdissement du visage ou de la lèvre, de difficulté à respirer, d'incapacité à fermer la bouche, de bave incontrôlable ou de nouvelle difficulté à mordre ou mauvais alignement dentaire.",
    }
  );

export const MAXILLARY_LEFORT_FRACTURE_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a maxillary (Le Fort) facial fracture. This is a significant facial injury; oral/maxillofacial surgery involvement and close follow-up are typically required.",
      diagnosisInstructions:
        "Eat a soft or liquid diet only as directed. Avoid nose blowing, straining, and contact sports until cleared. Keep the head elevated as directed to reduce swelling. Follow up as directed with oral/maxillofacial surgery for reassessment and possible imaging.",
      medicationTreatment: HEAD_FACIAL_MED_EN,
      returnPrecautions:
        "Return immediately for worsening pain, worsening facial swelling, difficulty breathing, clear fluid draining from the nose, vision changes, double vision, new numbness of the face, or new difficulty with your bite.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une fracture faciale maxillaire (Le Fort). Il s'agit d'une blessure faciale importante ; l'intervention d'un chirurgien maxillo-facial et un suivi étroit sont généralement nécessaires.",
      diagnosisInstructions:
        "Alimentation molle ou liquide uniquement selon les directives. Évitez de vous moucher, de forcer et les sports de contact jusqu'à l'autorisation. Gardez la tête surélevée selon les directives pour réduire l'enflure. Suivez le suivi en chirurgie maxillo-faciale selon les directives pour réévaluation et imagerie éventuelle.",
      medicationTreatment: HEAD_FACIAL_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur, d'aggravation de l'enflure du visage, de difficulté à respirer, d'écoulement de liquide clair du nez, de changement de vision, de vision double, de nouvel engourdissement du visage ou de nouvelle difficulté à mordre.",
    }
  );

export const DENTAL_TRAUMA_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a traumatic tooth fracture. Follow-up dental care is important to protect the tooth and nerve.",
      diagnosisInstructions:
        "Eat a soft diet and avoid chewing on the affected tooth until seen by a dentist. Avoid very hot or cold foods and drinks if the tooth is sensitive. Follow up with a dentist as directed, ideally within a few days.",
      medicationTreatment: HEAD_FACIAL_MED_EN,
      returnPrecautions:
        "Return immediately for worsening facial swelling, fever, difficulty swallowing or breathing, or spreading redness. Follow up with dental for worsening tooth pain or new looseness of the tooth.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une fracture dentaire traumatique. Un suivi dentaire est important pour protéger la dent et le nerf.",
      diagnosisInstructions:
        "Alimentation molle et évitez de mâcher sur la dent atteinte jusqu'à la consultation dentaire. Évitez les aliments et boissons très chauds ou très froids si la dent est sensible. Consultez un dentiste selon les directives, idéalement dans les prochains jours.",
      medicationTreatment: HEAD_FACIAL_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de l'enflure du visage, de fièvre, de difficulté à avaler ou à respirer, ou de rougeur qui s'étend. Consultez un dentiste en cas d'aggravation de la douleur dentaire ou de nouvelle mobilité de la dent.",
    }
  );

export const TOOTH_AVULSION_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a knocked-out (avulsed) or displaced tooth. Time-sensitive dental follow-up gives the best chance of saving the tooth.",
      diagnosisInstructions:
        "See a dentist as soon as possible — ideally the same day — for reimplantation or splinting as needed. Eat a soft diet and avoid chewing on the affected area. If a permanent tooth was replanted or splinted, avoid biting on it until directed by your dentist.",
      medicationTreatment: HEAD_FACIAL_MED_EN,
      returnPrecautions:
        "Return immediately for worsening facial swelling, fever, difficulty swallowing or breathing, or spreading redness. See a dentist urgently if the tooth becomes loose again or falls out.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une dent arrachée (avulsée) ou déplacée. Un suivi dentaire rapide donne les meilleures chances de sauver la dent.",
      diagnosisInstructions:
        "Consultez un dentiste dès que possible — idéalement le même jour — pour une réimplantation ou une contention si nécessaire. Alimentation molle et évitez de mâcher sur la zone atteinte. Si une dent permanente a été réimplantée ou attelée, évitez de mordre dessus jusqu'à l'avis de votre dentiste.",
      medicationTreatment: HEAD_FACIAL_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de l'enflure du visage, de fièvre, de difficulté à avaler ou à respirer, ou de rougeur qui s'étend. Consultez un dentiste en urgence si la dent devient à nouveau mobile ou tombe.",
    }
  );

export const JAW_DISLOCATION_POST_REDUCTION_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a jaw (TMJ) dislocation, which has been reduced (put back into place) during this visit. Symptoms may change after the visit.",
      diagnosisInstructions:
        "Eat a soft diet only as directed. Avoid wide mouth opening, yawning forcefully, and hard chewing for the time directed to reduce the risk of re-dislocation. Follow up as directed for maxillofacial or ENT evaluation.",
      medicationTreatment: HEAD_FACIAL_MED_EN,
      returnPrecautions:
        "Return immediately for inability to close the mouth, worsening pain, new facial numbness, difficulty breathing, or recurrent jaw locking or dislocation.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une luxation de la mâchoire (ATM), qui a été réduite (remise en place) lors de cette visite. Les symptômes peuvent évoluer après la visite.",
      diagnosisInstructions:
        "Alimentation molle uniquement selon les directives. Évitez d'ouvrir grand la bouche, de bâiller fort et de mâcher des aliments durs pendant la durée indiquée pour réduire le risque de nouvelle luxation. Suivez le suivi selon les directives pour une évaluation maxillo-faciale ou ORL.",
      medicationTreatment: HEAD_FACIAL_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'incapacité à fermer la bouche, d'aggravation de la douleur, de nouvel engourdissement du visage, de difficulté à respirer ou de blocage ou de luxation récidivante de la mâchoire.",
    }
  );

export const AURICULAR_HEMATOMA_FOLLOWUP_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a hematoma (blood collection) of the ear (auricle/pinna). Without prompt drainage and follow-up, this can lead to permanent ear deformity (cauliflower ear).",
      diagnosisInstructions:
        "Keep any pressure dressing or bolster on the ear as directed — do not remove it early. Avoid contact sports (wrestling, boxing, martial arts) until fully healed and cleared. Follow up as directed with ENT within the timeframe given, as re-accumulation of the hematoma can occur and may need repeat drainage.",
      medicationTreatment: HEAD_FACIAL_MED_EN,
      returnPrecautions:
        "Return immediately for worsening pain, worsening swelling, fever, spreading redness, or if the dressing becomes soaked or falls off early. Follow up urgently with ENT if the swelling returns.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour un hématome (accumulation de sang) de l'oreille (pavillon/pinna). Sans drainage rapide et suivi, cela peut entraîner une déformation permanente de l'oreille (oreille en chou-fleur).",
      diagnosisInstructions:
        "Gardez le pansement compressif ou l'attelle sur l'oreille selon les directives — ne le retirez pas trop tôt. Évitez les sports de contact (lutte, boxe, arts martiaux) jusqu'à guérison complète et autorisation. Suivez le suivi en ORL selon le délai indiqué, car une récidive de l'hématome peut survenir et nécessiter un nouveau drainage.",
      medicationTreatment: HEAD_FACIAL_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur, d'aggravation de l'enflure, de fièvre, de rougeur qui s'étend, ou si le pansement devient imbibé ou se détache trop tôt. Consultez en urgence en ORL si l'enflure revient.",
    }
  );

export const SEPTAL_HEMATOMA_FOLLOWUP_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a nasal septal hematoma (blood collection inside the nasal septum). This requires urgent drainage to prevent septal cartilage damage and must not be left untreated — escalate to ENT promptly if not already drained.",
      diagnosisInstructions:
        "If the hematoma was drained during this visit, keep any nasal packing or splint in place as directed. Avoid blowing your nose forcefully. Follow up urgently with ENT as directed, as re-accumulation can occur and requires prompt re-evaluation.",
      medicationTreatment: HEAD_FACIAL_MED_EN,
      returnPrecautions:
        "Return immediately or escalate to ENT for worsening nasal pain or swelling, fever, difficulty breathing through the nose, or if drainage or packing falls out early — untreated septal hematoma can permanently damage the nasal septum within days.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour un hématome de la cloison nasale (accumulation de sang à l'intérieur du septum nasal). Ceci nécessite un drainage urgent pour éviter une lésion du cartilage septal et ne doit pas être laissé sans traitement — orientez rapidement vers l'ORL si le drainage n'a pas déjà été fait.",
      diagnosisInstructions:
        "Si l'hématome a été drainé lors de cette visite, gardez le méchage ou l'attelle nasale en place selon les directives. Évitez de vous moucher fort. Consultez en urgence en ORL selon les directives, car une récidive peut survenir et nécessite une réévaluation rapide.",
      medicationTreatment: HEAD_FACIAL_MED_FR,
      returnPrecautions:
        "Retournez immédiatement ou orientez-vous en urgence vers l'ORL en cas d'aggravation de la douleur ou de l'enflure nasale, de fièvre, de difficulté à respirer par le nez, ou si le méchage ou l'attelle tombe prématurément — un hématome septal non traité peut endommager définitivement le septum nasal en quelques jours.",
    }
  );

export const FACIAL_LACERATION_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a facial laceration (cut). Facial wounds are closely monitored for cosmetic healing and infection.",
      diagnosisInstructions:
        "Keep the wound clean and dry as directed. Apply ointment and change the dressing as directed. Avoid sun exposure to the healing scar and use sunscreen once healed to reduce scarring. Follow up as directed for suture/staple removal or wound check.",
      medicationTreatment: HEAD_FACIAL_MED_EN,
      returnPrecautions:
        "Return immediately for worsening pain, worsening swelling, spreading redness, pus or foul drainage, fever, wound reopening, or numbness of the face.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une lacération (coupure) du visage. Les plaies du visage sont surveillées de près pour la guérison esthétique et l'infection.",
      diagnosisInstructions:
        "Gardez la plaie propre et sèche selon les directives. Appliquez la pommade et changez le pansement selon les directives. Évitez l'exposition au soleil de la cicatrice en cours de guérison et utilisez un écran solaire une fois guérie pour réduire les cicatrices. Suivez le suivi selon les directives pour le retrait des points/agrafes ou le contrôle de la plaie.",
      medicationTreatment: HEAD_FACIAL_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur, d'aggravation de l'enflure, de rougeur qui s'étend, de pus ou d'écoulement nauséabond, de fièvre, de réouverture de la plaie ou d'engourdissement du visage.",
    }
  );

/** Phase 11 — eye emergencies discharge suggested text (advisory documentation only). */
const EYE_MED_EN =
  "Use only the eye drops, eye ointment, or pain medicines prescribed or specifically recommended during this visit.";
const EYE_MED_FR =
  "Utilisez uniquement les gouttes, la pommade ophtalmique ou les antidouleurs prescrits ou recommandés spécifiquement lors de cette visite.";

export const CORNEAL_ABRASION_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a corneal abrasion — a scratch on the clear front surface of the eye.",
      diagnosisInstructions:
        "Avoid rubbing or touching the affected eye. Wear sunglasses outdoors if light bothers the eye. Do not wear contact lenses until fully healed and cleared by a clinician. Most corneal abrasions heal within 1 to 3 days.",
      medicationTreatment: EYE_MED_EN,
      returnPrecautions:
        "Return immediately for worsening eye pain, worsening redness, new or worsening vision changes, worsening light sensitivity, or new discharge from the eye.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une abrasion cornéenne — une éraflure de la surface claire de l'œil.",
      diagnosisInstructions:
        "Évitez de frotter ou de toucher l'œil atteint. Portez des lunettes de soleil à l'extérieur si la lumière incommode l'œil. Ne portez pas de lentilles de contact avant la guérison complète et l'autorisation d'un clinicien. La plupart des abrasions cornéennes guérissent en 1 à 3 jours.",
      medicationTreatment: EYE_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur oculaire, d'aggravation de la rougeur, de changements de vision nouveaux ou qui s'aggravent, d'aggravation de la sensibilité à la lumière, ou de nouvel écoulement de l'œil.",
    }
  );

export const CORNEAL_FOREIGN_BODY_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a corneal foreign body that was identified on the clear front surface of the eye.",
      diagnosisInstructions:
        "Avoid rubbing the eye. Do not wear contact lenses until fully healed and cleared by a clinician. Some scratchy or gritty sensation is expected for a day or two after the foreign body is removed.",
      medicationTreatment: EYE_MED_EN,
      returnPrecautions:
        "Return immediately for worsening eye pain, worsening redness, new or worsening vision changes, worsening light sensitivity, or discharge from the eye.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour un corps étranger cornéen identifié sur la surface claire de l'œil.",
      diagnosisInstructions:
        "Évitez de frotter l'œil. Ne portez pas de lentilles de contact avant la guérison complète et l'autorisation d'un clinicien. Une légère sensation de grattement est attendue pendant un jour ou deux après le retrait du corps étranger.",
      medicationTreatment: EYE_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur oculaire, d'aggravation de la rougeur, de changements de vision nouveaux ou qui s'aggravent, d'aggravation de la sensibilité à la lumière, ou d'écoulement de l'œil.",
    }
  );

export const POST_OCULAR_FOREIGN_BODY_REMOVAL_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department after removal of a foreign body from the eye. Aftercare helps the surface of the eye heal without infection.",
      diagnosisInstructions:
        "Avoid rubbing the eye. Do not wear contact lenses until fully healed and cleared by a clinician. A gritty or scratchy feeling for a day or two after removal is common and should gradually improve.",
      medicationTreatment: EYE_MED_EN,
      returnPrecautions:
        "Return immediately for worsening eye pain, worsening redness, new or worsening vision changes, worsening light sensitivity, or discharge from the eye.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences après le retrait d'un corps étranger de l'œil. Les soins post-retrait favorisent la guérison de la surface de l'œil sans infection.",
      diagnosisInstructions:
        "Évitez de frotter l'œil. Ne portez pas de lentilles de contact avant la guérison complète et l'autorisation d'un clinicien. Une sensation de grattement pendant un jour ou deux après le retrait est fréquente et devrait s'améliorer progressivement.",
      medicationTreatment: EYE_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur oculaire, d'aggravation de la rougeur, de changements de vision nouveaux ou qui s'aggravent, d'aggravation de la sensibilité à la lumière, ou d'écoulement de l'œil.",
    }
  );

export const PHOTOKERATITIS_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for photokeratitis (a sunburn-like injury of the cornea from UV light exposure, such as welding flash or bright snow glare).",
      diagnosisInstructions:
        "Avoid further UV light exposure and wear proper UV-protective eyewear once symptomatic photophobia improves. Avoid rubbing the eyes. Symptoms typically improve within 24 to 48 hours.",
      medicationTreatment: EYE_MED_EN,
      returnPrecautions:
        "Return immediately for worsening eye pain, worsening vision changes, worsening light sensitivity that does not improve, or discharge from the eye.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une photokératite (une atteinte de la cornée semblable à un coup de soleil, causée par une exposition aux rayons UV, comme un flash de soudure ou l'éblouissement de la neige).",
      diagnosisInstructions:
        "Évitez toute exposition supplémentaire aux rayons UV et portez des lunettes de protection UV appropriées une fois la photophobie améliorée. Évitez de frotter les yeux. Les symptômes s'améliorent généralement en 24 à 48 heures.",
      medicationTreatment: EYE_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur oculaire, de changements de vision qui s'aggravent, de sensibilité à la lumière qui ne s'améliore pas, ou d'écoulement de l'œil.",
    }
  );

export const CORNEAL_ULCER_FOLLOWUP_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a corneal ulcer (an infection or sore on the clear front surface of the eye). Close ophthalmology follow-up is required to protect vision.",
      diagnosisInstructions:
        "Do not wear contact lenses until fully healed and cleared by an eye clinician. Avoid rubbing the eye. Use eye drops exactly on the schedule directed — missed doses can allow the infection to worsen.",
      medicationTreatment: EYE_MED_EN,
      returnPrecautions:
        "Return immediately for worsening eye pain, worsening redness, new or worsening vision loss, increasing white/cloudy spot on the eye, or new discharge from the eye.",
      returnWorkSchool:
        "Follow up with ophthalmology as directed — this is not routine primary care follow-up.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour un ulcère cornéen (une infection ou une plaie sur la surface claire de l'œil). Un suivi ophtalmologique rapproché est requis pour protéger la vision.",
      diagnosisInstructions:
        "Ne portez pas de lentilles de contact avant la guérison complète et l'autorisation d'un clinicien en ophtalmologie. Évitez de frotter l'œil. Utilisez les gouttes ophtalmiques exactement selon l'horaire indiqué — des doses manquées peuvent aggraver l'infection.",
      medicationTreatment: EYE_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur oculaire, d'aggravation de la rougeur, de perte de vision nouvelle ou qui s'aggrave, d'une tache blanchâtre ou trouble qui augmente sur l'œil, ou d'un nouvel écoulement de l'œil.",
      returnWorkSchool:
        "Faites le suivi en ophtalmologie selon les directives — ceci n'est pas un suivi habituel de soins primaires.",
    }
  );

export const CHEMICAL_EYE_INJURY_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a chemical eye exposure. The eye was irrigated and evaluated for ongoing injury.",
      diagnosisInstructions:
        "Avoid rubbing the eye. Do not wear contact lenses until fully healed and cleared by a clinician. Avoid further exposure to the causative chemical and review safety eyewear for future exposure risk.",
      medicationTreatment: EYE_MED_EN,
      returnPrecautions:
        "Return immediately for worsening eye pain, worsening redness, new or worsening vision changes, worsening light sensitivity, or a white/cloudy spot on the eye.",
      returnWorkSchool: "Follow up with ophthalmology as directed.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une exposition chimique de l'œil. L'œil a été irrigué et évalué pour une atteinte évolutive.",
      diagnosisInstructions:
        "Évitez de frotter l'œil. Ne portez pas de lentilles de contact avant la guérison complète et l'autorisation d'un clinicien. Évitez toute nouvelle exposition au produit chimique en cause et vérifiez le port de lunettes de protection pour un risque futur.",
      medicationTreatment: EYE_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur oculaire, d'aggravation de la rougeur, de changements de vision nouveaux ou qui s'aggravent, d'aggravation de la sensibilité à la lumière, ou d'une tache blanchâtre ou trouble sur l'œil.",
      returnWorkSchool: "Faites le suivi en ophtalmologie selon les directives.",
    }
  );

export const TRAUMATIC_IRITIS_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for traumatic iritis (inflammation inside the eye following an injury).",
      diagnosisInstructions:
        "Wear sunglasses outdoors if light bothers the eye. Avoid rubbing the eye. Use eye drops exactly on the schedule directed. Avoid contact sports until cleared by an eye clinician.",
      medicationTreatment: EYE_MED_EN,
      returnPrecautions:
        "Return immediately for worsening eye pain, worsening redness, new or worsening vision changes, worsening light sensitivity, or a change in pupil appearance.",
      returnWorkSchool: "Follow up with ophthalmology as directed.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une iritis traumatique (inflammation à l'intérieur de l'œil après une blessure).",
      diagnosisInstructions:
        "Portez des lunettes de soleil à l'extérieur si la lumière incommode l'œil. Évitez de frotter l'œil. Utilisez les gouttes ophtalmiques exactement selon l'horaire indiqué. Évitez les sports de contact jusqu'à l'autorisation d'un clinicien en ophtalmologie.",
      medicationTreatment: EYE_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur oculaire, d'aggravation de la rougeur, de changements de vision nouveaux ou qui s'aggravent, d'aggravation de la sensibilité à la lumière, ou d'un changement d'aspect de la pupille.",
      returnWorkSchool: "Faites le suivi en ophtalmologie selon les directives.",
    }
  );

export const HYPHEMA_FOLLOWUP_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a hyphema (blood inside the front part of the eye after an injury). This requires close ophthalmology follow-up to protect vision and eye pressure.",
      diagnosisInstructions:
        "Rest with the head elevated as directed. Avoid bending, straining, and heavy lifting. Avoid contact sports and any activity that risks re-injury until cleared by an eye clinician. Avoid aspirin or other blood-thinning medicines unless directed by your clinician.",
      medicationTreatment: EYE_MED_EN,
      returnPrecautions:
        "Return immediately for worsening eye pain, worsening vision changes, new or worsening redness, or if the blood in the eye appears to increase.",
      returnWorkSchool: "Follow up with ophthalmology as directed — this is not routine primary care follow-up.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour un hyphéma (présence de sang dans la partie avant de l'œil après une blessure). Un suivi ophtalmologique rapproché est requis pour protéger la vision et la pression oculaire.",
      diagnosisInstructions:
        "Reposez-vous avec la tête surélevée selon les directives. Évitez de vous pencher, de forcer et de soulever des objets lourds. Évitez les sports de contact et toute activité à risque de nouvelle blessure jusqu'à l'autorisation d'un clinicien en ophtalmologie. Évitez l'aspirine ou d'autres médicaments anticoagulants sauf indication contraire de votre clinicien.",
      medicationTreatment: EYE_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur oculaire, de changements de vision qui s'aggravent, de rougeur nouvelle ou qui s'aggrave, ou si la quantité de sang dans l'œil semble augmenter.",
      returnWorkSchool: "Faites le suivi en ophtalmologie selon les directives — ceci n'est pas un suivi habituel de soins primaires.",
    }
  );

export const OPEN_GLOBE_POST_ACUTE_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated and treated for an open globe (penetrating) eye injury. This documentation is used only after specialty ophthalmology/surgical management has already directed outpatient aftercare.",
      diagnosisInstructions:
        "Keep the protective shield or eyewear in place exactly as directed. Avoid any pressure on the eye, rubbing, straining, or heavy lifting. Avoid bending at the waist and any activity that increases pressure in the eye until cleared by ophthalmology.",
      medicationTreatment: EYE_MED_EN,
      returnPrecautions:
        "Return immediately for worsening eye pain, worsening vision loss, new drainage from the eye, or fever.",
      returnWorkSchool: "Follow up with ophthalmology exactly as directed — this injury requires specialist-directed aftercare only.",
    },
    {
      description:
        "Vous avez été pris en charge pour une plaie oculaire pénétrante (globe ouvert). Ce document est utilisé uniquement après qu'une prise en charge spécialisée en ophtalmologie/chirurgie a déjà déterminé les soins ambulatoires.",
      diagnosisInstructions:
        "Gardez la coque protectrice ou les lunettes de protection en place exactement selon les directives. Évitez toute pression sur l'œil, tout frottement, tout effort et le port de charges lourdes. Évitez de vous pencher à la taille et toute activité augmentant la pression dans l'œil jusqu'à l'autorisation de l'ophtalmologie.",
      medicationTreatment: EYE_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur oculaire, de perte de vision qui s'aggrave, de nouvel écoulement de l'œil, ou de fièvre.",
      returnWorkSchool: "Faites le suivi en ophtalmologie exactement selon les directives — cette blessure nécessite des soins dirigés uniquement par le spécialiste.",
    }
  );

export const ACUTE_GLAUCOMA_FOLLOWUP_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated and treated for acute angle-closure glaucoma (a sudden rise in eye pressure). This documentation is used only after ophthalmology has directed outpatient aftercare.",
      diagnosisInstructions:
        "Use eye drops exactly on the schedule directed — missed doses can allow eye pressure to rise again. Avoid activities and medicines your clinician told you to avoid. Keep the urgent ophthalmology follow-up appointment; laser treatment of the other eye may also be recommended.",
      medicationTreatment: EYE_MED_EN,
      returnPrecautions:
        "Return immediately for worsening eye pain, worsening headache, worsening nausea or vomiting, worsening vision changes, or halos around lights that worsen.",
      returnWorkSchool: "Follow up with ophthalmology exactly as directed — this is an urgent specialist follow-up, not routine primary care.",
    },
    {
      description:
        "Vous avez été pris en charge pour un glaucome aigu par fermeture de l'angle (une élévation soudaine de la pression oculaire). Ce document est utilisé uniquement après qu'une prise en charge en ophtalmologie a déjà déterminé les soins ambulatoires.",
      diagnosisInstructions:
        "Utilisez les gouttes ophtalmiques exactement selon l'horaire indiqué — des doses manquées peuvent faire remonter la pression oculaire. Évitez les activités et les médicaments que votre clinicien vous a demandé d'éviter. Respectez le rendez-vous ophtalmologique urgent; un traitement au laser de l'autre œil peut aussi être recommandé.",
      medicationTreatment: EYE_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur oculaire, d'aggravation des maux de tête, d'aggravation des nausées ou vomissements, de changements de vision qui s'aggravent, ou de halos autour des lumières qui s'aggravent.",
      returnWorkSchool: "Faites le suivi en ophtalmologie exactement selon les directives — il s'agit d'un suivi spécialisé urgent, non d'un suivi habituel de soins primaires.",
    }
  );

export const RETINAL_DETACHMENT_FOLLOWUP_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated for a retinal detachment or related retinal finding. This documentation is used only after ophthalmology has directed outpatient aftercare and timing of any procedure.",
      diagnosisInstructions:
        "Follow any positioning instructions (such as head position) exactly as directed by ophthalmology. Avoid heavy lifting, straining, and strenuous activity until cleared. Keep the urgent ophthalmology follow-up appointment — timing of treatment affects vision outcome.",
      medicationTreatment: EYE_MED_EN,
      returnPrecautions:
        "Return immediately for a new or worsening curtain or shadow in your vision, a sudden increase in floaters or flashes of light, or new vision loss.",
      returnWorkSchool: "Follow up with ophthalmology exactly as directed — this is an urgent specialist follow-up, not routine primary care.",
    },
    {
      description:
        "Vous avez été pris en charge pour un décollement de la rétine ou une atteinte rétinienne connexe. Ce document est utilisé uniquement après qu'une prise en charge en ophtalmologie a déjà déterminé les soins ambulatoires et le moment de toute intervention.",
      diagnosisInstructions:
        "Suivez toute consigne de positionnement (comme la position de la tête) exactement selon les directives de l'ophtalmologie. Évitez de soulever des charges lourdes, de forcer et toute activité intense jusqu'à l'autorisation. Respectez le rendez-vous ophtalmologique urgent — le moment du traitement influence le résultat visuel.",
      medicationTreatment: EYE_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas de rideau ou d'ombre nouveau ou qui s'aggrave dans votre vision, d'augmentation soudaine des corps flottants ou des éclairs lumineux, ou de nouvelle perte de vision.",
      returnWorkSchool: "Faites le suivi en ophtalmologie exactement selon les directives — il s'agit d'un suivi spécialisé urgent, non d'un suivi habituel de soins primaires.",
    }
  );

export const VITREOUS_HEMORRHAGE_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated for a vitreous hemorrhage (bleeding inside the back chamber of the eye).",
      diagnosisInstructions:
        "Rest with the head elevated as directed. Avoid heavy lifting, straining, and strenuous activity until cleared. Avoid aspirin or other blood-thinning medicines unless directed by your clinician.",
      medicationTreatment: EYE_MED_EN,
      returnPrecautions:
        "Return immediately for a new or worsening curtain or shadow in your vision, a sudden increase in floaters or flashes of light, worsening vision loss, or worsening eye pain.",
      returnWorkSchool: "Follow up with ophthalmology as directed.",
    },
    {
      description:
        "Vous avez été pris en charge pour une hémorragie du vitré (saignement à l'intérieur de la chambre postérieure de l'œil).",
      diagnosisInstructions:
        "Reposez-vous avec la tête surélevée selon les directives. Évitez de soulever des charges lourdes, de forcer et toute activité intense jusqu'à l'autorisation. Évitez l'aspirine ou d'autres médicaments anticoagulants sauf indication contraire de votre clinicien.",
      medicationTreatment: EYE_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas de rideau ou d'ombre nouveau ou qui s'aggrave dans votre vision, d'augmentation soudaine des corps flottants ou des éclairs lumineux, de perte de vision qui s'aggrave, ou d'aggravation de la douleur oculaire.",
      returnWorkSchool: "Faites le suivi en ophtalmologie selon les directives.",
    }
  );

export const ORBITAL_CELLULITIS_FOLLOWUP_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated and treated for orbital cellulitis (a serious infection behind the eye). This documentation is used only after specialty-directed outpatient antibiotic aftercare.",
      diagnosisInstructions:
        "Take the full course of antibiotics exactly as prescribed, even if you feel better. Keep the close follow-up appointment to check the eye's response to treatment.",
      medicationTreatment: EYE_MED_EN,
      returnPrecautions:
        "Return immediately for worsening eye swelling, worsening pain with eye movement, new or worsening vision changes, bulging of the eye, worsening fever, or confusion.",
      returnWorkSchool: "Follow up exactly as directed — this infection can worsen quickly and requires close monitoring.",
    },
    {
      description:
        "Vous avez été pris en charge pour une cellulite orbitaire (une infection grave derrière l'œil). Ce document est utilisé uniquement après une prise en charge antibiotique ambulatoire dirigée par un spécialiste.",
      diagnosisInstructions:
        "Prenez la totalité des antibiotiques exactement comme prescrit, même si vous vous sentez mieux. Respectez le rendez-vous de suivi rapproché pour vérifier la réponse de l'œil au traitement.",
      medicationTreatment: EYE_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de l'enflure de l'œil, d'aggravation de la douleur aux mouvements de l'œil, de changements de vision nouveaux ou qui s'aggravent, de saillie de l'œil, d'aggravation de la fièvre, ou de confusion.",
      returnWorkSchool: "Faites le suivi exactement selon les directives — cette infection peut s'aggraver rapidement et nécessite une surveillance rapprochée.",
    }
  );

export const PRESEPTAL_CELLULITIS_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated and treated for preseptal (periorbital) cellulitis, an infection of the eyelid and skin around the eye that has not spread behind the eye.",
      diagnosisInstructions:
        "Take the full course of antibiotics exactly as prescribed, even if you feel better. Warm compresses may be used as directed.",
      medicationTreatment: EYE_MED_EN,
      returnPrecautions:
        "Return immediately for worsening eye swelling, pain with eye movement, vision changes, bulging of the eye, or worsening fever — these signs may indicate the infection has spread behind the eye.",
      returnWorkSchool: "Follow up as directed to confirm improvement.",
    },
    {
      description:
        "Vous avez été pris en charge pour une cellulite préseptale (périorbitaire), une infection de la paupière et de la peau autour de l'œil qui ne s'est pas propagée derrière l'œil.",
      diagnosisInstructions:
        "Prenez la totalité des antibiotiques exactement comme prescrit, même si vous vous sentez mieux. Des compresses chaudes peuvent être utilisées selon les directives.",
      medicationTreatment: EYE_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de l'enflure de l'œil, de douleur aux mouvements de l'œil, de changements de vision, de saillie de l'œil, ou d'aggravation de la fièvre — ces signes peuvent indiquer que l'infection s'est propagée derrière l'œil.",
      returnWorkSchool: "Faites le suivi selon les directives pour confirmer l'amélioration.",
    }
  );

export const UVEITIS_IRITIS_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated and treated for uveitis/iritis (inflammation inside the eye).",
      diagnosisInstructions:
        "Wear sunglasses outdoors if light bothers the eye. Use eye drops exactly on the schedule directed — missed doses can allow the inflammation to worsen.",
      medicationTreatment: EYE_MED_EN,
      returnPrecautions:
        "Return immediately for worsening eye pain, worsening redness, new or worsening vision changes, or worsening light sensitivity.",
      returnWorkSchool: "Follow up with ophthalmology as directed.",
    },
    {
      description:
        "Vous avez été pris en charge pour une uvéite/iritis (inflammation à l'intérieur de l'œil).",
      diagnosisInstructions:
        "Portez des lunettes de soleil à l'extérieur si la lumière incommode l'œil. Utilisez les gouttes ophtalmiques exactement selon l'horaire indiqué — des doses manquées peuvent aggraver l'inflammation.",
      medicationTreatment: EYE_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur oculaire, d'aggravation de la rougeur, de changements de vision nouveaux ou qui s'aggravent, ou d'aggravation de la sensibilité à la lumière.",
      returnWorkSchool: "Faites le suivi en ophtalmologie selon les directives.",
    }
  );

export const SCLERITIS_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated and treated for scleritis (inflammation of the white outer wall of the eye).",
      diagnosisInstructions:
        "Wear sunglasses outdoors if light bothers the eye. Use any prescribed eye drops or oral medicines exactly on the schedule directed.",
      medicationTreatment: EYE_MED_EN,
      returnPrecautions:
        "Return immediately for worsening eye pain, worsening redness, new or worsening vision changes, or worsening light sensitivity.",
      returnWorkSchool: "Follow up with ophthalmology as directed.",
    },
    {
      description:
        "Vous avez été pris en charge pour une sclérite (inflammation de la paroi blanche externe de l'œil).",
      diagnosisInstructions:
        "Portez des lunettes de soleil à l'extérieur si la lumière incommode l'œil. Utilisez toute goutte ophtalmique ou médicament oral prescrit exactement selon l'horaire indiqué.",
      medicationTreatment: EYE_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur oculaire, d'aggravation de la rougeur, de changements de vision nouveaux ou qui s'aggravent, ou d'aggravation de la sensibilité à la lumière.",
      returnWorkSchool: "Faites le suivi en ophtalmologie selon les directives.",
    }
  );

export const EYELID_LACERATION_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for an eyelid laceration (cut). Eyelid wounds are closely monitored to protect eyelid function and eye protection.",
      diagnosisInstructions:
        "Keep the wound clean and dry as directed. Apply ointment and change the dressing as directed. Follow up as directed for suture removal or wound check.",
      medicationTreatment: EYE_MED_EN,
      returnPrecautions:
        "Return immediately for worsening pain, worsening swelling, spreading redness, pus or foul drainage, fever, wound reopening, or new vision changes.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une lacération (coupure) de la paupière. Les plaies de la paupière sont surveillées de près pour protéger la fonction palpébrale et la protection de l'œil.",
      diagnosisInstructions:
        "Gardez la plaie propre et sèche selon les directives. Appliquez la pommade et changez le pansement selon les directives. Suivez le suivi selon les directives pour le retrait des points ou le contrôle de la plaie.",
      medicationTreatment: EYE_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur, d'aggravation de l'enflure, de rougeur qui s'étend, de pus ou d'écoulement nauséabond, de fièvre, de réouverture de la plaie, ou de nouveaux changements de vision.",
    }
  );

export const CANALICULAR_INJURY_FOLLOWUP_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated for a canalicular (tear duct) injury near the eyelid. This documentation is used only after ophthalmology/ENT has directed outpatient aftercare, often after a repair procedure.",
      diagnosisInstructions:
        "Keep any stent or tube in place exactly as directed — do not remove it yourself. Keep the area clean and dry as directed. Keep the close specialist follow-up appointment.",
      medicationTreatment: EYE_MED_EN,
      returnPrecautions:
        "Return immediately for worsening pain, worsening swelling, spreading redness, pus or foul drainage, fever, or if the stent/tube falls out.",
      returnWorkSchool: "Follow up with the specialist exactly as directed.",
    },
    {
      description:
        "Vous avez été pris en charge pour une blessure canaliculaire (voie lacrymale) près de la paupière. Ce document est utilisé uniquement après qu'une prise en charge en ophtalmologie/ORL a déjà déterminé les soins ambulatoires, souvent après une réparation.",
      diagnosisInstructions:
        "Gardez toute tige ou tube en place exactement selon les directives — ne le retirez pas vous-même. Gardez la région propre et sèche selon les directives. Respectez le rendez-vous de suivi spécialisé rapproché.",
      medicationTreatment: EYE_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur, d'aggravation de l'enflure, de rougeur qui s'étend, de pus ou d'écoulement nauséabond, de fièvre, ou si la tige/le tube se déloge.",
      returnWorkSchool: "Faites le suivi avec le spécialiste exactement selon les directives.",
    }
  );

export const ENDOPHTHALMITIS_POST_ACUTE_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated and treated for endophthalmitis (a serious infection inside the eye). This documentation is used only after ophthalmology has directed outpatient aftercare following urgent treatment.",
      diagnosisInstructions:
        "Use any prescribed eye drops or other medicines exactly on the schedule directed — missed doses can allow the infection to worsen and threaten vision. Keep the close, frequent ophthalmology follow-up appointments.",
      medicationTreatment: EYE_MED_EN,
      returnPrecautions:
        "Return immediately for worsening eye pain, worsening vision loss, worsening redness, new discharge from the eye, or fever.",
      returnWorkSchool: "Follow up with ophthalmology exactly as directed — this infection can threaten vision and requires close monitoring.",
    },
    {
      description:
        "Vous avez été pris en charge pour une endophtalmie (une infection grave à l'intérieur de l'œil). Ce document est utilisé uniquement après qu'une prise en charge en ophtalmologie a déjà déterminé les soins ambulatoires après un traitement urgent.",
      diagnosisInstructions:
        "Utilisez toute goutte ophtalmique ou autre médicament prescrit exactement selon l'horaire indiqué — des doses manquées peuvent aggraver l'infection et menacer la vision. Respectez les rendez-vous de suivi ophtalmologique rapprochés et fréquents.",
      medicationTreatment: EYE_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur oculaire, de perte de vision qui s'aggrave, d'aggravation de la rougeur, de nouvel écoulement de l'œil, ou de fièvre.",
      returnWorkSchool: "Faites le suivi en ophtalmologie exactement selon les directives — cette infection peut menacer la vision et nécessite une surveillance rapprochée.",
    }
  );

export const CRAO_CRVO_FOLLOWUP_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated for a central retinal artery or vein occlusion (a blocked blood vessel in the eye). This documentation is used only after ophthalmology (and any indicated stroke workup) has directed outpatient aftercare.",
      diagnosisInstructions:
        "Keep the urgent ophthalmology follow-up appointment. Complete any referrals for a stroke/cardiovascular risk workup exactly as directed — this eye finding can reflect the same risk factors as a stroke.",
      medicationTreatment: EYE_MED_EN,
      returnPrecautions:
        "Return immediately for new or worsening vision loss, new weakness, numbness, difficulty speaking, or a severe headache.",
      returnWorkSchool: "Follow up with ophthalmology exactly as directed — this is an urgent specialist follow-up, not routine primary care.",
    },
    {
      description:
        "Vous avez été pris en charge pour une occlusion de l'artère ou de la veine centrale de la rétine (un vaisseau sanguin obstrué dans l'œil). Ce document est utilisé uniquement après qu'une prise en charge en ophtalmologie (et tout bilan d'AVC indiqué) a déjà déterminé les soins ambulatoires.",
      diagnosisInstructions:
        "Respectez le rendez-vous ophtalmologique urgent. Complétez toute référence pour un bilan de risque d'AVC/cardiovasculaire exactement selon les directives — cette atteinte oculaire peut refléter les mêmes facteurs de risque qu'un AVC.",
      medicationTreatment: EYE_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas de perte de vision nouvelle ou qui s'aggrave, de faiblesse nouvelle, d'engourdissement, de difficulté à parler, ou de céphalée sévère.",
      returnWorkSchool: "Faites le suivi en ophtalmologie exactement selon les directives — il s'agit d'un suivi spécialisé urgent, non d'un suivi habituel de soins primaires.",
    }
  );

/** Phase 12 — ENT emergencies discharge suggested text (advisory documentation only). */
const ENT_MED_EN =
  "Take any antibiotic, pain, or ear/nose drop medicine only as prescribed or specifically directed during this visit. Do not start, stop, or change medications on your own.";
const ENT_MED_FR =
  "Prenez tout antibiotique, antidouleur ou goutte auriculaire/nasale uniquement selon la prescription ou les directives spécifiques données lors de cette visite. Ne commencez, n'arrêtez et ne modifiez pas les médicaments de votre propre initiative.";

export const ACUTE_OTITIS_EXTERNA_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for acute otitis externa (swimmer's ear) — an infection of the ear canal.",
      diagnosisInstructions:
        "Keep the ear canal dry — avoid swimming and keep water out of the ear while showering until healed. Do not insert cotton swabs, fingers, or other objects into the ear canal. Use ear drops exactly as prescribed, for the full course.",
      medicationTreatment: ENT_MED_EN,
      returnPrecautions:
        "Return immediately for worsening ear pain, spreading redness or swelling outside the ear canal, fever, new facial weakness, or if symptoms have not improved after finishing the prescribed course.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une otite externe aiguë (oreille du baigneur) — une infection du conduit auditif.",
      diagnosisInstructions:
        "Gardez le conduit auditif sec — évitez la baignade et empêchez l'eau d'entrer dans l'oreille pendant la douche jusqu'à la guérison. N'insérez pas de coton-tige, de doigt ou d'autre objet dans le conduit auditif. Utilisez les gouttes auriculaires exactement comme prescrit, pour toute la durée du traitement.",
      medicationTreatment: ENT_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur à l'oreille, de rougeur ou d'enflure qui s'étend au-delà du conduit auditif, de fièvre, de nouvelle faiblesse faciale, ou si les symptômes ne se sont pas améliorés après la fin du traitement prescrit.",
    }
  );

export const MALIGNANT_OTITIS_EXTERNA_POST_ACUTE_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated for malignant (necrotizing) otitis externa — a serious infection that can spread from the ear canal into the skull base. This documentation is used only after ENT/infectious disease has already directed outpatient antibiotic aftercare, not as an autonomous ED discharge decision.",
      diagnosisInstructions:
        "Complete the full course of the specialist-directed antibiotic treatment exactly as prescribed, even if the ear feels better. Keep every scheduled ENT and infectious disease follow-up appointment — this infection is monitored closely for weeks.",
      medicationTreatment: ENT_MED_EN,
      returnPrecautions:
        "Return immediately for worsening ear pain, new facial weakness or drooping, new headache, new hearing loss, fever, or any new neurologic symptom.",
      returnWorkSchool: "Follow up with ENT/infectious disease exactly as directed — this is a close specialist follow-up, not routine primary care.",
    },
    {
      description:
        "Vous avez été pris en charge pour une otite externe maligne (nécrosante) — une infection grave pouvant s'étendre du conduit auditif à la base du crâne. Ce document est utilisé uniquement après qu'une prise en charge en ORL/maladies infectieuses a déjà déterminé les soins antibiotiques ambulatoires, non comme une décision autonome de sortie des urgences.",
      diagnosisInstructions:
        "Terminez la cure complète du traitement antibiotique dirigé par le spécialiste exactement comme prescrit, même si l'oreille se sent mieux. Respectez chaque rendez-vous de suivi ORL et maladies infectieuses prévu — cette infection est surveillée de près pendant plusieurs semaines.",
      medicationTreatment: ENT_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur à l'oreille, de nouvelle faiblesse ou affaissement du visage, de nouvelle céphalée, de nouvelle perte d'audition, de fièvre, ou de tout nouveau symptôme neurologique.",
      returnWorkSchool: "Faites le suivi en ORL/maladies infectieuses exactement selon les directives — il s'agit d'un suivi spécialisé rapproché, non d'un suivi habituel de soins primaires.",
    }
  );

export const MASTOIDITIS_POST_ACUTE_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated for mastoiditis — an infection of the bone behind the ear. This documentation is used only after ENT has already directed outpatient antibiotic aftercare, not as an autonomous ED discharge decision.",
      diagnosisInstructions:
        "Complete the full course of the specialist-directed antibiotic treatment exactly as prescribed. Keep every scheduled ENT follow-up appointment to confirm the infection is clearing.",
      medicationTreatment: ENT_MED_EN,
      returnPrecautions:
        "Return immediately for worsening swelling or redness behind the ear, worsening ear pain, fever, new facial weakness, severe headache, neck stiffness, or confusion.",
      returnWorkSchool: "Follow up with ENT exactly as directed — this is a close specialist follow-up, not routine primary care.",
    },
    {
      description:
        "Vous avez été pris en charge pour une mastoïdite — une infection de l'os situé derrière l'oreille. Ce document est utilisé uniquement après qu'une prise en charge en ORL a déjà déterminé les soins antibiotiques ambulatoires, non comme une décision autonome de sortie des urgences.",
      diagnosisInstructions:
        "Terminez la cure complète du traitement antibiotique dirigé par le spécialiste exactement comme prescrit. Respectez chaque rendez-vous de suivi ORL prévu pour confirmer que l'infection se résorbe.",
      medicationTreatment: ENT_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de l'enflure ou de la rougeur derrière l'oreille, d'aggravation de la douleur à l'oreille, de fièvre, de nouvelle faiblesse faciale, de céphalée sévère, de raideur de la nuque, ou de confusion.",
      returnWorkSchool: "Faites le suivi en ORL exactement selon les directives — il s'agit d'un suivi spécialisé rapproché, non d'un suivi habituel de soins primaires.",
    }
  );

export const TM_PERFORATION_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a tympanic membrane perforation (a hole or tear in the eardrum).",
      diagnosisInstructions:
        "Keep the ear completely dry — no swimming and no water in the ear canal while showering or bathing until cleared by ENT. Do not insert anything into the ear canal. Most small perforations heal on their own over several weeks.",
      medicationTreatment: ENT_MED_EN,
      returnPrecautions:
        "Return immediately for worsening ear pain, new or worsening hearing loss, drainage from the ear, fever, dizziness, or facial weakness.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une perforation de la membrane tympanique (un trou ou une déchirure dans le tympan).",
      diagnosisInstructions:
        "Gardez l'oreille complètement sèche — pas de baignade et pas d'eau dans le conduit auditif pendant la douche ou le bain jusqu'à l'autorisation de l'ORL. N'insérez rien dans le conduit auditif. La plupart des petites perforations guérissent d'elles-mêmes en quelques semaines.",
      medicationTreatment: ENT_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur à l'oreille, de perte d'audition nouvelle ou qui s'aggrave, d'écoulement de l'oreille, de fièvre, de vertiges, ou de faiblesse faciale.",
    }
  );

export const SUDDEN_HEARING_LOSS_FOLLOWUP_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated for sudden sensorineural hearing loss (SSNHL) — a sudden, unexplained loss of hearing that is a time-sensitive ENT emergency. This documentation is used only after ENT has already directed urgent outpatient aftercare (such as a steroid course and audiology testing), not as an autonomous ED discharge decision.",
      diagnosisInstructions:
        "Start the specialist-directed steroid course exactly as prescribed and complete it fully. Keep the urgent audiology and ENT follow-up appointments — early treatment gives the best chance of hearing recovery.",
      medicationTreatment: ENT_MED_EN,
      returnPrecautions:
        "Return immediately for new dizziness or vertigo, new weakness or numbness, difficulty speaking, severe headache, or worsening hearing loss.",
      returnWorkSchool: "Follow up with ENT/audiology exactly as directed — this is an urgent specialist follow-up, not routine primary care.",
    },
    {
      description:
        "Vous avez été pris en charge pour une surdité brusque neurosensorielle — une perte auditive soudaine et inexpliquée qui constitue une urgence ORL nécessitant une prise en charge rapide. Ce document est utilisé uniquement après qu'une prise en charge en ORL a déjà déterminé les soins ambulatoires urgents (comme une cure de corticoïdes et des tests audiologiques), non comme une décision autonome de sortie des urgences.",
      diagnosisInstructions:
        "Commencez la cure de corticoïdes dirigée par le spécialiste exactement comme prescrit et terminez-la complètement. Respectez les rendez-vous urgents d'audiologie et de suivi ORL — un traitement précoce offre la meilleure chance de récupération auditive.",
      medicationTreatment: ENT_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas de nouveaux vertiges, de nouvelle faiblesse ou d'engourdissement, de difficulté à parler, de céphalée sévère, ou d'aggravation de la perte auditive.",
      returnWorkSchool: "Faites le suivi en ORL/audiologie exactement selon les directives — il s'agit d'un suivi spécialisé urgent, non d'un suivi habituel de soins primaires.",
    }
  );

export const BPPV_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for benign paroxysmal positional vertigo (BPPV) — brief spinning episodes triggered by changes in head position.",
      diagnosisInstructions:
        "Move slowly when changing position — sitting up, standing, and turning in bed. If a repositioning maneuver (such as the Epley maneuver) was performed or taught during this visit, continue any home exercises exactly as directed.",
      medicationTreatment: ENT_MED_EN,
      returnPrecautions:
        "Return immediately for new weakness or numbness, difficulty speaking, double vision, trouble walking, severe headache, or vertigo that does not improve with repositioning treatment.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour un vertige positionnel paroxystique bénin (VPPB) — de brefs épisodes de sensation de rotation déclenchés par des changements de position de la tête.",
      diagnosisInstructions:
        "Bougez lentement lors des changements de position — en vous asseyant, en vous levant et en vous tournant dans le lit. Si une manœuvre de repositionnement (comme la manœuvre d'Epley) a été effectuée ou enseignée lors de cette visite, poursuivez les exercices à domicile exactement selon les directives.",
      medicationTreatment: ENT_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas de nouvelle faiblesse ou d'engourdissement, de difficulté à parler, de vision double, de difficulté à marcher, de céphalée sévère, ou de vertiges qui ne s'améliorent pas avec le traitement de repositionnement.",
    }
  );

export const VESTIBULAR_NEURITIS_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for vestibular neuritis — inflammation of the inner ear balance nerve causing continuous vertigo.",
      diagnosisInstructions:
        "Rest as needed during the most severe symptoms, then gradually resume normal activity — staying still for too long can slow recovery. Move carefully to prevent falls. Vestibular rehabilitation exercises may be recommended.",
      medicationTreatment: ENT_MED_EN,
      returnPrecautions:
        "Return immediately for new weakness or numbness, difficulty speaking, double vision, new hearing loss, severe headache, or inability to walk unassisted.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une névrite vestibulaire — une inflammation du nerf de l'équilibre de l'oreille interne causant des vertiges continus.",
      diagnosisInstructions:
        "Reposez-vous au besoin pendant les symptômes les plus intenses, puis reprenez progressivement vos activités normales — rester immobile trop longtemps peut ralentir la récupération. Bougez avec précaution pour éviter les chutes. Des exercices de rééducation vestibulaire peuvent être recommandés.",
      medicationTreatment: ENT_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas de nouvelle faiblesse ou d'engourdissement, de difficulté à parler, de vision double, de nouvelle perte d'audition, de céphalée sévère, ou d'incapacité à marcher sans aide.",
    }
  );

export const LABYRINTHITIS_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for labyrinthitis — inflammation of the inner ear causing vertigo along with hearing changes.",
      diagnosisInstructions:
        "Rest as needed during the most severe symptoms, then gradually resume normal activity. Move carefully to prevent falls. Keep the ENT/audiology follow-up to check hearing recovery.",
      medicationTreatment: ENT_MED_EN,
      returnPrecautions:
        "Return immediately for new weakness or numbness, difficulty speaking, double vision, worsening hearing loss, severe headache, or inability to walk unassisted.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une labyrinthite — une inflammation de l'oreille interne causant des vertiges accompagnés de changements auditifs.",
      diagnosisInstructions:
        "Reposez-vous au besoin pendant les symptômes les plus intenses, puis reprenez progressivement vos activités normales. Bougez avec précaution pour éviter les chutes. Respectez le suivi ORL/audiologie pour vérifier la récupération auditive.",
      medicationTreatment: ENT_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas de nouvelle faiblesse ou d'engourdissement, de difficulté à parler, de vision double, d'aggravation de la perte auditive, de céphalée sévère, ou d'incapacité à marcher sans aide.",
    }
  );

export const FACIAL_NERVE_PALSY_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for facial nerve (Bell's) palsy — sudden weakness of one side of the face after stroke has been excluded by the treating clinician.",
      diagnosisInstructions:
        "Protect the affected eye — use lubricating eye drops or ointment as directed and tape the eyelid closed at night if it does not close fully, to prevent corneal injury. Start any prescribed steroid course as early as directed — timing matters for recovery.",
      medicationTreatment: ENT_MED_EN,
      returnPrecautions:
        "Return immediately for new weakness elsewhere in the body, difficulty speaking, vision changes, eye pain or redness, severe headache, or if facial weakness worsens after initial improvement.",
      returnWorkSchool: "Follow up with ENT or neurology as directed to monitor recovery.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une paralysie du nerf facial (de Bell) — une faiblesse soudaine d'un côté du visage après qu'un AVC a été exclu par le clinicien traitant.",
      diagnosisInstructions:
        "Protégez l'œil atteint — utilisez des gouttes ou une pommade lubrifiante selon les directives et fermez la paupière avec du ruban adhésif la nuit si elle ne se ferme pas complètement, afin de prévenir une lésion cornéenne. Commencez toute cure de corticoïdes prescrite le plus tôt possible selon les directives — le moment du traitement influence la récupération.",
      medicationTreatment: ENT_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas de nouvelle faiblesse ailleurs dans le corps, de difficulté à parler, de changements de vision, de douleur ou de rougeur oculaire, de céphalée sévère, ou si la faiblesse faciale s'aggrave après une amélioration initiale.",
      returnWorkSchool: "Faites le suivi en ORL ou en neurologie selon les directives pour surveiller la récupération.",
    }
  );

export const RAMSAY_HUNT_FOLLOWUP_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated for Ramsay Hunt syndrome (shingles affecting the facial nerve near the ear). This documentation is used only after ENT/neurology has already directed outpatient antiviral and steroid aftercare, not as an autonomous ED discharge decision.",
      diagnosisInstructions:
        "Complete the full course of the specialist-directed antiviral and steroid treatment exactly as prescribed. Protect the affected eye if the eyelid does not close fully — use lubricating drops or ointment as directed. Keep every scheduled ENT/neurology follow-up appointment.",
      medicationTreatment: ENT_MED_EN,
      returnPrecautions:
        "Return immediately for worsening facial weakness, new weakness elsewhere in the body, difficulty speaking, eye pain or redness, worsening hearing loss, severe headache, or spreading rash.",
      returnWorkSchool: "Follow up with ENT/neurology exactly as directed — this is a close specialist follow-up, not routine primary care.",
    },
    {
      description:
        "Vous avez été pris en charge pour un syndrome de Ramsay Hunt (zona atteignant le nerf facial près de l'oreille). Ce document est utilisé uniquement après qu'une prise en charge en ORL/neurologie a déjà déterminé les soins antiviraux et corticoïdes ambulatoires, non comme une décision autonome de sortie des urgences.",
      diagnosisInstructions:
        "Terminez la cure complète du traitement antiviral et corticoïde dirigé par le spécialiste exactement comme prescrit. Protégez l'œil atteint si la paupière ne se ferme pas complètement — utilisez des gouttes ou une pommade lubrifiante selon les directives. Respectez chaque rendez-vous de suivi ORL/neurologie prévu.",
      medicationTreatment: ENT_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la faiblesse faciale, de nouvelle faiblesse ailleurs dans le corps, de difficulté à parler, de douleur ou de rougeur oculaire, d'aggravation de la perte auditive, de céphalée sévère, ou d'éruption qui s'étend.",
      returnWorkSchool: "Faites le suivi en ORL/neurologie exactement selon les directives — il s'agit d'un suivi spécialisé rapproché, non d'un suivi habituel de soins primaires.",
    }
  );

export const POST_NASAL_PACKING_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department and had nasal packing placed to control a nosebleed. This documentation covers aftercare while the packing remains in place.",
      diagnosisInstructions:
        "Do not remove the nasal packing yourself — it will be removed by a clinician as directed. Breathe through your mouth if the packing blocks your nose. Avoid blowing your nose, strenuous activity, and bending over until the packing is removed.",
      medicationTreatment: ENT_MED_EN,
      returnPrecautions:
        "Return immediately for new or worsening bleeding around or through the packing, difficulty breathing, fever, severe pain, or if the packing falls out on its own.",
      returnWorkSchool: "Keep the scheduled ENT appointment for packing removal — do not miss this visit.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences et un tamponnement nasal a été mis en place pour contrôler un saignement de nez. Ce document couvre les soins pendant que le tamponnement reste en place.",
      diagnosisInstructions:
        "Ne retirez pas le tamponnement nasal vous-même — il sera retiré par un clinicien selon les directives. Respirez par la bouche si le tamponnement bloque votre nez. Évitez de vous moucher, les activités intenses et de vous pencher en avant jusqu'au retrait du tamponnement.",
      medicationTreatment: ENT_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas de saignement nouveau ou qui s'aggrave autour ou à travers le tamponnement, de difficulté à respirer, de fièvre, de douleur sévère, ou si le tamponnement se détache de lui-même.",
      returnWorkSchool: "Respectez le rendez-vous ORL prévu pour le retrait du tamponnement — ne manquez pas cette visite.",
    }
  );

export const POSTERIOR_EPISTAXIS_POST_ACUTE_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated for posterior epistaxis (a nosebleed originating from deeper in the nose) — a higher-risk bleeding source than a typical anterior nosebleed. This documentation is used only after ENT has already directed outpatient aftercare following control of the bleeding.",
      diagnosisInstructions:
        "Avoid blowing your nose, strenuous activity, and bending over for the time directed. Keep your head elevated. Follow any specialist instructions about packing or cautery care exactly as directed.",
      medicationTreatment: ENT_MED_EN,
      returnPrecautions:
        "Return immediately for new or recurrent bleeding, difficulty breathing, dizziness, fainting, chest pain, or if bleeding does not stop with the directed first-aid steps.",
      returnWorkSchool: "Follow up with ENT exactly as directed — this is a close specialist follow-up, not routine primary care.",
    },
    {
      description:
        "Vous avez été pris en charge pour une épistaxis postérieure (un saignement de nez provenant de plus profond dans le nez) — une source de saignement à plus haut risque qu'un saignement de nez antérieur habituel. Ce document est utilisé uniquement après qu'une prise en charge en ORL a déjà déterminé les soins ambulatoires après le contrôle du saignement.",
      diagnosisInstructions:
        "Évitez de vous moucher, les activités intenses et de vous pencher en avant pendant la durée indiquée. Gardez la tête élevée. Suivez toute instruction du spécialiste concernant les soins du tamponnement ou de la cautérisation exactement selon les directives.",
      medicationTreatment: ENT_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas de saignement nouveau ou récurrent, de difficulté à respirer, de vertiges, d'évanouissement, de douleur thoracique, ou si le saignement ne s'arrête pas avec les mesures de premiers soins indiquées.",
      returnWorkSchool: "Faites le suivi en ORL exactement selon les directives — il s'agit d'un suivi spécialisé rapproché, non d'un suivi habituel de soins primaires.",
    }
  );

export const NASAL_FOREIGN_BODY_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a foreign body in the nose that was removed during this visit.",
      diagnosisInstructions:
        "Some mild nasal irritation, crusting, or small streaks of blood are expected for a day or two after removal. Avoid inserting anything into the nose.",
      medicationTreatment: ENT_MED_EN,
      returnPrecautions:
        "Return immediately for worsening nasal pain, foul-smelling nasal discharge, heavy bleeding, difficulty breathing, or signs that a piece of the object remains in the nose.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour un corps étranger dans le nez qui a été retiré lors de cette visite.",
      diagnosisInstructions:
        "Une légère irritation nasale, des croûtes ou de petites traces de sang sont attendues pendant un jour ou deux après le retrait. Évitez d'insérer quoi que ce soit dans le nez.",
      medicationTreatment: ENT_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de la douleur nasale, d'écoulement nasal nauséabond, de saignement important, de difficulté à respirer, ou de signes qu'un fragment de l'objet reste dans le nez.",
    }
  );

export const PERITONSILLAR_ABSCESS_POST_DRAINAGE_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated for a peritonsillar abscess (quinsy) that was drained during this visit. This documentation is used only after drainage has already been performed and ENT has directed outpatient aftercare — this is not routine sore-throat/pharyngitis discharge.",
      diagnosisInstructions:
        "Complete the full course of the specialist-directed antibiotic treatment exactly as prescribed. Eat soft foods and drink fluids as tolerated. Keep the ENT follow-up appointment to confirm the infection is clearing.",
      medicationTreatment: ENT_MED_EN,
      returnPrecautions:
        "Return immediately for difficulty breathing or swallowing, difficulty opening your mouth, worsening throat swelling, drooling you cannot control, fever, or muffled voice that worsens.",
      returnWorkSchool: "Follow up with ENT exactly as directed — this is a close specialist follow-up, not routine primary care.",
    },
    {
      description:
        "Vous avez été pris en charge pour un abcès périamygdalien (phlegmon) qui a été drainé lors de cette visite. Ce document est utilisé uniquement après que le drainage a déjà été effectué et qu'une prise en charge en ORL a déterminé les soins ambulatoires — ceci n'est pas un congé de routine pour mal de gorge/pharyngite.",
      diagnosisInstructions:
        "Terminez la cure complète du traitement antibiotique dirigé par le spécialiste exactement comme prescrit. Mangez des aliments mous et buvez des liquides selon votre tolérance. Respectez le rendez-vous de suivi ORL pour confirmer que l'infection se résorbe.",
      medicationTreatment: ENT_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas de difficulté à respirer ou à avaler, de difficulté à ouvrir la bouche, d'aggravation de l'enflure de la gorge, de bave incontrôlable, de fièvre, ou de voix étouffée qui s'aggrave.",
      returnWorkSchool: "Faites le suivi en ORL exactement selon les directives — il s'agit d'un suivi spécialisé rapproché, non d'un suivi habituel de soins primaires.",
    }
  );

export const DEEP_NECK_INFECTION_POST_ACUTE_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated for a deep neck space infection (retropharyngeal or parapharyngeal abscess). This documentation is used only after ENT/surgery has already directed outpatient aftercare following airway-safe management, not as an autonomous ED discharge decision.",
      diagnosisInstructions:
        "Complete the full course of the specialist-directed antibiotic treatment exactly as prescribed. Keep every scheduled ENT/surgery follow-up appointment to confirm the infection is clearing.",
      medicationTreatment: ENT_MED_EN,
      returnPrecautions:
        "Return immediately for difficulty breathing or swallowing, worsening neck swelling or pain, neck stiffness, inability to fully open your mouth, drooling you cannot control, or fever.",
      returnWorkSchool: "Follow up with ENT/surgery exactly as directed — this is a close specialist follow-up, not routine primary care.",
    },
    {
      description:
        "Vous avez été pris en charge pour une infection profonde de l'espace du cou (abcès rétropharyngé ou parapharyngé). Ce document est utilisé uniquement après qu'une prise en charge en ORL/chirurgie a déjà déterminé les soins ambulatoires après une gestion sécuritaire des voies respiratoires, non comme une décision autonome de sortie des urgences.",
      diagnosisInstructions:
        "Terminez la cure complète du traitement antibiotique dirigé par le spécialiste exactement comme prescrit. Respectez chaque rendez-vous de suivi ORL/chirurgie prévu pour confirmer que l'infection se résorbe.",
      medicationTreatment: ENT_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas de difficulté à respirer ou à avaler, d'aggravation de l'enflure ou de la douleur au cou, de raideur de la nuque, d'incapacité à ouvrir complètement la bouche, de bave incontrôlable, ou de fièvre.",
      returnWorkSchool: "Faites le suivi en ORL/chirurgie exactement selon les directives — il s'agit d'un suivi spécialisé rapproché, non d'un suivi habituel de soins primaires.",
    }
  );

export const LUDWIG_ANGINA_POST_ACUTE_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated for Ludwig's angina (a rapidly spreading infection of the floor of the mouth, often from a dental source) that can threaten the airway. This documentation is used only after airway-safe management and specialty-directed outpatient aftercare have already been arranged — this is not routine dental-pain discharge.",
      diagnosisInstructions:
        "Complete the full course of the specialist-directed antibiotic treatment exactly as prescribed. Keep every scheduled ENT/oral surgery follow-up appointment — this infection is monitored very closely.",
      medicationTreatment: ENT_MED_EN,
      returnPrecautions:
        "Return immediately for any difficulty breathing or swallowing, drooling you cannot control, tongue swelling, voice change, worsening neck or floor-of-mouth swelling, or fever.",
      returnWorkSchool: "Follow up with ENT/oral surgery exactly as directed — this is a close specialist follow-up, not routine dental or primary care.",
    },
    {
      description:
        "Vous avez été pris en charge pour un angine de Ludwig (une infection à propagation rapide du plancher de la bouche, souvent d'origine dentaire) pouvant menacer les voies respiratoires. Ce document est utilisé uniquement après qu'une gestion sécuritaire des voies respiratoires et des soins ambulatoires dirigés par un spécialiste ont déjà été organisés — ceci n'est pas un congé de routine pour douleur dentaire.",
      diagnosisInstructions:
        "Terminez la cure complète du traitement antibiotique dirigé par le spécialiste exactement comme prescrit. Respectez chaque rendez-vous de suivi ORL/chirurgie orale prévu — cette infection est surveillée très étroitement.",
      medicationTreatment: ENT_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas de toute difficulté à respirer ou à avaler, de bave incontrôlable, d'enflure de la langue, de changement de voix, d'aggravation de l'enflure du cou ou du plancher de la bouche, ou de fièvre.",
      returnWorkSchool: "Faites le suivi en ORL/chirurgie orale exactement selon les directives — il s'agit d'un suivi spécialisé rapproché, non d'un suivi dentaire ou de soins primaires habituel.",
    }
  );

export const EPIGLOTTITIS_POST_ACUTE_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated for epiglottitis (a swollen, infected epiglottis that can threaten the airway). This documentation is used only after airway-safe management and specialty-directed outpatient aftercare have already been arranged — this is not routine pharyngitis/sore-throat discharge.",
      diagnosisInstructions:
        "Complete the full course of the specialist-directed antibiotic treatment exactly as prescribed. Keep every scheduled ENT follow-up appointment — this condition is monitored very closely.",
      medicationTreatment: ENT_MED_EN,
      returnPrecautions:
        "Return immediately for any difficulty breathing or swallowing, drooling you cannot control, a muffled or changed voice, noisy or high-pitched breathing (stridor), or fever.",
      returnWorkSchool: "Follow up with ENT exactly as directed — this is a close specialist follow-up, not routine primary care.",
    },
    {
      description:
        "Vous avez été pris en charge pour une épiglottite (un épiglotte enflé et infecté pouvant menacer les voies respiratoires). Ce document est utilisé uniquement après qu'une gestion sécuritaire des voies respiratoires et des soins ambulatoires dirigés par un spécialiste ont déjà été organisés — ceci n'est pas un congé de routine pour pharyngite/mal de gorge.",
      diagnosisInstructions:
        "Terminez la cure complète du traitement antibiotique dirigé par le spécialiste exactement comme prescrit. Respectez chaque rendez-vous de suivi ORL prévu — cette condition est surveillée très étroitement.",
      medicationTreatment: ENT_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas de toute difficulté à respirer ou à avaler, de bave incontrôlable, d'une voix étouffée ou modifiée, d'une respiration bruyante ou aiguë (stridor), ou de fièvre.",
      returnWorkSchool: "Faites le suivi en ORL exactement selon les directives — il s'agit d'un suivi spécialisé rapproché, non d'un suivi habituel de soins primaires.",
    }
  );

export const SIALADENITIS_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for sialadenitis (an infected salivary gland).",
      diagnosisInstructions:
        "Drink plenty of fluids. Apply warm compresses to the affected area as directed. Gently massage the gland toward the mouth opening several times a day as directed, and use sour candy or citrus to stimulate saliva flow if recommended.",
      medicationTreatment: ENT_MED_EN,
      returnPrecautions:
        "Return immediately for worsening facial or neck swelling, difficulty breathing or swallowing, spreading redness, fever, or if symptoms have not improved after finishing the prescribed course.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une sialadénite (une infection d'une glande salivaire).",
      diagnosisInstructions:
        "Buvez beaucoup de liquides. Appliquez des compresses chaudes sur la région atteinte selon les directives. Massez doucement la glande en direction de l'ouverture buccale plusieurs fois par jour selon les directives, et utilisez un bonbon acidulé ou des agrumes pour stimuler la salivation si cela est recommandé.",
      medicationTreatment: ENT_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de l'enflure du visage ou du cou, de difficulté à respirer ou à avaler, de rougeur qui s'étend, de fièvre, ou si les symptômes ne se sont pas améliorés après la fin du traitement prescrit.",
    }
  );

export const SALIVARY_OBSTRUCTION_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a salivary duct obstruction (sialolithiasis) — a stone blocking a salivary gland duct.",
      diagnosisInstructions:
        "Drink plenty of fluids. Use sour candy or citrus to stimulate saliva flow if recommended, and massage the gland toward the mouth opening as directed to help move the stone.",
      medicationTreatment: ENT_MED_EN,
      returnPrecautions:
        "Return immediately for worsening facial or neck swelling, signs of infection (fever, spreading redness, pus), or worsening pain not relieved by the directed measures.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour une obstruction du canal salivaire (sialolithiase) — un calcul bloquant le canal d'une glande salivaire.",
      diagnosisInstructions:
        "Buvez beaucoup de liquides. Utilisez un bonbon acidulé ou des agrumes pour stimuler la salivation si cela est recommandé, et massez la glande en direction de l'ouverture buccale selon les directives pour aider à déplacer le calcul.",
      medicationTreatment: ENT_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas d'aggravation de l'enflure du visage ou du cou, de signes d'infection (fièvre, rougeur qui s'étend, pus), ou d'aggravation de la douleur non soulagée par les mesures indiquées.",
    }
  );

export const THROAT_FOREIGN_BODY_FOLLOWUP_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "You were evaluated in the emergency department for a throat foreign body (such as a fish bone or food bolus) that was removed or passed during this visit.",
      diagnosisInstructions:
        "Eat soft foods for the next day or two. Some mild throat scratchiness or discomfort is expected for a day or two after removal.",
      medicationTreatment: ENT_MED_EN,
      returnPrecautions:
        "Return immediately for difficulty breathing or swallowing, drooling you cannot control, chest pain, worsening throat pain, or vomiting blood.",
    },
    {
      description:
        "Vous avez été pris en charge aux urgences pour un corps étranger dans la gorge (comme une arête de poisson ou un bol alimentaire) qui a été retiré ou est passé lors de cette visite.",
      diagnosisInstructions:
        "Mangez des aliments mous pendant les prochains jours. Une légère irritation ou un inconfort de la gorge sont attendus pendant un jour ou deux après le retrait.",
      medicationTreatment: ENT_MED_FR,
      returnPrecautions:
        "Retournez immédiatement en cas de difficulté à respirer ou à avaler, de bave incontrôlable, de douleur thoracique, d'aggravation de la douleur à la gorge, ou de vomissements de sang.",
    }
  );
