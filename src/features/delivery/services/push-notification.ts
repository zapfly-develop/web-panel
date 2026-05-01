import { getNestApiBaseUrl } from "@/lib/nest-api";

export type PushPermissionResult =
    | "subscribed"
    | "already-subscribed"
    | "unsupported"
    | "denied"
    | "not-granted"
    | "missing-key"
    | "error";

type FetchJson = <T>(url: string, init?: RequestInit) => Promise<T>;

function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const normalized = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const rawData = window.atob(normalized);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; i += 1) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Função auxiliar para garantir que o SW esteja ATIVO antes de prosseguir (Crucial para iOS)
async function getActiveServiceWorker(
    registration: ServiceWorkerRegistration,
): Promise<ServiceWorker> {
    if (registration.active) return registration.active;

    const sw = registration.installing || registration.waiting;
    if (!sw) throw new Error("No service worker found");

    return new Promise((resolve) => {
        sw.addEventListener("statechange", (e) => {
            const target = e.target as ServiceWorker;
            if (target.state === "activated") {
                resolve(target);
            }
        });
    });
}

export async function ensureRiderPushSubscription(
    fetchJson: FetchJson,
    userId: string,
) {
    try {
        if (
            typeof window === "undefined" ||
            !("Notification" in window) ||
            !("serviceWorker" in navigator)
        ) {
            return {
                ensured: false,
                reason: "unsupported" as PushPermissionResult,
            };
        }

        if (Notification.permission === "denied") {
            return { ensured: false, reason: "denied" as PushPermissionResult };
        }

        // 1. Registro do SW e aguardar ativação
        const registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
        });
        await getActiveServiceWorker(registration); // Garante que o SW está pronto para o pushManager

        // 2. Buscar VAPID Key antes da interação (Fail-fast)
        const { publicKey } = await fetchJson<{ publicKey: string }>(
            `${getNestApiBaseUrl()}/notifications/vapid-public-key`,
        ).catch(() => ({ publicKey: "" }));

        if (!publicKey) {
            return {
                ensured: false,
                reason: "missing-key" as PushPermissionResult,
            };
        }

        // 3. Solicitar permissão (Deve ser disparado por clique do usuário no iOS)
        let permission: NotificationPermission = Notification.permission;
        if (permission !== "granted") {
            permission = await Notification.requestPermission();
        }

        if (permission !== "granted") {
            // Se for 'denied' ou continuar como 'default', retornamos o erro mapeado
            return {
                ensured: false,
                reason: "not-granted" as PushPermissionResult,
            };
        }

        // 4. Verificar assinatura existente
        const existingSubscription =
            await registration.pushManager.getSubscription();
        if (existingSubscription) {
            return {
                ensured: true,
                reason: "already-subscribed" as PushPermissionResult,
            };
        }

        // 5. Criar nova assinatura
        const createdSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        // 6. Extração Manual de Chaves (Evita bugs do toJSON no iOS)[cite: 6]
        const rawSubscription = createdSubscription.toJSON();
        const payload = {
            endpoint: createdSubscription.endpoint,
            expirationTime: createdSubscription.expirationTime,
            keys: {
                p256dh: btoa(
                    String.fromCharCode.apply(
                        null,
                        new Uint8Array(
                            createdSubscription.getKey("p256dh")!,
                        ) as any,
                    ),
                ),
                auth: btoa(
                    String.fromCharCode.apply(
                        null,
                        new Uint8Array(
                            createdSubscription.getKey("auth")!,
                        ) as any,
                    ),
                ),
            },
        };

        // 7. Salvar no Backend[cite: 6]
        await fetchJson(
            `${getNestApiBaseUrl()}/notifications/push-subscriptions`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": userId,
                },
                body: JSON.stringify(payload),
            },
        );

        return { ensured: true, reason: "subscribed" as PushPermissionResult };
    } catch (error) {
        console.error("Erro ao configurar WebPush:", error);
        return { ensured: false, reason: "error" as PushPermissionResult };
    }
}
