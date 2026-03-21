# Haiti MVP — Pilot readiness and clinic script

Operational checklist and admin/dev guide for running the Medora-S Haiti clinic pilot.

---

## 1. Modules and features

| Module | Route(s) | Description |
|--------|----------|-------------|
| **Track Board** | `/app` | Active encounters (OPEN, today); demographics, chief complaint, ESI, status. |
| **Registration** | `/app/registration` | Entry point for front desk; use **Patients** to register and create encounters. |
| **Patients** | `/app/patients`, `/app/patients/[id]` | Search, register new patient, view chart (Summary, Encounters, Vaccinations, etc.). |
| **Encounters** | `/app/encounters`, `/app/encounters/[id]` | List encounters; detail: Triage/Vitals, diagnoses, orders, pathways, Clinic visit. |
| **Follow-ups** | `/app/follow-ups` | Upcoming follow-ups by date range; Mark completed / Cancel. Patient chart Summary has Follow-ups section + Add follow-up. |
| **Nursing** | `/app/nursing` | Nursing workflow entry. |
| **Provider** | `/app/provider` | Provider workflow entry. |
| **Lab Worklist** | `/app/lab-worklist` | Lab orders: Acknowledge, Start, Complete. |
| **Radiology Worklist** | `/app/rad-worklist` | Imaging orders. |
| **Pharmacy Worklist** | `/app/pharmacy-worklist` | Medication orders. |
| **Pharmacy** | `/app/pharmacy/inventory`, `/app/pharmacy/dispense`, `/app/pharmacy/low-stock`, `/app/pharmacy/expiring` | Inventory and dispense medication. |
| **Public Health** | `/app/public-health/summary`, `/app/public-health/vaccinations`, `/app/public-health/disease-reports` | Vaccinations, disease case reports. |
| **Billing** | `/app/billing` | Billing workflow. |
| **Admin** | `/app/admin` | Admin-only. |

---

## 2. Roles and access

| Role | Typical access |
|------|----------------|
| **ADMIN** | All modules. |
| **PROVIDER** | Track Board, Nursing, Provider, Patients, Encounters, Follow-ups, Pharmacy (inventory/low-stock/expiring), Public Health. |
| **RN** | Track Board, Nursing, Patients, Encounters, Follow-ups, Pharmacy (inventory/low-stock/expiring), Public Health. |
| **FRONT_DESK** | Registration, Patients (for registration flow). |
| **LAB** | Lab Worklist only. |
| **RADIOLOGY** | Radiology Worklist only. |
| **PHARMACY** | Pharmacy Worklist, Pharmacy Inventory, Dispense, Low Stock, Expiring. |
| **BILLING** | Billing. |

Nav items are filtered by the user’s roles for the **selected facility** (facility switcher in top bar). API enforces the same roles per endpoint.

---

## 3. Demo users (seed)

Password for all: **`Admin123!`**

| Email | Role | Name (seed) |
|-------|------|-------------|
| `admin@medora.local` | ADMIN | Admin User |
| `provider@medora.local` | PROVIDER | Jean Baptiste |
| `rn@medora.local` | RN | Marie Claire |
| `pharmacy@medora.local` | PHARMACY | Pierre Louis |

All demo users are assigned to the **Haiti** facility (Clinique Bon Samaritain, code HT). Admin is also assigned to the DR facility. After login, select the **HT** facility in the top bar to see Haiti data and nav.

---

## 4. Seed data (Haiti MVP)

Running `pnpm --filter @medora/api prisma:seed` creates:

- **Roles** and **facilities** (DR, HT).
- **Departments** per facility (Primary Care, Lab, Rad, Pharmacy, Inpatient).
- **Admin** + **demo users** (above), assigned to HT (and admin to DR).
- **Catalog medications** (e.g. Amoxicillin, Metformin, ORS, Albendazole, Chloroquine).
- **Vaccine catalog** (OPV, BCG, MMR, DTP, Hep B, Typhoid, Cholera, Yellow fever).
- **Patients** (10, MRN 1001–1010, Haiti addresses).
- **Inventory** at HT (SKUs, quantities, lot/expiry).
- **Encounters** (outpatient, some OPEN, some CLOSED), **diagnoses**, **medication dispenses**, **vaccine administrations**, **disease case reports**.

Seed is idempotent for users/facilities/catalogs; sample encounters/diagnoses/dispenses/vaccinations/cases are only created once (when no existing seed-marked encounters).

---

## 5. Local startup

1. **Install**
   ```bash
   pnpm install
   ```

2. **Postgres** (recommended: Docker)
   ```bash
   cp infra/docker/.env.example infra/docker/.env
   docker compose -f infra/docker/docker-compose.yml up -d
   ```

3. **API**
   ```bash
   cp apps/api/.env.example apps/api/.env
   # Edit apps/api/.env: set DATABASE_URL, PORT (e.g. 3001), JWT secrets
   pnpm --filter @medora/api prisma:generate
   pnpm --filter @medora/api prisma:migrate
   pnpm --filter @medora/api prisma:seed
   pnpm --filter @medora/api dev
   ```
   API runs at `http://localhost:3001` (or the `PORT` in `.env`).

4. **Web**
   ```bash
   # Optional: set API URL if API is not on 3001
   # export API_URL=http://localhost:3001
   PORT=3002 pnpm --filter @medora/web dev
   ```
   Web runs at `http://localhost:3002`. Login at `/login`.

5. **Create/refresh admin** (optional)
   ```bash
   ADMIN_EMAIL=admin@medora.local ADMIN_PASSWORD=Admin123! pnpm --filter @medora/api create-admin
   ```
   Requires at least one facility (run seed first).

---

## 6. Recommended pilot workflow (one clinic)

1. **One facility**: Use the Haiti (HT) facility for the pilot; all demo users and seed data are HT.
2. **Roles**: Use ADMIN for setup and training; PROVIDER and RN for clinical flows; PHARMACY for dispense; FRONT_DESK if registration is separate.
3. **Order of operations**: Registration → Encounter → Clinical documentation (triage, diagnosis, plan) → Orders (lab/rad/pharmacy as needed) → Dispense / Vaccinations / Disease report as applicable → Chart summary and follow-ups for continuity.

---

## 7. Clinic pilot script

End-to-end path through the app for a single “demo visit.”

| Step | Action | Where |
|------|--------|--------|
| 1 | **Register patient** | **Patients** → “New patient” → Fill name, DOB, phone, etc. → Submit. |
| 2 | **Start encounter** | Open the new patient → **Encounters** tab → “New encounter” → Type OUTPATIENT, visit reason → Submit. |
| 3 | **Add diagnosis** | Stay on patient (or open from Track Board) → **Summary** tab → “Add diagnosis” → Select encounter, enter code (e.g. J06.9), description → Submit. |
| 4 | **Dispense medication** | **Dispense Medication** (Pharmacy) → Search patient → Select patient → Select encounter → Select inventory item, quantity, instructions → Dispense. |
| 5 | **Record vaccination** | **Vaccinations** (Public Health) → Search patient → Select patient → Select encounter → Vaccine, dose #, lot, date → Record. |
| 6 | **Submit disease report** | **Disease Reports** (Public Health) → Search patient → Select patient → Disease code/name, status (Suspected/Confirmed/Ruled out), onset, commune/department, notes → Submit. |
| 7 | **Review chart summary** | **Patients** → Open patient → **Summary** tab. Check Demographics, Recent encounters, Active diagnoses, Medication dispenses, Vaccination history, Follow-ups. |

Optional: from the same encounter, add a **Follow-up** (Summary → Add follow-up → due date, reason, notes) and later use **Follow-ups** to Mark completed or Cancel.

---

## 8. Known limitations

- **Registration** page is a placeholder; actual registration is “New patient” on the Patients page.
- **Nursing / Provider** pages are entry points; detailed workflow is in Encounters and patient chart.
- **Orders**: Lab/Rad/Pharm orders are created from encounter/order flows; worklists show orders by status (e.g. SIGNED → ACKNOWLEDGED → IN_PROGRESS → COMPLETED).
- **Pathways** (Stroke/Sepsis/STEMI/Trauma) and **ER pathways** are available in code/seed-pathways; confirm which are in scope for Haiti pilot.
- **Follow-ups**: Lightweight tracking only; not a full scheduler.
- **Billing**: Module present; integration level is pilot-dependent.
- **Multi-facility**: User sees one facility at a time (cookie); switch facility in top bar.

---

## 9. Troubleshooting

### Ports

- **API**: Default in `apps/api/.env` is `PORT=3001`. Web’s proxy defaults to `http://localhost:3001` (see `apps/web/app/api/**/route.ts`: `API_URL` / `MEDORA_API_URL`). If the API runs on another port, set `API_URL` (or `MEDORA_API_URL`) when starting or in env so the web can reach it.
- **Web**: Default Next.js dev port is 3000. To avoid conflict with API, run with `PORT=3002` (e.g. `PORT=3002 pnpm --filter @medora/web dev`). Production-style start uses port 5000 unless overridden.

### pnpm

- Use **pnpm** (not npm/yarn) for install and filters: `pnpm install`, `pnpm --filter @medora/api dev`.
- If you get “workspace not found” or wrong package, run from the **monorepo root** (where `pnpm-workspace.yaml` is).

### Prisma (migration / seed)

- **Generate client** after schema changes: `pnpm --filter @medora/api prisma:generate`.
- **Migrations**: `pnpm --filter @medora/api prisma:migrate` (or `prisma migrate dev` inside `apps/api`). Requires a running Postgres and correct `DATABASE_URL` in `apps/api/.env`.
- **Seed**: `pnpm --filter @medora/api prisma:seed`. Fails if roles/facilities are missing; run migrations first. To re-seed only catalogs: `pnpm --filter @medora/api prisma:seed-catalogs`. Pathways: `pnpm --filter @medora/api prisma:seed-pathways` (after pathways migrations).
- **“Schema not in sync”**: Run `prisma generate` and `prisma migrate dev`; fix any pending migrations.

### Auth / session

- **Login**: POST to `/api/auth/login` (via web login page); JWT is stored in cookies. Ensure API is up and `API_URL` points to it.
- **401 / “Unauthorized”**: Token expired or invalid. Log out and log in again. Check JWT secrets in `apps/api/.env` (same as when token was issued).
- **No nav / “forbidden”**: User has no role for the current facility. Assign role in DB (`UserRole` for that user/facility/role) or log in as a user that has the right role (e.g. admin@medora.local) and select the **HT** facility.
- **Facility switcher**: After login, pick the facility (e.g. Clinique Bon Samaritain (Haiti)). `medora_facility_id` cookie is set; API uses `x-facility-id` from the proxy.

---

**Document path:** `docs/HAITI_MVP_PILOT.md`
