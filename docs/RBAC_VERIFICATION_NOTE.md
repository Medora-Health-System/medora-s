# Note de vérification RBAC (pass hardening)

## Ce qui fonctionne déjà

- Landing rôle centralisé dans `landingRoute.ts` avec priorité cohérente:
  `ADMIN > PROVIDER > RN > PHARMACY > FRONT_DESK > LAB > RADIOLOGY > BILLING`.
- `?redirect=` est filtré (chemins internes `/app` uniquement) puis honoré seulement si autorisé.
- Garde route client active sur `/app/*` via `getRouteGuardRedirect(...)`.
- Scope établissement pris en compte pour les rôles actifs (`facilityRoles`).
- Flux admin users existant:
  - création utilisateur,
  - édition profil,
  - gestion rôles facility-scopés,
  - activation/désactivation accès,
  - labels UI FR.
- Seed démo couvre tous les rôles principaux:
  `admin`, `frontdesk`, `rn`, `provider`, `pharmacy`, `lab`, `radiology`, `billing`.

## Incohérences/risques identifiés

- Risque de redirection transitoire avant résolution de l’établissement actif dans `app/layout`.
- Dans le flux registration/patients (création consultation), bouton pouvant proposer une route consultation détaillée à un rôle qui ne peut pas y accéder (FRONT_DESK).

## Correctifs ciblés appliqués

- `app/layout.tsx`: garde route attend désormais `activeFacility` résolu avant d’évaluer les redirections.
- `app/patients/page.tsx`: dans le modal de création consultation:
  - lien vers `Ouvrir la consultation` affiché seulement pour rôles autorisés,
  - fallback `Ouvrir le dossier` sinon.

## Points manquants (hors périmètre hardening court)

- Vérification navigateur automatisée par rôle non incluse (matrice fournie dans `docs/RBAC_E2E_TEST_MATRIX.md`).
- Contrôles middleware restent centrés session (pas d’ACL serveur route Next.js), le blocage rôle est géré côté app/layout + API RBAC Nest.

