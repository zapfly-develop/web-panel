import { notFound } from "next/navigation";
import { InboundOrderStatus } from "@prisma/client";
import {
    ArrowLeft,
    Boxes,
    Building2,
    FileText,
    PackageCheck,
} from "lucide-react";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    InboundMappingTable,
    type InboundMappingActionResult,
    type InboundMappingItem,
    type InboundProductOption,
} from "@/components/dashboard/inbound/inbound-mapping-table";
import { prisma } from "@/lib/prisma";
import {
    buildAuthenticatedNestHeaders,
    fetchNestApiJson,
} from "@/lib/nest-api";
import { requireStoreUser } from "@/lib/server-session";

export const runtime = "nodejs";

type PageProps = {
    params: Promise<{
        id: string;
    }>;
};

function formatMoney(valueCents: number) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(valueCents / 100);
}

function formatDate(date: Date) {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function getStatusLabel(status: InboundOrderStatus) {
    const labels: Record<InboundOrderStatus, string> = {
        PENDING_MAPPING: "Pendente de DE-PARA",
        READY_TO_RECEIVE: "Pronta para recebimento",
        RECEIVED: "Recebida",
        CANCELLED: "Cancelada",
    };

    return labels[status] ?? status;
}

export default async function InboundConciliationPage({ params }: PageProps) {
    const { id } = await params;
    const user = await requireStoreUser();
    const [inboundOrder, products, categoryRows, tagRows] = await Promise.all([
        prisma.inboundOrder.findFirst({
            where: {
                id,
                ownerUserId: user.id,
            },
            include: {
                warehouse: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                items: {
                    include: {
                        internalProduct: {
                            select: {
                                id: true,
                                title: true,
                                sku: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: "asc",
                    },
                },
            },
        }),
        prisma.product.findMany({
            where: {
                ownerUserId: user.id,
                isActive: true,
            },
            select: {
                id: true,
                title: true,
                sku: true,
                stockQuantity: true,
            },
            orderBy: [
                {
                    sku: "asc",
                },
                {
                    title: "asc",
                },
            ],
        }),
        prisma.product.findMany({
            where: { ownerUserId: user.id, category: { not: null } },
            select: { category: true },
            distinct: ["category"],
            orderBy: { category: "asc" },
        }),
        prisma.tag.findMany({
            where: { subscriberId: user.id },
            select: {
                id: true,
                name: true,
                _count: { select: { productTags: true } },
            },
            orderBy: { name: "asc" },
        }),
    ]);

    if (!inboundOrder) {
        notFound();
    }

    async function confirmInboundMappingAction(
        formData: FormData,
    ): Promise<InboundMappingActionResult> {
        "use server";

        const currentUser = await requireStoreUser();
        const inboundOrderId = String(formData.get("inboundOrderId") ?? "").trim();
        const rawMappings = String(formData.get("mappings") ?? "[]");

        type NestInboundMapping = {
            inboundItemId: string;
            internalProductId?: string;
            isIgnored?: boolean;
        };

        let mappings: NestInboundMapping[] = [];

        try {
            const parsed = JSON.parse(rawMappings) as unknown;

            if (Array.isArray(parsed)) {
                mappings = parsed.reduce<NestInboundMapping[]>((acc, entry) => {
                        const item = entry as {
                            inboundOrderItemId?: unknown;
                            productId?: unknown;
                            ignored?: unknown;
                        };
                        const inboundItemId = String(
                            item.inboundOrderItemId ?? "",
                        ).trim();
                        const internalProductId =
                            typeof item.productId === "string" &&
                            item.productId.trim()
                                ? item.productId.trim()
                                : undefined;
                        const isIgnored = Boolean(item.ignored);

                        if (!inboundItemId || (!internalProductId && !isIgnored)) {
                            return acc;
                        }

                        acc.push({
                            inboundItemId,
                            internalProductId,
                            isIgnored,
                        });

                        return acc;
                    }, []);
            }
        } catch {
            return {
                ok: false,
                message: "Nao foi possivel ler os vinculos informados.",
            };
        }

        if (!inboundOrderId || !mappings.length) {
            return {
                ok: false,
                message: "Informe ao menos um item da nota fiscal.",
            };
        }

        try {
            await fetchNestApiJson(`/wms/inbound/${inboundOrderId}/map`, {
                method: "POST",
                headers: await buildAuthenticatedNestHeaders(currentUser.id, {
                    "Content-Type": "application/json",
                }),
                body: JSON.stringify({ mappings }),
            });
        } catch (error) {
            return {
                ok: false,
                message:
                    error instanceof Error
                        ? error.message
                        : "Nao foi possivel salvar a conciliacao no backend.",
            };
        }

        revalidatePath(`/dashboard/inbound/${inboundOrderId}`);
        revalidatePath("/dashboard/inbound");

        return {
            ok: true,
            message:
                "Conciliação salva no backend. A entrada está pronta para recebimento.",
        };
    }

    const availableProducts: InboundProductOption[] = products.map((product) => ({
        id: product.id,
        title: product.title,
        sku: product.sku,
        stockQuantity: product.stockQuantity,
    }));
    const categories = categoryRows
        .map((row) => row.category?.trim() || "")
        .filter(Boolean);
    const availableTags = tagRows.map((tag) => ({
        id: tag.id,
        name: tag.name,
        productCount: tag._count.productTags,
    }));
    const mappingItems: InboundMappingItem[] = inboundOrder.items.map((item) => ({
        id: item.id,
        providerCode: item.providerCode,
        description: item.description,
        ncm: item.ncm,
        gtin: item.gtin,
        quantity: item.quantity,
        unitValueCents: item.unitValueCents,
        totalValueCents: item.totalValueCents,
        productId: item.internalProductId,
        internalProduct: item.internalProduct,
    }));
    const mappedItemsCount = inboundOrder.items.filter(
        (item) => item.internalProductId,
    ).length;

    return (
        <div className="mx-auto max-w-7xl space-y-6 pb-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-3">
                    <Button asChild variant="ghost" className="w-fit px-0">
                        <Link href="/dashboard/inbound">
                            <ArrowLeft className="h-4 w-4" />
                            Voltar para inbound
                        </Link>
                    </Button>
                    <div className="space-y-2">
                        <Badge
                            variant="outline"
                            className="w-fit border-blue-100 bg-blue-50 text-blue-700"
                        >
                            {getStatusLabel(inboundOrder.status)}
                        </Badge>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                            Conciliação de NF-e
                        </h1>
                        <p className="max-w-3xl text-slate-500">
                            Faça o DE-PARA entre os itens enviados pelo fornecedor
                            e os produtos cadastrados no catálogo Floovi.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-slate-100 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm text-slate-500">
                            <FileText className="h-4 w-4 text-blue-600" />
                            Nota fiscal
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 pt-0">
                        <p className="text-2xl font-bold text-slate-950">
                            {inboundOrder.invoiceNumber ?? "Sem numero"}
                        </p>
                        <p className="text-xs text-slate-500">
                            Serie {inboundOrder.invoiceSeries ?? "-"}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-slate-100 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm text-slate-500">
                            <Building2 className="h-4 w-4 text-blue-600" />
                            Fornecedor
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 pt-0">
                        <p className="line-clamp-1 text-lg font-semibold text-slate-950">
                            {inboundOrder.providerName ?? "Fornecedor"}
                        </p>
                        <p className="text-xs text-slate-500">
                            {inboundOrder.providerDocument}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-slate-100 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm text-slate-500">
                            <Boxes className="h-4 w-4 text-blue-600" />
                            Itens conciliados
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 pt-0">
                        <p className="text-2xl font-bold text-slate-950">
                            {mappedItemsCount}/{inboundOrder.items.length}
                        </p>
                        <p className="text-xs text-slate-500">
                            Criada em {formatDate(inboundOrder.createdAt)}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-slate-100 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm text-slate-500">
                            <PackageCheck className="h-4 w-4 text-blue-600" />
                            Valor total
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 pt-0">
                        <p className="text-2xl font-bold text-slate-950">
                            {formatMoney(inboundOrder.totalCents)}
                        </p>
                        <p className="text-xs text-slate-500">
                            {inboundOrder.warehouse?.name ?? "Galpão automático"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <InboundMappingTable
                inboundOrderId={inboundOrder.id}
                invoiceNumber={inboundOrder.invoiceNumber}
                providerName={inboundOrder.providerName}
                totalCents={inboundOrder.totalCents}
                items={mappingItems}
                availableProducts={availableProducts}
                categories={categories}
                availableTags={availableTags}
                confirmAction={confirmInboundMappingAction}
            />
        </div>
    );
}
