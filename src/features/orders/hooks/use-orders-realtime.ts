"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getPublicNestApiBaseUrl } from "@/lib/nest-api";
import type { StoreOrder } from "../services/order-types";
import {
    ORDER_FINALIZED_EVENT_NAMES,
    ORDER_UPDATED_EVENT_NAMES,
} from "../services/order-types";

type UseOrdersRealtimeOptions = {
    userId: string;
    onOrderEvent?: (order: StoreOrder) => void;
};

export function useOrdersRealtime({
    userId,
    onOrderEvent,
}: UseOrdersRealtimeOptions) {
    const [isConnected, setIsConnected] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        const baseUrl = getPublicNestApiBaseUrl();

        if (!baseUrl || !userId) {
            return;
        }

        const socket: Socket = io(`${baseUrl}/orders`, {
            transports: ["websocket", "polling"],
            withCredentials: true,
            auth: {
                userId,
            },
            query: {
                userId,
            },
        });

        const handleConnect = () => {
            setIsConnected(true);
            setErrorMessage(null);
        };
        const handleDisconnect = () => setIsConnected(false);
        const handleConnectError = (error: Error) => {
            setIsConnected(false);
            setErrorMessage(error.message);
        };
        const handleOrderEvent = (incomingOrder: StoreOrder) => {
            onOrderEvent?.(incomingOrder);
        };

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("connect_error", handleConnectError);

        for (const eventName of ORDER_FINALIZED_EVENT_NAMES) {
            socket.on(eventName, handleOrderEvent);
        }

        for (const eventName of ORDER_UPDATED_EVENT_NAMES) {
            socket.on(eventName, handleOrderEvent);
        }

        return () => {
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off("connect_error", handleConnectError);

            for (const eventName of ORDER_FINALIZED_EVENT_NAMES) {
                socket.off(eventName, handleOrderEvent);
            }

            for (const eventName of ORDER_UPDATED_EVENT_NAMES) {
                socket.off(eventName, handleOrderEvent);
            }

            socket.disconnect();
        };
    }, [onOrderEvent, userId]);

    return {
        isConnected,
        errorMessage,
    };
}
