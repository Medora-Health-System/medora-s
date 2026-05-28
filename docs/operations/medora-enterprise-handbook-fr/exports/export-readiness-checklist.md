# Checklist préparation export — Manuel entreprise FR

**Phase:** M-BOOK.FR.11  
**Emplacement:** `exports/export-readiness-checklist.md`

---

## 1. Préparation contenu textuel

- [ ] Tous volumes 1–9 revus (statut draft → approbation locale)  
- [ ] Page de garde et introduction générale à jour  
- [ ] Table des matières numérotation PDF validée  
- [ ] Glossaire et index acronymes synchronisés avec canon  
- [ ] Index routes vérifié vs `sidebarNavConfig.ts`  
- [ ] Manifeste `handbook-manifest-fr.ts` à jour  
- [ ] Tests source-level FR.1–FR.11 passent  

---

## 2. Revue terminologique

- [ ] [french-terminology-canon.md](../../french-terminology-canon.md) référencé  
- [ ] Distinction orientation / disposition correcte partout  
- [ ] Pas de promesse « offline complet »  
- [ ] Intelligence motif = insertion manuelle (19MDM)  
- [ ] Carry-forward = réconciliation requise (19T)  
- [ ] Registre risques consulté pour formulations interdites  

---

## 3. Préparation captures d'écran

- [ ] Inventaire [07-index-captures-ecran.md](../07-index-captures-ecran.md) complet  
- [ ] **Patient fictif obligatoire** — environnement formation uniquement  
- [ ] Revue PHI par second reviewer  
- [ ] Convention nommage `medora-fr-v{n}-{workflow}-{viewport}.png`  
- [ ] Priorité P1 capturée avant export formation  
- [ ] Viewports : desktop 1440px · tablette 768px · mobile 390px  
- [ ] Locale française active sur toutes captures  

### Checklist capture mobile/tablette

- [ ] Menu drawer (V8-02)  
- [ ] Triage tablette (V2-01)  
- [ ] Doc chevet (V8-03)  
- [ ] File pharmacie mobile (V5-01)  
- [ ] Pending sync (V8-04)  

---

## 4. Préparation diagrammes

- [ ] Inventaire [08-index-diagrammes.md](../08-index-diagrammes.md) complet  
- [ ] Libellés 100 % français  
- [ ] SVG source + PNG export 300dpi  
- [ ] Diagramme master parcours patient (D-20) pour couverture  
- [ ] Pas de PHI dans flux  

---

## 5. Export PDF

- [ ] Ordre assemblage § [01-table-des-matieres.md](../01-table-des-matieres.md)  
- [ ] En-têtes / pieds de page : titre manuel + version + date  
- [ ] Table des matières cliquable (si outil le supporte)  
- [ ] Sauts de page entre volumes  
- [ ] Images optimisées (< 500 Ko par capture si possible)  
- [ ] Test impression N/B lisibilité diagrammes  

---

## 6. Export DOCX

- [ ] Styles titres H1–H4 cohérents  
- [ ] Tableaux convertis sans rupture  
- [ ] Images inline avec légende FR  
- [ ] Commentaires direction sur chapitres sélectionnés  
- [ ] Piste modifications activée (optionnel)  

---

## 7. Revue PHI et confidentialité

- [ ] Aucun nom patient réel  
- [ ] Aucun identifiant médical réel  
- [ ] Floutage si capture accidentelle  
- [ ] Validation direction avant diffusion externe  
- [ ] Distribution limitée au personnel autorisé  

---

## 8. Revue exécutive (direction)

- [ ] Introduction §10 limites institutionnelles  
- [ ] Dépendance cloud explicitée  
- [ ] Programme Haïti résumé (Annexe A + Vol. 9)  
- [ ] Certification ≠ licence professionnelle  
- [ ] Calendrier revue annuelle accepté  

---

## 9. Distribution formation

- [ ] PDF par rôle (volumes assignés) ou monolithique  
- [ ] Registre attestation papier disponible  
- [ ] Super-utilisateurs briefés sur delta export  
- [ ] Date recertification planifiée  

---

## 10. Post-export

- [ ] Version export archivée (nom + date)  
- [ ] Manifeste mis à jour si chemins assets changent  
- [ ] Ticket suivi captures P2 restantes  
- [ ] Plan édition EN future documenté (gouvernance §6)  

---

## Références

- [09-gouvernance-documentaire.md](../09-gouvernance-documentaire.md)  
- [assets-placeholders/](../assets-placeholders/)

---

*Checklist export — M-BOOK.FR.11*
