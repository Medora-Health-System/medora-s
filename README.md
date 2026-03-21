# Medora S

Sprint 0 monorepo scaffold (API + Web + shared package).

## Quick start

### Install

```bash
pnpm install
```

### Local Postgres (recommended)

Docker is expected on your machine (not required in this CI workspace).

```bash
cp infra/docker/.env.example infra/docker/.env
docker compose -f infra/docker/docker-compose.yml up -d
```

### API

```bash
cp apps/api/.env.example apps/api/.env
pnpm --filter @medora/api prisma:generate
pnpm --filter @medora/api prisma:migrate
pnpm --filter @medora/api prisma:seed
pnpm --filter @medora/api dev
```

API runs on: `http://localhost:3000`
API health: `GET http://localhost:3000/health`

### Web

```bash
PORT=3002 pnpm --filter @medora/web dev
```

Web runs on: `http://localhost:3002`

### Default Credentials

- Email: `admin@medora.local`
- Password: `Admin123!`

### Forgot password (local testing)

1. Apply the password-reset migration if not already done:  
   `pnpm --filter @medora/api prisma:migrate`
2. Set `RESET_PASSWORD_BASE_URL` in `apps/api/.env` to your web app URL (e.g. `http://localhost:3002`).
3. Open the login page, click **« Mot de passe oublié ? »**, enter an email (e.g. `admin@medora.local`) and submit.
4. In **development**, the reset link is printed in the API process stdout (e.g. `[FORGOT-PASSWORD] Reset link (dev only): http://...`). Copy that URL into the browser to open the reset page.
5. Set a new password and confirm; then use the new password to log in.

### Create Admin User

To create or update the admin user:

```bash
ADMIN_EMAIL=admin@medora.local ADMIN_PASSWORD=Admin123! pnpm --filter @medora/api create-admin
```

## Workflow: Track Board / Triage / Worklists

### Overview
The ER workflow system provides real-time tracking of patient encounters, triage management, and departmental worklists for Lab, Radiology, and Pharmacy.

### Track Board (`/app`)
- **Access**: RN, PROVIDER, ADMIN
- **Features**:
  - Displays active encounters (OPEN status, today's date)
  - Shows patient demographics, chief complaint, ESI, status chips
  - Auto-refreshes every 10 seconds
  - Click row to view encounter detail

### Triage Management
- **Access**: RN, PROVIDER, ADMIN
- **Location**: Encounter detail page → "Triage/Vitals" tab
- **Fields**:
  - Chief Complaint
  - Onset Date/Time
  - ESI (Emergency Severity Index 1-5)
  - Vital Signs (Temp, HR, RR, BP, SpO2, Weight, Height)
  - Stroke Screen (JSON)
  - Sepsis Screen (JSON)
  - Triage Complete At
- **API**: `PUT /encounters/:id/triage`

### Department Worklists

#### Lab Worklist (`/app/lab-worklist`)
- **Access**: LAB, ADMIN
- **Features**:
  - Lists lab orders (status: SIGNED, ACKNOWLEDGED, IN_PROGRESS, COMPLETED)
  - Shows limited patient identifiers (Name, MRN, DOB, Sex)
  - Actions: Acknowledge, Start, Complete
  - Auto-refreshes every 10 seconds
- **API**: `GET /worklists/lab`

#### Radiology Worklist (`/app/rad-worklist`)
- **Access**: RADIOLOGY, ADMIN
- **Features**:
  - Lists imaging orders
  - Shows limited patient identifiers
  - Actions: Acknowledge, Start, Complete
  - Auto-refreshes every 10 seconds
- **API**: `GET /worklists/radiology`

#### Pharmacy Worklist (`/app/pharmacy-worklist`)
- **Access**: PHARMACY, ADMIN
- **Features**:
  - Lists medication orders
  - Shows limited patient identifiers
  - Actions: Acknowledge, Start, Complete
  - Auto-refreshes every 10 seconds
- **API**: `GET /worklists/pharmacy`

### Order Status Lifecycle
1. **DRAFT** → Order created but not signed
2. **SIGNED** → Provider signed the order
3. **ACKNOWLEDGED** → Department acknowledged receipt
4. **IN_PROGRESS** → Work started
5. **COMPLETED** → Work finished
6. **RESULTED** → Results entered (Lab/Rad only)
7. **CANCELLED** → Order cancelled

### Order Actions API
- `POST /orders/items/:id/acknowledge` - Acknowledge order (LAB, RADIOLOGY, PHARMACY, ADMIN)
- `POST /orders/items/:id/start` - Start work (LAB, RADIOLOGY, PHARMACY, ADMIN)
- `POST /orders/items/:id/complete` - Complete work (LAB, RADIOLOGY, PHARMACY, ADMIN)

### Results Management
- **Access**: LAB, RADIOLOGY, ADMIN
- **API**: `PUT /orders/:id/result`
- **Fields**:
  - `resultData` (JSON)
  - `resultText` (String)
  - `criticalValue` (Boolean, LAB only)
- **Critical Flag**: `POST /orders/:id/critical` (LAB only)

### Audit Logging
All actions are logged:
- `CHART_OPEN` - Patient chart viewed
- `TRIAGE_SAVE` - Triage data saved
- `ORDER_ACK` - Order acknowledged
- `ORDER_START` - Order work started
- `ORDER_COMPLETE` - Order work completed
- `RESULT_VERIFY` - Result entered/verified
- `CRITICAL_FLAG` - Critical value flagged

### Troubleshooting

#### Next.js Build Errors
If you encounter errors like "Cannot find module ./xxx.js" in Next.js:
```bash
rm -rf apps/web/.next
pnpm --filter @medora/web build
```

This clears the Next.js build cache and regenerates the build artifacts.

### Testing

#### Test as ADMIN
1. Login as `admin@medora.local` / `Admin123!`
2. Navigate to `/app` - should see Track Board
3. Create an encounter from patient detail page
4. View encounter → Triage tab → Fill triage data → Save
5. Navigate to `/app/lab-worklist`, `/app/rad-worklist`, `/app/pharmacy-worklist` - should see all worklists

#### Test as LAB user
1. Create a LAB user with role assignment
2. Login as LAB user
3. Should only see `/app/lab-worklist` in navigation
4. Should only see lab orders in worklist
5. Should see limited patient identifiers (Name, MRN, DOB, Sex)
6. Cannot access `/app/trackboard` or patient clinical details

#### Test as RADIOLOGY user
1. Create a RADIOLOGY user
2. Login as RADIOLOGY user
3. Should only see `/app/rad-worklist` in navigation
4. Should only see imaging orders
5. Cannot access lab or pharmacy worklists

#### Test as RN user
1. Create an RN user
2. Login as RN user
3. Should see Track Board, Triage tab in encounters
4. Can create/update triage data
5. Cannot access worklists

### ER Pathways (Stroke/Sepsis/STEMI/Trauma)

The system supports protocol-driven pathways that automatically create orders and track time-sensitive milestones.

#### Pathway Features
- **Activation**: Creates protocol order sets automatically when pathway is activated
- **Timers**: Tracks milestones with target times and overdue indicators
- **Order Integration**: Protocol orders appear in departmental worklists with pathway tags
- **Status Management**: Pause, complete, or mark milestones as MET

#### Pathway Types
1. **STROKE**: Door to CT (25 min), Door to Needle (60 min), Door to Groin Puncture (90 min)
2. **SEPSIS**: Lactate Drawn (15 min), Antibiotics Started (60 min), Fluid Resuscitation (180 min)
3. **STEMI**: First Medical Contact (10 min), Door to Balloon (90 min), Fibrinolytics (30 min)
4. **TRAUMA**: Primary Survey (5 min), CT Scan (30 min), OR Ready (60 min)

#### Setup Instructions

After code changes, run these commands to set up pathways:

```bash
# Generate Prisma client with new models
pnpm --filter @medora/api prisma:generate

# Create database migration
pnpm --filter @medora/api prisma:migrate dev --name add_pathways_ordersets

# Seed protocol order sets for all facilities
pnpm --filter @medora/api prisma:seed-pathways
```

#### Using Pathways

1. **Activate Pathway**:
   - Navigate to an OPEN encounter
   - Go to "Pathways" tab
   - Click "Activate [PATHWAY_TYPE]"
   - System creates protocol orders and starts timers

2. **View Timers**:
   - Timers auto-refresh every 10 seconds
   - Overdue milestones highlighted in red
   - Shows elapsed time and remaining time

3. **Mark Milestones**:
   - Click "Mark MET" when milestone is achieved
   - Updates status and records completion time

4. **Worklist Integration**:
   - Protocol orders appear in Lab/Rad/Pharm worklists
   - Pathway tag displayed next to priority
   - Orders have `source: "PROTOCOL"` and `priority: STAT`

#### API Endpoints

- `POST /encounters/:id/pathways/activate` - Activate pathway (RN, PROVIDER, ADMIN)
- `POST /pathways/:id/pause` - Pause active pathway
- `POST /pathways/:id/complete` - Complete pathway
- `GET /encounters/:id/pathways` - Get pathway for encounter
- `GET /pathways/:id/timers` - Get timers and milestone status
- `PATCH /pathways/:id/milestones/:mid` - Update milestone status

