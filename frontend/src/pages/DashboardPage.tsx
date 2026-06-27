import { useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useDashboard } from "@/api/hooks";
import { Badge, Card, CardBody, Spinner } from "@/components/ui";
import { formatMoney } from "@/lib/format";

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const POOL_COLORS = ["#b08d57", "#6b7280", "#1a1a1a"];

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardBody>
        <div className="text-xs uppercase tracking-wide text-gray-400">{label}</div>
        <div className="mt-1 text-xl font-semibold text-gray-900">{value}</div>
        {hint && <div className="mt-1 text-xs text-gray-400">{hint}</div>}
      </CardBody>
    </Card>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState(currentPeriod());
  const [expanded, setExpanded] = useState(true);
  const { data, isLoading } = useDashboard(period);

  if (isLoading || !data) return <Spinner />;

  const m = data.money_on_account;
  const pieData = [
    { name: "Деньги клиентов", value: Number(m.client_money) },
    { name: "Инвестиции", value: Number(m.investments) },
    { name: "Деньги компании", value: Number(m.company_money) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Дашборд</h1>
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        />
      </div>

      {/* Главная плитка «Деньги на счету» (§4.7) */}
      <Card className="border-brand-accent/40">
        <CardBody>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center justify-between text-left"
          >
            <div>
              <div className="text-sm text-gray-500">Деньги на счету</div>
              <div className="text-4xl font-bold text-brand">{formatMoney(m.total)}</div>
            </div>
            <span className="text-gray-400">{expanded ? "Свернуть ▲" : "Подробнее ▼"}</span>
          </button>

          {expanded && (
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <Row label="Деньги клиентов" hint="незавершённые заказы" value={m.client_money} />
                <Row label="Инвестиции" hint="невозвращённые вложения" value={m.investments} />
                <Row label="Деньги компании" value={m.company_money} bold />
                <div className="ml-4 space-y-2 border-l-2 border-gray-100 pl-4">
                  <Row label="Отложено на налоги" value={m.reserves.tax} small />
                  <Row label="Отложено на ежемесячные" value={m.reserves.monthly} small />
                  {Number(m.reserves.other) > 0 && (
                    <Row label="Отложено прочее" value={m.reserves.other} small />
                  )}
                  <Row label="Свободные деньги" value={m.free_money} small bold />
                </div>
                {m.reserves_exceed_company && (
                  <Badge color="red">⚠ Отложено больше, чем заработано</Badge>
                )}
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} label>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={POOL_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatMoney(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Разбивка по способам (§4.7, опц.) */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Наличные" value={formatMoney(data.money_by_method.cash)} />
        <Stat label="Карта" value={formatMoney(data.money_by_method.card)} />
        <Stat label="Терминал" value={formatMoney(data.money_by_method.terminal)} />
      </div>

      {/* P&L за период (§4.6) + прочие агрегаты */}
      <h2 className="text-lg font-semibold">За период {period}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Прибыль с заказов"
          value={formatMoney(data.pnl.profit_from_orders)}
          hint={`заказов: ${data.pnl.orders_count}`}
        />
        <Stat label="Постоянные расходы" value={formatMoney(data.pnl.fixed_expenses)} />
        <Stat label="Чистая прибыль" value={formatMoney(data.pnl.net_profit)} />
        <Stat label="Капитал склада" value={formatMoney(data.frozen_capital)} />
        <Stat label="Долги клиентов" value={formatMoney(data.client_debts)} />
        <Stat label="Переплаты клиентов" value={formatMoney(data.client_overpayments)} />
        <Stat
          label="Подсказка: резерв на налоги"
          value={formatMoney(data.reserve_target_hints.tax)}
        />
        <Stat
          label="Подсказка: резерв на ежемесячные"
          value={formatMoney(data.reserve_target_hints.monthly)}
        />
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  hint,
  bold,
  small,
}: {
  label: string;
  value: string;
  hint?: string;
  bold?: boolean;
  small?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className={small ? "text-sm text-gray-500" : "text-gray-600"}>
        {label}
        {hint && <span className="ml-1 text-xs text-gray-400">({hint})</span>}
      </span>
      <span className={bold ? "font-semibold" : ""}>{formatMoney(value)}</span>
    </div>
  );
}
