/**
 * Official ICD-10-CM scope for OB/GYN and urology (Phase 17).
 *
 * Ownership notes:
 * - N49.3 (Fournier gangrene) is included for coverage presence; Phase 13 NSTI routing
 *   retains exclusive discharge ownership — the routing certifier must not steal from NSTI.
 * - O02.81 pregnancy of unknown location is official ICD-10-CM naming under O02.
 * - Z3A weeks of gestation, Z32/Z33/Z34 pregnancy encounters are coverage-only context
 *   (not primary ED diagnosis ownership).
 * - O24 gestational diabetes deliberately excluded to avoid scope flooding.
 * - N81 genital prolapse, N84 polyps, N97 infertility, N40 BPH flood deliberately excluded.
 * - Broad STI chapters (A54 gonococcal) excluded; targeted vulvovaginal codes retained.
 */
import {
  type IcdScopeFamily,
  selectScopedCodes,
  type ScopedOfficialCode,
} from "./icd10-tendon-ligament-scope";

type OfficialRow = Parameters<typeof selectScopedCodes>[0][number];

export const OBSTETRIC_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "ob_obstetric_o00", label: "Ectopic pregnancy", prefixes: ["O00"] },
  { id: "ob_obstetric_o01", label: "Hydatidiform mole", prefixes: ["O01"] },
  {
    id: "ob_obstetric_o02",
    label: "Other abnormal products of conception (incl. O02.81 pregnancy of unknown location)",
    prefixes: ["O02"],
  },
  { id: "ob_obstetric_o03", label: "Spontaneous abortion", prefixes: ["O03"] },
  { id: "ob_obstetric_o04", label: "Complications following ectopic/molar pregnancy", prefixes: ["O04"] },
  { id: "ob_obstetric_o07", label: "Failed attempted termination of pregnancy", prefixes: ["O07"] },
  { id: "ob_obstetric_o08", label: "Complications following ectopic and molar pregnancy", prefixes: ["O08"] },
  { id: "ob_obstetric_o10_o16", label: "Edema, proteinuria and hypertensive disorders in pregnancy", prefixes: ["O10", "O11", "O12", "O13", "O14", "O15", "O16"] },
  { id: "ob_obstetric_o20", label: "Hemorrhage in early pregnancy", prefixes: ["O20"] },
  { id: "ob_obstetric_o21", label: "Excessive vomiting in pregnancy", prefixes: ["O21"] },
  {
    id: "ob_obstetric_o23",
    label: "Infections of genitourinary tract in pregnancy",
    prefixes: ["O23"],
  },
  { id: "ob_obstetric_o26", label: "Maternal care for other conditions predominantly related to pregnancy", prefixes: ["O26"] },
  { id: "ob_obstetric_o30_o48", label: "Maternal care related to fetus, amniotic cavity and delivery", prefixes: ["O30", "O31", "O32", "O33", "O34", "O35", "O36", "O40", "O41", "O42", "O43", "O44", "O45", "O46", "O47", "O48"] },
  { id: "ob_obstetric_o60", label: "Preterm labor", prefixes: ["O60"] },
  { id: "ob_obstetric_o72", label: "Postpartum hemorrhage", prefixes: ["O72"] },
  { id: "ob_obstetric_o73", label: "Retained placenta and membranes", prefixes: ["O73"] },
  {
    id: "ob_obstetric_o62_o75",
    label: "Complications of labor and delivery",
    prefixes: ["O62", "O63", "O64", "O65", "O66", "O67", "O68", "O69", "O70", "O71", "O74", "O75"],
  },
  { id: "ob_obstetric_o85_o86", label: "Puerperal sepsis and infection", prefixes: ["O85", "O86"] },
  { id: "ob_obstetric_o90", label: "Complications of the puerperium", prefixes: ["O90"] },
  { id: "ob_obstetric_o98_o99", label: "Other maternal diseases complicating pregnancy, childbirth and the puerperium", prefixes: ["O98", "O99"] },
  {
    id: "ob_obstetric_z3a",
    label: "Weeks of gestation (coverage context; not primary ED diagnosis)",
    prefixes: ["Z3A"],
  },
  {
    id: "ob_obstetric_z32_z34",
    label: "Pregnancy test / pregnant state / supervision encounters (coverage context)",
    prefixes: ["Z32", "Z33", "Z34"],
  },
  { id: "ob_obstetric_z39", label: "Postpartum care and examination encounter", prefixes: ["Z39"] },
];

export const GYNECOLOGIC_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "ob_gyn_n70", label: "Salpingitis and oophoritis", prefixes: ["N70"] },
  { id: "ob_gyn_n71", label: "Inflammatory disease of uterus", prefixes: ["N71"] },
  { id: "ob_gyn_n72", label: "Inflammatory disease of cervix uteri", prefixes: ["N72"] },
  { id: "ob_gyn_n73", label: "Other female pelvic inflammatory diseases", prefixes: ["N73"] },
  { id: "ob_gyn_n74", label: "Female pelvic inflammatory disorders in diseases classified elsewhere", prefixes: ["N74"] },
  { id: "ob_gyn_n75", label: "Diseases of Bartholin gland", prefixes: ["N75"] },
  { id: "ob_gyn_n76", label: "Other inflammation of vagina and vulva", prefixes: ["N76"] },
  { id: "ob_gyn_n80", label: "Endometriosis", prefixes: ["N80"] },
  { id: "ob_gyn_n83", label: "Noninflammatory disorders of ovary, fallopian tube and broad ligament", prefixes: ["N83"] },
  { id: "ob_gyn_n85", label: "Other noninflammatory disorders of uterus", prefixes: ["N85"] },
  { id: "ob_gyn_n92", label: "Excessive, frequent and irregular menstruation", prefixes: ["N92"] },
  { id: "ob_gyn_n93", label: "Other abnormal uterine and vaginal bleeding", prefixes: ["N93"] },
  { id: "ob_gyn_n94", label: "Pain and other conditions associated with female genital organs and menstrual cycle", prefixes: ["N94"] },
  { id: "ob_gyn_n95", label: "Menopausal and other perimenopausal disorders", prefixes: ["N95"] },
  { id: "ob_gyn_n99", label: "Postprocedural disorders of genitourinary system, female", prefixes: ["N99"] },
  { id: "ob_gyn_t83_iud", label: "Mechanical complication of intrauterine contraceptive device", prefixes: ["T83.3"] },
  { id: "ob_gyn_a59", label: "Trichomoniasis", prefixes: ["A59.0"] },
  { id: "ob_gyn_b37", label: "Candidiasis of vulva and vagina", prefixes: ["B37.3"] },
  { id: "ob_gyn_a60", label: "Anogenital herpesviral infections", prefixes: ["A60"] },
];

export const UROLOGIC_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "ob_uro_n10", label: "Acute tubulo-interstitial nephritis / pyelonephritis", prefixes: ["N10"] },
  { id: "ob_uro_n12", label: "Tubulo-interstitial nephritis, not specified as acute or chronic", prefixes: ["N12"] },
  { id: "ob_uro_n13", label: "Obstructive and reflux uropathy", prefixes: ["N13"] },
  { id: "ob_uro_n20", label: "Calculus of kidney and ureter", prefixes: ["N20"] },
  { id: "ob_uro_n21", label: "Calculus of lower urinary tract", prefixes: ["N21"] },
  { id: "ob_uro_n23", label: "Unspecified renal colic", prefixes: ["N23"] },
  { id: "ob_uro_n30", label: "Cystitis", prefixes: ["N30"] },
  { id: "ob_uro_n39", label: "Other disorders of urinary system", prefixes: ["N39"] },
  { id: "ob_uro_n41", label: "Inflammatory diseases of prostate", prefixes: ["N41"] },
  { id: "ob_uro_n43", label: "Hydrocele and spermatocele", prefixes: ["N43"] },
  { id: "ob_uro_n44", label: "Torsion of testis", prefixes: ["N44"] },
  { id: "ob_uro_n45", label: "Orchitis and epididymitis", prefixes: ["N45"] },
  { id: "ob_uro_n47", label: "Disorders of prepuce", prefixes: ["N47"] },
  { id: "ob_uro_n48", label: "Other disorders of penis", prefixes: ["N48"] },
  {
    id: "ob_uro_n49",
    label: "Inflammatory disorders of male genital organs (incl. N49.3 Fournier for coverage)",
    prefixes: ["N49"],
  },
  { id: "ob_uro_n50", label: "Other disorders of male genital organs", prefixes: ["N50"] },
  { id: "ob_uro_r30", label: "Pain associated with micturition", prefixes: ["R30"] },
  { id: "ob_uro_r31", label: "Hematuria", prefixes: ["R31"] },
  { id: "ob_uro_r33", label: "Retention of urine", prefixes: ["R33"] },
  { id: "ob_uro_r39", label: "Other symptoms and signs involving the genitourinary system", prefixes: ["R39"] },
];

export const GU_TRAUMA_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "ob_gu_trauma_s37", label: "Injury of urinary and pelvic organs", prefixes: ["S37"] },
  { id: "ob_gu_trauma_s30_2", label: "Contusion of external genital organs", prefixes: ["S30.2"] },
  { id: "ob_gu_trauma_s31_2", label: "Open wound of abdomen, lower back and pelvis with penetration into genital organs", prefixes: ["S31.2"] },
  {
    id: "ob_gu_trauma_t83",
    label: "Complications of genitourinary prosthetic devices, implants and grafts (catheter, nephrostomy)",
    prefixes: ["T83"],
    excludeDescriptionKeywords: ["intrauterine contraceptive", "iud"],
  },
];

export const OBGYN_UROLOGY_SCOPE_FAMILIES: IcdScopeFamily[] = [
  ...OBSTETRIC_SCOPE_FAMILIES,
  ...GYNECOLOGIC_SCOPE_FAMILIES,
  ...UROLOGIC_SCOPE_FAMILIES,
  ...GU_TRAUMA_SCOPE_FAMILIES,
];

export function selectObGynUrologyScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, OBGYN_UROLOGY_SCOPE_FAMILIES, opts);
}

export function selectObstetricScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, OBSTETRIC_SCOPE_FAMILIES, opts);
}

export function selectGynecologicScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, GYNECOLOGIC_SCOPE_FAMILIES, opts);
}

export function selectUrologicScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, UROLOGIC_SCOPE_FAMILIES, opts);
}

export function selectGuTraumaScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, GU_TRAUMA_SCOPE_FAMILIES, opts);
}
