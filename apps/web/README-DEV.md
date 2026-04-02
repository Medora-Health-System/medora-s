# Développement web (Medora-S)

## Après `rm -rf apps/web/.next`

Le projet ne dépend plus d’une référence TypeScript vers `.next/types/routes.d.ts` ni d’un `include` sur des fichiers générés absents : `tsc` reste valide **avant** le premier `next dev`.

```bash
# Depuis la racine du monorepo medora-s
rm -rf apps/web/.next
pnpm --filter @medora/web dev
```

Next régénère `.next` au démarrage ; **ne pas** réintroduire dans `tsconfig.json` un `include` sur `.next/types/**/*.ts` sans stratégie de stub (risque d’erreurs IDE après nettoyage du cache).

Si vous activez `typedRoutes: true` dans `next.config`, suivez la doc Next pour les types générés (souvent un `next dev` ou `next build` avant `tsc`).

## En cas d’erreurs Next.js (manifest client, `undefined.call`, chunks)

Cache `.next` souvent en cause après refactors de layouts / barrels.

Vérifier une compilation propre :

```bash
pnpm --filter @medora/web build
```
