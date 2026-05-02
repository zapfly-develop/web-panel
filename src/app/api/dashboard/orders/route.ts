import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listStoreOrders } from "@/features/orders/services/orders-api";
import { NestApiError } from "@/lib/nest-api";

export async function GET() {
    const session = await auth();

    if (!session?.user?.id || session.user.isSuperAdmin || session.user.isRider) {
        return NextResponse.json(
            { error: "Sessao invalida para listar pedidos." },
            { status: 401 },
        );
    }

    try {
        const orders = await listStoreOrders(session.user.id);
        return NextResponse.json(orders);
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Nao foi possivel carregar pedidos.",
            },
            {
                status: error instanceof NestApiError ? error.status : 500,
            },
        );
    }
}
