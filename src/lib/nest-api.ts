type NestApiOptions = {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    headers?: HeadersInit;
    body?: BodyInit | null;
};

const INTERNAL_JWT_TTL_SECONDS = 5 * 60;

function normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.trim().replace(/\/$/, "");
}

export class NestApiError extends Error {
    status: number;
    payload: unknown;

    constructor(message: string, status: number, payload: unknown) {
        super(message);
        this.name = "NestApiError";
        this.status = status;
        this.payload = payload;
    }
}

function extractErrorMessage(payload: unknown, status: number): string {
    if (payload && typeof payload === "object") {
        const message = "message" in payload ? payload.message : null;
        const error = "error" in payload ? payload.error : null;

        if (typeof message === "string" && message.trim()) {
            return message;
        }

        if (typeof error === "string" && error.trim()) {
            return error;
        }
    }

    return `Nest API request failed with status ${status}`;
}

export function getNestApiBaseUrl(): string {
    const baseUrl = process.env.NEXT_PUBLIC_NEST_API_URL;

    if (!baseUrl) {
        throw new Error("NEXT_PUBLIC_NEST_API_URL is not configured");
    }

    return normalizeBaseUrl(baseUrl);
}

export function getPublicNestApiBaseUrl(): string | null {
    const baseUrl = process.env.NEXT_PUBLIC_NEST_API_URL;
    return baseUrl ? normalizeBaseUrl(baseUrl) : null;
}

export function getRequiredPublicNestApiBaseUrl(): string {
    const baseUrl = getPublicNestApiBaseUrl();

    if (!baseUrl) {
        throw new Error("NEXT_PUBLIC_NEST_API_URL is not configured");
    }

    return baseUrl;
}

function base64UrlEncode(value: string | ArrayBuffer): string {
    const bytes =
        typeof value === "string"
            ? new TextEncoder().encode(value)
            : new Uint8Array(value);
    let binary = "";

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    const base64 =
        typeof btoa === "function"
            ? btoa(binary)
            : Buffer.from(bytes).toString("base64");

    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function createInternalNestJwt(userId: string): Promise<string | null> {
    const secret = process.env.NEST_API_JWT_SECRET?.trim();

    if (!secret) {
        return null;
    }

    const now = Math.floor(Date.now() / 1000);
    const encodedHeader = base64UrlEncode(
        JSON.stringify({ alg: "HS256", typ: "JWT" }),
    );
    const encodedPayload = base64UrlEncode(
        JSON.stringify({
            sub: userId,
            typ: "internal",
            iat: now,
            exp: now + INTERNAL_JWT_TTL_SECONDS,
        }),
    );
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );
    const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(signingInput),
    );

    return `${signingInput}.${base64UrlEncode(signature)}`;
}

async function buildNestHeaders(headersInit?: HeadersInit): Promise<Headers> {
    const headers = new Headers(headersInit);
    const userId = headers.get("x-user-id");

    if (userId && !headers.has("Authorization")) {
        const token = await createInternalNestJwt(userId);

        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
            headers.delete("x-user-id");
        }
    }

    if (!headers.has("Accept")) {
        headers.set("Accept", "application/json");
    }

    return headers;
}

export async function fetchNestApiJson<T>(
    path: string,
    options: NestApiOptions = {},
): Promise<T> {
    const headers = await buildNestHeaders(options.headers);

    const response = await fetch(`${getNestApiBaseUrl()}${path}`, {
        method: options.method ?? "GET",
        headers,
        body: options.body ?? null,
        cache: "no-store",
    });

    const rawText = await response.text();
    let payload: unknown = null;

    if (rawText) {
        try {
            payload = JSON.parse(rawText);
        } catch {
            payload = rawText;
        }
    }

    if (!response.ok) {
        const message = extractErrorMessage(payload, response.status);
        throw new NestApiError(message, response.status, payload);
    }

    return payload as T;
}
