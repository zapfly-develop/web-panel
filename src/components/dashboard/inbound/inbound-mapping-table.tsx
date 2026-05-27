"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    Check,
    ChevronsUpDown,
    CircleSlash,
    Loader2,
    Plus,
    RefreshCw,
    Search,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ProductFormDialog } from "@/components/dashboard/products/product-form-dialog";
import { ProductTagOption } from "@/components/dashboard/products/product-tags-input";
import {
    ProductFormState,
    ProductFormValues,
    initialProductFormValues,
} from "@/app/dashboard/products/form-state";
import { cn } from "@/lib/utils";

export type InboundProductOption = {
    id: string;
    title: string;
    sku: string | null;
    stockQuantity: number | null;
};

export type InboundMappingItem = {
    id: string;
    providerCode: string;
    description: string;
    ncm: string | null;
    gtin: string | null;
    quantity: number;
    unitValueCents: number;
    totalValueCents: number;
    productId: string | null;
    internalProduct: {
        id: string;
        title: string;
        sku: string | null;
    } | null;
};

export type InboundMappingActionResult = {
    ok: boolean;
    message?: string;
};

type MappingState = Record<
    string,
    {
        productId: string | null;
        ignored: boolean;
    }
>;

type InboundMappingTableProps = {
    inboundOrderId: string;
    invoiceNumber: string | null;
    providerName: string | null;
    totalCents: number;
    items: InboundMappingItem[];
    availableProducts: InboundProductOption[];
    categories: string[];
    availableTags: ProductTagOption[];
    confirmAction: (formData: FormData) => Promise<InboundMappingActionResult>;
};

function formatMoney(valueCents: number) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(valueCents / 100);
}

function formatQuantity(value: number) {
    return new Intl.NumberFormat("pt-BR", {
        maximumFractionDigits: 3,
    }).format(value);
}

function buildProductSearchText(product: InboundProductOption) {
    return `${product.sku ?? ""} ${product.title}`.toLocaleLowerCase("pt-BR");
}

function buildInitialProductValuesFromItem(
    item: InboundMappingItem,
): ProductFormValues {
    return {
        ...initialProductFormValues,
        title: item.description,
        description: item.description,
        sku: item.providerCode,
        stockQuantity: "0",
    };
}

function ProductCombobox({
    value,
    ignored,
    products,
    onChange,
}: {
    value: string | null;
    ignored: boolean;
    products: InboundProductOption[];
    onChange: (nextValue: { productId: string | null; ignored: boolean }) => void;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const selectedProduct = products.find((product) => product.id === value);
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    const filteredProducts = useMemo(() => {
        if (!normalizedQuery) {
            return products.slice(0, 40);
        }

        return products
            .filter((product) =>
                buildProductSearchText(product).includes(normalizedQuery),
            )
            .slice(0, 40);
    }, [normalizedQuery, products]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className={cn(
                        "h-auto min-h-11 w-full justify-between gap-3 px-3 py-2 text-left",
                        ignored && "border-slate-200 bg-slate-50 text-slate-500",
                        selectedProduct && "border-blue-200 bg-blue-50/70",
                    )}
                >
                    <span className="min-w-0">
                        {ignored ? (
                            <span className="inline-flex items-center gap-2 text-sm">
                                <CircleSlash className="h-4 w-4" />
                                Ignorar este item
                            </span>
                        ) : selectedProduct ? (
                            <span className="block min-w-0">
                                <span className="block truncate text-sm font-semibold text-slate-900">
                                    {selectedProduct.title}
                                </span>
                                <span className="block truncate font-mono text-xs text-blue-700">
                                    {selectedProduct.sku ?? "Sem SKU"}
                                </span>
                            </span>
                        ) : (
                            <span className="text-sm text-slate-500">
                                Buscar SKU ou produto
                            </span>
                        )}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[420px] max-w-[90vw] p-0">
                <div className="border-b p-2">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Buscar por SKU ou nome"
                            className="pl-9"
                        />
                    </div>
                </div>
                <div className="max-h-72 overflow-y-auto p-1">
                    <button
                        type="button"
                        onClick={() => {
                            onChange({ productId: null, ignored: true });
                            setOpen(false);
                            setQuery("");
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
                    >
                        <CircleSlash className="h-4 w-4" />
                        Ignorar este item
                    </button>
                    {filteredProducts.map((product) => (
                        <button
                            key={product.id}
                            type="button"
                            onClick={() => {
                                onChange({
                                    productId: product.id,
                                    ignored: false,
                                });
                                setOpen(false);
                                setQuery("");
                            }}
                            className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-blue-50"
                        >
                            <span className="min-w-0">
                                <span className="block truncate text-sm font-medium text-slate-900">
                                    {product.title}
                                </span>
                                <span className="block truncate font-mono text-xs text-blue-700">
                                    {product.sku ?? "Sem SKU"}
                                </span>
                            </span>
                            {value === product.id ? (
                                <Check className="h-4 w-4 shrink-0 text-blue-600" />
                            ) : null}
                        </button>
                    ))}
                    {!filteredProducts.length ? (
                        <div className="px-3 py-6 text-center text-sm text-slate-500">
                            Nenhum produto encontrado.
                        </div>
                    ) : null}
                </div>
            </PopoverContent>
        </Popover>
    );
}

export function InboundMappingTable({
    inboundOrderId,
    invoiceNumber,
    providerName,
    totalCents,
    items,
    availableProducts,
    categories,
    availableTags,
    confirmAction,
}: InboundMappingTableProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isRefreshingProducts, startProductsRefresh] = useTransition();
    const [createdProducts, setCreatedProducts] = useState<
        InboundProductOption[]
    >([]);
    const [createProductItem, setCreateProductItem] =
        useState<InboundMappingItem | null>(null);
    const [mappings, setMappings] = useState<MappingState>(() =>
        Object.fromEntries(
            items.map((item) => [
                item.id,
                {
                    productId: item.productId,
                    ignored: false,
                },
            ]),
        ),
    );
    const products = useMemo(() => {
        const productsById = new Map<string, InboundProductOption>();

        for (const product of availableProducts) {
            productsById.set(product.id, product);
        }

        for (const product of createdProducts) {
            productsById.set(product.id, product);
        }

        return [...productsById.values()].sort((first, second) =>
            (first.sku ?? first.title).localeCompare(
                second.sku ?? second.title,
                "pt-BR",
            ),
        );
    }, [availableProducts, createdProducts]);
    const createProductInitialValues = createProductItem
        ? buildInitialProductValuesFromItem(createProductItem)
        : initialProductFormValues;
    const mappedCount = items.filter((item) => mappings[item.id]?.productId).length;
    const ignoredCount = items.filter((item) => mappings[item.id]?.ignored).length;
    const unresolvedCount = items.length - mappedCount - ignoredCount;
    const canSubmit = items.length > 0 && unresolvedCount === 0;

    const updateMapping = (
        itemId: string,
        nextValue: { productId: string | null; ignored: boolean },
    ) => {
        setMappings((current) => ({
            ...current,
            [itemId]: nextValue,
        }));
    };

    const handleProductCreated = (
        item: InboundMappingItem,
        state: ProductFormState,
    ) => {
        if (!state.savedProduct) {
            return;
        }

        const createdProduct = state.savedProduct;

        setCreatedProducts((currentProducts) => {
            const withoutDuplicate = currentProducts.filter(
                (product) => product.id !== createdProduct.id,
            );

            return [createdProduct, ...withoutDuplicate];
        });
        updateMapping(item.id, {
            productId: createdProduct.id,
            ignored: false,
        });
        startProductsRefresh(() => {
            router.refresh();
        });
    };

    const handleSubmit = () => {
        if (!canSubmit) {
            toast.error("Resolva todos os itens antes de confirmar.", {
                description:
                    "Mapeie cada item para um produto do sistema ou marque como ignorado.",
            });
            return;
        }

        startTransition(async () => {
            const formData = new FormData();

            formData.set("inboundOrderId", inboundOrderId);
            formData.set(
                "mappings",
                JSON.stringify(
                    items.map((item) => ({
                        inboundOrderItemId: item.id,
                        productId: mappings[item.id]?.productId ?? null,
                        ignored: mappings[item.id]?.ignored ?? false,
                    })),
                ),
            );

            const result = await confirmAction(formData);

            if (!result.ok) {
                toast.error("Nao foi possivel confirmar a conciliacao", {
                    description:
                        result.message ?? "Revise os itens e tente novamente.",
                });
                return;
            }

            toast.success(result.message ?? "Conciliação salva com sucesso.");
        });
    };

    return (
        <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
                <Table className="min-w-[980px]">
                    <TableHeader className="bg-slate-50/90">
                        <TableRow className="hover:bg-slate-50/90">
                            <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Fornecedor (XML)
                            </TableHead>
                            <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Nosso sistema
                            </TableHead>
                            <TableHead className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Qtd.
                            </TableHead>
                            <TableHead className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Valor NF
                            </TableHead>
                            <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Status
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item) => {
                            const mapping = mappings[item.id] ?? {
                                productId: null,
                                ignored: false,
                            };

                            return (
                                <TableRow
                                    key={item.id}
                                    className="bg-white hover:bg-blue-50/30"
                                >
                                    <TableCell className="max-w-md px-4 py-4 align-top">
                                        <div className="space-y-2">
                                            <div>
                                                <p className="font-semibold text-slate-950">
                                                    {item.description}
                                                </p>
                                                <p className="font-mono text-xs text-slate-500">
                                                    Cod. fornecedor:{" "}
                                                    {item.providerCode}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {item.ncm ? (
                                                    <Badge variant="outline">
                                                        NCM {item.ncm}
                                                    </Badge>
                                                ) : null}
                                                {item.gtin ? (
                                                    <Badge variant="outline">
                                                        GTIN {item.gtin}
                                                    </Badge>
                                                ) : null}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="w-[420px] px-4 py-4 align-top">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                                            <div className="min-w-0 flex-1">
                                                <ProductCombobox
                                                    value={mapping.productId}
                                                    ignored={mapping.ignored}
                                                    products={products}
                                                    onChange={(nextValue) =>
                                                        updateMapping(
                                                            item.id,
                                                            nextValue,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    setCreateProductItem(item)
                                                }
                                                className="h-11 shrink-0 border-blue-100 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                                            >
                                                <Plus className="h-4 w-4" />
                                                <span className="sm:hidden lg:inline">
                                                    Novo
                                                </span>
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-4 text-right align-top font-medium text-slate-900">
                                        {formatQuantity(item.quantity)}
                                    </TableCell>
                                    <TableCell className="px-4 py-4 text-right align-top">
                                        <div className="space-y-1">
                                            <p className="font-semibold text-slate-950">
                                                {formatMoney(item.totalValueCents)}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                Unit.{" "}
                                                {formatMoney(
                                                    item.unitValueCents,
                                                )}
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-4 align-top">
                                        {mapping.productId ? (
                                            <Badge className="bg-blue-600 text-white hover:bg-blue-600">
                                                Mapeado
                                            </Badge>
                                        ) : mapping.ignored ? (
                                            <Badge
                                                variant="outline"
                                                className="text-slate-500"
                                            >
                                                Ignorado
                                            </Badge>
                                        ) : (
                                            <Badge
                                                variant="outline"
                                                className="border-amber-200 bg-amber-50 text-amber-700"
                                            >
                                                Pendente
                                            </Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            <div className="sticky bottom-4 z-10 rounded-2xl border border-blue-100 bg-white/95 p-4 shadow-xl shadow-slate-200/80 backdrop-blur">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                        <p className="font-semibold text-slate-950">
                            NF {invoiceNumber ?? "sem numero"} -{" "}
                            {providerName ?? "Fornecedor"}
                        </p>
                        <p className="text-sm text-slate-500">
                            {mappedCount} mapeado(s), {ignoredCount} ignorado(s),{" "}
                            {unresolvedCount} pendente(s) - Total{" "}
                            {formatMoney(totalCents)}
                        </p>
                    </div>
                    <Button
                        type="button"
                        disabled={!canSubmit || isPending}
                        onClick={handleSubmit}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Confirmando...
                            </>
                        ) : (
                            "Confirmar Entrada de Estoque"
                        )}
                    </Button>
                </div>
                {isRefreshingProducts ? (
                    <div className="mt-3 flex items-center gap-2 text-xs font-medium text-blue-700">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Atualizando catálogo em segundo plano...
                    </div>
                ) : null}
            </div>

            <ProductFormDialog
                categories={categories}
                availableTags={availableTags}
                initialValues={createProductInitialValues}
                showTrigger={false}
                open={Boolean(createProductItem)}
                onOpenChange={(open) => {
                    if (!open) {
                        setCreateProductItem(null);
                    }
                }}
                onSuccess={(state) => {
                    if (!createProductItem) {
                        return;
                    }

                    handleProductCreated(createProductItem, state);
                }}
            />
        </div>
    );
}
