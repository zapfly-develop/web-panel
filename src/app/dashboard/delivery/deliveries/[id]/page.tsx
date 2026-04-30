import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, MapPin, UserRound, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getStoreDeliveryById } from "@/features/delivery/services/delivery-api";
import { formatDateTime, formatMoney, getShortId } from "@/features/orders/services/order-utils";

type DeliveryDetailsPageProps = {
    params: Promise<{
        id: string;
    }>;
};

export default async function DeliveryDetailsPage({ params }: DeliveryDetailsPageProps) {
    const { id: deliveryId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    let delivery;
    try {
        delivery = await getStoreDeliveryById(session.user.id, deliveryId);
    } catch (error) {
        console.error("Error fetching delivery:", error);
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
                <AlertTriangle className="h-12 w-12 text-rose-500" />
                <h2 className="text-xl font-bold">Entrega não encontrada</h2>
                <p className="text-slate-500">Não foi possível carregar os detalhes desta entrega.</p>
                <Button asChild variant="outline">
                    <Link href="/dashboard/orders">Voltar para Pedidos</Link>
                </Button>
            </div>
        );
    }

    const isStagnated = delivery.status === "DELIVERY_STAGNATED";

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button asChild variant="ghost" size="icon">
                    <Link href="/dashboard/orders">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Entrega #{getShortId(delivery.id)}
                    </h1>
                    <p className="text-sm text-slate-500">
                        Pedido vinculado: #{getShortId(delivery.orderId)}
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-[1fr_350px]">
                <div className="space-y-6">
                    {isStagnated && (
                        <Card className="border-rose-200 bg-rose-50">
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-4">
                                    <div className="rounded-full bg-rose-100 p-2 text-rose-600">
                                        <AlertTriangle className="h-6 w-6" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-bold text-rose-900">Entrega Estagnada</h3>
                                        <p className="text-sm text-rose-700">
                                            Esta entrega ultrapassou o tempo limite de espera por um entregador.
                                            Recomendamos acionar um entregador próprio ou serviço externo imediatamente.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Detalhes do Pedido</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold uppercase text-slate-400">Cliente</p>
                                    <p className="flex items-center gap-2 text-sm font-medium">
                                        <UserRound className="h-4 w-4 text-slate-400" />
                                        {delivery.order.customerName || "Cliente"}
                                    </p>
                                    <p className="text-xs text-slate-500 ml-6">{delivery.order.customerWhatsappId}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold uppercase text-slate-400">Pagamento</p>
                                    <p className="text-sm font-medium">{delivery.order.paymentMethod}</p>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase text-slate-400">Endereço de Entrega</p>
                                <p className="flex items-start gap-2 text-sm">
                                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                    {delivery.destinationAddress}
                                </p>
                            </div>

                            <Separator />

                            <div className="space-y-3">
                                <p className="text-xs font-semibold uppercase text-slate-400">Itens do Pedido</p>
                                <div className="space-y-2">
                                    <p className="text-sm text-slate-700">Resumo: {delivery.order.notes || "Sem observações"}</p>
                                    <p className="text-sm font-bold">Total: {formatMoney(delivery.order.totalCents)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Status da Logística</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase text-slate-400">Status Atual</p>
                                <div className="flex items-center gap-2">
                                    <Badge variant={isStagnated ? "destructive" : "outline"} className={isStagnated ? "animate-pulse" : ""}>
                                        {delivery.status}
                                    </Badge>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase text-slate-400">Repasse Rider</p>
                                <p className="text-xl font-bold">{formatMoney(delivery.riderPayoutCents)}</p>
                                {delivery.deliveryBonusApplied && (
                                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                                        <Zap className="mr-1 h-3 w-3 fill-amber-500" />
                                        Bônus de Tarifa Dinâmica
                                    </Badge>
                                )}
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase text-slate-400">Timeline</p>
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center gap-3 text-xs">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                        <p className="text-slate-500">Criado em {formatDateTime(delivery.createdAt)}</p>
                                    </div>
                                    {delivery.riderSearchStartedAt && (
                                        <div className="flex items-center gap-3 text-xs">
                                            <div className="h-2 w-2 rounded-full bg-sky-500" />
                                            <p className="text-slate-500">Busca iniciada em {formatDateTime(delivery.riderSearchStartedAt)}</p>
                                        </div>
                                    )}
                                    {delivery.acceptedAt && (
                                        <div className="flex items-center gap-3 text-xs">
                                            <div className="h-2 w-2 rounded-full bg-amber-500" />
                                            <p className="text-slate-500">Aceito em {formatDateTime(delivery.acceptedAt)}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase text-slate-400">Entregador Atribuído</p>
                                {delivery.rider ? (
                                    <div className="flex items-center gap-3 pt-2">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                                            {delivery.rider.displayName?.charAt(0) || "R"}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">{delivery.rider.displayName || "Entregador"}</p>
                                            <p className="text-xs text-slate-500">{delivery.rider.vehiclePlate || "Sem placa"}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="pt-1 text-sm text-slate-500 italic">Aguardando entregador...</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
