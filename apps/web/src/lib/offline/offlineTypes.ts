export type OfflineStoreName =
  | "catalog_medications"
  | "catalog_lab"
  | "catalog_imaging"
  | "patient_summaries"
  | "encounter_summaries"
  | "latest_vitals"
  | "followups"
  | "sync_queue";

export type SyncQueueStatus = "pending" | "syncing" | "failed" | "synced";

export type OfflineQueueItemType =
  | "create_patient"
  | "patch_patient"
  | "save_vitals"
  | "create_encounter"
  | "create_followup"
  | "update_followup_status"
  | "create_order"
  | "medication_administration"
  | "close_encounter"
  | "patch_encounter"
  | "order_item_action"
  | "order_item_result"
  | "pharmacy_stock_add"
  | "pharmacy_dispense"
  | "patch_encounter_operational";

export type OfflineCacheRecord<T = unknown> = {
  localKey: string;
  updatedAt: string;
  facilityId?: string | null;
  patientId?: string | null;
  encounterId?: string | null;
  syncState?: SyncQueueStatus;
  data: T;
};

export type OfflineQueueItem = {
  id: string;
  type: OfflineQueueItemType;
  endpoint: string;
  method: "POST" | "PATCH" | "PUT";
  payload: unknown;
  createdAt: string;
  facilityId: string;
  status: SyncQueueStatus;
  retryCount: number;
  lastError: string | null;
};

export type ConnectivityStatus = "online" | "offline" | "syncing" | "degraded";
