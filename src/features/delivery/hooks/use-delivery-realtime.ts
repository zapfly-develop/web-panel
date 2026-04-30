"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getPublicNestApiBaseUrl } from "@/lib/nest-api";
import type {
    DeliveryAssignedEvent,
    DeliveryCustomerRespondedEvent,
    DeliveryRiderStalledUnassignedEvent,
    DeliveryRiderStalledWarningEvent,
    DeliveryStatusChangedEvent,
    RiderNewAvailableDeliveryEvent,
    RiderStatusChangedEvent,
} from "../services/delivery-types";
import {
    DELIVERY_ASSIGNED_EVENT,
    DELIVERY_CUSTOMER_RESPONDED_EVENT,
    DELIVERY_RIDER_STALLED_UNASSIGNED_EVENT,
    DELIVERY_RIDER_STALLED_WARNING_EVENT,
    DELIVERY_STATUS_CHANGED_EVENT,
    RIDER_NEW_AVAILABLE_DELIVERY_EVENT,
    RIDER_STATUS_CHANGED_EVENT,
} from "../services/delivery-types";

type DeliveryRealtimeStatus = "idle" | "connected" | "disconnected" | "error";

type UseDeliveryRealtimeOptions = {
    userId: string;
    enabled?: boolean;
    onDeliveryAssigned?: (event: DeliveryAssignedEvent) => void;
    onDeliveryStatusChanged?: (event: DeliveryStatusChangedEvent) => void;
    onRiderNewAvailableDelivery?: (event: RiderNewAvailableDeliveryEvent) => void;
    onRiderStatusChanged?: (event: RiderStatusChangedEvent) => void;
    onCustomerResponded?: (event: DeliveryCustomerRespondedEvent) => void;
    onRiderStalledWarning?: (event: DeliveryRiderStalledWarningEvent) => void;
    onRiderStalledUnassigned?: (event: DeliveryRiderStalledUnassignedEvent) => void;
};

export function useDeliveryRealtime({
    userId,
    enabled = true,
    onDeliveryAssigned,
    onDeliveryStatusChanged,
    onRiderNewAvailableDelivery,
    onRiderStatusChanged,
    onCustomerResponded,
    onRiderStalledWarning,
    onRiderStalledUnassigned,
}: UseDeliveryRealtimeOptions) {
    const [status, setStatus] = useState<DeliveryRealtimeStatus>("idle");
    const [lastEventAt, setLastEventAt] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        const baseUrl = getPublicNestApiBaseUrl();

        if (!enabled || !baseUrl || !userId) {
            return;
        }

        const socket: Socket = io(`${baseUrl}/delivery`, {
            transports: ["websocket", "polling"],
            withCredentials: true,
            auth: {
                userId,
            },
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1500,
        });

        const markEventReceived = () => setLastEventAt(new Date().toISOString());
        const handleConnect = () => {
            setStatus("connected");
            setErrorMessage(null);
        };
        const handleDisconnect = () => setStatus("disconnected");
        const handleConnectError = (error: Error) => {
            setStatus("error");
            setErrorMessage(error.message);
        };
        const handleDeliveryAssigned = (event: DeliveryAssignedEvent) => {
            markEventReceived();
            onDeliveryAssigned?.(event);
        };
        const handleDeliveryStatusChanged = (
            event: DeliveryStatusChangedEvent,
        ) => {
            markEventReceived();
            onDeliveryStatusChanged?.(event);
        };
        const handleRiderNewAvailableDelivery = (
            event: RiderNewAvailableDeliveryEvent,
        ) => {
            markEventReceived();
            onRiderNewAvailableDelivery?.(event);
        };
        const handleRiderStatusChanged = (event: RiderStatusChangedEvent) => {
            markEventReceived();
            onRiderStatusChanged?.(event);
        };
        const handleCustomerResponded = (event: DeliveryCustomerRespondedEvent) => {
            markEventReceived();
            onCustomerResponded?.(event);
        };
        const handleRiderStalledWarning = (
            event: DeliveryRiderStalledWarningEvent,
        ) => {
            markEventReceived();
            onRiderStalledWarning?.(event);
        };
        const handleRiderStalledUnassigned = (
            event: DeliveryRiderStalledUnassignedEvent,
        ) => {
            markEventReceived();
            onRiderStalledUnassigned?.(event);
        };

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("connect_error", handleConnectError);
        socket.on(DELIVERY_ASSIGNED_EVENT, handleDeliveryAssigned);
        socket.on(DELIVERY_STATUS_CHANGED_EVENT, handleDeliveryStatusChanged);
        socket.on(
            RIDER_NEW_AVAILABLE_DELIVERY_EVENT,
            handleRiderNewAvailableDelivery,
        );
        socket.on(RIDER_STATUS_CHANGED_EVENT, handleRiderStatusChanged);
        socket.on(DELIVERY_CUSTOMER_RESPONDED_EVENT, handleCustomerResponded);
        socket.on(
            DELIVERY_RIDER_STALLED_WARNING_EVENT,
            handleRiderStalledWarning,
        );
        socket.on(
            DELIVERY_RIDER_STALLED_UNASSIGNED_EVENT,
            handleRiderStalledUnassigned,
        );

        return () => {
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off("connect_error", handleConnectError);
            socket.off(DELIVERY_ASSIGNED_EVENT, handleDeliveryAssigned);
            socket.off(DELIVERY_STATUS_CHANGED_EVENT, handleDeliveryStatusChanged);
            socket.off(
                RIDER_NEW_AVAILABLE_DELIVERY_EVENT,
                handleRiderNewAvailableDelivery,
            );
            socket.off(RIDER_STATUS_CHANGED_EVENT, handleRiderStatusChanged);
            socket.off(
                DELIVERY_CUSTOMER_RESPONDED_EVENT,
                handleCustomerResponded,
            );
            socket.off(
                DELIVERY_RIDER_STALLED_WARNING_EVENT,
                handleRiderStalledWarning,
            );
            socket.off(
                DELIVERY_RIDER_STALLED_UNASSIGNED_EVENT,
                handleRiderStalledUnassigned,
            );
            socket.disconnect();
        };
    }, [
        enabled,
        onDeliveryAssigned,
        onDeliveryStatusChanged,
        onRiderNewAvailableDelivery,
        onRiderStatusChanged,
        onCustomerResponded,
        onRiderStalledWarning,
        onRiderStalledUnassigned,
        userId,
    ]);

    const effectiveStatus =
        enabled && getPublicNestApiBaseUrl() && userId ? status : "idle";

    return {
        status: effectiveStatus,
        isConnected: effectiveStatus === "connected",
        lastEventAt,
        errorMessage,
    };
}
