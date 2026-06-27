import { useState } from "react";
import { Card, CardBody, CardHeader, Field, Input, Spinner, Table, Td, Th } from "@/components/ui";
import { useAuth } from "@/api/auth";
import { useDashboard } from "@/api/hooks";
import { canManageUsers, hasPerm, PERM } from "@/lib/permissions";
import { formatMoney } from "@/lib/format";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(period: string): string {
  const d = new Date(`${period}-01`);
  return d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

export default function ReportsPage() {
  const { user } = useAuth();
  const isAdmin = canManageUsers(user);
  const canSeeReport = hasPerm(user, PERM.dashboard);
  const [period, setPeriod] = useState(currentMonth());
  const [allTime, setAllTime] = useState(true);
  const [backupMonth, setBackupMonth] = useState(currentMonth());

  const backupHref =
    allTime || !backupMonth
      ? "/api/backup/excel/"
      : `/api/backup/excel/?period=${backupMonth}`;

  const csv = [
    { href: "/api/clients/export/", label: "Клиенты (CSV)", show: hasPerm(user, "clients.view_client") },
    { href: "/api/orders/export/", label: "Заказы (CSV)", show: hasPerm(user, "orders.view_order") },
    { href: "/api/expenses/export/", label: "Расходы (CSV)", show: hasPerm(user, "expenses.view_expense") },
  ];

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Отчёты</h1>
      </div>

      {/* Онлайн-вид сводного отчёта + печать/PDF */}
      {canSeeReport && (
        <SummaryReport period={period} setPeriod={setPeriod} />
      )}

      {/* Бэкап в Excel (только админ) */}
      {isAdmin && (
        <Card className="no-print">
          <CardHeader title="Бэкап в Excel" />
          <CardBody className="space-y-4">
            <p className="text-sm text-slate">
              Полный снимок базы в .xlsx — по листу на сущность, с вычисляемыми
              полями (баланс, прибыль, оплата, остатки).
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={allTime} onChange={(e) => setAllTime(e.target.checked)} />
              За всё время
            </label>
            {!allTime && (
              <Field label="За месяц">
                <Input
                  type="month"
                  value={backupMonth}
                  onChange={(e) => setBackupMonth(e.target.value)}
                  className="max-w-xs"
                />
              </Field>
            )}
            <a
              href={backupHref}
              className="inline-flex w-fit items-center rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-black"
            >
              ⤓ Скачать бэкап{allTime ? " (за всё время)" : ` за ${backupMonth}`}
            </a>
          </CardBody>
        </Card>
      )}

      {/* CSV-выгрузки */}
      <Card className="no-print">
        <CardHeader title="Выгрузки CSV" />
        <CardBody>
          <p className="mb-3 text-sm text-slate">Отдельные таблицы для сверки (Excel).</p>
          <div className="flex flex-wrap gap-2">
            {csv.filter((c) => c.show).map((c) => (
              <a
                key={c.href}
                href={c.href}
                className="inline-flex items-center rounded-full bg-fog px-5 py-2 text-sm font-medium text-carbon hover:bg-chalk"
              >
                {c.label}
              </a>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between border-b border-gray-100 py-1.5">
      <span className={bold ? "font-medium text-carbon" : "text-graphite"}>{label}</span>
      <span className={bold ? "font-display font-semibold" : ""}>{value}</span>
    </div>
  );
}

function SummaryReport({
  period,
  setPeriod,
}: {
  period: string;
  setPeriod: (v: string) => void;
}) {
  const { data, isLoading } = useDashboard(period);

  return (
    <Card>
      <div className="no-print">
        <CardHeader
          title="Сводный отчёт"
          action={
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              />
              <button
                onClick={() => window.print()}
                className="inline-flex items-center rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-black"
              >
                🖶 Печать / PDF
              </button>
            </div>
          }
        />
      </div>

      <CardBody>
        {isLoading || !data ? (
          <Spinner />
        ) : (
          <div className="print-area space-y-6">
            <div>
              <h2 className="font-display text-xl font-bold">
                Сводный отчёт — {monthLabel(period)}
              </h2>
              <div className="text-xs text-slate">Maison · order-ledger</div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase text-slate">
                  Деньги на счету
                </h3>
                <Line label="Всего" value={formatMoney(data.money_on_account.total)} bold />
                <Line label="Деньги клиентов" value={formatMoney(data.money_on_account.client_money)} />
                <Line label="Инвестиции" value={formatMoney(data.money_on_account.investments)} />
                <Line label="Деньги компании" value={formatMoney(data.money_on_account.company_money)} />
                <Line label="— свободные" value={formatMoney(data.money_on_account.free_money)} />
                <Line label="— в резервах" value={formatMoney(data.money_on_account.reserves.total)} />
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase text-slate">
                  P&L за период
                </h3>
                <Line label="Прибыль с заказов" value={formatMoney(data.pnl.profit_from_orders)} />
                <Line label="Постоянные расходы" value={formatMoney(data.pnl.fixed_expenses)} />
                <Line label="Чистая прибыль" value={formatMoney(data.pnl.net_profit)} bold />
                <Line label="Завершено заказов" value={String(data.pnl.orders_count)} />
                <Line label="Капитал склада" value={formatMoney(data.frozen_capital)} />
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase text-slate">
                  Клиенты
                </h3>
                <Line label="Долги клиентов" value={formatMoney(data.client_debts)} />
                <Line label="Переплаты клиентов" value={formatMoney(data.client_overpayments)} />
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase text-slate">
                  Налог 4% (терминал)
                </h3>
                <Line label="Оборот через терминал" value={formatMoney(data.tax.terminal_turnover)} />
                <Line label="Налог 4%" value={formatMoney(data.tax.estimate)} />
                <Line label="Отложено в резерв" value={formatMoney(data.tax.reserved)} />
                <Line label="Не хватает" value={formatMoney(data.tax.shortfall)} bold />
              </div>
            </div>

            {data.debtors.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase text-slate">
                  Должники
                </h3>
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
                      <tr key={d.id}>
                        <Td>{d.full_name}</Td>
                        <Td>{d.phone || "—"}</Td>
                        <Td className="text-right">{formatMoney(d.debt)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
