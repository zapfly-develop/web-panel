"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import {
    ArrowDownLeft,
    ArrowLeft,
    ArrowUpRight,
    Banknote,
    Bike,
    Clock3,
    Home,
    Loader2,
    RefreshCw,
    ShieldCheck,
    WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type {
    RiderWallet,
    WalletStatement,
    WalletTransaction,
    WalletTransactionCategory,
    WalletTransactionStatus,
} from "../services/wallet-types";

type WalletOverviewProps = {
    initialWallet: RiderWallet | null;
    initialStatement: WalletStatement | null;
    loadError: string | null;
};

const categoryLabels: Record<WalletTransactionCategory, string> = {
    DELIVERY_PAYOUT: "Repasse de entrega",
    DELIVERY_ESCROW: "Reserva de entrega",
    WITHDRAWAL: "Saque",
    REFUND: "Estorno",
};

const statusLabels: Record<WalletTransactionStatus, string> = {
    COMPLETED: "Concluido",
    PENDING: "Pendente",
    FAILED: "Falhou",
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
        headers: {
            Accept: "application/json",
            ...(init?.headers ?? {}),
        },
        ...init,
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(
            payload?.error ||
                payload?.message ||
                "Nao foi possivel concluir a operacao.",
        );
    }

    return payload as T;
}

function formatMoney(valueCents: number, currency = "BRL") {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency,
    }).format(valueCents / 100);
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(new Date(value));
}

function parseCurrencyInput(value: string) {
    const normalized = value
        .replace(/[^\d,.-]/g, "")
        .replace(/\./g, "")
        .replace(",", ".");
    const amount = Number(normalized);

    if (!Number.isFinite(amount)) {
        return 0;
    }

    return Math.round(amount * 100);
}

function buildIdempotencyKey() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return `wallet-withdrawal:${crypto.randomUUID()}`;
    }

    return `wallet-withdrawal:${Date.now()}:${Math.random()
        .toString(36)
        .slice(2)}`;
}

export function WalletOverview({
    initialWallet,
    initialStatement,
    loadError,
}: WalletOverviewProps) {
    const [wallet, setWallet] = useState(initialWallet);
    const [transactions, setTransactions] = useState(
        initialStatement?.items ?? [],
    );
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isRequestingWithdrawal, setIsRequestingWithdrawal] = useState(false);
    const [amount, setAmount] = useState("");
    const [pixKeyType, setPixKeyType] = useState("PIX_KEY");
    const [pixKey, setPixKey] = useState("");

    const availableBalance = wallet?.balanceCents ?? 0;
    const frozenBalance = wallet?.frozenBalanceCents ?? 0;
    const currency = wallet?.currency ?? "BRL";
    const parsedAmountCents = useMemo(
        () => parseCurrencyInput(amount),
        [amount],
    );
    const canRequestWithdrawal =
        parsedAmountCents > 0 &&
        parsedAmountCents <= availableBalance &&
        pixKey.trim().length > 0;

    async function refreshWallet() {
        try {
            setIsRefreshing(true);
            const [nextWallet, nextStatement] = await Promise.all([
                fetchJson<RiderWallet>("/api/wallet/me"),
                fetchJson<WalletStatement>("/api/wallet/statement?take=50"),
            ]);

            setWallet(nextWallet);
            setTransactions(nextStatement.items);
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Falha ao atualizar carteira.",
            );
        } finally {
            setIsRefreshing(false);
        }
    }

    async function handleWithdrawalSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!canRequestWithdrawal) {
            toast.error("Revise o valor e a chave Pix.");
            return;
        }

        try {
            setIsRequestingWithdrawal(true);
            await fetchJson<WalletTransaction>("/api/wallet/withdrawals", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    amountCents: parsedAmountCents,
                    currency,
                    idempotencyKey: buildIdempotencyKey(),
                    pixKey: pixKey.trim(),
                    pixKeyType,
                    description: "Saque solicitado pelo app do entregador",
                    metadata: {
                        source: "rider_pwa",
                    },
                }),
            });

            setAmount("");
            setPixKey("");
            toast.success("Saque solicitado.");
            await refreshWallet();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Falha ao solicitar saque.",
            );
        } finally {
            setIsRequestingWithdrawal(false);
        }
    }

    return (
        <main className="min-h-dvh bg-slate-50 pb-24">
            <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-md items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-3">
                        <Button
                            asChild
                            size="icon"
                            variant="ghost"
                            className="rounded-full"
                        >
                            <Link href="/delivery/rider">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                        <div>
                            <p className="text-xs font-medium text-sky-600">
                                Floovi Rider
                            </p>
                            <h1 className="text-lg font-bold text-slate-950">
                                Carteira
                            </h1>
                        </div>
                    </div>
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => void refreshWallet()}
                        disabled={isRefreshing}
                        className="rounded-full"
                    >
                        <RefreshCw
                            className={cn(
                                "h-5 w-5 text-slate-600",
                                isRefreshing && "animate-spin",
                            )}
                        />
                    </Button>
                </div>
            </header>

            <div className="mx-auto max-w-md space-y-4 px-4 py-6">
                {loadError ? (
                    <Alert variant="destructive" className="rounded-2xl">
                        <WalletCards className="h-4 w-4" />
                        <AlertTitle>Carteira indisponivel</AlertTitle>
                        <AlertDescription>{loadError}</AlertDescription>
                    </Alert>
                ) : null}

                <section className="overflow-hidden rounded-2xl bg-slate-950 text-white shadow-lg">
                    <div className="bg-gradient-to-br from-slate-900 to-sky-900 p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-sky-100">
                                    Saldo disponivel
                                </p>
                                <p className="mt-2 text-3xl font-bold">
                                    {formatMoney(availableBalance, currency)}
                                </p>
                            </div>
                            <div className="rounded-full bg-white/15 p-3">
                                <WalletCards className="h-7 w-7" />
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-px bg-white/10">
                        <div className="bg-slate-950/60 p-4">
                            <p className="text-xs text-slate-300">
                                Em processamento
                            </p>
                            <p className="mt-1 font-bold">
                                {formatMoney(frozenBalance, currency)}
                            </p>
                        </div>
                        <div className="bg-slate-950/60 p-4">
                            <p className="text-xs text-slate-300">Moeda</p>
                            <p className="mt-1 font-bold">{currency}</p>
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl bg-white p-5 shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
                            <Banknote className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-950">
                                Solicitar saque
                            </h2>
                            <p className="text-xs text-slate-500">
                                Valor maximo: {formatMoney(availableBalance, currency)}
                            </p>
                        </div>
                    </div>

                    <form
                        className="mt-5 space-y-4"
                        onSubmit={handleWithdrawalSubmit}
                    >
                        <div className="space-y-2">
                            <Label htmlFor="withdrawal-amount">Valor</Label>
                            <Input
                                id="withdrawal-amount"
                                inputMode="decimal"
                                placeholder="0,00"
                                value={amount}
                                onChange={(event) => setAmount(event.target.value)}
                                className="h-11 text-base"
                            />
                        </div>

                        <div className="grid grid-cols-[120px_1fr] gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="pix-key-type">Tipo</Label>
                                <select
                                    id="pix-key-type"
                                    value={pixKeyType}
                                    onChange={(event) =>
                                        setPixKeyType(event.target.value)
                                    }
                                    className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-xs outline-none focus:border-sky-400 focus:ring-3 focus:ring-sky-100"
                                >
                                    <option value="PIX_KEY">Pix</option>
                                    <option value="CPF">CPF</option>
                                    <option value="EMAIL">E-mail</option>
                                    <option value="PHONE">Telefone</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="pix-key">Chave</Label>
                                <Input
                                    id="pix-key"
                                    value={pixKey}
                                    onChange={(event) =>
                                        setPixKey(event.target.value)
                                    }
                                    placeholder="Sua chave Pix"
                                    className="h-11"
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={
                                !canRequestWithdrawal ||
                                isRequestingWithdrawal ||
                                !wallet
                            }
                            className="h-11 w-full bg-emerald-600 hover:bg-emerald-700"
                        >
                            {isRequestingWithdrawal ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <ShieldCheck className="h-4 w-4" />
                            )}
                            Solicitar saque
                        </Button>
                    </form>
                </section>

                <section className="rounded-2xl bg-white p-5 shadow-md">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="font-bold text-slate-950">
                                Extrato
                            </h2>
                            <p className="text-xs text-slate-500">
                                {transactions.length} lancamento
                                {transactions.length === 1 ? "" : "s"}
                            </p>
                        </div>
                        <Clock3 className="h-5 w-5 text-slate-400" />
                    </div>

                    <div className="mt-4 space-y-1">
                        {transactions.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
                                <p className="text-sm font-medium text-slate-700">
                                    Nenhum lancamento ainda
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    Seus repasses e saques aparecem aqui.
                                </p>
                            </div>
                        ) : (
                            transactions.map((transaction, index) => (
                                <TransactionRow
                                    key={transaction.id}
                                    transaction={transaction}
                                    showSeparator={index < transactions.length - 1}
                                />
                            ))
                        )}
                    </div>
                </section>
            </div>
            <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200 bg-white shadow-lg">
                <div className="mx-auto flex max-w-md items-center justify-around py-2">
                    <Link
                        href="/delivery/rider"
                        className="flex flex-col items-center gap-1 rounded-xl px-6 py-2 text-slate-400 transition-colors hover:text-slate-600"
                    >
                        <Home className="h-6 w-6" />
                        <span className="text-xs font-medium">Início</span>
                    </Link>
                    <Link
                        href="/delivery/rider"
                        className="flex flex-col items-center gap-1 rounded-xl px-6 py-2 text-slate-400 transition-colors hover:text-slate-600"
                    >
                        <Bike className="h-6 w-6" />
                        <span className="text-xs font-medium">Entregas</span>
                    </Link>
                    <div className="flex flex-col items-center gap-1 rounded-xl px-6 py-2 text-sky-600">
                        <WalletCards className="h-6 w-6 fill-current" />
                        <span className="text-xs font-medium">Carteira</span>
                    </div>
                </div>
            </nav>
        </main>
    );
}

function TransactionRow({
    transaction,
    showSeparator,
}: {
    transaction: WalletTransaction;
    showSeparator: boolean;
}) {
    const isCredit = transaction.type === "CREDIT";

    return (
        <div>
            <div className="flex items-center gap-3 py-3">
                <div
                    className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                        isCredit
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600",
                    )}
                >
                    {isCredit ? (
                        <ArrowDownLeft className="h-5 w-5" />
                    ) : (
                        <ArrowUpRight className="h-5 w-5" />
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">
                            {categoryLabels[transaction.category]}
                        </p>
                        <StatusBadge status={transaction.status} />
                    </div>
                    <p className="truncate text-xs text-slate-500">
                        {transaction.description || formatDate(transaction.createdAt)}
                    </p>
                </div>
                <div className="text-right">
                    <p
                        className={cn(
                            "text-sm font-bold",
                            isCredit ? "text-emerald-700" : "text-slate-900",
                        )}
                    >
                        {isCredit ? "+" : "-"}
                        {formatMoney(transaction.amountCents, transaction.currency)}
                    </p>
                    <p className="text-xs text-slate-400">
                        {formatDate(transaction.createdAt)}
                    </p>
                </div>
            </div>
            {showSeparator ? <Separator /> : null}
        </div>
    );
}

function StatusBadge({ status }: { status: WalletTransactionStatus }) {
    const className =
        status === "COMPLETED"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : status === "PENDING"
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-rose-200 bg-rose-50 text-rose-700";

    return (
        <Badge variant="outline" className={cn("text-[10px]", className)}>
            {statusLabels[status]}
        </Badge>
    );
}
