import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { reportClientAbsent } from "@/features/delivery/services/delivery-api";
import { NestApiError } from "@/lib/nest-api";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ deliveryId: string }> },
) {
    const session = await auth();

    if (!session?.user?.id || session.user.isSuperAdmin || !session.user.isRider) {
        return NextResponse.json(
            { error: "Sessao invalida para reportar cliente ausente." },
            { status: 401 },
        );
    }

    try {
        const { deliveryId } = await params;
        const payload = await request.json().catch(() => null);
        const description =
            payload && typeof payload.description === "string"
                ? payload.description.trim()
                : undefined;

        const delivery = await reportClientAbsent(
            session.user.id,
            deliveryId,
            description ? { description } : undefined,
        );

        return NextResponse.json(delivery);
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Nao foi possivel reportar cliente ausente.",
            },
            {
                status: error instanceof NestApiError ? error.status : 500,
            },
        );
    }
}
