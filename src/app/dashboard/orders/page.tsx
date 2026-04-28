import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    listAvailableDeliveryRiders,
    listStoreDeliveries,
} from "@/features/delivery/services/delivery-api";
import type {
    DeliveryRider,
    StoreDelivery,
} from "@/features/delivery/services/delivery-types";
import { StoreOrdersWorkspace } from "@/features/orders/pages/store-orders-workspace";
import { listStoreOrders } from "@/features/orders/services/orders-api";
import type { StoreOrder } from "@/features/orders/services/order-types";
import { requireSessionUser } from "@/lib/server-session";

export const runtime = "nodejs";

export default async function DashboardOrdersPage() {
    const user = await requireSessionUser();

    if (user.isSuperAdmin) {
        redirect("/admin/dashboard");
    }

    let orders: StoreOrder[] = [];
    let deliveries: StoreDelivery[] = [];
    let availableRiders: DeliveryRider[] = [];
    let loadError: string | null = null;

    try {
        const [dashboardOrders, deliveryItems, riders] = await Promise.all([
            listStoreOrders(user.id),
            listStoreDeliveries(user.id).catch(() => []),
            listAvailableDeliveryRiders(user.id).catch(() => []),
        ]);

        orders = dashboardOrders;
        deliveries = deliveryItems;
        availableRiders = riders;
    } catch (error) {
        loadError =
            error instanceof Error
                ? error.message
                : "Nao foi possivel carregar os pedidos agora.";
    }

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-3">
                    <Badge
                        variant="outline"
                        className="w-fit border-sky-200 bg-sky-50 text-sky-700"
                    >
                        Delivery em tempo real
                    </Badge>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                            Pedidos do seu delivery
                        </h1>
                        <p className="max-w-2xl text-slate-500">
                            Acompanhe preparo, rota, SLA, riders e pedidos
                            confirmados no WhatsApp em uma tela operacional.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Button asChild variant="outline">
                        <Link href="/dashboard">
                            Voltar ao painel
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href="/dashboard/products">
                            Ajustar catalogo
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </div>

            {loadError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Pedidos indisponiveis no momento</AlertTitle>
                    <AlertDescription>
                        {loadError}. Se voce acabou de subir o back-end, reinicie
                        o `telegram-user-service-nest` para carregar as rotas
                        novas.
                    </AlertDescription>
                </Alert>
            )}

            <StoreOrdersWorkspace
                initialOrders={orders}
                initialDeliveries={deliveries}
                initialAvailableRiders={availableRiders}
                userId={user.id}
            />
        </div>
    );
}
