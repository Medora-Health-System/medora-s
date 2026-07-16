/**
 * Phase 19Y.16A — French ICD-10 diagnosis search aliases (search-only; catalog labels stay English).
 */

import type { SupportedLanguage } from "@/i18n/config";
import type { Icd10SearchHit } from "@/lib/chartApi";

export type FrenchDiagnosisSearchAlias = {
  frenchPhrases: readonly string[];
  englishSearchTerms: readonly string[];
};

const FRENCH_DIAGNOSIS_SEARCH_ALIASES: readonly FrenchDiagnosisSearchAlias[] = [
  {
    frenchPhrases: ["écrasement", "ecrasement", "main écrasée", "doigt écrasé", "pied écrasé"],
    englishSearchTerms: ["crush injury", "crushing injury", "crushed hand", "crushed finger", "crushed foot"],
  },
  {
    frenchPhrases: ["amputation traumatique", "doigt coupé", "orteil coupé", "doigt sectionné"],
    englishSearchTerms: ["traumatic amputation", "severed finger", "severed toe", "finger cut off", "toe cut off"],
  },
  {
    frenchPhrases: ["corps étranger", "corps etranger", "écharde", "echarde", "hameçon", "hamecon", "éclat de verre"],
    englishSearchTerms: ["foreign body", "splinter", "fishhook", "glass in skin", "retained foreign body"],
  },
  {
    frenchPhrases: ["corps étranger oeil", "corps etranger oeil", "corps étranger oreille", "corps étranger nez"],
    englishSearchTerms: ["foreign body eye", "foreign body ear", "foreign body nose"],
  },
  {
    frenchPhrases: ["brûlure", "brulure", "brûlure thermique", "ébouillantage", "ebouillantage"],
    englishSearchTerms: ["burn", "thermal burn", "scald"],
  },
  {
    frenchPhrases: ["brûlure chimique", "brulure chimique", "brûlure acide", "brulure acide", "produit alcalin"],
    englishSearchTerms: ["chemical burn", "corrosion", "acid burn", "alkali"],
  },
  {
    frenchPhrases: ["brûlure électrique", "brulure electrique", "électrocution", "electrocution", "foudre"],
    englishSearchTerms: ["electrical burn", "electric shock", "lightning"],
  },
  {
    frenchPhrases: ["inhalation de fumée", "inhalation de fumee", "brûlure des voies aériennes", "brulure des voies aeriennes"],
    englishSearchTerms: ["smoke inhalation", "inhalation injury", "airway burn"],
  },
  {
    frenchPhrases: ["gelure", "engelure", "blessure par le froid"],
    englishSearchTerms: ["frostbite", "cold injury"],
  },
  {
    frenchPhrases: ["coup de soleil"],
    englishSearchTerms: ["sunburn"],
  },
  {
    frenchPhrases: ["plaie pénétrante", "plaie penetrante", "blessure pénétrante", "blessure penetrante", "plaie par balle"],
    englishSearchTerms: ["penetrating wound", "puncture wound", "gunshot"],
  },
  {
    frenchPhrases: ["blessure par balle", "arme à feu", "arme a feu", "balle"],
    englishSearchTerms: ["gunshot", "firearm", "bullet"],
  },
  {
    frenchPhrases: ["arme blanche", "coup de couteau", "plaie par couteau"],
    englishSearchTerms: ["stab", "knife", "stab wound"],
  },
  {
    frenchPhrases: ["objet empalé", "objet empale", "empalement", "projectile retenu", "balle retenue"],
    englishSearchTerms: ["impalement", "retained projectile", "retained bullet"],
  },
  {
    frenchPhrases: [
      "lésion par explosion",
      "lesion par explosion",
      "blessure par explosion",
      "traumatisme par explosion",
      "polytraumatisme",
      "traumatisme multisystémique",
      "traumatisme multisystemique",
      "traumatisme multiple",
      "poumon de blast",
      "barotraumatisme",
      "onde de choc",
      "rupture du tympan",
      "blessure par éclat",
      "blessure par eclat",
      "blessure par shrapnel",
      "feu d'artifice",
      "feu d artifice",
      "explosion industrielle",
      "effondrement de bâtiment",
      "effondrement de batiment",
      "ensevelissement",
      "choc traumatique",
    ],
    englishSearchTerms: [
      "blast injury",
      "explosion",
      "polytrauma",
      "multiple trauma",
      "blast lung",
      "barotrauma",
      "tympanic membrane",
      "fragment",
      "shrapnel",
      "firework",
      "building collapse",
      "cave-in",
      "traumatic shock",
    ],
  },

  {
    frenchPhrases: ["douleur abdominale", "douleur au ventre", "mal au ventre", "douleur abdominal"],
    englishSearchTerms: ["abdominal pain"],
  },
  {
    frenchPhrases: ["douleur thoracique", "douleur poitrine"],
    englishSearchTerms: ["chest pain"],
  },
  {
    frenchPhrases: ["mal de tete", "cephalee", "céphalée"],
    englishSearchTerms: ["headache"],
  },
  {
    frenchPhrases: ["etourdissement", "vertige"],
    englishSearchTerms: ["dizziness"],
  },
  {
    frenchPhrases: ["essoufflement"],
    englishSearchTerms: ["shortness of breath"],
  },
  {
    frenchPhrases: ["toux"],
    englishSearchTerms: ["cough"],
  },
  {
    frenchPhrases: ["fievre", "fièvre"],
    englishSearchTerms: ["fever"],
  },
  {
    frenchPhrases: ["vomissement"],
    englishSearchTerms: ["vomiting"],
  },
  {
    frenchPhrases: ["diarrhee", "diarrhée"],
    englishSearchTerms: ["diarrhea"],
  },
  {
    frenchPhrases: ["infection urinaire"],
    englishSearchTerms: ["urinary tract infection", "UTI"],
  },
  {
    frenchPhrases: ["brulure urinaire", "brûlure urinaire"],
    englishSearchTerms: ["dysuria"],
  },
  {
    frenchPhrases: ["douleur dos"],
    englishSearchTerms: ["back pain"],
  },
  {
    frenchPhrases: ["douleur lombaire"],
    englishSearchTerms: ["low back pain"],
  },
  { frenchPhrases: ["sciatique"], englishSearchTerms: ["sciatica"] },
  { frenchPhrases: ["radiculopathie", "douleur radiculaire"], englishSearchTerms: ["radiculopathy"] },
  { frenchPhrases: ["radiculopathie cervicale"], englishSearchTerms: ["cervical radiculopathy"] },
  { frenchPhrases: ["radiculopathie lombaire"], englishSearchTerms: ["lumbar radiculopathy"] },
  { frenchPhrases: ["queue de cheval", "syndrome de la queue de cheval"], englishSearchTerms: ["cauda equina"] },
  { frenchPhrases: ["syndrome du cône médullaire", "cone medullaire"], englishSearchTerms: ["conus medullaris"] },
  { frenchPhrases: ["abcès épidural", "abces epidural", "abcès épidural rachidien"], englishSearchTerms: ["epidural abscess"] },
  { frenchPhrases: ["ostéomyélite vertébrale", "osteomyelite vertebrale"], englishSearchTerms: ["vertebral osteomyelitis"] },
  { frenchPhrases: ["discite"], englishSearchTerms: ["discitis"] },
  { frenchPhrases: ["compression médullaire", "compression medullaire"], englishSearchTerms: ["spinal cord compression"] },
  { frenchPhrases: ["compression médullaire métastatique"], englishSearchTerms: ["metastatic spinal cord compression"] },
  { frenchPhrases: ["lésion médullaire", "lesion medullaire"], englishSearchTerms: ["spinal cord injury"] },
  { frenchPhrases: ["hernie discale"], englishSearchTerms: ["herniated disc"] },
  { frenchPhrases: ["sténose rachidienne", "stenose rachidienne"], englishSearchTerms: ["spinal stenosis"] },
  { frenchPhrases: ["myélopathie cervicale", "myelopathie cervicale"], englishSearchTerms: ["cervical myelopathy"] },
  { frenchPhrases: ["fracture vertébrale par compression"], englishSearchTerms: ["vertebral compression fracture"] },
  { frenchPhrases: ["fracture éclatement", "fracture eclatement"], englishSearchTerms: ["burst fracture"] },
  { frenchPhrases: ["fracture cervicale"], englishSearchTerms: ["cervical spine fracture"] },
  { frenchPhrases: ["fracture thoracique"], englishSearchTerms: ["thoracic spine fracture"] },
  { frenchPhrases: ["fracture lombaire"], englishSearchTerms: ["lumbar spine fracture"] },
  { frenchPhrases: ["syndrome centromédullaire", "syndrome centromedullaire"], englishSearchTerms: ["central cord syndrome"] },
  { frenchPhrases: ["syndrome médullaire antérieur"], englishSearchTerms: ["anterior cord syndrome"] },
  { frenchPhrases: ["syndrome de Brown-Séquard", "brown sequard"], englishSearchTerms: ["Brown-Sequard syndrome"] },
  { frenchPhrases: ["choc neurogène", "choc neurogene"], englishSearchTerms: ["neurogenic shock"] },
  { frenchPhrases: ["choc spinal"], englishSearchTerms: ["spinal shock"] },
  { frenchPhrases: ["entorse cervicale"], englishSearchTerms: ["cervical strain"] },
  { frenchPhrases: ["entorse lombaire"], englishSearchTerms: ["lumbar strain"] },
  { frenchPhrases: ["lombalgie"], englishSearchTerms: ["low back pain"] },
  { frenchPhrases: ["douleur cervicale"], englishSearchTerms: ["neck pain"] },
  {
    frenchPhrases: ["palpitations"],
    englishSearchTerms: ["palpitations"],
  },
  {
    frenchPhrases: ["syncope"],
    englishSearchTerms: ["syncope"],
  },
  {
    frenchPhrases: ["faiblesse"],
    englishSearchTerms: ["weakness"],
  },
  {
    frenchPhrases: ["fatigue"],
    englishSearchTerms: ["fatigue"],
  },
  {
    frenchPhrases: ["hypertension"],
    englishSearchTerms: ["hypertension"],
  },
  {
    frenchPhrases: ["plaie"],
    englishSearchTerms: ["wound"],
  },
  {
    frenchPhrases: ["coupure"],
    englishSearchTerms: ["laceration"],
  },
  {
    frenchPhrases: ["morsure", "morsure animale"],
    englishSearchTerms: ["animal bite", "bite"],
  },
  {
    frenchPhrases: ["morsure de chien"],
    englishSearchTerms: ["dog bite", "bitten by dog"],
  },
  {
    frenchPhrases: ["morsure de chat"],
    englishSearchTerms: ["cat bite", "bitten by cat"],
  },
  {
    frenchPhrases: ["morsure humaine"],
    englishSearchTerms: ["human bite"],
  },
  {
    frenchPhrases: ["morsure du poing", "poing fermé"],
    englishSearchTerms: ["fight bite", "clenched fist", "knuckle bite"],
  },
  {
    frenchPhrases: ["plaie contaminée", "plaie sale"],
    englishSearchTerms: ["contaminated wound", "dirty wound"],
  },
  {
    frenchPhrases: ["morsure de chauve-souris"],
    englishSearchTerms: ["bat bite"],
  },
  {
    frenchPhrases: ["plaie exposée à l'eau", "plaie d'eau douce", "plaie d'eau salée"],
    englishSearchTerms: ["water-exposed wound", "freshwater", "saltwater"],
  },
  {
    frenchPhrases: ["plaie agricole", "plaie de ferme"],
    englishSearchTerms: ["farm wound", "farm contamination"],
  },
  {
    frenchPhrases: ["plaie tardive", "plaie retardée"],
    englishSearchTerms: ["delayed wound", "delayed presentation wound"],
  },
  {
    frenchPhrases: ["infection profonde de la main", "ténosynovite infectieuse"],
    englishSearchTerms: ["deep-space hand infection", "flexor tenosynovitis"],
  },
  {
    frenchPhrases: ["cellulite après morsure", "morsure infectée", "plaie infectée"],
    englishSearchTerms: ["bite cellulitis", "infected bite", "infected traumatic wound"],
  },
  // Soft tissue / wound infection (Phase 13)
  {
    frenchPhrases: ["cellulite", "cellulite faciale", "cellulite de la main", "cellulite de la jambe", "cellulite du pied"],
    englishSearchTerms: ["cellulitis", "facial cellulitis", "hand cellulitis", "leg cellulitis", "foot cellulitis"],
  },
  {
    frenchPhrases: ["érysipèle", "erysipele"],
    englishSearchTerms: ["erysipelas"],
  },
  {
    frenchPhrases: ["abcès cutané", "abces cutane", "furoncle", "anthrax cutané", "anthrax cutane"],
    englishSearchTerms: ["cutaneous abscess", "skin abscess", "furuncle", "carbuncle"],
  },
  {
    frenchPhrases: ["panaris pulpaire", "paronychie", "abcès pilonidal", "abces pilonidal", "abcès d'hidradénite", "abces d hidradenite"],
    englishSearchTerms: ["felon", "paronychia", "pilonidal abscess", "hidradenitis abscess"],
  },
  {
    frenchPhrases: ["plaie traumatique infectée", "plaie traumatique infectee", "infection du site opératoire", "infection du site operatoire", "infection postopératoire de plaie", "déhiscence de plaie", "dehiscence de plaie"],
    englishSearchTerms: [
      "infected traumatic wound",
      "surgical site infection",
      "postoperative wound infection",
      "wound dehiscence",
    ],
  },
  {
    frenchPhrases: ["fasciite nécrosante", "fasciite necrosante", "infection nécrosante des tissus mous", "gangrène gazeuse", "gangrene gazeuse", "gangrène de Fournier", "gangrene de fournier"],
    englishSearchTerms: [
      "necrotizing fasciitis",
      "necrotizing soft tissue infection",
      "gas gangrene",
      "Fournier gangrene",
    ],
  },
  {
    frenchPhrases: ["pyomyosite", "myosite infectieuse", "ténosynovite infectieuse des fléchisseurs", "tenosynovite infectieuse des flechisseurs", "bursite septique"],
    englishSearchTerms: ["pyomyositis", "infectious myositis", "flexor tenosynovitis", "septic bursitis"],
  },
  {
    frenchPhrases: ["infection du pied diabétique", "infection du pied diabetique", "ulcère diabétique infecté", "ulcere diabetique infecte", "escarre infectée", "escarre infectee", "ulcère veineux infecté", "ulcere veineux infecte"],
    englishSearchTerms: [
      "diabetic foot infection",
      "infected diabetic foot ulcer",
      "infected pressure ulcer",
      "infected venous ulcer",
    ],
  },
  {
    frenchPhrases: ["ostéomyélite liée à une plaie", "osteomyelite liee a une plaie", "arthrite septique liée à une plaie", "arthrite septique liee a une plaie", "infection de plaie exposée à l'eau", "infection après morsure", "infection associee a un corps etranger", "infection associée à un corps étranger"],
    englishSearchTerms: [
      "osteomyelitis from wound",
      "septic arthritis from wound",
      "water exposed wound infection",
      "bite wound infection",
      "foreign body wound infection",
    ],
  },
  {
    frenchPhrases: ["plaie par morsure", "plaie perforante"],
    englishSearchTerms: ["bite wound", "puncture wound", "open bite"],
  },
  {
    frenchPhrases: ["fracture", "os cassé", "os casse"],
    englishSearchTerms: ["fracture", "broken bone"],
  },
  {
    frenchPhrases: ["bras cassé", "bras casse", "fracture du bras"],
    englishSearchTerms: ["broken arm", "arm fracture", "fracture"],
  },
  {
    frenchPhrases: ["poignet cassé", "poignet casse", "fracture du poignet"],
    englishSearchTerms: ["broken wrist", "wrist fracture", "distal radius fracture", "colles fracture"],
  },
  {
    frenchPhrases: ["hanche cassée", "hanche cassee", "fracture de la hanche", "fracture du col du fémur", "fracture du col du femur"],
    englishSearchTerms: ["broken hip", "hip fracture", "femoral neck fracture"],
  },
  {
    frenchPhrases: ["jambe cassée", "jambe cassee", "fracture de la jambe"],
    englishSearchTerms: ["broken leg", "tibia fracture", "leg fracture"],
  },
  {
    frenchPhrases: ["cheville cassée", "cheville cassee", "fracture de la cheville"],
    englishSearchTerms: ["broken ankle", "ankle fracture"],
  },
  {
    frenchPhrases: ["doigt cassé", "doigt casse", "fracture du doigt"],
    englishSearchTerms: ["broken finger", "finger fracture", "phalanx fracture"],
  },
  {
    frenchPhrases: ["orteil cassé", "orteil casse", "fracture de l'orteil"],
    englishSearchTerms: ["broken toe", "toe fracture"],
  },
  {
    frenchPhrases: ["fracture ouverte", "fracture composée", "fracture composee"],
    englishSearchTerms: ["open fracture", "compound fracture"],
  },
  {
    frenchPhrases: ["fracture de stress", "fracture pathologique"],
    englishSearchTerms: ["stress fracture", "pathologic fracture", "pathological fracture"],
  },
  {
    frenchPhrases: ["fracture en bois vert", "fracture en torus", "fracture pédiatrique", "fracture pediatrique"],
    englishSearchTerms: ["greenstick fracture", "buckle fracture", "torus fracture", "pediatric fracture"],
  },
  {
    frenchPhrases: ["côte cassée", "cote cassee", "fracture de côte", "fracture de cote"],
    englishSearchTerms: ["broken rib", "rib fracture"],
  },
  {
    frenchPhrases: ["mâchoire cassée", "machoire cassee", "nez cassé", "nez casse"],
    englishSearchTerms: ["broken jaw", "mandible fracture", "broken nose", "nasal fracture"],
  },
  {
    frenchPhrases: ["commotion cérébrale", "commotion cerebrale", "traumatisme crânien léger", "traumatisme cranien leger"],
    englishSearchTerms: ["concussion", "mild traumatic brain injury", "mild tbi"],
  },
  {
    frenchPhrases: [
      "hématome sous-dural",
      "hematome sous-dural",
      "hématome extradural",
      "hematome extradural",
      "hémorragie intracrânienne",
      "hemorragie intracranienne",
    ],
    englishSearchTerms: [
      "subdural hematoma",
      "subdural hemorrhage",
      "epidural hematoma",
      "epidural hemorrhage",
      "intracranial hemorrhage",
    ],
  },
  {
    frenchPhrases: ["fracture du crâne", "fracture du crane", "fracture de la base du crâne", "fracture de la base du crane"],
    englishSearchTerms: ["skull fracture", "basilar skull fracture"],
  },
  {
    frenchPhrases: ["fracture orbitaire", "fracture du plancher orbitaire", "fracture de l'orbite"],
    englishSearchTerms: ["orbital fracture", "blowout fracture", "eye socket fracture"],
  },
  {
    frenchPhrases: ["fracture de le fort", "fracture de lefort", "fracture maxillaire"],
    englishSearchTerms: ["le fort fracture", "lefort fracture", "maxillary fracture"],
  },
  {
    frenchPhrases: ["dent cassée", "dent cassee", "fracture dentaire", "dent fracturée", "dent fracturee"],
    englishSearchTerms: ["tooth fracture", "dental fracture", "fractured tooth"],
  },
  {
    frenchPhrases: ["dent avulsée", "dent avulsee", "dent arrachée", "dent arrachee", "dent expulsée", "dent expulsee"],
    englishSearchTerms: ["tooth avulsion", "avulsed tooth", "knocked out tooth"],
  },
  {
    frenchPhrases: [
      "luxation de la mâchoire après réduction",
      "luxation de la machoire apres reduction",
      "luxation atm réduite",
      "luxation atm reduite",
    ],
    englishSearchTerms: ["jaw dislocation post-reduction", "tmj dislocation post reduction", "post-reduction jaw dislocation"],
  },
  {
    frenchPhrases: ["oreille en chou-fleur", "hématome de l'oreille", "hematome de l oreille", "hématome auriculaire"],
    englishSearchTerms: ["cauliflower ear", "auricular hematoma", "hematoma of the ear"],
  },
  {
    frenchPhrases: ["hématome de la cloison nasale", "hematome de la cloison nasale", "hématome septal", "hematome septal"],
    englishSearchTerms: ["septal hematoma", "nasal septal hematoma"],
  },
  {
    frenchPhrases: ["lacération du visage", "laceration du visage", "coupure au visage", "plaie du visage"],
    englishSearchTerms: ["facial laceration", "face laceration", "laceration to the face"],
  },
  {
    frenchPhrases: ["entorse"],
    englishSearchTerms: ["sprain"],
  },
  {
    frenchPhrases: ["élongation", "elongation", "claquage"],
    englishSearchTerms: ["strain", "pulled muscle", "muscle strain"],
  },
  {
    frenchPhrases: ["luxation", "subluxation"],
    englishSearchTerms: ["dislocation", "subluxation"],
  },
  {
    frenchPhrases: ["épaule luxée", "epaule luxee", "luxation de l'épaule", "luxation de l'epaule"],
    englishSearchTerms: ["shoulder dislocation", "dislocated shoulder"],
  },
  {
    frenchPhrases: ["hanche luxée", "hanche luxee", "luxation de la hanche"],
    englishSearchTerms: ["hip dislocation", "dislocated hip"],
  },
  {
    frenchPhrases: ["rotule luxée", "rotule luxee", "luxation de la rotule"],
    englishSearchTerms: ["patella dislocation", "dislocated kneecap", "patellar dislocation"],
  },
  {
    frenchPhrases: ["doigt luxé", "doigt luxe", "luxation du doigt"],
    englishSearchTerms: ["finger dislocation", "dislocated finger"],
  },
  {
    frenchPhrases: ["mâchoire luxée", "machoire luxee", "luxation de la mâchoire", "luxation de la machoire", "luxation atm"],
    englishSearchTerms: ["jaw dislocation", "tmj dislocation", "dislocated jaw"],
  },
  {
    frenchPhrases: ["poignet de bonne", "coude de nounou"],
    englishSearchTerms: ["nursemaid elbow", "pulled elbow", "radial head subluxation"],
  },
  {
    frenchPhrases: ["entorse de la cheville", "entorse cheville", "cheville tordue"],
    englishSearchTerms: ["ankle sprain", "twisted ankle"],
  },
  {
    frenchPhrases: ["entorse du poignet", "entorse poignet"],
    englishSearchTerms: ["wrist sprain"],
  },
  {
    frenchPhrases: ["entorse du genou", "entorse genou"],
    englishSearchTerms: ["knee sprain", "ligament injury"],
  },
  {
    frenchPhrases: ["entorse cervicale", "entorse du cou"],
    englishSearchTerms: ["neck strain", "cervical strain"],
  },
  {
    frenchPhrases: ["entorse lombaire", "entorse du dos"],
    englishSearchTerms: ["back strain", "lumbar strain"],
  },
  {
    frenchPhrases: ["entorse de l'épaule", "entorse de l'epaule", "entorse épaule"],
    englishSearchTerms: ["shoulder sprain"],
  },
  {
    frenchPhrases: ["claquage des ischio-jambiers", "claquage ischio", "élongation des ischio-jambiers"],
    englishSearchTerms: ["hamstring strain", "pulled hamstring"],
  },
  {
    frenchPhrases: ["rupture tendineuse", "lésion tendineuse", "lesion tendineuse"],
    englishSearchTerms: ["tendon rupture", "tendon injury", "tendon tear"],
  },
  {
    frenchPhrases: ["rupture d'Achille", "rupture d achille", "tendon d'Achille", "tendon d achille"],
    englishSearchTerms: ["Achilles rupture", "Achilles tendon"],
  },
  {
    frenchPhrases: ["coiffe des rotateurs", "rupture de la coiffe", "déchirure de la coiffe"],
    englishSearchTerms: ["rotator cuff", "rotator cuff tear"],
  },
  {
    frenchPhrases: ["doigt en maillet", "tendon extenseur", "tendon fléchisseur", "tendon flechisseur"],
    englishSearchTerms: ["mallet finger", "extensor tendon", "flexor tendon"],
  },
  {
    frenchPhrases: ["déchirure ligamentaire", "dechirure ligamentaire", "lésion ligamentaire", "lesion ligamentaire"],
    englishSearchTerms: ["ligament tear", "ligament injury"],
  },
  {
    frenchPhrases: ["lca", "croisé antérieur", "croise anterieur"],
    englishSearchTerms: ["ACL", "anterior cruciate"],
  },
  {
    frenchPhrases: ["lcp", "croisé postérieur", "croise posterieur"],
    englishSearchTerms: ["PCL", "posterior cruciate"],
  },
  {
    frenchPhrases: ["pouce du skieur", "lcu du pouce", "entorse du pouce"],
    englishSearchTerms: ["skier thumb", "gamekeeper thumb", "thumb UCL"],
  },
  {
    frenchPhrases: ["syndesmose", "entorse haute"],
    englishSearchTerms: ["syndesmosis", "high ankle sprain"],
  },
  {
    frenchPhrases: ["douleur cheville"],
    englishSearchTerms: ["ankle pain"],
  },
  {
    frenchPhrases: ["douleur genou"],
    englishSearchTerms: ["knee pain"],
  },
  {
    frenchPhrases: ["douleur epaule", "douleur épaule"],
    englishSearchTerms: ["shoulder pain"],
  },
  {
    frenchPhrases: ["oeil rouge", "œil rouge", "yeux rouges"],
    englishSearchTerms: ["red eye"],
  },
  {
    frenchPhrases: ["douleur oculaire", "douleur à l'oeil", "douleur a l oeil", "mal à l'oeil"],
    englishSearchTerms: ["eye pain", "ocular pain"],
  },
  {
    frenchPhrases: ["trouble visuel", "vision trouble", "perte de vision", "baisse de vision"],
    englishSearchTerms: ["vision change", "vision loss", "blurred vision"],
  },
  {
    frenchPhrases: ["abrasion cornéenne", "abrasion corneenne", "cornée éraflée", "oeil éraflé"],
    englishSearchTerms: ["corneal abrasion", "scratched cornea", "scratched eye"],
  },
  {
    frenchPhrases: ["corps étranger dans l'oeil", "corps etranger dans l oeil", "corps étranger cornéen"],
    englishSearchTerms: ["corneal foreign body", "foreign body in cornea", "foreign body eye"],
  },
  {
    frenchPhrases: ["ulcère cornéen", "ulcere corneen", "infection de la cornée"],
    englishSearchTerms: ["corneal ulcer", "microbial keratitis"],
  },
  {
    frenchPhrases: ["brûlure chimique de l'oeil", "brulure chimique de l oeil", "projection chimique dans l'oeil"],
    englishSearchTerms: ["chemical eye injury", "chemical eye burn", "eye irrigation"],
  },
  {
    frenchPhrases: ["coup de soleil de l'oeil", "coup de soleil oculaire", "photokératite", "photokeratite"],
    englishSearchTerms: ["photokeratitis", "welder's flash", "uv keratitis", "snow blindness"],
  },
  {
    frenchPhrases: ["globe oculaire ouvert", "oeil perforé", "oeil perfore", "plaie oculaire pénétrante"],
    englishSearchTerms: ["open globe", "globe rupture", "penetrating eye injury"],
  },
  {
    frenchPhrases: ["hyphéma", "hyphema", "sang dans l'oeil"],
    englishSearchTerms: ["hyphema", "blood in the eye"],
  },
  {
    frenchPhrases: ["glaucome aigu", "crise de glaucome", "pression oculaire élevée"],
    englishSearchTerms: ["acute angle-closure glaucoma", "angle closure glaucoma"],
  },
  {
    frenchPhrases: ["décollement de la rétine", "decollement de la retine", "rideau dans la vision"],
    englishSearchTerms: ["retinal detachment", "curtain over vision"],
  },
  {
    frenchPhrases: ["hémorragie du vitré", "hemorragie du vitre"],
    englishSearchTerms: ["vitreous hemorrhage"],
  },
  {
    frenchPhrases: ["occlusion de l'artère rétinienne", "occlusion de l artere retinienne", "crao"],
    englishSearchTerms: ["central retinal artery occlusion", "CRAO"],
  },
  {
    frenchPhrases: ["cellulite orbitaire", "infection derrière l'oeil", "infection derriere l oeil"],
    englishSearchTerms: ["orbital cellulitis"],
  },
  {
    frenchPhrases: ["cellulite préseptale", "cellulite preseptale", "cellulite périorbitaire", "cellulite periorbitaire"],
    englishSearchTerms: ["preseptal cellulitis", "periorbital cellulitis"],
  },
  {
    frenchPhrases: ["uvéite", "uveite", "iritis"],
    englishSearchTerms: ["uveitis", "iritis"],
  },
  {
    frenchPhrases: ["sclérite", "sclerite"],
    englishSearchTerms: ["scleritis"],
  },
  {
    frenchPhrases: ["lacération de la paupière", "laceration de la paupiere", "coupure à la paupière", "paupière coupée"],
    englishSearchTerms: ["eyelid laceration", "lid laceration"],
  },
  {
    frenchPhrases: ["lésion des voies lacrymales", "lesion des voies lacrymales", "canalicule lacrymal"],
    englishSearchTerms: ["canalicular injury", "lacrimal duct injury"],
  },
  {
    frenchPhrases: ["endophtalmie", "infection à l'intérieur de l'oeil"],
    englishSearchTerms: ["endophthalmitis"],
  },
  {
    frenchPhrases: ["traumatisme oculaire", "traumatisme de l'oeil", "traumatisme de l oeil"],
    englishSearchTerms: ["eye trauma", "ocular trauma"],
  },
  {
    frenchPhrases: ["oreille du baigneur", "otite externe"],
    englishSearchTerms: ["swimmer's ear", "otitis externa"],
  },
  {
    frenchPhrases: ["otite externe maligne", "otite externe necrosante", "otite externe nécrosante"],
    englishSearchTerms: ["malignant otitis externa", "necrotizing otitis externa"],
  },
  {
    frenchPhrases: ["mastoïdite", "mastoidite"],
    englishSearchTerms: ["mastoiditis"],
  },
  {
    frenchPhrases: ["perforation du tympan", "tympan perforé", "tympan perfore"],
    englishSearchTerms: ["tympanic membrane perforation", "perforated eardrum"],
  },
  {
    frenchPhrases: ["surdité brusque", "surdite brusque", "surdité soudaine", "surdite soudaine"],
    englishSearchTerms: ["sudden sensorineural hearing loss", "sudden hearing loss", "SSNHL"],
  },
  {
    frenchPhrases: ["vertige positionnel paroxystique bénin", "vertige positionnel paroxystique benin", "vppb"],
    englishSearchTerms: ["BPPV", "benign paroxysmal positional vertigo"],
  },
  {
    frenchPhrases: ["névrite vestibulaire", "nevrite vestibulaire"],
    englishSearchTerms: ["vestibular neuritis"],
  },
  {
    frenchPhrases: ["labyrinthite"],
    englishSearchTerms: ["labyrinthitis"],
  },
  {
    frenchPhrases: ["paralysie de bell", "paralysie faciale"],
    englishSearchTerms: ["bell's palsy", "facial nerve palsy", "facial droop"],
  },
  {
    frenchPhrases: ["syndrome de ramsay hunt", "zona auriculaire"],
    englishSearchTerms: ["ramsay hunt", "herpes zoster oticus"],
  },
  {
    frenchPhrases: ["tamponnement nasal"],
    englishSearchTerms: ["nasal packing", "post nasal packing"],
  },
  {
    frenchPhrases: ["épistaxis postérieure", "epistaxis posterieure"],
    englishSearchTerms: ["posterior epistaxis"],
  },
  {
    frenchPhrases: ["corps étranger nasal", "corps etranger nasal", "corps étranger dans le nez"],
    englishSearchTerms: ["nasal foreign body", "foreign body in the nose"],
  },
  {
    frenchPhrases: ["abcès périamygdalien", "abces periamygdalien", "phlegmon péritonsillaire"],
    englishSearchTerms: ["peritonsillar abscess", "quinsy"],
  },
  {
    frenchPhrases: ["abcès rétropharyngé", "abces retropharynge", "infection profonde de l'espace du cou"],
    englishSearchTerms: ["retropharyngeal abscess", "deep neck space infection", "parapharyngeal abscess"],
  },
  {
    frenchPhrases: ["angine de ludwig"],
    englishSearchTerms: ["ludwig's angina", "ludwig angina"],
  },
  {
    frenchPhrases: ["épiglottite", "epiglottite"],
    englishSearchTerms: ["epiglottitis"],
  },
  {
    frenchPhrases: ["sialadénite", "sialadenite"],
    englishSearchTerms: ["sialadenitis", "salivary gland infection"],
  },
  {
    frenchPhrases: ["sialolithiase", "calcul salivaire"],
    englishSearchTerms: ["sialolithiasis", "salivary duct obstruction", "salivary stone"],
  },
  {
    frenchPhrases: ["corps étranger dans la gorge", "corps etranger dans la gorge", "arête de poisson", "arete de poisson"],
    englishSearchTerms: ["throat foreign body", "fish bone"],
  },
];

/** Accent-insensitive, lowercase normalization for diagnosis search. */
export function normalizeDiagnosisSearchText(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  try {
    return trimmed
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
}

export function getFrenchDiagnosisSearchAliases(): readonly FrenchDiagnosisSearchAlias[] {
  return FRENCH_DIAGNOSIS_SEARCH_ALIASES;
}

type AliasMatch = {
  alias: FrenchDiagnosisSearchAlias;
  phrase: string;
  score: number;
};

function scoreFrenchPhraseMatch(normalizedQuery: string, normalizedPhrase: string): number {
  if (!normalizedQuery || !normalizedPhrase) return 0;
  if (normalizedPhrase === normalizedQuery) return 1000 + normalizedPhrase.length;
  if (normalizedPhrase.startsWith(normalizedQuery)) return 800 + normalizedQuery.length;
  if (normalizedQuery.startsWith(normalizedPhrase)) return 700 + normalizedPhrase.length;
  if (normalizedPhrase.includes(normalizedQuery)) return 500 + normalizedQuery.length;
  if (normalizedQuery.includes(normalizedPhrase)) return 400 + normalizedPhrase.length;
  return 0;
}

function findFrenchAliasMatches(normalizedQuery: string): AliasMatch[] {
  if (normalizedQuery.length < 2) return [];
  const matches: AliasMatch[] = [];
  for (const alias of FRENCH_DIAGNOSIS_SEARCH_ALIASES) {
    for (const phrase of alias.frenchPhrases) {
      const normalizedPhrase = normalizeDiagnosisSearchText(phrase);
      const score = scoreFrenchPhraseMatch(normalizedQuery, normalizedPhrase);
      if (score > 0) {
        matches.push({ alias, phrase, score });
      }
    }
  }
  matches.sort((a, b) => b.score - a.score || b.phrase.length - a.phrase.length);
  return matches;
}

/** Resolve French UI query to English ICD catalog search term(s). Returns empty when locale is not fr. */
export function resolveLocalizedDiagnosisSearchQueries(
  query: string,
  locale: SupportedLanguage
): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  if (locale !== "fr") return [trimmed];

  const normalizedQuery = normalizeDiagnosisSearchText(trimmed);
  const matches = findFrenchAliasMatches(normalizedQuery);
  if (!matches.length) return [trimmed];

  const terms: string[] = [];
  const seen = new Set<string>();
  for (const match of matches) {
    for (const term of match.alias.englishSearchTerms) {
      const key = normalizeDiagnosisSearchText(term);
      if (seen.has(key)) continue;
      seen.add(key);
      terms.push(term);
    }
  }
  return terms.length ? terms : [trimmed];
}

/** Primary English catalog query for a localized diagnosis search (first alias hit). */
export function resolveLocalizedDiagnosisSearchQuery(query: string, locale: SupportedLanguage): string {
  return resolveLocalizedDiagnosisSearchQueries(query, locale)[0] ?? query.trim();
}

function diagnosisEnglishHaystack(diagnosis: Pick<Icd10SearchHit, "code" | "shortDescription" | "longDescription">): string {
  return normalizeDiagnosisSearchText(
    [diagnosis.code, diagnosis.shortDescription, diagnosis.longDescription ?? ""].join(" ")
  );
}

function diagnosisMatchesEnglishTerms(
  diagnosis: Pick<Icd10SearchHit, "code" | "shortDescription" | "longDescription">,
  englishTerms: readonly string[]
): boolean {
  const haystack = diagnosisEnglishHaystack(diagnosis);
  return englishTerms.some((term) => {
    const needle = normalizeDiagnosisSearchText(term);
    return needle.length >= 2 && haystack.includes(needle);
  });
}

/** Client-side match for catalog hits against a localized query (French aliases → English labels). */
export function diagnosisMatchesLocalizedSearch(
  diagnosis: Pick<Icd10SearchHit, "code" | "shortDescription" | "longDescription">,
  query: string,
  locale: SupportedLanguage
): boolean {
  const trimmed = query.trim();
  if (trimmed.length < 2) return false;

  const normalizedQuery = normalizeDiagnosisSearchText(trimmed);
  const haystack = diagnosisEnglishHaystack(diagnosis);

  if (haystack.includes(normalizedQuery)) return true;

  if (locale !== "fr") return false;

  const matches = findFrenchAliasMatches(normalizedQuery);
  if (!matches.length) return false;

  const englishTerms = matches.flatMap((m) => m.alias.englishSearchTerms);
  return diagnosisMatchesEnglishTerms(diagnosis, englishTerms);
}
