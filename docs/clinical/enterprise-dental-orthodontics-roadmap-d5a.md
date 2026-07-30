# MEDUI.D5A — Implementation roadmap (Dental Care & Orthodontics)

Dependency-ordered program. Adjust only when audits prove otherwise.

| Milestone | Title | Delivers | Blocks until |
|---|---|---|---|
| **D5A.1** | Domain, workflow, architecture, reuse audit | Docs + audit guards | — |
| **D5A.2** | Service line, facility config, roles/capabilities, navigation | `DENTAL` in registry; onboarding toggles; nav | D5A.1 certified |
| **D5A.3** | Dashboard, appointments, worklist, Active Dental Workspace shell | Ambulatory shell; chair/operatory labeling | D5A.2 |
| **D5A.4** | Dentition authority + odontogram | Canonical tooth model + auditable UI | D5A.3 |
| **D5A.5** | Findings, diagnoses, treatment plans, procedures | Versioned plans; procedure events | D5A.4 |
| **D5A.6** | Periodontal assessment + chart | Normalized site measurements | D5A.5 (may parallel late D5A.5) |
| **D5A.7** | Orthodontic case, assessment, treatment-plan authority | Longitudinal OrthodonticCase | D5A.5 |
| **D5A.8** | Appliances, progress visits, retention | Appliance + progress linkage | D5A.7 |
| **D5A.9** | Imaging, photographs, associations, comparisons | DentalImageAssociation; no second repo | D5A.3+ |
| **D5A.10** | Consents, documents, estimates, billing, payment plans | Templates + billing adapters | D5A.5 |
| **D5A.11** | Medical Record integration, reporting, interoperability | Chart projections | D5A.5–9 |
| **D5A.12** | Offline hardening, security, regression, production certification | Haiti/low-connectivity | Prior clinical milestones |

## Explicit non-goals until named milestone

- Odontogram UI/persistence before D5A.4  
- OrthodonticCase persistence before D5A.7  
- Native cephalometric tracing engine (post-D5A or dedicated future ID)  
- Licensed CDT bulk seed without legal clearance  

## D5A.2 entry criteria

Confirmed by D5A.1:

1. Dental = configurable enterprise service line  
2. Reuse Patient, Encounter, Appointment, Orders, Imaging, Rx, Consent, Billing, Follow-up, Medical Record  
3. OrthodonticCase ≠ Encounter  
4. Tooth identity notation-independent  
5. Odontogram history retained (design)  
6. Treatment-plan versioning defined  
7. Role/capability boundaries defined  
8. Facility onboarding path defined  
9. Migration scope documented  
10. No product fork required  
