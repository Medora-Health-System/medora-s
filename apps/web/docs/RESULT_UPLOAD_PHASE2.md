# Phase 2 — Téléversement des résultats (recommandation)

## Contexte (MVP actuel)

Les pièces sont lues en **base64** côté navigateur et envoyées dans un corps **JSON** (`PUT /orders/:id/result`). Le serveur impose des plafonds stricts (`MAX_TOTAL_RESULT_CHARS`, `MAX_SINGLE_BASE64_CHARS` dans `apps/api/src/results/results.service.ts`), ce qui convient au texte et aux PDF légers mais **pénalise l’imagerie** (fichiers plus lourds).

Le client valide désormais **avant** lecture / envoi (`apps/web/src/lib/resultUploadLimits.ts`) pour éviter les échecs opaques.

## Évolution recommandée (hors périmètre MVP)

1. **API multipart** (`multipart/form-data`) ou **URL présignée** vers un stockage objet (S3-compatible, GCS, etc.) pour les binaires.
2. Enregistrer dans `resultData` uniquement des **métadonnées** (clé objet, nom, type MIME, taille, checksum) — pas le base64 dans la base relationnelle.
3. Conserver les mêmes règles métier (statut de ligne, audit) et une **limite de taille** côté API sur le flux multipart (sans supprimer les garde-fous actuels pour le JSON historique si des clients anciens subsistent).
4. Prévisualisation / téléchargement sécurisé via route dédiée ou URL temporaire.

Cette refonte évite d’augmenter aveuglément les plafonds JSON et reste compatible avec une traçabilité clinique.
