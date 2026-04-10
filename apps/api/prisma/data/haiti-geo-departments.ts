/**
 * Départements géographiques d'Haïti — codes ISO 3166-2 et libellés français alignés sur
 * `apps/web/public/maps/haiti-departments.geojson` (propriétés `code`, `name_fr`).
 * Utilisé par le seed Prisma ; la migration SQL correspondante reprend les mêmes valeurs.
 */
export const HAITI_GEO_DEPARTMENTS: readonly { code: string; name: string; sortOrder: number }[] = [
  { code: "HT-AR", name: "Artibonite", sortOrder: 1 },
  { code: "HT-CE", name: "Centre", sortOrder: 2 },
  { code: "HT-GA", name: "Grand'Anse", sortOrder: 3 },
  { code: "HT-NI", name: "Nippes", sortOrder: 4 },
  { code: "HT-ND", name: "Nord", sortOrder: 5 },
  { code: "HT-NE", name: "Nord-Est", sortOrder: 6 },
  { code: "HT-NO", name: "Nord-Ouest", sortOrder: 7 },
  { code: "HT-OU", name: "Ouest", sortOrder: 8 },
  { code: "HT-SD", name: "Sud", sortOrder: 9 },
  { code: "HT-SE", name: "Sud-Est", sortOrder: 10 },
];
