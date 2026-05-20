"use client";

import {
    Area,
    Cell,
    ComposedChart,
    Line,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

export type DashboardActivityPoint = {
    label: string;
    orders: number;
    salesCents: number;
};

export type DashboardChannelPoint = {
    name: string;
    value: number;
    color: string;
};

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
});

function formatTooltipValue(value: number | string, name: string) {
    if (name === "Vendas") {
        return moneyFormatter.format(Number(value) / 100);
    }

    return Number(value).toLocaleString("pt-BR");
}

export function DashboardActivityChart({
    data,
}: {
    data: DashboardActivityPoint[];
}) {
    return (
        <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={data}
                    margin={{ top: 12, right: 8, bottom: 0, left: -18 }}
                >
                    <defs>
                        <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.24} />
                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        dy={10}
                    />
                    <YAxis
                        yAxisId="orders"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        allowDecimals={false}
                    />
                    <YAxis yAxisId="sales" hide />
                    <Tooltip
                        cursor={{ stroke: "#cbd5e1", strokeDasharray: "4 4" }}
                        contentStyle={{
                            border: "1px solid #e2e8f0",
                            borderRadius: 8,
                            boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
                        }}
                        formatter={(value, name) => [
                            formatTooltipValue(
                                value as number | string,
                                String(name),
                            ),
                            String(name),
                        ]}
                    />
                    <Area
                        yAxisId="sales"
                        type="monotone"
                        dataKey="salesCents"
                        name="Vendas"
                        stroke="#0ea5e9"
                        strokeWidth={2}
                        fill="url(#salesFill)"
                    />
                    <Line
                        yAxisId="orders"
                        type="monotone"
                        dataKey="orders"
                        name="Pedidos"
                        stroke="#111827"
                        strokeWidth={2.5}
                        dot={{ r: 3, strokeWidth: 2, fill: "#ffffff" }}
                        activeDot={{ r: 5 }}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}

export function DashboardChannelChart({
    data,
}: {
    data: DashboardChannelPoint[];
}) {
    const hasData = data.some((item) => item.value > 0);

    if (!hasData) {
        return (
            <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm font-medium text-slate-500">
                Sem pedidos nas ultimas 24h
            </div>
        );
    }

    return (
        <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={82}
                        paddingAngle={3}
                        strokeWidth={0}
                    >
                        {data.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            border: "1px solid #e2e8f0",
                            borderRadius: 8,
                            boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
