import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
    createStoreDelivery,
    listStoreDeliveries,
} from "@/features/delivery/services/delivery-api";
import type { DeliveryStatusFilter } from "@/features/delivery/services/delivery-types";
import { NestApiError } from "@/lib/nest-api";

export async function GET(request: NextRequest) {
    const session = await auth();

    if (!session?.user?.id || session.user.isSuperAdmin || session.user.isRider) {
        return NextResponse.json(
            { error: "Sessao invalida para listar entregas." },
            { status: 401 },
        );
    }

    try {
        const status =
            request.nextUrl.searchParams.get("status") as DeliveryStatusFilter | null;
        const deliveries = await listStoreDeliveries(
            session.user.id,
            status ?? undefined,
        );

        return NextResponse.json(deliveries);
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Nao foi possivel carregar entregas.",
            },
            {
                status: error instanceof NestApiError ? error.status : 500,
            },
        );
    }
}

export async function POST(request: Request) {
    const session = await auth();

    if (!session?.user?.id || session.user.isSuperAdmin || session.user.isRider) {
        return NextResponse.json(
            { error: "Sessao invalida para criar entrega." },
            { status: 401 },
        );
    }

    try {
        const payload = await request.json().catch(() => null);
        const orderId =
            payload && typeof payload.orderId === "string"
                ? payload.orderId.trim()
                : "";

        if (!orderId) {
            return NextResponse.json(
                { error: "orderId obrigatorio." },
                { status: 400 },
            );
        }

        try {
            const delivery = await createStoreDelivery(session.user.id, orderId);
            return NextResponse.json(delivery, { status: 201 });
        } catch (error) {
            if (error instanceof NestApiError && error.status === 409) {
                const deliveries = await listStoreDeliveries(session.user.id);
                const existingDelivery = deliveries.find(
                    (delivery) => delivery.orderId === orderId,
                );

                if (existingDelivery) {
                    return NextResponse.json(existingDelivery);
                }
            }

            throw error;
        }
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Nao foi possivel criar a entrega.",
            },
            {
                status: error instanceof NestApiError ? error.status : 500,
            },
        );
    }
}
