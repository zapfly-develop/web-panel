export type ProductChannelSyncStatus =
  | "READY"
  | "PENDING"
  | "PROCESSING"
  | "SYNCED"
  | "FAILED"
  | "BLOCKED";

export type ProductChannelSyncStatusItem = {
  source: string;
  status: ProductChannelSyncStatus;
  eligible: boolean;
  message: string;
  externalProductId: string | null;
  syncQueueId: string | null;
  queueStatus: string | null;
  lastEventType: string | null;
  lastErrorMessage: string | null;
  attempts: number;
  lastSyncedAt: string | null;
  updatedAt: string | null;
};

export type ProductSyncStatusResponse = {
  productId: string;
  hasActiveChannels: boolean;
  summary: {
    total: number;
    synced: number;
    failed: number;
    blocked: number;
    pending: number;
  };
  channels: ProductChannelSyncStatusItem[];
};

export type ProductSyncStatusByProductId = Record<
  string,
  ProductSyncStatusResponse
>;
