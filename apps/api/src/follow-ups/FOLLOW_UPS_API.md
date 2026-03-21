# Follow-up tracking API (Haiti MVP)

Lightweight follow-up tracking only; no scheduling engine.

## Route list

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | `/follow-ups` | RN, PROVIDER, ADMIN | Create follow-up |
| GET | `/patients/:patientId/follow-ups` | RN, PROVIDER, ADMIN | List follow-ups for patient |
| GET | `/follow-ups/upcoming` | RN, PROVIDER, ADMIN | List OPEN follow-ups by facility and date range |
| POST | `/follow-ups/:id/complete` | RN, PROVIDER, ADMIN | Mark follow-up COMPLETED, set completedAt |
| POST | `/follow-ups/:id/cancel` | RN, PROVIDER, ADMIN | Mark follow-up CANCELLED |

All require JWT and `x-facility-id`.

## Request/response shapes

### POST /follow-ups
**Body:** `patientId` (uuid), optional `encounterId`, `dueDate` (ISO date), optional `reason`, `notes`.  
**Returns:** Created `FollowUp` with `patient`, `facility`, `encounter`, `createdBy`.

### GET /patients/:patientId/follow-ups
**Query:** optional `status` (OPEN | COMPLETED | CANCELLED), `limit` (1–100), `offset`.  
**Returns:** `{ items: FollowUp[], total: number }`. Items include `patient`, `facility`, `encounter`, `createdBy`.

### GET /follow-ups/upcoming
**Query:** optional `from` (ISO date), `to` (ISO date), `limit` (1–200). Default from = now, to = now+90 days.  
**Returns:** `{ items: FollowUp[] }`. Only OPEN, ordered by dueDate ascending.

### POST /follow-ups/:id/complete
No body.  
**Returns:** Updated `FollowUp` (status COMPLETED, completedAt set).

### POST /follow-ups/:id/cancel
No body.  
**Returns:** Updated `FollowUp` (status CANCELLED). Only OPEN can be cancelled.

## Response shape (FollowUp)

Each follow-up includes: `id`, `patientId`, `facilityId`, `encounterId`, `dueDate`, `reason`, `status`, `notes`, `createdByUserId`, `completedAt`, `createdAt`, `updatedAt`, and nested `patient` (id, firstName, lastName, mrn), `facility` (id, code, name), `encounter` (if present), `createdBy` (if present).
