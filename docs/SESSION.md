# Session et authentification (Medora-S)

## Cause des déconnexions fréquentes (corrigée)

1. **Désalignement JWT / cookies**  
   Les cookies `medora_session` / `accessToken` avaient une `maxAge` fixe (8h) alors que l’API peut définir `JWT_ACCESS_TTL` plus court (ex. 15m). Le navigateur gardait un cookie « valide » alors que le JWT était déjà expiré.

2. **Proxy `/api/backend` sans refresh préalable**  
   Avec un jeton expiré, l’appel `/auth/me` utilisé pour résoudre l’établissement échouait. Le proxy renvoyait **400** « Aucun établissement sélectionné » au lieu de **401**, donc le client ne déclenchait pas le flux `POST /api/auth/refresh` → impression de session « cassée » ou erreurs aléatoires.

3. **Pas de renouvellement proactif**  
   Un utilisateur inactif côté API (aucune requête) pouvait voir le JWT expirer sans renouvellement avant la prochaine action.

4. **Intervalle de refresh client fixe (4 min) > TTL court en prod (ex. 2 min)**  
   Le layout appelait `POST /api/auth/refresh` toutes les 4 minutes alors que le JWT pouvait expirer avant — `/api/auth/me` échouait → redirection `/login`.

## Modifications apportées

- **`JWT_ACCESS_TTL` partagé** : `apps/web` lit `JWT_ACCESS_TTL` (via `jwtAccessTtlSeconds()`) pour la `maxAge` des cookies de session au login et au refresh — **même valeur que l’API** recommandée dans `apps/api/.env.example` (`8h`).
- **Proxy** (`nestApiProxy`) : tentative de **refresh une fois** si l’établissement ne peut pas être résolu (souvent jeton expiré), puis nouvelle tentative ; si la requête Nest renvoie **401**, refresh puis **une** nouvelle tentative. Les cookies sont mis à jour via `Set-Cookie` quand un refresh a lieu.
- **Layout `/app`** : `GET /api/auth/me` exige `res.ok` (sinon redirection vers `/login`) ; **intervalle de refresh proactif** = `getProactiveRefreshIntervalMs(parseJwtAccessTtlSeconds(NEXT_PUBLIC_JWT_ACCESS_TTL))` (~40 % du TTL, borné pour rester avant expiration du jeton). En dev, avertissements si `NEXT_PUBLIC_JWT_ACCESS_TTL` est absent ou si l’intervalle est incohérent.
- **Hook** `useFacilityAndRoles` : même logique `res.ok` + `credentials: "include"`.

## Comportement attendu

- **Jeton d’accès** : durée = `JWT_ACCESS_TTL` (défaut API **8h** si variable absente).
- **Refresh** : cookie `refreshToken` ~7 jours (inchangé) ; rotation côté Nest à chaque refresh.
- **Travail normal** : le refresh proactif a lieu **avant** l’expiration du JWT ; navigation et appels API déclenchent aussi refresh sur 401 si besoin.

## Déploiement

Définir **la même** valeur pour :
- **`JWT_ACCESS_TTL`** sur l’API et sur le serveur Next (cookies),
- **`NEXT_PUBLIC_JWT_ACCESS_TTL`** sur le build web (intervalle client — **obligatoire** si le TTL diffère du défaut 8h).

Sur des plateformes serverless avec limite de taille de requête, vérifier aussi les limites du proxy Next (hors scope session).
