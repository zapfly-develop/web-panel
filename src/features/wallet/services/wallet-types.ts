export type WalletTransactionType = "CREDIT" | "DEBIT";

export type WalletTransactionCategory =
    | "DELIVERY_PAYOUT"
    | "DELIVERY_ESCROW"
    | "WITHDRAWAL"
    | "REFUND";

export type WalletTransactionStatus = "COMPLETED" | "PENDING" | "FAILED";

export type RiderWallet = {
    id: string;
    userId: string;
    balanceCents: number;
    frozenBalanceCents: number;
    currency: string;
    createdAt: string;
    updatedAt: string;
};

export type WalletTransaction = {
    id: string;
    walletId: string;
    userId: string;
    type: WalletTransactionType;
    category: WalletTransactionCategory;
    status: WalletTransactionStatus;
    amountCents: number;
    currency: string;
    balanceBeforeCents: number;
    balanceAfterCents: number;
    frozenBalanceBeforeCents: number;
    frozenBalanceAfterCents: number;
    sourceModule: string | null;
    sourceEvent: string | null;
    sourceReferenceId: string | null;
    idempotencyKey: string | null;
    description: string | null;
    metadata: unknown;
    processedAt: string | null;
    failedAt: string | null;
    failureReason: string | null;
    createdAt: string;
    updatedAt: string;
};

export type WalletStatementFilters = {
    dateFrom?: string;
    dateTo?: string;
    type?: WalletTransactionType;
    category?: WalletTransactionCategory;
    status?: WalletTransactionStatus;
    take?: number;
};

export type WalletStatement = {
    items: WalletTransaction[];
    filters: WalletStatementFilters;
};

export type WalletWithdrawalPayload = {
    amountCents: number;
    currency?: string;
    idempotencyKey: string;
    pixKey?: string;
    pixKeyType?: string;
    description?: string;
    metadata?: Record<string, unknown>;
};
