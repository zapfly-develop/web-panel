"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import {
    Bike,
    Bot,
    ChevronRight,
    LayoutDashboard,
    LogOut,
    MessageCircle,
    MessageSquare,
    Package2,
    Plus,
    Route,
    Settings,
    ShoppingBag,
    Store,
    Truck,
    Users,
    WalletCards,
} from "lucide-react";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type SidebarNavItem = {
    title: string;
    url: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const mainMenuItems = [
    {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        title: "Orders",
        url: "/dashboard/orders",
        icon: ShoppingBag,
    },
    {
        title: "Riders",
        url: "/dashboard/delivery",
        icon: Bike,
    },
    {
        title: "Wallet",
        url: "/billing",
        icon: WalletCards,
    },
    {
        title: "Settings",
        url: "/dashboard/whatsapp",
        icon: Settings,
    },
];

const logisticsItems = [
    {
        title: "Inbound",
        url: "/dashboard/inbound",
        icon: Truck,
    },
    {
        title: "Estoque",
        url: "/dashboard/products",
        icon: Package2,
    },
];

const operationItems = [
    {
        title: "Clientes",
        url: "/dashboard/customers",
        icon: Users,
    },
    {
        title: "Conteúdos",
        url: "/dashboard/messages",
        icon: MessageSquare,
    },
    {
        title: "Rotas",
        url: "/dashboard/delivery",
        icon: Route,
    },
];

const integrations = [
    {
        title: "WhatsApp",
        url: "/dashboard/whatsapp",
        icon: MessageCircle,
        status: "live",
        accent: "bg-emerald-500",
    },
    {
        title: "Telegram",
        url: "/dashboard/bots",
        icon: Bot,
        status: "sync",
        accent: "bg-sky-500",
    },
    {
        title: "Tray",
        url: "/dashboard/products",
        initials: "T",
        status: "soon",
        accent: "bg-violet-500",
    },
    {
        title: "Nuvemshop",
        url: "/dashboard/orders",
        initials: "N",
        status: "soon",
        accent: "bg-blue-500",
    },
];

function isRouteActive(pathname: string, url: string) {
    if (url === "/dashboard") {
        return pathname === url;
    }

    return pathname === url || pathname.startsWith(`${url}/`);
}

function SidebarLink({
    item,
    pathname,
}: {
    item: SidebarNavItem;
    pathname: string;
}) {
    const isActive = isRouteActive(pathname, item.url);

    return (
        <Link
            href={item.url}
            className={cn(
                "group relative flex items-center gap-3 rounded-md px-3.5 py-2.5 my-1 text-sm font-medium transition-all duration-200",
                "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2",
                isActive
                    ? "bg-sky-100 text-primary"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-950",
            )}
        >
            <span
                className={cn(
                    "absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full transition-opacity",
                    isActive ? "bg-sky-400 opacity-100" : "opacity-0",
                )}
            />
            <item.icon
                strokeWidth={isActive ? 2 : 1}
                className={cn(
                    "size-5 shrink-0 transition-colors",
                    isActive
                        ? "text-primary"
                        : "text-slate-700 group-hover:text-slate-900",
                )}
            />
            <span className="group-data-[collapsible=icon]:hidden">
                {item.title}
            </span>
        </Link>
    );
}

export function AppSidebar() {
    const pathname = usePathname();

    return (
        <Sidebar
            collapsible="icon"
            className="border-r border-slate-200/80 bg-white/95 backdrop-blur-xl"
        >
            <SidebarHeader className="px-4 py-5">
                <Link href="/dashboard" className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-white shadow-xl shadow-slate-900/10">
                        <Store className="size-5" strokeWidth={1} />
                    </div>
                    <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
                            Floovi
                        </p>
                        <h1 className="truncate text-lg font-black tracking-tight text-primary">
                            Control Center
                        </h1>
                    </div>
                </Link>
            </SidebarHeader>

            <SidebarContent className="px-3 pb-4 pt-2">
                <nav className="space-y-6">
                    <section className="space-y-2">
                        <p className="px-3 text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400 group-data-[collapsible=icon]:sr-only">
                            Main Menu
                        </p>
                        <div className="space-y-1.5">
                            {mainMenuItems.map((item) => (
                                <SidebarLink
                                    key={item.title}
                                    item={item}
                                    pathname={pathname}
                                />
                            ))}
                        </div>
                    </section>

                    <section className="space-y-2 group-data-[collapsible=icon]:hidden">
                        <p className="px-3 text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">
                            Operações Logísticas
                        </p>
                        <div className="space-y-1.5">
                            {logisticsItems.map((item) => (
                                <SidebarLink
                                    key={item.title}
                                    item={item}
                                    pathname={pathname}
                                />
                            ))}
                        </div>
                    </section>

                    <section className="space-y-2 group-data-[collapsible=icon]:hidden">
                        <p className="px-3 text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">
                            Operations
                        </p>
                        <div className="space-y-1.5">
                            {operationItems.map((item) => (
                                <SidebarLink
                                    key={item.title}
                                    item={item}
                                    pathname={pathname}
                                />
                            ))}
                        </div>
                    </section>

                    <section className="rounded-3xl border border-slate-200 bg-slate-50/80 p-3 shadow-inner shadow-white group-data-[collapsible=icon]:hidden">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-slate-400">
                                    Integrations
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    Canais omnichannel conectados
                                </p>
                            </div>
                            <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-500 shadow-sm">
                                {integrations.length}
                            </span>
                        </div>

                        <div className="space-y-2">
                            {integrations.map((integration) => {
                                const isActive = isRouteActive(
                                    pathname,
                                    integration.url,
                                );
                                const Icon = integration.icon;

                                return (
                                    <Link
                                        key={integration.title}
                                        href={integration.url}
                                        className={cn(
                                            "flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-all",
                                            isActive
                                                ? "border-slate-300 bg-white shadow-sm"
                                                : "border-transparent hover:border-slate-200 hover:bg-white",
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-black text-white shadow-sm",
                                                integration.accent,
                                            )}
                                        >
                                            {Icon ? (
                                                <Icon className="size-4" />
                                            ) : (
                                                integration.initials
                                            )}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold text-slate-800">
                                                {integration.title}
                                            </span>
                                            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                                {integration.status}
                                            </span>
                                        </span>
                                        <ChevronRight className="size-4 text-slate-300" />
                                    </Link>
                                );
                            })}
                        </div>

                        <Link
                            href="/dashboard/whatsapp"
                            className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-sky-300 bg-sky-50 px-3 py-2.5 text-sm font-bold text-sky-700 transition hover:border-sky-400 hover:bg-sky-100"
                        >
                            <Plus className="size-4" />
                            Add New
                        </Link>
                    </section>
                </nav>
            </SidebarContent>

            <SidebarFooter className="border-t border-slate-200/80 p-3">
                <div className="rounded-3xl bg-slate-950 p-4 text-white shadow-xl shadow-slate-900/10 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-bold">Hub Omnichannel</p>
                    <p className="mt-1 text-xs leading-5 text-slate-300">
                        Conecte novos canais e mantenha pedidos, entregas e
                        carteira em uma unica visão.
                    </p>
                </div>
                <Link
                    href="/api/auth/signout"
                    className="mt-2 flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2"
                >
                    <LogOut className="size-4" />
                    <span className="group-data-[collapsible=icon]:hidden">
                        Sair
                    </span>
                </Link>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
