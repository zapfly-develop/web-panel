import { redirect } from "next/navigation";
import WhatsappStatusListener from "@/components/dashboard/whatsapp-status-listener";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { AppTopbar } from "@/components/dashboard/app-topbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { requireStoreUser } from "@/lib/server-session";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await requireStoreUser();

    if (!user.hasActiveAccess) {
        redirect("/billing");
    }

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full bg-slate-50">
                <WhatsappStatusListener userId={user.id} />
                <AppSidebar />
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <AppTopbar
                        user={{
                            name: user.name,
                            email: user.email,
                            planType: user.planType,
                            manualStoreClosed: user.manualStoreClosed,
                        }}
                    />
                    <main className="flex-1 overflow-y-auto bg-slate-100/70 p-4 md:p-6 lg:p-8">
                        <div className="mx-auto w-full max-w-7xl">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
