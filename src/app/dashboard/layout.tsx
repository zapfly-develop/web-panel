import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import WhatsappStatusListener from "@/components/dashboard/whatsapp-status-listener";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    if (session.user.isSuperAdmin) {
        redirect("/admin/dashboard");
    }

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full bg-slate-50">
                <WhatsappStatusListener userId={session.user.id} />
                <AppSidebar />
                <div className="flex flex-1 flex-col overflow-hidden">
                    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                        <div className="flex items-center gap-2">
                            <SidebarTrigger className="-ml-1" />
                            <Separator orientation="vertical" className="mr-2 h-4" />
                            <div>
                                <h1 className="text-sm font-bold text-slate-900 md:text-base">
                                    Painel do Cliente
                                </h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="hidden sm:inline-flex">
                                {session.user.planType || "SEM PLANO"}
                            </Badge>
                            <Button asChild variant="outline" size="sm">
                                <Link href="/billing">Billing</Link>
                            </Button>
                        </div>
                    </header>
                    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                        <div className="mx-auto max-w-6xl w-full">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
