/**
 * Sous-ensemble de communes pour le seed démo — aligné sur les paires
 * (department name, commune name) déjà utilisées dans `seed.ts` pour `DiseaseCaseReport`.
 * Ce n’est pas la liste complète des communes d’Haïti ; un import référentiel national peut compléter `GeoCommune` plus tard.
 */
export const HAITI_SEED_COMMUNES: readonly { departmentCode: string; name: string }[] = [
  { departmentCode: "HT-AR", name: "Saint-Marc" },
  { departmentCode: "HT-SD", name: "Les Cayes" },
  { departmentCode: "HT-OU", name: "Port-au-Prince" },
  { departmentCode: "HT-ND", name: "Cap-Haïtien" },
  { departmentCode: "HT-SE", name: "Jacmel" },
];
