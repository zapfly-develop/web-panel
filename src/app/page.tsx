import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    ArrowRight,
    Boxes,
    Brain,
    Building2,
    Cable,
    CheckCircle2,
    ChevronRight,
    ClipboardCheck,
    Handshake,
    Headset,
    Layers3,
    MapPinned,
    MessageCircle,
    Navigation,
    PackageSearch,
    Pill,
    RadioTower,
    Route,
    ScanLine,
    ShoppingBag,
    Sparkles,
    Store,
    Warehouse,
} from "lucide-react";

export const metadata: Metadata = {
    title: "Floovi | Ecossistema logistico omnichannel",
    description:
        "Centralize canais de venda, WMS, mini-fulfillment e last-mile delivery em uma unica plataforma logistica operada por IA.",
};

const connectorCards = [
    {
        name: "WhatsApp",
        detail: "IA",
        icon: MessageCircle,
        accent: "text-emerald-500",
    },
    {
        name: "Tray",
        detail: "E-commerce",
        icon: ShoppingBag,
        accent: "text-blue-500",
    },
    {
        name: "Nuvemshop",
        detail: "Loja online",
        icon: Store,
        accent: "text-sky-500",
    },
    {
        name: "Olist",
        detail: "Marketplace",
        icon: Layers3,
        accent: "text-violet-500",
    },
    {
        name: "Uappi",
        detail: "Commerce",
        icon: Cable,
        accent: "text-cyan-500",
    },
];

const wmsFeatures = [
    {
        icon: Boxes,
        title: "Estoque Inteligente",
        description:
            "Sincronizacao em tempo real, controle de SKUs, disponibilidade por canal e rastreio do giro de produtos.",
    },
    {
        icon: ScanLine,
        title: "Picking & Packing",
        description:
            "Rotas de separacao otimizadas no armazem, conferencias por codigo de barras ou QR Code e expedicao guiada.",
    },
    {
        icon: Brain,
        title: "IA Preditiva",
        description:
            "Previsao de demanda, sugestao de reposicao e alertas automaticos antes do estoque virar ruptura.",
    },
];

const lastMileFeatures = [
    "Clusterizacao automatica de pedidos por regiao e janela de entrega.",
    "Despacho instantaneo com base em geolocalizacao, capacidade e status do entregador.",
    "Rotas otimizadas para reduzir tempo de rua, reentregas e consumo de combustivel.",
];

const humanizedServiceCards = [
    {
        icon: Headset,
        title: "IA com passagem para humano",
        description:
            "Automatize perguntas repetitivas, status e organizacao do pedido sem perder o momento certo de chamar a equipe.",
    },
    {
        icon: Handshake,
        title: "Atendimento proximo do cliente",
        description:
            "A conversa preserva contexto, historico e preferencias para que cada contato pareca cuidado, nao um protocolo frio.",
    },
    {
        icon: Store,
        title: "Operacao simples para loja local",
        description:
            "Mercados, farmacias, lojas de bairro e distribuidores conseguem vender, separar e entregar sem montar um time tecnico.",
    },
];

const audienceCards = [
    {
        icon: Store,
        title: "Comercios locais e lojas de bairro",
        description:
            "Restaurantes, mercados, lojas e negocios regionais que precisam atender bem no WhatsApp e entregar com controle.",
    },
    {
        icon: Warehouse,
        title: "Dark Stores & D2C Brands",
        description:
            "Operacoes que precisam transformar estoque local em entregas rapidas e previsiveis.",
    },
    {
        icon: Building2,
        title: "Supermercados e Distribuidoras",
        description:
            "Pedidos multicanal com alto volume, separacao recorrente e controle fino de ruptura.",
    },
    {
        icon: Pill,
        title: "Redes de Farmacias",
        description:
            "Fulfillment urbano com prioridade, rastreabilidade e despacho eficiente por proximidade.",
    },
    {
        icon: PackageSearch,
        title: "E-commerces com fulfillment local",
        description:
            "Marcas que querem operar hubs regionais sem perder visibilidade de estoque, pedido e entrega.",
    },
];

const platformMetrics = [
    { value: "1", label: "painel para canais, estoque, hub e frota" },
    { value: "IA + humano", label: "atendimento assistido com controle da equipe" },
    { value: "RT", label: "pedidos e status sincronizados em tempo real" },
];

function SectionHeader({
    eyebrow,
    title,
    description,
}: {
    eyebrow: string;
    title: string;
    description: string;
}) {
    return (
        <div className="mx-auto max-w-3xl text-center">
            <Badge className="border border-primary/15 bg-primary/10 px-3 py-1 text-primary">
                {eyebrow}
            </Badge>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
                {title}
            </h2>
            <p className="mt-4 text-base leading-8 text-zinc-600">
                {description}
            </p>
        </div>
    );
}

function FlooviMockup() {
    return (
        <div className="relative mx-auto w-full max-w-2xl lg:mx-0">
            <div className="rounded-[2rem] border border-zinc-200 bg-white p-3 shadow-[0_30px_90px_rgba(15,23,42,0.16)]">
                <div className="overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-zinc-950 text-white">
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                        </div>
                        <span className="text-xs font-medium text-zinc-400">
                            Floovi Command Center
                        </span>
                    </div>

                    <div className="grid gap-3 p-3 sm:grid-cols-5">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:col-span-3">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-medium uppercase text-zinc-400">
                                        Pedidos em tempo real
                                    </p>
                                    <p className="mt-2 text-3xl font-semibold">
                                        1.284
                                    </p>
                                </div>
                                <Badge className="bg-emerald-400/10 text-emerald-300">
                                    +18% hoje
                                </Badge>
                            </div>
                            <div className="mt-7 flex h-28 items-end gap-2">
                                {[44, 60, 52, 78, 70, 94, 86, 100].map(
                                    (height, index) => (
                                        <span
                                            key={`${height}-${index}`}
                                            className="flex-1 rounded-t-lg bg-gradient-to-t from-primary to-emerald-300"
                                            style={{ height: `${height}%` }}
                                        />
                                    ),
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:col-span-2">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-medium uppercase text-zinc-400">
                                    WMS
                                </p>
                                <Warehouse className="h-4 w-4 text-primary" />
                            </div>
                            <p className="mt-3 text-2xl font-semibold">
                                96,4%
                            </p>
                            <p className="mt-1 text-sm text-zinc-400">
                                acuracia de estoque
                            </p>
                            <div className="mt-5 space-y-2">
                                {["Picking", "Packing", "Expedicao"].map(
                                    (item) => (
                                        <div
                                            key={item}
                                            className="flex items-center justify-between rounded-xl bg-white/[0.05] px-3 py-2 text-sm"
                                        >
                                            <span className="text-zinc-300">
                                                {item}
                                            </span>
                                            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                                        </div>
                                    ),
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:col-span-2">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-medium uppercase text-zinc-400">
                                    Last-mile
                                </p>
                                <Route className="h-4 w-4 text-emerald-300" />
                            </div>
                            <div className="mt-5 space-y-3">
                                {[
                                    ["Zona norte", "12 pedidos"],
                                    ["Centro", "18 pedidos"],
                                    ["Zona sul", "9 pedidos"],
                                ].map(([region, orders]) => (
                                    <div
                                        key={region}
                                        className="flex items-center gap-3"
                                    >
                                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                                            {region.slice(0, 1)}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">
                                                {region}
                                            </p>
                                            <p className="text-xs text-zinc-400">
                                                {orders}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 sm:col-span-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-300 text-zinc-950">
                                    <Navigation className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-semibold">
                                        Despacho inteligente
                                    </p>
                                    <p className="text-sm text-emerald-100/80">
                                        37 entregas agrupadas em 6 rotas
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default async function HomePage() {
    const session = await auth();
    const panelHref = session?.user?.id
        ? session.user.isSuperAdmin
            ? "/admin/dashboard"
            : session.user.isRider
              ? "/delivery/rider"
              : "/dashboard"
        : "/login";
    const demoHref = session?.user?.id ? panelHref : "/register";

    return (
        <main className="min-h-screen overflow-x-hidden bg-zinc-50 text-zinc-950">
            <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/85 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                    <Link href="/" className="flex items-center gap-3">
                        <span className="relative h-10 w-28 overflow-hidden">
                            <Image
                                src="/logo-trim.png"
                                alt="Floovi"
                                fill
                                priority
                                className="object-contain object-left"
                            />
                        </span>
                    </Link>

                    <nav className="hidden items-center gap-7 text-sm font-medium text-zinc-600 lg:flex">
                        <a href="#hub" className="transition hover:text-zinc-950">
                            Hub
                        </a>
                        <a
                            href="#atendimento"
                            className="transition hover:text-zinc-950"
                        >
                            Atendimento
                        </a>
                        <a href="#wms" className="transition hover:text-zinc-950">
                            WMS
                        </a>
                        <a
                            href="#last-mile"
                            className="transition hover:text-zinc-950"
                        >
                            Last-mile
                        </a>
                        <a
                            href="#mercados"
                            className="transition hover:text-zinc-950"
                        >
                            Mercados
                        </a>
                    </nav>

                    <div className="flex items-center gap-2">
                        <Button
                            asChild
                            variant="outline"
                            className="hidden rounded-full border-zinc-300 bg-white sm:inline-flex"
                        >
                            <Link href={panelHref}>Acessar painel</Link>
                        </Button>
                        <Button
                            asChild
                            className="rounded-full px-5 shadow-lg shadow-primary/20"
                        >
                            <Link href={demoHref}>
                                Agendar demo
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </header>

            <section className="relative overflow-hidden border-b border-zinc-200 bg-white">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(39,39,42,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(39,39,42,0.06)_1px,transparent_1px)] bg-[size:56px_56px]" />
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-zinc-50 to-transparent" />

                <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:grid-cols-[minmax(0,0.95fr)_minmax(480px,1.05fr)] lg:items-center lg:px-8 lg:pb-28 lg:pt-20">
                    <div className="max-w-3xl">
                        <Badge className="border border-primary/15 bg-primary/10 px-3 py-1 text-primary">
                            Fulfillment, WMS, omnichannel e last-mile
                        </Badge>
                        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-zinc-950 sm:text-6xl lg:text-7xl">
                            A infraestrutura logistica completa para a sua
                            operacao omnichannel
                        </h1>
                        <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-600 sm:text-lg">
                            Centralize canais de venda, controle o seu armazem
                            com WMS inteligente e gerencie a sua frota de
                            entregadores em uma unica plataforma operada por IA,
                            mantendo atendimento humanizado quando a conversa
                            precisa de cuidado humano.
                        </p>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Button
                                asChild
                                size="lg"
                                className="rounded-full px-6 shadow-xl shadow-primary/20"
                            >
                                <Link href={demoHref}>
                                    Agendar Demonstracao
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Button
                                asChild
                                size="lg"
                                variant="outline"
                                className="rounded-full border-zinc-300 bg-white px-6"
                            >
                                <a href="#contato">Falar com Especialista</a>
                            </Button>
                        </div>

                        <div className="mt-10 grid gap-3 sm:grid-cols-3">
                            {platformMetrics.map((item) => (
                                <div
                                    key={item.value}
                                    className="rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm"
                                >
                                    <p className="text-2xl font-semibold text-zinc-950">
                                        {item.value}
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-zinc-600">
                                        {item.label}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <FlooviMockup />
                </div>
            </section>

            <section id="hub" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
                <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center">
                    <div>
                        <Badge className="border border-primary/15 bg-primary/10 px-3 py-1 text-primary">
                            Hub Omnichannel
                        </Badge>
                        <h2 className="mt-5 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
                            Todos os pedidos caem no cerebro logistico da
                            Floovi
                        </h2>
                        <p className="mt-4 text-base leading-8 text-zinc-600">
                            WhatsApp com IA, lojas virtuais e marketplaces
                            passam a alimentar um fluxo unico de pedidos em
                            tempo real. A operacao elimina retrabalho manual,
                            reduz erros de digitacao e ganha visibilidade antes
                            do pedido chegar ao estoque, sem afastar o cliente
                            de uma experiencia proxima e consultiva.
                        </p>
                        <div className="mt-6 flex items-center gap-3 text-sm font-medium text-zinc-700">
                            <RadioTower className="h-5 w-5 text-primary" />
                            Sincronizacao pronta para operacoes multicanal.
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        {connectorCards.map((connector) => (
                            <div
                                key={connector.name}
                                className="group rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-zinc-200/80 lg:min-h-44"
                            >
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50">
                                    <connector.icon
                                        className={`h-5 w-5 ${connector.accent}`}
                                    />
                                </div>
                                <p className="mt-5 text-lg font-semibold tracking-tight text-zinc-950">
                                    {connector.name}
                                </p>
                                <p className="mt-1 text-sm text-zinc-500">
                                    {connector.detail}
                                </p>
                                <ChevronRight className="mt-5 h-4 w-4 text-zinc-300 transition group-hover:translate-x-1 group-hover:text-primary" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section
                id="atendimento"
                className="border-y border-zinc-200 bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
            >
                <div className="mx-auto max-w-7xl">
                    <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
                        <div>
                            <Badge className="border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-700">
                                Atendimento humanizado
                            </Badge>
                            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
                                Automacao que ajuda a equipe, nao substitui o
                                relacionamento
                            </h2>
                            <p className="mt-4 text-base leading-8 text-zinc-600">
                                A Floovi resolve a parte repetitiva do
                                atendimento, organiza o pedido e entrega
                                contexto para o operador humano assumir quando
                                houver duvida, negociacao, excecao ou uma venda
                                que pede mais proximidade.
                            </p>
                            <p className="mt-4 text-base leading-8 text-zinc-600">
                                Isso torna a plataforma ideal tambem para
                                comercios locais: o lojista ganha velocidade e
                                controle sem perder o tom pessoal que faz o
                                cliente voltar.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                            {humanizedServiceCards.map((item) => (
                                <div
                                    key={item.title}
                                    className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5 shadow-sm"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                                            <item.icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold tracking-tight text-zinc-950">
                                                {item.title}
                                            </h3>
                                            <p className="mt-2 text-sm leading-7 text-zinc-600">
                                                {item.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section id="wms" className="border-y border-zinc-200 bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
                <div className="mx-auto max-w-7xl">
                    <SectionHeader
                        eyebrow="WMS & Mini-Fulfillment"
                        title="Do pedido ao pacote pronto para sair"
                        description="A Floovi deixa de ser apenas uma camada de atendimento e passa a operar o miolo logistico: estoque, separacao, conferencia e expedicao em um fluxo rastreavel."
                    />

                    <div className="mt-12 grid gap-4 lg:grid-cols-3">
                        {wmsFeatures.map((feature) => (
                            <div
                                key={feature.title}
                                className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm"
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                                    <feature.icon className="h-6 w-6" />
                                </div>
                                <h3 className="mt-6 text-xl font-semibold tracking-tight text-zinc-950">
                                    {feature.title}
                                </h3>
                                <p className="mt-3 text-sm leading-7 text-zinc-600">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
                        <div className="rounded-3xl border border-zinc-200 bg-zinc-950 p-6 text-white shadow-sm">
                            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                                <div>
                                    <Badge className="bg-white/10 text-zinc-100">
                                        Armazem vivo
                                    </Badge>
                                    <h3 className="mt-5 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
                                        Cada SKU vira dado operacional para
                                        vender, separar e repor melhor.
                                    </h3>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-3 lg:w-[26rem]">
                                    {["Entrada", "Picking", "Saida"].map(
                                        (step) => (
                                            <div
                                                key={step}
                                                className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                                            >
                                                <ClipboardCheck className="h-5 w-5 text-emerald-300" />
                                                <p className="mt-3 text-sm font-medium">
                                                    {step}
                                                </p>
                                            </div>
                                        ),
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm">
                            <Sparkles className="h-6 w-6 text-primary" />
                            <p className="mt-5 text-lg font-semibold tracking-tight text-zinc-950">
                                IA que antecipa gargalos
                            </p>
                            <p className="mt-3 text-sm leading-7 text-zinc-600">
                                Alertas e recomendacoes ajudam a equipe a agir
                                antes que falta de estoque, fila de separacao ou
                                atraso de expedicao virem problema para o
                                cliente.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section id="last-mile" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
                <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.82fr)] lg:items-center">
                    <div>
                        <Badge className="border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-700">
                            Last-Mile Delivery
                        </Badge>
                        <h2 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
                            Roteirizacao eficiente para uma frota que entrega
                            mais com menos deslocamento
                        </h2>
                        <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-600">
                            A camada de entrega conecta pedido, regiao, hub,
                            entregador e cliente final. O despacho deixa de
                            depender de tentativa manual e passa a seguir dados
                            de proximidade, disponibilidade e rota.
                        </p>

                        <div className="mt-8 grid gap-3">
                            {lastMileFeatures.map((feature) => (
                                <div
                                    key={feature}
                                    className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
                                >
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                                    <p className="text-sm leading-6 text-zinc-700">
                                        {feature}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-xl shadow-zinc-200/70">
                        <div className="rounded-2xl bg-zinc-950 p-5 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-zinc-400">
                                        Mapa operacional
                                    </p>
                                    <p className="mt-1 text-2xl font-semibold">
                                        6 rotas ativas
                                    </p>
                                </div>
                                <MapPinned className="h-8 w-8 text-primary" />
                            </div>
                            <div className="mt-8 grid grid-cols-3 gap-2">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((cell) => (
                                    <div
                                        key={cell}
                                        className="relative h-20 rounded-xl border border-white/10 bg-white/[0.04]"
                                    >
                                        {cell === 2 ||
                                        cell === 5 ||
                                        cell === 8 ? (
                                            <span className="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-300 text-xs font-bold text-zinc-950">
                                                {cell}
                                            </span>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {[
                                ["Tempo medio", "27 min"],
                                ["Economia estimada", "14%"],
                            ].map(([label, value]) => (
                                <div
                                    key={label}
                                    className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                                >
                                    <p className="text-sm text-zinc-500">
                                        {label}
                                    </p>
                                    <p className="mt-2 text-2xl font-semibold text-zinc-950">
                                        {value}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section id="mercados" className="border-y border-zinc-200 bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
                <div className="mx-auto max-w-7xl">
                    <SectionHeader
                        eyebrow="Para quem e a Floovi"
                        title="Operacoes que precisam vender, separar e entregar no mesmo ritmo"
                        description="A plataforma atende desde comercios locais que vendem pelo WhatsApp ate redes com pressao por velocidade, controle de estoque e experiencia de entrega consistente."
                    />

                    <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                        {audienceCards.map((audience) => (
                            <div
                                key={audience.title}
                                className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm transition hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:shadow-zinc-200/70"
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                                    <audience.icon className="h-6 w-6" />
                                </div>
                                <h3 className="mt-6 text-lg font-semibold tracking-tight text-zinc-950">
                                    {audience.title}
                                </h3>
                                <p className="mt-3 text-sm leading-7 text-zinc-600">
                                    {audience.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="contato" className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
                <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-zinc-950 p-6 text-white shadow-2xl shadow-zinc-300/70 sm:p-8 lg:p-12">
                    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                        <div className="max-w-3xl">
                            <Badge className="bg-white/10 text-zinc-100">
                                Proxima fase da sua operacao
                            </Badge>
                            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">
                                Transforme pedidos espalhados em uma operacao
                                logistica previsivel.
                            </h2>
                            <p className="mt-5 text-base leading-8 text-zinc-300">
                                Comece pela centralizacao dos canais, conecte o
                                estoque ao fulfillment e escale a entrega local
                                com uma plataforma pensada para operacoes que
                                nao podem depender de improviso.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                            <Button
                                asChild
                                size="lg"
                                className="rounded-full bg-white px-6 text-zinc-950 hover:bg-zinc-100"
                            >
                                <Link href={demoHref}>
                                    Agendar Demonstracao
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Button
                                asChild
                                size="lg"
                                variant="outline"
                                className="rounded-full border-white/20 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white"
                            >
                                <Link href={panelHref}>Entrar em contato</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="border-t border-zinc-200 bg-white px-4 py-8 sm:px-6 lg:px-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
                    <Link href="/" className="relative h-8 w-24 overflow-hidden">
                        <Image
                            src="/logo-trim.png"
                            alt="Floovi"
                            fill
                            className="object-contain object-left"
                        />
                    </Link>
                    <p>
                        Ecossistema logistico ponta a ponta para operacoes
                        omnichannel.
                    </p>
                </div>
            </footer>
        </main>
    );
}
