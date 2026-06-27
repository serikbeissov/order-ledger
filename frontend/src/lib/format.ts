// Форматирование денег и дат для русскоязычного интерфейса (CLAUDE.md §10).

const moneyFmt = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Сумма в тенге: «1 234 567 ₸». Принимает строку (Decimal с бэкенда) или число. */
export function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return "—";
  return `${moneyFmt.format(num)} ₸`;
}

const dateFmt = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return dateFmt.format(d);
}

/** Цвет баланса клиента: переплата — зелёный, долг — красный, ноль — серый (§5). */
export function balanceColor(value: string | number): string {
  const num = typeof value === "string" ? Number(value) : value;
  if (num > 0) return "text-green-600";
  if (num < 0) return "text-red-600";
  return "text-gray-500";
}
