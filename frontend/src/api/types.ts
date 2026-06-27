// Типы данных API (CLAUDE.md §3, §7). Деньги приходят строками (Decimal).

export type Money = string;

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
  [extra: string]: unknown; // напр. frozen_capital, pool
}

export interface ClientListItem {
  id: number;
  full_name: string;
  phone: string;
  birth_date: string | null;
  is_archived: boolean;
  balance: Money;
}

export interface BalanceMovement {
  id: number;
  client: number;
  order: number | null;
  direction: "deposit" | "refund";
  direction_display: string;
  amount: Money;
  method: "cash" | "card" | "terminal";
  method_display: string;
  comment: string;
  paid_at: string;
  created_at: string;
}

export interface ClientDetail extends ClientListItem {
  notes: string;
  created_at: string;
  deposits: Money;
  refunds: Money;
  due: Money;
  movements: BalanceMovement[];
}

export interface OrderItemReturn {
  id: number;
  order_item: number;
  qty: number;
  disposition: "restocked" | "supplier_refund" | "write_off";
  disposition_display: string;
  refund_amount: Money;
  return_date: string;
  comment: string;
}

export interface OrderItem {
  id: number;
  order: number;
  warehouse_item: number | null;
  name: string;
  cost_foreign: Money | null;
  currency: string;
  cost_kzt: Money;
  qty: number;
  issued_qty: number;
  sale_price: Money;
  delivery_price: Money;
  country: string;
  site: string;
  track_number: string;
  status: "ordered" | "in_transit" | "received" | "issued";
  status_display: string;
  purchase_date: string | null;
  delivery_date: string | null;
  returns: OrderItemReturn[];
  returned_qty: number;
  sold_qty: number;
  revenue: Money;
  delivery: Money;
}

export interface OrderExpense {
  id: number;
  order: number;
  type: "taxi" | "tax" | "bank_fee" | "other";
  type_display: string;
  amount: Money;
  comment: string;
}

export interface OrderStatus {
  code: string;
  label: string;
  issued_qty: number;
  total_qty: number;
  completed: boolean;
}

export interface OrderCalculation {
  revenue: Money;
  cost: Money;
  delivery: Money;
  extra_expenses: Money;
  profit: Money;
  due: Money;
}

export interface OrderListItem {
  id: number;
  client: number;
  client_name: string;
  is_archived: boolean;
  created_at: string;
  profit: Money;
  status: OrderStatus;
}

export interface OrderStatusEvent {
  id: number;
  code: string;
  summary: string;
  issued_qty: number;
  total_qty: number;
  created_at: string;
}

export interface OrderDetail {
  id: number;
  client: number;
  client_name: string;
  created_by: number | null;
  notes: string;
  is_archived: boolean;
  created_at: string;
  items: OrderItem[];
  expenses: OrderExpense[];
  calculation: OrderCalculation;
  status: OrderStatus;
  status_history: OrderStatusEvent[];
  client_balance: Money;
  paid: Money;
  remaining: Money;
  tax_hint: Money;
}

export interface WarehouseItem {
  id: number;
  name: string;
  country: string;
  cost_foreign: Money | null;
  currency: string;
  cost_kzt: Money;
  qty: number;
  delivery_cost: Money;
  other_costs: Money;
  planned_price: Money;
  status: "in_stock" | "reserved" | "sold";
  status_display: string;
  purchase_date: string | null;
  delivery_date: string | null;
  notes: string;
  created_at: string;
  full_cost: Money;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  is_recurring: boolean;
}

export interface Expense {
  id: number;
  category: number;
  category_name: string;
  amount: Money;
  method: "cash" | "card" | "terminal";
  method_display: string;
  comment: string;
  expense_date: string;
  period: string | null;
  recurring: number | null;
  recurring_name: string | null;
  is_recurring: boolean;
}

export interface RecurringExpense {
  id: number;
  name: string;
  category: number;
  category_name: string;
  planned_amount: Money | null;
  method: "cash" | "card" | "terminal";
  method_display: string;
  is_active: boolean;
  notes: string;
}

/** Непогашенный за месяц пункт-напоминание (для баннера/списка). */
export interface RecurringDueItem {
  id: number;
  name: string;
  category: number;
  category_name: string;
  planned_amount: Money | null;
  method: "cash" | "card" | "terminal";
}

export interface Investor {
  id: number;
  name: string;
  notes: string;
  investments: Investment[];
}

export interface Investment {
  id: number;
  investor: number;
  investor_name: string;
  direction: "in" | "return";
  direction_display: string;
  amount: Money;
  method: "cash" | "card" | "terminal";
  comment: string;
  moved_at: string;
}

export interface ReserveMovement {
  id: number;
  reserve: number;
  direction: "set_aside" | "release";
  direction_display: string;
  amount: Money;
  comment: string;
  moved_at: string;
}

export interface Reserve {
  id: number;
  name: string;
  kind: "tax" | "monthly" | "other";
  kind_display: string;
  target_amount: Money | null;
  comment: string;
  balance: Money;
  movements: ReserveMovement[];
}

export interface Dashboard {
  period: string;
  money_on_account: {
    total: Money;
    client_money: Money;
    investments: Money;
    company_money: Money;
    reserves: { total: Money; tax: Money; monthly: Money; other: Money };
    free_money: Money;
    reserves_exceed_company: boolean;
  };
  money_by_method: { cash: Money; card: Money; terminal: Money };
  reserve_target_hints: { tax: Money; monthly: Money };
  pnl: {
    profit_from_orders: Money;
    fixed_expenses: Money;
    net_profit: Money;
    orders_count: number;
  };
  frozen_capital: Money;
  client_debts: Money;
  client_overpayments: Money;
  debtors: { id: number; full_name: string; phone: string; debt: Money }[];
  stale_orders: {
    id: number;
    client_name: string;
    status: string;
    created_at: string;
    days: number;
  }[];
  birthdays: { id: number; full_name: string; birth_date: string; in_days: number }[];
  tax: {
    terminal_turnover: Money;
    estimate: Money;
    reserved: Money;
    shortfall: Money;
  };
}

// --- Пользователи, роли, права (управление доступом) ------------------------
export interface UserAccount {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  role: "admin" | "manager" | "staff" | null;
  groups: { id: number; name: string }[];
  permissions: string[];
  group_id_list: number[];
  own_permission_ids: number[];
}

export interface Group {
  id: number;
  name: string;
  permissions: string[]; // ["app.codename", …]
  current_permission_ids: number[];
  user_count: number;
}

export interface CatalogPermission {
  id: number;
  codename: string; // "app.codename"
  action: "view" | "add" | "change" | "delete";
  action_label: string;
}

export interface PermissionCatalogEntry {
  app_label: string;
  model: string;
  model_label: string;
  permissions: CatalogPermission[];
}

export interface AuditLog {
  id: number;
  created_at: string;
  user: number | null;
  username: string;
  action: "create" | "update" | "delete";
  action_display: string;
  app_label: string;
  model: string;
  model_label: string;
  object_id: string;
  object_repr: string;
  changes: Record<string, { from?: unknown; to?: unknown; action?: string; ids?: number[] }>;
}
