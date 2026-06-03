/**
 * M1.7B — Enterprise Formulary Wave 3 manifest generator (strict M1.7A.2 localization).
 * Run: pnpm --filter @medora/shared build && node packages/shared/scripts/generate-wave3-manifest.mjs
 */
import { writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const medDir = join(__dirname, "../src/medication");
const distDir = join(__dirname, "../dist/medication");

async function loadPriorCodes() {
  const prior = new Set();
  for (const mod of ["enterpriseWave1FormularyManifest", "enterpriseWave2FormularyManifest"]) {
    const p = join(distDir, `${mod}.js`);
    if (!existsSync(p)) {
      console.warn(`[wave3-gen] skip prior codes — missing ${p} (build shared first)`);
      continue;
    }
    const m = await import(pathToFileURL(p).href);
    const manifest =
      mod.includes("Wave1") ? m.ENTERPRISE_WAVE1_FORMULARY_MANIFEST : m.ENTERPRISE_WAVE2_FORMULARY_MANIFEST;
    for (const e of manifest) prior.add(e.catalogCode);
  }
  return prior;
}

async function loadSearchBuilder() {
  const p = join(distDir, "medicationSearchTokens.js");
  if (!existsSync(p)) {
    throw new Error(`[wave3-gen] missing ${p} — run pnpm --filter @medora/shared build`);
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
 * @property {"NEPHROLOGY"|"DERMATOLOGY"|"RHEUMATOLOGY"|"NEUROLOGY"|"PSYCHIATRY"|"PULMONOLOGY"|"ENDOCRINOLOGY"} bucket
 * @property {"CREATE"|"ENRICH"} [mode]
 * @property {string[]} enAl
 * @property {string[]} frAl
 * @property {object} [gov]
 * @property {string} [adm]
 * @property {boolean} [essential]
 */

/** @type {Row[]} */
const ROWS = [
  // —— NEPHROLOGY (14) ——
  { g: "Sevelamer carbonate", fr: "Carbonate de sévélamer", en: "Sevelamer carbonate", st: "800 mg", form: "comprimé", route: "orale", tc: "Chélateur du phosphate", bucket: "NEPHROLOGY", enAl: ["Renvela", "Renagel"], frAl: ["Renvela", "sévélamer"] },
  { g: "Calcium acetate", fr: "Acétate de calcium", en: "Calcium acetate", st: "667 mg", form: "gélule", route: "orale", tc: "Chélateur du phosphate", bucket: "NEPHROLOGY", enAl: ["PhosLo", "Phoslyra"], frAl: ["PhosLo", "acétate de calcium"] },
  { g: "Calcitriol", fr: "Calcitriol", en: "Calcitriol", st: "0.25 mcg", form: "gélule", route: "orale", tc: "Vitamine D active", bucket: "NEPHROLOGY", enAl: ["Rocaltrol"], frAl: ["Rocaltrol", "calcitriol"] },
  { g: "Cinacalcet", fr: "Cinacalcet", en: "Cinacalcet", st: "30 mg", form: "comprimé", route: "orale", tc: "Modulateur du calcium", bucket: "NEPHROLOGY", enAl: ["Sensipar"], frAl: ["Sensipar", "cinacalcet"] },
  { g: "Sodium bicarbonate", fr: "Bicarbonate de sodium", en: "Sodium bicarbonate", st: "650 mg", form: "comprimé", route: "orale", tc: "Alcalinisant", bucket: "NEPHROLOGY", enAl: ["baking soda tablet"], frAl: ["bicarbonate", "alcalinisant"] },
  { g: "Patiromer", fr: "Patiromer", en: "Patiromer", st: "8.4 g", form: "poudre", route: "orale", tc: "Chélateur du potassium", bucket: "NEPHROLOGY", enAl: ["Veltassa"], frAl: ["Veltassa", "patiromer"] },
  { g: "Sodium zirconium cyclosilicate", fr: "Cyclosilicate de zirconium et de sodium", en: "Sodium zirconium cyclosilicate", st: "10 g", form: "poudre", route: "orale", tc: "Chélateur du potassium", bucket: "NEPHROLOGY", enAl: ["Lokelma", "SZC"], frAl: ["Lokelma", "cyclosilicate"] },
  { g: "Epoetin alfa", fr: "Époétine alfa", en: "Epoetin alfa", st: "4000 UI/mL", form: "injectable", route: "sous-cutanée", tc: "Agent hématopoïétique", bucket: "NEPHROLOGY", enAl: ["Epogen", "Procrit"], frAl: ["Épogen", "époétine"], adm: "SUBCUTANEOUS", gov: { isHighAlert: true, requiresPharmacyVerification: true } },
  { g: "Darbepoetin alfa", fr: "Darbépoétine alfa", en: "Darbepoetin alfa", st: "40 mcg/0.4 mL", form: "injectable", route: "sous-cutanée", tc: "Agent hématopoïétique", bucket: "NEPHROLOGY", enAl: ["Aranesp"], frAl: ["Aranesp", "darbépoétine"], adm: "SUBCUTANEOUS", gov: { isHighAlert: true, requiresPharmacyVerification: true } },
  { g: "Iron sucrose", fr: "Saccharose ferrique", en: "Iron sucrose", st: "20 mg/mL", form: "injectable", route: "intraveineuse", tc: "Supplément fer", bucket: "NEPHROLOGY", enAl: ["Venofer"], frAl: ["Venofer", "fer IV"], adm: "INFUSION" },
  { g: "Ferric carboxymaltose", fr: "Carboxymaltose ferrique", en: "Ferric carboxymaltose", st: "750 mg/15 mL", form: "injectable", route: "intraveineuse", tc: "Supplément fer", bucket: "NEPHROLOGY", enAl: ["Injectafer"], frAl: ["Injectafer", "fer carboxymaltose"], adm: "INFUSION" },
  { g: "Torsemide", fr: "Torasémide", en: "Torsemide", st: "20 mg", form: "comprimé", route: "orale", tc: "Diurétique de l'anse", bucket: "NEPHROLOGY", enAl: ["Demadex"], frAl: ["Demadex", "torasémide"] },
  { g: "Metolazone", fr: "Métolazone", en: "Metolazone", st: "2.5 mg", form: "comprimé", route: "orale", tc: "Diurétique thiazidique", bucket: "NEPHROLOGY", enAl: ["Zaroxolyn"], frAl: ["Zaroxolyn", "métolazone"] },
  { g: "Bumetanide", fr: "Bumétanide", en: "Bumetanide", st: "1 mg", form: "comprimé", route: "orale", tc: "Diurétique de l'anse", bucket: "NEPHROLOGY", enAl: ["Bumex"], frAl: ["Bumex", "bumétanide"] },
  { g: "Sodium polystyrene sulfonate", fr: "Sulfonate de polystyrène sodique", en: "Sodium polystyrene sulfonate", st: "15 g", form: "poudre", route: "orale", tc: "Chélateur du potassium", bucket: "NEPHROLOGY", enAl: ["Kayexalate"], frAl: ["Kayexalate", "kayexalate"] },
  { g: "Ergocalciferol", fr: "Ergocalciférol", en: "Ergocalciferol", st: "50000 IU", form: "gélule", route: "orale", tc: "Vitamine D", bucket: "NEPHROLOGY", enAl: ["Drisdol", "vitamin D2"], frAl: ["Drisdol", "vitamine D2"] },

  // —— DERMATOLOGY (18) ——
  { g: "Clobetasol propionate", fr: "Propionate de clobétasol", en: "Clobetasol propionate", st: "0.05%", form: "crème", route: "topique", tc: "Corticoïde topique", bucket: "DERMATOLOGY", enAl: ["Temovate", "clobetasol"], frAl: ["Temovate", "clobétasol"] },
  { g: "Betamethasone valerate", fr: "Valérate de bétaméthasone", en: "Betamethasone valerate", st: "0.1%", form: "crème", route: "topique", tc: "Corticoïde topique", bucket: "DERMATOLOGY", enAl: ["Valisone", "betamethasone cream"], frAl: ["Valisone", "bétaméthasone"] },
  { g: "Triamcinolone acetonide", fr: "Acétonide de triamcinolone", en: "Triamcinolone acetonide", st: "0.1%", form: "crème", route: "topique", tc: "Corticoïde topique", bucket: "DERMATOLOGY", enAl: ["Kenalog cream", "triamcinolone topical"], frAl: ["Kenalog crème", "triamcinolone topique"] },
  { g: "Hydrocortisone", fr: "Hydrocortisone", en: "Hydrocortisone", st: "2.5%", form: "crème", route: "topique", tc: "Corticoïde topique", bucket: "DERMATOLOGY", enAl: ["Cortaid", "hydrocortisone topical"], frAl: ["Cortaid", "hydrocortisone topique"] },
  { g: "Tacrolimus", fr: "Tacrolimus", en: "Tacrolimus", st: "0.1%", form: "onguent", route: "topique", tc: "Immunosuppresseur topique", bucket: "DERMATOLOGY", enAl: ["Protopic", "tacrolimus ointment"], frAl: ["Protopic", "tacrolimus topique"] },
  { g: "Pimecrolimus", fr: "Pimécrolimus", en: "Pimecrolimus", st: "1%", form: "crème", route: "topique", tc: "Immunosuppresseur topique", bucket: "DERMATOLOGY", enAl: ["Elidel"], frAl: ["Elidel", "pimécrolimus"] },
  { g: "Mupirocin", fr: "Mupirocine", en: "Mupirocin", st: "2%", form: "onguent", route: "topique", tc: "Antibiotique topique", bucket: "DERMATOLOGY", enAl: ["Bactroban"], frAl: ["Bactroban", "mupirocine"] },
  { g: "Ketoconazole", fr: "Kétoconazole", en: "Ketoconazole", st: "2%", form: "crème", route: "topique", tc: "Antifongique topique", bucket: "DERMATOLOGY", enAl: ["Nizoral cream"], frAl: ["Nizoral crème", "kétoconazole topique"] },
  { g: "Terbinafine", fr: "Terbinafine", en: "Terbinafine", st: "250 mg", form: "comprimé", route: "orale", tc: "Antifongique", bucket: "DERMATOLOGY", enAl: ["Lamisil"], frAl: ["Lamisil", "terbinafine"] },
  { g: "Fluconazole", fr: "Fluconazole", en: "Fluconazole", st: "150 mg", form: "comprimé", route: "orale", tc: "Antifongique", bucket: "DERMATOLOGY", enAl: ["Diflucan"], frAl: ["Diflucan", "fluconazole"] },
  { g: "Doxycycline", fr: "Doxycycline", en: "Doxycycline", st: "100 mg", form: "comprimé", route: "orale", tc: "Antibiotique / acné", bucket: "DERMATOLOGY", enAl: ["Vibramycin", "doxycycline acne"], frAl: ["Vibramycin", "doxycycline acné"] },
  { g: "Isotretinoin", fr: "Isotrétinoïne", en: "Isotretinoin", st: "20 mg", form: "gélule", route: "orale", tc: "Rétinoïde", bucket: "DERMATOLOGY", enAl: ["Accutane", "Claravis"], frAl: ["Accutane", "isotrétinoïne"], gov: { isHighAlert: true, requiresSpecialtyReview: true } },
  { g: "Benzoyl peroxide", fr: "Peroxyde de benzoyle", en: "Benzoyl peroxide", st: "5%", form: "gel", route: "topique", tc: "Acné", bucket: "DERMATOLOGY", enAl: ["Benzac", "BP gel"], frAl: ["Benzac", "peroxyde de benzoyle"] },
  { g: "Adapalene", fr: "Adapalène", en: "Adapalene", st: "0.1%", form: "gel", route: "topique", tc: "Rétinoïde topique", bucket: "DERMATOLOGY", enAl: ["Differin"], frAl: ["Differin", "adapalène"] },
  { g: "Tretinoin", fr: "Trétinoïne", en: "Tretinoin", st: "0.025%", form: "crème", route: "topique", tc: "Rétinoïde topique", bucket: "DERMATOLOGY", enAl: ["Retin-A"], frAl: ["Retin-A", "trétinoïne"] },
  { g: "Clindamycin", fr: "Clindamycine", en: "Clindamycin", st: "1%", form: "gel", route: "topique", tc: "Antibiotique topique", bucket: "DERMATOLOGY", enAl: ["Cleocin T", "clindamycin topical"], frAl: ["Cleocin T", "clindamycine topique"] },
  { g: "Permethrin", fr: "Perméthrine", en: "Permethrin", st: "5%", form: "crème", route: "topique", tc: "Antiparasitaire topique", bucket: "DERMATOLOGY", enAl: ["Elimite", "Nix cream"], frAl: ["Elimite", "perméthrine"] },
  { g: "Silver sulfadiazine", fr: "Sulfadiazine argentique", en: "Silver sulfadiazine", st: "1%", form: "crème", route: "topique", tc: "Antibiotique topique", bucket: "DERMATOLOGY", enAl: ["Silvadene"], frAl: ["Silvadene", "sulfadiazine argentique"] },
  { g: "Clotrimazole", fr: "Clotrimazole", en: "Clotrimazole", st: "1%", form: "crème", route: "topique", tc: "Antifongique topique", bucket: "DERMATOLOGY", enAl: ["Lotrimin", "clotrimazole cream"], frAl: ["Lotrimin", "clotrimazole crème"] },
  { g: "Hydrocortisone", fr: "Hydrocortisone", en: "Hydrocortisone", st: "1%", form: "crème", route: "topique", tc: "Corticoïde topique", bucket: "DERMATOLOGY", enAl: ["Cortaid 1%", "hydrocortisone 1% cream"], frAl: ["Cortaid 1%", "hydrocortisone 1%"] },

  // —— RHEUMATOLOGY (12) ——
  { g: "Methotrexate", fr: "Méthotrexate", en: "Methotrexate", st: "2.5 mg", form: "comprimé", route: "orale", tc: "DMARD", bucket: "RHEUMATOLOGY", enAl: ["Trexall", "mtx"], frAl: ["Trexall", "méthotrexate"], gov: { isHighAlert: true, isDmard: true, requiresPharmacyVerification: true } },
  { g: "Hydroxychloroquine", fr: "Hydroxychloroquine", en: "Hydroxychloroquine", st: "200 mg", form: "comprimé", route: "orale", tc: "DMARD", bucket: "RHEUMATOLOGY", enAl: ["Plaquenil"], frAl: ["Plaquenil", "hydroxychloroquine"], gov: { isDmard: true } },
  { g: "Sulfasalazine", fr: "Sulfasalazine", en: "Sulfasalazine", st: "500 mg", form: "comprimé", route: "orale", tc: "DMARD", bucket: "RHEUMATOLOGY", enAl: ["Azulfidine"], frAl: ["Azulfidine", "sulfasalazine"], gov: { isDmard: true } },
  { g: "Leflunomide", fr: "Léflunomide", en: "Leflunomide", st: "20 mg", form: "comprimé", route: "orale", tc: "DMARD", bucket: "RHEUMATOLOGY", enAl: ["Arava"], frAl: ["Arava", "léflunomide"], gov: { isDmard: true, isHighAlert: true } },
  { g: "Methylprednisolone", fr: "Méthylprednisolone", en: "Methylprednisolone", st: "4 mg", form: "comprimé", route: "orale", tc: "Corticostéroide", bucket: "RHEUMATOLOGY", enAl: ["Medrol dosepak", "medrol"], frAl: ["Medrol", "méthylprednisolone"] },
  { g: "Febuxostat", fr: "Fébuxostat", en: "Febuxostat", st: "40 mg", form: "comprimé", route: "orale", tc: "Antigoutte", bucket: "RHEUMATOLOGY", enAl: ["Uloric"], frAl: ["Uloric", "fébuxostat"] },
  { g: "Prednisone", fr: "Prednisone", en: "Prednisone", st: "10 mg", form: "comprimé", route: "orale", tc: "Corticostéroide", bucket: "RHEUMATOLOGY", enAl: ["Deltasone 10"], frAl: ["Deltasone 10", "prednisone 10 mg"] },
  { g: "Etanercept", fr: "Étanercept", en: "Etanercept", st: "50 mg/mL", form: "injectable", route: "sous-cutanée", tc: "Biologique", bucket: "RHEUMATOLOGY", enAl: ["Enbrel"], frAl: ["Enbrel", "étanercept"], adm: "SUBCUTANEOUS", gov: { isBiologic: true, isDmard: true, requiresPharmacyVerification: true, requiresSpecialtyReview: true } },
  { g: "Adalimumab", fr: "Adalimumab", en: "Adalimumab", st: "40 mg/0.8 mL", form: "injectable", route: "sous-cutanée", tc: "Biologique", bucket: "RHEUMATOLOGY", enAl: ["Humira"], frAl: ["Humira", "adalimumab"], adm: "SUBCUTANEOUS", gov: { isBiologic: true, isDmard: true, requiresPharmacyVerification: true, requiresSpecialtyReview: true } },
  { g: "Colchicine", fr: "Colchicine", en: "Colchicine", st: "0.6 mg", form: "comprimé", route: "orale", tc: "Antigoutte", bucket: "RHEUMATOLOGY", mode: "ENRICH", code: "COLCHICINE_0_6_MG_COMPRIME_ORALE", enAl: ["Colcrys"], frAl: ["Colcrys", "colchicine"] },
  { g: "Allopurinol", fr: "Allopurinol", en: "Allopurinol", st: "300 mg", form: "comprimé", route: "orale", tc: "Antigoutte", bucket: "RHEUMATOLOGY", enAl: ["Zyloprim 300"], frAl: ["Zyloprim 300", "allopurinol 300"] },
  { g: "Indomethacin", fr: "Indométacine", en: "Indomethacin", st: "25 mg", form: "gélule", route: "orale", tc: "AINS", bucket: "RHEUMATOLOGY", enAl: ["Indocin"], frAl: ["Indocin", "indométacine"] },
  { g: "Azathioprine", fr: "Azathioprine", en: "Azathioprine", st: "50 mg", form: "comprimé", route: "orale", tc: "DMARD", bucket: "RHEUMATOLOGY", enAl: ["Imuran"], frAl: ["Imuran", "azathioprine"], gov: { isDmard: true, isHighAlert: true, requiresPharmacyVerification: true } },

  // —— NEUROLOGY (14) ——
  { g: "Lamotrigine", fr: "Lamotrigine", en: "Lamotrigine", st: "100 mg", form: "comprimé", route: "orale", tc: "Anticonvulsivant", bucket: "NEUROLOGY", enAl: ["Lamictal"], frAl: ["Lamictal", "lamotrigine"] },
  { g: "Topiramate", fr: "Topiramate", en: "Topiramate", st: "25 mg", form: "comprimé", route: "orale", tc: "Anticonvulsivant", bucket: "NEUROLOGY", enAl: ["Topamax"], frAl: ["Topamax", "topiramate"] },
  { g: "Carbamazepine", fr: "Carbamazépine", en: "Carbamazepine", st: "200 mg", form: "comprimé", route: "orale", tc: "Anticonvulsivant", bucket: "NEUROLOGY", enAl: ["Tegretol"], frAl: ["Tegretol", "carbamazépine"], gov: { isHighAlert: true } },
  { g: "Valproic acid", fr: "Acide valproïque", en: "Valproic acid", st: "500 mg", form: "comprimé", route: "orale", tc: "Anticonvulsivant", bucket: "NEUROLOGY", enAl: ["Depakote ER", "valproate 500"], frAl: ["Depakote", "valproate 500"], gov: { isHighAlert: true } },
  { g: "Pregabalin", fr: "Prégabaline", en: "Pregabalin", st: "75 mg", form: "gélule", route: "orale", tc: "Anticonvulsivant / neuropathie", bucket: "NEUROLOGY", enAl: ["Lyrica"], frAl: ["Lyrica", "prégabaline"], gov: { isControlled: true, controlledSchedule: "V" } },
  { g: "Ropinirole", fr: "Ropinirole", en: "Ropinirole", st: "0.25 mg", form: "comprimé", route: "orale", tc: "Antiparkinsonien", bucket: "NEUROLOGY", enAl: ["Requip"], frAl: ["Requip", "ropinirole"] },
  { g: "Pramipexole", fr: "Pramipexole", en: "Pramipexole", st: "0.125 mg", form: "comprimé", route: "orale", tc: "Antiparkinsonien", bucket: "NEUROLOGY", enAl: ["Mirapex"], frAl: ["Mirapex", "pramipexole"] },
  { g: "Donepezil", fr: "Donépézil", en: "Donepezil", st: "5 mg", form: "comprimé", route: "orale", tc: "Antidémence", bucket: "NEUROLOGY", enAl: ["Aricept"], frAl: ["Aricept", "donépézil"] },
  { g: "Memantine", fr: "Mémantine", en: "Memantine", st: "10 mg", form: "comprimé", route: "orale", tc: "Antidémence", bucket: "NEUROLOGY", enAl: ["Namenda"], frAl: ["Namenda", "mémantine"] },
  { g: "Oxcarbazepine", fr: "Oxcarbazépine", en: "Oxcarbazepine", st: "300 mg", form: "comprimé", route: "orale", tc: "Anticonvulsivant", bucket: "NEUROLOGY", enAl: ["Trileptal"], frAl: ["Trileptal", "oxcarbazépine"] },
  { g: "Phenytoin", fr: "Phénytoïne", en: "Phenytoin", st: "125 mg", form: "gélule", route: "orale", tc: "Anticonvulsivant", bucket: "NEUROLOGY", mode: "ENRICH", code: "PHENYTOIN_100_MG_COMPRIME_ORALE", enAl: ["Dilantin 125"], frAl: ["Dilantin 125", "phénytoïne 125"], gov: { isHighAlert: true } },
  { g: "Levetiracetam", fr: "Lévétiracétam", en: "Levetiracetam", st: "750 mg", form: "comprimé", route: "orale", tc: "Anticonvulsivant", bucket: "NEUROLOGY", enAl: ["Keppra 750"], frAl: ["Keppra 750", "lévétiracétam 750"] },
  { g: "Gabapentin", fr: "Gabapentine", en: "Gabapentin", st: "600 mg", form: "comprimé", route: "orale", tc: "Anticonvulsivant", bucket: "NEUROLOGY", enAl: ["Neurontin 600"], frAl: ["Neurontin 600", "gabapentine 600"] },
  { g: "Baclofen", fr: "Baclofène", en: "Baclofen", st: "10 mg", form: "comprimé", route: "orale", tc: "Myorelaxant", bucket: "NEUROLOGY", enAl: ["Lioresal"], frAl: ["Lioresal", "baclofène"] },
  { g: "Zonisamide", fr: "Zonisamide", en: "Zonisamide", st: "100 mg", form: "gélule", route: "orale", tc: "Anticonvulsivant", bucket: "NEUROLOGY", enAl: ["Zonegran"], frAl: ["Zonegran", "zonisamide"] },
  { g: "Clonazepam", fr: "Clonazépam", en: "Clonazepam", st: "0.5 mg", form: "comprimé", route: "orale", tc: "Anticonvulsivant", bucket: "NEUROLOGY", enAl: ["Klonopin"], frAl: ["Klonopin", "clonazépam"], gov: { isControlled: true, controlledSchedule: "IV", isHighAlert: true } },

  // —— PSYCHIATRY (18) ——
  { g: "Sertraline", fr: "Sertraline", en: "Sertraline", st: "50 mg", form: "comprimé", route: "orale", tc: "ISRS", bucket: "PSYCHIATRY", enAl: ["Zoloft"], frAl: ["Zoloft", "sertraline"] },
  { g: "Fluoxetine", fr: "Fluoxétine", en: "Fluoxetine", st: "20 mg", form: "gélule", route: "orale", tc: "ISRS", bucket: "PSYCHIATRY", enAl: ["Prozac"], frAl: ["Prozac", "fluoxétine"] },
  { g: "Escitalopram", fr: "Escitalopram", en: "Escitalopram", st: "10 mg", form: "comprimé", route: "orale", tc: "ISRS", bucket: "PSYCHIATRY", enAl: ["Lexapro"], frAl: ["Lexapro", "escitalopram"] },
  { g: "Citalopram", fr: "Citalopram", en: "Citalopram", st: "20 mg", form: "comprimé", route: "orale", tc: "ISRS", bucket: "PSYCHIATRY", enAl: ["Celexa"], frAl: ["Celexa", "citalopram"] },
  { g: "Paroxetine", fr: "Paroxétine", en: "Paroxetine", st: "20 mg", form: "comprimé", route: "orale", tc: "ISRS", bucket: "PSYCHIATRY", enAl: ["Paxil"], frAl: ["Paxil", "paroxétine"] },
  { g: "Venlafaxine", fr: "Venlafaxine", en: "Venlafaxine", st: "75 mg", form: "comprimé", route: "orale", tc: "IRSN", bucket: "PSYCHIATRY", enAl: ["Effexor"], frAl: ["Effexor", "venlafaxine"] },
  { g: "Duloxetine", fr: "Duloxétine", en: "Duloxetine", st: "30 mg", form: "gélule", route: "orale", tc: "IRSN", bucket: "PSYCHIATRY", enAl: ["Cymbalta"], frAl: ["Cymbalta", "duloxétine"] },
  { g: "Bupropion", fr: "Bupropion", en: "Bupropion", st: "150 mg", form: "comprimé", route: "orale", tc: "Antidépresseur", bucket: "PSYCHIATRY", enAl: ["Wellbutrin XL"], frAl: ["Wellbutrin", "bupropion"] },
  { g: "Mirtazapine", fr: "Mirtazapine", en: "Mirtazapine", st: "15 mg", form: "comprimé", route: "orale", tc: "Antidépresseur", bucket: "PSYCHIATRY", enAl: ["Remeron"], frAl: ["Remeron", "mirtazapine"] },
  { g: "Olanzapine", fr: "Olanzapine", en: "Olanzapine", st: "5 mg", form: "comprimé", route: "orale", tc: "Antipsychotique", bucket: "PSYCHIATRY", enAl: ["Zyprexa"], frAl: ["Zyprexa", "olanzapine"], gov: { requiresSpecialtyReview: true } },
  { g: "Risperidone", fr: "Rispéridone", en: "Risperidone", st: "1 mg", form: "comprimé", route: "orale", tc: "Antipsychotique", bucket: "PSYCHIATRY", enAl: ["Risperdal"], frAl: ["Risperdal", "rispéridone"], gov: { requiresSpecialtyReview: true } },
  { g: "Haloperidol", fr: "Halopéridol", en: "Haloperidol", st: "2 mg", form: "comprimé", route: "orale", tc: "Antipsychotique", bucket: "PSYCHIATRY", enAl: ["Haldol oral"], frAl: ["Haldol comprimé", "halopéridol oral"] },
  { g: "Clozapine", fr: "Clozapine", en: "Clozapine", st: "25 mg", form: "comprimé", route: "orale", tc: "Antipsychotique", bucket: "PSYCHIATRY", enAl: ["Clozaril"], frAl: ["Clozaril", "clozapine"], gov: { isHighAlert: true, requiresSpecialtyReview: true, requiresPharmacyVerification: true } },
  { g: "Lorazepam", fr: "Lorazépam", en: "Lorazepam", st: "0.5 mg", form: "comprimé", route: "orale", tc: "Anxiolytique", bucket: "PSYCHIATRY", enAl: ["Ativan 0.5"], frAl: ["Ativan 0.5", "lorazépam 0.5"], gov: { isControlled: true, controlledSchedule: "IV", isHighAlert: true } },
  { g: "Methylphenidate", fr: "Méthylphénidate", en: "Methylphenidate", st: "10 mg", form: "comprimé", route: "orale", tc: "Psychostimulant", bucket: "PSYCHIATRY", enAl: ["Ritalin"], frAl: ["Ritalin", "méthylphénidate"], gov: { isControlled: true, controlledSchedule: "II", requiresSpecialtyReview: true, isHighAlert: true } },
  { g: "Quetiapine", fr: "Quétiapine", en: "Quetiapine", st: "100 mg", form: "comprimé", route: "orale", tc: "Antipsychotique", bucket: "PSYCHIATRY", enAl: ["Seroquel 100"], frAl: ["Seroquel 100", "quétiapine 100"] },
  { g: "Aripiprazole", fr: "Aripiprazole", en: "Aripiprazole", st: "10 mg", form: "comprimé", route: "orale", tc: "Antipsychotique", bucket: "PSYCHIATRY", enAl: ["Abilify 10"], frAl: ["Abilify 10", "aripiprazole 10"] },
  { g: "Lithium carbonate", fr: "Carbonate de lithium", en: "Lithium carbonate", st: "450 mg", form: "comprimé", route: "orale", tc: "Stabilisateur de l'humeur", bucket: "PSYCHIATRY", enAl: ["Lithobid 450"], frAl: ["Lithobid 450", "lithium 450"], gov: { isHighAlert: true, requiresSpecialtyReview: true } },
  { g: "Chlorpromazine", fr: "Chlorpromazine", en: "Chlorpromazine", st: "25 mg", form: "comprimé", route: "orale", tc: "Antipsychotique", bucket: "PSYCHIATRY", enAl: ["Thorazine"], frAl: ["Thorazine", "chlorpromazine"], gov: { requiresSpecialtyReview: true } },
  { g: "Fluvoxamine", fr: "Fluvoxamine", en: "Fluvoxamine", st: "50 mg", form: "comprimé", route: "orale", tc: "ISRS", bucket: "PSYCHIATRY", enAl: ["Luvox"], frAl: ["Luvox", "fluvoxamine"] },

  // —— PULMONOLOGY (12) ——
  { g: "Budesonide formoterol", fr: "Budésonide formotérol", en: "Budesonide formoterol", st: "160/4.5 mcg", form: "inhalateur", route: "inhalée", tc: "Antiasthmatique", bucket: "PULMONOLOGY", enAl: ["Symbicort"], frAl: ["Symbicort", "budésonide formotérol"], adm: "INHALATION" },
  { g: "Fluticasone umeclidinium vilanterol", fr: "Fluticasone uméclidinium vilantérol", en: "Fluticasone umeclidinium vilanterol", st: "100/62.5/25 mcg", form: "inhalateur", route: "inhalée", tc: "BPCO", bucket: "PULMONOLOGY", enAl: ["Trelegy Ellipta"], frAl: ["Trelegy Ellipta"], adm: "INHALATION" },
  { g: "Tiotropium", fr: "Tiotropium", en: "Tiotropium", st: "18 mcg", form: "inhalateur", route: "inhalée", tc: "Anticholinergique inhalé", bucket: "PULMONOLOGY", enAl: ["Spiriva HandiHaler"], frAl: ["Spiriva", "tiotropium"], adm: "INHALATION" },
  { g: "Ipratropium albuterol", fr: "Ipratropium salbutamol", en: "Ipratropium albuterol", st: "0.5/3 mg", form: "solution de nébulisation", route: "inhalée", tc: "Bronchodilatateur", bucket: "PULMONOLOGY", enAl: ["Combivent", "DuoNeb"], frAl: ["Combivent", "ipratropium salbutamol"], adm: "INHALATION" },
  { g: "Acetylcysteine", fr: "Acétylcystéine", en: "Acetylcysteine", st: "20%", form: "solution de nébulisation", route: "inhalée", tc: "Mucolytique", bucket: "PULMONOLOGY", enAl: ["Mucomyst", "NAC neb"], frAl: ["Mucomyst", "acétylcystéine"], adm: "INHALATION" },
  { g: "Sodium chloride", fr: "Chlorure de sodium hypertonique", en: "Hypertonic saline", st: "3%", form: "solution de nébulisation", route: "inhalée", tc: "Mucolytique", bucket: "PULMONOLOGY", enAl: ["hypertonic saline neb", "HTS 3%"], frAl: ["saline hypertonique", "nébulisation saline 3%"], adm: "INHALATION" },
  { g: "Theophylline", fr: "Théophylline", en: "Theophylline", st: "300 mg", form: "comprimé", route: "orale", tc: "Bronchodilatateur", bucket: "PULMONOLOGY", enAl: ["Theo-24"], frAl: ["Theo-24", "théophylline"], gov: { isHighAlert: true } },
  { g: "Roflumilast", fr: "Roflumilast", en: "Roflumilast", st: "500 mcg", form: "comprimé", route: "orale", tc: "BPCO", bucket: "PULMONOLOGY", enAl: ["Daliresp"], frAl: ["Daliresp", "roflumilast"] },
  { g: "Cromolyn sodium", fr: "Cromoglycate de sodium", en: "Cromolyn sodium", st: "10 mg/2 mL", form: "solution de nébulisation", route: "inhalée", tc: "Antiasthmatique", bucket: "PULMONOLOGY", enAl: ["Intal neb"], frAl: ["Intal", "cromoglycate"], adm: "INHALATION" },
  { g: "Fluticasone salmeterol", fr: "Fluticasone salmétérol", en: "Fluticasone salmeterol", st: "100/50 mcg", form: "inhalateur", route: "inhalée", tc: "Antiasthmatique", bucket: "PULMONOLOGY", enAl: ["Advair 100/50"], frAl: ["Advair 100/50", "fluticasone salmétérol 100"], adm: "INHALATION" },
  { g: "Budesonide", fr: "Budésonide", en: "Budesonide", st: "0.5 mg/2 mL", form: "suspension pour nébulisation", route: "inhalée", tc: "Corticoïde inhalé", bucket: "PULMONOLOGY", enAl: ["Pulmicort respules"], frAl: ["Pulmicort nébules", "budésonide nébulisation"], adm: "INHALATION" },
  { g: "Fluticasone", fr: "Fluticasone", en: "Fluticasone", st: "50 mcg/dose", form: "spray nasal", route: "nasale", tc: "Corticoïde nasal", bucket: "PULMONOLOGY", enAl: ["Flonase"], frAl: ["Flonase", "fluticasone nasal"], adm: "INHALATION" },
  { g: "Glycopyrrolate", fr: "Glycopyrronium", en: "Glycopyrrolate", st: "15 mcg", form: "inhalateur", route: "inhalée", tc: "Anticholinergique inhalé", bucket: "PULMONOLOGY", enAl: ["Seebri", "glycopyrrolate inhaler"], frAl: ["Seebri", "glycopyrronium"], adm: "INHALATION" },
  { g: "Dexamethasone", fr: "Dexaméthasone", en: "Dexamethasone", st: "0.4 mg/2 mL", form: "solution de nébulisation", route: "inhalée", tc: "Corticoïde", bucket: "PULMONOLOGY", enAl: ["dex neb"], frAl: ["dexaméthasone néb"], adm: "INHALATION" },

  // —— ENDOCRINOLOGY (14) ——
  { g: "Insulin detemir", fr: "Insuline detemir", en: "Insulin detemir", st: "100 UI/mL", form: "injectable", route: "sous-cutanée", tc: "Antidiabétique", bucket: "ENDOCRINOLOGY", enAl: ["Levemir", "detemir"], frAl: ["Levemir", "insuline detemir"], adm: "SUBCUTANEOUS", gov: { isHighAlert: true, isInsulin: true } },
  { g: "Insulin aspart", fr: "Insuline aspart", en: "Insulin aspart", st: "100 UI/mL", form: "injectable", route: "sous-cutanée", tc: "Antidiabétique", bucket: "ENDOCRINOLOGY", enAl: ["NovoLog", "aspart"], frAl: ["NovoLog", "insuline aspart"], adm: "SUBCUTANEOUS", gov: { isHighAlert: true, isInsulin: true } },
  { g: "Semaglutide", fr: "Sémaglutide", en: "Semaglutide", st: "0.25 mg", form: "injectable", route: "sous-cutanée", tc: "GLP-1", bucket: "ENDOCRINOLOGY", enAl: ["Ozempic", "Wegovy starter"], frAl: ["Ozempic", "sémaglutide"], adm: "SUBCUTANEOUS", gov: { isHighAlert: true } },
  { g: "Tirzepatide", fr: "Tirzépatide", en: "Tirzepatide", st: "2.5 mg", form: "injectable", route: "sous-cutanée", tc: "GLP-1/GIP", bucket: "ENDOCRINOLOGY", enAl: ["Mounjaro"], frAl: ["Mounjaro", "tirzépatide"], adm: "SUBCUTANEOUS", gov: { isHighAlert: true } },
  { g: "Empagliflozin", fr: "Empagliflozine", en: "Empagliflozin", st: "10 mg", form: "comprimé", route: "orale", tc: "SGLT2", bucket: "ENDOCRINOLOGY", enAl: ["Jardiance"], frAl: ["Jardiance", "empagliflozine"] },
  { g: "Dapagliflozin", fr: "Dapagliflozine", en: "Dapagliflozin", st: "10 mg", form: "comprimé", route: "orale", tc: "SGLT2", bucket: "ENDOCRINOLOGY", enAl: ["Farxiga"], frAl: ["Farxiga", "dapagliflozine"] },
  { g: "Canagliflozin", fr: "Canagliflozine", en: "Canagliflozin", st: "100 mg", form: "comprimé", route: "orale", tc: "SGLT2", bucket: "ENDOCRINOLOGY", enAl: ["Invokana"], frAl: ["Invokana", "canagliflozine"] },
  { g: "Repaglinide", fr: "Répaglinide", en: "Repaglinide", st: "1 mg", form: "comprimé", route: "orale", tc: "Antidiabétique", bucket: "ENDOCRINOLOGY", enAl: ["Prandin"], frAl: ["Prandin", "répaglinide"], gov: { isHighAlert: true } },
  { g: "Glipizide", fr: "Glipizide", en: "Glipizide", st: "5 mg", form: "comprimé", route: "orale", tc: "Sulfonylurée", bucket: "ENDOCRINOLOGY", enAl: ["Glucotrol"], frAl: ["Glucotrol", "glipizide"], gov: { isHighAlert: true } },
  { g: "Liraglutide", fr: "Liraglutide", en: "Liraglutide", st: "6 mg/mL", form: "injectable", route: "sous-cutanée", tc: "GLP-1", bucket: "ENDOCRINOLOGY", enAl: ["Victoza"], frAl: ["Victoza", "liraglutide"], adm: "SUBCUTANEOUS" },
  { g: "Metformin", fr: "Metformine", en: "Metformin", st: "500 mg", form: "comprimé", route: "orale", tc: "Antidiabétique", bucket: "ENDOCRINOLOGY", enAl: ["Glucophage XR planning"], frAl: ["Glucophage", "metformine 500"] },
  { g: "Insulin glargine", fr: "Insuline glargine", en: "Insulin glargine", st: "300 UI/mL", form: "injectable", route: "sous-cutanée", tc: "Antidiabétique", bucket: "ENDOCRINOLOGY", enAl: ["Toujeo", "glargine U300"], frAl: ["Toujeo", "glargine 300"], adm: "SUBCUTANEOUS", gov: { isHighAlert: true, isInsulin: true } },
  { g: "Insulin lispro", fr: "Insuline lispro", en: "Insulin lispro", st: "200 UI/mL", form: "injectable", route: "sous-cutanée", tc: "Antidiabétique", bucket: "ENDOCRINOLOGY", enAl: ["Humalog U200", "lispro U200"], frAl: ["Humalog U200", "lispro concentrée"], adm: "SUBCUTANEOUS", gov: { isHighAlert: true, isInsulin: true } },
  { g: "Glimepiride", fr: "Glimepiride", en: "Glimepiride", st: "4 mg", form: "comprimé", route: "orale", tc: "Sulfonylurée", bucket: "ENDOCRINOLOGY", enAl: ["Amaryl 4"], frAl: ["Amaryl 4", "glimepiride 4"], gov: { isHighAlert: true } },
  { g: "Pioglitazone", fr: "Pioglitazone", en: "Pioglitazone", st: "30 mg", form: "comprimé", route: "orale", tc: "Antidiabétique", bucket: "ENDOCRINOLOGY", enAl: ["Actos 30"], frAl: ["Actos 30", "pioglitazone 30"] },
  { g: "Sitagliptin", fr: "Sitagliptine", en: "Sitagliptin", st: "50 mg", form: "comprimé", route: "orale", tc: "Antidiabétique", bucket: "ENDOCRINOLOGY", enAl: ["Januvia 50"], frAl: ["Januvia 50", "sitagliptine 50"] },
  { g: "Glyburide", fr: "Glyburide", en: "Glyburide", st: "2.5 mg", form: "comprimé", route: "orale", tc: "Sulfonylurée", bucket: "ENDOCRINOLOGY", enAl: ["Diabeta 2.5"], frAl: ["Diabeta 2.5", "glyburide 2.5"], gov: { isHighAlert: true } },
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
    isDmard: gov.isDmard ?? false,
    isBiologic: gov.isBiologic ?? false,
    isInsulin: gov.isInsulin ?? false,
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
  const seq = String(600000 + idx).padStart(9, "0");
  const ndc11 = `00000${seq}`.slice(-11);
  const ndcDisplay = `${ndc11.slice(0, 5)}-${ndc11.slice(5, 9)}-${ndc11.slice(9)}`;
  const injectable =
    row.form.includes("injectable") ||
    row.route.includes("intraveineuse") ||
    row.route.includes("sous-cutanée");
  return {
    hcpcs: "J3490",
    description: `Wave3 ${row.g} ${row.st}`,
    billingUnitType: injectable ? "mg" : "tablet",
    ndc11,
    ndcDisplay,
  };
}

const priorCodes = await loadPriorCodes();
const { buildMedicationSearchTokens } = await loadSearchBuilder();

const entries = [];
const skipped = [];

for (const r of ROWS) {
  const catalogCode = r.code ?? deriveCode(r.g, r.st, r.form, r.route);
  if (priorCodes.has(catalogCode) && r.mode !== "ENRICH") {
    skipped.push({ catalogCode, reason: "overlaps W1/W2" });
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
    administrationType:
      r.adm ??
      (r.form.includes("injectable")
        ? "INJECTION"
        : r.form.includes("inhal") || r.form.includes("nébul")
          ? "INHALATION"
          : r.route === "topique"
            ? "TOPICAL"
            : "ORAL"),
    billingClass:
      r.form.includes("injectable") || r.route.includes("intraveineuse") ? "THERAPEUTIC" : "DRUG_SUPPLY",
    _billing: billingFor(r, entries.length + 1),
  });
}

const seen = new Set();
for (const e of entries) {
  if (seen.has(e.catalogCode)) throw new Error(`duplicate ${e.catalogCode}`);
  seen.add(e.catalogCode);
}

console.log(`Generated ${entries.length} wave3 entries (skipped ${skipped.length} W1/W2 overlaps)`);
if (entries.length < 100) {
  console.warn(`[wave3-gen] WARNING: below 100 entries (${entries.length})`);
}
if (skipped.length) console.log("Skipped:", skipped.map((s) => s.catalogCode).join(", "));

const formularyTs = `/**
 * M1.7B — Enterprise Formulary Wave 3 manifest (auto-generated — edit ROWS in generate-wave3-manifest.mjs).
 */

import type { EnterpriseWave3FormularyEntry } from "./enterpriseWave3Types.js";

export const ENTERPRISE_WAVE3_FORMULARY_MANIFEST: EnterpriseWave3FormularyEntry[] = ${JSON.stringify(
  entries.map(({ _billing, ...e }) => e),
  null,
  2
)};

export const ENTERPRISE_WAVE3_FORMULARY_BY_CODE: Record<string, EnterpriseWave3FormularyEntry> =
  Object.fromEntries(ENTERPRISE_WAVE3_FORMULARY_MANIFEST.map((e) => [e.catalogCode, e]));

export const ENTERPRISE_WAVE3_FORMULARY_VERSION = "M1.7B" as const;
`;

const billingTs = `/**
 * M1.7B — Enterprise Wave 3 billing manifest (aligned to formulary order).
 */

import { ENTERPRISE_WAVE3_FORMULARY_MANIFEST } from "./enterpriseWave3FormularyManifest.js";
import type { EnterpriseWave3BillingEntry } from "./enterpriseWave3Types.js";

const BILLING_SPECS = ${JSON.stringify(
  entries.map((e) => ({ catalogCode: e.catalogCode, ...e._billing })),
  null,
  2
)};

if (BILLING_SPECS.length !== ENTERPRISE_WAVE3_FORMULARY_MANIFEST.length) {
  throw new Error(
    \`[wave3-billing] spec count \${BILLING_SPECS.length} != formulary \${ENTERPRISE_WAVE3_FORMULARY_MANIFEST.length}\`
  );
}

export const ENTERPRISE_WAVE3_BILLING_MANIFEST: EnterpriseWave3BillingEntry[] = BILLING_SPECS;

export const ENTERPRISE_WAVE3_BILLING_BY_CODE: Record<string, EnterpriseWave3BillingEntry> =
  Object.fromEntries(ENTERPRISE_WAVE3_BILLING_MANIFEST.map((e) => [e.catalogCode, e]));
`;

writeFileSync(join(medDir, "enterpriseWave3FormularyManifest.ts"), formularyTs);
writeFileSync(join(medDir, "enterpriseWave3BillingManifest.ts"), billingTs);
console.log("Wrote enterpriseWave3FormularyManifest.ts and enterpriseWave3BillingManifest.ts");
