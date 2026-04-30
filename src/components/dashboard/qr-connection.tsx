"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useTransition,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BusinessProfile, DeliveryType, PaymentMethod } from "@prisma/client";
import { toast } from "sonner";
import {
    CheckCircle2,
    Loader2,
    MapPinned,
    PlugZap,
    QrCode,
    RefreshCcw,
    Settings2,
    ShieldCheck,
    Smartphone,
    WalletCards,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    BUSINESS_PROFILE_OPTIONS,
    getDeliveryTypeLabel,
    getPaymentMethodLabel,
} from "@/app/dashboard/whatsapp/checkout-options";
import DeliveryTypePicker from "./whatsapp/delivery-type-picker";
import PaymentMethodPicker from "./whatsapp/payment-method-picker";
import { ScrollArea } from "../ui/scroll-area";

type QRConnectionProps = {
    initialStatus: string | null;
    setupDefaults: {
        assistantName: string;
        businessProfile: BusinessProfile;
        storeAddress: string;
        deliveryFee: string;
        acceptedPaymentMethods: PaymentMethod[];
        availableDeliveryTypes: DeliveryType[];
    };
    assistantProfileAction: (formData: FormData) => Promise<void>;
    storeCheckoutAction: (formData: FormData) => Promise<void>;
};

type QrCodePayload = {
    instanceId: string;
    instanceName: string;
    status: string;
    qrCodeBase64: string | null;
    pairingCode: string | null;
};

const POLLING_INTERVAL_MS = 5000;

export default function QRConnection({
    initialStatus,
    setupDefaults,
}: Pick<QRConnectionProps, "initialStatus" | "setupDefaults">) {
    const router = useRouter();
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState(initialStatus?.toLowerCase() ?? null);
    const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [instanceName, setInstanceName] = useState<string | null>(null);

    const assistantName = setupDefaults.assistantName;
    const storeAddress = setupDefaults.storeAddress;
    const acceptedPaymentMethods = setupDefaults.acceptedPaymentMethods;
    const availableDeliveryTypes = setupDefaults.availableDeliveryTypes;

    const clearPolling = useCallback(() => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    }, []);

    const isConnected = status === "open" || status === "connected";
    const isConnecting = status === "connecting";

    const isSetupComplete = Boolean(
        assistantName.trim() &&
            storeAddress.trim() &&
            acceptedPaymentMethods.length &&
            availableDeliveryTypes.length,
    );

    const deliverySummary = useMemo(
        () =>
            availableDeliveryTypes.length
                ? availableDeliveryTypes.map(getDeliveryTypeLabel).join(" • ")
                : "Entrega/Retirada pendente",
        [availableDeliveryTypes],
    );

    const pollQrCode = useCallback(async () => {
        try {
            const response = await fetch("/api/dashboard/whatsapp/qr-code", {
                cache: "no-store",
            });
            const payload = (await response.json().catch(() => null)) as
                | QrCodePayload
                | { error?: string }
                | null;

            if (!response.ok) {
                throw new Error(
                    payload && "error" in payload && payload.error
                        ? payload.error
                        : "Nao foi possivel consultar o QR Code.",
                );
            }

            if (!payload || !("status" in payload)) {
                throw new Error("Resposta invalida ao consultar o QR Code.");
            }

            setStatus(payload.status.toLowerCase());
            setQrCodeBase64(payload.qrCodeBase64);
            setPairingCode(payload.pairingCode);
            setInstanceName(payload.instanceName);

            if (payload.status.toLowerCase() === "open") {
                clearPolling();
                toast.success("WhatsApp conectado com sucesso.");
                router.push("/dashboard");
                router.refresh();
            }
        } catch (error) {
            clearPolling();
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Falha ao consultar o status do WhatsApp.",
            );
        }
    }, [clearPolling, router]);

    const startPolling = useCallback(() => {
        clearPolling();
        pollingRef.current = setInterval(() => {
            void pollQrCode();
        }, POLLING_INTERVAL_MS);
    }, [clearPolling, pollQrCode]);

    async function handleConnect() {
        try {
            setIsLoading(true);

            const connectResponse = await fetch(
                "/api/dashboard/whatsapp/connect",
                {
                    method: "POST",
                },
            );
            const connectPayload = await connectResponse
                .json()
                .catch(() => null);

            if (!connectResponse.ok) {
                throw new Error(
                    connectPayload?.error ||
                        "Nao foi possivel iniciar a conexao do WhatsApp.",
                );
            }

            await pollQrCode();
            startPolling();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Falha ao iniciar o pareamento do WhatsApp.",
            );
        } finally {
            setIsLoading(false);
        }
    }

    function handleOpenDialog() {
        if (!isSetupComplete) {
            toast.error("Finalize as configurações da loja antes de conectar.");
            return;
        }

        setDialogOpen(true);

        if (isConnecting) {
            void pollQrCode();
            startPolling();
        }
    }

    useEffect(() => {
        if (status === "connecting") {
            void pollQrCode();
            startPolling();
        }

        return () => clearPolling();
    }, [clearPolling, pollQrCode, startPolling, status]);

    return (
        <>
            <Card className="overflow-hidden border-none shadow-sm">
                <CardHeader className="border-b border-slate-200 bg-slate-50/70 pb-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <QrCode className="h-5 w-5 text-primary" />
                                Central de conexao da loja
                            </CardTitle>
                            <p className="max-w-2xl text-sm text-slate-500">
                                Gerencie a conexão do WhatsApp e o status da sua instância.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Badge
                                variant={
                                    isConnected
                                        ? "default"
                                        : isSetupComplete
                                          ? "outline"
                                          : "secondary"
                                }
                            >
                                {isConnected
                                    ? "WhatsApp conectado"
                                    : isSetupComplete
                                      ? "Pronto para gerar QR"
                                      : "Finalize o setup"}
                            </Badge>
                            {instanceName ? (
                                <Badge variant="outline">{instanceName}</Badge>
                            ) : null}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-wrap  lg:items-center">
                    <div className="grid gap-3 sm:grid-cols-2 w-full mb-4">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                Atendimento
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-900">
                                {assistantName || "Aguardando setup"}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                Status da Operação
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-900">
                                {deliverySummary}
                            </p>
                        </div>
                    </div>

                    <Button
                        type="button"
                        onClick={handleOpenDialog}
                        className="w-full lg:min-w-[220px]"
                        variant={isConnected ? "outline" : "default"}
                    >
                        {isConnected
                            ? "Ver QR Code / Conexão"
                            : isSetupComplete
                              ? "Gerar QR Code de Conexão"
                              : "Completar setup obrigatório"}
                    </Button>
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent
                    className="h-[min(88vh,860px)] w-[min(1180px,calc(100vw-2rem))] max-w-[min(1180px,calc(100vw-2rem))] overflow-hidden p-0 sm:max-w-[min(1180px,calc(100vw-2rem))]"
                    showCloseButton={!isLoading}
                >
                    <div className="grid h-full lg:grid-cols-[320px_minmax(0,1fr)]">
                        <div className="overflow-y-auto border-b border-white/10 bg-[linear-gradient(160deg,rgba(15,23,42,1),rgba(30,41,59,0.95),rgba(15,23,42,1))] px-6 py-6 text-white lg:border-b-0 lg:border-r">
                            <DialogHeader className="space-y-3 text-left">
                                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200">
                                    <PlugZap className="h-3.5 w-3.5" />
                                    Conexão WhatsApp
                                </div>
                                <DialogTitle className="text-2xl tracking-tight text-white">
                                    Escaneie o QR Code
                                </DialogTitle>
                                <DialogDescription className="text-sm leading-6 text-slate-300">
                                    Abra o WhatsApp no seu celular, vá em Aparelhos Conectados e escaneie o código abaixo.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-full bg-emerald-500/20 p-2 text-emerald-400">
                                        <ShieldCheck className="h-5 w-5" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                            Status do Setup
                                        </p>
                                        <p className="text-sm font-medium text-white">
                                            Loja Configurada
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2 border-t border-white/10 pt-4">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                        Informações da Instância
                                    </p>
                                    <div className="grid gap-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-400">Nome:</span>
                                            <span className="font-mono text-white">{instanceName || "-"}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-400">Status:</span>
                                            <Badge variant="outline" className="h-5 text-[10px] uppercase border-white/20 text-white">
                                                {status || "desconectado"}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex min-w-0 flex-col bg-white">
                            <div className="min-w-0 flex-1 overflow-y-auto">
                                <div className="flex h-full flex-col items-center justify-center space-y-6 p-6">
                                <section className="w-full max-w-md rounded-[28px] border border-dashed border-slate-200 bg-slate-50 p-8">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold text-slate-900">
                                                Pareamento do WhatsApp
                                            </p>
                                            <p className="text-sm text-slate-500">
                                                Assim que as preferencias forem
                                                salvas, o QR Code aparece aqui
                                                para leitura no celular da loja.
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Badge
                                                variant={
                                                    isConnected
                                                        ? "default"
                                                        : "outline"
                                                }
                                            >
                                                {isConnected
                                                    ? "Conectado"
                                                    : isConnecting
                                                      ? "Aguardando leitura"
                                                      : "Ainda nao pareado"}
                                            </Badge>
                                            {instanceName ? (
                                                <Badge variant="outline">
                                                    {instanceName}
                                                </Badge>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                                        {qrCodeBase64 ? (
                                            <div className="flex flex-col items-center gap-4 text-center">
                                                <Image
                                                    src={qrCodeBase64}
                                                    alt="QR Code do WhatsApp"
                                                    width={280}
                                                    height={280}
                                                    className="rounded-xl border border-slate-200 bg-white p-3"
                                                    unoptimized
                                                />
                                                {pairingCode ? (
                                                    <div className="rounded-lg bg-slate-100 px-3 py-1.5">
                                                        <p className="text-xs text-slate-500">
                                                            Código de pareamento:{" "}
                                                            <strong className="text-slate-900 font-mono">
                                                                {pairingCode}
                                                            </strong>
                                                        </p>
                                                    </div>
                                                ) : null}
                                            </div>
                                        ) : (
                                            <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 text-center">
                                                <div className="rounded-full bg-slate-100 p-5 text-slate-400">
                                                    {isLoading || isConnecting ? (
                                                        <Loader2 className="h-8 w-8 animate-spin" />
                                                    ) : (
                                                        <Smartphone className="h-8 w-8" />
                                                    )}
                                                </div>
                                                <div className="space-y-1.5">
                                                    <p className="text-lg font-semibold text-slate-900">
                                                        {isLoading || isConnecting
                                                            ? "Solicitando Conexão..."
                                                            : "Iniciar Nova Conexão"}
                                                    </p>
                                                    <p className="max-w-[280px] text-sm text-slate-500">
                                                        {isLoading || isConnecting
                                                            ? "O sistema está gerando um novo QR Code. Aguarde alguns instantes."
                                                            : "Clique no botão abaixo para gerar um código e conectar seu WhatsApp."}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {!isConnected && !qrCodeBase64 && !isLoading && (
                                        <Button
                                            type="button"
                                            className="mt-6 w-full"
                                            onClick={handleConnect}
                                        >
                                            Gerar QR Code Agora
                                        </Button>
                                    )}

                                    {!isConnected && qrCodeBase64 && !isLoading && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="mt-6 w-full"
                                            onClick={handleConnect}
                                        >
                                            <RefreshCcw className="mr-2 h-4 w-4" />
                                            Recarregar QR Code
                                        </Button>
                                    )}
                                </section>
                                </div>
                            </div>

                            <DialogFooter className="shrink-0 border-t border-slate-200 bg-slate-50/50 px-6 py-4">
                                <div className="flex w-full items-center justify-between">
                                    <p className="text-xs text-slate-500">
                                        {isConnected
                                            ? "Sua loja está online e pronta para receber pedidos."
                                            : "Aguardando leitura do QR Code pelo seu celular."}
                                    </p>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setDialogOpen(false)}
                                    >
                                        Fechar Janela
                                    </Button>
                                </div>
                            </DialogFooter>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
