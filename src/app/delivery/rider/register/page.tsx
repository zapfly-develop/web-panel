import Link from "next/link";
import { redirect } from "next/navigation";
import {
    BadgeCheck,
    Bike,
    ChevronRight,
    Clock3,
    MapPinned,
    Route,
    ShieldCheck,
    WalletCards,
} from "lucide-react";
import { auth } from "@/auth";
import { RiderRegisterForm } from "@/components/auth/rider-register-form";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

const riderHighlights = [
    {
        icon: MapPinned,
        title: "Corridas perto de você",
        description:
            "O app usa sua localização autorizada para encontrar entregas próximas e reduzir tempo parado.",
    },
    {
        icon: WalletCards,
        title: "Carteira do entregador",
        description:
            "Acompanhe repasses e solicite saques pelo fluxo dedicado ao rider.",
    },
    {
        icon: Route,
        title: "Operação guiada",
        description:
            "Veja retirada, destino, status da corrida e ações principais em uma experiência mobile.",
    },
];

const onboardingSteps = [
    "Envie seus dados de identificação e veículo.",
    "A equipe valida o perfil para liberar a operação.",
    "Depois da aprovação, fique online e receba corridas.",
];

export default async function RiderRegisterPage() {
    const session = await auth();

    if (session?.user?.id) {
        if (session.user.isSuperAdmin) {
            redirect("/admin/dashboard");
        }

        if (session.user.isRider) {
            redirect("/delivery/rider");
        }

        redirect("/dashboard");
    }

    return (
        <main className="min-h-dvh bg-slate-50">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 sm:py-8 lg:grid lg:grid-cols-[minmax(0,1fr)_460px] lg:items-start lg:gap-8 lg:px-8">
                <section className="order-2 space-y-5 lg:order-1 lg:sticky lg:top-8">
                    <div className="space-y-4">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900"
                        >
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white shadow-lg shadow-primary/20">
                                <Bike className="h-5 w-5" />
                            </span>
                            Floovi Entregadores
                        </Link>

                        <Badge
                            variant="outline"
                            className="border-emerald-200 bg-emerald-50 text-emerald-700"
                        >
                            Área dedicada a entregadores
                        </Badge>

                        <div className="space-y-3">
                            <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                                Cadastre-se para operar entregas pela Floovi
                            </h1>
                            <p className="max-w-2xl text-base leading-7 text-slate-600">
                                Este cadastro é separado do painel de lojistas.
                                Ele prepara seu acesso ao PWA do entregador, com
                                chamadas de corrida, mapa, status da entrega e
                                carteira em uma área própria do sistema Floovi.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                        {riderHighlights.map((item) => (
                            <Card
                                key={item.title}
                                className="rounded-lg border-slate-200 bg-white shadow-sm"
                            >
                                <CardHeader className="gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <item.icon className="h-5 w-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <CardTitle className="text-base">
                                            {item.title}
                                        </CardTitle>
                                        <CardDescription className="leading-6">
                                            {item.description}
                                        </CardDescription>
                                    </div>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>

                    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-4 flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-emerald-600" />
                            <h2 className="text-base font-semibold text-slate-950">
                                Como a liberação funciona
                            </h2>
                        </div>
                        <div className="space-y-3">
                            {onboardingSteps.map((step, index) => (
                                <div
                                    key={step}
                                    className="grid grid-cols-[32px_1fr] gap-3"
                                >
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-700">
                                        {index + 1}
                                    </span>
                                    <p className="pt-1 text-sm leading-6 text-slate-600">
                                        {step}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                </section>

                <section className="order-1 lg:order-2">
                    <Card className="rounded-lg border-slate-200 bg-white shadow-xl shadow-slate-200/70">
                        <CardHeader className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-2">
                                    <Badge className="w-fit bg-slate-900 text-white hover:bg-slate-900">
                                        Novo entregador
                                    </Badge>
                                    <CardTitle className="text-2xl">
                                        Criar cadastro
                                    </CardTitle>
                                    <CardDescription className="leading-6">
                                        Preencha seus dados para solicitar acesso
                                        ao app Floovi Rider.
                                    </CardDescription>
                                </div>
                                <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 sm:flex">
                                    <Clock3 className="h-6 w-6" />
                                </div>
                            </div>
                        </CardHeader>
                        <RiderRegisterForm />
                    </Card>

                    <div className="mt-4 flex flex-col gap-3 rounded-lg border border-primary/15 bg-primary/5 p-4 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <BadgeCheck className="mt-0.5 h-5 w-5 text-primary" />
                            <p className="leading-6">
                                Já é lojista? Continue usando o cadastro de
                                assinantes para acessar o painel principal.
                            </p>
                        </div>
                        <Link
                            href="/register"
                            className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline"
                        >
                            Cadastro de lojista
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    );
}
