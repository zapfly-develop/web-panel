"use client";

import Link from "next/link";
import Image from "next/image";
import { Prisma } from "@prisma/client";
import {
    AlertCircle,
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    Image as ImageIcon,
    PackageSearch,
    Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    ProductSortField,
    SortDirection,
    buildProductsPageHref,
} from "@/app/dashboard/products/query-params";
import { ProductRowActions } from "./product-row-actions";
import { ProductTagOption } from "./product-tags-input";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Product = Prisma.ProductGetPayload<{
    include: {
        productTags: {
            include: { tag: true };
        };
    };
}>;

type ProductsDataTableProps = {
    products: Product[];
    categories: string[];
    availableTags: ProductTagOption[];
    currentPage: number;
    totalPages: number;
    totalProducts: number;
    totalActive: number;
    totalInactive: number;
    pageSize: number;
    searchQuery: string;
    sortField: ProductSortField;
    sortDirection: SortDirection;
    activeTab: "all" | "active" | "inactive";
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(valueCents: number) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(valueCents / 100);
}

function hasPromotionalPrice(product: Product) {
    return (
        typeof product.promotionalPriceCents === "number" &&
        product.promotionalPriceCents > 0 &&
        product.promotionalPriceCents < product.priceCents
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SortIndicator({
    active,
    direction,
}: {
    active: boolean;
    direction: SortDirection;
}) {
    if (!active) return <ArrowUpDown className="h-3 w-3 text-slate-400" />;
    return direction === "asc" ? (
        <ArrowUp className="h-3 w-3 text-blue-600" />
    ) : (
        <ArrowDown className="h-3 w-3 text-blue-600" />
    );
}

function SortableHead({
    label,
    field,
    searchQuery,
    currentSortField,
    currentSortDirection,
    className,
}: {
    label: string;
    field: ProductSortField;
    searchQuery: string;
    currentSortField: ProductSortField;
    currentSortDirection: SortDirection;
    className?: string;
}) {
    const isActive = currentSortField === field;
    const nextDirection =
        isActive && currentSortDirection === "asc" ? "desc" : "asc";
    const href = buildProductsPageHref({
        page: 1,
        query: searchQuery,
        sortField: field,
        sortDirection: nextDirection,
    });

    return (
        <TableHead className={cn("px-4 py-3", className)}>
            <Link
                href={href}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition hover:text-slate-700"
            >
                {label}
                <SortIndicator
                    active={isActive}
                    direction={currentSortDirection}
                />
            </Link>
        </TableHead>
    );
}

function ProductThumbnail({
    imageUrl,
    title,
}: {
    imageUrl: string | null;
    title: string;
}) {
    if (!imageUrl) {
        return (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                <ImageIcon className="h-4 w-4 text-slate-300" />
            </div>
        );
    }
    return (
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            <Image
                src={imageUrl}
                alt={title}
                fill
                className="object-cover"
                sizes="40px"
            />
        </div>
    );
}

function StockCell({
    stockQuantity,
    reservedStockQuantity,
}: {
    stockQuantity: number | null;
    reservedStockQuantity: number;
}) {
    if (stockQuantity === null) {
        return <span className="text-sm text-slate-400">Livre</span>;
    }

    const available = Math.max(
        stockQuantity - Math.max(0, reservedStockQuantity),
        0,
    );
    const isLow = available <= 5;
    const isZero = available === 0;

    return (
        <div className="flex items-center gap-1.5">
            <span
                className={cn(
                    "text-sm",
                    isZero
                        ? "text-red-600"
                        : isLow
                          ? "text-amber-600"
                          : "text-slate-700",
                )}
            >
                {available} disponível
            </span>
            {(isZero || isLow) && (
                <AlertCircle
                    className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        isZero ? "text-red-500" : "text-amber-500",
                    )}
                />
            )}
        </div>
    );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
    if (isActive) {
        return (
            <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold tracking-wide text-blue-700">
                ATIVO
            </span>
        );
    }
    return (
        <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold tracking-wide text-slate-400">
            INATIVO
        </span>
    );
}

// ─── TabLink e TabCount ───────────────────────────────────────────────────────

function TabLink({
    href,
    active,
    children,
}: {
    href: string;
    active: boolean;
    children: React.ReactNode;
}) {
    return (
        <Link
            href={href}
            className={cn(
                "inline-flex items-center gap-1.5 border-b-2 px-1 pb-3 pt-1 text-sm font-medium transition-colors whitespace-nowrap",
                active
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700",
            )}
        >
            {children}
        </Link>
    );
}

function TabCount({ count }: { count: number }) {
    return (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            {count}
        </span>
    );
}

// ─── SearchInput (client-side form para manter URL params) ────────────────────
// Componente simples: ao submeter navega para /?q=<valor>&tab=<tab>
// Não precisa de useRouter — form nativo com GET e action na rota atual.

function SearchInput({
    searchQuery,
    sortField,
    sortDirection,
    activeTab,
}: {
    searchQuery: string;
    sortField: ProductSortField;
    sortDirection: SortDirection;
    activeTab: "all" | "active" | "inactive";
}) {
    // Monta a action preservando tab, sort e dir como hidden inputs
    return (
        <form method="GET" action="/dashboard/products" className="relative">
            {/* Campos ocultos para preservar estado atual ao buscar */}
            {activeTab !== "all" && (
                <input type="hidden" name="tab" value={activeTab} />
            )}
            {sortField !== "createdAt" && (
                <input type="hidden" name="sort" value={sortField} />
            )}
            {sortDirection !== "desc" && (
                <input type="hidden" name="dir" value={sortDirection} />
            )}

            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
                type="search"
                name="q"
                defaultValue={searchQuery}
                placeholder="Buscar produto..."
                className={cn(
                    "h-8 w-48 rounded-md border border-slate-200 bg-white pl-8 pr-3 text-sm",
                    "text-slate-700 placeholder:text-slate-400",
                    "focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400",
                    "transition-[width] duration-200 focus:w-56",
                )}
            />
        </form>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProductsDataTable({
    products,
    categories,
    availableTags,
    currentPage,
    totalPages,
    totalProducts,
    totalActive,
    totalInactive,
    pageSize,
    searchQuery,
    sortField,
    sortDirection,
    activeTab,
}: ProductsDataTableProps) {
    function tabHref(tab: "all" | "active" | "inactive") {
        return buildProductsPageHref({
            page: 1,
            query: searchQuery,
            sortField,
            sortDirection,
            tab,
        });
    }

    const firstItemIndex = (currentPage - 1) * pageSize + 1;
    const lastItemIndex = Math.min(currentPage * pageSize, totalProducts);

    return (
        <Card className="overflow-hidden border border-slate-100 shadow-sm">
            {/* ─── Cabeçalho: abas + busca na mesma linha ──────────────────── */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 pt-1">
                {/* Abas */}
                <div className="flex gap-6">
                    <TabLink href={tabHref("all")} active={activeTab === "all"}>
                        Todos
                        <TabCount count={totalActive + totalInactive} />
                    </TabLink>
                    <TabLink
                        href={tabHref("active")}
                        active={activeTab === "active"}
                    >
                        Ativos
                        <TabCount count={totalActive} />
                    </TabLink>
                    <TabLink
                        href={tabHref("inactive")}
                        active={activeTab === "inactive"}
                    >
                        Inativos
                        <TabCount count={totalInactive} />
                    </TabLink>
                </div>

                {/* Busca — alinhada à direita das abas */}
                <div className="flex items-center gap-3 pb-1">
                    <SearchInput
                        searchQuery={searchQuery}
                        sortField={sortField}
                        sortDirection={sortDirection}
                        activeTab={activeTab}
                    />
                    {totalProducts > 0 && (
                        <span className="hidden text-xs text-slate-400 sm:block">
                            {firstItemIndex}–{lastItemIndex} de {totalProducts}
                        </span>
                    )}
                </div>
            </div>

            {/* ─── Empty state ─────────────────────────────────────────────── */}
            {!products.length ? (
                <CardContent className="flex min-h-72 flex-col items-center justify-center gap-3 text-center">
                    <div className="rounded-full bg-slate-100 p-4">
                        <PackageSearch className="h-6 w-6 text-slate-400" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-900">
                            {searchQuery
                                ? "Nenhum produto encontrado"
                                : "Nenhum produto cadastrado"}
                        </p>
                        <p className="max-w-xs text-xs text-slate-400">
                            {searchQuery
                                ? "Tente outro termo de busca."
                                : "Use o botão Novo produto para cadastrar."}
                        </p>
                    </div>
                </CardContent>
            ) : (
                <>
                    {/* ─── Tabela ──────────────────────────────────────────── */}
                    <div className="overflow-x-auto">
                        <Table className="min-w-[820px]">
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <SortableHead
                                        label="Nome do produto"
                                        field="title"
                                        searchQuery={searchQuery}
                                        currentSortField={sortField}
                                        currentSortDirection={sortDirection}
                                        className="w-[300px]"
                                    />
                                    <SortableHead
                                        label="SKU"
                                        field="sku"
                                        searchQuery={searchQuery}
                                        currentSortField={sortField}
                                        currentSortDirection={sortDirection}
                                    />
                                    <SortableHead
                                        label="Preço"
                                        field="price"
                                        searchQuery={searchQuery}
                                        currentSortField={sortField}
                                        currentSortDirection={sortDirection}
                                    />
                                    <SortableHead
                                        label="Estoque"
                                        field="stock"
                                        searchQuery={searchQuery}
                                        currentSortField={sortField}
                                        currentSortDirection={sortDirection}
                                    />
                                    <SortableHead
                                        label="Status"
                                        field="status"
                                        searchQuery={searchQuery}
                                        currentSortField={sortField}
                                        currentSortDirection={sortDirection}
                                    />
                                    <TableHead className="px-4 py-3 text-right">
                                        <span className="sr-only">Ações</span>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {products.map((product) => (
                                    <TableRow
                                        key={product.id}
                                        className="group border-slate-100 hover:bg-slate-50/60"
                                    >
                                        {/* Nome + thumbnail */}
                                        <TableCell className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <ProductThumbnail
                                                    imageUrl={product.imageUrl}
                                                    title={product.title}
                                                />
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium text-slate-900">
                                                        {product.title}
                                                    </p>
                                                    {product.category && (
                                                        <p className="truncate text-xs text-slate-400">
                                                            {product.category}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* SKU */}
                                        <TableCell className="px-4 py-3">
                                            {product.sku ? (
                                                <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs text-slate-600">
                                                    {product.sku}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-300">
                                                    —
                                                </span>
                                            )}
                                        </TableCell>

                                        {/* Preço */}
                                        <TableCell className="px-4 py-3">
                                            {hasPromotionalPrice(product) ? (
                                                <div className="space-y-0.5">
                                                    <p className="text-sm font-semibold text-emerald-600">
                                                        {formatMoney(
                                                            product.promotionalPriceCents!,
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-slate-400 line-through">
                                                        {formatMoney(
                                                            product.priceCents,
                                                        )}
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-slate-700">
                                                    {formatMoney(
                                                        product.priceCents,
                                                    )}
                                                </span>
                                            )}
                                        </TableCell>

                                        {/* Estoque */}
                                        <TableCell className="px-4 py-3">
                                            <StockCell
                                                stockQuantity={
                                                    product.stockQuantity
                                                }
                                                reservedStockQuantity={
                                                    product.reservedStockQuantity
                                                }
                                            />
                                        </TableCell>

                                        {/* Status */}
                                        <TableCell className="px-4 py-3">
                                            <StatusBadge
                                                isActive={product.isActive}
                                            />
                                        </TableCell>

                                        {/* Ações */}
                                        <TableCell className="px-4 py-3 text-right">
                                            <ProductRowActions
                                                product={product}
                                                categories={categories}
                                                availableTags={availableTags}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* ─── Paginação ───────────────────────────────────────── */}
                    <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3">
                        <p className="text-xs text-slate-400">
                            {totalProducts} produto(s) · página {currentPage} de{" "}
                            {Math.max(totalPages, 1)}
                        </p>
                        <div className="flex items-center gap-1.5">
                            {currentPage <= 1 ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled
                                    className="h-8 gap-1 text-xs"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                    Anterior
                                </Button>
                            ) : (
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1 text-xs"
                                >
                                    <Link
                                        href={buildProductsPageHref({
                                            page: currentPage - 1,
                                            query: searchQuery,
                                            sortField,
                                            sortDirection,
                                            tab: activeTab,
                                        })}
                                    >
                                        <ChevronLeft className="h-3.5 w-3.5" />
                                        Anterior
                                    </Link>
                                </Button>
                            )}
                            {currentPage >= totalPages ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled
                                    className="h-8 gap-1 text-xs"
                                >
                                    Próxima
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                            ) : (
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1 text-xs"
                                >
                                    <Link
                                        href={buildProductsPageHref({
                                            page: currentPage + 1,
                                            query: searchQuery,
                                            sortField,
                                            sortDirection,
                                            tab: activeTab,
                                        })}
                                    >
                                        Próxima
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </Card>
    );
}
