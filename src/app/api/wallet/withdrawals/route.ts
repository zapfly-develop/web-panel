import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requestWalletWithdrawal } from "@/features/wallet/services/wallet-api";
import type { WalletWithdrawalPayload } from "@/features/wallet/services/wallet-types";
import { NestApiError } from "@/lib/nest-api";

export async function POST(request: Request) {
    const session = await auth();

    if (!session?.user?.id || session.user.isSuperAdmin || !session.user.isRider) {
        return NextResponse.json(
            { error: "Sessao invalida para solicitar saque." },
            { status: 401 },
        );
    }

    const payload = (await request.json().catch(() => null)) as
        | Partial<WalletWithdrawalPayload>
        | null;

    const amountCents =
        typeof payload?.amountCents === "number" ? payload.amountCents : null;
    const idempotencyKey =
        typeof payload?.idempotencyKey === "string"
            ? payload.idempotencyKey.trim()
            : "";

    if (
        !payload ||
        !Number.isInteger(amountCents) ||
        amountCents === null ||
        amountCents <= 0 ||
        !idempotencyKey
    ) {
        return NextResponse.json(
            { error: "Payload de saque invalido." },
            { status: 400 },
        );
    }

    try {
        const transaction = await requestWalletWithdrawal(session.user.id, {
            amountCents,
            currency: payload.currency || "BRL",
            idempotencyKey,
            pixKey: payload.pixKey,
            pixKeyType: payload.pixKeyType,
            description: payload.description,
            metadata: payload.metadata,
        });

        return NextResponse.json(transaction, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Nao foi possivel solicitar o saque.",
            },
            {
                status: error instanceof NestApiError ? error.status : 500,
            },
        );
    }
}
