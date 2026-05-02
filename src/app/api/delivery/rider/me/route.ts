import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMyRiderProfile } from "@/features/delivery/services/delivery-api";
import { NestApiError } from "@/lib/nest-api";

export async function GET() {
    const session = await auth();

    if (!session?.user?.id || session.user.isSuperAdmin || !session.user.isRider) {
        return NextResponse.json(
            { error: "Sessao invalida para o app do entregador." },
            { status: 401 },
        );
    }

    try {
        const rider = await getMyRiderProfile(session.user.id);
        return NextResponse.json(rider);
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Nao foi possivel carregar o perfil do entregador.",
            },
            {
                status: error instanceof NestApiError ? error.status : 500,
            },
        );
    }
}

