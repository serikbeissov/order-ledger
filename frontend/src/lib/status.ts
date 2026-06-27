import type { BadgeColor } from "@/components/ui";

// Цвета логистических статусов (позиция/заказ):
// заказан — жёлтый, в пути — оранжевый, получен — синий, выдан — зелёный.
// Статусы НЕ используют Signal Orange (#ff682c) — это акцент данных.
// «В пути» — янтарный (amber), чтобы не сливаться с акцентом.
export function statusColor(code: string): BadgeColor {
  switch (code) {
    case "ordered":
      return "yellow";
    case "in_transit":
      return "amber";
    case "received":
      return "blue";
    case "issued":
      return "green";
    default:
      return "gray";
  }
}

// Классы цветной рамки + текста для выпадающего списка статуса позиции.
export function statusBorderClass(code: string): string {
  switch (code) {
    case "ordered":
      return "border-yellow-400 text-yellow-800 focus:border-yellow-500 focus:ring-yellow-400";
    case "in_transit":
      return "border-amber-500 text-amber-800 focus:border-amber-600 focus:ring-amber-500";
    case "received":
      return "border-blue-400 text-blue-800 focus:border-blue-500 focus:ring-blue-400";
    case "issued":
      return "border-green-400 text-green-800 focus:border-green-500 focus:ring-green-400";
    default:
      return "";
  }
}
