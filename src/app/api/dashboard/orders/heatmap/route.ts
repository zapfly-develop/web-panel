import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listStoreOrderHeatmap } from "@/features/orders/services/orders-api";
import { NestApiError } from "@/lib/nest-api";

export async function GET(request: NextRequest) {
    const session = await auth();

    if (!session?.user?.id || session.user.isSuperAdmin || session.user.isRider) {
        return NextResponse.json(
            { error: "Sessao invalida para carregar mapa de calor." },
            { status: 401 },
        );
    }

    try {
        const gridSizeMetersParam =
            request.nextUrl.searchParams.get("gridSizeMeters");
        const gridSizeMeters =
            gridSizeMetersParam === null ? NaN : Number(gridSizeMetersParam);
        const heatmap = await listStoreOrderHeatmap(session.user.id, {
            from: request.nextUrl.searchParams.get("from") ?? undefined,
            to: request.nextUrl.searchParams.get("to") ?? undefined,
            gridSizeMeters: Number.isFinite(gridSizeMeters)
                ? gridSizeMeters
                : undefined,
        });

        return NextResponse.json(heatmap);
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Nao foi possivel carregar o mapa de calor.",
            },
            {
                status: error instanceof NestApiError ? error.status : 500,
            },
        );
    }
}
