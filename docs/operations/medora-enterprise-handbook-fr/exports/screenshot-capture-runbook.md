# Runbook — Capture d'écran manuel (M-BOOK.FR.12)

**Phase:** M-BOOK.FR.12  
**Inventaire:** [07-index-captures-ecran.md](../07-index-captures-ecran.md)  
**Manifeste:** [screenshot-manifest-fr.ts](./screenshot-manifest-fr.ts)

---

## Règles non négociables

| Règle | Détail |
|-------|--------|
| **Patient fictif** | Dossier **formation / test** uniquement |
| **PHI interdit** | Aucun nom, ID, résultat réel |
| **Locale FR** | Interface en français |
| **Revue double** | Second reviewer avant commit repo |
| **Nommage** | `medora-fr-v{n}-{workflow}-{viewport}.png` |

---

## Environnement

1. Déployer ou lancer stack dev/staging formation  
2. Créer patient test explicite : **« Formation Demo »** (pas de données réelles)  
3. Comptes par rôle : accueil, triage, médecin, infirmier, admin  
4. Vérifier établissement formation sélectionné  

---

## Viewports

| Type | Dimensions | DevTools |
|------|------------|----------|
| Desktop | 1440 × 900 | Responsive off |
| Tablette | 768 × 1024 | iPad preset |
| Mobile | 390 × 844 | iPhone preset |

---

## Procédure par capture P1

1. Se connecter avec le rôle approprié  
2. Naviguer vers la route (voir manifeste)  
3. Ouvrir dossier patient **formation**  
4. Capturer (PNG) — outil OS ou DevTools  
5. Renommer selon convention  
6. Déposer dans `assets/screenshots/`  
7. Mettre à jour manifeste : `placeholder: false`  
8. Revue PHI  

---

## Remplacement des placeholders

Les fichiers générés par `pnpm handbook:screenshots:placeholders` affichent :

> **PLACEHOLDER — PATIENT FORMATION FICTIF UNIQUEMENT**

Remplacer **fichier par fichier** en conservant le nom exact.

---

## Capture automatisée (optionnelle)

Playwright peut être ajouté ultérieurement — **hors scope MVP** FR.12.  
Ne pas committer de credentials ; utiliser variables d'environnement locales.

---

## Checklist session

- [ ] Environnement formation confirmé  
- [ ] Locale FR  
- [ ] Liste P1 du manifeste complète  
- [ ] Revue PHI  
- [ ] Tests FR.12 passent  
- [ ] `pnpm handbook:assemble` régénéré  

---

*Runbook capture — M-BOOK.FR.12*
