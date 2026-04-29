import * as fs from "fs";
import * as path from "path";
import { US_ER_LAB_CATALOG } from "../apps/api/prisma/data/er-us-lab-tests";
import { HAITI_LAB_CATALOG } from "../apps/api/prisma/data/haiti-lab-tests";
import { HAITI_IMAGING_CATALOG } from "../apps/api/prisma/data/haiti-imaging-studies";
import { HAITI_MEDICATION_CATALOG } from "../apps/api/prisma/data/haiti-medications";
import { IMAGING_CPT_MAPPING_REVIEW } from "../apps/api/prisma/data/imaging-cpt-mapping-review";
import { MEDICATION_NDC_MAPPINGS } from "../apps/api/prisma/data/medication-ndc-mappings";
import { deriveMedicationCode } from "../apps/api/prisma/helpers/seed-haiti-medication-catalog";

type Category = "LAB" | "IMAGING" | "MEDICATION" | "CARE";
type BillingStatus = "official_validated" | "candidate_only" | "missing" | "pending_license";
type EvidenceSource =
  | "CMS_CLFS"
  | "HCPCS_CANDIDATE"
  | "FDA_NDC_IDENTITY_ONLY"
  | "CPT_PENDING_LICENSE"
  | "NONE";

type ClfsRow = {
  code?: string;
  description?: string;
  rate?: string;
};

type HcpcsRow = {
  code?: string;
  description?: string;
  short?: string;
};

type ReportRow = {
  medoraCode: string;
  category: Category;
  displayName: string;
  billingStatus: BillingStatus;
  billingCodeDefault?: string;
  evidenceSource: EvidenceSource;
  notes: string;
};

type Report = {
  generatedAt: string;
  outputPath: string;
  rules: string[];
  counts: {
    byCategory: Record<Category, number>;
    byStatus: Record<BillingStatus, number>;
    byCategoryStatus: Record<Category, Record<BillingStatus, number>>;
  };
  items: ReportRow[];
};

const clfsPath = path.resolve(process.env.HOME!, "medora-data/processed/clfs.json");
const hcpcsJcodePath = path.resolve(process.env.HOME!, "medora-data/processed/hcpcs-jcode-drug-candidates.json");
const outPath = path.resolve(process.env.HOME!, "medora-data/processed/medora-billing-coverage-report.json");

const TOP_LAB_CODES = [
  "ER_CBC",
  "ER_BMP",
  "ER_CMP",
  "ER_LAC",
  "ER_TROP",
  "ER_DDM",
  "ER_PT_INR",
  "ER_APTT",
  "ER_UA",
  "ER_UHCG",
  "ER_ABG",
  "ER_VBG",
  "ER_GLU_POC",
  "ER_BNP",
  "ER_CRP",
  "ER_LIP",
  "ER_AMY",
  "ER_TSH",
  "ER_PCT",
  "ER_ETOH",
  "ER_SAL",
  "ER_APAP",
  "ER_BLOOD_TYPE",
  "ER_ANTIB_SC",
  "ER_BC",
  "ER_UA_DRUG",
  "ER_COVID",
  "ER_FLU",
  "ER_STREPA",
] as const;

const TOP_IMAGING_CODES = [
  "XR_CHEST",
  "CT_HEAD_WO_CONTRAST",
  "CT_ABDOMEN_PELVIS",
  "CTA_CHEST",
  "US_FAST",
  "US_VENOUS_DOPPLER_LE",
  "US_RUQ_GALLBLADDER",
  "US_PELVIS",
  "XR_PELVIS",
  "CT_CHEST_ABDOMEN_PELVIS_TRAUMA",
] as const;

const TOP_MEDICATION_CODES = [
  "CEFTRIAXONE_1_G_INJECTABLE_INJECTION",
  "ONDANSETRON_4_MG_PER_2_ML_INJECTABLE_INJECTION",
  "MORPHINE_10_MG_PER_ML_INJECTABLE_INJECTION",
  "HYDROMORPHONE_2MG_ML_INJECTABLE",
  "FENTANYL_50MCG_ML_INJECTABLE",
  "MIDAZOLAM_5MG_ML_INJECTABLE",
  "KETAMINE_50MG_ML_INJECTABLE",
  "ROCURONIUM_10MG_ML_IV",
  "NOREPINEPHRINE_4MG_4ML_IV",
] as const;

const TOP_CARE_ITEMS = [
  { medoraCode: "EKG", displayName: "EKG / ECG" },
  { medoraCode: "LACERATION_REPAIR", displayName: "Laceration repair" },
] as const;

function readJsonIfExists<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function normalize(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function medicationDisplayName(row: (typeof HAITI_MEDICATION_CATALOG)[number]): string {
  const name = row.displayNameEn?.trim() || row.genericName;
  return `${name} ${row.strength}`.trim();
}

function countRows(items: ReportRow[]): Report["counts"] {
  const statuses: BillingStatus[] = ["official_validated", "candidate_only", "missing", "pending_license"];
  const categories: Category[] = ["LAB", "IMAGING", "MEDICATION", "CARE"];
  const byCategory = Object.fromEntries(categories.map((category) => [category, 0])) as Record<Category, number>;
  const byStatus = Object.fromEntries(statuses.map((status) => [status, 0])) as Record<BillingStatus, number>;
  const byCategoryStatus = Object.fromEntries(
    categories.map((category) => [
      category,
      Object.fromEntries(statuses.map((status) => [status, 0])) as Record<BillingStatus, number>,
    ])
  ) as Record<Category, Record<BillingStatus, number>>;

  for (const item of items) {
    byCategory[item.category] += 1;
    byStatus[item.billingStatus] += 1;
    byCategoryStatus[item.category][item.billingStatus] += 1;
  }

  return { byCategory, byStatus, byCategoryStatus };
}

function buildLabRows(clfsByCode: Map<string, ClfsRow>): ReportRow[] {
  const haitiLabByCode = new Map(HAITI_LAB_CATALOG.map((row) => [row.code, row]));
  const erLabByCode = new Map(US_ER_LAB_CATALOG.map((row) => [row.code, row]));

  return TOP_LAB_CODES.map((medoraCode) => {
    const erRow = erLabByCode.get(medoraCode);
    const haitiRow = haitiLabByCode.get(medoraCode);
    const displayName = erRow?.displayNameEn || erRow?.nameEn || haitiRow?.displayNameEn || haitiRow?.displayNameFr || medoraCode;
    const billingCodeDefault = erRow?.billingCodeDefault?.trim();

    if (!billingCodeDefault) {
      return {
        medoraCode,
        category: "LAB",
        displayName,
        billingStatus: "missing",
        evidenceSource: "NONE",
        notes: "No billingCodeDefault on the top ER lab row.",
      };
    }

    const clfs = clfsByCode.get(billingCodeDefault);
    if (!clfs) {
      return {
        medoraCode,
        category: "LAB",
        displayName,
        billingStatus: "missing",
        billingCodeDefault,
        evidenceSource: "NONE",
        notes: "billingCodeDefault was not found by exact code match in parsed CMS CLFS.",
      };
    }

    return {
      medoraCode,
      category: "LAB",
      displayName,
      billingStatus: "official_validated",
      billingCodeDefault,
      evidenceSource: "CMS_CLFS",
      notes: `Exact code found in parsed CMS CLFS${clfs.description ? `: ${clfs.description}` : "."}`,
    };
  });
}

function buildImagingRows(): ReportRow[] {
  const imagingByCode = new Map(HAITI_IMAGING_CATALOG.map((row) => [row.code, row]));
  const reviewByCode = new Map(IMAGING_CPT_MAPPING_REVIEW.map((row) => [row.medoraCode, row]));

  return TOP_IMAGING_CODES.map((medoraCode) => {
    const row = imagingByCode.get(medoraCode);
    const review = reviewByCode.get(medoraCode);
    return {
      medoraCode,
      category: "IMAGING",
      displayName: row?.displayNameEn || row?.displayNameFr || medoraCode,
      billingStatus: "pending_license",
      evidenceSource: "CPT_PENDING_LICENSE",
      notes: review?.notes ?? "Awaiting licensed CPT source review.",
    };
  });
}

function buildMedicationRows(hcpcsRows: HcpcsRow[]): ReportRow[] {
  const medicationsByCode = new Map(
    HAITI_MEDICATION_CATALOG.map((row) => [row.code ?? deriveMedicationCode(row), row])
  );
  const ndcByCode = new Map(MEDICATION_NDC_MAPPINGS.map((row) => [row.medoraCode, row]));

  return TOP_MEDICATION_CODES.map((medoraCode) => {
    const row = medicationsByCode.get(medoraCode);
    const displayName = row ? medicationDisplayName(row) : medoraCode;
    const generic = normalize(row?.genericName);
    const hcpcs = generic
      ? hcpcsRows.find((candidate) => normalize(`${candidate.description ?? ""} ${candidate.short ?? ""}`).includes(generic))
      : undefined;
    const ndc = ndcByCode.get(medoraCode);

    if (hcpcs?.code) {
      return {
        medoraCode,
        category: "MEDICATION",
        displayName,
        billingStatus: "candidate_only",
        billingCodeDefault: hcpcs.code,
        evidenceSource: "HCPCS_CANDIDATE",
        notes: `Candidate HCPCS J-code evidence only; not approved for auto-billing. Candidate description: ${hcpcs.description ?? hcpcs.short ?? hcpcs.code}`,
      };
    }

    if (ndc) {
      return {
        medoraCode,
        category: "MEDICATION",
        displayName,
        billingStatus: "candidate_only",
        evidenceSource: "FDA_NDC_IDENTITY_ONLY",
        notes: `FDA NDC product identity evidence only; not reimbursement proof. Mapping confidence: ${ndc.confidence}.`,
      };
    }

    return {
      medoraCode,
      category: "MEDICATION",
      displayName,
      billingStatus: "missing",
      evidenceSource: "NONE",
      notes: "No HCPCS candidate or FDA NDC review evidence found for this top ER medication.",
    };
  });
}

function buildCareRows(): ReportRow[] {
  return TOP_CARE_ITEMS.map((item) => ({
    medoraCode: item.medoraCode,
    category: "CARE",
    displayName: item.displayName,
    billingStatus: item.medoraCode === "EKG" ? "pending_license" : "missing",
    evidenceSource: item.medoraCode === "EKG" ? "CPT_PENDING_LICENSE" : "NONE",
    notes:
      item.medoraCode === "EKG"
        ? "Existing billing seed has an EKG/ECG example, but CPT requires licensed/site billing policy review before production use."
        : "No reviewed procedure billing mapping exists.",
  }));
}

function main() {
  const clfsRows = readJsonIfExists<ClfsRow[]>(clfsPath, []);
  const hcpcsRows = readJsonIfExists<HcpcsRow[]>(hcpcsJcodePath, []);
  const clfsByCode = new Map(clfsRows.filter((row) => row.code).map((row) => [String(row.code), row]));

  const items = [
    ...buildLabRows(clfsByCode),
    ...buildImagingRows(),
    ...buildMedicationRows(hcpcsRows),
    ...buildCareRows(),
  ];

  const report: Report = {
    generatedAt: new Date().toISOString(),
    outputPath: outPath,
    rules: [
      "Review-only report; does not update seed files, schema, runtime billing, or auto-billing behavior.",
      "Labs are official_validated only when billingCodeDefault exists by exact code match in parsed CMS CLFS.",
      "Imaging remains pending_license until a licensed CPT source is available.",
      "Medications remain candidate_only when HCPCS J-code or FDA NDC identity evidence exists; neither is auto-billing approval.",
      "Care/procedure items remain missing or pending_license pending licensed CPT/site billing review.",
    ],
    counts: countRows(items),
    items,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log(`Wrote ${items.length} billing coverage rows to ${outPath}`);
  console.log(JSON.stringify(report.counts, null, 2));
}

main();
