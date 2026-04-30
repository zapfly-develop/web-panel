import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateMyRiderLocation } from "@/features/delivery/services/delivery-api";
import type { RiderLocationPayload } from "@/features/delivery/services/delivery-types";
import { NestApiError } from "@/lib/nest-api";

function normalizeCoordinate(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(request: Request) {
    const session = await auth();

    if (!session?.user?.id || session.user.isSuperAdmin) {
        return NextResponse.json(
            { error: "Sessao invalida para enviar localizacao." },
            { status: 401 },
        );
    }

    try {
        const payload = await request.json().catch(() => null);
        const latitude = normalizeCoordinate(payload?.latitude);
        const longitude = normalizeCoordinate(payload?.longitude);

        if (latitude === null || longitude === null) {
            return NextResponse.json(
                { error: "latitude e longitude sao obrigatorios." },
                { status: 400 },
            );
        }

        const location: RiderLocationPayload = {
            latitude,
            longitude,
            ...(typeof payload?.deliveryId === "string" &&
            payload.deliveryId.trim()
                ? { deliveryId: payload.deliveryId.trim() }
                : {}),
            ...(normalizeCoordinate(payload?.accuracyMeters) !== null
                ? {
                      accuracyMeters: normalizeCoordinate(
                          payload?.accuracyMeters,
                      ),
                  }
                : {}),
            ...(typeof payload?.recordedAt === "string" && payload.recordedAt
                ? { recordedAt: payload.recordedAt }
                : {}),
        };

        const rider = await updateMyRiderLocation(session.user.id, location);
        return NextResponse.json(rider);
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Nao foi possivel enviar localizacao.",
            },
            {
                status: error instanceof NestApiError ? error.status : 500,
            },
        );
    }
}

