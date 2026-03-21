# Physician admission MVP — verification checkpoint

**Milestone:** Admission depuis la consultation (MVP) — dossier structuré sur l’`Encounter` existant, sans second sous-système d’hospitalisation.

**But de ce document:** point de contrôle **stabilité** après complétion du milestone — **aucun changement de comportement produit** n’est décrit ici au-delà de ce qui est déjà livré dans les fichiers listés.

---

## 1. Fichiers modifiés ou ajoutés ( périmètre milestone )

| Chemin | Rôle |
|--------|------|
| `apps/api/prisma/schema.prisma` | Champs `admissionSummaryJson`, `admittedAt` sur `Encounter` |
| `apps/api/prisma/migrations/20260323120000_encounter_admission_mvp/migration.sql` | Migration SQL associée |
| `packages/shared/src/schemas/patient.ts` | `admissionSummaryFieldsSchema`, extension `encounterUpdateDtoSchema` |
| `apps/api/src/encounters/encounters.controller.ts` | Garde rôle PROVIDER/ADMIN pour `admissionSummaryJson` |
| `apps/api/src/encounters/encounters.service.ts` | Persistance, validation, `admittedAt`, `type` INPATIENT si pertinent |
| `apps/api/src/patients/chart-summary.service.ts` | Sélection + exposition chart (`admissionSummaryJson`, `admittedAt`) |
| `apps/web/src/lib/chartApi.ts` | Types `ChartSummaryEncounter` |
| `apps/web/src/lib/encounterAdmission.ts` | Formulaire / payload côté web |
| `apps/web/src/components/patient-chart/patientChartHelpers.ts` | `parseAdmissionSummaryForChart` |
| `apps/web/src/components/patient-chart/EncounterClinicalTimeline.tsx` | Bloc timeline « Décision d’admission » |
| `apps/web/app/app/encounters/[id]/page.tsx` | Action « Admettre le patient », modale, résumé |

> **Note:** Si votre branche locale contient d’autres changements (autres écrans, scripts, etc.), vérifiez-les avec :  
> `git status` et `git diff main...HEAD --name-only` avant tag/commit.

---

## 2. Checklist de tests manuels (concis)

**Pré-requis:** migration appliquée (`prisma migrate deploy`), API + web démarrés, utilisateur avec rôle adapté.

1. **PROVIDER ou ADMIN** — consultation **OPEN** : le bouton **« Admettre le patient »** est visible ; **RN seul** (sans rôle prescripteur) : bouton absent.
2. Ouvrir la modale, remplir **au moins un** champ obligatoire côté API, **Enregistrer** : succès, rechargement du dossier.
3. Vérifier **badge** « Patient admis (hospitalisation) », type de consultation **Hospitalisation** si attendu, section **Résumé** avec le dossier d’admission.
4. Ouvrir le **dossier patient** — timeline : bloc **Décision d’admission** avec les champs renseignés.
5. **Sortie / clôture** : terminer la consultation comme d’habitude — la visite se ferme ; l’admission reste visible dans l’historique (timeline).
6. **API** — compte **RN** : `PATCH /encounters/:id` avec `admissionSummaryJson` → **403**.
7. Consultation **CLOSED** : tentative de modifier `admissionSummaryJson` → erreur métier (consultation non ouverte).

---

## 3. Commandes Git suggérées (checkpoint)

Après revue et tests satisfaisants :

```bash
git add .
git commit -m "feat: physician-admission-mvp"
git tag medora-stable-physician-admission-mvp
git push origin --tags
```

Pousser aussi la branche si besoin :

```bash
git push origin HEAD
```

**Convention du dépôt** (voir `docs/RELEASE_CHECKPOINTS.md`) : tags de forme `medora-stable-YYYYMMDD-<slug>`. Variante optionnelle :

```bash
git tag medora-stable-$(date -u +%Y%m%d)-physician-admission-mvp
git push origin --tags
```

---

## 4. Vérifications automatisées (recommandé)

```bash
pnpm verify:shared
pnpm verify:api
pnpm verify:web
```

---

*Document généré pour jalonnage stabilité — ne remplace pas `docs/SMOKE_TEST_CHECKLIST.md` ni `docs/CLINICAL_REGRESSION_MATRIX.md` pour les régressions transverses.*
