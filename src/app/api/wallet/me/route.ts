import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMyWallet } from "@/features/wallet/services/wallet-api";
import { NestApiError } from "@/lib/nest-api";

export async function GET() {
    const session = await auth();

    if (!session?.user?.id || session.user.isSuperAdmin || !session.user.isRider) {
        return NextResponse.json(
            { error: "Sessao invalida para consultar carteira." },
            { status: 401 },
        );
    }

    try {
        const wallet = await getMyWallet(session.user.id);
        return NextResponse.json(wallet);
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Nao foi possivel carregar a carteira.",
            },
            {
                status: error instanceof NestApiError ? error.status : 500,
            },
        );
    }
}
