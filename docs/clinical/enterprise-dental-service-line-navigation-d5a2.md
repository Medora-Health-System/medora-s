# MEDUI.D5A.2 — Enterprise Dental service line and navigation

**Certification id:** `MEDUI.D5A.2`  
**Branch:** `d5a2-enterprise-dental-service-line-navigation`

Dental Care is a **configurable enterprise service line** inside Medora — parallel to Clinic Care, Emergency, and Hospitalisation — not a separate product.

See also: [audit](./enterprise-dental-service-line-navigation-d5a2-audit.md) · [certification](../certification/MEDUI.D5A.2-certification.md) · [D5A.1 architecture](./enterprise-dental-orthodontics-architecture-d5a1.md)

---

## Service line

| Token | Purpose |
|-------|---------|
| `DENTAL` | Enterprise service line on `Facility.serviceLinesJson` |

No `Dental` facility type. Facilities (Clinic, Hospital, etc.) enable Dental as a line.

## Specialties (configuration only)

Stored in `facilityCareProfileJson.dentalSpecialties`:

- GENERAL_DENTISTRY  
- ORTHODONTICS  
- PEDIATRIC_DENTISTRY  
- ENDODONTICS  
- PERIODONTICS  
- PROSTHODONTICS  
- ORAL_SURGERY  
- ORAL_MEDICINE  

## Navigation

| Locale | Label |
|--------|-------|
| French | Soins dentaires |
| English | Dental Care |

- Area: `DENTAL_CARE`  
- Route root: `/app/dental`  
- Sidebar: capability/area filtered (not client-only hiding)

## Capabilities

Capability-first (not new RoleCodes):

`DENTAL_VIEW`, `DENTAL_PROVIDER`, `DENTAL_ADMIN`, `ORTHODONTICS_VIEW`, `ORTHODONTICS_EDIT`, `ODONTOGRAM_VIEW`, `ODONTOGRAM_EDIT`, plus documentation / plan / imaging / consent / billing view codes for later milestones.

Resolved as: **profession ∩ `dentalCareEnabled` ∩ specialty config**.

## Authorization

- Server: `DentalCareReadAccessGuard` on `GET /dental-care/*`  
- Facility without `DENTAL` line → forbidden (Admin cannot restore)  
- Web: `isFacilityCareSettingPathAllowed` + shell access check  

## Routes (shell only)

| Path | Purpose |
|------|---------|
| `/app/dental` | Dashboard placeholders |
| `/app/dental/provider` | Provider shell |
| `/app/dental/appointments` | Appointment shell (enterprise Appointment) |
| `/app/dental/follow-up` | Follow-up shell |
| `/app/dental/imaging` | Imaging shell |
| `/app/dental/admin` | Admin shell |
| `/app/dental/workspace` | Active workspace tabs (placeholders) |

## Dashboard sections (placeholders)

Today's appointments · Today's patients · Clinical worklist · Follow-up · Imaging · Orthodontic cases · Treatment plans · Billing · Administration  

No live Dental repositories.

## Active workspace tabs (placeholders)

Overview · History · Odontogram · Periodontal · Assessment · Treatment Plan · Procedures · Imaging · Prescriptions · Clinical Notes · Consents · Follow-up · Summary  

## Explicit non-goals (later milestones)

Odontogram · Tooth model · Periodontal chart · OrthodonticCase · Appliances · Treatment-plan persistence · Dental procedures · Dental billing engines · Clinical documentation engines  

## Enterprise reuse

Patient · Encounter · Appointment · Orders · Results · Follow-up · Billing · EnterpriseDocument · AuditLog · Medical Record · Facility identity (D4C.7I)
