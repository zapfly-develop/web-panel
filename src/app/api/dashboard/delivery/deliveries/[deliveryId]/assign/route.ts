import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { assignDeliveryRider } from "@/features/delivery/services/delivery-api";
import { NestApiError } from "@/lib/nest-api";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ deliveryId: string }> },
) {
    const session = await auth();

    if (!session?.user?.id || session.user.isSuperAdmin) {
        return NextResponse.json(
            { error: "Sessao invalida para atribuir entrega." },
            { status: 401 },
        );
    }

    try {
        const { deliveryId } = await params;
        const payload = await request.json().catch(() => null);
        const riderId =
            payload && typeof payload.riderId === "string"
                ? payload.riderId.trim()
                : "";

        if (!riderId) {
            return NextResponse.json(
                { error: "riderId obrigatorio." },
                { status: 400 },
            );
        }

        const delivery = await assignDeliveryRider(
            session.user.id,
            deliveryId,
            riderId,
        );

        return NextResponse.json(delivery);
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Nao foi possivel atribuir a entrega.",
            },
            {
                status: error instanceof NestApiError ? error.status : 500,
            },
        );
    }
}

