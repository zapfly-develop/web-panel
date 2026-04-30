"use client";

import { useEffect, useMemo, useState } from "react";
import type { StoreDelivery } from "../services/delivery-types";

export function useDeliveryContingencies(activeDelivery: StoreDelivery | null) {
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    useEffect(() => {
        if (
            activeDelivery?.status !== "ABSENT_WAITING" ||
            !activeDelivery.absentClientAt
        ) {
            setTimeLeft(null);
            return;
        }

        const targetDate = new Date(activeDelivery.absentClientAt);
        targetDate.setMinutes(targetDate.getMinutes() + 5);

        const updateTimer = () => {
            const now = new Date();
            const diff = targetDate.getTime() - now.getTime();
            const seconds = Math.max(0, Math.floor(diff / 1000));
            setTimeLeft(seconds);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [activeDelivery?.status, activeDelivery?.absentClientAt]);

    const formattedTimeLeft = useMemo(() => {
        if (timeLeft === null) return null;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }, [timeLeft]);

    return {
        timeLeft,
        formattedTimeLeft,
        isWaitingClient: activeDelivery?.status === "ABSENT_WAITING",
    };
}
