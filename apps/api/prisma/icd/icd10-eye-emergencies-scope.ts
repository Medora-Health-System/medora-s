/**
 * Official ICD-10-CM scope for eye emergency (Phase 11) production certification.
 * Only the emergency-relevant sub-ranges within each chapter block are included —
 * chronic/benign eye conditions (styes, chalazion, blepharitis, refractive error,
 * routine conjunctivitis, cataract, etc.) are deliberately excluded.
 */
import {
  type IcdScopeFamily,
  selectScopedCodes,
  type ScopedOfficialCode,
} from "./icd10-tendon-ligament-scope";

export const EYE_EMERGENCIES_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "eye_orbit_cellulitis", label: "Cellulitis and acute inflammation of orbit", prefixes: ["H05.0"] },
  { id: "eye_scleritis_episcleritis", label: "Scleritis and episcleritis", prefixes: ["H15"] },
  { id: "eye_keratitis_corneal_ulcer", label: "Keratitis, corneal ulcer, photokeratitis", prefixes: ["H16"] },
  { id: "eye_uveitis_iridocyclitis", label: "Iridocyclitis (uveitis/iritis)", prefixes: ["H20"] },
  { id: "eye_hyphema_iris_disorders", label: "Hyphema and other disorders of iris/ciliary body", prefixes: ["H21"] },
  { id: "eye_retinal_detachment_breaks", label: "Retinal detachment and retinal breaks", prefixes: ["H33"] },
  { id: "eye_retinal_vascular_occlusion", label: "Retinal vascular occlusions (CRAO/CRVO)", prefixes: ["H34"] },
  { id: "eye_other_retinal_disorders", label: "Other retinal disorders", prefixes: ["H35"] },
  { id: "eye_glaucoma", label: "Glaucoma (including acute angle-closure)", prefixes: ["H40"] },
  { id: "eye_vitreous_disorders", label: "Disorders of vitreous body (vitreous hemorrhage)", prefixes: ["H43"] },
  { id: "eye_globe_disorders", label: "Disorders of globe (endophthalmitis, panophthalmitis)", prefixes: ["H44"] },
  { id: "eye_optic_neuritis", label: "Optic neuritis", prefixes: ["H46"] },
  { id: "eye_optic_nerve_visual_pathway", label: "Other disorders of optic nerve and visual pathways", prefixes: ["H47"] },
  { id: "eye_orbit_traumatic_injury", label: "Injury of eye and orbit", prefixes: ["S05"] },
  { id: "eye_corneal_foreign_body", label: "Foreign body on external eye", prefixes: ["T15"] },
  { id: "eye_chemical_thermal_burn", label: "Corrosion/burn of eye and adnexa", prefixes: ["T26"] },
  { id: "eye_preseptal_periorbital_cellulitis", label: "Periorbital (preseptal) cellulitis", prefixes: ["L03.21"] },
];

export function selectEyeEmergenciesScopedCodes(
  rows: Parameters<typeof selectScopedCodes>[0],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, EYE_EMERGENCIES_SCOPE_FAMILIES, opts);
}

/** Central retinal artery/vein occlusion ownership — H34.1 (CRAO) and H34.81 (CRVO) only. */
export function selectCraoCrvoScopedCodes(rows: Parameters<typeof selectScopedCodes>[0], opts?: { billableOnly?: boolean }) {
  return selectScopedCodes(
    rows,
    [{ id: "eye_crao_crvo", label: "CRAO/CRVO", prefixes: ["H34.1", "H34.81"] }],
    opts,
  );
}

/** Acute angle-closure glaucoma ownership — H40.21 only (excludes chronic/intermittent/residual). */
export function selectAcuteGlaucomaScopedCodes(rows: Parameters<typeof selectScopedCodes>[0], opts?: { billableOnly?: boolean }) {
  return selectScopedCodes(rows, [{ id: "eye_acute_glaucoma", label: "Acute angle-closure glaucoma", prefixes: ["H40.21"] }], opts);
}

/** Preseptal/periorbital cellulitis ownership — L03.213 only (excludes L03.211 face cellulitis / L03.212 lymphangitis). */
export function selectPreseptalCellulitisScopedCodes(rows: Parameters<typeof selectScopedCodes>[0], opts?: { billableOnly?: boolean }) {
  return selectScopedCodes(rows, [{ id: "eye_preseptal", label: "Periorbital cellulitis", prefixes: ["L03.213"] }], opts);
}

/** Actual retinal detachment ownership — H33.0/H33.2/H33.4/H33.8 (excludes H33.1 retinoschisis, H33.3 breaks without detachment). */
export function selectRetinalDetachmentScopedCodes(rows: Parameters<typeof selectScopedCodes>[0], opts?: { billableOnly?: boolean }) {
  return selectScopedCodes(
    rows,
    [{ id: "eye_retinal_detachment", label: "Retinal detachment", prefixes: ["H33.0", "H33.2", "H33.4", "H33.8"] }],
    opts,
  );
}
