import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMyActiveDelivery } from "@/features/delivery/services/delivery-api";
import { NestApiError } from "@/lib/nest-api";

export async function GET() {
    const session = await auth();

    if (!session?.user?.id || session.user.isSuperAdmin) {
        return NextResponse.json(
            { error: "Sessao invalida para buscar entrega ativa." },
            { status: 401 },
        );
    }

    try {
        const delivery = await getMyActiveDelivery(session.user.id);
        return NextResponse.json(delivery);
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Nao foi possivel carregar a entrega ativa.",
            },
            {
                status: error instanceof NestApiError ? error.status : 500,
            },
        );
    }
}

