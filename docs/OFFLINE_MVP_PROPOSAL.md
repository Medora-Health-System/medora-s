# Offline MVP Proposal — Smallest Safe Scope (One Clinic)

**Status:** Proposal only. Do not implement until Phase 4 (offline sync architecture) is explicitly started.

**Scope:** One clinic. Three workflows only: **patient lookup**, **encounter documentation**, **medication dispensing**.

---

## 1. Offline scope

### In scope (offline-capable)

| Workflow | Offline behavior |
|----------|-------------------|
| **Patient lookup** | Search and open patient record from a **pre-downloaded** subset of the clinic’s patients (e.g. active / recently seen). Read-only when offline; no registration of new patients offline in MVP. |
| **Encounter documentation** | Create encounter, document visit (chief complaint, notes, treatment plan, follow-up date), add diagnoses. All writes **queued locally** and synced when online. |
| **Medication dispensing** | Dispense from **pre-downloaded** inventory for the clinic. Decrement local quantity; create dispense + transaction records in **local queue**; sync when online. No receipt of new stock or catalog changes offline in MVP. |

### Explicitly out of scope for this MVP

- New patient registration offline
- Vaccination recording offline
- Disease reports offline
- Follow-up create/complete offline
- Orders (lab/imaging) creation offline
- Full catalog sync (medications, vaccines) while offline
- Multi-facility or multi-clinic offline
- Real-time collaboration or live conflict resolution during offline

### Connectivity assumption

- **Online:** All reads/writes go to server as today; queue drains.
- **Offline:** Reads from local store; writes go to local queue and are applied to server after reconnect.
- **Degraded:** Optional: “prefer offline” mode that still uses queue even when online (e.g. flaky link). Can be a later refinement.

---

## 2. Risks

| Risk | Mitigation |
|------|------------|
| **Dispense with stale inventory** | Offline dispense only allowed when the item was in the last synced snapshot and local `quantityOnHand` ≥ requested. After sync, server re-validates; if stock was consumed elsewhere, server returns conflict and UI shows French error + “adjust or cancel.” |
| **Duplicate encounter for same patient** | Same rule as online: one OPEN encounter per patient per facility. Local store enforces before queueing; sync rejects if server already has OPEN (e.g. created by another device). |
| **Patient not in local cache** | Offline: hide “Nouveau patient” or disable; show “Patient non disponible hors ligne. Reconnectez-vous ou utilisez un patient déjà chargé.” |
| **Data loss if device lost** | Queue and local DB are device-local; no cloud backup of offline-only data until sync. Acceptable for single-clinic MVP; document and add backup/sync-frequency policy later. |
| **Clock skew** | Use server-authoritative timestamps on sync for `createdAt`/`dispensedAt` where semantics matter; client sends “occurred at” only for display until confirmed. |
| **Partial sync failure** | Queue items are applied one-by-one (or in small batches); failed item stays in queue with error; rest can proceed. No all-or-nothing transaction across the whole queue. |

---

## 3. Local data model approach

- **Single facility:** One `facilityId` for the clinic; all local data scoped to it.
- **Reuse server IDs:** Use same UUIDs for Patient, Encounter, Diagnosis, InventoryItem, MedicationDispense, etc. Client generates UUIDs for new entities (same as server today); no ID remapping on sync.
- **Minimal local schema (conceptual):**

  - **Patients (read-only cache):** `id`, `facilityId`, `firstName`, `lastName`, `mrn`, `dob`, `phone`, `updatedAt` (or equivalent). Subset of clinic patients downloaded when online (e.g. by “last 90 days” or “active list”).
  - **Encounters (cache + pending):** Same shape as server Encounter (relevant fields). Pending = created/updated offline not yet synced.
  - **Diagnoses (cache + pending):** Linked to encounter; same IDs as server.
  - **Inventory (read-only cache):** `InventoryItem` + `quantityOnHand`, `catalogMedication` (code/name). Snapshot when online; used to allow/block dispense and show stock.
  - **MedicationDispense + InventoryTransaction (pending):** Created offline; queued for server.

- **No separate “offline schema” in a different shape:** Local store mirrors server entities and facility scope so that:
  - Sync is “replay queue” + “refresh cache,” not a complex mapping layer.
  - Same validation rules (e.g. one OPEN encounter, non-negative stock) can be enforced locally before queueing.

- **Store technology:** Out of scope for this document (IndexedDB, SQLite, or similar). Choice should favor: simple reads/writes, one facility filter, and easy queue iteration.

---

## 4. Sync queue approach

- **Queue contents:** Outgoing mutations only (encounter create/update, diagnosis create, dispense + inventory transaction). Each item: operation type, entity type, payload (body matching existing API DTOs), client-generated ID, optional client timestamp.
- **Ordering:** Process queue in **creation order** (FIFO). Encounter before diagnoses for that encounter; dispense after encounter exists (server already enforces encounterId/patientId/facilityId).
- **Sending:** When online, dequeue one (or a small batch), POST/PATCH to existing REST endpoints. On success: remove from queue, update local cache from response (e.g. server `updatedAt`). On 4xx (e.g. conflict): mark item as failed, store error code/message for UI, do not remove until user resolves or discards.
- **Pulling:** After queue drain (or periodically when online), refresh local cache: patients, encounters, diagnoses, inventory. Use existing list/detail endpoints with `facilityId`; replace or merge by ID so local state matches server for that facility.
- **No two-way merge algorithm in MVP:** Server is source of truth. Local pending changes are “replay”; server rejects invalid state (e.g. duplicate OPEN encounter, negative stock). Conflict resolution = fix data or cancel pending action; no automatic merge of conflicting edits.

---

## 5. Conflict rules

- **Encounter “already OPEN” (409):** Server returns conflict when client tries to create an encounter and one already exists for that patient/facility. Rule: **server wins.** Client removes pending “create encounter” from queue; UI: “Une consultation est déjà ouverte pour ce patient. Actualisez ou ouvrez-la.” Optionally refresh patient from server and show link to existing encounter.
- **Dispense / stock (409 or 400):** Server rejects if inventory would go negative or item not found. Rule: **server wins.** Queue item marked failed. UI: “Dispensation refusée (stock insuffisant ou ligne supprimée). Ajustez la quantité ou annulez la dispensation en attente.”
- **Diagnosis create (e.g. encounter closed):** If server closed the encounter in the meantime, reject diagnosis. Rule: **server wins.** Show: “La consultation a été fermée. Cette déclaration de diagnostic n’a pas été enregistrée.”
- **Generic 4xx:** Mark item failed; show short French message + “Vérifiez les données ou contactez l’administrateur.” No overwrite of server data by client in MVP.

---

## 6. French UI states

All user-visible text remains French-only. Example states:

- **Connectivity:** “En ligne” / “Hors ligne” (indicator). “Synchronisation en cours…” / “En attente de connexion pour synchroniser.”
- **Queue:** “X enregistrement(s) en attente de synchronisation.” “Échec de synchronisation : [raison]. Corrigez ou annulez.”
- **Patient lookup offline:** “Patient non disponible hors ligne.” “Reconnectez-vous pour accéder à tous les patients.”
- **Dispense offline:** “Dispensation enregistrée localement. Elle sera envoyée au serveur à la prochaine connexion.”
- **Errors after sync:** Use short, clear French messages (e.g. “Consultation déjà ouverte”, “Stock insuffisant”) as above; no raw English API messages in UI.

---

## 7. Phased implementation order

1. **Foundation (no UI yet)**  
   - Local store + single `facilityId` scope.  
   - Sync queue (append, FIFO, send one-by-one when online, mark success/failure).  
   - Connectivity detection (simple online/offline).

2. **Patient lookup offline**  
   - Download patient subset (e.g. by last activity or explicit “sync patients”) when online.  
   - Offline: search and open patient from local cache only; show “non disponible hors ligne” for others.  
   - No write path yet.

3. **Encounter documentation offline**  
   - Cache encounters (and diagnoses) for the facility; queue encounter create/update and diagnosis create.  
   - Offline: create encounter, document visit, add diagnoses; all queued.  
   - Sync: POST/PATCH to existing endpoints; apply conflict rules; refresh cache.

4. **Medication dispensing offline**  
   - Cache inventory (items + quantities) when online.  
   - Offline: dispense only if local quantity ≥ requested; queue dispense + transaction; decrement local quantity optimistically.  
   - Sync: POST dispense; on conflict, mark failed and optionally revert local quantity; refresh inventory cache.

5. **Polish**  
   - French UI for all new states (connectivity, queue, errors).  
   - Optional: “Sync now” button, simple queue status list (e.g. “X en attente”), and clear “Échec” with one action (e.g. “Annuler cette action”).

---

**Summary:** Smallest safe offline MVP = one clinic, three flows (patient lookup from cache, encounter + diagnoses via queue, dispense from cached inventory via queue), server as source of truth, FIFO sync queue, simple conflict rule “server wins,” and all new UI in French. Implementation deferred until Phase 4.
