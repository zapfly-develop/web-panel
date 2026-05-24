"use client";

import { ReactNode, useActionState, useEffect, useState } from "react";
import { ProductType } from "@prisma/client";
import {
    AlertTriangle,
    Barcode,
    Boxes,
    Loader2,
    PackagePlus,
    Pencil,
    Tags,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    createUserProductAction,
    updateUserProductAction,
} from "@/app/dashboard/products/actions";
import {
    ProductFormState,
    ProductFormValues,
    initialProductFormState,
    initialProductFormValues,
} from "@/app/dashboard/products/form-state";
import { ProductCategoryCombobox } from "./product-category-combobox";
import { ProductImageDropzone } from "./product-image-dropzone";
import { ProductTagOption, ProductTagsInput } from "./product-tags-input";

type ProductDialogBaseProps = {
    categories: string[];
    availableTags: ProductTagOption[];
};

type ProductDialogMode = "create" | "edit";

type ProductFormAction = (
    prevState: ProductFormState | undefined,
    formData: FormData,
) => Promise<ProductFormState>;

type ProductDialogProps = ProductDialogBaseProps & {
    mode: ProductDialogMode;
    trigger?: ReactNode;
    title: string;
    description: string;
    submitLabel: string;
    successMessage: string;
    action: ProductFormAction;
    initialValues: ProductFormValues;
    productId?: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
};

type ProductEditDialogProps = ProductDialogBaseProps & {
    product: {
        id: string;
        title: string;
        description: string | null;
        imageUrl: string | null;
        category: string | null;
        sku: string | null;
        priceCents: number;
        promotionalPriceCents: number | null;
        stockQuantity: number | null;
        reservedStockQuantity: number;
        productType: ProductType;
        subscriberDays: number | null;
        productTags: Array<{
            tag: {
                name: string;
            };
        }>;
    };
    showTrigger?: boolean;
};

function centsToInputValue(valueCents: number | null): string {
    if (typeof valueCents !== "number") {
        return "";
    }

    return (valueCents / 100).toFixed(2);
}

function ProductForm({
    mode,
    categories,
    availableTags,
    onSuccess,
    action,
    initialValues,
    submitLabel,
    successMessage,
    productId,
}: ProductDialogBaseProps & {
    mode: ProductDialogMode;
    onSuccess: () => void;
    action: ProductFormAction;
    initialValues: ProductFormValues;
    submitLabel: string;
    successMessage: string;
    productId?: string;
}) {
    const [productType, setProductType] = useState<ProductType>(
        initialValues.productType,
    );
    const [category, setCategory] = useState(initialValues.category);
    const [tags, setTags] = useState<string[]>(initialValues.tags);
    const [state, submitAction, isPending] = useActionState(
        action,
        initialProductFormState,
    );
    const reservedStockQuantity = Number(initialValues.reservedStockQuantity) || 0;
    const hasReservedStock = mode === "edit" && reservedStockQuantity > 0;

    useEffect(() => {
        if (state.status !== "success") {
            return;
        }

        toast.success(successMessage);
        onSuccess();
    }, [onSuccess, state.status, successMessage]);

    return (
        <form action={submitAction} className="grid gap-6">
            {productId ? <input type="hidden" name="productId" value={productId} /> : null}

            {state.formError && state.status === "error" && (
                <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {state.formError}
                </div>
            )}

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.85fr)]">
            <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Informacoes gerais
                </p>

                <div className="grid gap-2">
                    <Label htmlFor={`${mode}-title`}>Nome do produto</Label>
                    <Input
                        id={`${mode}-title`}
                        name="title"
                        placeholder="Ex.: Coca-Cola 2L"
                        defaultValue={initialValues.title}
                        required
                    />
                    {state.fieldErrors.title && (
                        <p className="text-sm text-destructive">
                            {state.fieldErrors.title}
                        </p>
                    )}
                </div>

                <div className="grid gap-2">
                    <Label htmlFor={`${mode}-description`}>Descricao</Label>
                    <Textarea
                        id={`${mode}-description`}
                        name="description"
                        rows={3}
                        placeholder="Detalhes que ajudam o cliente e a IA a vender melhor."
                        defaultValue={initialValues.description}
                    />
                    {state.fieldErrors.description && (
                        <p className="text-sm text-destructive">
                            {state.fieldErrors.description}
                        </p>
                    )}
                </div>

            </section>

            <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Comercial
                </p>

                <div className="grid gap-2">
                    <Label>Tipo</Label>
                    <Select
                        value={productType}
                        onValueChange={(value) =>
                            setProductType(value as ProductType)
                        }
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ProductType.ONE_TIME}>
                                Produto avulso
                            </SelectItem>
                            <SelectItem value={ProductType.SUBSCRIPTION}>
                                Assinatura
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    <input type="hidden" name="productType" value={productType} />
                    {state.fieldErrors.productType && (
                        <p className="text-sm text-destructive">
                            {state.fieldErrors.productType}
                        </p>
                    )}
                </div>

                <div className="grid gap-2">
                    <Label htmlFor={`${mode}-price`}>Preco base</Label>
                    <Input
                        id={`${mode}-price`}
                        name="price"
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0,00"
                        defaultValue={initialValues.price}
                        required
                    />
                    {state.fieldErrors.price && (
                        <p className="text-sm text-destructive">
                            {state.fieldErrors.price}
                        </p>
                    )}
                </div>

                <div className="grid gap-2">
                    <Label htmlFor={`${mode}-promotionalPrice`}>
                        Preco promocional
                    </Label>
                    <Input
                        id={`${mode}-promotionalPrice`}
                        name="promotionalPrice"
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="Opcional"
                        defaultValue={initialValues.promotionalPrice}
                    />
                    <p className="text-xs text-muted-foreground">
                        Se informado, sera o preco usado no delivery e nas
                        respostas da IA.
                    </p>
                    {state.fieldErrors.promotionalPrice && (
                        <p className="text-sm text-destructive">
                            {state.fieldErrors.promotionalPrice}
                        </p>
                    )}
                </div>

                {productType === ProductType.SUBSCRIPTION && (
                    <div className="grid gap-2">
                        <Label htmlFor={`${mode}-subscriberDays`}>
                            Duracao da assinatura
                        </Label>
                        <Input
                            id={`${mode}-subscriberDays`}
                            name="subscriberDays"
                            type="number"
                            min="1"
                            step="1"
                            placeholder="Quantidade de dias"
                            defaultValue={initialValues.subscriberDays}
                        />
                        {state.fieldErrors.subscriberDays && (
                            <p className="text-sm text-destructive">
                                {state.fieldErrors.subscriberDays}
                            </p>
                        )}
                    </div>
                )}
            </section>

            <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Midia do produto
                </p>

                <ProductImageDropzone
                    name="imageUrl"
                    initialValue={initialValues.imageUrl}
                    error={state.fieldErrors.imageUrl}
                />
            </section>

            <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Categoria e tags
                </p>

                <div className="grid gap-2">
                    <Label>Categoria</Label>
                    <ProductCategoryCombobox
                        categories={categories}
                        value={category}
                        onChange={setCategory}
                    />
                    <input type="hidden" name="category" value={category} />
                    {state.fieldErrors.category && (
                        <p className="text-sm text-destructive">
                            {state.fieldErrors.category}
                        </p>
                    )}
                </div>

                <div className="grid gap-2">
                    <Label className="flex items-center gap-2 text-blue-700">
                        <Tags className="h-4 w-4" />
                        Tags
                    </Label>
                    <ProductTagsInput
                        availableTags={availableTags}
                        value={tags}
                        onChange={setTags}
                    />
                    <input type="hidden" name="tags" value={JSON.stringify(tags)} />
                    {state.fieldErrors.tags && (
                        <p className="text-sm text-destructive">
                            {state.fieldErrors.tags}
                        </p>
                    )}
                </div>
            </section>

            <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Estoque e WMS
                </p>

                <div className="grid gap-2">
                    <Label
                        htmlFor={`${mode}-sku`}
                        className="flex items-center gap-2 text-blue-700"
                    >
                        <Barcode className="h-4 w-4" />
                        SKU
                    </Label>
                    <Input
                        id={`${mode}-sku`}
                        name="sku"
                        placeholder="Ex.: BEB-COCA-2L"
                        defaultValue={initialValues.sku}
                        required
                    />
                    {state.fieldErrors.sku && (
                        <p className="text-sm text-destructive">
                            {state.fieldErrors.sku}
                        </p>
                    )}
                </div>

                <div className="grid gap-2">
                    <Label
                        htmlFor={`${mode}-stockQuantity`}
                        className="flex items-center gap-2 text-blue-700"
                    >
                        <Boxes className="h-4 w-4" />
                        Estoque
                    </Label>
                    <Input
                        id={`${mode}-stockQuantity`}
                        name="stockQuantity"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Deixe vazio para estoque livre"
                        defaultValue={initialValues.stockQuantity}
                    />
                    {state.fieldErrors.stockQuantity && (
                        <p className="text-sm text-destructive">
                            {state.fieldErrors.stockQuantity}
                        </p>
                    )}
                </div>

                {mode === "edit" && (
                    <div
                        className={`grid gap-2 rounded-lg border px-3 py-3 ${
                            hasReservedStock
                                ? "border-blue-200 bg-blue-50/70"
                                : "border-slate-200 bg-slate-50/70"
                        }`}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <Label htmlFor={`${mode}-reservedStockQuantity`}>
                                Estoque reservado
                            </Label>
                            {hasReservedStock ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    Reservado
                                </span>
                            ) : null}
                        </div>
                        <Input
                            id={`${mode}-reservedStockQuantity`}
                            name="reservedStockQuantity"
                            value={initialValues.reservedStockQuantity}
                            readOnly
                            aria-readonly="true"
                            className="bg-white/70 font-medium text-slate-700"
                        />
                        {hasReservedStock ? (
                            <p className="text-xs text-blue-800">
                                Esta quantidade esta bloqueada em carrinhos ou
                                ordens de separacao e nao pode ser editada aqui.
                            </p>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                Nenhuma unidade reservada para separacao no momento.
                            </p>
                        )}
                    </div>
                )}
            </section>
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
                <DialogClose asChild>
                    <Button type="button" variant="outline" disabled={isPending}>
                        Cancelar
                    </Button>
                </DialogClose>
                <Button
                    type="submit"
                    disabled={isPending}
                    className="bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                >
                    {isPending ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Salvando...
                        </>
                    ) : (
                        submitLabel
                    )}
                </Button>
            </DialogFooter>
        </form>
    );
}

function ProductDialog({
    mode,
    trigger,
    title,
    description,
    submitLabel,
    successMessage,
    action,
    initialValues,
    productId,
    open,
    onOpenChange,
    categories,
    availableTags,
}: ProductDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = typeof open === "boolean";
    const isOpen = isControlled ? open : internalOpen;

    const handleOpenChange = (nextOpen: boolean) => {
        if (!isControlled) {
            setInternalOpen(nextOpen);
        }

        onOpenChange?.(nextOpen);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
            <DialogContent className="flex h-[92vh] max-h-[92vh] flex-col overflow-hidden border-slate-200 bg-slate-50 p-0 shadow-2xl sm:max-w-5xl">
                <DialogHeader className="shrink-0 px-6 pt-6">
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                            <PackagePlus className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 space-y-1.5">
                            <DialogTitle className="text-xl text-slate-950">
                                {title}
                            </DialogTitle>
                            <DialogDescription className="max-w-2xl text-slate-600">
                                {description}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {isOpen ? (
                    <ScrollArea
                        className="min-h-0 flex-1"
                        scrollBarClassName="w-3 p-1"
                        scrollThumbClassName="bg-blue-500 hover:bg-blue-600"
                    >
                        <div className="px-6 pb-6 pt-4">
                            <ProductForm
                                mode={mode}
                                categories={categories}
                                availableTags={availableTags}
                                onSuccess={() => handleOpenChange(false)}
                                action={action}
                                initialValues={initialValues}
                                submitLabel={submitLabel}
                                successMessage={successMessage}
                                productId={productId}
                            />
                        </div>
                    </ScrollArea>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

export function ProductFormDialog({
    categories,
    availableTags,
    open,
    onOpenChange,
}: ProductDialogBaseProps & {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}) {
    return (
        <ProductDialog
            mode="create"
            categories={categories}
            availableTags={availableTags}
            trigger={
                <Button className="gap-2">
                    <PackagePlus className="h-4 w-4" />
                    Novo produto
                </Button>
            }
            title="Novo produto"
            description="Cadastre itens da loja com categoria, tags e preco promocional para o delivery no WhatsApp."
            submitLabel="Salvar produto"
            successMessage="Produto cadastrado com sucesso."
            action={createUserProductAction}
            initialValues={initialProductFormValues}
            open={open}
            onOpenChange={onOpenChange}
        />
    );
}

export function ProductEditDialog({
    categories,
    availableTags,
    product,
    showTrigger = true,
    open,
    onOpenChange,
}: ProductEditDialogProps & {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}) {
    const initialValues: ProductFormValues = {
        title: product.title,
        description: product.description ?? "",
        imageUrl: product.imageUrl ?? "",
        category: product.category ?? "",
        tags: product.productTags.map((entry) => entry.tag.name),
        sku: product.sku ?? "",
        price: centsToInputValue(product.priceCents),
        promotionalPrice: centsToInputValue(product.promotionalPriceCents),
        stockQuantity:
            typeof product.stockQuantity === "number"
                ? String(product.stockQuantity)
                : "",
        reservedStockQuantity: String(product.reservedStockQuantity),
        productType: product.productType,
        subscriberDays:
            typeof product.subscriberDays === "number"
                ? String(product.subscriberDays)
                : "",
    };

    return (
        <ProductDialog
            mode="edit"
            categories={categories}
            availableTags={availableTags}
            trigger={
                showTrigger ? (
                    <Button size="icon" variant="outline" aria-label="Editar produto">
                        <Pencil className="h-4 w-4" />
                    </Button>
                ) : undefined
            }
            title={`Editar ${product.title}`}
            description="Atualize dados do produto, tags e preco promocional sem sair da listagem."
            submitLabel="Salvar alteracoes"
            successMessage="Produto atualizado com sucesso."
            action={updateUserProductAction}
            initialValues={initialValues}
            productId={product.id}
            open={open}
            onOpenChange={onOpenChange}
        />
    );
}
