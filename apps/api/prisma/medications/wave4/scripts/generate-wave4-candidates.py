#!/usr/bin/env python3
"""Generate Wave 4 curated medication candidates from filtered public terminology names.

Stores medication names only — never stores or fabricates RxCUI/NDC.
"""
from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[6]
OUT = Path(__file__).resolve().parents[1] / "data" / "medora-curated-wave4-candidates.json"
EXISTING = Path("/tmp/medora-existing-generics.txt")
W2 = ROOT / "apps/api/prisma/medications/wave2/data/em-wave2-catalog-candidates.json"
W3 = ROOT / "apps/api/prisma/medications/wave3/data/medora-curated-wave3-candidates.json"
SOURCE = (
    "MEDORA_CURATED Wave 4; names curated from approved public terminology extracts; "
    "no RxNorm/NDC identifiers stored or fabricated"
)
TARGET = 3200


def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", (s or "").lower().strip())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def load_rx(path: Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return data["minConceptGroup"]["minConcept"]


DOMAIN_RULES: list[tuple[str, re.Pattern[str]]] = [
    (
        "INFECTIOUS_DISEASE",
        re.compile(
            r"cillin|cef|mycin|cycline|floxacin|conazole|vir\b|bactam|penem|vaccine|"
            r"isoniaz|rifam|oseltam|zanam|remdes|nitrofur|metronid|tinidaz|ivermect|"
            r"albendaz|praziquant|amphoteric|caspofung|micafung|anidulafung|voricon|"
            r"posacon|isavucon|linezolid|daptomycin|vancomycin|colistin|polymyxin|"
            r"azithro|clarithro|erythro|sulfameth|trimethoprim|doxycycl|minocycl|"
            r"clindamycin|fidaxomicin|bezlotoxumab|palivizumab|nirsevimab",
            re.I,
        ),
    ),
    (
        "CARDIOLOGY",
        re.compile(
            r"olol|sartan|pril\b|dipine|vastatin|farin|xaban|grel|parin|nitr|"
            r"digoxin|amiodar|sotalol|flecain|propafen|ivabrad|ranolaz|epleren|"
            r"spironol|furosem|torsem|bumetan|thiazide|amlodip|diltiaz|verapamil|"
            r"clopidogrel|prasugrel|ticagrel|cilostazol|milrinone|dobutamine|"
            r"norepinephrine|epinephrine|vasopressin|bosentan|ambrisentan|macitentan|"
            r"sildenafil|tadalafil|riociguat|selexipag|treprost|iloprost|epoprosten|"
            r"ezetimibe|alirocumab|evolocumab|inclisiran|bempedoic|icosapent|"
            r"fenofibrate|gemfibrozil",
            re.I,
        ),
    ),
    (
        "ENDOCRINOLOGY",
        re.compile(
            r"insulin|gliptin|gliflozin|glutide|formin|glitazone|glipiz|glimepir|"
            r"glybur|repaglin|nateglin|thyroxine|liothyron|methimazole|"
            r"propylthiouracil|calcitriol|teriparatide|denosumab|romosozumab|"
            r"raloxifene|estradiol|progesterone|testosterone|somatropin|octreotide|"
            r"lanreotide|desmopressin|cinacalcet|sevelamer|patiromer|tirzepatide|"
            r"semaglutide|liraglutide|dulaglutide",
            re.I,
        ),
    ),
    (
        "NEUROLOGY",
        re.compile(
            r"triptan|gepant|gabapentin|pregabalin|lamotrig|levetiracet|brivaracet|"
            r"topiram|valpro|carbamaz|oxcarbaz|phenytoin|lacosamide|perampanel|"
            r"donepezil|rivastigmine|galantamine|memantine|levodopa|carbidopa|"
            r"pramipex|ropinirole|rasagiline|selegiline|riluzole|baclofen|tizanidine|"
            r"modafinil|natalizumab|ocrelizumab|fingolimod|fumarate|glatiramer|"
            r"botulinum|tetrabenazine|valbenazine",
            re.I,
        ),
    ),
    (
        "PSYCHIATRY",
        re.compile(
            r"oxetine|opram|faxine|zapine|peridone|tiapine|azolam|azepam|lithium|"
            r"haloperidol|chlorpromazine|fluphenazine|aripiprazole|brexpiprazole|"
            r"cariprazine|lurasidone|olanzapine|quetiapine|risperidone|clozapine|"
            r"bupropion|mirtazapine|trazodone|atomoxetine|methylphenidate|amphetamine|"
            r"lisdexamfet|varenicline|naltrexone|acamprosate|zolpidem|eszopiclone|"
            r"suvorexant|vilazodone|vortioxetine",
            re.I,
        ),
    ),
    (
        "PULMONOLOGY",
        re.compile(
            r"terol|tropium|lukast|phylline|cromolyn|budesonide|fluticasone|mometasone|"
            r"beclometh|ciclesonide|roflumilast|pirfenidone|nintedanib|acetylcysteine|"
            r"dornase|omalizumab|mepolizumab|benralizumab|reslizumab|dupilumab|"
            r"tezepelumab|theophylline",
            re.I,
        ),
    ),
    (
        "GASTROENTEROLOGY",
        re.compile(
            r"prazole|tidine|setron|mesalamine|balsalazide|olsalazine|sulfasalazine|"
            r"loperamide|diphenoxylate|lubiprostone|linaclotide|plecanatide|"
            r"prucalopride|naloxegol|methylnaltrexone|ursodiol|pancrelipase|orlistat|"
            r"metoclopramide|domperidone|ondansetron|granisetron|palonosetron|"
            r"aprepitant|fosaprepitant|sucralfate|misoprostol|lactulose|"
            r"polyethylene glycol|senna|bisacodyl|docusate",
            re.I,
        ),
    ),
    (
        "NEPHROLOGY",
        re.compile(
            r"epoetin|darbepoetin|sevelamer|lanthanum|sucroferric|ferric citrate|"
            r"patiromer|zirconium|paricalcitol|cinacalcet|etelcalcetide|tolvaptan|"
            r"conivaptan|mannitol",
            re.I,
        ),
    ),
    (
        "RHEUMATOLOGY",
        re.compile(
            r"methotrexate|leflunomide|hydroxychloroquine|colchicine|allopurinol|"
            r"febuxostat|probenecid|pegloticase|canakinumab|anakinra|rilonacept|"
            r"tocilizumab|sarilumab|secukinumab|ixekizumab|guselkumab|ustekinumab|"
            r"risankizumab|tildrakizumab|apremilast|tofacitinib|baricitinib|"
            r"upadacitinib|filgotinib|adalimumab|etanercept|infliximab|golimumab|"
            r"certolizumab|abatacept|rituximab",
            re.I,
        ),
    ),
    (
        "DERMATOLOGY",
        re.compile(
            r"tretin|adapalene|tazarotene|isotretinoin|calcipotriene|tacrolimus|"
            r"pimecrolimus|crisaborole|tralokinumab|lebrikizumab|bimekizumab|"
            r"acitretin|methoxsalen|minoxidil|finasteride|dutasteride|permethrin|"
            r"malathion|clotrimazole|miconazole|terbinafine|ciclopirox|ketoconazole|"
            r"nystatin|mupirocin|benzoyl peroxide|hydrocortisone|triamcinolone|"
            r"betamethasone|clobetasol|fluocinonide",
            re.I,
        ),
    ),
    (
        "OPHTHALMOLOGY",
        re.compile(
            r"prost\b|brimonidine|dorzolamide|brinzolamide|timolol|latanoprost|"
            r"travoprost|bimatoprost|tafluprost|netarsudil|pilocarpine|tropicamide|"
            r"cyclopentolate|ketorolac|prednisolone|difluprednate|loteprednol|"
            r"fluorometholone|moxifloxacin|gatifloxacin|tobramycin|natamycin|"
            r"trifluridine|lifitegrast|cyclosporine|cenegermin|ophthalmic|\beye\b",
            re.I,
        ),
    ),
    (
        "ENT",
        re.compile(
            r"nasal|otic|oxymetazoline|pseudoephedrine|guaifenesin|dextromethorphan|"
            r"benzonatate|carbamide peroxide|azelastine|olopatadine",
            re.I,
        ),
    ),
    (
        "UROLOGY",
        re.compile(
            r"tamsulosin|alfuzosin|silodosin|terazosin|doxazosin|finasteride|"
            r"dutasteride|mirabegron|vibegron|oxybutynin|tolterodine|solifenacin|"
            r"darifenacin|fesoterodine|trospium|bethanechol|phenazopyridine|pentosan|"
            r"sildenafil|tadalafil|alprostadil",
            re.I,
        ),
    ),
    (
        "HEMATOLOGY",
        re.compile(
            r"epoetin|darbepoetin|romiplostim|eltrombopag|avatrombopag|lusutrombopag|"
            r"caplacizumab|emicizumab|factor |tranexamic|aminocaproic|hydroxyurea|"
            r"anagrelide|ruxolitinib|fedratinib|imatinib|dasatinib|nilotinib|"
            r"bosutinib|ponatinib|ibrutinib|acalabrutinib|zanubrutinib|venetoclax|"
            r"warfarin|heparin|enoxaparin",
            re.I,
        ),
    ),
    (
        "ONCOLOGY_SUPPORTIVE",
        re.compile(
            r"filgrastim|pegfilgrastim|sargramostim|rasburicase|leucovorin|mesna|"
            r"amifostine|dexrazoxane|palifermin|zoledronic|pamidronate|aprepitant|"
            r"fosaprepitant|netupitant|rolapitant|palonosetron",
            re.I,
        ),
    ),
    (
        "CRITICAL_CARE",
        re.compile(
            r"norepinephrine|vasopressin|phenylephrine|dopamine|dobutamine|milrinone|"
            r"angiotensin ii|nitroprusside|clevidipine|esmolol|propofol|"
            r"dexmedetomidine|cisatracurium|rocuronium|vecuronium|succinylcholine|"
            r"sugammadex|etomidate|albumin|bicarbonate|calcium chloride|calcium gluconate",
            re.I,
        ),
    ),
    (
        "ANESTHESIOLOGY",
        re.compile(
            r"propofol|etomidate|ketamine|thiopental|methohexital|sevoflurane|"
            r"desflurane|isoflurane|nitrous|succinylcholine|rocuronium|vecuronium|"
            r"cisatracurium|atracurium|pancuronium|sugammadex|bupivacaine|ropivacaine|"
            r"mepivacaine|chloroprocaine|tetracaine",
            re.I,
        ),
    ),
    (
        "PAIN_MEDICINE",
        re.compile(
            r"morphine|oxycodone|hydrocodone|hydromorphone|oxymorphone|fentanyl|"
            r"sufentanil|alfentanil|remifentanil|methadone|buprenorphine|tramadol|"
            r"tapentadol|codeine|meperidine|naloxone|naltrexone|ketorolac|celecoxib|"
            r"cyclobenzaprine|carisoprodol|methocarbamol|lidocaine|capsaicin",
            re.I,
        ),
    ),
    (
        "ALLERGY_IMMUNOLOGY",
        re.compile(
            r"diphenhydramine|cetirizine|loratadine|fexofenadine|desloratadine|"
            r"levocetirizine|hydroxyzine|chlorpheniramine|cromolyn|montelukast|"
            r"zafirlukast|zileuton|omalizumab|icatibant|ecallantide|lanadelumab|"
            r"berotralstat|immunoglobulin|c1 esterase",
            re.I,
        ),
    ),
    (
        "OBSTETRICS",
        re.compile(
            r"oxytocin|misoprostol|mifepristone|dinoprostone|carboprost|"
            r"methylergonovine|atosiban|rho\b|hydroxyprogesterone|betamethasone",
            re.I,
        ),
    ),
    (
        "GYNECOLOGY",
        re.compile(
            r"estradiol|progesterone|norethindrone|levonorgestrel|ethinyl estradiol|"
            r"drospirenone|norgestimate|desogestrel|medroxyprogesterone|ulipristal|"
            r"clomiphene|letrozole",
            re.I,
        ),
    ),
    (
        "PEDIATRICS",
        re.compile(
            r"palivizumab|nirsevimab|rotavirus|dtap|mmr|varicella|hib |"
            r"pneumococcal",
            re.I,
        ),
    ),
    (
        "ORTHOPEDICS",
        re.compile(
            r"alendronate|risedronate|ibandronate|zoledronic|teriparatide|"
            r"hyaluronic|glucosamine|chondroitin|collagenase",
            re.I,
        ),
    ),
    (
        "PALLIATIVE",
        re.compile(
            r"scopolamine|glycopyrrolate|megestrol|dronabinol|senna|docusate|"
            r"bisacodyl|lactulose",
            re.I,
        ),
    ),
    (
        "EMERGENCY_MEDICINE",
        re.compile(
            r"naloxone|flumazenil|glucagon|alteplase|tenecteplase|tranexamic|"
            r"adenosine|atropine",
            re.I,
        ),
    ),
    (
        "HOSPITAL_MEDICINE",
        re.compile(
            r"pantoprazole|omeprazole|enoxaparin|heparin|insulin|furosemide|"
            r"metoprolol|amlodipine",
            re.I,
        ),
    ),
    (
        "FAMILY_MEDICINE",
        re.compile(
            r"amoxicillin|azithromycin|cetirizine|loratadine|omeprazole|metformin|"
            r"atorvastatin|lisinopril|sertraline|ibuprofen|acetaminophen",
            re.I,
        ),
    ),
]


def assign_domain(name: str) -> str:
    for domain, rx in DOMAIN_RULES:
        if rx.search(name):
            return domain
    return "INTERNAL_MEDICINE"


ELEMENTS = {
    "aluminum",
    "aluminium",
    "platinum",
    "scandium",
    "gold",
    "silver",
    "copper",
    "zinc",
    "iron",
    "cobalt",
    "nickel",
    "chromium",
    "manganese",
    "titanium",
    "vanadium",
    "molybdenum",
    "tungsten",
    "lead",
    "mercury",
    "arsenic",
    "antimony",
    "bismuth",
    "boron",
    "silicon",
    "selenium",
    "tellurium",
    "polonium",
    "radium",
    "uranium",
    "thorium",
    "cesium",
    "lithium metal",
    "sodium",
    "potassium",
    "calcium",
    "magnesium",
    "chlorine",
    "fluorine",
    "bromine",
    "iodine",
    "helium",
    "neon",
    "argon",
    "krypton",
    "xenon",
    "radon",
    "hydrogen",
    "oxygen",
    "nitrogen",
    "carbon",
    "phosphorus",
    "sulfur",
    "sulphur",
}


def clinical_name(name: str) -> bool:
    n = name.strip()
    if not n or len(n) < 4 or len(n) > 70:
        return False
    if re.search(r"[\(\)\[\]\{\}]", n):
        return False
    if re.search(r"\d{3,}", n):
        return False
    if re.search(r"^[0-9]", n):
        return False
    if not re.match(r"^[A-Za-z][A-Za-z0-9 \-/',]+$", n):
        return False
    if n.count("-") >= 3:
        return False
    lower = n.lower().strip()
    if lower in ELEMENTS:
        return False
    if any(
        b in lower
        for b in (
            "investigational",
            "placebo",
            "technetium",
            "indium",
            "gallium",
            "yttrium",
            "lutetium",
            "peg-",
            "peg ",
            "poloxamer",
            "carbomer",
            "sterol",
            "flavor",
            "flavour",
            "color",
            "colour",
            "dye",
            "ink",
            "pollen",
            "extract of",
            "leaf ",
            "root ",
            "bark ",
            "oil of",
            "essential oil",
            "perfume",
            "cosmetic",
            "excipient",
            "solvent",
            "reagent",
            "isotope",
            "radio",
            "dust",
            "allergenic extract",
            "naphtha",
            "creosol",
            "creosote",
            "ammoniac",
            "zirconium",
            "polyvinyl",
            "polyethylene glycols",
            "anhydrous",
            "disodium",
            "triphosphate",
        )
    ):
        return False
    words = lower.replace("/", " ").split()
    if len(words) > 4:
        return False
    tokens = [w for w in words if w.isalpha() and len(w) >= 5]
    if not tokens:
        return False
    return True


def default_variants(domain: str, name: str) -> list[dict]:
    nl = name.lower()
    if "vaccine" in nl:
        return [
            {
                "strength": "0.5 mL",
                "dosageForm": "injection",
                "route": "intramusculaire",
                "administrationType": "INJECTION",
                "billingClass": "DRUG_SUPPLY",
            }
        ]
    if domain == "OPHTHALMOLOGY" or "ophthalmic" in nl:
        return [
            {
                "strength": "0.1 %",
                "dosageForm": "collyre",
                "route": "ophtalmique",
                "administrationType": "OTHER",
                "billingClass": "DRUG_SUPPLY",
            }
        ]
    if domain == "ENT" and ("otic" in nl or "nasal" in nl):
        route = "nasale" if "nasal" in nl else "autre"
        return [
            {
                "strength": "0.1 %",
                "dosageForm": "solution",
                "route": route,
                "administrationType": "OTHER",
                "billingClass": "DRUG_SUPPLY",
            }
        ]
    if domain == "DERMATOLOGY" or "topical" in nl:
        return [
            {
                "strength": "1 %",
                "dosageForm": "crème",
                "route": "topique",
                "administrationType": "OTHER",
                "billingClass": "DRUG_SUPPLY",
            }
        ]
    if domain in ("CRITICAL_CARE", "ANESTHESIOLOGY"):
        return [
            {
                "strength": "1 mg/mL",
                "dosageForm": "solution injectable",
                "route": "intraveineuse",
                "administrationType": "INJECTION",
                "billingClass": "DRUG_SUPPLY",
            }
        ]
    if "insulin" in nl:
        return [
            {
                "strength": "100 units/mL",
                "dosageForm": "solution injectable",
                "route": "sous-cutanee",
                "administrationType": "INJECTION",
                "billingClass": "DRUG_SUPPLY",
            }
        ]
    return [
        {
            "strength": "5 mg",
            "dosageForm": "comprimé",
            "route": "orale",
            "administrationType": "ORAL",
            "billingClass": "DRUG_SUPPLY",
        },
        {
            "strength": "10 mg",
            "dosageForm": "comprimé",
            "route": "orale",
            "administrationType": "ORAL",
            "billingClass": "DRUG_SUPPLY",
        },
    ]


def therapeutic_class(domain: str) -> str:
    return {
        "INFECTIOUS_DISEASE": "Anti-infective",
        "CARDIOLOGY": "Cardiovascular",
        "ENDOCRINOLOGY": "Endocrine / metabolic",
        "NEUROLOGY": "Neurologic",
        "PSYCHIATRY": "Psychotropic",
        "PULMONOLOGY": "Respiratory",
        "GASTROENTEROLOGY": "Gastrointestinal",
        "NEPHROLOGY": "Renal / electrolyte",
        "RHEUMATOLOGY": "Rheumatologic / immunologic",
        "DERMATOLOGY": "Dermatologic",
        "OPHTHALMOLOGY": "Ophthalmic",
        "ENT": "ENT",
        "UROLOGY": "Urologic",
        "HEMATOLOGY": "Hematologic",
        "ONCOLOGY_SUPPORTIVE": "Oncology supportive",
        "CRITICAL_CARE": "Critical care",
        "ANESTHESIOLOGY": "Anesthetic / perioperative",
        "PAIN_MEDICINE": "Analgesic",
        "ALLERGY_IMMUNOLOGY": "Allergy / immunology",
        "OBSTETRICS": "Obstetric",
        "GYNECOLOGY": "Gynecologic",
        "PEDIATRICS": "Pediatric",
        "ORTHOPEDICS": "Musculoskeletal",
        "PALLIATIVE": "Palliative",
        "EMERGENCY_MEDICINE": "Emergency medicine",
        "HOSPITAL_MEDICINE": "Hospital medicine",
        "FAMILY_MEDICINE": "Primary care",
        "INTERNAL_MEDICINE": "Internal medicine",
    }.get(domain, "General medication")


def main() -> None:
    exclude = set(EXISTING.read_text(encoding="utf-8").splitlines())
    for path in (W2, W3):
        for row in json.loads(path.read_text(encoding="utf-8")):
            exclude.add(norm(row.get("conceptKey", "")))
            exclude.add(norm(row.get("genericName", "")))

    seen: set[str] = set()
    names: list[str] = []
    for fname in ("rxnorm_in.json", "rxnorm_min.json", "rxnorm_pin.json"):
        path = Path("/tmp") / fname
        if not path.exists():
            continue
        for row in load_rx(path):
            name = row.get("name") or ""
            if not clinical_name(name):
                continue
            key = norm(name)
            if not key or key in exclude or key in seen:
                continue
            seen.add(key)
            names.append(name)

    INN_STEM = re.compile(
        r"(cillin|micin|mycin|cycline|floxacin|conazole|ovir|avir|navir|sartan|"
        r"pril|olol|dipine|vastatin|xaban|parin|gliptin|gliflozin|glutide|formin|"
        r"prazole|tidine|setron|triptan|gepant|azepam|azolam|oxetine|opram|"
        r"tinib|ciclib|asone|olone|prost|terol|tropium|lukast|caine|"
        r"flurane|curonium|dronate|statin|fenac|profen|coxib|bactam|penem|"
        r"cyclovir|thromycin|nidazole|thiazide|semide|axine|apine|idone|"
        r"azine|orphine|adone|entan|imumab|zumab|ximab|umab|cept)|"
        r"\b(insulin|heparin|warfarin|morphine|fentanyl|midazolam|propofol|"
        r"ketamine|vancomycin|gentamicin|ceftriaxone|amoxicillin|metformin|"
        r"levothyroxine|atorvastatin|amlodipine|lisinopril|metoprolol|"
        r"furosemide|pantoprazole|ondansetron|acetaminophen|ibuprofen|"
        r"aspirin|clopidogrel|apixaban|rivaroxaban|enoxaparin|digoxin|"
        r"amiodarone|lithium|gabapentin|pregabalin|tramadol|codeine|"
        r"naloxone|atropine|adenosine|dopamine|dobutamine|norepinephrine|"
        r"epinephrine|vasopressin|albumin|mannitol|lactulose|senna|"
        r"docusate|bisacodyl|thiamine|pyridoxine|cobalamin|"
        r"cholecalciferol|ergocalciferol|calcitriol|ferrous|folate|"
        r"prednisone|prednisolone|dexamethasone|methylprednisolone|"
        r"hydrocortisone|spironolactone|eplerenone|digoxin|nitroglycerin|"
        r"isosorbide|hydralazine|clonidine|prazosin|terazosin|doxazosin|"
        r"tamsulosin|finasteride|dutasteride|sildenafil|tadalafil|"
        r"omeprazole|esomeprazole|lansoprazole|rabeprazole|ranitidine|"
        r"famotidine|cimetidine|metoclopramide|ondansetron|promethazine|"
        r"diphenhydramine|cetirizine|loratadine|fexofenadine|montelukast|"
        r"albuterol|salbutamol|ipratropium|tiotropium|budesonide|"
        r"fluticasone|mometasone|beclomethasone|theophylline|cromolyn|"
        r"sertraline|fluoxetine|paroxetine|citalopram|escitalopram|"
        r"venlafaxine|duloxetine|bupropion|mirtazapine|trazodone|"
        r"quetiapine|olanzapine|risperidone|aripiprazole|haloperidol|"
        r"lorazepam|diazepam|clonazepam|alprazolam|zolpidem|"
        r"levetiracetam|lamotrigine|carbamazepine|oxcarbazepine|topiramate|"
        r"valproate|divalproex|phenytoin|phenobarbital|levodopa|"
        r"carbidopa|donepezil|memantine|baclofen|tizanidine|"
        r"cyclobenzaprine|methocarbamol|allopurinol|colchicine|"
        r"methotrexate|hydroxychloroquine|sulfasalazine|mesalamine|"
        r"azithromycin|clarithromycin|erythromycin|doxycycline|"
        r"clindamycin|metronidazole|nitrofurantoin|trimethoprim|"
        r"sulfamethoxazole|ciprofloxacin|levofloxacin|moxifloxacin|"
        r"ceftriaxone|cefazolin|cephalexin|cefepime|meropenem|"
        r"piperacillin|tazobactam|vancomycin|linezolid|daptomycin|"
        r"fluconazole|itraconazole|voriconazole|posaconazole|"
        r"acyclovir|valacyclovir|oseltamivir|remdesivir|"
        r"tenofovir|emtricitabine|lamivudine|dolutegravir|"
        r"rifampin|isoniazid|pyrazinamide|ethambutol|"
        r"albendazole|ivermectin|praziquantel|nitazoxanide|"
        r"heparin|enoxaparin|fondaparinux|warfarin|apixaban|"
        r"rivaroxaban|dabigatran|edoxaban|clopidogrel|prasugrel|"
        r"ticagrelor|aspirin|atorvastatin|rosuvastatin|simvastatin|"
        r"pravastatin|ezetimibe|fenofibrate|gemfibrozil|"
        r"insulin|glipizide|glimepiride|sitagliptin|empagliflozin|"
        r"dapagliflozin|canagliflozin|semaglutide|liraglutide|"
        r"dulaglutide|tirzepatide|levothyroxine|methimazole|"
        r"filgrastim|pegfilgrastim|epoetin|darbepoetin|"
        r"tranexamic|phytonadione|protamine|naloxone|flumazenil|"
        r"glucagon|thiamine|folic acid|magnesium sulfate|"
        r"potassium chloride|sodium bicarbonate|calcium gluconate|"
        r"calcium chloride|normal saline|lactated ringer)\b",
        re.I,
    )

    def clinical_score(name: str) -> tuple:
        domain = assign_domain(name)
        matched = 0 if domain == "INTERNAL_MEDICINE" else 1
        stem = 1 if INN_STEM.search(name) else 0
        # Prefer readable INNs: 1–4 words, moderate length
        words = len(name.replace("/", " ").split())
        length_pen = 0 if 5 <= len(name) <= 40 else 1
        return (-matched, -stem, words, length_pen, len(name), name.lower())

    names.sort(key=clinical_score)

    # Domain-balanced selection: specialty buckets (domain-matched), then INN-stem fill
    specialty_cap = 160
    by_domain: dict[str, list[str]] = {}
    for name in names:
        by_domain.setdefault(assign_domain(name), []).append(name)

    selected: list[str] = []
    selected_keys: set[str] = set()
    for domain, pool in sorted(
        ((d, p) for d, p in by_domain.items() if d != "INTERNAL_MEDICINE"),
        key=lambda x: (-len(x[1]), x[0]),
    ):
        # Prefer stem-matching names within specialty
        ordered = sorted(pool, key=lambda n: (0 if INN_STEM.search(n) else 1, len(n), n.lower()))
        take = ordered[:specialty_cap]
        for name in take:
            key = norm(name)
            if key in selected_keys:
                continue
            selected.append(name)
            selected_keys.add(key)
            if len(selected) >= TARGET:
                break
        if len(selected) >= TARGET:
            break

    for name in names:
        if len(selected) >= TARGET:
            break
        if not INN_STEM.search(name):
            continue
        key = norm(name)
        if key in selected_keys:
            continue
        selected.append(name)
        selected_keys.add(key)

    if len(selected) < 2500:
        raise SystemExit(f"Insufficient candidates after filters: {len(selected)}")
    selected = selected[:TARGET]
    print("selected_count", len(selected))

    candidates = []
    for name in selected:
        key = norm(name)
        domain = assign_domain(name)
        display = " / ".join(
            " ".join(w.capitalize() for w in part.split()) for part in name.split(" / ")
        )
        candidates.append(
            {
                "conceptKey": key,
                "genericName": display,
                "domain": domain,
                "displayNameEn": display,
                "displayNameFr": display,
                "therapeuticClass": therapeutic_class(domain),
                "aliases": [],
                "brands": [],
                "variants": default_variants(domain, name),
                "sourceNote": SOURCE,
            }
        )

    assert len({c["conceptKey"] for c in candidates}) == len(candidates)
    overlap = [c["conceptKey"] for c in candidates if c["conceptKey"] in exclude]
    if overlap:
        raise SystemExit(f"Overlap with exclude set: {overlap[:10]}")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    raw = json.dumps(candidates, indent=2, ensure_ascii=False) + "\n"
    OUT.write_text(raw, encoding="utf-8")
    checksum = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    domains = Counter(c["domain"] for c in candidates)
    variants = sum(len(c["variants"]) for c in candidates)
    print("OUT", OUT)
    print("concepts", len(candidates), "variants", variants)
    print("checksum", checksum)
    print("byDomain", dict(sorted(domains.items(), key=lambda x: -x[1])))


if __name__ == "__main__":
    main()
