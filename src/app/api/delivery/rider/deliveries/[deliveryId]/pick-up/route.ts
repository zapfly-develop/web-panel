import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { pickUpMyDelivery } from "@/features/delivery/services/delivery-api";
import { NestApiError } from "@/lib/nest-api";

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ deliveryId: string }> },
) {
    const session = await auth();

    if (!session?.user?.id || session.user.isSuperAdmin) {
        return NextResponse.json(
            { error: "Sessao invalida para coletar entrega." },
            { status: 401 },
        );
    }

    try {
        const { deliveryId } = await params;
        const delivery = await pickUpMyDelivery(session.user.id, deliveryId);
        return NextResponse.json(delivery);
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Nao foi possivel coletar a entrega.",
            },
            {
                status: error instanceof NestApiError ? error.status : 500,
            },
        );
    }
}

