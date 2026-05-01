export type PushPermissionResult =
    | "subscribed"
    | "already-subscribed"
    | "unsupported"
    | "denied"
    | "not-granted"
    | "missing-key";

type FetchJson = <T>(url: string, init?: RequestInit) => Promise<T>;

type PushSubscriptionPayload = {
    endpoint: string;
    expirationTime: number | null;
    keys: {
        p256dh: string;
        auth: string;
    };
};

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

export async function ensureRiderPushSubscription(fetchJson: FetchJson) {
    if (
        typeof window === "undefined" ||
        !("Notification" in window) ||
        !("serviceWorker" in navigator)
    ) {
        return { ensured: false, reason: "unsupported" as PushPermissionResult };
    }

    if (Notification.permission === "denied") {
        return { ensured: false, reason: "denied" as PushPermissionResult };
    }

    const registration =
        (await navigator.serviceWorker.getRegistration()) ||
        (await navigator.serviceWorker.register("/sw.js"));

    let permission = Notification.permission;
    if (permission !== "granted") {
        permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
        return { ensured: false, reason: "not-granted" as PushPermissionResult };
    }

    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
        return { ensured: true, reason: "already-subscribed" as PushPermissionResult };
    }

    const { publicKey } = await fetchJson<{ publicKey: string }>(
        "/api/notifications/vapid-public-key",
    );

    if (!publicKey) {
        return { ensured: false, reason: "missing-key" as PushPermissionResult };
    }

    const createdSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await fetchJson("/api/notifications/push-subscriptions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(createdSubscription.toJSON() as PushSubscriptionPayload),
    });

    return { ensured: true, reason: "subscribed" as PushPermissionResult };
}
