import { fetchNestApiJson } from "@/lib/nest-api";
import type {
    RiderWallet,
    WalletStatement,
    WalletStatementFilters,
    WalletTransaction,
    WalletWithdrawalPayload,
} from "./wallet-types";

function buildTenantHeaders(userId: string): HeadersInit {
    return {
        "x-user-id": userId,
    };
}

function buildJsonTenantHeaders(userId: string): HeadersInit {
    return {
        ...buildTenantHeaders(userId),
        "Content-Type": "application/json",
    };
}

function buildStatementQuery(filters: WalletStatementFilters = {}) {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(filters)) {
        if (value === undefined || value === null || value === "") {
            continue;
        }

        query.set(key, String(value));
    }

    const queryString = query.toString();
    return queryString ? `?${queryString}` : "";
}

export async function getMyWallet(userId: string): Promise<RiderWallet> {
    return fetchNestApiJson<RiderWallet>("/wallet/me", {
        headers: buildTenantHeaders(userId),
    });
}

export async function getWalletStatement(
    userId: string,
    filters?: WalletStatementFilters,
): Promise<WalletStatement> {
    return fetchNestApiJson<WalletStatement>(
        `/wallet/statement${buildStatementQuery(filters)}`,
        {
            headers: buildTenantHeaders(userId),
        },
    );
}

export async function requestWalletWithdrawal(
    userId: string,
    payload: WalletWithdrawalPayload,
): Promise<WalletTransaction> {
    return fetchNestApiJson<WalletTransaction>("/wallet/withdrawals", {
        method: "POST",
        headers: buildJsonTenantHeaders(userId),
        body: JSON.stringify(payload),
    });
}
