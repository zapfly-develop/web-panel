"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
    Bell,
    ChevronRight,
    LogOut,
    Search,
    Settings,
    Store,
} from "lucide-react";

import { updateManualStoreClosedAction } from "@/app/dashboard/whatsapp/actions";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const routeLabels: Record<string, string> = {
    dashboard: "Dashboard",
    orders: "Orders",
    delivery: "Riders",
    products: "Products",
    customers: "Customers",
    messages: "Messages",
    whatsapp: "Settings",
    bots: "Integrations",
    billing: "Wallet",
};

type AppTopbarProps = {
    user: {
        name: string | null;
        email: string | null;
        planType: string | null;
        manualStoreClosed: boolean;
    };
};

function getInitials(name: string | null, email: string | null) {
    const source = name || email || "Floovi";
    const parts = source.split(/[\s@.]+/).filter(Boolean);

    return parts
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
}

export function AppTopbar({ user }: AppTopbarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(!user.manualStoreClosed);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const initials = getInitials(user.name, user.email);

    const breadcrumbs = useMemo(() => {
        const segments = pathname.split("/").filter(Boolean);

        if (segments[0] === "dashboard") {
            return segments.map((segment, index) => ({
                label: index === 0 ? "Control Center" : routeLabels[segment] || segment,
                href: `/${segments.slice(0, index + 1).join("/")}`,
            }));
        }

        if (segments[0] === "billing") {
            return [
                { label: "Control Center", href: "/dashboard" },
                { label: "Wallet", href: "/billing" },
            ];
        }

        return [{ label: "Control Center", href: "/dashboard" }];
    }, [pathname]);

    function handleStoreStatusChange(nextOpen: boolean) {
        const previousValue = isOpen;
        setIsOpen(nextOpen);
        setErrorMessage(null);

        startTransition(async () => {
            try {
                const formData = new FormData();

                if (!nextOpen) {
                    formData.set("manualStoreClosed", "1");
                }

                await updateManualStoreClosedAction(formData);
                router.refresh();
            } catch (error) {
                setIsOpen(previousValue);
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Nao foi possivel atualizar o status da loja.",
                );
            }
        });
    }

    return (
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl lg:px-6">
            <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    <SidebarTrigger className="-ml-1 rounded-xl" />
                    <Separator orientation="vertical" className="hidden h-6 sm:block" />

                    <div className="hidden min-w-0 flex-col gap-1 md:flex">
                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-400">
                            {breadcrumbs.map((crumb, index) => (
                                <span key={`${crumb.href}-${index}`} className="flex items-center gap-1">
                                    {index > 0 ? <ChevronRight className="size-3" /> : null}
                                    <Link
                                        href={crumb.href}
                                        className={cn(
                                            "truncate transition hover:text-slate-700",
                                            index === breadcrumbs.length - 1 &&
                                                "text-slate-900",
                                        )}
                                    >
                                        {crumb.label}
                                    </Link>
                                </span>
                            ))}
                        </div>
                        <p className="text-sm font-bold text-slate-950">
                            SaaS Omnichannel Control Center
                        </p>
                    </div>

                    <div className="relative w-full max-w-xl md:ml-4">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            placeholder="Buscar pedidos, entregadores ou clientes..."
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
                        />
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm lg:flex">
                        <div className="flex items-center gap-2">
                            <span
                                className={cn(
                                    "size-2.5 rounded-full",
                                    isOpen ? "bg-emerald-500" : "bg-rose-500",
                                )}
                            />
                            <div className="leading-none">
                                <p className="text-xs font-bold text-slate-900">
                                    {isOpen ? "Loja Aberta" : "Loja Fechada"}
                                </p>
                                <p className="mt-1 text-[10px] font-medium text-slate-400">
                                    {isPending ? "Atualizando..." : "Store status"}
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={isOpen}
                            onCheckedChange={handleStoreStatusChange}
                            disabled={isPending}
                            aria-label="Alternar status da loja"
                            className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-rose-500"
                        />
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="relative size-11 rounded-2xl border-slate-200 bg-white shadow-sm"
                        aria-label="Notificacoes de novos pedidos"
                    >
                        <Bell className="size-4 text-slate-600" />
                        <span className="absolute right-2.5 top-2.5 size-2.5 rounded-full border-2 border-white bg-rose-500" />
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 pr-3 shadow-sm transition hover:bg-slate-50">
                                <span className="flex size-8 items-center justify-center rounded-xl bg-slate-950 text-xs font-black text-white">
                                    {initials}
                                </span>
                                <span className="hidden max-w-32 text-left leading-tight sm:block">
                                    <span className="block truncate text-xs font-bold text-slate-900">
                                        {user.name || "Lojista"}
                                    </span>
                                    <span className="block truncate text-[10px] font-medium text-slate-400">
                                        {user.planType || "SEM PLANO"}
                                    </span>
                                </span>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2">
                            <DropdownMenuLabel className="px-2 py-2">
                                <span className="block text-sm font-bold text-slate-900">
                                    {user.name || "Lojista Floovi"}
                                </span>
                                <span className="block truncate text-xs font-normal text-slate-500">
                                    {user.email || "conta sem email"}
                                </span>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/dashboard/whatsapp">
                                    <Store className="size-4" />
                                    Status e canais
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/billing">
                                    <Settings className="size-4" />
                                    Plano e billing
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild variant="destructive">
                                <Link href="/api/auth/signout">
                                    <LogOut className="size-4" />
                                    Sair
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            {errorMessage ? (
                <p className="mt-2 text-right text-xs font-medium text-rose-600">
                    {errorMessage}
                </p>
            ) : null}
        </header>
    );
}
