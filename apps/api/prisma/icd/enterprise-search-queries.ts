/**
 * Curated enterprise search probes — filtered from specialty sections of certify-icd10-search.ts.
 */
export type EnterpriseSearchQuery = {
  q: string;
  mustContainDescription?: string;
  mustMatchCodePrefix?: string;
};

export const ENTERPRISE_REQUIRED_QUERIES: EnterpriseSearchQuery[] = [
  // Soft tissue / wound infection (Phase 13)
  { q: "necrotizing fasciitis", mustMatchCodePrefix: "M72.6" },
  { q: "fasciite nécrosante", mustMatchCodePrefix: "M72.6" },
  { q: "Fournier gangrene", mustMatchCodePrefix: "N49.3" },
  { q: "gangrène de Fournier", mustMatchCodePrefix: "N49.3" },
  { q: "gas gangrene", mustMatchCodePrefix: "A48.0" },
  { q: "facial cellulitis", mustMatchCodePrefix: "L03" },
  { q: "cellulite faciale", mustMatchCodePrefix: "L03" },
  { q: "cutaneous abscess", mustMatchCodePrefix: "L02" },
  { q: "surgical site infection", mustMatchCodePrefix: "T81.4" },
  { q: "wound dehiscence", mustMatchCodePrefix: "T81.3" },
  // Toxicology (Phase 16)
  { q: "carbon monoxide poisoning", mustMatchCodePrefix: "T58" },
  { q: "intoxication au monoxyde de carbone", mustMatchCodePrefix: "T58" },
  { q: "acetaminophen overdose", mustMatchCodePrefix: "T39" },
  { q: "opioid overdose", mustMatchCodePrefix: "T40" },
  { q: "snake envenomation", mustMatchCodePrefix: "T63.0" },
  { q: "envenimation par serpent", mustMatchCodePrefix: "T63.0" },
  { q: "scorpion sting", mustMatchCodePrefix: "T63.2" },
  { q: "serotonin syndrome", mustMatchCodePrefix: "G90.81" },
  { q: "intentional overdose", mustContainDescription: "intentional self-harm" },
  // Environmental (Phase 15)
  { q: "heat stroke", mustMatchCodePrefix: "T67.0" },
  { q: "hypothermia", mustMatchCodePrefix: "T68" },
  { q: "near drowning", mustMatchCodePrefix: "T75.1" },
  // OB/GYN urology (Phase 17)
  { q: "ectopic pregnancy", mustMatchCodePrefix: "O00" },
  { q: "grossesse ectopique", mustMatchCodePrefix: "O00" },
  { q: "kidney stone", mustMatchCodePrefix: "N20" },
  { q: "calcul du rein", mustMatchCodePrefix: "N20" },
  { q: "testicular torsion", mustMatchCodePrefix: "N44" },
  { q: "torsion testiculaire", mustMatchCodePrefix: "N44" },
  { q: "pyelonephritis", mustMatchCodePrefix: "N10" },
  { q: "postpartum hemorrhage", mustMatchCodePrefix: "O72" },
  { q: "hémorragie post-partum", mustMatchCodePrefix: "O72" },
  // Psychiatric / behavioral (Phase 18)
  { q: "suicidal ideation", mustMatchCodePrefix: "R45.851" },
  { q: "idées suicidaires", mustMatchCodePrefix: "R45.851" },
  { q: "suicide attempt", mustMatchCodePrefix: "T14.91" },
  { q: "tentative de suicide", mustMatchCodePrefix: "T14.91" },
  { q: "delirium", mustMatchCodePrefix: "F05" },
  { q: "délirium", mustMatchCodePrefix: "F05" },
  { q: "postpartum depression", mustMatchCodePrefix: "F53" },
  { q: "acute psychosis", mustMatchCodePrefix: "F29" },
  { q: "catatonia", mustMatchCodePrefix: "F06.1" },
  { q: "refusal of treatment", mustMatchCodePrefix: "Z53.2" },
  // Dermatology (Phase 14)
  { q: "Stevens-Johnson syndrome", mustContainDescription: "stevens" },
  { q: "syndrome de Stevens-Johnson", mustContainDescription: "stevens" },
  { q: "toxic epidermal necrolysis", mustContainDescription: "epidermal" },
  // ENT (Phase 12)
  { q: "epistaxis", mustMatchCodePrefix: "R04.0" },
  { q: "épistaxis", mustMatchCodePrefix: "R04.0" },
  { q: "peritonsillar abscess", mustMatchCodePrefix: "J36" },
  { q: "mastoiditis", mustMatchCodePrefix: "H70" },
  // Eye (Phase 11)
  { q: "retinal detachment", mustMatchCodePrefix: "H33" },
  { q: "central retinal artery occlusion", mustMatchCodePrefix: "H34.1" },
  { q: "endophthalmitis", mustMatchCodePrefix: "H44" },
  // Head / spine (Phase 9–10)
  { q: "subdural hematoma", mustMatchCodePrefix: "S06.5" },
  { q: "concussion", mustMatchCodePrefix: "S06.0" },
  { q: "cauda equina syndrome", mustContainDescription: "cauda" },
  { q: "cervical spine fracture", mustMatchCodePrefix: "S12" },
  { q: "lumbar radiculopathy", mustContainDescription: "radiculopathy" },
  // Injury / MSK (Phases 5–8)
  { q: "human bite", mustMatchCodePrefix: "W50.3" },
  { q: "morsure humaine", mustMatchCodePrefix: "W50.3" },
  { q: "animal bite", mustMatchCodePrefix: "W54" },
  { q: "hand burn", mustContainDescription: "burn" },
  { q: "explosion of blasting material", mustMatchCodePrefix: "W40" },
  { q: "foreign body eye", mustMatchCodePrefix: "T15" },
  { q: "crush injury", mustContainDescription: "crush" },
  { q: "Achilles tendon rupture", mustContainDescription: "Achilles" },
  { q: "ACL tear", mustMatchCodePrefix: "S83.51" },
  { q: "open fracture forearm", mustMatchCodePrefix: "S52" },
  { q: "penetrating chest wound", mustMatchCodePrefix: "S21" },
  { q: "traumatic amputation finger", mustMatchCodePrefix: "S68" },
  { q: "facial fracture", mustMatchCodePrefix: "S02" },
  { q: "spinal cord injury cervical", mustMatchCodePrefix: "S14" },
];

export const ENTERPRISE_RANKING_QUERIES = [
  "suicidal ideation",
  "kidney stone",
  "necrotizing fasciitis",
  "ectopic pregnancy",
  "carbon monoxide poisoning",
  "delirium",
  "testicular torsion",
  "human bite",
  "subdural hematoma",
  "opioid overdose",
];

export const ENTERPRISE_UNIQUENESS_QUERIES = [
  "cellulitis",
  "delirium",
  "kidney stone",
  "Fournier gangrene",
  "suicidal ideation",
  "ectopic pregnancy",
  "Achilles tendon rupture",
  "carbon monoxide poisoning",
  "human bite",
  "testicular torsion",
];
