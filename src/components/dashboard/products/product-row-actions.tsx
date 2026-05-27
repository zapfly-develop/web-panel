"use client";

import { useState, useTransition } from "react";
import { Prisma } from "@prisma/client";
import { MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    deleteUserProductAction,
    toggleUserProductActiveAction,
} from "@/app/dashboard/products/actions";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProductEditDialog } from "./product-form-dialog";
import { ProductTagOption } from "./product-tags-input";
import { cn } from "@/lib/utils";

type ProductRowActionsProps = {
    product: Prisma.ProductGetPayload<{
        include: {
            productTags: {
                include: {
                    tag: true;
                };
            };
        };
    }>;
    categories: string[];
    availableTags: ProductTagOption[];
};

/**
 * Botão de ação inline com tooltip — padrão da referência visual.
 */
function ActionIconButton({
    label,
    icon: Icon,
    onClick,
    disabled,
    destructive,
}: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    disabled?: boolean;
    destructive?: boolean;
}) {
    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={disabled}
                        onClick={onClick}
                        className={cn(
                            "h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100",
                            destructive
                                ? "hover:bg-red-50 hover:text-red-600"
                                : "hover:bg-blue-50 hover:text-blue-600",
                        )}
                    >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="sr-only">{label}</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                    {label}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

export function ProductRowActions({
    product,
    categories,
    availableTags,
}: ProductRowActionsProps) {
    const router = useRouter();
    const [editOpen, setEditOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const handleToggleStatus = () => {
        startTransition(async () => {
            try {
                await toggleUserProductActiveAction(
                    product.id,
                    product.isActive,
                );
                toast.success(
                    product.isActive
                        ? "Produto desativado."
                        : "Produto ativado.",
                );
                router.refresh();
            } catch (error) {
                toast.error(
                    error instanceof Error
                        ? error.message
                        : "Não foi possível alterar o status.",
                );
            }
        });
    };

    const handleDelete = () => {
        if (!window.confirm(`Excluir o produto "${product.title}"?`)) {
            return;
        }
        startTransition(async () => {
            try {
                const formData = new FormData();
                formData.set("id", product.id);
                await deleteUserProductAction(formData);
                toast.success("Produto excluído.");
                router.refresh();
            } catch (error) {
                toast.error(
                    error instanceof Error
                        ? error.message
                        : "Não foi possível excluir o produto.",
                );
            }
        });
    };

    return (
        <>
            <ProductEditDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                product={product}
                categories={categories}
                availableTags={availableTags}
                showTrigger={false}
            />

            <div className="flex items-center justify-end gap-0.5">
                {/* Editar — sempre visível ao hover */}
                <ActionIconButton
                    label="Editar produto"
                    icon={Pencil}
                    onClick={() => setEditOpen(true)}
                    disabled={isPending}
                />

                {/* Ativar / Desativar */}
                <ActionIconButton
                    label={product.isActive ? "Desativar" : "Ativar"}
                    icon={Power}
                    onClick={handleToggleStatus}
                    disabled={isPending}
                />

                {/* Mais opções (excluir) */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled={isPending}
                            className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                            aria-label="Mais opções"
                        >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                            variant="destructive"
                            onSelect={(e) => {
                                e.preventDefault();
                                handleDelete();
                            }}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Excluir produto
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </>
    );
}
