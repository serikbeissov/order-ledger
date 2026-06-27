import { useState } from "react";
import { useAudit } from "@/api/hooks";
import type { AuditLog } from "@/api/types";
import { Badge, Card, Select, Spinner, Table, Td, Th } from "@/components/ui";
import { formatDate } from "@/lib/format";

const ACTION_COLOR: Record<string, "green" | "blue" | "red"> = {
  create: "green",
  update: "blue",
  delete: "red",
};

const MODELS = [
  ["", "Все сущности"],
  ["client", "Клиенты"],
  ["balancemovement", "Движения баланса"],
  ["order", "Заказы"],
  ["orderitem", "Позиции"],
  ["return", "Возвраты"],
  ["expense", "Расходы"],
  ["recurringexpense", "Напоминания"],
  ["warehouseitem", "Склад"],
  ["investment", "Инвестиции"],
  ["reservemovement", "Движения резервов"],
  ["user", "Пользователи"],
  ["group", "Роли"],
];

function changesText(log: AuditLog): string {
  const parts: string[] = [];
  for (const [field, c] of Object.entries(log.changes)) {
    if (c.action) {
      parts.push(`${field}: ${c.action} ${(c.ids ?? []).join(", ")}`);
    } else if ("from" in c) {
      parts.push(`${field}: ${fmt(c.from)} → ${fmt(c.to)}`);
    } else {
      parts.push(`${field}: ${fmt(c.to)}`);
    }
  }
  return parts.join("; ");
}

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === "") return "∅";
  return String(v);
}

export default function AuditPage() {
  const [model, setModel] = useState("");
  const [action, setAction] = useState("");
  const params: Record<string, string> = {};
  if (model) params.model = model;
  if (action) params.action = action;
  const { data, isLoading } = useAudit(params);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Аудит изменений</h1>
      <p className="text-sm text-gray-500">
        Кто, когда и что менял. Журнал только для чтения.
      </p>

      <div className="flex gap-2">
        <Select value={model} onChange={(e) => setModel(e.target.value)} className="max-w-xs">
          {MODELS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <Select value={action} onChange={(e) => setAction(e.target.value)} className="max-w-xs">
          <option value="">Все действия</option>
          <option value="create">Создание</option>
          <option value="update">Изменение</option>
          <option value="delete">Удаление</option>
        </Select>
      </div>

      <Card>
        {isLoading ? (
          <Spinner />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Когда</Th>
                <Th>Кто</Th>
                <Th>Действие</Th>
                <Th>Объект</Th>
                <Th>Изменения</Th>
              </tr>
            </thead>
            <tbody>
              {data?.results.map((log) => (
                <tr key={log.id}>
                  <Td className="whitespace-nowrap text-gray-500">
                    {formatDate(log.created_at)}{" "}
                    {new Date(log.created_at).toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Td>
                  <Td>{log.username || "—"}</Td>
                  <Td>
                    <Badge color={ACTION_COLOR[log.action]}>{log.action_display}</Badge>
                  </Td>
                  <Td>
                    <span className="text-gray-400">{log.model_label}</span> {log.object_repr}
                  </Td>
                  <Td className="max-w-md text-xs text-gray-600">{changesText(log)}</Td>
                </tr>
              ))}
              {data?.results.length === 0 && (
                <tr>
                  <Td className="text-gray-400">Записей нет</Td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
