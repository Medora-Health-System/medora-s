/**
 * M1.7C — Enterprise Formulary Wave 4 ED/Hospital manifest generator (strict M1.7A.2 localization).
 * Run: pnpm --filter @medora/shared build && node packages/shared/scripts/generate-wave4-ed-hospital-manifest.mjs
 */
import { writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const medDir = join(__dirname, "../src/medication");
const distDir = join(__dirname, "../dist/medication");

async function loadPriorCodes() {
  const prior = new Set();
  const modules = [
    { file: "enterpriseWave1FormularyManifest", key: "ENTERPRISE_WAVE1_FORMULARY_MANIFEST" },
    { file: "enterpriseWave2FormularyManifest", key: "ENTERPRISE_WAVE2_FORMULARY_MANIFEST" },
    { file: "enterpriseWave3FormularyManifest", key: "ENTERPRISE_WAVE3_FORMULARY_MANIFEST" },
  ];
  for (const { file, key } of modules) {
    const p = join(distDir, `${file}.js`);
    if (!existsSync(p)) {
      console.warn(`[wave4-gen] skip prior codes — missing ${p} (build shared first)`);
      continue;
    }
    const m = await import(pathToFileURL(p).href);
    const manifest = m[key];
    if (!manifest) {
      console.warn(`[wave4-gen] skip prior codes — missing export ${key} in ${p}`);
      continue;
    }
    for (const e of manifest) prior.add(e.catalogCode);
  }
  return prior;
}

async function loadPriorAdminByCode() {
  /** @type {Record<string, string | null | undefined>} */
  const map = {};
  const modules = [
    { file: "enterpriseWave1FormularyManifest", key: "ENTERPRISE_WAVE1_FORMULARY_MANIFEST" },
    { file: "enterpriseWave2FormularyManifest", key: "ENTERPRISE_WAVE2_FORMULARY_MANIFEST" },
    { file: "enterpriseWave3FormularyManifest", key: "ENTERPRISE_WAVE3_FORMULARY_MANIFEST" },
  ];
  for (const { file, key } of modules) {
    const p = join(distDir, `${file}.js`);
    if (!existsSync(p)) continue;
    const m = await import(pathToFileURL(p).href);
    const manifest = m[key];
    if (!manifest) continue;
    for (const e of manifest) {
      if (e.administrationType && !map[e.catalogCode]) {
        map[e.catalogCode] = e.administrationType;
      }
    }
  }
  return map;
}

async function loadHaitiAdminByCode() {
  /** @type {Record<string, string | null | undefined>} */
  const map = {};
  const p = join(distDir, "haitiMedicationFormularyCatalog.js");
  if (!existsSync(p)) {
    console.warn(`[wave4-gen] skip Haiti admin types — missing ${p}`);
    return map;
  }
  const m = await import(pathToFileURL(p).href);
  const catalog = m.HAITI_MEDICATION_FORMULARY_CATALOG ?? [];
  for (const row of catalog) {
    if (row.code && row.administrationType) {
      map[row.code] = row.administrationType;
    }
  }
  return map;
}

async function loadSearchBuilder() {
  const p = join(distDir, "medicationSearchTokens.js");
  if (!existsSync(p)) {
    throw new Error(`[wave4-gen] missing ${p} — run pnpm --filter @medora/shared build`);
  }
  return import(pathToFileURL(p).href);
}

/**
 * @typedef {object} Row
 * @property {string} [code]
 * @property {string} g
 * @property {string} fr
 * @property {string} en
 * @property {string} st
 * @property {string} form
 * @property {string} route
 * @property {string} tc
 * @property {"RSI"|"PROCEDURAL_SEDATION"|"ACLS_CARDIAC"|"VASOPRESSORS"|"SEPSIS_ANTIBIOTICS"|"STROKE_NEURO"|"ACS_HYPERTENSIVE"|"RESPIRATORY"|"TOXICOLOGY"|"ELECTROLYTE"|"OB_EMERGENCY"|"PEDIATRIC_ED"} bucket
 * @property {"CREATE"|"ENRICH"} [mode]
 * @property {string[]} enAl
 * @property {string[]} frAl
 * @property {object} [gov]
 * @property {string} [adm]
 * @property {boolean} [essential]
 */

/** @type {Row[]} */
const ROWS = [
  // —— RSI (18) ——
  { g: "Etomidate", fr: "Étomidate", en: "Etomidate", st: "2 mg/mL", form: "injectable", route: "intraveineuse", tc: "Inducteur RSI", bucket: "RSI", enAl: ["Amidate", "etomidate RSI"], frAl: ["Amidate", "éto RSI"] },
  { code: "KETAMINE_50MG_ML_INJECTABLE", g: "Ketamine", fr: "Kétamine", en: "Ketamine", st: "50 mg/mL", form: "injectable", route: "intraveineuse", tc: "Inducteur RSI", bucket: "RSI", mode: "ENRICH", enAl: ["Ketalar", "ketamine RSI"], frAl: ["Ketalar", "kétamine RSI"], adm: "INJECTION", gov: { isControlled: true, controlledSchedule: "III", isHighAlert: true } },
  { g: "Ketamine", fr: "Kétamine", en: "Ketamine", st: "10 mg/mL", form: "injectable", route: "intraveineuse", tc: "Inducteur RSI", bucket: "RSI", enAl: ["Ketalar 10", "ketamine dilute"], frAl: ["Ketalar 10", "kétamine diluée"], adm: "INJECTION", gov: { isControlled: true, controlledSchedule: "III", isHighAlert: true } },
  { code: "PROPOFOL_10MG_ML_IV", g: "Propofol", fr: "Propofol", en: "Propofol", st: "10 mg/mL", form: "injectable", route: "intraveineuse", tc: "Inducteur RSI", bucket: "RSI", mode: "ENRICH", enAl: ["Diprivan", "propofol RSI"], frAl: ["Diprivan", "propofol RSI"], adm: "INFUSION", gov: { isHighAlert: true } },
  { g: "Propofol", fr: "Propofol", en: "Propofol", st: "20 mg/mL", form: "injectable", route: "intraveineuse", tc: "Inducteur RSI", bucket: "RSI", enAl: ["Diprivan 20", "propofol 20 mg/mL"], frAl: ["Diprivan 20", "propofol 20 mg/mL"], adm: "INFUSION", gov: { isHighAlert: true } },
  { code: "MIDAZOLAM_5MG_ML_INJECTABLE", g: "Midazolam", fr: "Midazolam", en: "Midazolam", st: "5 mg/mL", form: "injectable", route: "intraveineuse", tc: "Sédation RSI", bucket: "RSI", mode: "ENRICH", enAl: ["Versed", "midazolam IV"], frAl: ["Versed", "midazolam IV"], adm: "INJECTION", gov: { isControlled: true, controlledSchedule: "IV", isHighAlert: true } },
  { g: "Midazolam", fr: "Midazolam", en: "Midazolam", st: "1 mg/mL", form: "injectable", route: "intraveineuse", tc: "Sédation RSI", bucket: "RSI", enAl: ["Versed 1 mg/mL", "midazolam drip"], frAl: ["Versed 1 mg/mL", "midazolam perfusion"], adm: "INFUSION", gov: { isControlled: true, controlledSchedule: "IV", isHighAlert: true } },
  { g: "Lorazepam", fr: "Lorazépam", en: "Lorazepam", st: "2 mg/mL", form: "injectable", route: "intraveineuse", tc: "Sédation RSI", bucket: "RSI", enAl: ["Ativan IV", "lorazepam IV"], frAl: ["Ativan IV", "lorazépam IV"], adm: "INJECTION", gov: { isControlled: true, controlledSchedule: "IV", isHighAlert: true } },
  { g: "Lorazepam", fr: "Lorazépam", en: "Lorazepam", st: "4 mg/mL", form: "injectable", route: "intraveineuse", tc: "Sédation RSI", bucket: "RSI", enAl: ["Ativan 4 mg/mL"], frAl: ["Ativan 4 mg/mL", "lorazépam 4 mg/mL"], adm: "INJECTION", gov: { isControlled: true, controlledSchedule: "IV", isHighAlert: true } },
  { g: "Succinylcholine", fr: "Succinylcholine", en: "Succinylcholine", st: "20 mg/mL", form: "injectable", route: "intraveineuse", tc: "Paralytique RSI", bucket: "RSI", enAl: ["Anectine", "sux", "succs"], frAl: ["Anectine", "succinylcholine"], adm: "INJECTION", gov: { isRsiParalytic: true, isHighAlert: true, requiresSpecialtyReview: true } },
  { g: "Succinylcholine", fr: "Succinylcholine", en: "Succinylcholine", st: "100 mg", form: "poudre", route: "intraveineuse", tc: "Paralytique RSI", bucket: "RSI", enAl: ["Anectine powder"], frAl: ["Anectine poudre", "succinylcholine poudre"], adm: "INJECTION", gov: { isRsiParalytic: true, isHighAlert: true, requiresSpecialtyReview: true } },
  { g: "Rocuronium", fr: "Rocuronium", en: "Rocuronium", st: "10 mg/mL", form: "injectable", route: "intraveineuse", tc: "Paralytique RSI", bucket: "RSI", enAl: ["Zemuron", "Roc"], frAl: ["Zemuron", "rocuronium"], adm: "INJECTION", gov: { isRsiParalytic: true, isHighAlert: true, requiresSpecialtyReview: true } },
  { g: "Rocuronium", fr: "Rocuronium", en: "Rocuronium", st: "50 mg/5 mL", form: "injectable", route: "intraveineuse", tc: "Paralytique RSI", bucket: "RSI", enAl: ["Zemuron 50 mg", "Roc 50"], frAl: ["Zemuron 50 mg", "rocuronium 50 mg"], adm: "INJECTION", gov: { isRsiParalytic: true, isHighAlert: true, requiresSpecialtyReview: true } },
  { g: "Vecuronium", fr: "Vécuronium", en: "Vecuronium", st: "10 mg", form: "poudre", route: "intraveineuse", tc: "Paralytique RSI", bucket: "RSI", enAl: ["Norcuron", "vecuronium powder"], frAl: ["Norcuron", "vécuronium poudre"], adm: "INJECTION", gov: { isRsiParalytic: true, isHighAlert: true, requiresSpecialtyReview: true } },
  { g: "Vecuronium", fr: "Vécuronium", en: "Vecuronium", st: "1 mg/mL", form: "injectable", route: "intraveineuse", tc: "Paralytique RSI", bucket: "RSI", enAl: ["Norcuron IV", "vecuronium reconstituted"], frAl: ["Norcuron IV", "vécuronium reconstitué"], adm: "INJECTION", gov: { isRsiParalytic: true, isHighAlert: true, requiresSpecialtyReview: true } },
  { g: "Cisatracurium", fr: "Cisatracurium", en: "Cisatracurium", st: "2 mg/mL", form: "injectable", route: "intraveineuse", tc: "Paralytique RSI", bucket: "RSI", enAl: ["Nimbex", "cisatracurium"], frAl: ["Nimbex", "cisatracurium"], adm: "INFUSION", gov: { isRsiParalytic: true, isHighAlert: true, requiresSpecialtyReview: true } },
  { g: "Atracurium", fr: "Atracurium", en: "Atracurium", st: "10 mg/mL", form: "injectable", route: "intraveineuse", tc: "Paralytique RSI", bucket: "RSI", enAl: ["Tracrium", "atracurium"], frAl: ["Tracrium", "atracurium"], adm: "INFUSION", gov: { isRsiParalytic: true, isHighAlert: true, requiresSpecialtyReview: true } },
  { g: "Thiopental", fr: "Thiopental", en: "Thiopental", st: "25 mg/mL", form: "poudre", route: "intraveineuse", tc: "Inducteur RSI", bucket: "RSI", enAl: ["Pentothal", "thiopental"], frAl: ["Pentothal", "thiopental"], adm: "INJECTION", gov: { isHighAlert: true } },

  // —— PROCEDURAL_SEDATION (22) ——
  { g: "Fentanyl", fr: "Fentanyl", en: "Fentanyl", st: "50 mcg/mL", form: "injectable", route: "intraveineuse", tc: "Analgésique opioïde", bucket: "PROCEDURAL_SEDATION", enAl: ["Sublimaze", "fentanyl IV"], frAl: ["Sublimaze", "fentanyl IV"], adm: "INJECTION", gov: { isControlled: true, controlledSchedule: "II", isHighAlert: true } },
  { g: "Fentanyl", fr: "Fentanyl", en: "Fentanyl", st: "100 mcg/2 mL", form: "injectable", route: "intraveineuse", tc: "Analgésique opioïde", bucket: "PROCEDURAL_SEDATION", enAl: ["fentanyl 100 mcg"], frAl: ["fentanyl 100 mcg"], adm: "INJECTION", gov: { isControlled: true, controlledSchedule: "II", isHighAlert: true } },
  { g: "Fentanyl", fr: "Fentanyl", en: "Fentanyl", st: "250 mcg/5 mL", form: "injectable", route: "intraveineuse", tc: "Perfusion opioïde continue", bucket: "PROCEDURAL_SEDATION", enAl: ["fentanyl drip", "fentanyl infusion"], frAl: ["fentanyl perfusion", "perfusion fentanyl"], adm: "INFUSION", gov: { isControlled: true, controlledSchedule: "II", isHighAlert: true, isContinuousInfusion: true, requiresDoubleSign: true } },
  { g: "Morphine", fr: "Morphine", en: "Morphine", st: "2 mg/mL", form: "injectable", route: "intraveineuse", tc: "Analgésique opioïde", bucket: "PROCEDURAL_SEDATION", enAl: ["Duramorph 2", "morphine IV 2"], frAl: ["Duramorph 2", "morphine IV 2"], adm: "INJECTION", gov: { isControlled: true, controlledSchedule: "II", isHighAlert: true, lasaGroupId: "GROUP_LASA_OPIOID_MORPHINE_HYDROMORPHONE" } },
  { g: "Morphine", fr: "Morphine", en: "Morphine", st: "4 mg/mL", form: "injectable", route: "intraveineuse", tc: "Analgésique opioïde", bucket: "PROCEDURAL_SEDATION", enAl: ["morphine 4 mg/mL", "morphine IV"], frAl: ["morphine 4 mg/mL", "morphine IV"], adm: "INJECTION", gov: { isControlled: true, controlledSchedule: "II", isHighAlert: true, lasaGroupId: "GROUP_LASA_OPIOID_MORPHINE_HYDROMORPHONE" } },
  { g: "Morphine", fr: "Morphine", en: "Morphine", st: "1 mg/mL", form: "injectable", route: "intraveineuse", tc: "Perfusion opioïde continue", bucket: "PROCEDURAL_SEDATION", enAl: ["morphine PCA", "morphine drip"], frAl: ["PCA morphine", "perfusion morphine"], adm: "INFUSION", gov: { isControlled: true, controlledSchedule: "II", isHighAlert: true, isContinuousInfusion: true, requiresDoubleSign: true, lasaGroupId: "GROUP_LASA_OPIOID_MORPHINE_HYDROMORPHONE" } },
  { g: "Hydromorphone", fr: "Hydromorphone", en: "Hydromorphone", st: "1 mg/mL", form: "injectable", route: "intraveineuse", tc: "Analgésique opioïde", bucket: "PROCEDURAL_SEDATION", enAl: ["Dilaudid", "hydromorphone IV"], frAl: ["Dilaudid", "hydromorphone IV"], adm: "INJECTION", gov: { isControlled: true, controlledSchedule: "II", isHighAlert: true, lasaGroupId: "GROUP_LASA_OPIOID_MORPHINE_HYDROMORPHONE" } },
  { g: "Hydromorphone", fr: "Hydromorphone", en: "Hydromorphone", st: "2 mg/mL", form: "injectable", route: "intraveineuse", tc: "Analgésique opioïde", bucket: "PROCEDURAL_SEDATION", enAl: ["Dilaudid 2", "hydromorphone 2 mg/mL"], frAl: ["Dilaudid 2", "hydromorphone 2 mg/mL"], adm: "INJECTION", gov: { isControlled: true, controlledSchedule: "II", isHighAlert: true, lasaGroupId: "GROUP_LASA_OPIOID_MORPHINE_HYDROMORPHONE" } },
  { g: "Hydromorphone", fr: "Hydromorphone", en: "Hydromorphone", st: "4 mg/mL", form: "injectable", route: "intraveineuse", tc: "Analgésique opioïde", bucket: "PROCEDURAL_SEDATION", enAl: ["Dilaudid 4", "hydromorphone 4 mg/mL"], frAl: ["Dilaudid 4", "hydromorphone 4 mg/mL"], adm: "INJECTION", gov: { isControlled: true, controlledSchedule: "II", isHighAlert: true, lasaGroupId: "GROUP_LASA_OPIOID_MORPHINE_HYDROMORPHONE" } },
  { g: "Ketorolac", fr: "Kétorolac", en: "Ketorolac", st: "15 mg/mL", form: "injectable", route: "intraveineuse", tc: "AINS IV", bucket: "PROCEDURAL_SEDATION", enAl: ["Toradol 15", "ketorolac IV"], frAl: ["Toradol 15", "kétorolac IV"], adm: "INJECTION" },
  { g: "Ketorolac", fr: "Kétorolac", en: "Ketorolac", st: "30 mg/mL", form: "injectable", route: "intraveineuse", tc: "AINS IV", bucket: "PROCEDURAL_SEDATION", enAl: ["Toradol 30", "ketorolac 30"], frAl: ["Toradol 30", "kétorolac 30"], adm: "INJECTION" },
  { g: "Acetaminophen", fr: "Paracétamol", en: "Acetaminophen", st: "10 mg/mL", form: "injectable", route: "intraveineuse", tc: "Antalgique IV", bucket: "PROCEDURAL_SEDATION", enAl: ["Ofirmev", "acetaminophen IV"], frAl: ["Ofirmev", "paracétamol IV"], adm: "INFUSION" },
  { g: "Acetaminophen", fr: "Paracétamol", en: "Acetaminophen", st: "1000 mg/100 mL", form: "perfusion", route: "intraveineuse", tc: "Antalgique IV", bucket: "PROCEDURAL_SEDATION", enAl: ["Ofirmev 1 g bag", "APAP IV bag"], frAl: ["Ofirmev 1 g", "paracétamol perfusion"], adm: "INFUSION" },
  { g: "Nalbuphine", fr: "Nalbuphine", en: "Nalbuphine", st: "10 mg/mL", form: "injectable", route: "intraveineuse", tc: "Analgésique opioïde", bucket: "PROCEDURAL_SEDATION", enAl: ["Nubain", "nalbuphine"], frAl: ["Nubain", "nalbuphine"], adm: "INJECTION", gov: { isControlled: true, controlledSchedule: "V", isHighAlert: true } },
  { g: "Lidocaine", fr: "Lidocaïne", en: "Lidocaine", st: "1%", form: "injectable", route: "injectable", tc: "Anesthésique local", bucket: "PROCEDURAL_SEDATION", enAl: ["Xylocaine 1%", "lidocaine local"], frAl: ["Xylocaine 1%", "lidocaïne locale"], adm: "INJECTION" },
  { g: "Lidocaine", fr: "Lidocaïne", en: "Lidocaine", st: "2%", form: "injectable", route: "injectable", tc: "Anesthésique local", bucket: "PROCEDURAL_SEDATION", enAl: ["Xylocaine 2%", "lidocaine 2%"], frAl: ["Xylocaine 2%", "lidocaïne 2%"], adm: "INJECTION" },
  { g: "Bupivacaine", fr: "Bupivacaïne", en: "Bupivacaine", st: "0.25%", form: "injectable", route: "injectable", tc: "Anesthésique local", bucket: "PROCEDURAL_SEDATION", enAl: ["Marcaine 0.25", "bupivacaine"], frAl: ["Marcaine 0.25", "bupivacaïne"], adm: "INJECTION" },
  { g: "Bupivacaine", fr: "Bupivacaïne", en: "Bupivacaine", st: "0.5%", form: "injectable", route: "injectable", tc: "Anesthésique local", bucket: "PROCEDURAL_SEDATION", enAl: ["Marcaine 0.5", "bupivacaine 0.5%"], frAl: ["Marcaine 0.5", "bupivacaïne 0.5%"], adm: "INJECTION" },
  { g: "Dexmedetomidine", fr: "Dexmédétomidine", en: "Dexmedetomidine", st: "100 mcg/mL", form: "injectable", route: "intraveineuse", tc: "Sédation procédurale", bucket: "PROCEDURAL_SEDATION", enAl: ["Precedex", "dexmedetomidine"], frAl: ["Precedex", "dexmédétomidine"], adm: "INFUSION", gov: { isHighAlert: true } },
  { g: "Remifentanil", fr: "Rémifentanil", en: "Remifentanil", st: "1 mg", form: "poudre", route: "intraveineuse", tc: "Analgésique opioïde", bucket: "PROCEDURAL_SEDATION", enAl: ["Ultiva", "remifentanil"], frAl: ["Ultiva", "rémifentanil"], adm: "INFUSION", gov: { isControlled: true, controlledSchedule: "II", isHighAlert: true, isContinuousInfusion: true, requiresDoubleSign: true } },
  { g: "Alfentanil", fr: "Alfentanil", en: "Alfentanil", st: "500 mcg/mL", form: "injectable", route: "intraveineuse", tc: "Analgésique opioïde", bucket: "PROCEDURAL_SEDATION", enAl: ["Alfenta", "alfentanil"], frAl: ["Alfenta", "alfentanil"], adm: "INJECTION", gov: { isControlled: true, controlledSchedule: "II", isHighAlert: true } },

  // —— ACLS_CARDIAC (18) ——
  { code: "ADRENALINE_1_MG_PER_ML_INJECTABLE_INJECTION", g: "Epinephrine", fr: "Épinéphrine", en: "Epinephrine", st: "1 mg/mL", form: "injectable", route: "intraveineuse", tc: "ACLS", bucket: "ACLS_CARDIAC", mode: "ENRICH", enAl: ["Adrenalin", "epi 1:1000 push"], frAl: ["Adrénamine", "épinéphrine push"], adm: "INJECTION", gov: { isHighAlert: true, isVasopressor: true } },
  { g: "Epinephrine", fr: "Épinéphrine", en: "Epinephrine", st: "0.1 mg/mL", form: "perfusion", route: "intraveineuse", tc: "ACLS perfusion", bucket: "ACLS_CARDIAC", enAl: ["epi drip", "epinephrine infusion"], frAl: ["perfusion épinéphrine", "épi perfusion"], adm: "INFUSION", gov: { isHighAlert: true, isVasopressor: true } },
  { code: "AMIODARONE_150MG_3ML_IV", g: "Amiodarone", fr: "Amiodarone", en: "Amiodarone", st: "150 mg/3 mL", form: "injectable", route: "intraveineuse", tc: "Antiarythmique ACLS", bucket: "ACLS_CARDIAC", mode: "ENRICH", enAl: ["Cordarone IV", "amiodarone push"], frAl: ["Cordarone IV", "amiodarone push"], adm: "INJECTION", gov: { isHighAlert: true } },
  { g: "Amiodarone", fr: "Amiodarone", en: "Amiodarone", st: "900 mg/500 mL", form: "perfusion", route: "intraveineuse", tc: "Antiarythmique ACLS", bucket: "ACLS_CARDIAC", enAl: ["amiodarone drip", "Cordarone drip"], frAl: ["perfusion amiodarone", "amiodarone perfusion"], adm: "INFUSION", gov: { isHighAlert: true } },
  { g: "Lidocaine", fr: "Lidocaïne", en: "Lidocaine", st: "20 mg/mL", form: "injectable", route: "intraveineuse", tc: "Antiarythmique ACLS", bucket: "ACLS_CARDIAC", enAl: ["Xylocaine cardiac", "lidocaine ACLS"], frAl: ["Xylocaine cardiaque", "lidocaïne ACLS"], adm: "INJECTION", gov: { isHighAlert: true } },
  { g: "Atropine", fr: "Atropine", en: "Atropine", st: "0.1 mg/mL", form: "injectable", route: "intraveineuse", tc: "Anticholinergique ACLS", bucket: "ACLS_CARDIAC", enAl: ["atropine push", "atropine ACLS"], frAl: ["atropine push", "atropine ACLS"], adm: "INJECTION" },
  { g: "Atropine", fr: "Atropine", en: "Atropine", st: "1 mg/10 mL", form: "injectable", route: "intraveineuse", tc: "Anticholinergique ACLS", bucket: "ACLS_CARDIAC", enAl: ["atropine 1 mg"], frAl: ["atropine 1 mg"], adm: "INJECTION" },
  { g: "Calcium chloride", fr: "Chlorure de calcium", en: "Calcium chloride", st: "10%", form: "injectable", route: "intraveineuse", tc: "Réanimation ACLS", bucket: "ACLS_CARDIAC", enAl: ["CaCl2", "calcium chloride 10%"], frAl: ["CaCl2", "chlorure de calcium 10%"], adm: "INJECTION", gov: { isHighAlert: true } },
  { g: "Calcium gluconate", fr: "Gluconate de calcium", en: "Calcium gluconate", st: "10%", form: "injectable", route: "intraveineuse", tc: "Réanimation ACLS", bucket: "ACLS_CARDIAC", enAl: ["calcium gluconate 10%", "Ca gluconate"], frAl: ["gluconate de calcium 10%", "Ca gluconate"], adm: "INJECTION", gov: { isHighAlert: true } },
  { g: "Sodium bicarbonate", fr: "Bicarbonate de sodium", en: "Sodium bicarbonate", st: "8.4%", form: "injectable", route: "intraveineuse", tc: "Alcalinisant ACLS", bucket: "ACLS_CARDIAC", enAl: ["bicarb IV", "sodium bicarbonate 8.4%"], frAl: ["bicarbonate IV", "bicarbonate de sodium 8.4%"], adm: "INJECTION" },
  { g: "Sodium bicarbonate", fr: "Bicarbonate de sodium", en: "Sodium bicarbonate", st: "50 mEq/50 mL", form: "injectable", route: "intraveineuse", tc: "Alcalinisant ACLS", bucket: "ACLS_CARDIAC", enAl: ["bicarb 50 mEq", "sodium bicarbonate amp"], frAl: ["bicarbonate 50 mEq", "bicarbonate ampoule"], adm: "INJECTION" },
  { g: "Adenosine", fr: "Adénosine", en: "Adenosine", st: "3 mg/mL", form: "injectable", route: "intraveineuse", tc: "Antiarythmique ACLS", bucket: "ACLS_CARDIAC", enAl: ["Adenocard", "adenosine push"], frAl: ["Adenocard", "adénosine push"], adm: "PUSH", gov: { isHighAlert: true } },
  { g: "Magnesium sulfate", fr: "Sulfate de magnésium", en: "Magnesium sulfate", st: "2 g/50 mL", form: "injectable", route: "intraveineuse", tc: "Électrolyte ACLS", bucket: "ACLS_CARDIAC", enAl: ["MgSO4 2 g", "magnesium ACLS"], frAl: ["MgSO4 2 g", "magnésium ACLS"], adm: "INFUSION", gov: { isHighAlert: true } },
  { g: "Magnesium sulfate", fr: "Sulfate de magnésium", en: "Magnesium sulfate", st: "4 g/100 mL", form: "perfusion", route: "intraveineuse", tc: "Électrolyte ACLS", bucket: "ACLS_CARDIAC", enAl: ["MgSO4 4 g bag", "magnesium drip"], frAl: ["MgSO4 4 g", "perfusion magnésium"], adm: "INFUSION", gov: { isHighAlert: true } },
  { g: "Diltiazem", fr: "Diltiazem", en: "Diltiazem", st: "5 mg/mL", form: "injectable", route: "intraveineuse", tc: "Antiarythmique", bucket: "ACLS_CARDIAC", enAl: ["Cardizem IV 5", "diltiazem push"], frAl: ["Cardizem IV 5", "diltiazem push"], adm: "INJECTION", gov: { isHighAlert: true } },
  { code: "METOPROLOL_5MG_5ML_IV", g: "Metoprolol", fr: "Métoprolol", en: "Metoprolol", st: "5 mg/5 mL", form: "injectable", route: "intraveineuse", tc: "Bêta-bloquant ACLS", bucket: "ACLS_CARDIAC", mode: "ENRICH", enAl: ["Lopressor IV", "metoprolol IV"], frAl: ["Lopressor IV", "métoprolol IV"], adm: "INJECTION", gov: { isHighAlert: true } },
  { g: "Nitroglycerin", fr: "Nitroglycérine", en: "Nitroglycerin", st: "5 mg/mL", form: "injectable", route: "intraveineuse", tc: "Vasodilatateur ACLS", bucket: "ACLS_CARDIAC", enAl: ["Nitro IV", "nitroglycerin IV"], frAl: ["Nitro IV", "nitroglycérine IV"], adm: "INFUSION", gov: { isHighAlert: true } },
  { g: "Isoproterenol", fr: "Isoprénaline", en: "Isoproterenol", st: "0.2 mg/mL", form: "injectable", route: "intraveineuse", tc: "Chronotrope ACLS", bucket: "ACLS_CARDIAC", enAl: ["Isuprel", "isoproterenol"], frAl: ["Isuprel", "isoprénaline"], adm: "INFUSION", gov: { isHighAlert: true, isVasopressor: true } },

  // —— VASOPRESSORS (16) ——
  { g: "Norepinephrine", fr: "Norépinéphrine", en: "Norepinephrine", st: "4 mg/4 mL", form: "injectable", route: "intraveineuse", tc: "Vasopresseur", bucket: "VASOPRESSORS", enAl: ["Levophed", "norepinephrine"], frAl: ["Levophed", "norépinéphrine"], adm: "INFUSION", gov: { isVasopressor: true, isHighAlert: true, lasaGroupId: "GROUP_LASA_VASOPRESSOR_EPI_NOREPI" } },
  { g: "Norepinephrine", fr: "Norépinéphrine", en: "Norepinephrine", st: "8 mg/250 mL", form: "perfusion", route: "intraveineuse", tc: "Vasopresseur", bucket: "VASOPRESSORS", enAl: ["Levophed premix", "norepinephrine bag"], frAl: ["Levophed prémixé", "norépinéphrine poche"], adm: "INFUSION", gov: { isVasopressor: true, isHighAlert: true, lasaGroupId: "GROUP_LASA_VASOPRESSOR_EPI_NOREPI" } },
  { g: "Norepinephrine", fr: "Norépinéphrine", en: "Norepinephrine", st: "16 mg/250 mL", form: "perfusion", route: "intraveineuse", tc: "Vasopresseur", bucket: "VASOPRESSORS", enAl: ["Levophed 16 mg", "norepi 16 mg bag"], frAl: ["Levophed 16 mg", "norépinéphrine 16 mg"], adm: "INFUSION", gov: { isVasopressor: true, isHighAlert: true, lasaGroupId: "GROUP_LASA_VASOPRESSOR_EPI_NOREPI" } },
  { g: "Epinephrine", fr: "Épinéphrine", en: "Epinephrine", st: "4 mg/250 mL", form: "perfusion", route: "intraveineuse", tc: "Vasopresseur", bucket: "VASOPRESSORS", enAl: ["epinephrine premix", "epi bag"], frAl: ["épinéphrine prémixée", "épi poche"], adm: "INFUSION", gov: { isVasopressor: true, isHighAlert: true, lasaGroupId: "GROUP_LASA_VASOPRESSOR_EPI_NOREPI" } },
  { g: "Dopamine", fr: "Dopamine", en: "Dopamine", st: "400 mg/250 mL", form: "perfusion", route: "intraveineuse", tc: "Inotrope/vasopresseur", bucket: "VASOPRESSORS", enAl: ["dopamine drip", "dopamine 400"], frAl: ["perfusion dopamine", "dopamine 400"], adm: "INFUSION", gov: { isVasopressor: true, isHighAlert: true, lasaGroupId: "GROUP_LASA_INOTROPE_DOPAMINE_DOBUTAMINE" } },
  { g: "Dopamine", fr: "Dopamine", en: "Dopamine", st: "800 mg/250 mL", form: "perfusion", route: "intraveineuse", tc: "Inotrope/vasopresseur", bucket: "VASOPRESSORS", enAl: ["dopamine 800", "dopamine high dose bag"], frAl: ["dopamine 800", "dopamine dose élevée"], adm: "INFUSION", gov: { isVasopressor: true, isHighAlert: true, lasaGroupId: "GROUP_LASA_INOTROPE_DOPAMINE_DOBUTAMINE" } },
  { g: "Dobutamine", fr: "Dobutamine", en: "Dobutamine", st: "250 mg/20 mL", form: "injectable", route: "intraveineuse", tc: "Inotrope", bucket: "VASOPRESSORS", enAl: ["Dobutrex", "dobutamine concentrate"], frAl: ["Dobutrex", "dobutamine concentré"], adm: "INFUSION", gov: { isVasopressor: true, isHighAlert: true, lasaGroupId: "GROUP_LASA_INOTROPE_DOPAMINE_DOBUTAMINE" } },
  { g: "Dobutamine", fr: "Dobutamine", en: "Dobutamine", st: "500 mg/250 mL", form: "perfusion", route: "intraveineuse", tc: "Inotrope", bucket: "VASOPRESSORS", enAl: ["dobutamine drip", "dobutamine bag"], frAl: ["perfusion dobutamine", "dobutamine poche"], adm: "INFUSION", gov: { isVasopressor: true, isHighAlert: true, lasaGroupId: "GROUP_LASA_INOTROPE_DOPAMINE_DOBUTAMINE" } },
  { g: "Phenylephrine", fr: "Phényléphrine", en: "Phenylephrine", st: "10 mg/mL", form: "injectable", route: "intraveineuse", tc: "Vasopresseur", bucket: "VASOPRESSORS", enAl: ["Neo-Synephrine", "phenylephrine push"], frAl: ["Neo-Synephrine", "phényléphrine push"], adm: "INJECTION", gov: { isVasopressor: true, isHighAlert: true } },
  { g: "Phenylephrine", fr: "Phényléphrine", en: "Phenylephrine", st: "50 mg/250 mL", form: "perfusion", route: "intraveineuse", tc: "Vasopresseur", bucket: "VASOPRESSORS", enAl: ["phenylephrine drip", "Neo drip"], frAl: ["perfusion phényléphrine", "Neo perfusion"], adm: "INFUSION", gov: { isVasopressor: true, isHighAlert: true } },
  { g: "Vasopressin", fr: "Vasopressine", en: "Vasopressin", st: "20 units/mL", form: "injectable", route: "intraveineuse", tc: "Vasopresseur", bucket: "VASOPRESSORS", enAl: ["Pitressin", "vasopressin"], frAl: ["Pitressin", "vasopressine"], adm: "INFUSION", gov: { isVasopressor: true, isHighAlert: true } },
  { g: "Vasopressin", fr: "Vasopressine", en: "Vasopressin", st: "40 units/100 mL", form: "perfusion", route: "intraveineuse", tc: "Vasopresseur", bucket: "VASOPRESSORS", enAl: ["vasopressin drip", "vasopressin bag"], frAl: ["perfusion vasopressine", "vasopressine poche"], adm: "INFUSION", gov: { isVasopressor: true, isHighAlert: true } },
  { g: "Milrinone", fr: "Milrinone", en: "Milrinone", st: "1 mg/mL", form: "injectable", route: "intraveineuse", tc: "Inotrope", bucket: "VASOPRESSORS", enAl: ["Primacor", "milrinone"], frAl: ["Primacor", "milrinone"], adm: "INFUSION", gov: { isVasopressor: true, isHighAlert: true } },
  { g: "Milrinone", fr: "Milrinone", en: "Milrinone", st: "40 mg/200 mL", form: "perfusion", route: "intraveineuse", tc: "Inotrope", bucket: "VASOPRESSORS", enAl: ["milrinone drip", "Primacor bag"], frAl: ["perfusion milrinone", "milrinone poche"], adm: "INFUSION", gov: { isVasopressor: true, isHighAlert: true } },
  { g: "Angiotensin II", fr: "Angiotensine II", en: "Angiotensin II", st: "2.5 mg/500 mL", form: "perfusion", route: "intraveineuse", tc: "Vasopresseur", bucket: "VASOPRESSORS", enAl: ["Giapreza", "angiotensin II"], frAl: ["Giapreza", "angiotensine II"], adm: "INFUSION", gov: { isVasopressor: true, isHighAlert: true, requiresSpecialtyReview: true } },
  { g: "Epinephrine", fr: "Épinéphrine", en: "Epinephrine", st: "16 mg/250 mL", form: "perfusion", route: "intraveineuse", tc: "Vasopresseur", bucket: "VASOPRESSORS", enAl: ["epinephrine 16 mg bag", "epi high concentration drip"], frAl: ["épinéphrine 16 mg", "épi perfusion concentrée"], adm: "INFUSION", gov: { isVasopressor: true, isHighAlert: true, lasaGroupId: "GROUP_LASA_VASOPRESSOR_EPI_NOREPI" } },

  // —— SEPSIS_ANTIBIOTICS (28) ——
  { code: "PIPERACILLIN_TAZOBACTAM_3_375_G_INJECTABLE_INJECTABLE", g: "Piperacillin tazobactam", fr: "Pipéracilline tazobactam", en: "Piperacillin tazobactam", st: "3.375 g", form: "poudre", route: "intraveineuse", tc: "Antibiotique IV", bucket: "SEPSIS_ANTIBIOTICS", mode: "ENRICH", enAl: ["Zosyn", "pip-tazo 3.375"], frAl: ["Zosyn", "pip-tazo 3.375"], adm: "INFUSION" },
  { g: "Piperacillin tazobactam", fr: "Pipéracilline tazobactam", en: "Piperacillin tazobactam", st: "4.5 g", form: "poudre", route: "intraveineuse", tc: "Antibiotique IV", bucket: "SEPSIS_ANTIBIOTICS", enAl: ["Zosyn 4.5", "pip-tazo 4.5"], frAl: ["Zosyn 4.5", "pip-tazo 4.5"], adm: "INFUSION" },
  { g: "Piperacillin tazobactam", fr: "Pipéracilline tazobactam", en: "Piperacillin tazobactam", st: "2.25 g", form: "poudre", route: "intraveineuse", tc: "Antibiotique IV", bucket: "SEPSIS_ANTIBIOTICS", enAl: ["Zosyn 2.25", "pip-tazo 2.25"], frAl: ["Zosyn 2.25", "pip-tazo 2.25"], adm: "INFUSION" },
  { code: "VANCOMYCIN_1_G_INJECTABLE_INTRAVENOUS", g: "Vancomycin", fr: "Vancomycine", en: "Vancomycin", st: "1 g", form: "poudre", route: "intraveineuse", tc: "Antibiotique IV", bucket: "SEPSIS_ANTIBIOTICS", mode: "ENRICH", enAl: ["Vancocin", "Vanc"], frAl: ["Vancocin", "vanc"], adm: "INFUSION", gov: { isHighAlert: true } },
  { g: "Vancomycin", fr: "Vancomycine", en: "Vancomycin", st: "500 mg", form: "poudre", route: "intraveineuse", tc: "Antibiotique IV", bucket: "SEPSIS_ANTIBIOTICS", enAl: ["Vancocin 500", "vancomycin 500 mg"], frAl: ["Vancocin 500", "vancomycine 500 mg"], adm: "INFUSION", gov: { isHighAlert: true } },
  { g: "Vancomycin", fr: "Vancomycine", en: "Vancomycin", st: "750 mg", form: "poudre", route: "intraveineuse", tc: "Antibiotique IV", bucket: "SEPSIS_ANTIBIOTICS", enAl: ["vancomycin 750", "Vanc 750"], frAl: ["vancomycine 750", "vanc 750"], adm: "INFUSION", gov: { isHighAlert: true } },
  { code: "CEFEPIME_1G_INJECTABLE", g: "Cefepime", fr: "Céfépime", en: "Cefepime", st: "1 g", form: "poudre", route: "intraveineuse", tc: "Antibiotique IV", bucket: "SEPSIS_ANTIBIOTICS", mode: "ENRICH", enAl: ["Maxipime", "cefepime 1 g"], frAl: ["Maxipime", "céfépime 1 g"], adm: "INFUSION" },
  { g: "Cefepime", fr: "Céfépime", en: "Cefepime", st: "2 g", form: "poudre", route: "intraveineuse", tc: "Antibiotique IV", bucket: "SEPSIS_ANTIBIOTICS", enAl: ["Maxipime 2 g", "cefepime 2 g"], frAl: ["Maxipime 2 g", "céfépime 2 g"], adm: "INFUSION" },
  { g: "Meropenem", fr: "Méropénem", en: "Meropenem", st: "1 g", form: "poudre", route: "intraveineuse", tc: "Antibiotique IV", bucket: "SEPSIS_ANTIBIOTICS", enAl: ["Merrem", "meropenem 1 g"], frAl: ["Merrem", "méropénem 1 g"], adm: "INFUSION" },
  { g: "Meropenem", fr: "Méropénem", en: "Meropenem", st: "500 mg", form: "poudre", route: "intraveineuse", tc: "Antibiotique IV", bucket: "SEPSIS_ANTIBIOTICS", enAl: ["Merrem 500", "meropenem 500"], frAl: ["Merrem 500", "méropénem 500"], adm: "INFUSION" },
  { g: "Imipenem cilastatin", fr: "Imipénem cilastatine", en: "Imipenem cilastatin", st: "500 mg", form: "poudre", route: "intraveineuse", tc: "Antibiotique IV", bucket: "SEPSIS_ANTIBIOTICS", enAl: ["Primaxin", "imipenem"], frAl: ["Primaxin", "imipénem"], adm: "INFUSION" },
  { g: "Imipenem cilastatin", fr: "Imipénem cilastatine", en: "Imipenem cilastatin", st: "250 mg", form: "poudre", route: "intraveineuse", tc: "Antibiotique IV", bucket: "SEPSIS_ANTIBIOTICS", enAl: ["Primaxin 250", "imipenem 250"], frAl: ["Primaxin 250", "imipénem 250"], adm: "INFUSION" },
  { code: "CEFTRIAXONE_1_G_INJECTABLE_INJECTION", g: "Ceftriaxone", fr: "Ceftriaxone", en: "Ceftriaxone", st: "1 g", form: "poudre", route: "intraveineuse", tc: "Antibiotique IV", bucket: "SEPSIS_ANTIBIOTICS", mode: "ENRICH", enAl: ["Rocephin 1 g", "ceftriaxone 1 g"], frAl: ["Rocephin 1 g", "ceftriaxone 1 g"], adm: "INFUSION" },
  { code: "CEFTRIAXONE_2_G_INJECTABLE_INJECTION", g: "Ceftriaxone", fr: "Ceftriaxone", en: "Ceftriaxone", st: "2 g", form: "poudre", route: "intraveineuse", tc: "Antibiotique IV", bucket: "SEPSIS_ANTIBIOTICS", mode: "ENRICH", enAl: ["Rocephin 2 g", "ceftriaxone 2 g"], frAl: ["Rocephin 2 g", "ceftriaxone 2 g"], adm: "INFUSION" },
  { code: "CEFAZOLIN_1G_INJECTABLE", g: "Cefazolin", fr: "Céfazoline", en: "Cefazolin", st: "1 g", form: "poudre", route: "intraveineuse", tc: "Antibiotique IV", bucket: "SEPSIS_ANTIBIOTICS", mode: "ENRICH", enAl: ["Ancef", "cefazolin 1 g"], frAl: ["Ancef", "céfazoline 1 g"], adm: "INFUSION" },
  { g: "Cefazolin", fr: "Céfazoline", en: "Cefazolin", st: "2 g", form: "poudre", route: "intraveineuse", tc: "Antibiotique IV", bucket: "SEPSIS_ANTIBIOTICS", enAl: ["Ancef 2 g", "cefazolin 2 g"], frAl: ["Ancef 2 g", "céfazoline 2 g"], adm: "INFUSION" },
  { code: "METRONIDAZOLE_500_MG_PER_100_ML_PERFUSION_INTRAVENOUS", g: "Metronidazole", fr: "Métronidazole", en: "Metronidazole", st: "500 mg/100 mL", form: "perfusion", route: "intraveineuse", tc: "Antibiotique IV", bucket: "SEPSIS_ANTIBIOTICS", mode: "ENRICH", enAl: ["Flagyl IV", "metronidazole bag"], frAl: ["Flagyl IV", "métronidazole poche"], adm: "INFUSION" },
  { g: "Azithromycin", fr: "Azithromycine", en: "Azithromycin", st: "500 mg/250 mL", form: "perfusion", route: "intraveineuse", tc: "Antibiotique IV", bucket: "SEPSIS_ANTIBIOTICS", enAl: ["Zithromax IV", "azithromycin drip"], frAl: ["Zithromax IV", "azithromycine perfusion"], adm: "INFUSION" },
  { g: "Levofloxacin", fr: "Lévofloxacine", en: "Levofloxacin", st: "750 mg/150 mL", form: "perfusion", route: "intraveineuse", tc: "Antibiotique IV", bucket: "SEPSIS_ANTIBIOTICS", enAl: ["Levaquin IV", "levofloxacin bag"], frAl: ["Levaquin IV", "lévofloxacine poche"], adm: "INFUSION" },
  { g: "Ciprofloxacin", fr: "Ciprofloxacine", en: "Ciprofloxacin", st: "400 mg/200 mL", form: "perfusion", route: "intraveineuse", tc: "Antibiotique IV", bucket: "SEPSIS_ANTIBIOTICS", enAl: ["Cipro IV", "ciprofloxacin bag"], frAl: ["Cipro IV", "ciprofloxacine poche"], adm: "INFUSION" },
  { g: "Clindamycin", fr: "Clindamycine", en: "Clindamycin", st: "900 mg/50 mL", form: "perfusion", route: "intraveineuse", tc: "Antibiotique IV", bucket: "SEPSIS_ANTIBIOTICS", enAl: ["Cleocin IV", "clindamycin drip"], frAl: ["Cleocin IV", "clindamycine perfusion"], adm: "INFUSION" },
  { g: "Ampicillin sulbactam", fr: "Ampicilline sulbactam", en: "Ampicillin sulbactam", st: "3 g", form: "poudre", route: "intraveineuse", tc: "Antibiotique IV", bucket: "SEPSIS_ANTIBIOTICS", enAl: ["Unasyn 3 g", "amp-sulb 3 g"], frAl: ["Unasyn 3 g", "amp-sulb 3 g"], adm: "INFUSION" },
  { g: "Ampicillin sulbactam", fr: "Ampicilline sulbactam", en: "Ampicillin sulbactam", st: "1.5 g", form: "poudre", route: "intraveineuse", tc: "Antibiotique IV", bucket: "SEPSIS_ANTIBIOTICS", enAl: ["Unasyn 1.5", "amp-sulb 1.5"], frAl: ["Unasyn 1.5", "amp-sulb 1.5"], adm: "INFUSION" },
  { g: "Linezolid", fr: "Linézolide", en: "Linezolid", st: "600 mg/300 mL", form: "perfusion", route: "intraveineuse", tc: "Antibiotique IV", bucket: "SEPSIS_ANTIBIOTICS", enAl: ["Zyvox IV", "linezolid drip"], frAl: ["Zyvox IV", "linézolide perfusion"], adm: "INFUSION" },
  { g: "Daptomycin", fr: "Daptomycine", en: "Daptomycin", st: "500 mg", form: "poudre", route: "intraveineuse", tc: "Antibiotique IV", bucket: "SEPSIS_ANTIBIOTICS", enAl: ["Cubicin", "daptomycin"], frAl: ["Cubicin", "daptomycine"], adm: "INFUSION" },
  { g: "Ertapenem", fr: "Ertapénem", en: "Ertapenem", st: "1 g", form: "poudre", route: "intraveineuse", tc: "Antibiotique IV", bucket: "SEPSIS_ANTIBIOTICS", enAl: ["Invanz", "ertapenem"], frAl: ["Invanz", "ertapénem"], adm: "INFUSION" },
  { g: "Tigecycline", fr: "Tigécycline", en: "Tigecycline", st: "50 mg", form: "poudre", route: "intraveineuse", tc: "Antibiotique IV", bucket: "SEPSIS_ANTIBIOTICS", enAl: ["Tygacil", "tigecycline"], frAl: ["Tygacil", "tigécycline"], adm: "INFUSION", gov: { requiresSpecialtyReview: true } },
  { g: "Colistimethate", fr: "Colistiméthate", en: "Colistimethate", st: "150 mg", form: "poudre", route: "intraveineuse", tc: "Antibiotique IV", bucket: "SEPSIS_ANTIBIOTICS", enAl: ["Coly-Mycin", "colistin IV"], frAl: ["Coly-Mycin", "colistine IV"], adm: "INFUSION", gov: { isHighAlert: true, requiresSpecialtyReview: true } },

  // —— STROKE_NEURO (16) ——
  { g: "Alteplase", fr: "Altéplase", en: "Alteplase", st: "100 mg", form: "poudre", route: "intraveineuse", tc: "Thrombolytique", bucket: "STROKE_NEURO", enAl: ["Activase", "tPA stroke"], frAl: ["Activase", "tPA AVC"], adm: "INFUSION", gov: { isThrombolytic: true, isHighAlert: true, requiresSpecialtyReview: true } },
  { g: "Tenecteplase", fr: "Ténéctéplase", en: "Tenecteplase", st: "50 mg", form: "poudre", route: "intraveineuse", tc: "Thrombolytique", bucket: "STROKE_NEURO", enAl: ["TNKase", "tenecteplase STEMI"], frAl: ["TNKase", "ténéctéplase SCA"], adm: "INJECTION", gov: { isThrombolytic: true, isHighAlert: true, requiresSpecialtyReview: true } },
  { g: "Levetiracetam", fr: "Lévétiracétam", en: "Levetiracetam", st: "500 mg/5 mL", form: "injectable", route: "intraveineuse", tc: "Anticonvulsivant IV", bucket: "STROKE_NEURO", enAl: ["Keppra IV", "levetiracetam IV"], frAl: ["Keppra IV", "lévétiracétam IV"], adm: "INFUSION" },
  { g: "Levetiracetam", fr: "Lévétiracétam", en: "Levetiracetam", st: "1000 mg/100 mL", form: "perfusion", route: "intraveineuse", tc: "Anticonvulsivant IV", bucket: "STROKE_NEURO", enAl: ["Keppra drip", "levetiracetam bag"], frAl: ["Keppra perfusion", "lévétiracétam poche"], adm: "INFUSION" },
  { g: "Phenytoin", fr: "Phénytoïne", en: "Phenytoin", st: "50 mg/mL", form: "injectable", route: "intraveineuse", tc: "Anticonvulsivant IV", bucket: "STROKE_NEURO", enAl: ["Dilantin IV", "phenytoin IV"], frAl: ["Dilantin IV", "phénytoïne IV"], adm: "INFUSION", gov: { isHighAlert: true } },
  { g: "Valproate sodium", fr: "Valproate de sodium", en: "Valproate sodium", st: "100 mg/mL", form: "injectable", route: "intraveineuse", tc: "Anticonvulsivant IV", bucket: "STROKE_NEURO", enAl: ["Depacon", "valproate IV"], frAl: ["Depacon", "valproate IV"], adm: "INFUSION", gov: { isHighAlert: true } },
  { g: "Nimodipine", fr: "Nimodipine", en: "Nimodipine", st: "60 mg", form: "gélule", route: "orale", tc: "Vasodilatateur cérébral", bucket: "STROKE_NEURO", enAl: ["Nimotop", "nimodipine SAH"], frAl: ["Nimotop", "nimodipine HSA"], gov: { isHighAlert: true, requiresSpecialtyReview: true } },
  { g: "Nimodipine", fr: "Nimodipine", en: "Nimodipine", st: "30 mg", form: "gélule", route: "orale", tc: "Vasodilatateur cérébral", bucket: "STROKE_NEURO", enAl: ["Nimotop 30", "nimodipine 30"], frAl: ["Nimotop 30", "nimodipine 30"], gov: { isHighAlert: true, requiresSpecialtyReview: true } },
  { g: "Mannitol", fr: "Mannitol", en: "Mannitol", st: "20%", form: "perfusion", route: "intraveineuse", tc: "Osmothérapie", bucket: "STROKE_NEURO", enAl: ["mannitol 20%", "mannitol ICP"], frAl: ["mannitol 20%", "mannitol PIC"], adm: "INFUSION", gov: { isHighAlert: true } },
  { g: "Mannitol", fr: "Mannitol", en: "Mannitol", st: "15%", form: "perfusion", route: "intraveineuse", tc: "Osmothérapie", bucket: "STROKE_NEURO", enAl: ["mannitol 15%"], frAl: ["mannitol 15%"], adm: "INFUSION", gov: { isHighAlert: true } },
  { g: "Hypertonic saline", fr: "Saline hypertonique", en: "Hypertonic saline", st: "3% 500 mL", form: "perfusion", route: "intraveineuse", tc: "Osmothérapie", bucket: "STROKE_NEURO", enAl: ["HTS 3% 500", "3% saline bag"], frAl: ["HTS 3% 500", "saline 3% poche"], adm: "INFUSION", gov: { isHighAlert: true } },
  { g: "Hypertonic saline", fr: "Saline hypertonique", en: "Hypertonic saline", st: "23.4% 30 mL", form: "injectable", route: "intraveineuse", tc: "Osmothérapie", bucket: "STROKE_NEURO", enAl: ["HTS 23.4%", "hypertonic saline amp"], frAl: ["HTS 23.4%", "saline hypertonique ampoule"], adm: "INJECTION", gov: { isHighAlert: true } },
  { g: "Labetalol", fr: "Labétalol", en: "Labetalol", st: "5 mg/mL", form: "injectable", route: "intraveineuse", tc: "Antihypertenseur IV", bucket: "STROKE_NEURO", enAl: ["Trandate IV", "labetalol push"], frAl: ["Trandate IV", "labétalol push"], adm: "INJECTION", gov: { isHighAlert: true } },
  { g: "Labetalol", fr: "Labétalol", en: "Labetalol", st: "100 mg/20 mL", form: "injectable", route: "intraveineuse", tc: "Antihypertenseur IV", bucket: "STROKE_NEURO", enAl: ["labetalol 100 mg", "labetalol IV"], frAl: ["labétalol 100 mg", "labétalol IV"], adm: "INFUSION", gov: { isHighAlert: true } },
  { g: "Nicardipine", fr: "Nicardipine", en: "Nicardipine", st: "2.5 mg/mL", form: "injectable", route: "intraveineuse", tc: "Antihypertenseur IV", bucket: "STROKE_NEURO", enAl: ["Cardene IV", "nicardipine drip"], frAl: ["Cardene IV", "nicardipine perfusion"], adm: "INFUSION", gov: { isHighAlert: true } },
  { g: "Phenobarbital", fr: "Phénobarbital", en: "Phenobarbital", st: "130 mg/mL", form: "injectable", route: "intraveineuse", tc: "Anticonvulsivant IV", bucket: "STROKE_NEURO", enAl: ["Luminal IV", "phenobarbital IV"], frAl: ["Luminal IV", "phénobarbital IV"], adm: "INFUSION", gov: { isControlled: true, controlledSchedule: "IV", isHighAlert: true } },

  // —— ACS_HYPERTENSIVE (18) ——
  { code: "NITROGLYCERIN_0_4_MG_COMPRIME_SUBLINGUAL_ORALE", g: "Nitroglycerin", fr: "Nitroglycérine", en: "Nitroglycerin", st: "0.4 mg", form: "comprimé sublingual", route: "orale", tc: "Antiangineux ACS", bucket: "ACS_HYPERTENSIVE", mode: "ENRICH", enAl: ["Nitrostat SL", "nitro SL"], frAl: ["Nitrostat SL", "nitro SL"], gov: { isHighAlert: true } },
  { g: "Nitroglycerin", fr: "Nitroglycérine", en: "Nitroglycerin", st: "50 mg/250 mL", form: "perfusion", route: "intraveineuse", tc: "Antiangineux ACS", bucket: "ACS_HYPERTENSIVE", enAl: ["nitroglycerin drip", "nitro drip ACS"], frAl: ["perfusion nitroglycérine", "nitro perfusion SCA"], adm: "INFUSION", gov: { isHighAlert: true } },
  { g: "Heparin", fr: "Héparine", en: "Heparin", st: "5000 units/mL", form: "injectable", route: "intraveineuse", tc: "Anticoagulant", bucket: "ACS_HYPERTENSIVE", enAl: ["heparin bolus", "heparin 5000"], frAl: ["héparine bolus", "héparine 5000"], adm: "INJECTION", gov: { isHighAlert: true, isAnticoagulantInfusion: false, requiresDoubleSign: false } },
  { g: "Heparin", fr: "Héparine", en: "Heparin", st: "25000 units/500 mL", form: "perfusion", route: "intraveineuse", tc: "Anticoagulant perfusion", bucket: "ACS_HYPERTENSIVE", enAl: ["heparin drip", "weight-based heparin"], frAl: ["perfusion héparine", "héparine poids"], adm: "INFUSION", gov: { isHighAlert: true, isAnticoagulantInfusion: true, requiresDoubleSign: true } },
  { code: "ENOXAPARIN_40_MG_PER_0.4_ML_INJECTABLE_INJECTION", g: "Enoxaparin", fr: "Énoxaparine", en: "Enoxaparin", st: "40 mg/0.4 mL", form: "injectable", route: "sous-cutanée", tc: "Anticoagulant prophylaxie", bucket: "ACS_HYPERTENSIVE", mode: "ENRICH", enAl: ["Lovenox 40", "enoxaparin prophylaxis"], frAl: ["Lovenox 40", "énoxaparine prophylaxie"], adm: "SUBCUTANEOUS", gov: { isHighAlert: true } },
  { code: "ENOXAPARIN_60_MG_PER_0.6_ML_INJECTABLE_INJECTION", g: "Enoxaparin", fr: "Énoxaparine", en: "Enoxaparin", st: "60 mg/0.6 mL", form: "injectable", route: "sous-cutanée", tc: "Anticoagulant traitement", bucket: "ACS_HYPERTENSIVE", mode: "ENRICH", enAl: ["Lovenox 60", "enoxaparin treatment"], frAl: ["Lovenox 60", "énoxaparine traitement"], adm: "SUBCUTANEOUS", gov: { isHighAlert: true } },
  { g: "Enoxaparin", fr: "Énoxaparine", en: "Enoxaparin", st: "120 mg/0.8 mL", form: "injectable", route: "sous-cutanée", tc: "Anticoagulant traitement", bucket: "ACS_HYPERTENSIVE", enAl: ["Lovenox 120", "enoxaparin 120"], frAl: ["Lovenox 120", "énoxaparine 120"], adm: "SUBCUTANEOUS", gov: { isHighAlert: true } },
  { code: "CLOPIDOGREL_75_MG_COMPRIME_ORAL", g: "Clopidogrel", fr: "Clopidogrel", en: "Clopidogrel", st: "75 mg", form: "comprimé", route: "orale", tc: "Antiplaquettaire ACS", bucket: "ACS_HYPERTENSIVE", mode: "ENRICH", enAl: ["Plavix", "clopidogrel maintenance"], frAl: ["Plavix", "clopidogrel entretien"] },
  { code: "ASPIRIN_81", g: "Aspirin", fr: "Aspirine", en: "Aspirin", st: "81 mg", form: "comprimé", route: "orale", tc: "Antiplaquettaire ACS", bucket: "ACS_HYPERTENSIVE", mode: "ENRICH", enAl: ["ASA 81", "baby aspirin ACS"], frAl: ["ASA 81", "aspirine 81 SCA"] },
  { g: "Aspirin", fr: "Aspirine", en: "Aspirin", st: "325 mg", form: "comprimé", route: "orale", tc: "Antiplaquettaire ACS", bucket: "ACS_HYPERTENSIVE", enAl: ["ASA 325 chew", "aspirin loading"], frAl: ["ASA 325", "aspirine charge SCA"] },
  { g: "Ticagrelor", fr: "Ticagrélor", en: "Ticagrelor", st: "180 mg", form: "comprimé", route: "orale", tc: "Antiplaquettaire ACS", bucket: "ACS_HYPERTENSIVE", enAl: ["Brilinta loading", "ticagrelor 180"], frAl: ["Brilinta charge", "ticagrélor 180"], gov: { isHighAlert: true } },
  { g: "Ticagrelor", fr: "Ticagrélor", en: "Ticagrelor", st: "90 mg", form: "comprimé", route: "orale", tc: "Antiplaquettaire ACS", bucket: "ACS_HYPERTENSIVE", enAl: ["Brilinta 90", "ticagrelor maintenance"], frAl: ["Brilinta 90", "ticagrélor entretien"], gov: { isHighAlert: true } },
  { g: "Nitroprusside", fr: "Nitroprussiate de sodium", en: "Nitroprusside", st: "50 mg/2 mL", form: "injectable", route: "intraveineuse", tc: "Antihypertenseur IV", bucket: "ACS_HYPERTENSIVE", enAl: ["Nipride", "nitroprusside drip"], frAl: ["Nipride", "nitroprussiate perfusion"], adm: "INFUSION", gov: { isHighAlert: true, requiresSpecialtyReview: true } },
  { g: "Clevidipine", fr: "Clévidipine", en: "Clevidipine", st: "0.5 mg/mL", form: "emulsion", route: "intraveineuse", tc: "Antihypertenseur IV", bucket: "ACS_HYPERTENSIVE", enAl: ["Cleviprex", "clevidipine drip"], frAl: ["Cleviprex", "clévidipine perfusion"], adm: "INFUSION", gov: { isHighAlert: true } },
  { g: "Hydralazine", fr: "Hydralazine", en: "Hydralazine", st: "20 mg/mL", form: "injectable", route: "intraveineuse", tc: "Antihypertenseur IV", bucket: "ACS_HYPERTENSIVE", enAl: ["Apresoline IV", "hydralazine push"], frAl: ["Apresoline IV", "hydralazine push"], adm: "INJECTION", gov: { isHighAlert: true } },
  { g: "Eptifibatide", fr: "Eptifibatide", en: "Eptifibatide", st: "75 mg/100 mL", form: "perfusion", route: "intraveineuse", tc: "Antiplaquettaire IV", bucket: "ACS_HYPERTENSIVE", enAl: ["Integrilin", "eptifibatide drip"], frAl: ["Integrilin", "eptifibatide perfusion"], adm: "INFUSION", gov: { isHighAlert: true, requiresSpecialtyReview: true } },
  { g: "Bivalirudin", fr: "Bivalirudine", en: "Bivalirudin", st: "250 mg", form: "poudre", route: "intraveineuse", tc: "Anticoagulant IV", bucket: "ACS_HYPERTENSIVE", enAl: ["Angiomax", "bivalirudin"], frAl: ["Angiomax", "bivalirudine"], adm: "INFUSION", gov: { isHighAlert: true, isAnticoagulantInfusion: true, requiresDoubleSign: false } },
  { code: "METOPROLOL_25_MG_COMPRIME_ORAL", g: "Metoprolol", fr: "Métoprolol", en: "Metoprolol", st: "25 mg", form: "comprimé", route: "orale", tc: "Bêta-bloquant ACS", bucket: "ACS_HYPERTENSIVE", mode: "ENRICH", enAl: ["Lopressor 25", "metoprolol oral ACS"], frAl: ["Lopressor 25", "métoprolol oral SCA"] },

  // —— RESPIRATORY (18) ——
  { code: "SALBUTAMOL_2.5_MG_PER_2.5_ML_SOLUTION_NEBULISATION_INHALATION", g: "Albuterol", fr: "Salbutamol", en: "Albuterol", st: "2.5 mg/3 mL", form: "solution de nébulisation", route: "inhalée", tc: "Bronchodilatateur", bucket: "RESPIRATORY", mode: "ENRICH", enAl: ["Proventil neb", "albuterol neb"], frAl: ["salbutamol néb", "Ventolin néb"], adm: "INHALATION" },
  { g: "Albuterol", fr: "Salbutamol", en: "Albuterol", st: "0.5%", form: "solution de nébulisation", route: "inhalée", tc: "Bronchodilatateur", bucket: "RESPIRATORY", enAl: ["albuterol 0.5% neb", "Proventil 0.5%"], frAl: ["salbutamol 0.5% néb", "Ventolin 0.5%"], adm: "INHALATION" },
  { g: "Ipratropium", fr: "Ipratropium", en: "Ipratropium", st: "0.5 mg/2.5 mL", form: "solution de nébulisation", route: "inhalée", tc: "Bronchodilatateur", bucket: "RESPIRATORY", enAl: ["Atrovent neb", "ipratropium neb"], frAl: ["Atrovent néb", "ipratropium néb"], adm: "INHALATION" },
  { g: "Ipratropium albuterol", fr: "Ipratropium salbutamol", en: "Ipratropium albuterol", st: "0.5/3 mg", form: "solution de nébulisation", route: "inhalée", tc: "Bronchodilatateur", bucket: "RESPIRATORY", enAl: ["DuoNeb", "Combivent neb"], frAl: ["DuoNeb", "Combivent néb"], adm: "INHALATION" },
  { g: "Racemic epinephrine", fr: "Épinéphrine racémique", en: "Racemic epinephrine", st: "2.25%", form: "solution de nébulisation", route: "inhalée", tc: "Bronchodilatateur", bucket: "RESPIRATORY", enAl: ["racemic epi neb", "AsthmaNefrin"], frAl: ["épinéphrine racémique néb", "AsthmeNefrin"], adm: "INHALATION", gov: { isHighAlert: true } },
  { g: "Magnesium sulfate", fr: "Sulfate de magnésium", en: "Magnesium sulfate", st: "1 g/50 mL neb", form: "solution de nébulisation", route: "inhalée", tc: "Bronchodilatateur", bucket: "RESPIRATORY", enAl: ["MgSO4 neb", "magnesium nebulization"], frAl: ["MgSO4 néb", "magnésium nébulisation"], adm: "INHALATION" },
  { code: "METHYLPREDNISOLONE_125MG", g: "Methylprednisolone", fr: "Méthylprednisolone", en: "Methylprednisolone", st: "125 mg", form: "poudre", route: "intraveineuse", tc: "Corticostéroide IV", bucket: "RESPIRATORY", mode: "ENRICH", enAl: ["Solu-Medrol 125", "solumedrol 125"], frAl: ["Solu-Medrol 125", "solumedrol 125"], adm: "INJECTION" },
  { g: "Methylprednisolone", fr: "Méthylprednisolone", en: "Methylprednisolone", st: "40 mg", form: "poudre", route: "intraveineuse", tc: "Corticostéroide IV", bucket: "RESPIRATORY", enAl: ["Solu-Medrol 40", "solumedrol 40"], frAl: ["Solu-Medrol 40", "solumedrol 40"], adm: "INJECTION" },
  { code: "DEXAMETHASONE_4_MG_PER_1_ML_INJECTABLE_INJECTION", g: "Dexamethasone", fr: "Dexaméthasone", en: "Dexamethasone", st: "4 mg/mL", form: "injectable", route: "intraveineuse", tc: "Corticostéroide IV", bucket: "RESPIRATORY", mode: "ENRICH", enAl: ["Decadron IV", "dexamethasone IV"], frAl: ["Decadron IV", "dexaméthasone IV"], adm: "INJECTION" },
  { g: "Dexamethasone", fr: "Dexaméthasone", en: "Dexamethasone", st: "10 mg", form: "injectable", route: "intraveineuse", tc: "Corticostéroide IV", bucket: "RESPIRATORY", enAl: ["Decadron 10", "dex 10 mg"], frAl: ["Decadron 10", "dex 10 mg"], adm: "INJECTION" },
  { g: "Terbutaline", fr: "Terbutaline", en: "Terbutaline", st: "1 mg/mL", form: "injectable", route: "sous-cutanée", tc: "Bronchodilatateur", bucket: "RESPIRATORY", enAl: ["Brethine", "terbutaline SC"], frAl: ["Brethine", "terbutaline SC"], adm: "SUBCUTANEOUS" },
  { g: "Aminophylline", fr: "Aminophylline", en: "Aminophylline", st: "250 mg/10 mL", form: "injectable", route: "intraveineuse", tc: "Bronchodilatateur", bucket: "RESPIRATORY", enAl: ["aminophylline IV", "theophylline IV"], frAl: ["aminophylline IV", "théophylline IV"], adm: "INFUSION", gov: { isHighAlert: true } },
  { code: "BUDESONIDE_0.5_MG_PER_2_ML_SUSPENSION_POUR_NEBULISATION_INHALEE", g: "Budesonide", fr: "Budésonide", en: "Budesonide", st: "0.5 mg/2 mL", form: "suspension pour nébulisation", route: "inhalée", tc: "Corticoïde inhalé", bucket: "RESPIRATORY", mode: "ENRICH", enAl: ["Pulmicort respules", "budesonide neb"], frAl: ["Pulmicort nébules", "budésonide néb"], adm: "INHALATION" },
  { g: "Terbutaline", fr: "Terbutaline", en: "Terbutaline", st: "0.25 mg/mL", form: "solution de nébulisation", route: "inhalée", tc: "Bronchodilatateur", bucket: "RESPIRATORY", enAl: ["terbutaline neb", "Brethine neb"], frAl: ["terbutaline néb", "Brethine néb"], adm: "INHALATION" },
  { g: "Epinephrine", fr: "Épinéphrine", en: "Epinephrine", st: "1 mg/1 mL IM", form: "injectable", route: "intramusculaire", tc: "Bronchospasme sévère", bucket: "RESPIRATORY", enAl: ["epi IM asthma", "epinephrine IM"], frAl: ["épi IM asthme", "épinéphrine IM"], adm: "INJECTION", gov: { isHighAlert: true } },
  { g: "Acetylcysteine", fr: "Acétylcystéine", en: "Acetylcysteine", st: "20%", form: "solution de nébulisation", route: "inhalée", tc: "Mucolytique", bucket: "RESPIRATORY", enAl: ["Mucomyst neb", "NAC neb"], frAl: ["Mucomyst néb", "acétylcystéine néb"], adm: "INHALATION" },
  { code: "FUROSEMIDE_20_MG_PER_2_ML_INJECTABLE_INJECTION", g: "Furosemide", fr: "Furosémide", en: "Furosemide", st: "20 mg/2 mL", form: "injectable", route: "intraveineuse", tc: "Diurétique IV", bucket: "RESPIRATORY", mode: "ENRICH", enAl: ["Lasix IV", "furosemide IV"], frAl: ["Lasix IV", "furosémide IV"], adm: "INJECTION", gov: { isHighAlert: true } },
  { code: "ONDANSETRON_4_MG_PER_2_ML_INJECTABLE_INJECTION", g: "Ondansetron", fr: "Ondansétron", en: "Ondansetron", st: "4 mg/2 mL", form: "injectable", route: "intraveineuse", tc: "Antiemetic IV", bucket: "RESPIRATORY", mode: "ENRICH", enAl: ["Zofran IV", "ondansetron IV"], frAl: ["Zofran IV", "ondansétron IV"], adm: "INJECTION" },

  // —— TOXICOLOGY (18) ——
  { code: "NALOXONE_0.4MG_ML", g: "Naloxone", fr: "Naloxone", en: "Naloxone", st: "0.4 mg/mL", form: "injectable", route: "intraveineuse", tc: "Antidote opioïde", bucket: "TOXICOLOGY", mode: "ENRICH", enAl: ["Narcan IV", "naloxone push"], frAl: ["Narcan IV", "naloxone push"], adm: "INJECTION", gov: { isAntidote: true, isHighAlert: true } },
  { g: "Naloxone", fr: "Naloxone", en: "Naloxone", st: "1 mg/mL", form: "injectable", route: "intraveineuse", tc: "Antidote opioïde", bucket: "TOXICOLOGY", enAl: ["Narcan 1 mg/mL", "naloxone 1 mg"], frAl: ["Narcan 1 mg/mL", "naloxone 1 mg"], adm: "INJECTION", gov: { isAntidote: true, isHighAlert: true } },
  { g: "Naloxone", fr: "Naloxone", en: "Naloxone", st: "4 mg/0.4 mL", form: "injectable", route: "intranasale", tc: "Antidote opioïde", bucket: "TOXICOLOGY", enAl: ["Narcan nasal", "naloxone nasal"], frAl: ["Narcan nasal", "naloxone nasal"], adm: "INHALATION", gov: { isAntidote: true, isHighAlert: true } },
  { g: "Flumazenil", fr: "Flumazénil", en: "Flumazenil", st: "0.1 mg/mL", form: "injectable", route: "intraveineuse", tc: "Antidote benzodiazépine", bucket: "TOXICOLOGY", enAl: ["Romazicon", "flumazenil"], frAl: ["Romazicon", "flumazénil"], adm: "INJECTION", gov: { isAntidote: true, isHighAlert: true } },
  { g: "Acetylcysteine", fr: "Acétylcystéine", en: "Acetylcysteine", st: "20% IV", form: "injectable", route: "intraveineuse", tc: "Antidote paracétamol", bucket: "TOXICOLOGY", enAl: ["Acetadote", "NAC IV 20%"], frAl: ["Acetadote", "NAC IV 20%"], adm: "INFUSION", gov: { isAntidote: true, isHighAlert: true } },
  { g: "Acetylcysteine", fr: "Acétylcystéine", en: "Acetylcysteine", st: "6.25% IV", form: "injectable", route: "intraveineuse", tc: "Antidote paracétamol", bucket: "TOXICOLOGY", enAl: ["NAC loading 6.25%", "Acetadote loading"], frAl: ["NAC charge 6.25%", "Acetadote charge"], adm: "INFUSION", gov: { isAntidote: true, isHighAlert: true } },
  { g: "Fomepizole", fr: "Fomépizole", en: "Fomepizole", st: "15 mg/mL", form: "injectable", route: "intraveineuse", tc: "Antidote alcool", bucket: "TOXICOLOGY", enAl: ["Antizol", "fomepizole"], frAl: ["Antizol", "fomépizole"], adm: "INFUSION", gov: { isAntidote: true, isHighAlert: true, requiresSpecialtyReview: true } },
  { g: "Glucagon", fr: "Glucagon", en: "Glucagon", st: "1 mg", form: "poudre", route: "injectable", tc: "Antidote hypoglycémie", bucket: "TOXICOLOGY", enAl: ["GlucaGen", "glucagon"], frAl: ["GlucaGen", "glucagon"], adm: "INJECTION", gov: { isAntidote: true, isHighAlert: true } },
  { g: "Octreotide", fr: "Octréotide", en: "Octreotide", st: "100 mcg/mL", form: "injectable", route: "sous-cutanée", tc: "Antidote sulfonylurée", bucket: "TOXICOLOGY", enAl: ["Sandostatin", "octreotide"], frAl: ["Sandostatin", "octréotide"], adm: "SUBCUTANEOUS", gov: { isAntidote: true, isHighAlert: true } },
  { g: "Physostigmine", fr: "Physostigmine", en: "Physostigmine", st: "1 mg/mL", form: "injectable", route: "intraveineuse", tc: "Antidote anticholinergique", bucket: "TOXICOLOGY", enAl: ["Antilirium", "physostigmine"], frAl: ["Antilirium", "physostigmine"], adm: "INJECTION", gov: { isAntidote: true, isHighAlert: true, requiresSpecialtyReview: true } },
  { g: "Hydroxocobalamin", fr: "Hydroxocobalamine", en: "Hydroxocobalamin", st: "5 g", form: "poudre", route: "intraveineuse", tc: "Antidote cyanure", bucket: "TOXICOLOGY", enAl: ["Cyanokit", "hydroxocobalamin"], frAl: ["Cyanokit", "hydroxocobalamine"], adm: "INFUSION", gov: { isAntidote: true, isHighAlert: true } },
  { g: "Sodium thiosulfate", fr: "Thiosulfate de sodium", en: "Sodium thiosulfate", st: "12.5 g", form: "injectable", route: "intraveineuse", tc: "Antidote cyanure", bucket: "TOXICOLOGY", enAl: ["sodium thiosulfate", "cyanide antidote adjunct"], frAl: ["thiosulfate de sodium", "antidote cyanure adjuvant"], adm: "INFUSION", gov: { isAntidote: true, isHighAlert: true } },
  { g: "Digoxin immune fab", fr: "Anticorps anti-digoxine", en: "Digoxin immune fab", st: "40 mg", form: "poudre", route: "intraveineuse", tc: "Antidote digoxine", bucket: "TOXICOLOGY", enAl: ["DigiFab", "digoxin fab"], frAl: ["DigiFab", "anticorps digoxine"], adm: "INFUSION", gov: { isAntidote: true, isHighAlert: true, requiresSpecialtyReview: true } },
  { g: "Intralipid", fr: "Intralipide", en: "Intralipid", st: "20%", form: "emulsion", route: "intraveineuse", tc: "Antidote anesthésique local", bucket: "TOXICOLOGY", enAl: ["lipid emulsion", "Intralipid 20%"], frAl: ["émulsion lipidique", "Intralipide 20%"], adm: "INFUSION", gov: { isAntidote: true, isHighAlert: true } },
  { g: "Pralidoxime", fr: "Pralidoxime", en: "Pralidoxime", st: "1 g", form: "poudre", route: "intraveineuse", tc: "Antidote organophosphoré", bucket: "TOXICOLOGY", enAl: ["Protopam", "2-PAM"], frAl: ["Protopam", "pralidoxime"], adm: "INFUSION", gov: { isAntidote: true, isHighAlert: true } },
  { g: "Phytonadione", fr: "Phytoménadione", en: "Phytonadione", st: "10 mg/mL", form: "injectable", route: "intraveineuse", tc: "Antidote anticoagulant", bucket: "TOXICOLOGY", enAl: ["vitamin K IV", "Mephyton IV"], frAl: ["vitamine K IV", "Mephyton IV"], adm: "INJECTION", gov: { isAntidote: true, isHighAlert: true } },
  { g: "Ethanol", fr: "Éthanol", en: "Ethanol", st: "10%", form: "perfusion", route: "intraveineuse", tc: "Antidote méthanol/éthylène glycol", bucket: "TOXICOLOGY", enAl: ["ethanol drip", "IV ethanol antidote"], frAl: ["perfusion éthanol", "éthanol antidote IV"], adm: "INFUSION", gov: { isAntidote: true, isHighAlert: true, requiresSpecialtyReview: true } },

  // —— ELECTROLYTE + blood products (22) ——
  { code: "POTASSIUM_CHLORIDE_20_MEQ_PER_10_ML_INJECTABLE_INTRAVENOUS", g: "Potassium chloride", fr: "Chlorure de potassium", en: "Potassium chloride", st: "20 mEq/10 mL", form: "injectable", route: "intraveineuse", tc: "Électrolyte IV", bucket: "ELECTROLYTE", mode: "ENRICH", enAl: ["KCl concentrate", "potassium 20 mEq"], frAl: ["KCl concentré", "potassium 20 mEq"], adm: "INFUSION", gov: { isHighAlert: true } },
  { g: "Potassium chloride", fr: "Chlorure de potassium", en: "Potassium chloride", st: "10 mEq/100 mL", form: "perfusion", route: "intraveineuse", tc: "Électrolyte IV", bucket: "ELECTROLYTE", enAl: ["KCl 10 mEq bag", "potassium drip low"], frAl: ["KCl 10 mEq poche", "perfusion potassium faible"], adm: "INFUSION", gov: { isHighAlert: true } },
  { g: "Potassium chloride", fr: "Chlorure de potassium", en: "Potassium chloride", st: "40 mEq/1000 mL", form: "perfusion", route: "intraveineuse", tc: "Électrolyte IV", bucket: "ELECTROLYTE", enAl: ["KCl 40 mEq bag", "potassium replacement"], frAl: ["KCl 40 mEq poche", "supplément potassium"], adm: "INFUSION", gov: { isHighAlert: true } },
  { code: "MAGNESIUM_SULFATE_500_MG_PER_ML_INJECTABLE_INJECTION", g: "Magnesium sulfate", fr: "Sulfate de magnésium", en: "Magnesium sulfate", st: "500 mg/mL", form: "injectable", route: "intraveineuse", tc: "Électrolyte IV", bucket: "ELECTROLYTE", mode: "ENRICH", enAl: ["MgSO4 concentrate", "magnesium 500 mg/mL"], frAl: ["MgSO4 concentré", "magnésium 500 mg/mL"], adm: "INJECTION", gov: { isHighAlert: true } },
  { g: "Calcium gluconate", fr: "Gluconate de calcium", en: "Calcium gluconate", st: "10% 100 mL", form: "perfusion", route: "intraveineuse", tc: "Électrolyte IV", bucket: "ELECTROLYTE", enAl: ["calcium gluconate bag", "Ca gluconate 100 mL"], frAl: ["gluconate de calcium poche", "Ca gluconate 100 mL"], adm: "INFUSION", gov: { isHighAlert: true } },
  { g: "Calcium chloride", fr: "Chlorure de calcium", en: "Calcium chloride", st: "10% 100 mL", form: "perfusion", route: "intraveineuse", tc: "Électrolyte IV", bucket: "ELECTROLYTE", enAl: ["calcium chloride bag", "CaCl2 100 mL"], frAl: ["chlorure de calcium poche", "CaCl2 100 mL"], adm: "INFUSION", gov: { isHighAlert: true } },
  { g: "Sodium phosphate", fr: "Phosphate de sodium", en: "Sodium phosphate", st: "15 mmol/250 mL", form: "perfusion", route: "intraveineuse", tc: "Électrolyte IV", bucket: "ELECTROLYTE", enAl: ["sodium phosphate IV", "phosphate replacement"], frAl: ["phosphate de sodium IV", "supplément phosphate"], adm: "INFUSION", gov: { isHighAlert: true } },
  { g: "Potassium phosphate", fr: "Phosphate de potassium", en: "Potassium phosphate", st: "30 mmol/500 mL", form: "perfusion", route: "intraveineuse", tc: "Électrolyte IV", bucket: "ELECTROLYTE", enAl: ["K phos IV", "potassium phosphate bag"], frAl: ["K phos IV", "phosphate de potassium poche"], adm: "INFUSION", gov: { isHighAlert: true } },
  { g: "Albumin", fr: "Albumine", en: "Albumin", st: "5% 250 mL", form: "perfusion", route: "intraveineuse", tc: "Colloïde", bucket: "ELECTROLYTE", enAl: ["albumin 5%", "Buminate 5%"], frAl: ["albumine 5%", "Buminate 5%"], adm: "INFUSION", gov: { isHighAlert: true } },
  { g: "Albumin", fr: "Albumine", en: "Albumin", st: "25% 50 mL", form: "perfusion", route: "intraveineuse", tc: "Colloïde", bucket: "ELECTROLYTE", enAl: ["albumin 25%", "Buminate 25%"], frAl: ["albumine 25%", "Buminate 25%"], adm: "INFUSION", gov: { isHighAlert: true } },
  { g: "Dextrose", fr: "Dextrose", en: "Dextrose", st: "50% 50 mL", form: "injectable", route: "intraveineuse", tc: "Réanimation métabolique", bucket: "ELECTROLYTE", enAl: ["D50", "dextrose 50%"], frAl: ["D50", "dextrose 50%"], adm: "INJECTION", gov: { isHighAlert: true } },
  { g: "Dextrose", fr: "Dextrose", en: "Dextrose", st: "10% 250 mL", form: "perfusion", route: "intraveineuse", tc: "Réanimation métabolique", bucket: "ELECTROLYTE", enAl: ["D10 bag", "dextrose 10%"], frAl: ["D10 poche", "dextrose 10%"], adm: "INFUSION", gov: { isHighAlert: true } },
  { code: "REGULAR_INSULIN_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS", g: "Regular insulin", fr: "Insuline régulière", en: "Regular insulin", st: "100 UI/mL", form: "injectable", route: "sous-cutanée", tc: "Antidiabétique", bucket: "ELECTROLYTE", mode: "ENRICH", enAl: ["Actrapid", "Humulin R", "insulin regular SQ"], frAl: ["Actrapid", "Humulin R", "insuline régulière SC"], adm: "SUBCUTANEOUS", gov: { isInsulin: true, isHighAlert: true, requiresDoubleSign: true } },
  { g: "Regular insulin", fr: "Insuline régulière", en: "Regular insulin", st: "100 UI/mL drip kit", form: "perfusion", route: "intraveineuse", tc: "Insuline perfusion", bucket: "ELECTROLYTE", enAl: ["insulin drip kit", "IV insulin protocol"], frAl: ["kit insuline perfusion", "protocole insuline IV"], adm: "INFUSION", gov: { isInsulin: true, isHighAlert: true, requiresDoubleSign: true } },
  { g: "Hypertonic saline", fr: "Saline hypertonique", en: "Hypertonic saline", st: "3% 1000 mL", form: "perfusion", route: "intraveineuse", tc: "Électrolyte IV", bucket: "ELECTROLYTE", enAl: ["3% saline 1000", "HTS maintenance"], frAl: ["saline 3% 1000", "HTS entretien"], adm: "INFUSION", gov: { isHighAlert: true } },
  { g: "Packed red blood cells", fr: "Concentrés érythrocytaires", en: "Packed red blood cells", st: "250 mL", form: "perfusion", route: "intraveineuse", tc: "Produit sanguin", bucket: "ELECTROLYTE", enAl: ["PRBC", "packed red cells"], frAl: ["CGR", "culots globulaires"], adm: "INFUSION", gov: { isBloodProduct: true, isHighAlert: true, requiresDoubleSign: true } },
  { g: "Fresh frozen plasma", fr: "Plasma frais congelé", en: "Fresh frozen plasma", st: "250 mL", form: "perfusion", route: "intraveineuse", tc: "Produit sanguin", bucket: "ELECTROLYTE", enAl: ["FFP", "fresh frozen plasma"], frAl: ["PFC", "plasma frais congelé"], adm: "INFUSION", gov: { isBloodProduct: true, isHighAlert: true, requiresDoubleSign: true } },
  { g: "Platelets", fr: "Plaquettes", en: "Platelets", st: "apheresis unit", form: "perfusion", route: "intraveineuse", tc: "Produit sanguin", bucket: "ELECTROLYTE", enAl: ["platelets apheresis", "plt unit"], frAl: ["plaquettes aphérèse", "unité plaquettes"], adm: "INFUSION", gov: { isBloodProduct: true, isHighAlert: true, requiresDoubleSign: true } },
  { g: "Cryoprecipitate", fr: "Cryoprécipité", en: "Cryoprecipitate", st: "10 units", form: "perfusion", route: "intraveineuse", tc: "Produit sanguin", bucket: "ELECTROLYTE", enAl: ["cryo", "cryoprecipitate"], frAl: ["cryo", "cryoprécipité"], adm: "INFUSION", gov: { isBloodProduct: true, isHighAlert: true, requiresDoubleSign: true } },
  { g: "Whole blood", fr: "Sang total", en: "Whole blood", st: "500 mL", form: "perfusion", route: "intraveineuse", tc: "Produit sanguin", bucket: "ELECTROLYTE", enAl: ["whole blood unit", "WB transfusion"], frAl: ["sang total", "unité sang total"], adm: "INFUSION", gov: { isBloodProduct: true, isHighAlert: true, requiresDoubleSign: true } },
  { g: "Dextrose", fr: "Dextrose", en: "Dextrose", st: "5% 1000 mL", form: "perfusion", route: "intraveineuse", tc: "Maintenance IV", bucket: "ELECTROLYTE", enAl: ["D5W 1000", "dextrose 5% bag"], frAl: ["D5W 1000", "dextrose 5% poche"], adm: "INFUSION" },
  { g: "Sodium chloride", fr: "Chlorure de sodium", en: "Sodium chloride", st: "0.9% 1000 mL", form: "perfusion", route: "intraveineuse", tc: "Maintenance IV", bucket: "ELECTROLYTE", enAl: ["NS 1000", "normal saline bag"], frAl: ["NaCl 0.9% 1000", "saline normale poche"], adm: "INFUSION" },

  // —— OB_EMERGENCY (14) ——
  { g: "Oxytocin", fr: "Oxytocine", en: "Oxytocin", st: "10 units/mL", form: "injectable", route: "intraveineuse", tc: "Utérotonique", bucket: "OB_EMERGENCY", enAl: ["Pitocin", "oxytocin bolus"], frAl: ["Pitocin", "oxytocine bolus"], adm: "INJECTION", gov: { isHighAlert: true } },
  { g: "Oxytocin", fr: "Oxytocine", en: "Oxytocin", st: "30 units/500 mL", form: "perfusion", route: "intraveineuse", tc: "Utérotonique perfusion", bucket: "OB_EMERGENCY", enAl: ["Pitocin drip", "oxytocin labor drip"], frAl: ["Pitocin perfusion", "oxytocine travail"], adm: "INFUSION", gov: { isHighAlert: true, isContinuousInfusion: true } },
  { g: "Methylergonovine", fr: "Méthylergonovine", en: "Methylergonovine", st: "0.2 mg/mL", form: "injectable", route: "intramusculaire", tc: "Utérotonique", bucket: "OB_EMERGENCY", enAl: ["Methergine", "methylergonovine"], frAl: ["Methergine", "méthylergonovine"], adm: "INJECTION", gov: { isHighAlert: true } },
  { g: "Carboprost", fr: "Carboprost", en: "Carboprost", st: "250 mcg/mL", form: "injectable", route: "intramusculaire", tc: "Utérotonique", bucket: "OB_EMERGENCY", enAl: ["Hemabate", "carboprost"], frAl: ["Hemabate", "carboprost"], adm: "INJECTION", gov: { isHighAlert: true, requiresSpecialtyReview: true } },
  { g: "Misoprostol", fr: "Misoprostol", en: "Misoprostol", st: "200 mcg", form: "comprimé", route: "orale", tc: "Utérotonique", bucket: "OB_EMERGENCY", enAl: ["Cytotec", "misoprostol OB"], frAl: ["Cytotec", "misoprostol obstétrique"] },
  { g: "Misoprostol", fr: "Misoprostol", en: "Misoprostol", st: "25 mcg", form: "comprimé", route: "orale", tc: "Utérotonique", bucket: "OB_EMERGENCY", enAl: ["Cytotec 25", "misoprostol buccal"], frAl: ["Cytotec 25", "misoprostol buccal"] },
  { g: "Magnesium sulfate", fr: "Sulfate de magnésium", en: "Magnesium sulfate", st: "4 g/100 mL OB", form: "perfusion", route: "intraveineuse", tc: "Prééclampsie", bucket: "OB_EMERGENCY", enAl: ["MgSO4 OB loading", "magnesium preeclampsia"], frAl: ["MgSO4 charge OB", "magnésium prééclampsie"], adm: "INFUSION", gov: { isHighAlert: true } },
  { g: "Rh immune globulin", fr: "Immunoglobuline anti-D", en: "Rh immune globulin", st: "300 mcg", form: "injectable", route: "intramusculaire", tc: "Prophylaxie allo-immunisation", bucket: "OB_EMERGENCY", enAl: ["RhoGAM", "Rhogam"], frAl: ["RhoGAM", "anti-D"], adm: "INJECTION", gov: { isBloodProduct: false, requiresDoubleSign: false } },
  { g: "Betamethasone", fr: "Bétaméthasone", en: "Betamethasone", st: "12 mg", form: "injectable", route: "intramusculaire", tc: "Maturation pulmonaire", bucket: "OB_EMERGENCY", enAl: ["Celestone", "betamethasone fetal lung"], frAl: ["Celestone", "bétaméthasone maturation"], adm: "INJECTION" },
  { g: "Dexamethasone", fr: "Dexaméthasone", en: "Dexamethasone", st: "6 mg IM", form: "injectable", route: "intramusculaire", tc: "Maturation pulmonaire", bucket: "OB_EMERGENCY", enAl: ["Decadron 6 mg IM", "dexamethasone fetal lung"], frAl: ["Decadron 6 mg IM", "dexaméthasone maturation"], adm: "INJECTION" },
  { g: "Nifedipine", fr: "Nifédipine", en: "Nifedipine", st: "10 mg", form: "gélule", route: "orale", tc: "Tocolytique", bucket: "OB_EMERGENCY", enAl: ["Procardia", "nifedipine tocolysis"], frAl: ["Procardia", "nifédipine tocolyse"] },
  { g: "Labetalol", fr: "Labétalol", en: "Labetalol", st: "200 mg", form: "comprimé", route: "orale", tc: "Hypertension obstétricale", bucket: "OB_EMERGENCY", enAl: ["Trandate 200", "labetalol OB oral"], frAl: ["Trandate 200", "labétalol OB oral"] },
  { g: "Terbutaline", fr: "Terbutaline", en: "Terbutaline", st: "0.25 mg SC OB", form: "injectable", route: "sous-cutanée", tc: "Tocolytique", bucket: "OB_EMERGENCY", enAl: ["Brethine OB", "terbutaline tocolysis"], frAl: ["Brethine OB", "terbutaline tocolyse"], adm: "SUBCUTANEOUS" },
  { g: "Magnesium sulfate", fr: "Sulfate de magnésium", en: "Magnesium sulfate", st: "40 g/1000 mL OB", form: "perfusion", route: "intraveineuse", tc: "Prééclampsie perfusion", bucket: "OB_EMERGENCY", enAl: ["MgSO4 OB drip", "magnesium maintenance OB"], frAl: ["MgSO4 perfusion OB", "magnésium entretien OB"], adm: "INFUSION", gov: { isHighAlert: true, isContinuousInfusion: true } },

  // —— PEDIATRIC_ED (23) ——
  { g: "Epinephrine", fr: "Épinéphrine", en: "Epinephrine", st: "0.15 mg/0.15 mL", form: "injectable", route: "intramusculaire", tc: "Anaphylaxie pédiatrique", bucket: "PEDIATRIC_ED", enAl: ["EpiPen Jr", "epinephrine auto-injector peds"], frAl: ["EpiPen Jr", "épinéphrine auto-injecteur péd"], adm: "INJECTION", gov: { isHighAlert: true } },
  { g: "Epinephrine", fr: "Épinéphrine", en: "Epinephrine", st: "0.3 mg/0.3 mL", form: "injectable", route: "intramusculaire", tc: "Anaphylaxie", bucket: "PEDIATRIC_ED", enAl: ["EpiPen", "epinephrine auto-injector"], frAl: ["EpiPen", "épinéphrine auto-injecteur"], adm: "INJECTION", gov: { isHighAlert: true } },
  { g: "Dextrose", fr: "Dextrose", en: "Dextrose", st: "10% 100 mL", form: "perfusion", route: "intraveineuse", tc: "Hypoglycémie pédiatrique", bucket: "PEDIATRIC_ED", enAl: ["D10 100 peds", "dextrose 10% peds"], frAl: ["D10 100 péd", "dextrose 10% péd"], adm: "INFUSION", gov: { isHighAlert: true } },
  { g: "Dextrose", fr: "Dextrose", en: "Dextrose", st: "25% 25 mL neonatal", form: "injectable", route: "intraveineuse", tc: "Hypoglycémie néonatale", bucket: "PEDIATRIC_ED", enAl: ["D25 neonatal", "dextrose 25% neonate"], frAl: ["D25 néonatal", "dextrose 25% nouveau-né"], adm: "INJECTION", gov: { isHighAlert: true } },
  { g: "Ampicillin", fr: "Ampicilline", en: "Ampicillin", st: "500 mg", form: "poudre", route: "intraveineuse", tc: "Antibiotique pédiatrique", bucket: "PEDIATRIC_ED", enAl: ["ampicillin peds", "Omnipen 500"], frAl: ["ampicilline péd", "Omnipen 500"], adm: "INFUSION" },
  { g: "Gentamicin", fr: "Gentamicine", en: "Gentamicin", st: "40 mg/mL", form: "injectable", route: "intraveineuse", tc: "Antibiotique pédiatrique", bucket: "PEDIATRIC_ED", enAl: ["gentamicin peds", "Garamycin"], frAl: ["gentamicine péd", "Garamycin"], adm: "INFUSION", gov: { isHighAlert: true } },
  { g: "Ceftriaxone", fr: "Ceftriaxone", en: "Ceftriaxone", st: "100 mg/mL peds", form: "poudre", route: "intraveineuse", tc: "Antibiotique pédiatrique", bucket: "PEDIATRIC_ED", enAl: ["Rocephin peds", "ceftriaxone peds"], frAl: ["Rocephin péd", "ceftriaxone péd"], adm: "INFUSION" },
  { g: "Midazolam", fr: "Midazolam", en: "Midazolam", st: "5 mg/0.5 mL nasal", form: "solution nasale", route: "nasale", tc: "Statut épileptique pédiatrique", bucket: "PEDIATRIC_ED", enAl: ["Versed nasal", "midazolam intranasal"], frAl: ["Versed nasal", "midazolam intranasal"], adm: "INHALATION", gov: { isControlled: true, controlledSchedule: "IV", isHighAlert: true } },
  { g: "Ketamine", fr: "Kétamine", en: "Ketamine", st: "100 mg/mL peds", form: "injectable", route: "intraveineuse", tc: "Sédation pédiatrique", bucket: "PEDIATRIC_ED", enAl: ["Ketalar peds", "ketamine peds procedural"], frAl: ["Ketalar péd", "kétamine sédation péd"], adm: "INJECTION", gov: { isControlled: true, controlledSchedule: "III", isHighAlert: true } },
  { g: "Atropine", fr: "Atropine", en: "Atropine", st: "0.05 mg/mL peds", form: "injectable", route: "intraveineuse", tc: "Bradyarrhythmie pédiatrique", bucket: "PEDIATRIC_ED", enAl: ["atropine peds", "atropine 0.05 mg/mL"], frAl: ["atropine péd", "atropine 0.05 mg/mL"], adm: "INJECTION" },
  { g: "Lorazepam", fr: "Lorazépam", en: "Lorazepam", st: "2 mg/mL peds IV", form: "injectable", route: "intraveineuse", tc: "Statut épileptique pédiatrique", bucket: "PEDIATRIC_ED", enAl: ["Ativan peds IV", "lorazepam peds"], frAl: ["Ativan péd IV", "lorazépam péd"], adm: "INJECTION", gov: { isControlled: true, controlledSchedule: "IV", isHighAlert: true } },
  { g: "Calcium gluconate", fr: "Gluconate de calcium", en: "Calcium gluconate", st: "100 mg/mL peds", form: "injectable", route: "intraveineuse", tc: "Hypocalcémie pédiatrique", bucket: "PEDIATRIC_ED", enAl: ["calcium gluconate peds", "Ca gluconate peds"], frAl: ["gluconate de calcium péd", "Ca gluconate péd"], adm: "INJECTION", gov: { isHighAlert: true } },
  { g: "Sodium bicarbonate", fr: "Bicarbonate de sodium", en: "Sodium bicarbonate", st: "4.2% peds", form: "injectable", route: "intraveineuse", tc: "Acidose métabolique pédiatrique", bucket: "PEDIATRIC_ED", enAl: ["bicarb 4.2% peds", "sodium bicarbonate peds"], frAl: ["bicarbonate 4.2% péd", "bicarbonate de sodium péd"], adm: "INJECTION" },
  { g: "Albuterol", fr: "Salbutamol", en: "Albuterol", st: "0.083% peds neb", form: "solution de nébulisation", route: "inhalée", tc: "Bronchospasme pédiatrique", bucket: "PEDIATRIC_ED", enAl: ["albuterol 0.083% peds", "Proventil peds neb"], frAl: ["salbutamol 0.083% péd", "Ventolin péd néb"], adm: "INHALATION" },
  { g: "Dexamethasone", fr: "Dexaméthasone", en: "Dexamethasone", st: "0.4 mg/mL peds", form: "injectable", route: "intraveineuse", tc: "Croup pédiatrique", bucket: "PEDIATRIC_ED", enAl: ["Decadron peds croup", "dexamethasone peds"], frAl: ["Decadron péd croup", "dexaméthasone péd"], adm: "INJECTION" },
  { g: "Racemic epinephrine", fr: "Épinéphrine racémique", en: "Racemic epinephrine", st: "0.25 mL peds neb", form: "solution de nébulisation", route: "inhalée", tc: "Croup sévère pédiatrique", bucket: "PEDIATRIC_ED", enAl: ["racemic epi peds croup", "Asthmanefrin peds"], frAl: ["épinéphrine racémique péd croup", "Asthmanefrin péd"], adm: "INHALATION", gov: { isHighAlert: true } },
  // M1.7C.2 — pediatric oral formulations (ENRICH Haiti SKUs + new ODT/solution)
  { code: "AMOXICILLIN_250_MG_PER_5_ML_SUSPENSION_BUVABLE_ORAL", g: "Amoxicillin", fr: "Amoxicilline", en: "Amoxicillin", st: "250 mg/5 mL", form: "suspension buvable", route: "orale", tc: "Antibiotique pédiatrique", bucket: "PEDIATRIC_ED", mode: "ENRICH", enAl: ["Amoxil", "amoxicillin pediatric oral"], frAl: ["Amoxil sirop", "amoxicilline sirop pediatrique"] },
  { code: "IBUPROFEN_100_MG_PER_5_ML_SUSPENSION_BUVABLE_ORAL", g: "Ibuprofen", fr: "Ibuprofène", en: "Ibuprofen", st: "100 mg/5 mL", form: "suspension buvable", route: "orale", tc: "Antalgique pédiatrique", bucket: "PEDIATRIC_ED", mode: "ENRICH", enAl: ["Advil", "Motrin pediatric oral"], frAl: ["Advil sirop", "ibuprofene sirop pediatrique"] },
  { code: "PREDNISOLONE_15_MG_PER_5_ML_SIROP_ORAL", g: "Prednisolone", fr: "Prednisolone", en: "Prednisolone", st: "15 mg/5 mL", form: "sirop", route: "orale", tc: "Corticoïde pédiatrique", bucket: "PEDIATRIC_ED", mode: "ENRICH", enAl: ["Prelone", "prednisolone pediatric oral"], frAl: ["Solupred sirop", "prednisolone sirop pediatrique"] },
  { g: "Ondansetron", fr: "Ondansétron", en: "Ondansetron", st: "4 mg ODT", form: "comprimé orodispersible", route: "orale", tc: "Antiémétique pédiatrique", bucket: "PEDIATRIC_ED", enAl: ["Zofran ODT", "ondansetron ODT pediatric"], frAl: ["Zofran ODT", "ondansetron ODT pediatrique"] },
  { g: "Ondansetron", fr: "Ondansétron", en: "Ondansetron", st: "4 mg/5 mL", form: "solution buvable", route: "orale", tc: "Antiémétique pédiatrique", bucket: "PEDIATRIC_ED", enAl: ["Zofran oral", "ondansetron pediatric oral"], frAl: ["Zofran solution buvable", "ondansetron sirop pediatrique"] },
  { code: "PARACETAMOL_120_MG_PER_5_ML_SIROP_ORAL", g: "Acetaminophen", fr: "Paracétamol", en: "Acetaminophen", st: "120 mg/5 mL", form: "sirop", route: "orale", tc: "Antalgique pédiatrique", bucket: "PEDIATRIC_ED", mode: "ENRICH", enAl: ["Tylenol pediatric", "acetaminophen oral liquid"], frAl: ["Doliprane sirop", "paracetamol sirop pediatrique"] },
  { code: "PARACETAMOL_250_MG_SUPPOSITOIRE_SUPPOSITOIRE_RECTAL", g: "Acetaminophen", fr: "Paracétamol", en: "Acetaminophen", st: "250 mg", form: "suppositoire", route: "rectale", tc: "Antalgique pédiatrique", bucket: "PEDIATRIC_ED", mode: "ENRICH", enAl: ["Tylenol rectal", "acetaminophen pediatric rectal"], frAl: ["Doliprane suppositoire", "paracetamol suppositoire pediatrique"] },
];

function deriveCode(g, st, form, route) {
  const slug = (s) =>
    s
      .toUpperCase()
      .normalize("NFD")
      .replace(/\u0301/g, "")
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  const strength = slug(st.replace(/,/g, "").replace(/\./g, "_"));
  const formSlug = slug(form.replace("é", "e").replace("è", "e"));
  const routeSlug = slug(route.replace("é", "e"));
  return `${slug(g)}_${strength}_${formSlug}_${routeSlug}`.replace(/__+/g, "_");
}

function defaultGov(gov = {}) {
  return {
    isControlled: gov.isControlled ?? false,
    controlledSchedule: gov.controlledSchedule ?? null,
    isHighAlert: gov.isHighAlert ?? false,
    requiresWitness: gov.requiresWitness ?? false,
    requiresDoubleSign: gov.requiresDoubleSign ?? false,
    lasaGroupId: gov.lasaGroupId ?? null,
    requiresPharmacyVerification: gov.requiresPharmacyVerification ?? false,
    isInsulin: gov.isInsulin ?? false,
    isRsiParalytic: gov.isRsiParalytic ?? false,
    isThrombolytic: gov.isThrombolytic ?? false,
    isVasopressor: gov.isVasopressor ?? false,
    isAntidote: gov.isAntidote ?? false,
    isContinuousInfusion: gov.isContinuousInfusion ?? false,
    isBloodProduct: gov.isBloodProduct ?? false,
    isAnticoagulantInfusion: gov.isAnticoagulantInfusion ?? false,
    requiresSpecialtyReview: gov.requiresSpecialtyReview ?? false,
  };
}

function taggedAliases(enAl, frAl) {
  const out = [];
  const seen = new Set();
  for (const text of enAl) {
    const key = `en:${text.trim().toLowerCase()}`;
    if (!text.trim() || seen.has(key)) continue;
    seen.add(key);
    out.push({ text: text.trim(), language: "en", aliasType: "OTHER" });
  }
  for (const text of frAl) {
    const key = `fr:${text.trim().toLowerCase()}`;
    if (!text.trim() || seen.has(key)) continue;
    seen.add(key);
    out.push({ text: text.trim(), language: "fr", aliasType: "OTHER" });
  }
  return out;
}

function billingFor(row, idx) {
  const seq = String(700000 + idx).padStart(9, "0");
  const ndc11 = `00000${seq}`.slice(-11);
  const ndcDisplay = `${ndc11.slice(0, 5)}-${ndc11.slice(5, 9)}-${ndc11.slice(9)}`;
  const injectable =
    row.form.includes("injectable") ||
    row.form.includes("perfusion") ||
    row.form.includes("poudre") ||
    row.route.includes("intraveineuse") ||
    row.route.includes("sous-cutanée");
  return {
    hcpcs: "J3490",
    description: `Wave4 ${row.g} ${row.st}`,
    billingUnitType: injectable ? "mg" : "tablet",
    ndc11,
    ndcDisplay,
  };
}

const priorCodes = await loadPriorCodes();
const priorAdminByCode = await loadPriorAdminByCode();
const haitiAdminByCode = await loadHaitiAdminByCode();
const { buildMedicationSearchTokens } = await loadSearchBuilder();
const { inferWave4AdministrationType } = await import(
  pathToFileURL(join(distDir, "wave4AdministrationTypeRemediation.js")).href
);

const entries = [];
const skipped = [];

for (const r of ROWS) {
  const catalogCode = r.code ?? deriveCode(r.g, r.st, r.form, r.route);
  if (priorCodes.has(catalogCode) && r.mode !== "ENRICH") {
    skipped.push({ catalogCode, reason: "overlaps W1/W2/W3" });
    continue;
  }
  const aliases = taggedAliases(r.enAl, r.frAl);
  const contract = {
    catalogCode,
    genericName: r.g,
    displayNameFr: r.fr,
    displayNameEn: r.en,
    aliases,
    strength: r.st,
    dosageForm: r.form,
    route: r.route,
    therapeuticClass: r.tc,
  };
  const searchTerms = buildMedicationSearchTokens(contract).terms;
  entries.push({
    catalogCode,
    genericName: r.g,
    displayNameFr: r.fr,
    displayNameEn: r.en,
    strength: r.st,
    dosageForm: r.form,
    route: r.route,
    therapeuticClass: r.tc,
    bucket: r.bucket,
    mode: r.mode ?? "CREATE",
    aliases,
    searchTerms,
    governance: defaultGov(r.gov),
    isEssential: r.essential ?? false,
    administrationType: inferWave4AdministrationType(
      {
        catalogCode,
        explicitAdministrationType: r.adm ?? null,
        route: r.route,
        dosageForm: r.form,
        therapeuticClass: r.tc,
      },
      priorAdminByCode,
      haitiAdminByCode
    ),
    billingClass:
      r.form.includes("injectable") || r.form.includes("perfusion") || r.route.includes("intraveineuse")
        ? "THERAPEUTIC"
        : "DRUG_SUPPLY",
    _billing: billingFor(r, entries.length + 1),
  });
}

const seen = new Set();
for (const e of entries) {
  if (seen.has(e.catalogCode)) throw new Error(`duplicate ${e.catalogCode}`);
  seen.add(e.catalogCode);
}

const createCount = entries.filter((e) => e.mode === "CREATE").length;
console.log(
  `Generated ${entries.length} wave4 entries (${createCount} CREATE, skipped ${skipped.length} W1/W2/W3 overlaps)`
);
if (createCount < 170) {
  console.warn(`[wave4-gen] WARNING: below 170 CREATE entries (${createCount})`);
}
if (skipped.length) console.log("Skipped:", skipped.map((s) => s.catalogCode).join(", "));

const formularyTs = `/**
 * M1.7C — Enterprise Formulary Wave 4 ED/Hospital manifest (auto-generated — edit ROWS in generate-wave4-ed-hospital-manifest.mjs).
 */

import type { EnterpriseWave4EdHospitalFormularyEntry } from "./enterpriseWave4EdHospitalTypes.js";

export const ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST: EnterpriseWave4EdHospitalFormularyEntry[] = ${JSON.stringify(
  entries.map(({ _billing, ...e }) => e),
  null,
  2
)};

export const ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_BY_CODE: Record<string, EnterpriseWave4EdHospitalFormularyEntry> =
  Object.fromEntries(ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST.map((e) => [e.catalogCode, e]));

export const ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_VERSION = "M1.7C" as const;
`;

const billingTs = `/**
 * M1.7C — Enterprise Wave 4 ED/Hospital billing manifest (aligned to formulary order).
 */

import { ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST } from "./enterpriseWave4EdHospitalFormularyManifest.js";
import type { EnterpriseWave4EdHospitalBillingEntry } from "./enterpriseWave4EdHospitalTypes.js";

const BILLING_SPECS = ${JSON.stringify(
  entries.map((e) => ({ catalogCode: e.catalogCode, ...e._billing })),
  null,
  2
)};

if (BILLING_SPECS.length !== ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST.length) {
  throw new Error(
    \`[wave4-billing] spec count \${BILLING_SPECS.length} != formulary \${ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST.length}\`
  );
}

export const ENTERPRISE_WAVE4_ED_HOSPITAL_BILLING_MANIFEST: EnterpriseWave4EdHospitalBillingEntry[] = BILLING_SPECS;

export const ENTERPRISE_WAVE4_ED_HOSPITAL_BILLING_BY_CODE: Record<string, EnterpriseWave4EdHospitalBillingEntry> =
  Object.fromEntries(ENTERPRISE_WAVE4_ED_HOSPITAL_BILLING_MANIFEST.map((e) => [e.catalogCode, e]));
`;

writeFileSync(join(medDir, "enterpriseWave4EdHospitalFormularyManifest.ts"), formularyTs);
writeFileSync(join(medDir, "enterpriseWave4EdHospitalBillingManifest.ts"), billingTs);
console.log("Wrote enterpriseWave4EdHospitalFormularyManifest.ts and enterpriseWave4EdHospitalBillingManifest.ts");
