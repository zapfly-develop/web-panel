import Link from "next/link";
import { redirect } from "next/navigation";
import {
    AlertCircle,
    ArrowRight,
    ClipboardList,
    PackageCheck,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StoreDeliveryManager } from "@/features/delivery/pages/store-delivery-manager";
import {
    listAvailableDeliveryRiders,
    listRiderPerformance,
    listStoreDeliveries,
} from "@/features/delivery/services/delivery-api";
import type {
    DeliveryRiderPerformanceMetric,
    DeliveryRider,
    StoreDelivery,
} from "@/features/delivery/services/delivery-types";
import { requireSessionUser } from "@/lib/server-session";

export const runtime = "nodejs";

export default async function DashboardDeliveryPage() {
    const user = await requireSessionUser();

    if (user.isSuperAdmin) {
        redirect("/admin/dashboard");
    }

    let deliveries: StoreDelivery[] = [];
    let availableRiders: DeliveryRider[] = [];
    let riderPerformance: DeliveryRiderPerformanceMetric[] = [];
    let loadError: string | null = null;

    try {
        const [deliveryItems, riders, performance] = await Promise.all([
            listStoreDeliveries(user.id),
            listAvailableDeliveryRiders(user.id).catch(() => []),
            listRiderPerformance(user.id, {
                sortBy: "rating",
                limit: 100,
            }).catch(() => []),
        ]);

        deliveries = deliveryItems;
        availableRiders = riders;
        riderPerformance = performance;
    } catch (error) {
        loadError =
            error instanceof Error
                ? error.message
                : "Nao foi possivel carregar as entregas agora.";
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-sky-700">
                        <PackageCheck className="h-4 w-4" />
                        Delivery logistico
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                            Gestao de entregas
                        </h1>
                        <p className="mt-2 max-w-2xl text-slate-500">
                            Acompanhe as entregas criadas pelo back-end e
                            atribua riders online para cada corrida.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Button asChild variant="outline">
                        <Link href="/dashboard/orders">
                            <ClipboardList className="h-4 w-4" />
                            Pedidos
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href="/dashboard/products">
                            Catalogo
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </div>

            {loadError ? (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Entregas indisponiveis</AlertTitle>
                    <AlertDescription>{loadError}</AlertDescription>
                </Alert>
            ) : null}

            <StoreDeliveryManager
                userId={user.id}
                initialDeliveries={deliveries}
                initialAvailableRiders={availableRiders}
                initialRiderPerformance={riderPerformance}
            />
        </div>
    );
}
