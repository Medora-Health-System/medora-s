/**
 * M-BOOK.FR.12 — Screenshot manifest for handbook capture / placeholders.
 * P1 captures required before training export; P2 may follow post go-live.
 */

export const MBOOK_FR12_EXPORT_VERSION = "M-BOOK.FR.12";

export type ScreenshotViewport = "desktop" | "tablette" | "mobile";
export type ScreenshotPriority = "P1" | "P2";

export type HandbookScreenshotEntry = {
  id: string;
  filename: string;
  title: string;
  route: string;
  viewport: ScreenshotViewport;
  priority: ScreenshotPriority;
  volume: number | "vx";
  /** Placeholder until live capture from formation environment */
  placeholder: boolean;
  phiReviewRequired: boolean;
};

export const HANDBOOK_SCREENSHOT_MANIFEST: HandbookScreenshotEntry[] = [
  { id: "V1-01", filename: "medora-fr-v1-accueil-desktop.png", title: "Page inscription / accueil", route: "/app/registration", viewport: "desktop", priority: "P1", volume: 1, placeholder: true, phiReviewRequired: true },
  { id: "V1-02", filename: "medora-fr-v1-recherche-desktop.png", title: "Recherche patient", route: "/app/registration", viewport: "desktop", priority: "P1", volume: 1, placeholder: true, phiReviewRequired: true },
  { id: "V1-03", filename: "medora-fr-v1-fiche-tablette.png", title: "Fiche patient — identité", route: "/app/patients", viewport: "tablette", priority: "P1", volume: 1, placeholder: true, phiReviewRequired: true },
  { id: "V1-04", filename: "medora-fr-v1-visite-desktop.png", title: "Ouverture nouvelle visite", route: "/app/registration", viewport: "desktop", priority: "P1", volume: 1, placeholder: true, phiReviewRequired: true },
  { id: "V2-01", filename: "medora-fr-v2-triage-tablette.png", title: "Accueil triage", route: "/app/emergency/triage", viewport: "tablette", priority: "P1", volume: 2, placeholder: true, phiReviewRequired: true },
  { id: "V2-02", filename: "medora-fr-v2-triage-desktop.png", title: "Triage desktop complet", route: "/app/emergency/triage", viewport: "desktop", priority: "P1", volume: 2, placeholder: true, phiReviewRequired: true },
  { id: "V2-03", filename: "medora-fr-v2-esi-tablette.png", title: "Saisie ESI / gravité", route: "/app/emergency/triage", viewport: "tablette", priority: "P1", volume: 2, placeholder: true, phiReviewRequired: true },
  { id: "V2-05", filename: "medora-fr-v2-reevaluation-tablette.png", title: "Réévaluation ESI", route: "/app/emergency/active/{id}", viewport: "tablette", priority: "P1", volume: 2, placeholder: true, phiReviewRequired: true },
  { id: "V2-06", filename: "medora-fr-v2-trackboard-desktop.png", title: "Tableau des urgences", route: "/app/emergency/trackboard", viewport: "desktop", priority: "P1", volume: 2, placeholder: true, phiReviewRequired: true },
  { id: "V2-07", filename: "medora-fr-v2-trackboard-mobile.png", title: "Tableau urgences mobile", route: "/app/emergency/trackboard", viewport: "mobile", priority: "P1", volume: 2, placeholder: true, phiReviewRequired: true },
  { id: "V3-01", filename: "medora-fr-v3-doc-desktop.png", title: "Documentation médicale", route: "/app/provider", viewport: "desktop", priority: "P1", volume: 3, placeholder: true, phiReviewRequired: true },
  { id: "V3-02", filename: "medora-fr-v3-doc-tablette.png", title: "Documentation tablette chevet", route: "/app/emergency/active/{id}", viewport: "tablette", priority: "P1", volume: 3, placeholder: true, phiReviewRequired: true },
  { id: "V3-03", filename: "medora-fr-v3-hpi-desktop.png", title: "Section HPI", route: "/app/provider", viewport: "desktop", priority: "P1", volume: 3, placeholder: true, phiReviewRequired: true },
  { id: "V3-05", filename: "medora-fr-v3-mdm-desktop.png", title: "MDM / aide décision", route: "/app/provider", viewport: "desktop", priority: "P1", volume: 3, placeholder: true, phiReviewRequired: true },
  { id: "V3-06", filename: "medora-fr-v3-orientation-desktop.png", title: "Panneau orientation", route: "/app/emergency/active/{id}", viewport: "desktop", priority: "P1", volume: 3, placeholder: true, phiReviewRequired: true },
  { id: "V4-01", filename: "medora-fr-v4-soins-tablette.png", title: "Soins infirmiers", route: "/app/nursing", viewport: "tablette", priority: "P1", volume: 4, placeholder: true, phiReviewRequired: true },
  { id: "V4-02", filename: "medora-fr-v4-reevaluation-tablette.png", title: "Réévaluation nursing", route: "/app/nursing", viewport: "tablette", priority: "P1", volume: 4, placeholder: true, phiReviewRequired: true },
  { id: "V4-03", filename: "medora-fr-v4-sortie-desktop.png", title: "Exécution sortie", route: "/app/nursing", viewport: "desktop", priority: "P1", volume: 4, placeholder: true, phiReviewRequired: true },
  { id: "V4-04", filename: "medora-fr-v4-mar-tablette.png", title: "MAR / administration", route: "/app/nursing", viewport: "tablette", priority: "P1", volume: 4, placeholder: true, phiReviewRequired: true },
  { id: "V6-01", filename: "medora-fr-v6-disposition-desktop.png", title: "Panneau disposition", route: "/app/emergency/active/{id}", viewport: "desktop", priority: "P1", volume: 6, placeholder: true, phiReviewRequired: true },
  { id: "V6-02", filename: "medora-fr-v6-admission-desktop.png", title: "Admission observation", route: "/app/hospitalisation", viewport: "desktop", priority: "P1", volume: 6, placeholder: true, phiReviewRequired: true },
  { id: "V8-01", filename: "medora-fr-v8-nav-mobile.png", title: "Navigation mobile", route: "/app/nursing", viewport: "mobile", priority: "P1", volume: 8, placeholder: true, phiReviewRequired: false },
  { id: "V8-02", filename: "medora-fr-v8-drawer-mobile.png", title: "Menu drawer", route: "/app/nursing", viewport: "mobile", priority: "P1", volume: 8, placeholder: true, phiReviewRequired: false },
  { id: "V8-03", filename: "medora-fr-v8-chevet-tablette.png", title: "Tablette chevet", route: "/app/emergency/active/{id}", viewport: "tablette", priority: "P1", volume: 8, placeholder: true, phiReviewRequired: true },
  { id: "V8-04", filename: "medora-fr-v8-pending-sync-mobile.png", title: "Pending sync", route: "/app/nursing", viewport: "mobile", priority: "P1", volume: 8, placeholder: true, phiReviewRequired: false },
  { id: "V8-05", filename: "medora-fr-v8-facility-mobile.png", title: "Sélecteur établissement", route: "/app/registration", viewport: "mobile", priority: "P1", volume: 8, placeholder: true, phiReviewRequired: false },
  { id: "VX-01", filename: "medora-fr-vx-login-desktop.png", title: "Connexion FR", route: "/login", viewport: "desktop", priority: "P1", volume: "vx", placeholder: true, phiReviewRequired: false },
  { id: "VX-02", filename: "medora-fr-vx-facility-banner-desktop.png", title: "Bandeau établissement", route: "/app/registration", viewport: "desktop", priority: "P1", volume: "vx", placeholder: true, phiReviewRequired: false },
];

export const HANDBOOK_SCREENSHOT_ASSET_DIR =
  "docs/operations/medora-enterprise-handbook-fr/assets/screenshots";

export const HANDBOOK_P1_SCREENSHOT_COUNT = HANDBOOK_SCREENSHOT_MANIFEST.filter(
  (e) => e.priority === "P1",
).length;
