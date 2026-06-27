import { useState } from "react";
import { Card, CardBody, CardHeader, Field, Input } from "@/components/ui";
import { useAuth } from "@/api/auth";
import { canManageUsers, hasPerm } from "@/lib/permissions";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const isAdmin = canManageUsers(user);
  const [allTime, setAllTime] = useState(true);
  const [month, setMonth] = useState(currentMonth());

  const backupHref =
    allTime || !month
      ? "/api/backup/excel/"
      : `/api/backup/excel/?period=${month}`;

  const csv: { href: string; label: string; show: boolean }[] = [
    { href: "/api/clients/export/", label: "Клиенты (CSV)", show: hasPerm(user, "clients.view_client") },
    { href: "/api/orders/export/", label: "Заказы (CSV)", show: hasPerm(user, "orders.view_order") },
    { href: "/api/expenses/export/", label: "Расходы (CSV)", show: hasPerm(user, "expenses.view_expense") },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Отчёты</h1>

      {/* Полный бэкап в Excel (только админ) */}
      {isAdmin && (
        <Card>
          <CardHeader title="Бэкап в Excel" />
          <CardBody className="space-y-4">
            <p className="text-sm text-gray-500">
              Полный снимок базы в один файл .xlsx — по листу на каждую сущность,
              с вычисляемыми полями (баланс, прибыль, оплата, остатки).
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allTime}
                onChange={(e) => setAllTime(e.target.checked)}
              />
              За всё время
            </label>
            {!allTime && (
              <Field label="За месяц (операционные листы будут ограничены периодом)">
                <Input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="max-w-xs"
                />
              </Field>
            )}
            <a
              href={backupHref}
              className="inline-flex w-fit items-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-black"
            >
              ⤓ Скачать бэкап{allTime ? " (за всё время)" : ` за ${month}`}
            </a>
          </CardBody>
        </Card>
      )}

      {/* Выгрузки в CSV (Excel-совместимо) */}
      <Card>
        <CardHeader title="Выгрузки CSV" />
        <CardBody>
          <p className="mb-3 text-sm text-gray-500">
            Отдельные таблицы для сверки (открываются в Excel).
          </p>
          <div className="flex flex-wrap gap-2">
            {csv.filter((c) => c.show).map((c) => (
              <a
                key={c.href}
                href={c.href}
                className="inline-flex items-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200"
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
