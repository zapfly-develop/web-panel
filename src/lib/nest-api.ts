type NestApiOptions = {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    headers?: HeadersInit;
    body?: BodyInit | null;
};

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

export async function fetchNestApiJson<T>(
    path: string,
    options: NestApiOptions = {},
): Promise<T> {
    const response = await fetch(`${getNestApiBaseUrl()}${path}`, {
        method: options.method ?? "GET",
        headers: {
            Accept: "application/json",
            ...options.headers,
        },
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
