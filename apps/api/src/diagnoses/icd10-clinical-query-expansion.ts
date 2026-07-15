/**
 * Plain-language clinical synonyms for ICD-10-CM catalog search.
 * Does not invent codes — only expands queries to official description phrases.
 */

export type Icd10QueryExpansion = {
  /** Normalized lowercase query key (trimmed). */
  query: string;
  /** Additional description phrases OR'd into search (any match). */
  anyOf?: string[];
  /** Phrases that must all appear in short/long/searchText (AND). */
  allOf?: string[];
};

/** Exact-phrase expansions for common ED tendon/ligament searches. */
export const ICD10_CLINICAL_QUERY_EXPANSIONS: Icd10QueryExpansion[] = [
  { query: "achilles tendon rupture", anyOf: ["achilles tendon", "injury of achilles"] },
  { query: "achilles laceration", anyOf: ["laceration of achilles", "achilles tendon"] },
  { query: "rotator cuff tear", anyOf: ["rotator cuff", "rotatr-cuff", "rotatr cuff"] },
  { query: "biceps tendon rupture", anyOf: ["biceps tendon", "long head of biceps"] },
  { query: "triceps tendon rupture", anyOf: ["triceps", "musc/fasc/tend triceps"] },
  { query: "quadriceps tendon rupture", anyOf: ["quadriceps musc/fasc/tend", "quadriceps"] },
  // Official FY2026 text uses quadriceps musc/fasc/tend for traumatic patellar-tendon-region injuries.
  { query: "patellar tendon rupture", anyOf: ["quadriceps musc/fasc/tend", "patellar tendinitis"] },
  { query: "hamstring tendon injury", anyOf: ["post grp at thi lev", "msl/fasc/tnd post grp"] },
  { query: "flexor tendon laceration", anyOf: ["laceration of flexor"] },
  { query: "extensor tendon laceration", anyOf: ["laceration of extensor"] },
  { query: "mallet finger", anyOf: ["mallet finger"] },
  { query: "acl tear", anyOf: ["anterior cruciate ligament"] },
  { query: "acl", anyOf: ["anterior cruciate ligament"] },
  { query: "pcl tear", anyOf: ["posterior cruciate ligament"] },
  { query: "pcl", anyOf: ["posterior cruciate ligament"] },
  { query: "mcl tear", anyOf: ["medial collateral ligament"] },
  { query: "mcl", anyOf: ["medial collateral ligament"] },
  { query: "lcl tear", anyOf: ["lateral collateral ligament"] },
  { query: "lcl", anyOf: ["lateral collateral ligament"] },
  { query: "high ankle sprain", anyOf: ["tibiofibular ligament"] },
  { query: "syndesmotic ligament injury", anyOf: ["tibiofibular ligament"] },
  { query: "syndesmosis", anyOf: ["tibiofibular ligament"] },
  { query: "thumb ucl tear", allOf: ["metacarpophalangeal joint of", "thumb"] },
  { query: "thumb ucl", allOf: ["metacarpophalangeal joint of", "thumb"] },
  { query: "skier's thumb", allOf: ["sprain of metacarpophalangeal joint of", "thumb"] },
  { query: "skiers thumb", allOf: ["sprain of metacarpophalangeal joint of", "thumb"] },
  { query: "gamekeeper's thumb", allOf: ["sprain of metacarpophalangeal joint of", "thumb"] },
  { query: "gamekeepers thumb", allOf: ["sprain of metacarpophalangeal joint of", "thumb"] },
  // Official FY2026 order file does not name “scapholunate”; map to wrist ligament / carpal sprain families.
  {
    query: "scapholunate ligament injury",
    anyOf: ["sprain of carpal joint", "traumatic rupture of unsp ligament of right wrist", "traumatic rupture of unsp ligament of left wrist"],
  },
  { query: "elbow ucl injury", allOf: ["ulnar collateral ligament", "elbow"] },
  { query: "elbow ucl", allOf: ["ulnar collateral ligament", "elbow"] },
  { query: "crush injury", anyOf: ["crushing injury", "crushed"] },
  { query: "crushing injury", anyOf: ["crushing injury", "crushed"] },
  { query: "crushed hand", allOf: ["crushing injury", "hand"] },
  { query: "crushed finger", allOf: ["crushing injury", "finger"] },
  { query: "crushed foot", allOf: ["crushing injury", "foot"] },
  { query: "industrial crush injury", anyOf: ["crushing injury", "crushed"] },
  { query: "prolonged compression", anyOf: ["traumatic ischemia of muscle"] },
  { query: "degloving injury", anyOf: ["crushing injury"] },
  { query: "compartment syndrome after crush", anyOf: ["traumatic ischemia of muscle"] },
  { query: "rhabdomyolysis after crush", anyOf: ["traumatic ischemia of muscle"] },
  { query: "traumatic amputation", anyOf: ["traumatic amputation"] },
  { query: "partial amputation", anyOf: ["partial traumatic amputation"] },
  { query: "complete amputation", anyOf: ["complete traumatic amputation"] },
  // Prefer amputation-specific phrases (avoid bare “fngr”, which also hits fracture shorts).
  { query: "severed finger", anyOf: ["MCP amputation", "traumatic amputation of finger", "traumatic amp of finger"] },
  {
    query: "severed toe",
    anyOf: [
      "traumatic amputation of right great toe",
      "traumatic amputation of left great toe",
      "traumatic amp of right great toe",
      "traumatic amp of left great toe",
    ],
  },
  { query: "finger cut off", anyOf: ["MCP amputation", "traumatic amputation of finger", "traumatic amp of finger"] },
  {
    query: "thumb cut off",
    anyOf: [
      "MCP amputation of thmb",
      "MCP amputation of right thumb",
      "MCP amputation of left thumb",
      "traumatic amputation of right thumb",
      "traumatic amputation of left thumb",
      "traumatic amp of right thumb",
      "traumatic amp of left thumb",
    ],
  },
  {
    query: "toe cut off",
    anyOf: [
      "traumatic amputation of right great toe",
      "traumatic amputation of left great toe",
      "traumatic amp of right great toe",
      "traumatic amp of left great toe",
    ],
  },
  { query: "avulsed digit", anyOf: ["MCP amputation", "traumatic amputation of finger", "traumatic amp of finger"] },
  {
    query: "hand amputation",
    anyOf: [
      "traumatic amp of left hand at wrist",
      "traumatic amp of right hand at wrist",
      "traumatic amputation of left hand",
      "traumatic amputation of right hand",
      "hand at wrist level",
    ],
  },
  {
    query: "foot amputation",
    anyOf: [
      "traumatic amp of right foot",
      "traumatic amp of left foot",
      "traumatic amputation of right foot",
      "traumatic amputation of left foot",
      "foot at ankle level",
    ],
  },
  { query: "foreign body", anyOf: ["foreign body"] },
  { query: "retained foreign body", anyOf: ["with foreign body", "w fb", "w foreign body"] },
  { query: "foreign body eye", anyOf: ["foreign body in cornea", "foreign body on external eye"] },
  { query: "foreign body ear", anyOf: ["foreign body in right ear", "foreign body in left ear", "foreign body in ear"] },
  { query: "foreign body nose", anyOf: ["foreign body in nasal", "foreign body in nostril"] },
  {
    query: "foreign body hand",
    anyOf: [
      "foreign body of right hand",
      "foreign body of left hand",
      "foreign body of unsp hand",
      "superficial foreign body of right hand",
      "superficial foreign body of left hand",
      "with foreign body of right hand",
      "with foreign body of left hand",
    ],
  },
  {
    query: "foreign body foot",
    anyOf: [
      "foreign body, right foot",
      "foreign body, left foot",
      "foreign body, unspecified foot",
      "superficial foreign body, right foot",
      "superficial foreign body, left foot",
      "with foreign body of right foot",
      "with foreign body of left foot",
    ],
  },
  { query: "glass in skin", anyOf: ["superficial foreign body", "with foreign body"] },
  { query: "metal fragment", anyOf: ["with foreign body", "superficial foreign body"] },
  { query: "needle fragment", anyOf: ["with foreign body", "superficial foreign body"] },
  {
    query: "splinter in foot",
    anyOf: [
      "superficial foreign body, right foot",
      "superficial foreign body, left foot",
      "with foreign body of right foot",
      "with foreign body of left foot",
    ],
  },
  { query: "splinter", anyOf: ["superficial foreign body", "puncture wound with foreign body"] },
  { query: "fishhook", anyOf: ["puncture wound with foreign body"] },
  { query: "swallowed foreign body", anyOf: ["foreign body in esophagus", "foreign body in stomach"] },
  { query: "aspirated foreign body", anyOf: ["foreign body in pharynx", "foreign body in larynx", "foreign body in bronchus"] },
];

export function normalizeIcd10SearchQuery(q: string): string {
  return q
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/\s+/g, " ");
}

export function resolveIcd10ClinicalQueryExpansion(q: string): Icd10QueryExpansion | null {
  const key = normalizeIcd10SearchQuery(q);
  if (!key) return null;
  return (
    ICD10_CLINICAL_QUERY_EXPANSIONS.find((e) => normalizeIcd10SearchQuery(e.query) === key) ?? null
  );
}
