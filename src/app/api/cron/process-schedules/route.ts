// app/api/cron/process-schedules/route.ts
// Adicione ao vercel.json:
//
// {
//   "crons": [
//     { "path": "/api/cron/process-jobs",      "schedule": "*/1 * * * *" },
//     { "path": "/api/cron/process-schedules", "schedule": "*/1 * * * *" }
//   ]
// }

import { NextResponse } from "next/server";
import { getNestApiBaseUrl } from "@/lib/nest-api";

export const runtime = "edge";

export async function GET() {
    const nestUrl = getNestApiBaseUrl();
    const secret = process.env.CRON_SECRET;

    const res = await fetch(`${nestUrl}/schedules/process`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(secret ? { "x-cron-secret": secret } : {}),
        },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}
