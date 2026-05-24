import Link from "next/link";
import { Prisma, ProductType } from "@prisma/client";
import {
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Barcode,
    Boxes,
    ChevronLeft,
    ChevronRight,
    Image as ImageIcon,
    MoreHorizontal,
    PackageSearch,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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

type ProductsDataTableProps = {
    products: Prisma.ProductGetPayload<{
        include: {
            productTags: {
                include: {
                    tag: true;
                };
            };
        };
    }>[];
    categories: string[];
    availableTags: ProductTagOption[];
    currentPage: number;
    totalPages: number;
    totalProducts: number;
    pageSize: number;
    searchQuery: string;
    sortField: ProductSortField;
    sortDirection: SortDirection;
};

function formatMoney(valueCents: number) {
    return `R$ ${(valueCents / 100).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function hasPromotionalPrice(
    product: ProductsDataTableProps["products"][number],
) {
    return (
        typeof product.promotionalPriceCents === "number" &&
        product.promotionalPriceCents > 0 &&
        product.promotionalPriceCents < product.priceCents
    );
}

function formatDate(date: Date) {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date);
}

function buildPageHref(input: {
    page: number;
    query: string;
    sortField: ProductSortField;
    sortDirection: SortDirection;
}) {
    return buildProductsPageHref(input);
}

function SortIndicator({
    active,
    direction,
}: {
    active: boolean;
    direction: SortDirection;
}) {
    if (!active) {
        return <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />;
    }

    return direction === "asc" ? (
        <ArrowUp className="h-3.5 w-3.5 text-primary" />
    ) : (
        <ArrowDown className="h-3.5 w-3.5 text-primary" />
    );
}

function SortableHead({
    label,
    field,
    searchQuery,
    currentSortField,
    currentSortDirection,
}: {
    label: string;
    field: ProductSortField;
    searchQuery: string;
    currentSortField: ProductSortField;
    currentSortDirection: SortDirection;
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
        <TableHead className="px-4 py-3">
            <Link
                href={href}
                className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:text-slate-900"
            >
                <span>{label}</span>
                <SortIndicator
                    active={isActive}
                    direction={currentSortDirection}
                />
            </Link>
        </TableHead>
    );
}

function ProductImagePreview({
    imageUrl,
    title,
}: {
    imageUrl: string | null;
    title: string;
}) {
    if (!imageUrl) {
        return (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-400">
                <ImageIcon className="h-4 w-4" />
            </div>
        );
    }

    return (
        <div
            className="h-12 w-12 rounded-xl border border-slate-200 bg-slate-100 bg-cover bg-center"
            style={{ backgroundImage: `url("${imageUrl}")` }}
            aria-label={`Imagem do produto ${title}`}
        />
    );
}

function ProductSkuBadge({ sku }: { sku: string | null }) {
    if (!sku?.trim()) {
        return <span className="text-sm text-slate-400">Sem SKU</span>;
    }

    return (
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 font-mono text-xs font-semibold text-blue-700">
            <Barcode className="h-3.5 w-3.5" />
            {sku}
        </div>
    );
}

function ProductStockViewer({
    stockQuantity,
    reservedStockQuantity,
}: {
    stockQuantity: number | null;
    reservedStockQuantity: number;
}) {
    const reserved = Math.max(0, reservedStockQuantity);
    const hasReserved = reserved > 0;

    if (stockQuantity === null) {
        return (
            <div
                className={`min-w-52 rounded-xl border px-3 py-2 ${
                    hasReserved
                        ? "border-blue-200 bg-blue-50/70"
                        : "border-slate-200 bg-white"
                }`}
            >
                <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                        <Boxes className="h-4 w-4 text-blue-600" />
                        Livre
                    </span>
                    {hasReserved ? (
                        <Badge
                            variant="outline"
                            className="border-blue-200 bg-white text-blue-700"
                        >
                            {reserved} reservado(s)
                        </Badge>
                    ) : null}
                </div>
            </div>
        );
    }

    const total = Math.max(0, stockQuantity);
    const available = Math.max(total - reserved, 0);
    const reservedPercent =
        total > 0 ? Math.min((reserved / total) * 100, 100) : 0;
    const isLowAvailable = total > 0 && available <= 5;

    return (
        <div
            className={`min-w-56 rounded-xl border px-3 py-2 ${
                hasReserved
                    ? "border-blue-200 bg-blue-50/70"
                    : isLowAvailable
                      ? "border-amber-200 bg-amber-50/70"
                      : "border-slate-200 bg-white"
            }`}
        >
            <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                    <Boxes className="h-4 w-4 text-blue-600" />
                    {available} disponivel
                </span>
                {hasReserved ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-blue-700">
                        <AlertTriangle className="h-3 w-3" />
                        {reserved} reservado(s)
                    </span>
                ) : null}
            </div>
            <div className="mt-2 space-y-1.5">
                <Progress
                    value={reservedPercent}
                    className="h-1.5 bg-slate-100 [&>div]:bg-blue-500"
                />
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Total: {total}</span>
                    {isLowAvailable ? (
                        <span className="font-medium text-amber-700">
                            Estoque baixo
                        </span>
                    ) : (
                        <span>{reservedPercent.toFixed(0)}% reservado</span>
                    )}
                </div>
            </div>
        </div>
    );
}

export function ProductsDataTable({
    products,
    categories,
    availableTags,
    currentPage,
    totalPages,
    totalProducts,
    pageSize,
    searchQuery,
    sortField,
    sortDirection,
}: ProductsDataTableProps) {
    if (!products.length) {
        return (
            <Card className="border-none shadow-sm">
                <CardContent className="flex min-h-80 flex-col items-center justify-center gap-4 text-center">
                    <div className="rounded-full bg-slate-100 p-4 text-slate-500">
                        <PackageSearch className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-lg font-semibold text-slate-900">
                            {searchQuery
                                ? "Nenhum produto encontrado"
                                : "Nenhum produto cadastrado ainda"}
                        </p>
                        <p className="max-w-md text-sm text-slate-500">
                            {searchQuery ? (
                                "Tente outro termo de busca ou ajuste a ordenacao para localizar o item desejado."
                            ) : (
                                <>
                                    Use o botao{" "}
                                    <span className="font-medium">
                                        Novo produto
                                    </span>{" "}
                                    para montar o catalogo da loja e alimentar o
                                    atendimento no WhatsApp.
                                </>
                            )}
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const firstItemIndex = (currentPage - 1) * pageSize + 1;
    const lastItemIndex = Math.min(currentPage * pageSize, totalProducts);

    return (
        <Card className="overflow-hidden border border-slate-100 shadow-sm">
            <CardHeader className="flex flex-col gap-3 border-b border-slate-100 bg-white sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Boxes className="h-5 w-5 text-blue-600" />
                        Lista de produtos
                    </CardTitle>
                    <p className="text-sm text-slate-500">
                        Exibindo {firstItemIndex} a {lastItemIndex} de{" "}
                        {totalProducts} produto(s).
                    </p>
                </div>
                <Badge
                    variant="outline"
                    className="w-fit border-blue-100 bg-blue-50 text-blue-700"
                >
                    Pagina {currentPage} de {Math.max(totalPages, 1)}
                </Badge>
            </CardHeader>

            <CardContent className="p-0">
                <Table className="min-w-[980px]">
                    <TableHeader className="bg-slate-50/90">
                        <TableRow className="hover:bg-slate-50/90">
                            <SortableHead
                                label="Produto"
                                field="title"
                                searchQuery={searchQuery}
                                currentSortField={sortField}
                                currentSortDirection={sortDirection}
                            />
                            <SortableHead
                                label="SKU"
                                field="sku"
                                searchQuery={searchQuery}
                                currentSortField={sortField}
                                currentSortDirection={sortDirection}
                            />
                            <SortableHead
                                label="Categoria"
                                field="category"
                                searchQuery={searchQuery}
                                currentSortField={sortField}
                                currentSortDirection={sortDirection}
                            />
                            <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Tipo
                            </TableHead>
                            <SortableHead
                                label="Preco"
                                field="price"
                                searchQuery={searchQuery}
                                currentSortField={sortField}
                                currentSortDirection={sortDirection}
                            />
                            <SortableHead
                                label="Estoque WMS"
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
                            <SortableHead
                                label="Criado"
                                field="createdAt"
                                searchQuery={searchQuery}
                                currentSortField={sortField}
                                currentSortDirection={sortDirection}
                            />
                            <TableHead className="px-4 py-3 text-right">
                                <span className="sr-only">Acoes</span>
                                <MoreHorizontal className="ml-auto h-4 w-4 text-slate-400" />
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.map((product) => (
                            <TableRow
                                key={product.id}
                                className="bg-white hover:bg-blue-50/30"
                            >
                                <TableCell className="px-4 py-4 align-top">
                                    <div className="flex min-w-0 items-start gap-3">
                                        <ProductImagePreview
                                            imageUrl={product.imageUrl}
                                            title={product.title}
                                        />
                                        <div className="min-w-0 space-y-1">
                                            <div className="font-semibold text-slate-900">
                                                {product.title}
                                            </div>
                                            <p className="line-clamp-2 max-w-md whitespace-normal text-sm text-slate-500">
                                                {product.description ||
                                                    "Sem descricao cadastrada."}
                                            </p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="px-4 py-4 align-top">
                                    <ProductSkuBadge sku={product.sku} />
                                </TableCell>
                                <TableCell className="px-4 py-4 align-top">
                                    <ProductSkuBadge sku={product.category} />
                                </TableCell>
                                <TableCell className="px-4 py-4 align-top">
                                    <div className="space-y-2">
                                        <Badge
                                            variant={
                                                product.productType ===
                                                ProductType.ONE_TIME
                                                    ? "default"
                                                    : "outline"
                                            }
                                        >
                                            {product.productType ===
                                            ProductType.ONE_TIME
                                                ? "Avulso"
                                                : "Assinatura"}
                                        </Badge>
                                        {product.productType ===
                                            ProductType.SUBSCRIPTION &&
                                            product.subscriberDays && (
                                                <p className="text-xs text-slate-500">
                                                    {product.subscriberDays}{" "}
                                                    dias
                                                </p>
                                            )}
                                    </div>
                                </TableCell>
                                <TableCell className="px-4 py-4 align-top">
                                    {hasPromotionalPrice(product) ? (
                                        <div className="space-y-1">
                                            <p className="font-semibold text-emerald-700">
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
                                        <span className="font-medium text-slate-900">
                                            {formatMoney(product.priceCents)}
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="px-4 py-4 align-top">
                                    <ProductStockViewer
                                        stockQuantity={product.stockQuantity}
                                        reservedStockQuantity={
                                            product.reservedStockQuantity
                                        }
                                    />
                                </TableCell>
                                <TableCell className="px-4 py-4 align-top">
                                    <Badge
                                        variant={
                                            product.isActive
                                                ? "default"
                                                : "outline"
                                        }
                                        className={
                                            product.isActive
                                                ? "bg-blue-600 text-white hover:bg-blue-600"
                                                : "text-slate-500"
                                        }
                                    >
                                        {product.isActive ? "Ativo" : "Inativo"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="px-4 py-4 align-top text-slate-500">
                                    {formatDate(product.createdAt)}
                                </TableCell>
                                <TableCell className="px-4 py-4 text-right align-top">
                                    <div className="flex justify-end">
                                        <ProductRowActions
                                            product={product}
                                            categories={categories}
                                            availableTags={availableTags}
                                        />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-500">
                        Carregando {products.length} item(ns) por pagina para
                        reduzir o consumo do banco de dados.
                    </p>
                    <div className="flex items-center gap-2">
                        {currentPage <= 1 ? (
                            <Button variant="outline" size="sm" disabled>
                                <ChevronLeft className="h-4 w-4" />
                                Anterior
                            </Button>
                        ) : (
                            <Button asChild variant="outline" size="sm">
                                <Link
                                    href={buildPageHref({
                                        page: currentPage - 1,
                                        query: searchQuery,
                                        sortField,
                                        sortDirection,
                                    })}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Anterior
                                </Link>
                            </Button>
                        )}

                        {currentPage >= totalPages ? (
                            <Button variant="outline" size="sm" disabled>
                                Proxima
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button asChild variant="outline" size="sm">
                                <Link
                                    href={buildPageHref({
                                        page: currentPage + 1,
                                        query: searchQuery,
                                        sortField,
                                        sortDirection,
                                    })}
                                >
                                    Proxima
                                    <ChevronRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
