import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
    listRiderPerformance,
    type RiderPerformanceSortBy,
} from "@/features/delivery/services/delivery-api";
import { NestApiError } from "@/lib/nest-api";

const sortByValues = new Set<RiderPerformanceSortBy>([
    "fastest",
    "rating",
    "deliveries",
]);

export async function GET(request: NextRequest) {
    const session = await auth();

    if (!session?.user?.id || session.user.isSuperAdmin || session.user.isRider) {
        return NextResponse.json(
            { error: "Sessao invalida para carregar performance dos riders." },
            { status: 401 },
        );
    }

    try {
        const sortBy = request.nextUrl.searchParams.get("sortBy");
        const limitParam = request.nextUrl.searchParams.get("limit");
        const limit = limitParam === null ? NaN : Number(limitParam);
        const performance = await listRiderPerformance(session.user.id, {
            sortBy:
                sortBy && sortByValues.has(sortBy as RiderPerformanceSortBy)
                    ? (sortBy as RiderPerformanceSortBy)
                    : undefined,
            limit: Number.isFinite(limit) ? limit : undefined,
        });

        return NextResponse.json(performance);
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Nao foi possivel carregar performance dos riders.",
            },
            {
                status: error instanceof NestApiError ? error.status : 500,
            },
        );
    }
}
