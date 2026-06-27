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
  client_balance: Money;
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
  comment: string;
  expense_date: string;
  is_recurring: boolean;
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
}
