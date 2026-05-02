import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { reportRiderIncident } from "@/features/delivery/services/delivery-api";
import { NestApiError } from "@/lib/nest-api";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ deliveryId: string }> },
) {
    const session = await auth();

    if (!session?.user?.id || session.user.isSuperAdmin || !session.user.isRider) {
        return NextResponse.json(
            { error: "Sessao invalida para reportar incidente." },
            { status: 401 },
        );
    }

    try {
        const { deliveryId } = await params;
        const payload = await request.json().catch(() => null);
        const reason =
            payload && typeof payload.reason === "string"
                ? payload.reason.trim()
                : "";
        const description =
            payload && typeof payload.description === "string"
                ? payload.description.trim()
                : undefined;

        if (!reason) {
            return NextResponse.json(
                { error: "reason obrigatorio." },
                { status: 400 },
            );
        }

        const delivery = await reportRiderIncident(session.user.id, deliveryId, {
            reason,
            ...(description ? { description } : {}),
        });

        return NextResponse.json(delivery);
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Nao foi possivel reportar o incidente.",
            },
            {
                status: error instanceof NestApiError ? error.status : 500,
            },
        );
    }
}
