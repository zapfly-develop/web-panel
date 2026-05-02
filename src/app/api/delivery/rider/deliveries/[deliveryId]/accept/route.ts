import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { acceptMyDelivery } from "@/features/delivery/services/delivery-api";
import { NestApiError } from "@/lib/nest-api";

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ deliveryId: string }> },
) {
    const session = await auth();

    if (!session?.user?.id || session.user.isSuperAdmin || !session.user.isRider) {
        return NextResponse.json(
            { error: "Sessao invalida para aceitar entrega." },
            { status: 401 },
        );
    }

    try {
        const { deliveryId } = await params;
        const delivery = await acceptMyDelivery(session.user.id, deliveryId);
        return NextResponse.json(delivery);
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Nao foi possivel aceitar a entrega.",
            },
            {
                status: error instanceof NestApiError ? error.status : 500,
            },
        );
    }
}

