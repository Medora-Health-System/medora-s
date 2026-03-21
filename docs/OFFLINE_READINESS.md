# État hors-ligne (MVP Medora-S) — note technique

Après la passe « corrections démo », voici ce qui est réaliste côté **offline / file d’attente** pour les flux concernés.

## Ce qui fonctionne (partiellement) hors ligne

- **File d’actions** (`offlineQueue`) : certaines mutations sont mises en file lorsque `navigator.onLine === false` ou en cas d’erreur réseau (voir `apiClient.queueTypeForRequest`).
- **Lecture cache** : fiches patient / résumé dossier peuvent afficher des données **en cache** (`offlineCache`) si la requête réseau échoue.

## Cache seulement (lecture, pas de garantie d’écriture)

- **Résumé dossier (chart-summary)** : affichage possible depuis le cache si le GET a déjà réussi une fois.
- **Consultation** : chargement depuis cache `encounter_summaries` en secours.

## File d’attente (écriture différée) — périmètre actuel

Types typiquement queueables (non exhaustif) : création patient, patch patient, création consultation, signes vitaux, création ordre, **patch opérationnel consultation** (`roomLabel` / médecin), dispensation pharmacie, etc.

Après retour en ligne, `processOfflineQueueOnce()` tente d’appliquer la file.

## Non fiable / non « safe » hors ligne (MVP)

- **Salle / médecin attribué** : l’UI peut mettre en file le `PATCH` opérationnel, mais **la cohérence** (pas de doublon, pas de conflit avec un autre poste) n’est pas garantie sans stratégie de fusion — **à traiter comme « meilleur effort »**.
- **Impression dossier patient** : **100 % côté navigateur** ; hors ligne, seules les données **déjà chargées** en mémoire/cache peuvent être imprimées — pas de garantie d’exhaustivité.
- **Envoi de résultats labo/imagerie avec pièces jointes base64** : dépend du réseau et des limites serveur ; **pas** mis en file hors ligne de manière fiable pour les gros corps JSON — **nécessite connexion** pour un usage clinique sûr.
- **Session / auth** : les cookies HTTP-only nécessitent un serveur Next/API ; **pas d’auth offline** pour les appels proxifiés.

## Session (JWT / cookies)

- Durée d’accès API portée par défaut à **8h** côté Nest ; cookies de session alignés sur le login Next.
- Un endpoint **`POST /api/auth/refresh`** renouvelle les jetons à partir du `refreshToken` ; le client retente une requête après **401** une fois.

---

*Document court à usage interne — ne remplace pas une analyse sécurité / disponibilité complète.*
