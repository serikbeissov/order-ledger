import { useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Link } from "react-router-dom";
import { useDashboard } from "@/api/hooks";
import { useAuth } from "@/api/auth";
import { canManageUsers } from "@/lib/permissions";
import { Badge, Card, CardBody, CardHeader, Spinner, Table, Td, Th } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";

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
  const { user } = useAuth();
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Дашборд</h1>
        <div className="flex items-center gap-2">
          {canManageUsers(user) && (
            <a
              href="/api/backup/excel/"
              className="inline-flex items-center rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-black"
            >
              ⤓ Бэкап в Excel
            </a>
          )}
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
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

      {/* Налог 4% с оборота через терминал */}
      <Card>
        <CardHeader title="Налог 4% (оборот через терминал)" />
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-4">
            <Row label="Оборот (терминал)" value={data.tax.terminal_turnover} />
            <Row label="Налог 4%" value={data.tax.estimate} />
            <Row label="Отложено в резерв" value={data.tax.reserved} />
            <Row label="Не хватает в резерве" value={data.tax.shortfall} bold />
          </div>
        </CardBody>
      </Card>

      {/* Должники + зависшие заказы */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={`Должники (${data.debtors.length})`} />
          <CardBody>
            {data.debtors.length === 0 ? (
              <p className="text-sm text-gray-400">Долгов нет 🎉</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Клиент</Th>
                    <Th>Телефон</Th>
                    <Th className="text-right">Долг</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.debtors.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <Td>
                        <Link to={`/clients/${d.id}`} className="text-brand-accent hover:underline">
                          {d.full_name}
                        </Link>
                      </Td>
                      <Td className="text-gray-500">{d.phone || "—"}</Td>
                      <Td className="text-right font-medium text-red-600">
                        {formatMoney(d.debt)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`Зависшие заказы (${data.stale_orders.length})`} />
          <CardBody>
            {data.stale_orders.length === 0 ? (
              <p className="text-sm text-gray-400">Нет зависших заказов</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Заказ</Th>
                    <Th>Статус</Th>
                    <Th className="text-right">Дней</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.stale_orders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <Td>
                        <Link to={`/orders/${o.id}`} className="text-brand-accent hover:underline">
                          №{o.id} · {o.client_name}
                        </Link>
                      </Td>
                      <Td className="text-gray-500">{o.status}</Td>
                      <Td className="text-right font-medium">{o.days}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Дни рождения */}
      {data.birthdays.length > 0 && (
        <Card>
          <CardHeader title="🎂 Дни рождения (ближайшие 2 недели)" />
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {data.birthdays.map((b) => (
                <Link
                  key={b.id}
                  to={`/clients/${b.id}`}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  {b.full_name} — {formatDate(b.birth_date)}{" "}
                  <span className="text-gray-400">
                    ({b.in_days === 0 ? "сегодня" : `через ${b.in_days} дн.`})
                  </span>
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
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
