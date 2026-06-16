/**
 * One-shot remediation for legacy 19Mdm complaint-intel placeholder strings (ME.2AB-R).
 * Run: node apps/web/scripts/remediate19MdmPlaceholders.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(__dirname, "../src/i18n/messages");

const PLACEHOLDER_RE =
  /Document if|Consider documenting|considered in differential|Reassess and document|Disposition should reflect|Assess for|Review whether|if documented|if assessed|if performed|if indicated|if obtained|if applicable|Document general appearance|were obtained and incorporated into MDM|À documenter si pertinent|À documenter :|Documenter si vérifié|Documenter à l'examen si présent|Documenter l'aspect général|Évaluer :|Revoir si pertinent|à considérer dans le différentiel|Réévaluer et documenter|La sortie doit refléter| is present/i;

function camelToWords(s) {
  return s
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function stripPrefixes(key) {
  return key
    .replace(/^hpi/, "")
    .replace(/^ros/, "")
    .replace(/^exam/, "")
    .replace(/^diff/, "")
    .replace(/^rf/, "")
    .replace(/^mdm/, "")
    .replace(/^reassess/, "")
    .replace(/^disp/, "")
    .replace(/^wa/, "")
    .replace(/IfDocumented|IfPerformed|IfObtained|IfIndicated|IfApplicable|IfRelevant|IfGiven|IfConcern|IfHighRisk|IfPresent/g, "");
}

const EXAM_EN = {
  MentalStatusIfDocumented: "alert and oriented",
  FocalDeficitsIfDocumented: "no focal neurologic deficit",
  InjuryAssessmentIfDocumented: "no signs of traumatic injury",
  OrientationIfDocumented: "alert and oriented to person, place, and time",
  NeuroScreenIfDocumented: "nonfocal neurologic examination",
  HydrationPerfusionIfDocumented: "well perfused",
  HydrationIfDocumented: "well hydrated",
  StrengthIfDocumented: "strength symmetric",
  SensationIfDocumented: "sensation intact",
  CranialNervesGaitIfDocumented: "cranial nerves intact; normal gait",
  SensoryFindingsIfDocumented: "sensation intact",
  StrengthReflexesIfDocumented: "strength and reflexes symmetric",
  GaitIfDocumented: "normal gait",
  GaitIfAssessed: "normal gait",
  TremorCharacterizationIfDocumented: "no resting tremor",
  StrengthSensationIfDocumented: "strength and sensation intact",
  CoordinationInjuryScreenIfDocumented: "coordination intact; no injury on screening exam",
  StrengthSensationReflexesIfDocumented: "strength, sensation, and reflexes symmetric",
  MidlineTendernessIfDocumented: "no midline spinal tenderness",
  RhythmRateIfDocumented: "regular rate and rhythm",
  VolumeStatusIfDocumented: "euvolemic on examination",
  LungSoundsIfDocumented: "clear breath sounds",
  RateRhythmIfDocumented: "regular rate and rhythm",
  LungFindingsIfDocumented: "lungs clear to auscultation",
  EdemaIfDocumented: "no peripheral edema",
  PerfusionIfDocumented: "well perfused",
  RespiratoryFindingsIfDocumented: "no respiratory distress",
  RespiratoryStatusIfDocumented: "no respiratory distress",
  NeuroStatusIfDocumented: "nonfocal neurologic examination",
  CardiacRhythmIfDocumented: "regular rhythm",
  ThyroidNeckFindingsIfDocumented: "thyroid without enlargement or tenderness",
  TremorIfDocumented: "no resting tremor",
  CardiacExamIfDocumented: "regular rate and rhythm without murmur",
  CardiopulmonaryIfDocumented: "lungs clear; regular heart rhythm",
  AbdominalExamIfDocumented: "abdomen soft and nontender",
  RomIfDocumented: "full range of motion",
  NeuroGaitIfDocumented: "normal gait; nonfocal neurologic examination",
  NeuroFindingsIfDocumented: "nonfocal neurologic examination",
  DeformityIfDocumented: "no deformity",
  DistalPerfusionSensationIfDocumented: "distal pulses intact; sensation preserved",
  SwellingIfDocumented: "no significant swelling",
  LigamentFindingsIfDocumented: "ligamentous stability preserved",
  DistalPerfusionIfDocumented: "distal perfusion intact",
  SwellingEcchymosisIfDocumented: "swelling and ecchymosis as clinically present",
  NeurovascularStatusIfDocumented: "neurovascular status intact distally",
  ShorteningRotationIfDocumented: "no limb shortening or malrotation",
  NeurovascularFindingsIfDocumented: "neurovascularly intact distally",
  TendonFunctionIfDocumented: "tendon function intact",
  SensationPerfusionIfDocumented: "sensation and perfusion intact distally",
  TraumaSurveyFindingsIfDocumented: "trauma survey without additional injury",
  MobilityIfDocumented: "ambulates without difficulty",
  ScalpFacialTraumaIfDocumented: "no scalp or facial trauma",
  WoundDepthIfDocumented: "wound depth assessed",
  NeurovascularTendonIfDocumented: "neurovascular and tendon function intact",
  DistensionTenderness: "abdominal distension with tenderness",
  RectalIfPerformed: "rectal examination performed",
  VitalsTrend: "vital signs stable",
  AbdominalExam: "abdomen soft and nontender",
  HerniaExam: "hernia examination performed",
  AbdominalDistension: "abdominal distension present",
  ExternalRectalIfPerformed: "external rectal examination performed",
  AirwayOralPharynx: "airway patent; oropharynx clear",
  NeuroScreen: "nonfocal neurologic screening examination",
  Perfusion: "well perfused",
  CardiopulmonaryExam: "lungs clear; regular heart rhythm",
  GeneralAppearance: "well appearing",
};

const EXAM_FR = {
  MentalStatusIfDocumented: "alerte et orienté(e)",
  FocalDeficitsIfDocumented: "pas de déficit neurologique focal",
  InjuryAssessmentIfDocumented: "pas de signes de traumatisme",
  GaitIfDocumented: "marche normale",
  NeuroScreenIfDocumented: "examen neurologique non focal",
  HydrationIfDocumented: "bien hydraté(e)",
  StrengthIfDocumented: "force symétrique",
  RomIfDocumented: "amplitude articulaire complète",
  RhythmRateIfDocumented: "rythme et fréquence réguliers",
  EdemaIfDocumented: "pas d'œdème périphérique",
  GeneralAppearance: "aspect général satisfaisant",
};

function examPhrase(key, locale) {
  const tail = key.replace(/^exam/, "");
  const map = locale === "fr" ? EXAM_FR : EXAM_EN;
  if (map[tail]) return map[tail];
  const words = camelToWords(stripPrefixes(key));
  if (locale === "fr") return `${words} à l'examen`;
  return `${words} on examination`;
}

function remediateKey(key, locale) {
  if (key.startsWith("rosDenies")) {
    const rest = camelToWords(key.replace(/^rosDenies/, ""));
    return locale === "fr" ? `nie ${rest}` : `denies ${rest}`;
  }
  if (key.startsWith("diff")) {
    const words = camelToWords(key.replace(/^diff/, ""));
    return locale === "fr" ? words : words;
  }
  if (key.startsWith("rf")) {
    return camelToWords(key.replace(/^rf/, ""));
  }
  if (key.startsWith("ros")) {
    return camelToWords(key.replace(/^ros/, ""));
  }
  if (key.startsWith("exam")) {
    return examPhrase(key, locale);
  }
  if (key.startsWith("hpi")) {
    const words = camelToWords(stripPrefixes(key));
    return locale === "fr" ? `${words} rapporté(e)` : `${words} reported`;
  }
  if (key.startsWith("reassess")) {
    const words = camelToWords(stripPrefixes(key));
    return locale === "fr" ? `${words} à la réévaluation` : `${words} on reassessment`;
  }
  if (key.startsWith("disp")) {
    const words = camelToWords(stripPrefixes(key));
    return locale === "fr"
      ? `retour si ${words}`
      : `return for ${words}`;
  }
  if (key.startsWith("mdm") && /Reviewed/i.test(key)) {
    const base = camelToWords(stripPrefixes(key).replace(/reviewed.*/i, "").trim());
    return locale === "fr" ? `${base} revu` : `${base} reviewed`;
  }
  if (key.startsWith("mdm")) {
    const words = camelToWords(stripPrefixes(key));
    return words;
  }
  if (key.startsWith("wa") || key.startsWith("imp") || key.startsWith("plan") || key.startsWith("risk") || key.startsWith("reasoning")) {
    return camelToWords(stripPrefixes(key));
  }
  return camelToWords(stripPrefixes(key));
}

function remediateFile(filePath, locale) {
  const content = fs.readFileSync(filePath, "utf8");
  let changed = 0;
  const out = content.replace(/"([A-Za-z0-9_]+)":\s*"((?:[^"\\]|\\.)*)"/g, (match, key, value) => {
    if (!PLACEHOLDER_RE.test(value)) return match;
    const next = remediateKey(key, locale);
    if (next === value) return match;
    changed += 1;
    return `"${key}": "${next}"`;
  });
  if (changed > 0) {
    fs.writeFileSync(filePath, out);
  }
  return changed;
}

const files = fs
  .readdirSync(messagesDir)
  .filter((f) => f.includes("19Mdm") && (f.endsWith(".en.ts") || f.endsWith(".fr.ts")));

let total = 0;
for (const file of files) {
  const locale = file.endsWith(".fr.ts") ? "fr" : "en";
  const n = remediateFile(path.join(messagesDir, file), locale);
  console.log(`${file}: ${n} values remediated`);
  total += n;
}
console.log(`Total remediated: ${total}`);
