/**
 * Official ICD-10-CM scope for ENT emergency (Phase 12) production certification.
 * Emergency-relevant ENT ranges only — chronic cholesteatoma, eyelid, and
 * facial-fracture ownership remain outside this scope.
 */
import {
  type IcdScopeFamily,
  selectScopedCodes,
  type ScopedOfficialCode,
} from "./icd10-tendon-ligament-scope";

export const ENT_EMERGENCIES_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "ent_otitis_externa", label: "Otitis externa (including malignant)", prefixes: ["H60"] },
  { id: "ent_otitis_media_nonsuppurative", label: "Nonsuppurative otitis media", prefixes: ["H65"] },
  { id: "ent_otitis_media_suppurative", label: "Suppurative and unspecified otitis media", prefixes: ["H66"] },
  { id: "ent_mastoiditis", label: "Mastoiditis and related conditions", prefixes: ["H70"] },
  { id: "ent_tm_perforation", label: "Perforation of tympanic membrane", prefixes: ["H72"] },
  { id: "ent_vestibular", label: "Disorders of vestibular function", prefixes: ["H81"] },
  { id: "ent_labyrinthitis", label: "Labyrinthitis and other inner ear disorders", prefixes: ["H83"] },
  { id: "ent_conductive_sensorineural_hl", label: "Conductive and sensorineural hearing loss", prefixes: ["H90"] },
  { id: "ent_other_hearing_loss", label: "Other hearing loss (including sudden idiopathic)", prefixes: ["H91"] },
  { id: "ent_otalgia_otorrhea", label: "Otalgia and discharge of ear", prefixes: ["H92"] },
  { id: "ent_facial_nerve", label: "Facial nerve disorders (Bell palsy)", prefixes: ["G51.0"] },
  { id: "ent_ramsay_hunt", label: "Zoster with nervous system involvement", prefixes: ["B02.2"] },
  { id: "ent_epistaxis", label: "Epistaxis", prefixes: ["R04.0"] },
  { id: "ent_pharyngitis", label: "Acute pharyngitis", prefixes: ["J02"] },
  { id: "ent_tonsillitis", label: "Acute tonsillitis", prefixes: ["J03"] },
  { id: "ent_peritonsillar_abscess", label: "Peritonsillar abscess", prefixes: ["J36"] },
  { id: "ent_retropharyngeal_parapharyngeal", label: "Retropharyngeal and parapharyngeal abscess", prefixes: ["J39.0"] },
  { id: "ent_epiglottitis", label: "Acute epiglottitis", prefixes: ["J05.1"] },
  { id: "ent_laryngeal_edema", label: "Edema of larynx", prefixes: ["J38.4"] },
  { id: "ent_ludwig_mouth_cellulitis", label: "Cellulitis and abscess of mouth", prefixes: ["K12.2"] },
  { id: "ent_sialadenitis", label: "Sialoadenitis", prefixes: ["K11.2"] },
  { id: "ent_sialolithiasis", label: "Sialolithiasis", prefixes: ["K11.5"] },
  { id: "ent_fb_ear", label: "Foreign body in ear", prefixes: ["T16"] },
  { id: "ent_fb_nasal_sinus", label: "Foreign body in nasal sinus", prefixes: ["T17.0"] },
  { id: "ent_fb_nostril", label: "Foreign body in nostril", prefixes: ["T17.1"] },
  { id: "ent_fb_pharynx", label: "Foreign body in pharynx", prefixes: ["T17.2"] },
  { id: "ent_fb_larynx", label: "Foreign body in larynx", prefixes: ["T17.3"] },
  { id: "ent_fb_esophagus", label: "Foreign body in esophagus", prefixes: ["T18.1"] },
  { id: "ent_angioedema", label: "Angioneurotic edema", prefixes: ["T78.3"] },
];

export function selectEntEmergenciesScopedCodes(
  rows: Parameters<typeof selectScopedCodes>[0],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, ENT_EMERGENCIES_SCOPE_FAMILIES, opts);
}

export function selectMalignantOtitisExternaScopedCodes(
  rows: Parameters<typeof selectScopedCodes>[0],
  opts?: { billableOnly?: boolean },
) {
  return selectScopedCodes(
    rows,
    [{ id: "ent_malignant_oe", label: "Malignant otitis externa", prefixes: ["H60.2"] }],
    opts,
  );
}

export function selectMastoiditisScopedCodes(
  rows: Parameters<typeof selectScopedCodes>[0],
  opts?: { billableOnly?: boolean },
) {
  return selectScopedCodes(rows, [{ id: "ent_mastoiditis", label: "Mastoiditis", prefixes: ["H70"] }], opts);
}

export function selectSuddenHearingLossScopedCodes(
  rows: Parameters<typeof selectScopedCodes>[0],
  opts?: { billableOnly?: boolean },
) {
  return selectScopedCodes(
    rows,
    [{ id: "ent_ssnhl", label: "Sudden idiopathic hearing loss", prefixes: ["H91.2"] }],
    opts,
  );
}

export function selectDeepNeckInfectionScopedCodes(
  rows: Parameters<typeof selectScopedCodes>[0],
  opts?: { billableOnly?: boolean },
) {
  return selectScopedCodes(
    rows,
    [
      { id: "ent_pta", label: "Peritonsillar abscess", prefixes: ["J36"] },
      { id: "ent_rpa", label: "Retropharyngeal/parapharyngeal abscess", prefixes: ["J39.0"] },
      { id: "ent_ludwig", label: "Ludwig/mouth cellulitis abscess", prefixes: ["K12.2"] },
      { id: "ent_epiglottitis", label: "Epiglottitis", prefixes: ["J05.1"] },
    ],
    opts,
  );
}

export function selectEntEarForeignBodyScopedCodes(
  rows: Parameters<typeof selectScopedCodes>[0],
  opts?: { billableOnly?: boolean },
) {
  return selectScopedCodes(rows, [{ id: "ent_fb_ear", label: "FB ear", prefixes: ["T16"] }], opts);
}

export function selectEntNasalForeignBodyScopedCodes(
  rows: Parameters<typeof selectScopedCodes>[0],
  opts?: { billableOnly?: boolean },
) {
  return selectScopedCodes(
    rows,
    [
      { id: "ent_fb_nasal_sinus", label: "FB nasal sinus", prefixes: ["T17.0"] },
      { id: "ent_fb_nostril", label: "FB nostril", prefixes: ["T17.1"] },
    ],
    opts,
  );
}

export function selectEntAirwayForeignBodyScopedCodes(
  rows: Parameters<typeof selectScopedCodes>[0],
  opts?: { billableOnly?: boolean },
) {
  return selectScopedCodes(
    rows,
    [
      { id: "ent_fb_pharynx", label: "FB pharynx", prefixes: ["T17.2"] },
      { id: "ent_fb_larynx", label: "FB larynx", prefixes: ["T17.3"] },
    ],
    opts,
  );
}
