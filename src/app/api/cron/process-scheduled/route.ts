import { NextResponse } from "next/server";
import { getNestApiBaseUrl } from "@/lib/nest-api";

export const runtime = "edge";

export async function GET() {
    try {
        const nestUrl = getNestApiBaseUrl();
        const secret = process.env.CRON_SECRET;

        const res = await fetch(`${nestUrl}/templates/process-jobs`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(secret ? { "x-cron-secret": secret } : {}),
            },
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error: unknown) {
        const message =
            error instanceof Error ? error.message : "Erro desconhecido";
        console.log("Erro na cron", message);
        return NextResponse.json(
            {
                message: "erro aop processar cron jobs",
                details: message,
            },
            { status: 500 },
        );
    }
}
