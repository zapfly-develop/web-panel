import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getWalletStatement } from "@/features/wallet/services/wallet-api";
import type { WalletStatementFilters } from "@/features/wallet/services/wallet-types";
import { NestApiError } from "@/lib/nest-api";

export async function GET(request: NextRequest) {
    const session = await auth();

    if (!session?.user?.id || session.user.isSuperAdmin || !session.user.isRider) {
        return NextResponse.json(
            { error: "Sessao invalida para consultar extrato." },
            { status: 401 },
        );
    }

    const filters: WalletStatementFilters = {};
    const params = request.nextUrl.searchParams;
    const take = Number(params.get("take"));

    if (Number.isFinite(take) && take > 0) {
        filters.take = take;
    }

    const type = params.get("type");
    const category = params.get("category");
    const status = params.get("status");
    const dateFrom = params.get("dateFrom");
    const dateTo = params.get("dateTo");

    if (type === "CREDIT" || type === "DEBIT") {
        filters.type = type;
    }

    if (
        category === "DELIVERY_PAYOUT" ||
        category === "DELIVERY_ESCROW" ||
        category === "WITHDRAWAL" ||
        category === "REFUND"
    ) {
        filters.category = category;
    }

    if (status === "COMPLETED" || status === "PENDING" || status === "FAILED") {
        filters.status = status;
    }

    if (dateFrom) {
        filters.dateFrom = dateFrom;
    }

    if (dateTo) {
        filters.dateTo = dateTo;
    }

    try {
        const statement = await getWalletStatement(session.user.id, filters);
        return NextResponse.json(statement);
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Nao foi possivel carregar o extrato.",
            },
            {
                status: error instanceof NestApiError ? error.status : 500,
            },
        );
    }
}
