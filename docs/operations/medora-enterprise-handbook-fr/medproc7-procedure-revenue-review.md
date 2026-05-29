# MEDPROC.7 — Gouvernance revue revenus procédures (entreprise)

## Objectif

Permettre aux rôles **facturation** et **administration** de revoir les événements de facturation procédure créés par MEDPROC.6, sans générer de réclamations ni modifier le parcours clinique.

## Principes

- Le soin clinique est **terminé avant** la revue facturation.
- Aucune réclamation CMS-1500 / UB-04 n'est générée dans cette phase.
- Aucun remboursement ni solde patient n'est calculé.
- Les codes CPT/HCPCS ne sont **pas** finalisés automatiquement.

## File de revue

Menu : **Facturation → Revue capture de charges** — section **Revue facturation procédures (entreprise)**.

Colonnes et indicateurs :

- nom de la procédure (catalogue entreprise) ;
- statut de revue revenus ;
- côté revue (professionnel / établissement / les deux) ;
- documentation liée ou manquante ;
- correspondance référentiel tarifaire ;
- avertissements (orphelin, doublon possible).

## Décisions possibles

| Décision | Effet (aperçu) |
|----------|----------------|
| Approuver pour revue export | Prêt pour revue export institutionnelle — pas de soumission payeur |
| Mettre en attente — documentation | Documentation procédure encore requise pour revue |
| Mettre en attente — codeur | Revue codeur requise |
| Mettre en attente — référentiel | Correspondance charge master établissement requise |
| Rejeter — non facturable | Ligne marquée non facturable (aperçu) |

Chaque décision exige un **motif** ; la note interne est optionnelle et ne doit **pas** contenir de PHI.

## Audit

Les décisions sont journalisées (`PROCEDURE_REVENUE_REVIEW_DECISION`) avec identifiants techniques uniquement (événement, consultation, procédure catalogue).

## Hors périmètre (MEDPROC.7)

- Soumission aux payeurs
- Génération de réclamations
- Modification des ordres ou de la documentation clinique
