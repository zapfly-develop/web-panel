import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listAvailableDeliveryRiders } from "@/features/delivery/services/delivery-api";
import { NestApiError } from "@/lib/nest-api";

export async function GET() {
    const session = await auth();

    if (!session?.user?.id || session.user.isSuperAdmin) {
        return NextResponse.json(
            { error: "Sessao invalida para listar entregadores." },
            { status: 401 },
        );
    }

    try {
        const riders = await listAvailableDeliveryRiders(session.user.id);
        return NextResponse.json(riders);
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Nao foi possivel carregar entregadores.",
            },
            {
                status: error instanceof NestApiError ? error.status : 500,
            },
        );
    }
}

