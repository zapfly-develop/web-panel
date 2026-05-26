import { auth } from "@/auth";
import { Prisma, ProductType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
    AlertTriangle,
    Boxes,
    Package2,
    ShoppingBag,
    Warehouse,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductFormDialog } from "@/components/dashboard/products/product-form-dialog";
import { ProductsDataTable } from "@/components/dashboard/products/products-data-table";
import {
    buildProductsOrderBy,
    buildProductsPageHref,
    parseProductSortField,
    parseProductTab,
    parseSortDirection,
    ProductTabFilter,
} from "./query-params";

type SearchParams = Promise<{
    page?: string;
    q?: string;
    sort?: string;
    dir?: string;
    tab?: string;
}>;

const PAGE_SIZE = 10;

function parsePage(value?: string) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) return 1;
    return parsed;
}

function buildTabWhere(
    base: Prisma.ProductWhereInput,
    tab: ProductTabFilter,
): Prisma.ProductWhereInput {
    if (tab === "active") return { ...base, isActive: true };
    if (tab === "inactive") return { ...base, isActive: false };
    return base;
}

export default async function UserProductsPage({
    searchParams,
}: {
    searchParams: SearchParams;
}) {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    const params = await searchParams;
    const userId = session.user.id;
    const currentPage = parsePage(params.page);
    const skip = (currentPage - 1) * PAGE_SIZE;
    const searchQuery = params.q?.trim() || "";
    const sortField = parseProductSortField(params.sort);
    const sortDirection = parseSortDirection(params.dir);
    const activeTab = parseProductTab(params.tab);

    const baseWhere: Prisma.ProductWhereInput = { ownerUserId: userId };

    const searchWhere: Prisma.ProductWhereInput = searchQuery
        ? {
              OR: [
                  {
                      title: {
                          contains: searchQuery,
                          mode: Prisma.QueryMode.insensitive,
                      },
                  },
                  {
                      description: {
                          contains: searchQuery,
                          mode: Prisma.QueryMode.insensitive,
                      },
                  },
                  {
                      category: {
                          contains: searchQuery,
                          mode: Prisma.QueryMode.insensitive,
                      },
                  },
                  {
                      productTags: {
                          some: {
                              tag: {
                                  name: {
                                      contains: searchQuery,
                                      mode: Prisma.QueryMode.insensitive,
                                  },
                              },
                          },
                      },
                  },
              ],
          }
        : {};

    const tableWhere: Prisma.ProductWhereInput = buildTabWhere(
        { ...baseWhere, ...searchWhere },
        activeTab,
    );

    // ─── Todas as queries em paralelo — latência = max(query mais lenta) ────
    const [
        products,
        filteredTotal,
        totalActive,
        totalInactive,
        totalCatalog,
        outOfStockCount,
        stockAggregations,
        categoryRows,
        tagRows,
    ] = await Promise.all([
        // Página atual da tabela
        prisma.product.findMany({
            where: tableWhere,
            include: { productTags: { include: { tag: true } } },
            orderBy: buildProductsOrderBy(sortField, sortDirection),
            skip,
            take: PAGE_SIZE,
        }),

        // Total filtrado (busca + tab) — para paginação
        prisma.product.count({ where: tableWhere }),

        // Contagens das abas — sem filtro de tab, com filtro de busca
        prisma.product.count({
            where: { ...baseWhere, ...searchWhere, isActive: true },
        }),
        prisma.product.count({
            where: { ...baseWhere, ...searchWhere, isActive: false },
        }),

        // KPI: total de produtos do lojista (sem filtro de busca)
        prisma.product.count({ where: baseWhere }),

        // KPI: produtos com estoque controlado zerado (ruptura)
        prisma.product.count({
            where: {
                ...baseWhere,
                stockQuantity: { not: null, equals: 0 },
            },
        }),

        // KPI: soma de unidades físicas e reservadas.
        // aggregate ignora rows com NULL — só conta produtos
        // que têm estoque controlado (stockQuantity not null).
        prisma.product.aggregate({
            where: {
                ...baseWhere,
                stockQuantity: { not: null },
            },
            _sum: {
                stockQuantity: true,
                reservedStockQuantity: true,
            },
        }),

        // Dropdown de categorias para o formulário
        prisma.product.findMany({
            where: { ...baseWhere, category: { not: null } },
            select: { category: true },
            distinct: ["category"],
            orderBy: { category: "asc" },
        }),

        // Dropdown de tags para o formulário
        prisma.tag.findMany({
            where: { subscriberId: userId },
            select: {
                id: true,
                name: true,
                _count: { select: { productTags: true } },
            },
            orderBy: { name: "asc" },
        }),
    ]);

    // ─── Derivações em memória (custo zero) ──────────────────────────────────
    const totalPhysicalStock = stockAggregations._sum.stockQuantity ?? 0;
    const totalReservedStock =
        stockAggregations._sum.reservedStockQuantity ?? 0;
    const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));

    if (filteredTotal > 0 && currentPage > totalPages) {
        redirect(
            buildProductsPageHref({
                page: totalPages,
                query: searchQuery,
                sortField,
                sortDirection,
                tab: activeTab,
            }),
        );
    }

    const categories = categoryRows
        .map((r) => r.category?.trim() || "")
        .filter(Boolean);

    const availableTags = tagRows.map((tag) => ({
        id: tag.id,
        name: tag.name,
        productCount: tag._count.productTags,
    }));

    return (
        <div className="space-y-6">
            {/* ─── Header ──────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h2 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-slate-900">
                        <ShoppingBag className="h-6 w-6 text-blue-600" />
                        Catálogo da loja
                    </h2>
                    <p className="text-sm text-slate-500">
                        Gerencie produtos, preços, estoque e categorias.
                    </p>
                </div>
                <ProductFormDialog
                    categories={categories}
                    availableTags={availableTags}
                />
            </div>

            {/* ─── KPIs de WMS ─────────────────────────────────────────────── */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                    icon={
                        <Package2 className="h-4 w-4 text-muted-foreground" />
                    }
                    label="Total Cadastrado"
                    value={totalCatalog}
                    description="SKUs no catálogo"
                />
                <KpiCard
                    icon={
                        <Warehouse className="h-4 w-4 text-muted-foreground" />
                    }
                    label="Total em Estoque"
                    value={totalPhysicalStock}
                    description="Unidades com estoque controlado"
                />
                <KpiCard
                    icon={<Boxes className="h-4 w-4 text-muted-foreground" />}
                    label="Total Reservado"
                    value={totalReservedStock}
                    description="Unidades aguardando despacho"
                    highlight={totalReservedStock > 0}
                />
                <KpiCard
                    icon={
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    }
                    label="Ruptura de Estoque"
                    value={outOfStockCount}
                    description="Produtos zerados"
                    destructive={outOfStockCount > 0}
                />
            </div>

            {/* ─── Tabela com abas e busca integradas ──────────────────────── */}
            {/*
                ProductsToolbar foi removido daqui.
                Ele agora é renderizado DENTRO do ProductsDataTable,
                embutido na mesma linha das abas.
            */}
            <ProductsDataTable
                products={products}
                categories={categories}
                availableTags={availableTags}
                currentPage={Math.min(currentPage, totalPages)}
                totalPages={totalPages}
                totalProducts={filteredTotal}
                totalActive={totalActive}
                totalInactive={totalInactive}
                pageSize={PAGE_SIZE}
                searchQuery={searchQuery}
                sortField={sortField}
                sortDirection={sortDirection}
                activeTab={activeTab}
            />
        </div>
    );
}

// ─── Componente de card de KPI ────────────────────────────────────────────────

type KpiCardProps = {
    icon: React.ReactNode;
    label: string;
    value: number;
    description: string;
    highlight?: boolean;
    destructive?: boolean;
};

function KpiCard({
    icon,
    label,
    value,
    description,
    highlight,
    destructive,
}: KpiCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                    {label}
                </CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div
                    className={`text-2xl font-bold tabular-nums ${
                        destructive
                            ? "text-destructive"
                            : highlight
                              ? "text-blue-700"
                              : "text-slate-900"
                    }`}
                >
                    {value.toLocaleString("pt-BR")}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                    {description}
                </p>
            </CardContent>
        </Card>
    );
}
