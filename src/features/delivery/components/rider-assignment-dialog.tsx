"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, RefreshCw, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { DeliveryRider, StoreDelivery } from "../services/delivery-types";
import { RiderCard } from "./rider-card";

type RiderAssignmentDialogProps = {
    delivery: StoreDelivery | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAssigned: (
        updatedDelivery: Partial<StoreDelivery> & { id: string },
        rider: DeliveryRider,
    ) => void;
};

export function RiderAssignmentDialog({
    delivery,
    open,
    onOpenChange,
    onAssigned,
}: RiderAssignmentDialogProps) {
    const [riders, setRiders] = useState<DeliveryRider[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [assigningRiderId, setAssigningRiderId] = useState<string | null>(
        null,
    );

    const loadRiders = useCallback(async () => {
        try {
            setIsLoading(true);
            setLoadError(null);

            const response = await fetch(
                "/api/dashboard/delivery/riders/available",
                {
                    headers: {
                        Accept: "application/json",
                    },
                },
            );
            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(
                    payload?.error ||
                        payload?.message ||
                        "Nao foi possivel carregar entregadores.",
                );
            }

            setRiders(Array.isArray(payload) ? payload : []);
        } catch (error) {
            setLoadError(
                error instanceof Error
                    ? error.message
                    : "Falha ao carregar entregadores.",
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open) {
            void loadRiders();
        }
    }, [loadRiders, open]);

    async function handleAssign(rider: DeliveryRider) {
        if (!delivery) {
            return;
        }

        try {
            setAssigningRiderId(rider.id);

            const response = await fetch(
                `/api/dashboard/delivery/deliveries/${delivery.id}/assign`,
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ riderId: rider.id }),
                },
            );
            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(
                    payload?.error ||
                        payload?.message ||
                        "Nao foi possivel atribuir o entregador.",
                );
            }

            onAssigned(payload as Partial<StoreDelivery> & { id: string }, rider);
            toast.success("Entrega atribuida ao entregador.");
            onOpenChange(false);
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Falha ao atribuir entregador.",
            );
        } finally {
            setAssigningRiderId(null);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[82vh] overflow-hidden sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Atribuir entregador</DialogTitle>
                    <DialogDescription>
                        {delivery?.order.customerName ||
                            delivery?.order.customerWhatsappId ||
                            "Entrega selecionada"}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center justify-between gap-3 border-y border-slate-100 py-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <UsersRound className="h-4 w-4 text-slate-400" />
                        {riders.length} disponivel
                        {riders.length === 1 ? "" : "s"}
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void loadRiders()}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                        Atualizar
                    </Button>
                </div>

                {loadError ? (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Entregadores indisponiveis</AlertTitle>
                        <AlertDescription>{loadError}</AlertDescription>
                    </Alert>
                ) : null}

                <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
                    {isLoading ? (
                        <div className="flex min-h-40 items-center justify-center text-sm text-slate-500">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Carregando entregadores
                        </div>
                    ) : riders.length === 0 && !loadError ? (
                        <div className="flex min-h-40 flex-col items-center justify-center rounded-md border border-dashed border-slate-200 text-center">
                            <UsersRound className="mb-3 h-6 w-6 text-slate-400" />
                            <p className="font-medium text-slate-900">
                                Nenhum entregador online
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                                A lista muda quando um rider fica disponivel.
                            </p>
                        </div>
                    ) : (
                        riders.map((rider) => (
                            <RiderCard
                                key={rider.id}
                                rider={rider}
                                isAssigning={assigningRiderId === rider.id}
                                onSelect={handleAssign}
                            />
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

