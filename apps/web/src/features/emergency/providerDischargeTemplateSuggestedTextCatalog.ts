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
