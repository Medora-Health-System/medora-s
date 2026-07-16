/**
 * Phase 15 (Commit 1) — environmental / exposure documentation foundation. Mirrors the
 * descriptive, non-diagnostic pattern used by `dermatologyMorphologyFoundation.ts`
 * (Phase 14): this module only names standard exposure-documentation vocabulary (exposure
 * type, setting, exertional status, water/altitude/depth/voltage/radiation source, rescue
 * and prehospital intervention detail, measured core temperature and its measurement site,
 * serial-trend documentation, thermoregulation-affecting medications, and
 * pregnancy/pediatric/geriatric status) and detects mentions of it in free text so a chart
 * note can echo standard terminology back. It never infers severity, a diagnosis, or a
 * disposition from ambient conditions (temperature/humidity) or from any single detected
 * value — that judgment stays with the treating clinician.
 */

export type EnvironmentalExposureType =
  | "heat"
  | "cold"
  | "water_submersion"
  | "electrical"
  | "lightning"
  | "altitude"
  | "diving"
  | "radiation"
  | "unspecified";

export type ExposureSetting = "indoor" | "outdoor" | "unspecified";

export type ExertionalStatus = "exertional" | "nonexertional" | "unspecified";

export type CoreTemperatureMeasurementSite =
  | "oral"
  | "rectal"
  | "tympanic"
  | "temporal"
  | "esophageal"
  | "bladder"
  | "axillary"
  | "unspecified";

export type VoltageCategory = "low_voltage" | "high_voltage" | "unspecified";

export type WaterType = "fresh_water" | "salt_water" | "unspecified";

export type PopulationFlag = "pediatric" | "geriatric" | "pregnancy";

export type EnvironmentalExposureFindings = {
  exposureTypes: EnvironmentalExposureType[];
  setting: ExposureSetting;
  exertionalStatus: ExertionalStatus;
  ambientTemperatureReported: boolean;
  ambientHumidityReported: boolean;
  waterType: WaterType;
  depthOrAltitudeReported: boolean;
  voltageCategory: VoltageCategory;
  radiationSourceReported: boolean;
  rescueDetailsReported: boolean;
  prehospitalInterventionReported: boolean;
  coreTemperatureMeasured: boolean;
  coreTemperatureSite: CoreTemperatureMeasurementSite;
  serialTrendDocumented: boolean;
  thermoregulationMedicationReported: boolean;
  populationFlags: PopulationFlag[];
};

const normalize = (value = "") =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const EXPOSURE_TYPE_PATTERNS: Array<{ value: EnvironmentalExposureType; pattern: RegExp }> = [
  { value: "heat", pattern: /\bheat (exposure|illness|exhaustion|stroke|cramps|syncope)\b|\bhyperthermia\b/ },
  { value: "cold", pattern: /\bcold (exposure|injury|water)\b|\bhypothermia\b|\bfrostbite\b|\bfrostnip\b/ },
  { value: "water_submersion", pattern: /\bsubmersion\b|\bdrowning\b|\bnear.drowning\b/ },
  { value: "electrical", pattern: /\belectrical (injury|shock|burn|arc)\b|\belectrocution\b/ },
  { value: "lightning", pattern: /\blightning\b/ },
  { value: "altitude", pattern: /\baltitude (illness|sickness|exposure)\b|\bhigh.altitude\b/ },
  { value: "diving", pattern: /\bdiving\b|\bscuba\b|\bdecompression\b/ },
  { value: "radiation", pattern: /\bradiation (exposure|injury|emergency)\b/ },
];

const SETTING_PATTERNS: Array<{ value: ExposureSetting; pattern: RegExp }> = [
  { value: "indoor", pattern: /\bindoor(s)?\b/ },
  { value: "outdoor", pattern: /\boutdoor(s)?\b/ },
];

const EXERTIONAL_PATTERNS: Array<{ value: ExertionalStatus; pattern: RegExp }> = [
  { value: "exertional", pattern: /\bexertional\b|\bstrenuous (activity|exercise)\b|\bathletic activity\b/ },
  { value: "nonexertional", pattern: /\bnonexertional\b|\bnon.exertional\b|\bat rest\b/ },
];

const WATER_TYPE_PATTERNS: Array<{ value: WaterType; pattern: RegExp }> = [
  { value: "fresh_water", pattern: /\bfresh.?water\b/ },
  { value: "salt_water", pattern: /\bsalt.?water\b|\bocean\b|\bsea water\b/ },
];

const VOLTAGE_PATTERNS: Array<{ value: VoltageCategory; pattern: RegExp }> = [
  { value: "high_voltage", pattern: /\bhigh.?voltage\b|>\s?1000\s?v(olts)?\b/ },
  { value: "low_voltage", pattern: /\blow.?voltage\b/ },
];

const CORE_TEMPERATURE_SITE_PATTERNS: Array<{ value: CoreTemperatureMeasurementSite; pattern: RegExp }> = [
  { value: "rectal", pattern: /\brectal (temperature|probe)\b/ },
  { value: "esophageal", pattern: /\besophageal (temperature|probe)\b/ },
  { value: "bladder", pattern: /\bbladder (temperature|probe)\b/ },
  { value: "tympanic", pattern: /\btympanic (temperature|thermometer)\b/ },
  { value: "temporal", pattern: /\btemporal (temperature|thermometer|artery)\b/ },
  { value: "oral", pattern: /\boral (temperature|thermometer)\b/ },
  { value: "axillary", pattern: /\baxillary (temperature|thermometer)\b/ },
];

const THERMOREGULATION_MEDICATION_PATTERN =
  /\b(diuretic|anticholinergic|antipsychotic|beta.?blocker|stimulant medication|amphetamine|antihistamine)\b/;

/**
 * Documentation advisory only. Detects standard exposure-documentation vocabulary already
 * present in free text so it can be echoed back in a chart note. Never infers severity or a
 * diagnosis from ambient conditions or from any single detected value.
 */
export function parseEnvironmentalExposureFromText(text = ""): EnvironmentalExposureFindings {
  const normalized = normalize(text);

  const setting = SETTING_PATTERNS.find((entry) => entry.pattern.test(normalized))?.value ?? "unspecified";
  const exertionalStatus = EXERTIONAL_PATTERNS.find((entry) => entry.pattern.test(normalized))?.value ?? "unspecified";
  const waterType = WATER_TYPE_PATTERNS.find((entry) => entry.pattern.test(normalized))?.value ?? "unspecified";
  const voltageCategory = VOLTAGE_PATTERNS.find((entry) => entry.pattern.test(normalized))?.value ?? "unspecified";
  const coreTemperatureSite =
    CORE_TEMPERATURE_SITE_PATTERNS.find((entry) => entry.pattern.test(normalized))?.value ?? "unspecified";

  const populationFlags: PopulationFlag[] = [];
  if (/\bpediatric\b|\bchild\b|\binfant\b/.test(normalized)) populationFlags.push("pediatric");
  if (/\bgeriatric\b|\belderly\b/.test(normalized)) populationFlags.push("geriatric");
  if (/\bpregnan(t|cy)\b/.test(normalized)) populationFlags.push("pregnancy");

  return {
    exposureTypes: EXPOSURE_TYPE_PATTERNS.filter((entry) => entry.pattern.test(normalized)).map((entry) => entry.value),
    setting,
    exertionalStatus,
    ambientTemperatureReported: /\bambient temperature\b|\btemperature of\s?\d/.test(normalized),
    ambientHumidityReported: /\bhumidity\b/.test(normalized),
    waterType,
    depthOrAltitudeReported: /\bdepth of\b|\baltitude of\b|\bfeet (deep|elevation)\b|\bmeters (deep|elevation)\b/.test(normalized),
    voltageCategory,
    radiationSourceReported: /\bradiation source\b|\bradioactive\b|\birradiation\b/.test(normalized),
    rescueDetailsReported: /\brescue(d)?\b|\bbystander\b|\bcpr performed\b|\btime to rescue\b/.test(normalized),
    prehospitalInterventionReported: /\bprehospital\b|\bems (provided|initiated|administered)\b|\bcooling (initiated|started)\b|\brewarming (initiated|started)\b/.test(
      normalized
    ),
    coreTemperatureMeasured: /\bcore temperature\b|\bmeasured temperature\b/.test(normalized),
    coreTemperatureSite,
    serialTrendDocumented: /\bserial (temperature|vitals|reassessment)\b|\btrend(ing)?\b/.test(normalized),
    thermoregulationMedicationReported: THERMOREGULATION_MEDICATION_PATTERN.test(normalized),
    populationFlags,
  };
}
