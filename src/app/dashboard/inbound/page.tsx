import { ArrowRight, FileCode2, ShieldCheck, Warehouse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { InboundUploadDropzone } from "@/components/dashboard/inbound/inbound-upload-dropzone";
import {
    buildAuthenticatedNestHeaders,
    fetchNestApiJson,
} from "@/lib/nest-api";
import { prisma } from "@/lib/prisma";
import { requireStoreUser } from "@/lib/server-session";

export const runtime = "nodejs";

const INBOUND_XML_UPLOAD_PATH = "/wms/inbound/import-xml";

type InboundUploadResult = {
    ok: boolean;
    message?: string;
    redirectTo?: string;
};

export default async function DashboardInboundPage() {
    const user = await requireStoreUser();
    const warehouses = await prisma.warehouse.findMany({
        where: {
            ownerUserId: user.id,
        },
        select: {
            id: true,
            name: true,
        },
        orderBy: {
            name: "asc",
        },
    });

    async function uploadInboundXmlAction(
        formData: FormData,
    ): Promise<InboundUploadResult> {
        "use server";

        const currentUser = await requireStoreUser();
        const file = formData.get("file");
        const warehouseId = String(formData.get("warehouseId") ?? "").trim();

        if (!(file instanceof File)) {
            return {
                ok: false,
                message: "Selecione o XML da nota fiscal antes de enviar.",
            };
        }

        if (!file.name.toLowerCase().endsWith(".xml")) {
            return {
                ok: false,
                message: "Envie um arquivo XML de NF-e valido.",
            };
        }

        const payload = new FormData();
        payload.set("file", file, file.name);

        if (warehouseId) {
            payload.set("warehouseId", warehouseId);
        }

        try {
            const response = await fetchNestApiJson<{
                inboundOrderId?: string;
            }>(INBOUND_XML_UPLOAD_PATH, {
                method: "POST",
                headers: await buildAuthenticatedNestHeaders(currentUser.id),
                body: payload,
            });
            const inboundOrderId = response.inboundOrderId;

            return {
                ok: true,
                redirectTo: inboundOrderId
                    ? `/dashboard/inbound/${inboundOrderId}`
                    : "/dashboard/inbound/conciliation",
            };
        } catch (error) {
            return {
                ok: false,
                message:
                    error instanceof Error
                        ? error.message
                        : "Nao foi possivel processar o XML agora.",
            };
        }
    }

    return (
        <div className="mx-auto max-w-5xl space-y-8">
            <div className="space-y-4 text-center">
                <Badge
                    variant="outline"
                    className="mx-auto w-fit border-blue-100 bg-blue-50 text-blue-700"
                >
                    Inbound WMS
                </Badge>
                <div className="space-y-3">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                        Entrada de mercadorias por XML
                    </h1>
                    <p className="mx-auto max-w-2xl text-slate-500">
                        Importe a NF-e do fornecedor para iniciar a conferencia,
                        conciliar SKUs e direcionar o estoque para o galpao correto.
                    </p>
                </div>
            </div>

            <Card className="overflow-hidden border-slate-100 bg-white shadow-sm">
                <CardHeader className="border-b border-slate-100 bg-slate-50/70">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-xl text-slate-950">
                                <FileCode2 className="h-5 w-5 text-blue-600" />
                                Upload do XML
                            </CardTitle>
                            <CardDescription>
                                Aceitamos arquivos .xml de NF-e para processamento
                                automatico no WMS.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">
                            <ShieldCheck className="h-4 w-4" />
                            Envio autenticado
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 md:p-8">
                    <InboundUploadDropzone
                        warehouses={warehouses}
                        uploadAction={uploadInboundXmlAction}
                    />
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                    <Warehouse className="mb-3 h-5 w-5 text-blue-600" />
                    <p className="font-semibold text-slate-900">
                        Galpao de destino
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                        Defina onde os produtos serao recebidos antes da
                        conciliacao.
                    </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                    <FileCode2 className="mb-3 h-5 w-5 text-blue-600" />
                    <p className="font-semibold text-slate-900">
                        Leitura automatica
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                        O backend extrai itens, quantidades, fornecedor e dados
                        fiscais.
                    </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                    <ArrowRight className="mb-3 h-5 w-5 text-blue-600" />
                    <p className="font-semibold text-slate-900">
                        Proximo passo
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                        Ao concluir, voce segue para a tela de conciliacao dos
                        produtos.
                    </p>
                </div>
            </div>
        </div>
    );
}
