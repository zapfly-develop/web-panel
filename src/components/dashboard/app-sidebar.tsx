"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Bike,
    Bot,
    LayoutDashboard,
    LogOut,
    MessageCircle,
    MessageSquare,
    Route,
    ShoppingBag,
    Users,
} from "lucide-react";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar";

const items = [
    {
        title: "Visão geral",
        url: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        title: "Contas Telegram",
        url: "/dashboard/bots",
        icon: Bot,
    },
    {
        title: "Conteúdos",
        url: "/dashboard/messages",
        icon: MessageSquare,
    },
    {
        title: "Produtos",
        url: "/dashboard/products",
        icon: ShoppingBag,
    },
    {
        title: "WhatsApp",
        url: "/dashboard/whatsapp",
        icon: MessageCircle,
    },
    {
        title: "Clientes",
        url: "/dashboard/customers",
        icon: Users,
    },
    {
        title: "Pedidos",
        url: "/dashboard/orders",
        icon: Bike,
    },
    {
        title: "Entregas",
        url: "/dashboard/delivery",
        icon: Route,
    },
];

export function AppSidebar() {
    const pathname = usePathname();

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="border-b border-sidebar-border px-4 py-6">
                <div className="flex flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sidebar-foreground/50">
                        User Panel
                    </p>
                    <h1 className="text-lg font-bold text-sidebar-foreground">
                        SyncPay
                    </h1>
                </div>
                <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center">
                    <span className="font-bold">S</span>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu className="px-2 py-4">
                    {items.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={pathname === item.url}
                                tooltip={item.title}
                            >
                                <Link href={item.url}>
                                    <item.icon />
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="border-t border-sidebar-border p-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Sair">
                            <Link href="/api/auth/signout">
                                <LogOut />
                                <span>Sair</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
