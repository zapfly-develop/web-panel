import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listMyAvailableDeliveries } from "@/features/delivery/services/delivery-api";
import { NestApiError } from "@/lib/nest-api";

export async function GET() {
    const session = await auth();

    if (!session?.user?.id || session.user.isSuperAdmin || !session.user.isRider) {
        return NextResponse.json(
            { error: "Sessao invalida para buscar corridas disponiveis." },
            { status: 401 },
        );
    }

    try {
        const deliveries = await listMyAvailableDeliveries(session.user.id);
        return NextResponse.json(deliveries);
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Nao foi possivel carregar corridas disponiveis.",
            },
            {
                status: error instanceof NestApiError ? error.status : 500,
            },
        );
    }
}
