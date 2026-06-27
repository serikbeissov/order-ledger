// Лёгкий набор UI-компонентов в стиле shadcn/ui на Tailwind.
import { clsx } from "clsx";
import { useRef } from "react";
import { groupDigits, parseMoneyInput } from "@/lib/format";
import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("rounded-lg border border-chalk bg-paper shadow-sm", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
      <h3 className="font-semibold text-gray-800">{title}</h3>
      {action}
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("p-5", className)}>{children}</div>;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  // Пилюли: primary — Carbon-filled, secondary — рамка Carbon (по гайду).
  const styles = {
    primary: "bg-brand text-white hover:bg-black",
    secondary: "border border-carbon/20 bg-white text-carbon hover:bg-fog",
    ghost: "text-graphite hover:bg-fog",
    danger: "bg-red-600 text-white hover:bg-red-700",
  }[variant];
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-medium transition disabled:opacity-50",
        styles,
        className,
      )}
      {...props}
    />
  );
}

// Базовые стили полей ввода (рамка, отступы, фокус) — общие для Input/Select/Textarea.
const CONTROL_BASE =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(CONTROL_BASE, className)} {...props} />;
}

/**
 * Денежный ввод с разделением по тысячам (CLAUDE.md §10).
 * Показывает «100 000», наружу отдаёт сырое число строкой ("100000").
 */
export function MoneyInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (raw: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      inputMode="decimal"
      value={groupDigits(value)}
      placeholder={placeholder}
      onChange={(e) => onChange(parseMoneyInput(e.target.value))}
      className={clsx(CONTROL_BASE, className)}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(CONTROL_BASE, className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={clsx(CONTROL_BASE, "bg-white", className)} {...props} />;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}

export type BadgeColor =
  | "gray"
  | "green"
  | "yellow"
  | "orange"
  | "blue"
  | "red";

export function Badge({
  children,
  color = "gray",
}: {
  children: ReactNode;
  color?: BadgeColor;
}) {
  const styles = {
    gray: "bg-gray-100 text-gray-700",
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellow-100 text-yellow-700",
    orange: "bg-orange-100 text-orange-700",
    blue: "bg-blue-100 text-blue-700",
    red: "bg-red-100 text-red-700",
  }[color];
  return (
    <span className={clsx("inline-block rounded-full px-2 py-0.5 text-xs font-medium", styles)}>
      {children}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const downOnBackdrop = useRef(false);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      // Закрываем только если и нажатие, и отпускание были на фоне.
      // Иначе выделение текста с «выносом» курсора на фон закрывало бы окно.
      onMouseDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget;
      }}
      onMouseUp={(e) => {
        if (downOnBackdrop.current && e.target === e.currentTarget) onClose();
        downOnBackdrop.current = false;
      }}
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function Spinner() {
  return <div className="py-10 text-center text-gray-400">Загрузка…</div>;
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th className={clsx("border-b border-gray-200 px-3 py-2 text-left font-medium text-gray-500", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={clsx("border-b border-gray-100 px-3 py-2", className)}>{children}</td>;
}
