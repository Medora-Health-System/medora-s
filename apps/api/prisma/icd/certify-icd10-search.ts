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
];

function encounterChar(code: string): string {
  return code.replace(/\./g, "").slice(-1).toUpperCase();
}

async function searchCatalog(prisma: PrismaClient, q: string, take = 25): Promise<SearchRow[]> {
  const match = buildIcd10CatalogSearchMatch(q);
  if (!match) return [];
  return prisma.$queryRaw<SearchRow[]>(buildIcd10CatalogSearchSelectSql(match, take));
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
    if (!report.pass) process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
