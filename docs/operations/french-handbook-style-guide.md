# Medora-S — Guide de style du manuel d’orientation (français)

**Phase:** M-BOOK.FR.1  
**Statut:** Scaffolding — le manuel final n’est pas rédigé dans cette phase  
**Audience:** Rédacteurs formation, administrateurs clinique, déploiement Haïti

---

## 1. Ton et voix

- **Professionnel** — pas familier, pas académique excessif.  
- **Opérationnel** — orienté tâches : « Ouvrir… », « Enregistrer… », « Vérifier… ».  
- **Cliniquement sûr** — ne jamais promettre un résultat clinique ; décrire les actions et responsabilités.  
- **Accessible** — phrases courtes ; une idée par puce.  
- **Enterprise-grade** — cohérent entre rôles et modules.  
- **Haïti-ready** — exemples locaux (effectifs réduits, connectivité variable) sans stéréotypes.

**Interdit dans le manuel :** humour, blame utilisateur, certitudes diagnostiques, « le système décide ».

---

## 2. Formatage

| Élément | Règle |
|---------|-------|
| Titres | `#` manuel ; `##` chapitre ; `###` procédure ; `####` sous-étape |
| Listes | Puces pour étapes parallèles ; numérotation pour séquence obligatoire |
| Captures | Légende FR ; flèches sur boutons avec libellé **exact** i18n |
| Tableaux | En-têtes FR ; colonne « Rôle » si multi-acteur |
| Encadrés | **Attention** (sécurité), **Note** (contexte), **Admin** (RBAC) |
| Code / routes | Monospace ; ne pas traduire (`/app/emergency/trackboard`) |

---

## 3. Nommage des rôles

- Utiliser les titres du [canon terminologique](./french-terminology-canon.md) Section 2.  
- Première mention : titre complet (« Infirmier(ère) aux urgences »).  
- Mentions suivantes : forme courte approuvée (« infirmier », « médecin »).  
- Ne pas alterner IDE / infirmier dans un même chapitre sans glossaire.

---

## 4. Capitalisation

- **Phrases** : sentence case pour titres de procédure (« Enregistrer la décision d’orientation »).  
- **Noms propres** : Medora-S, MSPP, Haïti.  
- **Sigles** : majuscules (MDM, ESI, ROI, NIR).  
- **Types de consultation** : pas de majuscule brute enum (`EMERGENCY`) dans le manuel — utiliser « consultation d’urgence ».

---

## 5. Abréviations approuvées

Lister en début de manuel (Annexe). N’introduire une abréviation qu’après définition complète.

Autorisées sans redéfinition à chaque page (après glossaire) : MDM, HPI, ROS, ESI, ROI, ORL, NIR, MAR, ECG.

---

## 6. Règles bilingues

| Contexte | Règle |
|----------|-------|
| UI produit | **Français seul** à l’écran |
| Manuel principal | **Français** ; équivalent EN en annexe technique si requis donateurs |
| Identifiants | Anglais entre backticks |
| Citations dossier | Reproduire telles quelles (Class D) |
| Formation bilingue staff | FR procédure ; EN optionnel pour termes API admin |

Ne jamais mélanger EN/FR dans la même phrase utilisateur (« Cliquer Save »).

---

## 7. Frontières clinique / juridique

**Le manuel peut :**
- décrire où saisir une information ;
- rappeler de documenter risques et consentements ;
- renvoyer aux protocoles locaux de l’établissement.

**Le manuel ne doit pas :**
- donner des seuils cliniques non validés localement ;
- affirmer qu’une action Medora constitue un avis médical ;
- remplacer les protocoles d’urgence nationaux ;
- garantir conformité légale sans relecture juridique locale.

Formulations type : « Selon le protocole de votre établissement… », « Documenter dans Medora… ».

---

## 8. Formulations interdites

Alignées sur gouvernance intelligence motif et disposition :

- « Exclu », « éliminé », « pas de pathologie grave »  
- « Examens normaux », « scanner négatif »  
- « Patient stable pour sortie »  
- « Autorisé à conduire / médicalement autorisé »  
- « Le système a diagnostiqué… »  
- « Doit être admis / doit sortir » (obligation absolue)  
- « Intelligence artificielle a conclu… » (Medora n’est pas un moteur diagnostic)

---

## 9. Mobile et tablette

- Préfixer chapitres terrain : « Sur tablette… »  
- Nommer contrôles identiques au desktop (pas de synonymes).  
- Mentionner gestes : menu hamburger = « Ouvrir le menu de navigation ».  
- Zones touch ≥ 44px — ne pas renommer en UI.

---

## 10. Structure recommandée du manuel final (M-BOOK.FR.2+)

1. Introduction Medora-S et périmètre Haïti  
2. Glossaire canon (extrait Section 1–5)  
3. Parcours par rôle (accueil → triage → …)  
4. Modules transverses (ordres, résultats, ROI)  
5. Dépannage et connectivité  
6. Annexes sigles et index

---

## Références

- [french-terminology-canon.md](./french-terminology-canon.md)  
- [french-workflow-inventory.md](./french-workflow-inventory.md)  
- [french-terminology-risks.md](./french-terminology-risks.md)  
- `docs/ui/language-separation-architecture.md`
