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

export const GENERIC_ED_DISCHARGE_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description: "",
      diagnosisInstructions: "",
      medicationTreatment: "",
      returnPrecautions: "",
      returnWorkSchool: "",
      treatment: "",
    },
    {
      description: "",
      diagnosisInstructions: "",
      medicationTreatment: "",
      returnPrecautions: "",
      returnWorkSchool: "",
      treatment: "",
    }
  );
