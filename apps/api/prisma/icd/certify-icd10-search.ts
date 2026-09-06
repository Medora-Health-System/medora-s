/**
 * Diagnosis search certification against the imported active ICD catalog.
 * Uses the same match + one-row-per-code select as Icd10CatalogService.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  buildIcd10CatalogSearchMatch,
  buildIcd10CatalogSearchSelectSql,
  type Icd10CatalogSearchRow,
} from "../../src/diagnoses/icd10-catalog-search.query";

type SearchRow = Pick<Icd10CatalogSearchRow, "code" | "shortDescription"> & {
  releaseVersion?: string | null;
};

const REQUIRED_QUERIES: Array<{
  q: string;
  mustContainDescription?: string;
  mustMatchCodePrefix?: string;
}> = [
  // Spine/back emergencies (Phase 9)
  { q: "neck pain", mustContainDescription: "cervical" },
  { q: "cervical strain", mustMatchCodePrefix: "S16.1" },
  { q: "thoracic strain", mustContainDescription: "thoracic" },
  { q: "lumbar strain", mustMatchCodePrefix: "S39.012" },
  { q: "low back pain", mustContainDescription: "low back" },
  { q: "herniated disc", mustContainDescription: "disc" },
  { q: "cervical disc herniation", mustMatchCodePrefix: "M50" },
  { q: "lumbar disc herniation", mustMatchCodePrefix: "M51" },
  { q: "cervical radiculopathy", mustContainDescription: "radiculopathy" },
  { q: "thoracic radiculopathy", mustContainDescription: "radiculopathy" },
  { q: "lumbar radiculopathy", mustContainDescription: "radiculopathy" },
  { q: "sciatica", mustContainDescription: "sciatica" },
  { q: "spinal stenosis", mustContainDescription: "stenosis" },
  { q: "cervical myelopathy", mustContainDescription: "myelopathy" },
  { q: "thoracic myelopathy", mustContainDescription: "myelopathy" },
  { q: "cauda equina syndrome", mustContainDescription: "cauda" },
  { q: "conus medullaris syndrome", mustContainDescription: "conus" },
  { q: "spinal epidural abscess", mustContainDescription: "abscess" },
  { q: "vertebral osteomyelitis", mustContainDescription: "osteomyelitis" },
  { q: "discitis", mustContainDescription: "discitis" },
  { q: "spinal cord compression", mustContainDescription: "cord" },
  { q: "metastatic spinal cord compression", mustContainDescription: "cord" },
  { q: "vertebral compression fracture", mustContainDescription: "fracture" },
  { q: "burst fracture", mustContainDescription: "fracture" },
  { q: "cervical spine fracture", mustMatchCodePrefix: "S12" },
  { q: "thoracic spine fracture", mustMatchCodePrefix: "S22" },
  { q: "lumbar spine fracture", mustMatchCodePrefix: "S32" },
  { q: "spinal cord injury", mustContainDescription: "spinal cord" },
  { q: "central cord syndrome", mustContainDescription: "central cord" },
  { q: "anterior cord syndrome", mustContainDescription: "anterior cord" },
  { q: "posterior cord syndrome", mustContainDescription: "posterior cord" },
  { q: "Brown-Sequard syndrome", mustContainDescription: "brown" },
  { q: "neurogenic shock", mustContainDescription: "shock" },
  { q: "spinal shock", mustContainDescription: "shock" },
  { q: "SCIWORA", mustContainDescription: "spinal cord" },
  { q: "douleur cervicale", mustContainDescription: "cervical" },
  { q: "entorse cervicale", mustMatchCodePrefix: "S16.1" },
  { q: "douleur thoracique rachidienne", mustContainDescription: "thoracic" },
  { q: "entorse lombaire", mustMatchCodePrefix: "S39.012" },
  { q: "lombalgie", mustContainDescription: "low back" },
  { q: "hernie discale", mustContainDescription: "disc" },
  { q: "radiculopathie cervicale", mustContainDescription: "radiculopathy" },
  { q: "radiculopathie lombaire", mustContainDescription: "radiculopathy" },
  { q: "sciatique", mustContainDescription: "sciatica" },
  { q: "sténose rachidienne", mustContainDescription: "stenosis" },
  { q: "myélopathie cervicale", mustContainDescription: "myelopathy" },
  { q: "syndrome de la queue de cheval", mustContainDescription: "cauda" },
  { q: "syndrome du cône médullaire", mustContainDescription: "conus" },
  { q: "abcès épidural rachidien", mustContainDescription: "abscess" },
  { q: "ostéomyélite vertébrale", mustContainDescription: "osteomyelitis" },
  { q: "discite", mustContainDescription: "discitis" },
  { q: "compression médullaire", mustContainDescription: "cord" },
  { q: "compression médullaire métastatique", mustContainDescription: "cord" },
  { q: "fracture vertébrale par compression", mustContainDescription: "fracture" },
  { q: "fracture éclatement", mustContainDescription: "fracture" },
  { q: "fracture cervicale", mustMatchCodePrefix: "S12" },
  { q: "fracture thoracique", mustMatchCodePrefix: "S22" },
  { q: "fracture lombaire", mustMatchCodePrefix: "S32" },
  { q: "lésion médullaire", mustContainDescription: "spinal cord" },
  { q: "syndrome centromédullaire", mustContainDescription: "central cord" },
  { q: "syndrome médullaire antérieur", mustContainDescription: "anterior cord" },
  { q: "syndrome de Brown-Séquard", mustContainDescription: "brown" },
  { q: "choc neurogène", mustContainDescription: "shock" },
  { q: "choc spinal", mustContainDescription: "shock" },
  { q: "radiculopathie", mustContainDescription: "radiculopathy" },
  { q: "queue de cheval", mustContainDescription: "cauda" },
  { q: "cauda equina", mustContainDescription: "cauda" },
  // Human bite / contaminated wound (Phase 8)
  { q: "human bite", mustMatchCodePrefix: "W50.3" },
  { q: "morsure humaine", mustMatchCodePrefix: "W50.3" },
  { q: "fight bite", mustMatchCodePrefix: "W50.3" },
  { q: "clenched fist", mustMatchCodePrefix: "W50.3" },
  { q: "knuckle bite", mustMatchCodePrefix: "W50.3" },
  { q: "morsure du poing", mustMatchCodePrefix: "W50.3" },
  { q: "contaminated wound", mustContainDescription: "wound" },
  { q: "plaie contaminée", mustContainDescription: "wound" },
  { q: "Achilles tendon rupture", mustContainDescription: "Achilles" },
  { q: "Achilles laceration", mustContainDescription: "Achilles" },
  { q: "rotator cuff tear", mustContainDescription: "rotator cuff" },
  { q: "biceps tendon rupture", mustContainDescription: "biceps" },
  { q: "triceps tendon rupture", mustContainDescription: "triceps" },
  { q: "quadriceps tendon rupture", mustContainDescription: "quadriceps" },
  { q: "patellar tendon rupture", mustContainDescription: "quadriceps", mustMatchCodePrefix: "S76.1" },
  { q: "hamstring tendon injury", mustContainDescription: "post grp", mustMatchCodePrefix: "S76.3" },
  { q: "flexor tendon laceration", mustContainDescription: "flexor" },
  { q: "extensor tendon laceration", mustContainDescription: "extensor" },
  { q: "mallet finger", mustContainDescription: "mallet" },
  { q: "ACL tear", mustContainDescription: "anterior cruciate", mustMatchCodePrefix: "S83.51" },
  { q: "PCL tear", mustContainDescription: "posterior cruciate", mustMatchCodePrefix: "S83.52" },
  { q: "MCL tear", mustContainDescription: "medial collateral", mustMatchCodePrefix: "S83.41" },
  { q: "LCL tear", mustContainDescription: "lateral collateral", mustMatchCodePrefix: "S83.42" },
  { q: "high ankle sprain", mustContainDescription: "tibiofibular", mustMatchCodePrefix: "S93.43" },
  { q: "syndesmotic ligament injury", mustContainDescription: "tibiofibular" },
  { q: "thumb UCL tear", mustContainDescription: "thumb", mustMatchCodePrefix: "S63.64" },
  { q: "skier's thumb", mustContainDescription: "thumb", mustMatchCodePrefix: "S63.64" },
  { q: "gamekeeper's thumb", mustContainDescription: "thumb", mustMatchCodePrefix: "S63.64" },
  { q: "scapholunate ligament injury", mustMatchCodePrefix: "S63." },
  { q: "elbow UCL injury", mustContainDescription: "ulnar collateral" },
  // Crush / amputation / foreign body (Phase 4 production certification)
  { q: "crush injury", mustContainDescription: "crush" },
  { q: "crushed hand", mustContainDescription: "hand", mustMatchCodePrefix: "S67" },
  { q: "crushed finger", mustContainDescription: "finger", mustMatchCodePrefix: "S67" },
  { q: "crushed foot", mustContainDescription: "foot", mustMatchCodePrefix: "S97" },
  { q: "industrial crush injury", mustContainDescription: "crush" },
  { q: "prolonged compression", mustMatchCodePrefix: "T79.6" },
  { q: "degloving injury", mustContainDescription: "crush" },
  { q: "compartment syndrome after crush", mustMatchCodePrefix: "T79.6" },
  { q: "rhabdomyolysis after crush", mustMatchCodePrefix: "T79.6" },
  { q: "traumatic amputation", mustContainDescription: "amp" },
  { q: "partial amputation", mustContainDescription: "partial" },
  { q: "complete amputation", mustContainDescription: "complete" },
  { q: "severed finger", mustMatchCodePrefix: "S68" },
  { q: "finger cut off", mustMatchCodePrefix: "S68" },
  { q: "thumb cut off", mustContainDescription: "thmb", mustMatchCodePrefix: "S68" },
  { q: "toe cut off", mustContainDescription: "toe", mustMatchCodePrefix: "S98" },
  { q: "avulsed digit", mustMatchCodePrefix: "S68" },
  { q: "hand amputation", mustContainDescription: "hand", mustMatchCodePrefix: "S68" },
  { q: "foot amputation", mustContainDescription: "foot", mustMatchCodePrefix: "S98" },
  { q: "foreign body", mustContainDescription: "foreign body" },
  { q: "retained foreign body", mustContainDescription: "fb" },
  { q: "splinter", mustContainDescription: "foreign body" },
  { q: "glass in skin", mustContainDescription: "foreign body" },
  { q: "metal fragment", mustContainDescription: "foreign body" },
  { q: "needle fragment", mustContainDescription: "foreign body" },
  { q: "fishhook", mustContainDescription: "foreign body" },
  { q: "foreign body eye", mustMatchCodePrefix: "T15" },
  { q: "foreign body ear", mustMatchCodePrefix: "T16" },
  { q: "foreign body nose", mustMatchCodePrefix: "T17" },
  { q: "foreign body hand", mustContainDescription: "foreign body" },
  { q: "foreign body foot", mustContainDescription: "foreign body" },
  { q: "swallowed foreign body", mustMatchCodePrefix: "T18" },
  { q: "aspirated foreign body", mustMatchCodePrefix: "T17" },
  // Burn / inhalation / frostbite / electrical (Phase 5)
  { q: "burn", mustContainDescription: "burn" },
  { q: "thermal burn", mustContainDescription: "burn" },
  { q: "first-degree burn", mustContainDescription: "first degree" },
  { q: "second-degree burn", mustContainDescription: "second degree" },
  { q: "third-degree burn", mustContainDescription: "third degree" },
  { q: "superficial burn", mustContainDescription: "first degree" },
  { q: "partial-thickness burn", mustContainDescription: "second degree" },
  { q: "full-thickness burn", mustContainDescription: "third degree" },
  { q: "facial burn", mustMatchCodePrefix: "T20" },
  { q: "hand burn", mustMatchCodePrefix: "T23" },
  { q: "foot burn", mustMatchCodePrefix: "T25" },
  { q: "genital burn", mustContainDescription: "genital" },
  { q: "chemical burn", mustContainDescription: "corrosion" },
  { q: "acid burn", mustContainDescription: "corrosion" },
  { q: "alkali burn", mustContainDescription: "corrosion" },
  { q: "electrical burn", mustMatchCodePrefix: "T75" },
  { q: "lightning injury", mustMatchCodePrefix: "T75.0" },
  { q: "smoke inhalation", mustMatchCodePrefix: "T27" },
  { q: "inhalation injury", mustMatchCodePrefix: "T27" },
  { q: "airway burn", mustMatchCodePrefix: "T27" },
  { q: "frostbite", mustContainDescription: "frostbite" },
  { q: "cold injury", mustContainDescription: "frostbite" },
  { q: "sunburn", mustMatchCodePrefix: "L55" },
  { q: "scald", mustContainDescription: "burn" },
  { q: "grease burn", mustContainDescription: "burn" },
  { q: "steam burn", mustContainDescription: "burn" },
  // Penetrating trauma (Phase 6)
  { q: "gunshot wound", mustMatchCodePrefix: "S" },
  { q: "bullet wound", mustMatchCodePrefix: "S" },
  { q: "firearm injury", mustMatchCodePrefix: "S" },
  { q: "retained bullet", mustMatchCodePrefix: "S" },
  { q: "retained projectile", mustMatchCodePrefix: "S" },
  { q: "shotgun injury", mustMatchCodePrefix: "S" },
  { q: "pellet wound", mustMatchCodePrefix: "S" },
  { q: "BB gun injury", mustMatchCodePrefix: "S" },
  { q: "stab wound", mustMatchCodePrefix: "S" },
  { q: "knife wound", mustMatchCodePrefix: "S" },
  { q: "penetrating trauma", mustContainDescription: "wound" },
  { q: "penetrating wound", mustContainDescription: "wound" },
  { q: "puncture wound", mustContainDescription: "puncture", mustMatchCodePrefix: "S" },
  { q: "impalement", mustMatchCodePrefix: "S" },
  { q: "through-and-through wound", mustMatchCodePrefix: "S" },
  { q: "penetrating chest wound", mustContainDescription: "thorax", mustMatchCodePrefix: "S21" },
  { q: "penetrating abdominal wound", mustContainDescription: "abd", mustMatchCodePrefix: "S31" },
  { q: "penetrating neck wound", mustContainDescription: "neck", mustMatchCodePrefix: "S11" },
  { q: "penetrating head wound", mustContainDescription: "scalp", mustMatchCodePrefix: "S01" },
  { q: "penetrating hand wound", mustContainDescription: "hand", mustMatchCodePrefix: "S61" },
  { q: "penetrating eye injury", mustMatchCodePrefix: "S05" },
  { q: "gunshot", mustMatchCodePrefix: "S" },
  { q: "firearm", mustMatchCodePrefix: "S" },
  { q: "bullet", mustMatchCodePrefix: "S" },
  { q: "stab", mustMatchCodePrefix: "S" },
  { q: "knife", mustMatchCodePrefix: "S" },
  // Blast injury / polytrauma (Phase 7). Terms mirror official ICD descriptions,
  // avoiding unrelated behavioral-health matches such as "explosive personality".
  { q: "unspecified multiple injuries", mustMatchCodePrefix: "T07" },
  { q: "traumatic shock", mustMatchCodePrefix: "T79.4" },
  { q: "traumatic rupture ear drum", mustMatchCodePrefix: "S09.2" },
  { q: "otitic barotrauma", mustMatchCodePrefix: "T70.0" },
  { q: "explosion of blasting material", mustMatchCodePrefix: "W40" },
  { q: "discharge of firework", mustMatchCodePrefix: "W39" },
  { q: "asphyxiation due to cave-in", mustMatchCodePrefix: "T71.21" },
  { q: "blessures multiples non précisées", mustMatchCodePrefix: "T07" },
  { q: "choc traumatique", mustMatchCodePrefix: "T79.4" },
  { q: "barotraumatisme otitique", mustMatchCodePrefix: "T70.0" },
  { q: "explosion de matériau de dynamitage", mustMatchCodePrefix: "W40" },
  { q: "décharge de feu d'artifice", mustMatchCodePrefix: "W39" },
  // French aliases expand to English ICD search terms
  { q: "blessure par balle", mustMatchCodePrefix: "S" },
  { q: "plaie par balle", mustMatchCodePrefix: "S" },
  { q: "blessure par arme à feu", mustMatchCodePrefix: "S" },
  { q: "projectile retenu", mustMatchCodePrefix: "S" },
  { q: "plaie par arme blanche", mustMatchCodePrefix: "S" },
  { q: "coup de couteau", mustMatchCodePrefix: "S" },
  { q: "traumatisme pénétrant", mustContainDescription: "wound" },
  { q: "plaie pénétrante", mustContainDescription: "wound" },
  { q: "empalement", mustMatchCodePrefix: "S" },
  { q: "blessure thoracique pénétrante", mustMatchCodePrefix: "S21" },
  { q: "blessure abdominale pénétrante", mustMatchCodePrefix: "S31" },
  { q: "blessure cervicale pénétrante", mustMatchCodePrefix: "S11" },
  { q: "blessure oculaire pénétrante", mustMatchCodePrefix: "S05" },
  // Head / facial trauma (Phase 10)
  { q: "head injury", mustMatchCodePrefix: "S06" },
  { q: "traumatisme crânien", mustMatchCodePrefix: "S06" },
  { q: "concussion", mustMatchCodePrefix: "S06.0" },
  { q: "commotion cérébrale", mustMatchCodePrefix: "S06.0" },
  { q: "mild TBI", mustMatchCodePrefix: "S06.0" },
  { q: "mild traumatic brain injury", mustMatchCodePrefix: "S06.0" },
  { q: "TCC léger", mustMatchCodePrefix: "S06.0" },
  { q: "traumatisme crânien léger", mustMatchCodePrefix: "S06.0" },
  { q: "epidural hematoma", mustMatchCodePrefix: "S06.4" },
  { q: "hématome épidural", mustMatchCodePrefix: "S06.4" },
  { q: "subdural hematoma", mustMatchCodePrefix: "S06.5" },
  { q: "hématome sous-dural", mustMatchCodePrefix: "S06.5" },
  { q: "hématome sous-dural traumatique", mustMatchCodePrefix: "S06.5" },
  { q: "traumatic SAH", mustMatchCodePrefix: "S06.6" },
  { q: "traumatic subarachnoid hemorrhage", mustMatchCodePrefix: "S06.6" },
  { q: "hémorragie sous-arachnoïdienne traumatique", mustMatchCodePrefix: "S06.6" },
  { q: "skull fracture", mustMatchCodePrefix: "S02" },
  { q: "fracture du crâne", mustMatchCodePrefix: "S02" },
  { q: "basilar skull fracture", mustMatchCodePrefix: "S02.1" },
  { q: "fracture de la base du crâne", mustMatchCodePrefix: "S02.1" },
  { q: "nasal fracture", mustMatchCodePrefix: "S02.2" },
  { q: "fracture nasale", mustMatchCodePrefix: "S02.2" },
  { q: "orbital fracture", mustMatchCodePrefix: "S02" },
  { q: "fracture orbitaire", mustMatchCodePrefix: "S02" },
  { q: "zygomatic fracture", mustContainDescription: "malar", mustMatchCodePrefix: "S02.4" },
  { q: "fracture zygomatique", mustContainDescription: "malar", mustMatchCodePrefix: "S02.4" },
  { q: "maxillary fracture", mustMatchCodePrefix: "S02.4" },
  { q: "fracture maxillaire", mustMatchCodePrefix: "S02.4" },
  { q: "mandibular fracture", mustMatchCodePrefix: "S02.6" },
  { q: "fracture mandibulaire", mustMatchCodePrefix: "S02.6" },
  { q: "Le Fort fracture", mustMatchCodePrefix: "S02.41" },
  { q: "LeFort fracture", mustMatchCodePrefix: "S02.41" },
  { q: "fracture de Le Fort", mustMatchCodePrefix: "S02.41" },
  { q: "dental trauma", mustContainDescription: "tooth" },
  { q: "traumatisme dentaire", mustContainDescription: "tooth" },
  { q: "tooth avulsion", mustMatchCodePrefix: "S03.2" },
  { q: "avulsion dentaire", mustMatchCodePrefix: "S03.2" },
  { q: "jaw dislocation", mustMatchCodePrefix: "S03.0" },
  { q: "luxation de la mâchoire", mustMatchCodePrefix: "S03.0" },
  { q: "auricular hematoma", mustContainDescription: "ear" },
  { q: "hématome auriculaire", mustContainDescription: "ear" },
  { q: "septal hematoma", mustContainDescription: "nose" },
  { q: "hématome septal", mustContainDescription: "nose" },
  { q: "CSF leak after trauma", mustContainDescription: "cerebrospinal fluid leak" },
  { q: "fuite de LCR post-traumatique", mustContainDescription: "cerebrospinal fluid leak" },
  // Eye emergencies (Phase 11)
  { q: "corneal abrasion", mustMatchCodePrefix: "S05.0" },
  { q: "abrasion cornéenne", mustMatchCodePrefix: "S05.0" },
  { q: "corneal foreign body", mustMatchCodePrefix: "T15" },
  { q: "corps étranger cornéen", mustMatchCodePrefix: "T15" },
  { q: "corneal ulcer", mustMatchCodePrefix: "H16.0" },
  { q: "ulcère cornéen", mustMatchCodePrefix: "H16.0" },
  { q: "photokeratitis", mustMatchCodePrefix: "H16.13" },
  { q: "photokératite", mustMatchCodePrefix: "H16.13" },
  { q: "chemical eye injury", mustMatchCodePrefix: "T26" },
  { q: "brûlure chimique de l'oeil", mustMatchCodePrefix: "T26" },
  { q: "open globe", mustMatchCodePrefix: "S05.2" },
  { q: "globe oculaire ouvert", mustMatchCodePrefix: "S05.2" },
  { q: "hyphema", mustMatchCodePrefix: "H21.0" },
  { q: "hyphéma", mustMatchCodePrefix: "H21.0" },
  { q: "acute angle-closure glaucoma", mustMatchCodePrefix: "H40.21" },
  { q: "glaucome aigu", mustMatchCodePrefix: "H40.21" },
  { q: "retinal detachment", mustMatchCodePrefix: "H33.0" },
  { q: "décollement de la rétine", mustMatchCodePrefix: "H33.0" },
  { q: "vitreous hemorrhage", mustMatchCodePrefix: "H43.1" },
  { q: "hémorragie du vitré", mustMatchCodePrefix: "H43.1" },
  { q: "central retinal artery occlusion", mustMatchCodePrefix: "H34.1" },
  { q: "occlusion de l'artère rétinienne", mustMatchCodePrefix: "H34.1" },
  { q: "orbital cellulitis", mustMatchCodePrefix: "H05.01" },
  { q: "cellulite orbitaire", mustMatchCodePrefix: "H05.01" },
  { q: "preseptal cellulitis", mustMatchCodePrefix: "L03.213" },
  { q: "cellulite préseptale", mustMatchCodePrefix: "L03.213" },
  { q: "uveitis", mustMatchCodePrefix: "H20" },
  { q: "uvéite", mustMatchCodePrefix: "H20" },
  { q: "scleritis", mustMatchCodePrefix: "H15.0" },
  { q: "sclérite", mustMatchCodePrefix: "H15.0" },
  { q: "eyelid laceration", mustMatchCodePrefix: "S01.11" },
  { q: "lacération de la paupière", mustMatchCodePrefix: "S01.11" },
  { q: "endophthalmitis", mustMatchCodePrefix: "H44.0" },
  { q: "endophtalmie", mustMatchCodePrefix: "H44.0" },
  { q: "eye trauma", mustMatchCodePrefix: "S05" },
  { q: "traumatisme oculaire", mustMatchCodePrefix: "S05" },
  // ENT emergencies (Phase 12)
  { q: "ear pain", mustMatchCodePrefix: "H92" },
  { q: "douleur de l'oreille", mustMatchCodePrefix: "H92" },
  { q: "otitis externa", mustMatchCodePrefix: "H60" },
  { q: "otite externe", mustMatchCodePrefix: "H60" },
  { q: "malignant otitis externa", mustMatchCodePrefix: "H60.2" },
  { q: "otite externe maligne", mustMatchCodePrefix: "H60.2" },
  { q: "otitis media", mustMatchCodePrefix: "H66" },
  { q: "otite moyenne", mustMatchCodePrefix: "H66" },
  { q: "mastoiditis", mustMatchCodePrefix: "H70" },
  { q: "mastoïdite", mustMatchCodePrefix: "H70" },
  { q: "tympanic membrane perforation", mustMatchCodePrefix: "H72" },
  { q: "perforation tympanique", mustMatchCodePrefix: "H72" },
  { q: "sudden hearing loss", mustMatchCodePrefix: "H91.2" },
  { q: "surdité soudaine", mustMatchCodePrefix: "H91.2" },
  { q: "sudden sensorineural hearing loss", mustMatchCodePrefix: "H91.2" },
  { q: "surdité neurosensorielle soudaine", mustMatchCodePrefix: "H91.2" },
  { q: "vertigo", mustMatchCodePrefix: "H81" },
  { q: "vertige", mustMatchCodePrefix: "H81" },
  { q: "BPPV", mustMatchCodePrefix: "H81.1" },
  { q: "vertige positionnel paroxystique bénin", mustMatchCodePrefix: "H81.1" },
  { q: "vestibular neuritis", mustMatchCodePrefix: "H81.2" },
  { q: "névrite vestibulaire", mustMatchCodePrefix: "H81.2" },
  { q: "labyrinthitis", mustMatchCodePrefix: "H83" },
  { q: "labyrinthite", mustMatchCodePrefix: "H83" },
  { q: "Meniere disease", mustMatchCodePrefix: "H81.0" },
  { q: "maladie de Ménière", mustMatchCodePrefix: "H81.0" },
  { q: "facial nerve palsy", mustMatchCodePrefix: "G51" },
  { q: "paralysie faciale", mustMatchCodePrefix: "G51" },
  { q: "Bell palsy", mustMatchCodePrefix: "G51.0" },
  { q: "paralysie de Bell", mustMatchCodePrefix: "G51.0" },
  { q: "Ramsay Hunt syndrome", mustMatchCodePrefix: "B02.2" },
  { q: "syndrome de Ramsay Hunt", mustMatchCodePrefix: "B02.2" },
  { q: "epistaxis", mustMatchCodePrefix: "R04.0" },
  { q: "épistaxis", mustMatchCodePrefix: "R04.0" },
  { q: "posterior nosebleed", mustMatchCodePrefix: "R04.0" },
  { q: "saignement nasal postérieur", mustMatchCodePrefix: "R04.0" },
  { q: "nasal foreign body", mustMatchCodePrefix: "T17.1" },
  { q: "corps étranger nasal", mustMatchCodePrefix: "T17" },
  { q: "peritonsillar abscess", mustMatchCodePrefix: "J36" },
  { q: "abcès périamygdalien", mustMatchCodePrefix: "J36" },
  { q: "retropharyngeal abscess", mustMatchCodePrefix: "J39.0" },
  { q: "abcès rétropharyngé", mustMatchCodePrefix: "J39.0" },
  { q: "parapharyngeal abscess", mustMatchCodePrefix: "J39.0" },
  { q: "abcès parapharyngé", mustMatchCodePrefix: "J39.0" },
  { q: "deep neck infection", mustMatchCodePrefix: "J39" },
  { q: "infection profonde du cou", mustMatchCodePrefix: "J39" },
  { q: "Ludwig angina", mustMatchCodePrefix: "K12.2" },
  { q: "angine de Ludwig", mustMatchCodePrefix: "K12.2" },
  { q: "epiglottitis", mustMatchCodePrefix: "J05.1" },
  { q: "épiglottite", mustMatchCodePrefix: "J05.1" },
  { q: "supraglottitis", mustMatchCodePrefix: "J05.1" },
  { q: "supraglottite", mustMatchCodePrefix: "J05.1" },
  { q: "throat foreign body", mustMatchCodePrefix: "T17.2" },
  { q: "corps étranger de la gorge", mustMatchCodePrefix: "T17.2" },
  { q: "airway foreign body", mustMatchCodePrefix: "T17" },
  { q: "corps étranger des voies aériennes", mustMatchCodePrefix: "T17" },
  { q: "sialadenitis", mustMatchCodePrefix: "K11.2" },
  { q: "sialadénite", mustMatchCodePrefix: "K11.2" },
  { q: "salivary stone", mustMatchCodePrefix: "K11.5" },
  { q: "calcul salivaire", mustMatchCodePrefix: "K11.5" },
  { q: "salivary duct obstruction", mustMatchCodePrefix: "K11.5" },
  { q: "obstruction du canal salivaire", mustMatchCodePrefix: "K11.5" },
  // Soft tissue / wound infection (Phase 13)
  { q: "cellulitis", mustMatchCodePrefix: "L03" },
  { q: "cellulite", mustMatchCodePrefix: "L03" },
  { q: "erysipelas", mustMatchCodePrefix: "A46" },
  { q: "érysipèle", mustMatchCodePrefix: "A46" },
  { q: "facial cellulitis", mustContainDescription: "face" },
  { q: "cellulite faciale", mustContainDescription: "face" },
  { q: "hand cellulitis", mustContainDescription: "hand" },
  { q: "cellulite de la main", mustContainDescription: "hand" },
  { q: "leg cellulitis", mustContainDescription: "lower limb" },
  { q: "cellulite de la jambe", mustContainDescription: "lower limb" },
  { q: "foot cellulitis", mustContainDescription: "foot" },
  { q: "cellulite du pied", mustContainDescription: "foot" },
  { q: "skin abscess", mustMatchCodePrefix: "L02" },
  { q: "cutaneous abscess", mustMatchCodePrefix: "L02" },
  { q: "abcès cutané", mustMatchCodePrefix: "L02" },
  { q: "furuncle", mustContainDescription: "furuncle" },
  { q: "furoncle", mustContainDescription: "furuncle" },
  { q: "carbuncle", mustContainDescription: "carbuncle" },
  { q: "anthrax cutané", mustContainDescription: "carbuncle" },
  { q: "felon", mustContainDescription: "finger" },
  { q: "panaris pulpaire", mustContainDescription: "finger" },
  { q: "paronychia", mustContainDescription: "finger" },
  { q: "paronychie", mustContainDescription: "finger" },
  { q: "pilonidal abscess", mustMatchCodePrefix: "L05.0" },
  { q: "abcès pilonidal", mustMatchCodePrefix: "L05.0" },
  { q: "hidradenitis abscess", mustMatchCodePrefix: "L73.2" },
  { q: "abcès d'hidradénite", mustMatchCodePrefix: "L73.2" },
  { q: "infected wound", mustContainDescription: "cellulitis" },
  { q: "plaie infectée", mustContainDescription: "cellulitis" },
  { q: "infected traumatic wound", mustContainDescription: "cellulitis" },
  { q: "plaie traumatique infectée", mustContainDescription: "cellulitis" },
  { q: "surgical site infection", mustMatchCodePrefix: "T81.4" },
  { q: "infection du site opératoire", mustMatchCodePrefix: "T81.4" },
  { q: "postoperative wound infection", mustMatchCodePrefix: "T81.4" },
  { q: "infection postopératoire de plaie", mustMatchCodePrefix: "T81.4" },
  { q: "wound dehiscence", mustMatchCodePrefix: "T81.3" },
  { q: "déhiscence de plaie", mustMatchCodePrefix: "T81.3" },
  { q: "necrotizing fasciitis", mustMatchCodePrefix: "M72.6" },
  { q: "fasciite nécrosante", mustMatchCodePrefix: "M72.6" },
  { q: "necrotizing soft tissue infection", mustMatchCodePrefix: "M72.6" },
  { q: "infection nécrosante des tissus mous", mustMatchCodePrefix: "M72.6" },
  { q: "gas gangrene", mustMatchCodePrefix: "A48.0" },
  { q: "gangrène gazeuse", mustMatchCodePrefix: "A48.0" },
  { q: "Fournier gangrene", mustMatchCodePrefix: "N49.3" },
  { q: "gangrène de Fournier", mustMatchCodePrefix: "N49.3" },
  { q: "pyomyositis", mustMatchCodePrefix: "M60.0" },
  { q: "pyomyosite", mustMatchCodePrefix: "M60.0" },
  { q: "infectious myositis", mustMatchCodePrefix: "M60.0" },
  { q: "myosite infectieuse", mustMatchCodePrefix: "M60.0" },
  { q: "flexor tenosynovitis", mustMatchCodePrefix: "M65.1" },
  { q: "ténosynovite infectieuse des fléchisseurs", mustMatchCodePrefix: "M65.1" },
  { q: "deep space hand infection", mustContainDescription: "hand" },
  { q: "infection profonde de la main", mustContainDescription: "hand" },
  { q: "septic bursitis", mustMatchCodePrefix: "M71.1" },
  { q: "bursite septique", mustMatchCodePrefix: "M71.1" },
  { q: "diabetic foot infection", mustMatchCodePrefix: "E11.62" },
  { q: "infection du pied diabétique", mustMatchCodePrefix: "E11.62" },
  { q: "infected diabetic foot ulcer", mustMatchCodePrefix: "E11.62" },
  { q: "ulcère diabétique infecté", mustMatchCodePrefix: "E11.62" },
  { q: "infected pressure ulcer", mustContainDescription: "pressure ulcer" },
  { q: "escarre infectée", mustContainDescription: "pressure ulcer" },
  { q: "infected venous ulcer", mustContainDescription: "non-pressure chronic ulcer" },
  { q: "ulcère veineux infecté", mustContainDescription: "non-pressure chronic ulcer" },
  { q: "osteomyelitis from wound", mustContainDescription: "osteomyelitis" },
  { q: "ostéomyélite liée à une plaie", mustContainDescription: "osteomyelitis" },
  { q: "septic arthritis from wound", mustContainDescription: "arthritis" },
  { q: "arthrite septique liée à une plaie", mustContainDescription: "arthritis" },
  { q: "water exposed wound infection", mustContainDescription: "cellulitis" },
  { q: "infection de plaie exposée à l'eau", mustContainDescription: "cellulitis" },
  { q: "bite wound infection", mustMatchCodePrefix: "L03" },
  { q: "infection après morsure", mustMatchCodePrefix: "L03" },
  { q: "foreign body wound infection", mustContainDescription: "foreign body" },
  { q: "infection associée à un corps étranger", mustContainDescription: "foreign body" },
  // Dermatology (Phase 14)
  { q: "impetigo", mustMatchCodePrefix: "L01" },
  { q: "impétigo", mustMatchCodePrefix: "L01" },
  { q: "cold sore", mustMatchCodePrefix: "B00" },
  { q: "herpès labial", mustMatchCodePrefix: "B00" },
  { q: "cutaneous herpes simplex", mustMatchCodePrefix: "B00" },
  { q: "herpès cutané", mustMatchCodePrefix: "B00" },
  { q: "shingles", mustMatchCodePrefix: "B02" },
  { q: "zona", mustMatchCodePrefix: "B02" },
  { q: "ophthalmic zoster", mustMatchCodePrefix: "B02.3" },
  { q: "zona ophtalmique", mustMatchCodePrefix: "B02.3" },
  { q: "chickenpox", mustMatchCodePrefix: "B01" },
  { q: "varicelle", mustMatchCodePrefix: "B01" },
  { q: "molluscum contagiosum", mustMatchCodePrefix: "B08.1" },
  { q: "molluscum", mustMatchCodePrefix: "B08.1" },
  { q: "viral warts", mustMatchCodePrefix: "B07" },
  { q: "verrues virales", mustMatchCodePrefix: "B07" },
  { q: "hand foot and mouth disease", mustMatchCodePrefix: "B08.4" },
  { q: "syndrome pieds-mains-bouche", mustMatchCodePrefix: "B08.4" },
  { q: "ringworm", mustMatchCodePrefix: "B35" },
  { q: "teigne", mustMatchCodePrefix: "B35" },
  { q: "athlete's foot", mustMatchCodePrefix: "B35.3" },
  { q: "pied d'athlète", mustMatchCodePrefix: "B35.3" },
  { q: "jock itch", mustMatchCodePrefix: "B35.6" },
  { q: "mycose de l'aine", mustMatchCodePrefix: "B35.6" },
  { q: "cutaneous candidiasis", mustMatchCodePrefix: "B37.2" },
  { q: "candidose cutanée", mustMatchCodePrefix: "B37.2" },
  { q: "scabies", mustMatchCodePrefix: "B86" },
  { q: "scabiose", mustMatchCodePrefix: "B86" },
  { q: "head lice", mustMatchCodePrefix: "B85.0" },
  { q: "poux de tête", mustMatchCodePrefix: "B85.0" },
  { q: "atopic dermatitis", mustMatchCodePrefix: "L20" },
  { q: "eczema", mustMatchCodePrefix: "L20" },
  { q: "dermatite atopique", mustMatchCodePrefix: "L20" },
  { q: "eczéma", mustMatchCodePrefix: "L20" },
  { q: "seborrheic dermatitis", mustMatchCodePrefix: "L21" },
  { q: "dermatite séborrhéique", mustMatchCodePrefix: "L21" },
  { q: "allergic contact dermatitis", mustMatchCodePrefix: "L23" },
  { q: "dermite de contact allergique", mustMatchCodePrefix: "L23" },
  { q: "irritant contact dermatitis", mustMatchCodePrefix: "L24" },
  { q: "dermite de contact irritative", mustMatchCodePrefix: "L24" },
  { q: "intertrigo", mustMatchCodePrefix: "L30.4" },
  { q: "psoriasis", mustMatchCodePrefix: "L40" },
  { q: "lichen planus", mustMatchCodePrefix: "L43" },
  { q: "lichen plan", mustMatchCodePrefix: "L43" },
  { q: "hives", mustMatchCodePrefix: "L50" },
  { q: "urticaria", mustMatchCodePrefix: "L50" },
  { q: "urticaire", mustMatchCodePrefix: "L50" },
  { q: "rosacea", mustMatchCodePrefix: "L71" },
  { q: "rosacée", mustMatchCodePrefix: "L71" },
  { q: "stevens-johnson syndrome", mustMatchCodePrefix: "L51.1" },
  { q: "syndrome de stevens-johnson", mustMatchCodePrefix: "L51.1" },
  { q: "toxic epidermal necrolysis", mustMatchCodePrefix: "L51.2" },
  { q: "nécrolyse épidermique toxique", mustMatchCodePrefix: "L51.2" },
  { q: "dress syndrome", mustMatchCodePrefix: "D72.12" },
  { q: "syndrome dress", mustMatchCodePrefix: "D72.12" },
  { q: "pemphigus", mustMatchCodePrefix: "L10" },
  { q: "bullous pemphigoid", mustMatchCodePrefix: "L12" },
  { q: "pemphigoïde bulleuse", mustMatchCodePrefix: "L12" },
  { q: "melanoma", mustMatchCodePrefix: "C43" },
  { q: "mélanome", mustMatchCodePrefix: "C43" },
  { q: "basal cell carcinoma", mustMatchCodePrefix: "C44" },
  { q: "carcinome basocellulaire", mustMatchCodePrefix: "C44" },
  { q: "actinic keratosis", mustMatchCodePrefix: "L57.0" },
  { q: "kératose actinique", mustMatchCodePrefix: "L57.0" },
  { q: "seborrheic keratosis", mustMatchCodePrefix: "L82" },
  { q: "kératose séborrhéique", mustMatchCodePrefix: "L82" },
  { q: "pyoderma gangrenosum", mustMatchCodePrefix: "L88" },
  { q: "erythema nodosum", mustMatchCodePrefix: "L52" },
  { q: "érythème noueux", mustMatchCodePrefix: "L52" },
  { q: "cutaneous lupus", mustMatchCodePrefix: "L93" },
  { q: "lupus cutané", mustMatchCodePrefix: "L93" },
  { q: "vasculitis limited to skin", mustMatchCodePrefix: "L95" },
  { q: "vascularite limitée à la peau", mustMatchCodePrefix: "L95" },
  // Environmental exposure (Phase 15)
  { q: "heat stroke", mustMatchCodePrefix: "T67.0" },
  { q: "heatstroke", mustMatchCodePrefix: "T67.0" },
  { q: "coup de chaleur", mustMatchCodePrefix: "T67.0" },
  { q: "exertional heatstroke", mustMatchCodePrefix: "T67.02" },
  { q: "coup de chaleur d'exercice", mustMatchCodePrefix: "T67.02" },
  { q: "heat exhaustion", mustContainDescription: "heat exhaustion" },
  { q: "épuisement par la chaleur", mustContainDescription: "heat exhaustion" },
  { q: "heat cramps", mustMatchCodePrefix: "T67.2" },
  { q: "crampes de chaleur", mustMatchCodePrefix: "T67.2" },
  { q: "heat syncope", mustMatchCodePrefix: "T67.1" },
  { q: "syncope de chaleur", mustMatchCodePrefix: "T67.1" },
  { q: "heat edema", mustMatchCodePrefix: "T67.7" },
  { q: "oedème de chaleur", mustMatchCodePrefix: "T67.7" },
  { q: "hypothermia", mustMatchCodePrefix: "T68" },
  { q: "hypothermie", mustMatchCodePrefix: "T68" },
  { q: "immersion foot", mustMatchCodePrefix: "T69.02" },
  { q: "trench foot", mustMatchCodePrefix: "T69.02" },
  { q: "pied d'immersion", mustMatchCodePrefix: "T69.02" },
  { q: "immersion hand", mustMatchCodePrefix: "T69.01" },
  { q: "main d'immersion", mustMatchCodePrefix: "T69.01" },
  { q: "chilblains", mustMatchCodePrefix: "T69.1" },
  { q: "engelures", mustMatchCodePrefix: "T69.1" },
  // Frostnip has no dedicated ICD-10-CM code — maps to T69.8/T69.9 (other/unspecified
  // effects of reduced temperature), not the frostbite (T33/T34) dual-listed family.
  { q: "frostnip", mustContainDescription: "reduced temperature" },
  { q: "engelure superficielle", mustContainDescription: "reduced temperature" },
  { q: "drowning", mustContainDescription: "drowning" },
  { q: "noyade", mustContainDescription: "drowning" },
  { q: "near drowning", mustContainDescription: "drowning" },
  { q: "quasi-noyade", mustContainDescription: "drowning" },
  { q: "submersion injury", mustContainDescription: "submersion" },
  { q: "lésion de submersion", mustContainDescription: "submersion" },
  { q: "bathtub drowning", mustMatchCodePrefix: "W65" },
  { q: "noyade en baignoire", mustMatchCodePrefix: "W65" },
  { q: "swimming pool drowning", mustMatchCodePrefix: "W67" },
  { q: "noyade en piscine", mustMatchCodePrefix: "W67" },
  { q: "freshwater drowning", mustMatchCodePrefix: "W69" },
  { q: "natural water drowning", mustMatchCodePrefix: "W69" },
  { q: "noyade en eau douce", mustMatchCodePrefix: "W69" },
  { q: "lightning strike", mustMatchCodePrefix: "T75.0" },
  { q: "struck by lightning", mustMatchCodePrefix: "T75.01" },
  { q: "frappé par la foudre", mustMatchCodePrefix: "T75.01" },
  { q: "electrocution", mustMatchCodePrefix: "T75.4" },
  { q: "électrocution", mustMatchCodePrefix: "T75.4" },
  { q: "electric shock", mustContainDescription: "electric" },
  { q: "choc électrique", mustContainDescription: "electric" },
  { q: "high voltage injury", mustMatchCodePrefix: "W85" },
  { q: "exposition aux lignes électriques", mustMatchCodePrefix: "W85" },
  { q: "household electrical exposure", mustMatchCodePrefix: "W86.0" },
  { q: "exposition au câblage domestique", mustMatchCodePrefix: "W86.0" },
  { q: "high altitude sickness", mustMatchCodePrefix: "T70.2" },
  { q: "altitude sickness", mustMatchCodePrefix: "T70.2" },
  { q: "acute mountain sickness", mustMatchCodePrefix: "T70.2" },
  { q: "mal aigu des montagnes", mustMatchCodePrefix: "T70.2" },
  { q: "mal des montagnes", mustMatchCodePrefix: "T70.2" },
  // HACE/HAPE have no dedicated ICD-10-CM code — map to T70.2 (other/unspecified
  // effects of high altitude), per certification policy of never inventing codes.
  { q: "HACE", mustMatchCodePrefix: "T70.2" },
  { q: "HAPE", mustMatchCodePrefix: "T70.2" },
  { q: "high altitude cerebral edema", mustMatchCodePrefix: "T70.2" },
  { q: "high altitude pulmonary edema", mustMatchCodePrefix: "T70.2" },
  { q: "oedème cérébral de haute altitude", mustMatchCodePrefix: "T70.2" },
  { q: "oedème pulmonaire de haute altitude", mustMatchCodePrefix: "T70.2" },
  { q: "decompression sickness", mustMatchCodePrefix: "T70.3" },
  { q: "the bends", mustMatchCodePrefix: "T70.3" },
  { q: "caisson disease", mustMatchCodePrefix: "T70.3" },
  { q: "maladie de décompression", mustMatchCodePrefix: "T70.3" },
  { q: "maladie des caissons", mustMatchCodePrefix: "T70.3" },
  { q: "diver's ear", mustMatchCodePrefix: "T70.0" },
  { q: "barotraumatisme de l'oreille du plongeur", mustMatchCodePrefix: "T70.0" },
  { q: "sinus barotrauma", mustMatchCodePrefix: "T70.1" },
  { q: "barotraumatisme sinusien", mustMatchCodePrefix: "T70.1" },
  { q: "diving injury", mustMatchCodePrefix: "T70.4" },
  { q: "blessure de plongée", mustMatchCodePrefix: "T70.4" },
  { q: "radiation sickness", mustMatchCodePrefix: "T66" },
  { q: "acute radiation syndrome", mustMatchCodePrefix: "T66" },
  { q: "mal des rayons", mustMatchCodePrefix: "T66" },
  { q: "syndrome d'irradiation aiguë", mustMatchCodePrefix: "T66" },
  { q: "radiation exposure", mustMatchCodePrefix: "W88" },
  { q: "exposition aux radiations ionisantes", mustMatchCodePrefix: "W88" },
  { q: "x-ray exposure", mustMatchCodePrefix: "W88.0" },
  { q: "exposition aux rayons x", mustMatchCodePrefix: "W88.0" },
  // Welding-light exposure is external-cause context only — must not steal photokeratitis
  // (H16.13, Phase 11 eye emergencies) ownership.
  { q: "welding flash", mustMatchCodePrefix: "W89.0" },
  { q: "arc eye exposure", mustMatchCodePrefix: "W89.0" },
  { q: "exposition à la lumière de soudure", mustMatchCodePrefix: "W89.0" },
  { q: "tanning bed exposure", mustMatchCodePrefix: "W89.1" },
  { q: "exposition au lit de bronzage", mustMatchCodePrefix: "W89.1" },
  { q: "excessive heat exposure", mustContainDescription: "excessive" },
  { q: "exposition à la chaleur excessive", mustContainDescription: "excessive" },
  { q: "excessive cold exposure", mustContainDescription: "excessive" },
  { q: "exposition au froid excessif", mustContainDescription: "excessive" },
  { q: "sun exposure", mustMatchCodePrefix: "X32" },
  { q: "exposition au soleil", mustMatchCodePrefix: "X32" },
  { q: "dry ice exposure", mustMatchCodePrefix: "W93.0" },
  { q: "exposition à la glace sèche", mustMatchCodePrefix: "W93.0" },
  // Toxicology / envenomation (Phase 16)
  { q: "acetaminophen overdose", mustMatchCodePrefix: "T39.1" },
  { q: "acetaminophen poisoning", mustMatchCodePrefix: "T39.1" },
  { q: "surdosage au paracétamol", mustMatchCodePrefix: "T39.1" },
  { q: "intoxication au paracétamol", mustMatchCodePrefix: "T39.1" },
  { q: "salicylate toxicity", mustMatchCodePrefix: "T39.0" },
  { q: "aspirin overdose", mustMatchCodePrefix: "T39.0" },
  { q: "toxicité aux salicylates", mustMatchCodePrefix: "T39.0" },
  { q: "surdosage d'aspirine", mustMatchCodePrefix: "T39.0" },
  { q: "opioid overdose", mustMatchCodePrefix: "T40" },
  { q: "fentanyl overdose", mustMatchCodePrefix: "T40.4" },
  { q: "methadone overdose", mustMatchCodePrefix: "T40.3" },
  { q: "surdosage d'opioïde", mustMatchCodePrefix: "T40" },
  { q: "benzodiazepine overdose", mustMatchCodePrefix: "T42.4" },
  { q: "sedative overdose", mustMatchCodePrefix: "T42" },
  { q: "surdosage de benzodiazépine", mustMatchCodePrefix: "T42.4" },
  { q: "alcohol intoxication", mustContainDescription: "Alcohol" },
  { q: "intoxication alcoolique", mustContainDescription: "Alcohol" },
  { q: "alcohol withdrawal", mustContainDescription: "withdrawal" },
  { q: "sevrage alcoolique", mustContainDescription: "withdrawal" },
  { q: "delirium tremens", mustContainDescription: "withdrawal" },
  { q: "toxic alcohol poisoning", mustMatchCodePrefix: "T51" },
  { q: "methanol poisoning", mustMatchCodePrefix: "T51.1" },
  { q: "intoxication au méthanol", mustMatchCodePrefix: "T51.1" },
  { q: "ethylene glycol poisoning", mustMatchCodePrefix: "T52.3" },
  { q: "intoxication à l'éthylène glycol", mustMatchCodePrefix: "T52.3" },
  { q: "cocaine toxicity", mustContainDescription: "Cocaine" },
  { q: "toxicité à la cocaïne", mustContainDescription: "Cocaine" },
  { q: "methamphetamine intoxication", mustContainDescription: "stimulant" },
  { q: "intoxication à la méthamphétamine", mustContainDescription: "stimulant" },
  { q: "stimulant overdose", mustContainDescription: "stimulant" },
  { q: "cannabis intoxication", mustContainDescription: "Cannabis" },
  { q: "intoxication au cannabis", mustContainDescription: "Cannabis" },
  { q: "synthetic cannabinoid intoxication", mustContainDescription: "synthetic" },
  { q: "serotonin syndrome", mustMatchCodePrefix: "G90.81" },
  { q: "syndrome sérotoninergique", mustMatchCodePrefix: "G90.81" },
  { q: "neuroleptic malignant syndrome", mustMatchCodePrefix: "G21.0" },
  { q: "syndrome malin des neuroleptiques", mustMatchCodePrefix: "G21.0" },
  { q: "anticholinergic poisoning", mustMatchCodePrefix: "T44.3" },
  { q: "organophosphate poisoning", mustMatchCodePrefix: "T60.0" },
  { q: "intoxication aux organophosphorés", mustMatchCodePrefix: "T60.0" },
  { q: "cholinergic toxidrome", mustMatchCodePrefix: "T60.0" },
  { q: "beta blocker overdose", mustMatchCodePrefix: "T44.7" },
  { q: "surdosage de bêta-bloquant", mustMatchCodePrefix: "T44.7" },
  { q: "calcium channel blocker overdose", mustMatchCodePrefix: "T46.1" },
  { q: "surdosage d'inhibiteur calcique", mustMatchCodePrefix: "T46.1" },
  { q: "digoxin toxicity", mustMatchCodePrefix: "T46.0" },
  { q: "toxicité à la digoxine", mustMatchCodePrefix: "T46.0" },
  { q: "lithium toxicity", mustContainDescription: "other metals" },
  { q: "toxicité au lithium", mustContainDescription: "other metals" },
  { q: "iron poisoning", mustMatchCodePrefix: "T45.4" },
  { q: "intoxication au fer", mustMatchCodePrefix: "T45.4" },
  { q: "carbon monoxide poisoning", mustMatchCodePrefix: "T58" },
  { q: "intoxication au monoxyde de carbone", mustMatchCodePrefix: "T58" },
  { q: "cyanide poisoning", mustContainDescription: "cyanide" },
  { q: "intoxication au cyanure", mustContainDescription: "cyanide" },
  { q: "hydrogen sulfide exposure", mustContainDescription: "hydrogen sulfide" },
  { q: "exposition à l'hydrogène sulfuré", mustContainDescription: "hydrogen sulfide" },
  { q: "methemoglobinemia", mustMatchCodePrefix: "D74" },
  { q: "méthémoglobinémie", mustMatchCodePrefix: "D74" },
  { q: "caustic ingestion", mustContainDescription: "corrosive" },
  { q: "ingestion caustique", mustContainDescription: "corrosive" },
  { q: "hydrocarbon ingestion", mustMatchCodePrefix: "T52" },
  { q: "ingestion d'hydrocarbures", mustMatchCodePrefix: "T52" },
  { q: "pesticide poisoning", mustMatchCodePrefix: "T60" },
  { q: "intoxication par pesticide", mustMatchCodePrefix: "T60" },
  { q: "mushroom poisoning", mustMatchCodePrefix: "T62.0" },
  { q: "intoxication par champignons", mustMatchCodePrefix: "T62.0" },
  { q: "plant poisoning", mustMatchCodePrefix: "T62.2" },
  { q: "intoxication par plantes", mustMatchCodePrefix: "T62.2" },
  { q: "snake envenomation", mustMatchCodePrefix: "T63.0" },
  { q: "venomous snake bite", mustMatchCodePrefix: "T63.0" },
  { q: "envenimation par serpent", mustMatchCodePrefix: "T63.0" },
  { q: "spider envenomation", mustMatchCodePrefix: "T63.3" },
  { q: "black widow bite", mustMatchCodePrefix: "T63.31" },
  { q: "brown recluse bite", mustMatchCodePrefix: "T63.33" },
  { q: "envenimation par araignée", mustMatchCodePrefix: "T63.3" },
  { q: "scorpion sting", mustMatchCodePrefix: "T63.2" },
  { q: "piqûre de scorpion", mustMatchCodePrefix: "T63.2" },
  { q: "marine envenomation", mustMatchCodePrefix: "T63.6" },
  { q: "envenimation marine", mustMatchCodePrefix: "T63.6" },
  { q: "unknown ingestion", mustMatchCodePrefix: "T50.9" },
  { q: "ingestion inconnue", mustMatchCodePrefix: "T50.9" },
  { q: "mixed overdose", mustMatchCodePrefix: "T50.9" },
  { q: "surdosage mixte", mustMatchCodePrefix: "T50.9" },
  { q: "intentional overdose", mustContainDescription: "intentional self-harm" },
  { q: "surdosage intentionnel", mustContainDescription: "intentional self-harm" },
  // OB/GYN / urology (Phase 17)
  { q: "pregnancy of unknown location", mustMatchCodePrefix: "O02.81" },
  { q: "grossesse de localisation inconnue", mustMatchCodePrefix: "O02.81" },
  { q: "threatened abortion", mustMatchCodePrefix: "O20.0" },
  { q: "threatened miscarriage", mustMatchCodePrefix: "O20.0" },
  { q: "menace d'avortement", mustMatchCodePrefix: "O20.0" },
  { q: "spontaneous abortion", mustMatchCodePrefix: "O03" },
  { q: "avortement spontané", mustMatchCodePrefix: "O03" },
  { q: "ectopic pregnancy", mustMatchCodePrefix: "O00" },
  { q: "grossesse ectopique", mustMatchCodePrefix: "O00" },
  { q: "hyperemesis gravidarum", mustMatchCodePrefix: "O21" },
  { q: "hyperémèse gravidique", mustMatchCodePrefix: "O21" },
  { q: "preeclampsia", mustMatchCodePrefix: "O14" },
  { q: "prééclampsie", mustMatchCodePrefix: "O14" },
  { q: "HELLP syndrome", mustMatchCodePrefix: "O14.2" },
  { q: "syndrome HELLP", mustMatchCodePrefix: "O14.2" },
  { q: "preterm labor", mustMatchCodePrefix: "O60" },
  { q: "travail prématuré", mustMatchCodePrefix: "O60" },
  { q: "rupture of membranes", mustMatchCodePrefix: "O42" },
  { q: "rupture prématurée des membranes", mustMatchCodePrefix: "O42" },
  { q: "postpartum hemorrhage", mustMatchCodePrefix: "O72" },
  { q: "hémorragie post-partum", mustMatchCodePrefix: "O72" },
  { q: "postpartum endometritis", mustMatchCodePrefix: "O86.12" },
  { q: "endométrite post-partum", mustMatchCodePrefix: "O86.12" },
  { q: "ovarian torsion", mustMatchCodePrefix: "N83.5" },
  { q: "torsion ovarienne", mustMatchCodePrefix: "N83.5" },
  { q: "ovarian cyst", mustMatchCodePrefix: "N83.2" },
  { q: "kyste ovarien", mustMatchCodePrefix: "N83.2" },
  { q: "pelvic inflammatory disease", mustMatchCodePrefix: "N73" },
  { q: "maladie pelvienne inflammatoire", mustMatchCodePrefix: "N73" },
  { q: "tubo-ovarian abscess", mustMatchCodePrefix: "N70" },
  { q: "abcès tubo-ovarien", mustMatchCodePrefix: "N70" },
  { q: "Bartholin cyst", mustMatchCodePrefix: "N75" },
  { q: "kyste de Bartholin", mustMatchCodePrefix: "N75" },
  { q: "postmenopausal bleeding", mustMatchCodePrefix: "N95.0" },
  { q: "saignement postménopausique", mustMatchCodePrefix: "N95.0" },
  { q: "IUD complication", mustMatchCodePrefix: "T83.3" },
  { q: "complication DIU", mustMatchCodePrefix: "T83.3" },
  { q: "kidney stone", mustMatchCodePrefix: "N20" },
  { q: "calcul du rein", mustMatchCodePrefix: "N20" },
  { q: "pyelonephritis", mustMatchCodePrefix: "N10" },
  { q: "pyélonéphrite", mustMatchCodePrefix: "N10" },
  { q: "cystitis", mustMatchCodePrefix: "N30" },
  { q: "cystite", mustMatchCodePrefix: "N30" },
  { q: "hematuria", mustMatchCodePrefix: "R31" },
  { q: "hématurie", mustMatchCodePrefix: "R31" },
  { q: "urinary retention", mustMatchCodePrefix: "R33" },
  { q: "rétention urinaire", mustMatchCodePrefix: "R33" },
  { q: "testicular torsion", mustMatchCodePrefix: "N44" },
  { q: "torsion testiculaire", mustMatchCodePrefix: "N44" },
  { q: "epididymitis", mustMatchCodePrefix: "N45" },
  { q: "épididymite", mustMatchCodePrefix: "N45" },
  { q: "prostatitis", mustMatchCodePrefix: "N41" },
  { q: "prostatite", mustMatchCodePrefix: "N41" },
  { q: "urethritis", mustMatchCodePrefix: "N34" },
  { q: "urétrite", mustMatchCodePrefix: "N34" },
  { q: "priapism", mustMatchCodePrefix: "N48.3" },
  { q: "priapisme", mustMatchCodePrefix: "N48.3" },
  { q: "paraphimosis", mustMatchCodePrefix: "N47.2" },
  { q: "penile fracture", mustMatchCodePrefix: "S39.840" },
  // Psychiatric / behavioral (Phase 18)
  { q: "suicidal ideation", mustMatchCodePrefix: "R45.851" },
  { q: "idées suicidaires", mustMatchCodePrefix: "R45.851" },
  { q: "passive suicidal ideation", mustMatchCodePrefix: "R45.851" },
  { q: "idées suicidaires passives", mustMatchCodePrefix: "R45.851" },
  { q: "suicide attempt", mustMatchCodePrefix: "T14.91" },
  { q: "tentative de suicide", mustMatchCodePrefix: "T14.91" },
  { q: "intentional self harm", mustContainDescription: "intentional self-harm" },
  { q: "automutilation intentionnelle", mustContainDescription: "intentional self-harm" },
  { q: "self inflicted injury", mustContainDescription: "intentional self-harm" },
  { q: "blessure auto-infligée", mustContainDescription: "intentional self-harm" },
  { q: "nonsuicidal self injury", mustMatchCodePrefix: "R45.88" },
  { q: "automutilation non suicidaire", mustMatchCodePrefix: "R45.88" },
  { q: "self cutting", mustMatchCodePrefix: "R45.88" },
  { q: "automutilation par coupures", mustMatchCodePrefix: "R45.88" },
  { q: "overdose with suicidal intent", mustContainDescription: "intentional self-harm" },
  { q: "surdosage avec intention suicidaire", mustContainDescription: "intentional self-harm" },
  { q: "history of suicide attempt", mustMatchCodePrefix: "Z91.51" },
  { q: "antécédents de tentative de suicide", mustMatchCodePrefix: "Z91.51" },
  { q: "homicidal ideation", mustMatchCodePrefix: "R45.850" },
  { q: "idées homicidaires", mustMatchCodePrefix: "R45.850" },
  { q: "acute psychosis", mustMatchCodePrefix: "F29" },
  { q: "psychose aiguë", mustMatchCodePrefix: "F29" },
  { q: "unspecified psychosis", mustMatchCodePrefix: "F29" },
  { q: "psychose non précisée", mustMatchCodePrefix: "F29" },
  { q: "first episode psychosis", mustMatchCodePrefix: "F23" },
  { q: "premier épisode psychotique", mustMatchCodePrefix: "F23" },
  { q: "hallucinations", mustMatchCodePrefix: "R44.3" },
  { q: "hallucinations auditives", mustMatchCodePrefix: "R44.0" },
  { q: "auditory hallucinations", mustMatchCodePrefix: "R44.0" },
  { q: "command hallucinations", mustMatchCodePrefix: "R44.0" },
  { q: "hallucinations imperatives", mustMatchCodePrefix: "R44.0" },
  { q: "delusions", mustMatchCodePrefix: "F22" },
  { q: "délire", mustMatchCodePrefix: "F22" },
  { q: "paranoia", mustMatchCodePrefix: "F22" },
  { q: "paranoïa", mustMatchCodePrefix: "F22" },
  { q: "schizophrenia", mustMatchCodePrefix: "F20" },
  { q: "schizophrénie", mustMatchCodePrefix: "F20" },
  { q: "substance induced psychosis", mustMatchCodePrefix: "F1", mustContainDescription: "psychotic" },
  { q: "psychose induite par substance", mustMatchCodePrefix: "F1", mustContainDescription: "psychotic" },
  { q: "mania", mustMatchCodePrefix: "F30" },
  { q: "manie", mustMatchCodePrefix: "F30" },
  { q: "manic episode", mustMatchCodePrefix: "F30" },
  { q: "épisode maniaque", mustMatchCodePrefix: "F30" },
  { q: "bipolar disorder", mustMatchCodePrefix: "F31" },
  { q: "trouble bipolaire", mustMatchCodePrefix: "F31" },
  { q: "severe depression", mustMatchCodePrefix: "F32" },
  { q: "dépression sévère", mustMatchCodePrefix: "F32" },
  { q: "major depressive disorder", mustMatchCodePrefix: "F32" },
  { q: "trouble dépressif majeur", mustMatchCodePrefix: "F32" },
  { q: "depression with psychotic features", mustMatchCodePrefix: "F32.3" },
  { q: "dépression avec symptômes psychotiques", mustMatchCodePrefix: "F32.3" },
  { q: "postpartum psychosis", mustMatchCodePrefix: "F53.1" },
  { q: "psychose post-partum", mustMatchCodePrefix: "F53.1" },
  { q: "postpartum depression", mustMatchCodePrefix: "F53.0" },
  { q: "dépression post-partum", mustMatchCodePrefix: "F53.0" },
  { q: "panic attack", mustMatchCodePrefix: "F41.0" },
  { q: "crise de panique", mustMatchCodePrefix: "F41.0" },
  { q: "panic disorder", mustMatchCodePrefix: "F41.0" },
  { q: "trouble panique", mustMatchCodePrefix: "F41.0" },
  { q: "anxiety", mustMatchCodePrefix: "F41.9" },
  { q: "anxiété", mustMatchCodePrefix: "F41.9" },
  { q: "acute stress reaction", mustMatchCodePrefix: "F43.0" },
  { q: "réaction au stress aigu", mustMatchCodePrefix: "F43.0" },
  { q: "post traumatic stress disorder", mustMatchCodePrefix: "F43.1" },
  { q: "état de stress post-traumatique", mustMatchCodePrefix: "F43.1" },
  { q: "PTSD", mustMatchCodePrefix: "F43.1" },
  { q: "ESPT", mustMatchCodePrefix: "F43.1" },
  { q: "dissociation", mustMatchCodePrefix: "F44" },
  { q: "adjustment disorder", mustMatchCodePrefix: "F43.2" },
  { q: "trouble adaptatif", mustMatchCodePrefix: "F43.2" },
  { q: "grief reaction", mustMatchCodePrefix: "F43.81" },
  { q: "réaction de deuil", mustMatchCodePrefix: "F43.81" },
  { q: "delirium", mustMatchCodePrefix: "F05" },
  { q: "délirium", mustMatchCodePrefix: "F05" },
  { q: "acute confusion", mustMatchCodePrefix: "R41.0" },
  { q: "confusion aiguë", mustMatchCodePrefix: "R41.0" },
  { q: "altered mental status", mustMatchCodePrefix: "R41.82" },
  { q: "altération de l'état mental", mustMatchCodePrefix: "R41.82" },
  { q: "dementia with behavioral disturbance", mustMatchCodePrefix: "F03", mustContainDescription: "behavioral disturbance" },
  { q: "démence avec perturbation comportementale", mustMatchCodePrefix: "F03", mustContainDescription: "behavioral disturbance" },
  { q: "wandering", mustMatchCodePrefix: "Z91.83" },
  { q: "errance", mustMatchCodePrefix: "Z91.83" },
  { q: "catatonia", mustMatchCodePrefix: "F06.1" },
  { q: "catatonie", mustMatchCodePrefix: "F06.1" },
  { q: "malignant catatonia", mustMatchCodePrefix: "F06.1" },
  { q: "catatonie maligne", mustMatchCodePrefix: "F06.1" },
  { q: "agitation", mustMatchCodePrefix: "R45.1" },
  { q: "aggressive behavior", mustMatchCodePrefix: "R45.6" },
  { q: "comportement agressif", mustMatchCodePrefix: "R45.6" },
  { q: "violent behavior", mustMatchCodePrefix: "R45.6" },
  { q: "comportement violent", mustMatchCodePrefix: "R45.6" },
  { q: "behavioral crisis", mustMatchCodePrefix: "R45.89" },
  { q: "crise comportementale", mustMatchCodePrefix: "R45.89" },
  { q: "autism behavioral crisis", mustMatchCodePrefix: "F84.0" },
  { q: "crise comportementale autisme", mustMatchCodePrefix: "F84.0" },
  { q: "pediatric behavioral emergency", mustMatchCodePrefix: "F91" },
  { q: "urgence comportementale pédiatrique", mustMatchCodePrefix: "F91" },
  { q: "adolescent suicidal ideation", mustMatchCodePrefix: "R45.851" },
  { q: "idées suicidaires adolescent", mustMatchCodePrefix: "R45.851" },
  { q: "intellectual disability with behavioral disturbance", mustMatchCodePrefix: "F7" },
  { q: "déficience intellectuelle avec perturbation comportementale", mustMatchCodePrefix: "F7" },
  { q: "anorexia nervosa", mustMatchCodePrefix: "F50.0" },
  { q: "anorexie mentale", mustMatchCodePrefix: "F50.0" },
  { q: "bulimia nervosa", mustMatchCodePrefix: "F50.2" },
  { q: "boulimie", mustMatchCodePrefix: "F50.2" },
  { q: "binge eating disorder", mustMatchCodePrefix: "F50.81" },
  { q: "hyperphagie boulimique", mustMatchCodePrefix: "F50.81" },
  { q: "avoidant restrictive food intake disorder", mustMatchCodePrefix: "F50.82" },
  { q: "trouble restrictif de l'alimentation", mustMatchCodePrefix: "F50.82" },
  { q: "eating disorder", mustMatchCodePrefix: "F50.9" },
  { q: "trouble alimentaire", mustMatchCodePrefix: "F50.9" },
  { q: "refusal of treatment", mustMatchCodePrefix: "Z53.2" },
  { q: "refus de traitement", mustMatchCodePrefix: "Z53.2" },
  { q: "informed refusal", mustMatchCodePrefix: "Z53.2" },
  { q: "refus éclairé", mustMatchCodePrefix: "Z53.2" },
  { q: "against medical advice", mustMatchCodePrefix: "Z53.21" },
  { q: "contre avis médical", mustMatchCodePrefix: "Z53.21" },
  { q: "AMA", mustMatchCodePrefix: "Z53.21" },
  { q: "elopement", mustMatchCodePrefix: "Z53.21" },
  { q: "fugue", mustMatchCodePrefix: "Z53.21" },
  { q: "involuntary psychiatric evaluation", mustMatchCodePrefix: "Z04.6" },
  { q: "évaluation psychiatrique involontaire", mustMatchCodePrefix: "Z04.6" },
  { q: "emergency detention", mustMatchCodePrefix: "Z04.6" },
  { q: "rétention d'urgence", mustMatchCodePrefix: "Z04.6" },
  { q: "psychiatric observation", mustMatchCodePrefix: "Z03.89" },
  { q: "observation psychiatrique", mustMatchCodePrefix: "Z03.89" },
];

function encounterChar(code: string): string {
  return code.replace(/\./g, "").slice(-1).toUpperCase();
}

async function searchCatalog(prisma: PrismaClient, q: string, take = 25): Promise<SearchRow[]> {
  const match = buildIcd10CatalogSearchMatch(q);
  if (!match) return [];
  const releaseVersion = process.argv.find((a) => a.startsWith("--release="))?.slice("--release=".length).trim() || "FY2026";
  return prisma.$queryRaw<SearchRow[]>(buildIcd10CatalogSearchSelectSql(match, take, { releaseVersion }));
}

async function main() {
  const prisma = new PrismaClient();
  const failures: string[] = [];
  try {
    for (const req of REQUIRED_QUERIES) {
      const rows = await searchCatalog(prisma, req.q);
      if (rows.length === 0) {
        failures.push(`No results for "${req.q}"`);
        continue;
      }
      if (req.mustContainDescription) {
        const needle = req.mustContainDescription.toLowerCase();
        const hit = rows.some((r) => r.shortDescription.toLowerCase().includes(needle));
        if (!hit) failures.push(`"${req.q}" missing description containing "${req.mustContainDescription}"`);
      }
      if (req.mustMatchCodePrefix) {
        const hit = rows.some((r) => r.code.startsWith(req.mustMatchCodePrefix!));
        if (!hit) {
          failures.push(
            `"${req.q}" missing code prefix ${req.mustMatchCodePrefix} (top=${rows[0]?.code ?? "none"})`,
          );
        }
      }
      const first = rows[0]!;
      const firstSequelaIdx = rows.findIndex((r) => encounterChar(r.code) === "S");
      const firstInitialIdx = rows.findIndex((r) => encounterChar(r.code) === "A");
      if (firstSequelaIdx === 0 && firstInitialIdx > 0) {
        failures.push(`"${req.q}" sequela dominates (first=${first.code})`);
      }
      if (encounterChar(first.code) === "S" && rows.some((r) => encounterChar(r.code) === "A")) {
        failures.push(`"${req.q}" ranked sequela before available initial encounter`);
      }
      const codes = rows.map((r) => r.code);
      if (new Set(codes).size !== codes.length) {
        failures.push(`"${req.q}" returned duplicate ICD codes`);
      }
    }

    const report = {
      generatedAt: new Date().toISOString(),
      queryCount: REQUIRED_QUERIES.length,
      failures,
      pass: failures.length === 0,
    };
    console.log(JSON.stringify(report, null, 2));
    const summaryDir = resolve(__dirname, "certification-summaries");
    mkdirSync(summaryDir, { recursive: true });
    writeFileSync(join(summaryDir, "fy2026-search-summary.json"), JSON.stringify(report, null, 2));
    const burnQueryCount = REQUIRED_QUERIES.filter((row) =>
      /burn|frostbite|inhalation|sunburn|scald|grease|steam|lightning|chemical|acid|alkali|electrical|airway|cold injury|genital|facial|hand burn|foot burn|circumferential|thermal|partial-thickness|full-thickness|first-degree|second-degree|third-degree|superficial burn/.test(
        row.q.toLowerCase()
      )
    ).length;
    writeFileSync(
      join(summaryDir, "fy2026-burn-search-summary.json"),
      JSON.stringify(
        {
          generatedAt: report.generatedAt,
          queryCount: burnQueryCount,
          failures: failures.filter((f) =>
            /burn|frostbite|inhalation|sunburn|scald|grease|steam|lightning|chemical|acid|alkali|electrical|airway|cold injury|genital|facial|hand burn|foot burn|thermal|partial|full-thickness|first-degree|second-degree|third-degree|superficial/.test(
              f.toLowerCase()
            )
          ),
          pass: failures.length === 0,
        },
        null,
        2
      )
    );
    const penetratingQueryPattern =
      /penetrating|gunshot|firearm|bullet|stab|knife|impalement|retained projectile|retained bullet|shotgun|pellet|bb gun|puncture|through-and-through|blessure par balle|plaie par balle|arme à feu|projectile retenu|arme blanche|coup de couteau|traumatisme pénétrant|plaie pénétrante|empalement|blessure thoracique|blessure abdominale|blessure cervicale|blessure oculaire/;
    const penetratingQueryCount = REQUIRED_QUERIES.filter((row) => penetratingQueryPattern.test(row.q)).length;
    const penetratingSummary = JSON.stringify(
      {
        generatedAt: report.generatedAt,
        queryCount: penetratingQueryCount,
        failures: failures.filter((failure) => penetratingQueryPattern.test(failure.toLowerCase())),
        pass: failures.filter((failure) => penetratingQueryPattern.test(failure.toLowerCase())).length === 0,
      },
      null,
      2
    );
    writeFileSync(join(summaryDir, "fy2026-penetrating-trauma-search-summary.json"), penetratingSummary);
    const releaseSummaryDir = join(summaryDir, "2026");
    mkdirSync(releaseSummaryDir, { recursive: true });
    writeFileSync(join(releaseSummaryDir, "fy2026-penetrating-trauma-search-summary.json"), penetratingSummary);
    const blastQueryPattern = /multiple injuries|traumatic shock|rupture ear drum|otitic barotrauma|explosion of blasting material|discharge of firework|asphyxiation due to cave-in|blessures multiples|choc traumatique|barotraumatisme otitique|explosion de matériau|feu d'artifice/;
    const blastFailures = failures.filter((failure) => blastQueryPattern.test(failure.toLowerCase()));
    const blastSummary = JSON.stringify({
      generatedAt: report.generatedAt,
      queryCount: REQUIRED_QUERIES.filter((row) => blastQueryPattern.test(row.q)).length,
      failures: blastFailures,
      pass: blastFailures.length === 0,
    }, null, 2);
    writeFileSync(join(summaryDir, "fy2026-blast-polytrauma-search-summary.json"), blastSummary);
    writeFileSync(join(releaseSummaryDir, "fy2026-blast-polytrauma-search-summary.json"), blastSummary);
    const humanBiteQueryPattern =
      /human bite|morsure humaine|fight bite|clenched fist|knuckle bite|morsure du poing|contaminated wound|plaie contaminée|dirty wound|plaie sale/;
    const humanBiteFailures = failures.filter((failure) => humanBiteQueryPattern.test(failure.toLowerCase()));
    const humanBiteSummary = JSON.stringify(
      {
        generatedAt: report.generatedAt,
        queryCount: REQUIRED_QUERIES.filter((row) => humanBiteQueryPattern.test(row.q)).length,
        failures: humanBiteFailures,
        pass: humanBiteFailures.length === 0,
      },
      null,
      2,
    );
    writeFileSync(join(summaryDir, "fy2026-human-bite-high-risk-wound-search-summary.json"), humanBiteSummary);
    writeFileSync(join(releaseSummaryDir, "fy2026-human-bite-high-risk-wound-search-summary.json"), humanBiteSummary);
    const bitesQueryPattern =
      /animal bite|dog bite|cat bite|bat bite|human bite|morsure|fight bite|clenched fist|contaminated wound|dirty wound|water-exposed|farm wound|flexor tenosynovitis|bite cellulitis|deep-space hand|plaie contamin|plaie sale|plaie infect/;
    const bitesFailures = failures.filter((failure) => bitesQueryPattern.test(failure.toLowerCase()));
    const bitesSummary = JSON.stringify(
      {
        generatedAt: report.generatedAt,
        queryCount: REQUIRED_QUERIES.filter((row) => bitesQueryPattern.test(row.q)).length,
        failures: bitesFailures,
        pass: bitesFailures.length === 0,
      },
      null,
      2,
    );
    writeFileSync(join(summaryDir, "fy2026-bites-contaminated-wounds-search-summary.json"), bitesSummary);
    writeFileSync(join(releaseSummaryDir, "fy2026-bites-contaminated-wounds-search-summary.json"), bitesSummary);
    const spineQueryPattern = /sciatica|radiculopathy|radiculopathie|cauda equina|queue de cheval|spinal cord injury|lésion médullaire|epidural abscess|abcès épidural|neck pain|low back pain|herniated disc|spinal stenosis|myelopathy|myélopathie|compression|fracture cervicale|fracture lombaire|SCIWORA|sciatique|lombalgie|hernie discale|sténose|Brown-Sequard|Brown-Séquard|choc neurogène|choc spinal|central cord|anterior cord|conus|discite|osteomyelitis|ostéomyélite|cord compression|compression médullaire|vertebral|vertébrale|burst fracture|fracture éclatement|cervical strain|lumbar strain|entorse|douleur cervicale/;
    const spineFailures = failures.filter((failure) => spineQueryPattern.test(failure.toLowerCase()));
    const spineSummary = JSON.stringify({ generatedAt: report.generatedAt, queryCount: REQUIRED_QUERIES.filter((row) => spineQueryPattern.test(row.q)).length, failures: spineFailures, pass: spineFailures.length === 0 }, null, 2);
    writeFileSync(join(summaryDir, "fy2026-spine-back-search-summary.json"), spineSummary);
    writeFileSync(join(releaseSummaryDir, "fy2026-spine-back-search-summary.json"), spineSummary);
    const headFacialTraumaQueryPattern =
      /head injury|traumatisme crânien|concussion|commotion cérébrale|mild tbi|traumatic brain injury|tcc léger|epidural hematoma|hématome épidural|subdural hematoma|hématome sous-dural|traumatic sah|subarachnoid hemorrhage|hémorragie sous-arachnoïdienne|skull fracture|fracture du crâne|basilar skull|fracture de la base du crâne|nasal fracture|fracture nasale|orbital fracture|fracture orbitaire|zygomatic fracture|fracture zygomatique|maxillary fracture|fracture maxillaire|mandibular fracture|fracture mandibulaire|le fort|lefort|dental trauma|traumatisme dentaire|tooth avulsion|avulsion dentaire|jaw dislocation|luxation de la mâchoire|auricular hematoma|hématome auriculaire|septal hematoma|hématome septal|csf leak|fuite de lcr/;
    const headFacialTraumaFailures = failures.filter((failure) => headFacialTraumaQueryPattern.test(failure.toLowerCase()));
    const headFacialTraumaSummary = JSON.stringify(
      {
        generatedAt: report.generatedAt,
        queryCount: REQUIRED_QUERIES.filter((row) => headFacialTraumaQueryPattern.test(row.q.toLowerCase())).length,
        failures: headFacialTraumaFailures,
        pass: headFacialTraumaFailures.length === 0,
      },
      null,
      2,
    );
    writeFileSync(join(summaryDir, "fy2026-head-facial-trauma-search-summary.json"), headFacialTraumaSummary);
    writeFileSync(join(releaseSummaryDir, "fy2026-head-facial-trauma-search-summary.json"), headFacialTraumaSummary);
    const eyeEmergenciesQueryPattern =
      /corneal abrasion|abrasion cornéenne|corneal foreign body|corps étranger cornéen|corneal ulcer|ulcère cornéen|photokeratitis|photokératite|chemical eye injury|brûlure chimique de l'oeil|open globe|globe oculaire ouvert|hyphema|hyphéma|acute angle-closure glaucoma|glaucome aigu|retinal detachment|décollement de la rétine|vitreous hemorrhage|hémorragie du vitré|central retinal artery occlusion|occlusion de l'artère rétinienne|orbital cellulitis|cellulite orbitaire|preseptal cellulitis|cellulite préseptale|uveitis|uvéite|scleritis|sclérite|eyelid laceration|lacération de la paupière|endophthalmitis|endophtalmie|eye trauma|traumatisme oculaire/;
    const eyeEmergenciesFailures = failures.filter((failure) => eyeEmergenciesQueryPattern.test(failure.toLowerCase()));
    const eyeEmergenciesSummary = JSON.stringify(
      {
        generatedAt: report.generatedAt,
        queryCount: REQUIRED_QUERIES.filter((row) => eyeEmergenciesQueryPattern.test(row.q.toLowerCase())).length,
        failures: eyeEmergenciesFailures,
        pass: eyeEmergenciesFailures.length === 0,
      },
      null,
      2,
    );
    writeFileSync(join(summaryDir, "fy2026-eye-emergencies-search-summary.json"), eyeEmergenciesSummary);
    writeFileSync(join(releaseSummaryDir, "fy2026-eye-emergencies-search-summary.json"), eyeEmergenciesSummary);
    const entEmergenciesQueryPattern =
      /ear pain|douleur de l'oreille|otitis externa|otite externe|malignant otitis|otite externe maligne|otitis media|otite moyenne|mastoiditis|mastoïdite|tympanic membrane|perforation tympanique|sudden hearing|surdité soudaine|sudden sensorineural|surdité neurosensorielle|vertigo|vertige|bppv|vertige positionnel|vestibular neuritis|névrite vestibulaire|labyrinthitis|labyrinthite|meniere|ménière|facial nerve|paralysie faciale|bell palsy|paralysie de bell|ramsay hunt|epistaxis|épistaxis|posterior nosebleed|saignement nasal|nasal foreign body|corps étranger nasal|peritonsillar|périamygdalien|retropharyngeal|rétropharyngé|parapharyngeal|parapharyngé|deep neck|infection profonde du cou|ludwig|epiglottitis|épiglottite|supraglottitis|supraglottite|throat foreign body|corps étranger de la gorge|airway foreign body|corps étranger des voies aériennes|sialadenitis|sialadénite|salivary stone|calcul salivaire|salivary duct|obstruction du canal salivaire/;
    const entEmergenciesFailures = failures.filter((failure) => entEmergenciesQueryPattern.test(failure.toLowerCase()));
    const entEmergenciesSummary = JSON.stringify(
      {
        generatedAt: report.generatedAt,
        queryCount: REQUIRED_QUERIES.filter((row) => entEmergenciesQueryPattern.test(row.q.toLowerCase())).length,
        failures: entEmergenciesFailures,
        pass: entEmergenciesFailures.length === 0,
      },
      null,
      2,
    );
    writeFileSync(join(summaryDir, "fy2026-ent-emergencies-search-summary.json"), entEmergenciesSummary);
    writeFileSync(join(releaseSummaryDir, "fy2026-ent-emergencies-search-summary.json"), entEmergenciesSummary);
    const softTissueWoundInfectionQueryPattern =
      /cellulitis|cellulite|erysipelas|érysipèle|facial cellulitis|hand cellulitis|leg cellulitis|foot cellulitis|skin abscess|cutaneous abscess|abcès cutané|furuncle|furoncle|carbuncle|anthrax cutané|felon|panaris|paronychia|paronychie|pilonidal|hidradenitis|hidradénite|infected wound|plaie infectée|infected traumatic|plaie traumatique infectée|surgical site|infection du site opératoire|postoperative wound|infection postopératoire|wound dehiscence|déhiscence|necrotizing|fasciite nécrosante|gas gangrene|gangrène gazeuse|fournier|gangrène de fournier|pyomyositis|pyomyosite|infectious myositis|myosite infectieuse|flexor tenosynovitis|ténosynovite infectieuse|deep space hand|infection profonde de la main|septic bursitis|bursite septique|diabetic foot|pied diabétique|infected diabetic|ulcère diabétique|infected pressure|escarre infectée|infected venous|ulcère veineux|osteomyelitis from wound|ostéomyélite liée|septic arthritis from wound|arthrite septique liée|water exposed|exposée à l'eau|bite wound infection|infection après morsure|foreign body wound|corps étranger/;
    const softTissueWoundInfectionFailures = failures.filter((failure) =>
      softTissueWoundInfectionQueryPattern.test(failure.toLowerCase()),
    );
    const softTissueWoundInfectionSummary = JSON.stringify(
      {
        generatedAt: report.generatedAt,
        queryCount: REQUIRED_QUERIES.filter((row) =>
          softTissueWoundInfectionQueryPattern.test(row.q.toLowerCase()),
        ).length,
        failures: softTissueWoundInfectionFailures,
        pass: softTissueWoundInfectionFailures.length === 0,
      },
      null,
      2,
    );
    writeFileSync(
      join(summaryDir, "fy2026-soft-tissue-wound-infections-search-summary.json"),
      softTissueWoundInfectionSummary,
    );
    writeFileSync(
      join(releaseSummaryDir, "fy2026-soft-tissue-wound-infections-search-summary.json"),
      softTissueWoundInfectionSummary,
    );
    const dermatologyQueryPattern =
      /impetigo|impétigo|cold sore|herpès labial|cutaneous herpes simplex|herpès cutané|shingles|zona|ophthalmic zoster|chickenpox|varicelle|molluscum|verrues virales|viral warts|hand foot and mouth|pieds-mains-bouche|ringworm|teigne|athlete's foot|pied d'athlète|jock itch|mycose de l'aine|cutaneous candidiasis|candidose cutanée|scabies|scabiose|head lice|poux de tête|atopic dermatitis|eczema|eczéma|dermatite atopique|seborrheic dermatitis|dermatite séborrhéique|allergic contact dermatitis|dermite de contact allergique|irritant contact dermatitis|dermite de contact irritative|intertrigo|psoriasis|lichen planus|lichen plan|hives|urticaria|urticaire|rosacea|rosacée|stevens-johnson|toxic epidermal necrolysis|nécrolyse épidermique toxique|dress syndrome|syndrome dress|pemphigus|bullous pemphigoid|pemphigoïde bulleuse|melanoma|mélanome|basal cell carcinoma|carcinome basocellulaire|actinic keratosis|kératose actinique|seborrheic keratosis|kératose séborrhéique|pyoderma gangrenosum|erythema nodosum|érythème noueux|cutaneous lupus|lupus cutané|vasculitis limited to skin|vascularite limitée à la peau/;
    const dermatologyFailures = failures.filter((failure) => dermatologyQueryPattern.test(failure.toLowerCase()));
    const dermatologySummary = JSON.stringify(
      {
        generatedAt: report.generatedAt,
        queryCount: REQUIRED_QUERIES.filter((row) => dermatologyQueryPattern.test(row.q.toLowerCase())).length,
        failures: dermatologyFailures,
        pass: dermatologyFailures.length === 0,
      },
      null,
      2,
    );
    writeFileSync(join(summaryDir, "fy2026-dermatology-search-summary.json"), dermatologySummary);
    writeFileSync(join(releaseSummaryDir, "fy2026-dermatology-search-summary.json"), dermatologySummary);
    const environmentalExposureQueryPattern =
      /heat stroke|heatstroke|coup de chaleur|exertional heatstroke|heat exhaustion|épuisement par la chaleur|heat cramps|crampes de chaleur|heat syncope|syncope de chaleur|heat edema|oedème de chaleur|hypothermia|hypothermie|immersion foot|trench foot|pied d'immersion|immersion hand|main d'immersion|chilblains|engelures|frostnip|engelure superficielle|drowning|noyade|near drowning|quasi-noyade|submersion injury|lésion de submersion|bathtub drowning|noyade en baignoire|swimming pool drowning|noyade en piscine|freshwater drowning|natural water drowning|noyade en eau douce|lightning strike|struck by lightning|frappé par la foudre|electrocution|électrocution|electric shock|choc électrique|high voltage injury|exposition aux lignes électriques|household electrical exposure|exposition au câblage domestique|altitude sickness|mal aigu des montagnes|mal des montagnes|hace|hape|high altitude cerebral edema|high altitude pulmonary edema|oedème cérébral de haute altitude|oedème pulmonaire de haute altitude|decompression sickness|the bends|caisson disease|maladie de décompression|maladie des caissons|diver's ear|barotraumatisme de l'oreille du plongeur|sinus barotrauma|barotraumatisme sinusien|diving injury|blessure de plongée|radiation sickness|acute radiation syndrome|mal des rayons|syndrome d'irradiation aiguë|radiation exposure|exposition aux radiations ionisantes|x-ray exposure|exposition aux rayons x|welding flash|arc eye exposure|exposition à la lumière de soudure|tanning bed exposure|exposition au lit de bronzage|excessive heat exposure|exposition à la chaleur excessive|excessive cold exposure|exposition au froid excessif|sun exposure|exposition au soleil|dry ice exposure|exposition à la glace sèche/;
    const environmentalExposureFailures = failures.filter((failure) =>
      environmentalExposureQueryPattern.test(failure.toLowerCase()),
    );
    const environmentalExposureSummary = JSON.stringify(
      {
        generatedAt: report.generatedAt,
        queryCount: REQUIRED_QUERIES.filter((row) =>
          environmentalExposureQueryPattern.test(row.q.toLowerCase()),
        ).length,
        failures: environmentalExposureFailures,
        pass: environmentalExposureFailures.length === 0,
      },
      null,
      2,
    );
    writeFileSync(
      join(summaryDir, "fy2026-environmental-exposure-search-summary.json"),
      environmentalExposureSummary,
    );
    writeFileSync(
      join(releaseSummaryDir, "fy2026-environmental-exposure-search-summary.json"),
      environmentalExposureSummary,
    );
    const toxicologyEnvenomationQueryPattern =
      /acetaminophen|paracétamol|salicylate|aspirin|opioid|fentanyl|methadone|benzodiazepine|sedative|alcohol intoxication|alcohol withdrawal|delirium tremens|toxic alcohol|methanol|ethylene glycol|cocaine|methamphetamine|stimulant|cannabis|synthetic cannabinoid|serotonin syndrome|neuroleptic malignant|anticholinergic|organophosphate|cholinergic|beta blocker|calcium channel|digoxin|lithium|iron poisoning|carbon monoxide|cyanide|hydrogen sulfide|methemoglobinemia|caustic|hydrocarbon|pesticide|mushroom|plant poisoning|snake envenomation|venomous snake|spider envenomation|black widow|brown recluse|scorpion|marine envenomation|unknown ingestion|mixed overdose|intentional overdose|surdosage|intoxication|envenimation|piqûre de scorpion|méthémoglobinémie|sérotoninergique|neuroleptiques/;
    const toxicologyEnvenomationFailures = failures.filter((failure) =>
      toxicologyEnvenomationQueryPattern.test(failure.toLowerCase()),
    );
    const toxicologyEnvenomationSummary = JSON.stringify(
      {
        generatedAt: report.generatedAt,
        queryCount: REQUIRED_QUERIES.filter((row) =>
          toxicologyEnvenomationQueryPattern.test(row.q.toLowerCase()),
        ).length,
        failures: toxicologyEnvenomationFailures,
        pass: toxicologyEnvenomationFailures.length === 0,
      },
      null,
      2,
    );
    writeFileSync(
      join(summaryDir, "fy2026-toxicology-envenomation-search-summary.json"),
      toxicologyEnvenomationSummary,
    );
    writeFileSync(
      join(releaseSummaryDir, "fy2026-toxicology-envenomation-search-summary.json"),
      toxicologyEnvenomationSummary,
    );
    const obgynUrologyQueryPattern =
      /pregnancy of unknown|localisation inconnue|threatened abortion|threatened miscarriage|menace d'avortement|spontaneous abortion|avortement spontané|ectopic pregnancy|grossesse ectopique|hyperemesis|hyperémèse|preeclampsia|prééclampsie|hellp|preterm labor|travail prématuré|rupture of membranes|rupture prématurée|postpartum hemorrhage|hémorragie post-partum|postpartum endometritis|endométrite post-partum|ovarian torsion|torsion ovarienne|ovarian cyst|kyste ovarien|pelvic inflammatory|pelvienne inflammatoire|tubo-ovarian|abcès tubo|bartholin|postmenopausal bleeding|postménopausique|iud complication|complication diu|kidney stone|calcul du rein|pyelonephritis|pyélonéphrite|cystitis|cystite|hematuria|hématurie|urinary retention|rétention urinaire|testicular torsion|torsion testiculaire|epididymitis|épididymite|prostatitis|prostatite|urethritis|uretrite|priapism|priapisme|paraphimosis|penile fracture/;
    const obgynUrologyFailures = failures.filter((failure) =>
      obgynUrologyQueryPattern.test(failure.toLowerCase()),
    );
    const obgynUrologySummary = JSON.stringify(
      {
        generatedAt: report.generatedAt,
        queryCount: REQUIRED_QUERIES.filter((row) =>
          obgynUrologyQueryPattern.test(row.q.toLowerCase()),
        ).length,
        failures: obgynUrologyFailures,
        pass: obgynUrologyFailures.length === 0,
      },
      null,
      2,
    );
    writeFileSync(
      join(summaryDir, "fy2026-obgyn-urology-search-summary.json"),
      obgynUrologySummary,
    );
    writeFileSync(
      join(releaseSummaryDir, "fy2026-obgyn-urology-search-summary.json"),
      obgynUrologySummary,
    );
    const psychiatricBehavioralQueryPattern =
      /suicidal ideation|idées suicidaires|passive suicidal|suicide attempt|tentative de suicide|intentional self harm|automutilation|self inflicted|blessure auto-infligée|nonsuicidal self|self cutting|overdose with suicidal|surdosage avec intention|history of suicide|antécédents de tentative|homicidal ideation|idées homicidaires|acute psychosis|psychose aiguë|unspecified psychosis|psychose non précisée|first episode psychosis|premier épisode psychotique|hallucinations|auditory hallucinations|hallucinations auditives|command hallucinations|hallucinations imperatives|delusions|délire|paranoia|paranoïa|schizophrenia|schizophrénie|substance induced psychosis|psychose induite|mania|manie|manic episode|épisode maniaque|bipolar disorder|trouble bipolaire|severe depression|dépression sévère|major depressive|trouble dépressif|depression with psychotic|dépression avec symptômes psychotiques|postpartum psychosis|psychose post-partum|postpartum depression|dépression post-partum|panic attack|crise de panique|panic disorder|trouble panique|anxiety|anxiété|acute stress reaction|réaction au stress aigu|post traumatic stress|état de stress post-traumatique|ptsd|espt|dissociation|adjustment disorder|trouble adaptatif|grief reaction|réaction de deuil|delirium|délirium|acute confusion|confusion aiguë|altered mental status|altération de l'état mental|dementia with behavioral|démence avec perturbation|wandering|errance|catatonia|catatonie|malignant catatonia|catatonie maligne|agitation|aggressive behavior|comportement agressif|violent behavior|comportement violent|behavioral crisis|crise comportementale|autism behavioral|crise comportementale autisme|pediatric behavioral|urgence comportementale pédiatrique|adolescent suicidal|idées suicidaires adolescent|intellectual disability|déficience intellectuelle|anorexia nervosa|anorexie mentale|bulimia nervosa|boulimie|binge eating|hyperphagie boulimique|avoidant restrictive|trouble restrictif de l'alimentation|eating disorder|trouble alimentaire|refusal of treatment|refus de traitement|informed refusal|refus éclairé|against medical advice|contre avis médical|\bama\b|elopement|fugue|involuntary psychiatric|évaluation psychiatrique involontaire|emergency detention|rétention d'urgence|psychiatric observation|observation psychiatrique/;
    const psychiatricBehavioralFailures = failures.filter((failure) =>
      psychiatricBehavioralQueryPattern.test(failure.toLowerCase()),
    );
    const psychiatricBehavioralSummary = JSON.stringify(
      {
        generatedAt: report.generatedAt,
        queryCount: REQUIRED_QUERIES.filter((row) =>
          psychiatricBehavioralQueryPattern.test(row.q.toLowerCase()),
        ).length,
        failures: psychiatricBehavioralFailures,
        pass: psychiatricBehavioralFailures.length === 0,
      },
      null,
      2,
    );
    writeFileSync(
      join(summaryDir, "fy2026-psychiatric-behavioral-search-summary.json"),
      psychiatricBehavioralSummary,
    );
    writeFileSync(
      join(releaseSummaryDir, "fy2026-psychiatric-behavioral-search-summary.json"),
      psychiatricBehavioralSummary,
    );

    if (!report.pass) process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
