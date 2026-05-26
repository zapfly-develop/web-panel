"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    CheckCircle2,
    FileCode2,
    Loader2,
    UploadCloud,
    X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type WarehouseOption = {
    id: string;
    name: string;
};

type InboundUploadResult = {
    ok: boolean;
    message?: string;
    redirectTo?: string;
};

type InboundUploadDropzoneProps = {
    warehouses: WarehouseOption[];
    uploadAction: (formData: FormData) => Promise<InboundUploadResult>;
};

const NO_WAREHOUSE_VALUE = "__auto__";

function isXmlFile(file: File) {
    return file.name.toLowerCase().endsWith(".xml");
}

function formatFileSize(size: number) {
    if (size < 1024) {
        return `${size} B`;
    }

    if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function InboundUploadDropzone({
    warehouses,
    uploadAction,
}: InboundUploadDropzoneProps) {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [warehouseId, setWarehouseId] = useState(NO_WAREHOUSE_VALUE);
    const [isDragging, setIsDragging] = useState(false);
    const [isPending, startTransition] = useTransition();

    const selectFile = (nextFile: File | null) => {
        if (!nextFile) {
            return;
        }

        if (!isXmlFile(nextFile)) {
            toast.error("Arquivo invalido", {
                description: "Envie um arquivo .xml de NF-e para continuar.",
            });
            return;
        }

        setFile(nextFile);
        toast.success("XML pronto para envio.");
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        selectFile(event.dataTransfer.files.item(0));
    };

    const handleSubmit = () => {
        if (!file) {
            toast.error("Selecione um XML antes de enviar.");
            return;
        }

        startTransition(async () => {
            const formData = new FormData();

            formData.set("file", file);

            if (warehouseId !== NO_WAREHOUSE_VALUE) {
                formData.set("warehouseId", warehouseId);
            }

            const result = await uploadAction(formData);

            if (!result.ok) {
                toast.error("Nao foi possivel importar o XML", {
                    description:
                        result.message ??
                        "Confira se a NF-e esta valida e tente novamente.",
                });
                return;
            }

            toast.success("XML importado com sucesso.", {
                description: "Abrindo a conciliacao dos itens da nota fiscal.",
            });
            router.push(result.redirectTo ?? "/dashboard/inbound/conciliation");
        });
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-2">
                <Label htmlFor="warehouseId">Galpao de destino</Label>
                <Select
                    value={warehouseId}
                    onValueChange={setWarehouseId}
                    disabled={isPending}
                >
                    <SelectTrigger id="warehouseId" className="bg-white">
                        <SelectValue placeholder="Selecione o galpao" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={NO_WAREHOUSE_VALUE}>
                            Definir automaticamente
                        </SelectItem>
                        {warehouses.map((warehouse) => (
                            <SelectItem key={warehouse.id} value={warehouse.id}>
                                {warehouse.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {!warehouses.length ? (
                    <p className="text-sm text-slate-500">
                        Nenhum galpao cadastrado. O backend podera definir o
                        destino padrao, se existir.
                    </p>
                ) : null}
            </div>

            <div
                role="button"
                tabIndex={0}
                aria-label="Selecionar XML da nota fiscal"
                onClick={() => inputRef.current?.click()}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        inputRef.current?.click();
                    }
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                    "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors md:p-12",
                    isDragging
                        ? "border-blue-400 bg-blue-50"
                        : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50",
                    isPending && "pointer-events-none opacity-70",
                )}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept=".xml,text/xml,application/xml"
                    className="sr-only"
                    disabled={isPending}
                    onChange={(event) => {
                        selectFile(event.target.files?.item(0) ?? null);
                        event.target.value = "";
                    }}
                />

                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    {file ? (
                        <CheckCircle2 className="h-8 w-8" />
                    ) : (
                        <UploadCloud className="h-8 w-8" />
                    )}
                </div>

                <div className="space-y-2">
                    <p className="text-lg font-semibold text-slate-950">
                        {file
                            ? "XML selecionado"
                            : "Arraste o XML da NF-e para importar"}
                    </p>
                    <p className="mx-auto max-w-lg text-sm text-slate-500">
                        {file
                            ? "Revise o arquivo e envie para iniciar a conciliacao."
                            : "Solte o arquivo aqui ou clique para procurar no computador. Apenas arquivos .xml sao aceitos."}
                    </p>
                </div>

                {file ? (
                    <div className="mt-6 flex max-w-full items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-left">
                        <FileCode2 className="h-5 w-5 shrink-0 text-blue-600" />
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-blue-900">
                                {file.name}
                            </p>
                            <p className="text-xs text-blue-700">
                                {formatFileSize(file.size)}
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-blue-700 hover:bg-blue-100"
                            disabled={isPending}
                            onClick={(event) => {
                                event.stopPropagation();
                                setFile(null);
                            }}
                            aria-label="Remover arquivo selecionado"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ) : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                    O processamento fiscal acontece no backend. Erros de XML mal
                    formatado aparecem aqui como alerta para o lojista.
                </p>
                <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!file || isPending}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                >
                    {isPending ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Enviando...
                        </>
                    ) : (
                        "Enviar XML"
                    )}
                </Button>
            </div>
        </div>
    );
}
