import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateMyRiderAvailability } from "@/features/delivery/services/delivery-api";
import type { RiderAvailabilityStatus } from "@/features/delivery/services/delivery-types";
import { NestApiError } from "@/lib/nest-api";

const allowedStatuses = new Set(["AVAILABLE", "OFFLINE", "BUSY", "ONLINE"]);

export async function PATCH(request: Request) {
    const session = await auth();

    if (!session?.user?.id || session.user.isSuperAdmin) {
        return NextResponse.json(
            { error: "Sessao invalida para alterar disponibilidade." },
            { status: 401 },
        );
    }

    try {
        const payload = await request.json().catch(() => null);
        const availabilityStatus =
            payload && typeof payload.availabilityStatus === "string"
                ? payload.availabilityStatus.trim()
                : "";

        if (!allowedStatuses.has(availabilityStatus)) {
            return NextResponse.json(
                { error: "availabilityStatus invalido." },
                { status: 400 },
            );
        }

        const rider = await updateMyRiderAvailability(
            session.user.id,
            availabilityStatus as RiderAvailabilityStatus | "ONLINE",
        );

        return NextResponse.json(rider);
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Nao foi possivel alterar disponibilidade.",
            },
            {
                status: error instanceof NestApiError ? error.status : 500,
            },
        );
    }
}

