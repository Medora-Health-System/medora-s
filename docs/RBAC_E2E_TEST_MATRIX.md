# Matrice de test RBAC E2E

Cette matrice couvre la vérification bout-en-bout:
1) création/assignation via administration, 2) connexion, 3) landing, 4) navigation visible, 5) accès URL direct, 6) redirections sûres.

## Conventions

- Mot de passe démo: `Admin123!`
- URL de base: `http://localhost:3000`
- Les routes ci-dessous sont évaluées avec l’établissement de session actif (`medora_facility_id`).

## Rôles simples

| Rôle | Compte | Landing attendu | Nav autorisée (principale) | Nav interdite (principale) |
|---|---|---|---|---|
| ADMIN | `admin@medora.local` | `/app/admin` | Administration, Utilisateurs, Patients, Consultations, Pharmacie, Lab, Imagerie, Facturation, Suivis | Aucune |
| FRONT_DESK | `frontdesk@medora.local` | `/app/registration` | Accueil/inscription, Patients, Suivis | Provider, Nursing, Pharmacie, Lab, Imagerie, Facturation, Admin |
| RN | `rn@medora.local` | `/app/nursing` | Nursing, Provider (si autorisé par règles), Patients, Consultations, Suivis, Santé publique | Admin, Pharmacie (surfaces dédiées), Facturation |
| PROVIDER | `provider@medora.local` | `/app/provider` | Provider, Nursing, Patients, Consultations, Suivis, Santé publique | Admin (si non ADMIN), Pharmacie dédiée, Facturation |
| PHARMACY | `pharmacy@medora.local` | `/app/pharmacy` | Pharmacie, Liste pharmacie, Inventaire, Dispensation, Stock faible, Expirations | Chart patient large, provider, nursing, admin (si non ADMIN) |
| LAB | `lab@medora.local` | `/app/lab-worklist` | File laboratoire, pages résultats prévues par règles | Admin, Pharmacie, Provider (si non prévu) |
| RADIOLOGY | `radiology@medora.local` | `/app/rad-worklist` | File imagerie, pages résultats prévues par règles | Admin, Pharmacie, Provider (si non prévu) |
| BILLING | `billing@medora.local` | `/app/billing` | Facturation (et accès limité consultation si prévu) | Admin, Pharmacie, Provider, Nursing |

## Vérification route par route (minimum)

| Rôle | `/app` | Route interdite manuelle (exemple) | Comportement attendu |
|---|---|---|---|
| FRONT_DESK | Redirige `/app/registration` | `/app/admin/users` | Redirection vers `/app/registration` + message de redirection |
| RN | Redirige `/app/nursing` | `/app/pharmacy` | Redirection vers `/app/nursing` |
| PROVIDER | Redirige `/app/provider` | `/app/admin` | Redirection vers `/app/provider` |
| PHARMACY | Redirige `/app/pharmacy` | `/app/patients/<id>` | Redirection vers `/app/pharmacy` |
| LAB | Redirige `/app/lab-worklist` | `/app/pharmacy` | Redirection vers `/app/lab-worklist` |
| RADIOLOGY | Redirige `/app/rad-worklist` | `/app/admin` | Redirection vers `/app/rad-worklist` |
| BILLING | Redirige `/app/billing` | `/app/provider` | Redirection vers `/app/billing` |

## Cas `?redirect=...`

| Cas | Exemple | Attendu |
|---|---|---|
| Redirect autorisé | `login?redirect=/app/follow-ups` pour FRONT_DESK | Redirect honoré |
| Redirect interdit | `login?redirect=/app/admin/users` pour FRONT_DESK | Ignoré, landing rôle |
| Redirect externe | `login?redirect=https://evil.example` | Ignoré, landing rôle |
| Redirect invalide | `login?redirect=/app/../../admin` | Ignoré, landing rôle |

## Cas multi-rôles

| Profil | Landing attendu (priorité) | Vérification |
|---|---|---|
| ADMIN + FRONT_DESK | `/app/admin` | Priorité ADMIN |
| PROVIDER + ADMIN | `/app/admin` | Priorité ADMIN |
| PHARMACY + ADMIN | `/app/admin` | Priorité ADMIN |
| RN + PROVIDER | `/app/provider` | Priorité PROVIDER |

## Cas multi-établissements

| Scénario | Précondition | Attendu |
|---|---|---|
| Même utilisateur, rôles différents par établissement | User a rôle A dans établissement X, rôle B dans Y | Landing basé sur établissement de session actif (cookie) |
| Changement établissement dans topbar | Session active, changement facility | Navigation et garde route recalculées sur les rôles de ce facility |
| Redirect login | `facilityRoles` multi-sites | Landing calculé à partir du facility de session par défaut (tri stable) |

## Vérifications ADMIN (création/édition/statut/rôles)

| Action | Attendu |
|---|---|
| Créer utilisateur | Validation FR, rôle(s) assigné(s) au facility actif uniquement |
| Modifier profil | Messages FR, conflit email explicite FR |
| Gérer les rôles | Libellés rôles FR, scope facility explicite |
| Désactiver accès facility | N’impacte pas les autres établissements |
| Réactiver accès | Réactive le scope facility, `User.isActive` cohérent globalement |

