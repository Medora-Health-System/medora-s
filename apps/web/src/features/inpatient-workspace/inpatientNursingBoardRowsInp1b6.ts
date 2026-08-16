import type { NursingBoardRow } from "@/features/clinical-documentation/NursingDocumentationBoard";

const choice = (...values: string[]) =>
  values.map((value) => ({
    value,
    label: value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (x) => x.toUpperCase()),
  }));

/** INP.1B.6 complete inpatient bedside dataset (canonical codes; labels via i18n). No silent WNL default. */
export const INPATIENT_NURSING_BOARD_ROWS: readonly NursingBoardRow[] = [
  { id: "levelOfConsciousness", label: "Level of consciousness", group: "Neurological", options: choice("ALERT", "DROWSY", "LETHARGIC", "UNRESPONSIVE", "UNABLE_TO_ASSESS") },
  { id: "orientationQuick", label: "Orientation", group: "Neurological", options: choice("AOX4", "PERSON_ONLY", "PERSON_PLACE", "PERSON_PLACE_TIME", "DISORIENTED", "UNABLE_TO_ASSESS") },
  { id: "speech", label: "Speech", group: "Neurological", options: choice("CLEAR", "SLURRED", "APHASIC", "NONVERBAL", "OTHER") },
  { id: "pupils", label: "Pupils", group: "Neurological", options: choice("PERRLA", "UNEQUAL", "SLUGGISH", "FIXED", "UNABLE_TO_ASSESS") },
  { id: "pupilResponse", label: "Pupil response", group: "Neurological", options: choice("BRISK", "SLUGGISH", "ABSENT", "UNABLE_TO_ASSESS") },
  { id: "motor", label: "Motor response / strength", group: "Neurological", options: choice("WNL", "WEAK", "ASYMMETRIC", "ABSENT", "UNABLE_TO_ASSESS") },
  { id: "sensation", label: "Sensation", group: "Neurological", options: choice("WNL", "DECREASED", "ABSENT", "PARESTHESIA", "UNABLE_TO_ASSESS") },
  { id: "neuroConcern", label: "Neurological concerns", group: "Neurological", options: choice("NONE", "CHANGE_FROM_BASELINE", "ACUTE_NEUROLOGIC_CHANGE", "OTHER") },

  { id: "painPresent", label: "Pain present", group: "Pain", options: choice("NO", "YES", "UNABLE_TO_ASSESS") },
  { id: "painScore", label: "Pain score (0–10)", group: "Pain", kind: "number" },
  { id: "painLocation", label: "Pain location", group: "Pain" },
  { id: "painQuality", label: "Pain quality", group: "Pain", options: choice("ACHING", "SHARP", "BURNING", "CRAMPING", "PRESSURE", "OTHER") },
  { id: "painIntervention", label: "Pain intervention", group: "Pain" },
  { id: "painResponse", label: "Pain reassessment / response", group: "Pain", options: choice("IMPROVED", "UNCHANGED", "WORSENED", "NOT_REASSESSED") },

  { id: "airway", label: "Airway", group: "Respiratory", options: choice("PATENT", "AIRWAY_CONCERN", "UNABLE_TO_ASSESS") },
  { id: "respiratoryEffort", label: "Respiratory effort", group: "Respiratory", options: choice("UNLABORED", "MILDLY_LABORED", "MODERATELY_LABORED", "SEVERELY_LABORED") },
  { id: "respiratoryPattern", label: "Respiratory pattern", group: "Respiratory", options: choice("REGULAR", "TACHYPNEIC", "BRADYPNEIC", "IRREGULAR", "APNEIC") },
  { id: "breathSounds", label: "Breath sounds", group: "Respiratory", options: choice("CLEAR", "DIMINISHED", "CRACKLES", "WHEEZES", "RHONCHI", "ABSENT") },
  { id: "oxygen", label: "Oxygen / device", group: "Respiratory", options: choice("ROOM_AIR", "NASAL_CANNULA", "SIMPLE_MASK", "NON_REBREATHER", "HIGH_FLOW", "CPAP_BIPAP", "VENTILATOR", "OTHER") },
  { id: "oxygenFlow", label: "Oxygen flow / rate", group: "Respiratory" },
  { id: "cough", label: "Cough", group: "Respiratory", options: choice("NONE", "DRY", "PRODUCTIVE", "WEAK", "OTHER") },
  { id: "secretions", label: "Secretions", group: "Respiratory", options: choice("NONE", "THIN", "THICK", "BLOODY", "OTHER") },
  { id: "respiratoryConcern", label: "Respiratory concerns", group: "Respiratory", options: choice("NONE", "CONCERN", "OTHER") },

  { id: "rhythm", label: "Cardiac rhythm", group: "Cardiovascular", options: choice("REGULAR", "IRREGULAR", "TELEMETRY", "UNABLE_TO_ASSESS") },
  { id: "heartSounds", label: "Heart sounds", group: "Cardiovascular", options: choice("WNL", "MURMUR", "GALLOP", "MUFFLED", "UNABLE_TO_ASSESS") },
  { id: "peripheralPulses", label: "Peripheral pulses / perfusion", group: "Cardiovascular", options: choice("NORMAL", "WEAK", "BOUNDING", "ABSENT", "UNABLE_TO_ASSESS") },
  { id: "capillaryRefill", label: "Capillary refill", group: "Cardiovascular", options: choice("LESS_THAN_2_SEC", "DELAYED", "UNABLE_TO_ASSESS") },
  { id: "edema", label: "Edema", group: "Cardiovascular", options: choice("NONE", "TRACE", "ONE_PLUS", "TWO_PLUS", "THREE_PLUS", "FOUR_PLUS") },
  { id: "cardiovascularConcern", label: "Cardiovascular concerns", group: "Cardiovascular", options: choice("NONE", "CHEST_DISCOMFORT", "CONCERN", "OTHER") },

  { id: "abdomen", label: "Abdomen", group: "Gastrointestinal", options: choice("SOFT", "FIRM", "DISTENDED", "TENDER", "NONTENDER", "RIGID") },
  { id: "bowelSounds", label: "Bowel sounds", group: "Gastrointestinal", options: choice("ACTIVE", "HYPOACTIVE", "HYPERACTIVE", "ABSENT", "UNABLE_TO_ASSESS") },
  { id: "nauseaVomiting", label: "Nausea / vomiting", group: "Gastrointestinal", options: choice("NONE", "NAUSEA", "VOMITING", "NAUSEA_AND_VOMITING") },
  { id: "dietTolerance", label: "Diet tolerance", group: "Gastrointestinal", options: choice("TOLERATING", "POOR_INTAKE", "NPO", "OTHER") },
  { id: "lastBowelMovement", label: "Last bowel movement", group: "Gastrointestinal" },
  { id: "giConcern", label: "GI concerns", group: "Gastrointestinal", options: choice("NONE", "CONSTIPATION", "DIARRHEA", "CONCERN", "OTHER") },

  { id: "voiding", label: "Voiding status", group: "Genitourinary", options: choice("SPONTANEOUS", "CATHETER", "EXTERNAL_DEVICE", "RETENTION_CONCERN", "INCONTINENCE", "OTHER") },
  { id: "urine", label: "Urine characteristics", group: "Genitourinary", options: choice("CLEAR", "CLOUDY", "DARK", "BLOODY", "OTHER") },
  { id: "catheterStatus", label: "Catheter status", group: "Genitourinary", options: choice("NONE", "PRESENT", "CATHETER_CONCERN") },
  { id: "guConcern", label: "GU concerns", group: "Genitourinary", options: choice("NONE", "CONCERN", "OTHER") },

  { id: "skin", label: "Skin color / integrity", group: "Skin / Wounds", options: choice("INTACT", "NON_INTACT", "FRAGILE", "CYANOTIC", "OTHER") },
  { id: "skinTemperature", label: "Skin temperature", group: "Skin / Wounds", options: choice("WARM", "COOL", "COLD", "HOT") },
  { id: "skinMoisture", label: "Skin moisture", group: "Skin / Wounds", options: choice("DRY", "MOIST", "DIAPHORETIC") },
  { id: "wounds", label: "Wounds", group: "Skin / Wounds", options: choice("NONE", "PRESENT", "UNABLE_TO_ASSESS") },
  { id: "pressureInjuryConcern", label: "Pressure injury", group: "Skin / Wounds", options: choice("NONE", "PRESENT", "RISK", "UNABLE_TO_ASSESS") },
  { id: "dressing", label: "Dressing", group: "Skin / Wounds", options: choice("NONE", "CLEAN_DRY_INTACT", "REINFORCED", "CONCERN") },
  { id: "woundConcern", label: "Wound concern", group: "Skin / Wounds", options: choice("NONE", "CONCERN", "OTHER") },

  { id: "activity", label: "Activity", group: "Mobility / Fall", options: choice("BEDREST", "UP_TO_CHAIR", "AMBULATORY", "OTHER") },
  { id: "mobility", label: "Mobility", group: "Mobility / Fall", options: choice("INDEPENDENT", "STANDBY_ASSIST", "ONE_PERSON_ASSIST", "TWO_PERSON_ASSIST", "MECHANICAL_LIFT", "BEDBOUND") },
  { id: "transferAbility", label: "Transfer ability", group: "Mobility / Fall", options: choice("INDEPENDENT", "ASSIST", "DEPENDENT", "UNABLE_TO_ASSESS") },
  { id: "assistiveDevice", label: "Assistive device", group: "Mobility / Fall", options: choice("NONE", "CANE", "WALKER", "CRUTCHES", "WHEELCHAIR", "OTHER") },
  { id: "gait", label: "Gait", group: "Mobility / Fall", options: choice("STEADY", "UNSTEADY", "WEAK", "NOT_OBSERVED") },
  { id: "fallRisk", label: "Fall risk", group: "Mobility / Fall", options: choice("LOW", "MODERATE", "HIGH", "UNABLE_TO_DETERMINE") },
  { id: "fallPrecautions", label: "Fall precautions", group: "Mobility / Fall", options: choice("NONE", "STANDARD", "ENHANCED", "ALARM", "ASSIST_AMBULATION") },

  { id: "linesDrainsDevices", label: "Active lines / drains / devices (condition)", group: "Lines / Drains / Devices" },
  { id: "ivAccess", label: "IV access condition", group: "Lines / Drains / Devices", options: choice("NONE", "PRESENT", "CONCERN") },
  { id: "deviceConcern", label: "Device concern", group: "Lines / Drains / Devices", options: choice("NONE", "CONCERN", "OTHER") },

  { id: "safetyPrecautions", label: "Safety precautions", group: "Safety", options: choice("NONE", "FALL", "ASPIRATION", "SEIZURE", "ELOPEMENT", "ISOLATION", "RESTRAINT", "OTHER") },
  { id: "safetyRisks", label: "Safety concerns", group: "Safety", options: choice("NONE", "CONCERN", "OTHER") },

  { id: "nutritionHydration", label: "Diet / nutrition", group: "Nutrition / Hydration", options: choice("TOLERATING", "POOR_INTAKE", "NPO", "HYDRATION_CONCERN") },
  { id: "appetite", label: "Appetite / intake", group: "Nutrition / Hydration", options: choice("ADEQUATE", "DECREASED", "POOR", "NPO") },
  { id: "feedingAssistance", label: "Feeding assistance", group: "Nutrition / Hydration", options: choice("INDEPENDENT", "ASSIST", "DEPENDENT", "TUBE_FEED") },
  { id: "swallowingConcern", label: "Swallowing concerns", group: "Nutrition / Hydration", options: choice("NONE", "CONCERN", "NPO") },
  { id: "hydration", label: "Hydration concerns", group: "Nutrition / Hydration", options: choice("ADEQUATE", "HYDRATION_CONCERN", "OTHER") },

  { id: "ioMonitoring", label: "I&O monitoring status", group: "Intake & Output", options: choice("ROUTINE", "STRICT", "NOT_REQUIRED", "CONCERN") },
  { id: "ioNote", label: "I&O note / link context", group: "Intake & Output", kind: "textarea" },

  { id: "educationTopics", label: "Education provided", group: "Education / Communication" },
  { id: "learningNeeds", label: "Learning needs", group: "Education / Communication" },
  { id: "understanding", label: "Understanding", group: "Education / Communication", options: choice("VERBALIZES", "DEMOSTRATES", "NEEDS_REINFORCEMENT", "UNABLE_TO_ASSESS") },
  { id: "interpreterNeeds", label: "Interpreter / communication needs", group: "Education / Communication", options: choice("NONE", "INTERPRETER", "OTHER") },

  { id: "moodBehavior", label: "Mood / behavior", group: "Psychosocial", options: choice("CALM", "ANXIOUS", "AGITATED", "WITHDRAWN", "OTHER") },
  { id: "anxiety", label: "Anxiety", group: "Psychosocial", options: choice("NONE", "MILD", "MODERATE", "SEVERE") },
  { id: "copingSupport", label: "Coping / support", group: "Psychosocial" },
  { id: "psychosocialConcern", label: "Psychosocial concerns", group: "Psychosocial", options: choice("NONE", "CONCERN", "OTHER") },

  { id: "narrative", label: "Focused nursing narrative", group: "Narrative", kind: "textarea" },
  { id: "significantChange", label: "Significant change", group: "Narrative", kind: "textarea" },
  { id: "responseToIntervention", label: "Response to intervention", group: "Narrative", kind: "textarea" },
  { id: "providerNotification", label: "Provider notification", group: "Narrative", options: choice("NOT_REQUIRED", "NOTIFIED", "PENDING") },
] as const;
