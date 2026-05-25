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
