"use client";

import { useEffect, useState } from "react";
import type { StoreDelivery } from "../services/delivery-types";

export function useDeliveryContingencies(activeDelivery: StoreDelivery | null) {
    const [now, setNow] = useState(() => Date.now());
    const isWaitingClient = activeDelivery?.status === "ABSENT_WAITING";
    const absentClientAt = activeDelivery?.absentClientAt ?? null;
    let targetTimestamp: number | null = null;

    if (isWaitingClient && absentClientAt) {
        const targetDate = new Date(absentClientAt);
        targetDate.setMinutes(targetDate.getMinutes() + 5);
        targetTimestamp = targetDate.getTime();
    }

    useEffect(() => {
        if (!targetTimestamp) {
            return;
        }

        const interval = window.setInterval(() => setNow(Date.now()), 1000);

        return () => window.clearInterval(interval);
    }, [targetTimestamp]);

    const timeLeft = targetTimestamp
        ? Math.max(0, Math.floor((targetTimestamp - now) / 1000))
        : null;
    let formattedTimeLeft: string | null = null;

    if (timeLeft !== null) {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        formattedTimeLeft = `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }

    return {
        timeLeft,
        formattedTimeLeft,
        isWaitingClient,
    };
}
