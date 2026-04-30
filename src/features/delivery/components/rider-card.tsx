"use client";

import { Bike, Car, CheckCircle2, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DeliveryRider, RiderVehicleType } from "../services/delivery-types";

type RiderCardProps = {
    rider: DeliveryRider;
    isAssigning?: boolean;
    onSelect?: (rider: DeliveryRider) => void;
};

const vehicleCopy: Record<RiderVehicleType, string> = {
    MOTORCYCLE: "Moto",
    BICYCLE: "Bike",
    CAR: "Carro",
    OTHER: "Outro",
};

function getVehicleIcon(vehicleType: RiderVehicleType) {
    if (vehicleType === "CAR") {
        return <Car className="h-3 w-3" />;
    }

    return <Bike className="h-3 w-3" />;
}

export function RiderCard({ rider, isAssigning, onSelect }: RiderCardProps) {
    const riderName = rider.displayName || "Entregador sem nome";

    return (
        <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                    <UserRound className="h-5 w-5" />
                </div>
                <div className="min-w-0 space-y-2">
                    <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                            {riderName}
                        </p>
                        <p className="truncate text-sm text-slate-500">
                            {rider.vehiclePlate || "Sem placa cadastrada"}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Badge
                            variant="outline"
                            className="border-slate-200 bg-slate-50 text-slate-700"
                        >
                            {getVehicleIcon(rider.vehicleType)}
                            {vehicleCopy[rider.vehicleType]}
                        </Badge>
                        <Badge
                            variant="outline"
                            className={cn(
                                "border-emerald-200 bg-emerald-50 text-emerald-700",
                                rider.isStoreOwned &&
                                    "border-sky-200 bg-sky-50 text-sky-700",
                            )}
                        >
                            {rider.isStoreOwned ? "Proprio" : "Marketplace"}
                        </Badge>
                        {typeof rider.distanceKm === "number" ? (
                            <Badge
                                variant="outline"
                                className="border-teal-200 bg-teal-50 text-teal-700"
                            >
                                {rider.distanceKm.toFixed(1)} km
                            </Badge>
                        ) : null}
                    </div>
                </div>
            </div>

            {onSelect ? (
                <Button
                    type="button"
                    size="sm"
                    disabled={isAssigning}
                    onClick={() => onSelect(rider)}
                    className="sm:w-32"
                >
                    <CheckCircle2 className="h-4 w-4" />
                    Atribuir
                </Button>
            ) : null}
        </div>
    );
}
