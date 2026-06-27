import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  useAddMovement,
  useOrder,
  useOrderAction,
  useUpdateOrder,
  useWarehouse,
} from "@/api/hooks";
import type { OrderDetail, OrderItem, WarehouseItem } from "@/api/types";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Modal,
  MoneyInput,
  Select,
  Spinner,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { useAuth } from "@/api/auth";
import { hasPerm } from "@/lib/permissions";
import NotesCard from "@/components/NotesCard";
import { statusBorderClass, statusColor } from "@/lib/status";

const ITEM_STATUSES = [
  { value: "ordered", label: "Заказан" },
  { value: "in_transit", label: "В пути" },
  { value: "received", label: "Получен" },
  { value: "issued", label: "Выдан" },
];

export default function OrderDetailPage() {
  const { id } = useParams();
  const orderId = Number(id);
  const { data: order, isLoading } = useOrder(orderId);
  const actions = useOrderAction(orderId);
  const updateOrder = useUpdateOrder();
  const addMovement = useAddMovement(order?.client ?? 0);
  const [addItem, setAddItem] = useState(false);
  const [addExpense, setAddExpense] = useState(false);
  const [issueItem, setIssueItem] = useState<OrderItem | null>(null);
  const [returnItem, setReturnItem] = useState<OrderItem | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const { user } = useAuth();
  const canEdit = hasPerm(user, "orders.add_order");
  const canPay = hasPerm(user, "clients.add_client");

  if (isLoading || !order) return <Spinner />;
  const c = order.calculation;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Заказ №{order.id}</h1>
          <div className="text-sm text-gray-500">{order.client_name}</div>
        </div>
        <Badge color={statusColor(order.status.code)}>{order.status.label}</Badge>
      </div>

      {/* Блок расчёта (§4.1, §5) */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Выручка" value={formatMoney(c.revenue)} />
        <Stat label="Себестоимость" value={formatMoney(c.cost)} />
        <Stat label="Доп. расходы" value={formatMoney(c.extra_expenses)} />
        <Stat label="Прибыль" value={formatMoney(c.profit)} highlight />
        <Stat label="Доставка" value={formatMoney(c.delivery)} />
        <Stat label="К оплате" value={formatMoney(c.due)} />
      </div>
      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Оплата по заказу</h3>
            {canPay && (
              <Button variant="secondary" onClick={() => setPayOpen(true)}>
                Принять оплату
              </Button>
            )}
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-4">
            <Stat label="К оплате" value={formatMoney(c.due)} />
            <Stat label="Оплачено по заказу" value={formatMoney(order.paid)} />
            <Stat label="Остаток" value={formatMoney(order.remaining)} highlight />
            <Stat label="Баланс клиента" value={formatMoney(order.client_balance)} />
          </div>
        </CardBody>
      </Card>

      {/* Заметка к заказу (видимая и редактируемая) */}
      <NotesCard
        title="Заметка к заказу"
        value={order.notes}
        canEdit={canEdit}
        onSave={(notes) => updateOrder.mutateAsync({ id: orderId, notes })}
      />

      {/* История статуса (§4.4) */}
      <StatusHistory order={order} />

      {/* Позиции */}
      <Card>
        <CardHeader
          title="Позиции"
          action={
            canEdit ? <Button onClick={() => setAddItem(true)}>+ Позиция</Button> : null
          }
        />
        <CardBody>
          <Table>
            <thead>
              <tr>
                <Th>Наименование</Th>
                <Th>Кол-во</Th>
                <Th>Выдано</Th>
                <Th>Себес</Th>
                <Th>Цена</Th>
                <Th>Статус</Th>
                <Th>Действия</Th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it) => (
                <tr key={it.id}>
                  <Td>
                    {it.name}
                    {it.warehouse_item && (
                      <Badge color="blue">со склада</Badge>
                    )}
                    {it.track_number && (
                      <span className="ml-1 text-xs text-gray-400">({it.track_number})</span>
                    )}
                    {it.returned_qty > 0 && (
                      <Badge color="yellow">возврат {it.returned_qty}</Badge>
                    )}
                    {it.returns.filter((r) => r.comment).map((r) => (
                      <div key={r.id} className="text-xs text-gray-400">
                        ↩ {r.disposition_display}: {r.comment}
                      </div>
                    ))}
                  </Td>
                  <Td>{it.qty}</Td>
                  <Td>
                    {it.issued_qty}/{it.qty}
                  </Td>
                  <Td>{formatMoney(it.cost_kzt)}</Td>
                  <Td>{formatMoney(it.sale_price)}</Td>
                  <Td>
                    {canEdit && it.status !== "issued" ? (
                      <Select
                        value={it.status}
                        onChange={(e) => {
                          const status = e.target.value;
                          const body: Record<string, unknown> = { iid: it.id, status };
                          // «Выдан» => считаем все единицы выданными, позиция закрывается
                          if (status === "issued") body.issued_qty = it.qty;
                          actions.updateItem.mutate(body as { iid: number });
                        }}
                        className={`min-w-36 border-2 font-medium ${statusBorderClass(it.status)}`}
                      >
                        {ITEM_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Badge color={statusColor(it.status)}>
                        {it.status === "issued"
                          ? "Выдан · закрыта"
                          : it.status_display}
                      </Badge>
                    )}
                  </Td>
                  <Td>
                    {canEdit ? (
                      <div className="flex gap-1">
                        {it.status !== "issued" && (
                          <Button variant="ghost" onClick={() => setIssueItem(it)}>
                            Выдать
                          </Button>
                        )}
                        <Button variant="ghost" onClick={() => setReturnItem(it)}>
                          Возврат
                        </Button>
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </Td>
                </tr>
              ))}
              {order.items.length === 0 && (
                <tr>
                  <Td className="text-gray-400">Позиций нет — добавьте первую</Td>
                </tr>
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      {/* Доп. расходы */}
      <Card>
        <CardHeader
          title="Доп. расходы"
          action={
            canEdit ? <Button onClick={() => setAddExpense(true)}>+ Расход</Button> : null
          }
        />
        <CardBody>
          <Table>
            <thead>
              <tr>
                <Th>Тип</Th>
                <Th>Комментарий</Th>
                <Th className="text-right">Сумма</Th>
              </tr>
            </thead>
            <tbody>
              {order.expenses.map((e) => (
                <tr key={e.id}>
                  <Td>{e.type_display}</Td>
                  <Td className="text-gray-500">{e.comment}</Td>
                  <Td className="text-right">{formatMoney(e.amount)}</Td>
                </tr>
              ))}
              {order.expenses.length === 0 && (
                <tr>
                  <Td className="text-gray-400">Расходов нет</Td>
                </tr>
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      <AddItemModal
        open={addItem}
        onClose={() => setAddItem(false)}
        onSubmit={(body) => actions.addItem.mutateAsync(body).then(() => setAddItem(false))}
      />
      <AddExpenseModal
        open={addExpense}
        onClose={() => setAddExpense(false)}
        taxHint={order.tax_hint}
        onSubmit={(body) =>
          actions.addExpense.mutateAsync(body).then(() => setAddExpense(false))
        }
      />
      <IssueModal
        item={issueItem}
        onClose={() => setIssueItem(null)}
        onSubmit={(issued_qty) =>
          actions.issue
            .mutateAsync({ iid: issueItem!.id, issued_qty })
            .then(() => setIssueItem(null))
        }
      />
      <PaymentModal
        open={payOpen}
        remaining={order.remaining}
        onClose={() => setPayOpen(false)}
        onSubmit={(body) =>
          addMovement
            .mutateAsync({ ...body, order: orderId, direction: "deposit" })
            .then(() => setPayOpen(false))
        }
      />
      <ReturnModal
        item={returnItem}
        onClose={() => setReturnItem(null)}
        onSubmit={async (body) => {
          const { also_refund, refund_method, ...ret } = body as Record<string, unknown>;
          await actions.addReturn.mutateAsync({ iid: returnItem!.id, ...ret });
          // опционально сразу вернуть деньги клиенту движением refund (§4.2)
          if (also_refund) {
            await addMovement.mutateAsync({
              direction: "refund",
              amount: ret.refund_amount,
              method: refund_method || "cash",
              paid_at: ret.return_date,
              comment: `возврат за «${returnItem!.name}»`,
            });
          }
          setReturnItem(null);
        }}
      />
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-brand-accent" : ""}>
      <CardBody>
        <div className="text-xs uppercase tracking-wide text-gray-400">{label}</div>
        <div className={`mt-1 font-semibold ${highlight ? "text-brand-accent" : ""}`}>{value}</div>
      </CardBody>
    </Card>
  );
}

function StatusHistory({ order }: { order: OrderDetail }) {
  const events = order.status_history;
  return (
    <Card>
      <CardHeader title="История статуса" />
      <CardBody>
        {events.length === 0 ? (
          <p className="text-sm text-gray-400">Пока нет изменений статуса</p>
        ) : (
          <ol className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-accent" />
                <div>
                  <div className="text-sm font-medium text-gray-800">{e.summary}</div>
                  <div className="text-xs text-gray-400">
                    {formatDate(e.created_at)}{" "}
                    {new Date(e.created_at).toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}

function PaymentModal({
  open,
  remaining,
  onClose,
  onSubmit,
}: {
  open: boolean;
  remaining: string;
  onClose: () => void;
  onSubmit: (body: Record<string, unknown>) => Promise<unknown>;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  if (!open) return null;
  return (
    <Modal open onClose={onClose} title="Принять оплату по заказу">
      <div className="space-y-3">
        <div className="rounded-lg bg-gray-50 p-2 text-sm text-gray-600">
          Остаток к оплате: {formatMoney(remaining)}{" "}
          <button className="underline" onClick={() => setAmount(String(Number(remaining)))}>
            подставить
          </button>
        </div>
        <Field label="Сумма (₸)">
          <MoneyInput value={amount} onChange={setAmount} />
        </Field>
        <Field label="Способ">
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="cash">Наличные</option>
            <option value="card">Карта</option>
            <option value="terminal">Терминал</option>
          </Select>
        </Field>
        <Field label="Дата">
          <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
        </Field>
        <Button
          className="w-full"
          disabled={!amount}
          onClick={() =>
            onSubmit({ amount, method, paid_at: paidAt, comment: "оплата по заказу" })
          }
        >
          Принять
        </Button>
      </div>
    </Modal>
  );
}

function AddItemModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (body: Record<string, unknown>) => Promise<unknown>;
}) {
  const [f, setF] = useState({
    name: "",
    cost_kzt: "",
    cost_foreign: "",
    currency: "",
    qty: "1",
    sale_price: "",
    delivery_price: "0",
    country: "",
    site: "",
    track_number: "",
    status: "ordered",
    purchase_date: "",
    delivery_date: "",
  });
  const [warehouseId, setWarehouseId] = useState<number | "">("");
  const { data: warehouse } = useWarehouse();
  const available: WarehouseItem[] = (warehouse?.results ?? []).filter(
    (w) => w.status !== "sold",
  );
  const set = (k: string, v: string) => setF({ ...f, [k]: v });

  /** Префилл полей при выборе товара со склада (продажа со склада). */
  function pickWarehouse(idStr: string) {
    setWarehouseId(idStr ? Number(idStr) : "");
    const w = available.find((x) => String(x.id) === idStr);
    if (w) {
      setF((prev) => ({
        ...prev,
        name: w.name,
        cost_kzt: w.cost_kzt,
        cost_foreign: w.cost_foreign ?? "",
        currency: w.currency,
        country: w.country,
        qty: String(w.qty),
        sale_price: w.planned_price && w.planned_price !== "0.00" ? w.planned_price : prev.sale_price,
        status: "received",
      }));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Новая позиция">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Продать со склада (опционально)">
            <Select value={warehouseId} onChange={(e) => pickWarehouse(e.target.value)}>
              <option value="">— новая позиция (не со склада) —</option>
              {available.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} · {w.qty} шт · себес {w.cost_kzt} ₸ ({w.status_display})
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Наименование">
            <Input value={f.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
        </div>
        <Field label="Себестоимость (₸)">
          <MoneyInput value={f.cost_kzt} onChange={(v) => set("cost_kzt", v)} />
        </Field>
        <Field label="Себес (валюта)">
          <MoneyInput value={f.cost_foreign} onChange={(v) => set("cost_foreign", v)} />
        </Field>
        <Field label="Валюта">
          <Input value={f.currency} onChange={(e) => set("currency", e.target.value)} placeholder="USD" />
        </Field>
        <Field label="Количество">
          <Input type="number" value={f.qty} onChange={(e) => set("qty", e.target.value)} />
        </Field>
        <Field label="Цена продажи (за ед.)">
          <MoneyInput value={f.sale_price} onChange={(v) => set("sale_price", v)} />
        </Field>
        <Field label="Доставка (за ед.)">
          <MoneyInput value={f.delivery_price} onChange={(v) => set("delivery_price", v)} />
        </Field>
        <Field label="Страна">
          <Input value={f.country} onChange={(e) => set("country", e.target.value)} />
        </Field>
        <Field label="Сайт">
          <Input value={f.site} onChange={(e) => set("site", e.target.value)} />
        </Field>
        <Field label="Трек-номер">
          <Input value={f.track_number} onChange={(e) => set("track_number", e.target.value)} />
        </Field>
        <Field label="Статус">
          <Select value={f.status} onChange={(e) => set("status", e.target.value)}>
            <option value="ordered">Заказан</option>
            <option value="in_transit">В пути</option>
            <option value="received">Получен</option>
            <option value="issued">Выдан</option>
          </Select>
        </Field>
        <Field label="Дата покупки">
          <Input type="date" value={f.purchase_date} onChange={(e) => set("purchase_date", e.target.value)} />
        </Field>
        <Field label="Дата доставки">
          <Input type="date" value={f.delivery_date} onChange={(e) => set("delivery_date", e.target.value)} />
        </Field>
      </div>
      <Button
        className="mt-4 w-full"
        disabled={!f.name || !f.cost_kzt || !f.sale_price}
        onClick={() =>
          onSubmit({
            ...f,
            qty: Number(f.qty),
            cost_foreign: f.cost_foreign || null,
            purchase_date: f.purchase_date || null,
            delivery_date: f.delivery_date || null,
            warehouse_item: warehouseId || null,
          })
        }
      >
        Добавить позицию
      </Button>
    </Modal>
  );
}

function AddExpenseModal({
  open,
  onClose,
  onSubmit,
  taxHint,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (body: Record<string, unknown>) => Promise<unknown>;
  taxHint: string;
}) {
  const [type, setType] = useState("taxi");
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");

  return (
    <Modal open={open} onClose={onClose} title="Доп. расход">
      <div className="space-y-3">
        <Field label="Тип">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="taxi">Такси</option>
            <option value="tax">Налог</option>
            <option value="bank_fee">Комиссия банка</option>
            <option value="other">Прочее</option>
          </Select>
        </Field>
        {type === "tax" && (
          <div className="rounded-lg bg-yellow-50 p-2 text-xs text-yellow-800">
            Подсказка по налогу 4% (терминал): {formatMoney(taxHint)}{" "}
            <button className="underline" onClick={() => setAmount(taxHint)}>
              подставить
            </button>
          </div>
        )}
        <Field label="Сумма (₸)">
          <MoneyInput value={amount} onChange={setAmount} />
        </Field>
        <Field label="Комментарий">
          <Input value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
        <Button
          className="w-full"
          disabled={!amount}
          onClick={() => onSubmit({ type, amount, comment })}
        >
          Добавить
        </Button>
      </div>
    </Modal>
  );
}

function IssueModal({
  item,
  onClose,
  onSubmit,
}: {
  item: OrderItem | null;
  onClose: () => void;
  onSubmit: (issued_qty: number) => Promise<unknown>;
}) {
  const [qty, setQty] = useState("");
  if (!item) return null;
  return (
    <Modal open onClose={onClose} title={`Выдача: ${item.name}`}>
      <div className="space-y-3">
        <div className="text-sm text-gray-500">
          Уже выдано {item.issued_qty} из {item.qty}. Укажите итоговое число выданных единиц.
        </div>
        <Field label="Выдано единиц (0..кол-во)">
          <Input
            type="number"
            min={0}
            max={item.qty}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </Field>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => onSubmit(item.qty)}>
            Выдать всё
          </Button>
          <Button className="flex-1" disabled={qty === ""} onClick={() => onSubmit(Number(qty))}>
            Сохранить
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ReturnModal({
  item,
  onClose,
  onSubmit,
}: {
  item: OrderItem | null;
  onClose: () => void;
  onSubmit: (body: Record<string, unknown>) => Promise<unknown>;
}) {
  const [qty, setQty] = useState("1");
  const [disposition, setDisposition] = useState("restocked");
  const [refund, setRefund] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [comment, setComment] = useState("");
  const [alsoRefund, setAlsoRefund] = useState(false);
  const [refundMethod, setRefundMethod] = useState("cash");
  if (!item) return null;
  const maxQty = item.qty - item.returned_qty;
  // эффективная сумма возврата клиенту: введённая или цена × кол-во
  const effectiveRefund = refund || String(Number(item.sale_price) * Number(qty || 0));

  return (
    <Modal open onClose={onClose} title={`Возврат: ${item.name}`}>
      <div className="space-y-3">
        <div className="text-sm text-gray-500">
          Доступно к возврату: {maxQty} из {item.qty}.
        </div>
        <Field label="Количество">
          <Input type="number" min={1} max={maxQty} value={qty} onChange={(e) => setQty(e.target.value)} />
        </Field>
        <Field label="Что с товаром">
          <Select value={disposition} onChange={(e) => setDisposition(e.target.value)}>
            <option value="restocked">На склад</option>
            <option value="supplier_refund">Возврат поставщику</option>
            <option value="write_off">Списание / брак</option>
          </Select>
        </Field>
        <Field label="Сумма возврата клиенту (пусто = цена × кол-во)">
          <MoneyInput value={refund} onChange={setRefund} />
        </Field>
        <Field label="Дата возврата">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Комментарий">
          <Input value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={alsoRefund}
            onChange={(e) => setAlsoRefund(e.target.checked)}
          />
          Сразу вернуть деньги клиенту ({formatMoney(effectiveRefund)})
        </label>
        {alsoRefund && (
          <Field label="Способ возврата">
            <Select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)}>
              <option value="cash">Наличные</option>
              <option value="card">Карта</option>
              <option value="terminal">Терминал</option>
            </Select>
          </Field>
        )}
        <Button
          className="w-full"
          disabled={!qty || Number(qty) < 1 || Number(qty) > maxQty}
          onClick={() =>
            onSubmit({
              qty: Number(qty),
              disposition,
              refund_amount: alsoRefund ? effectiveRefund : refund || undefined,
              return_date: date,
              comment,
              also_refund: alsoRefund,
              refund_method: refundMethod,
            })
          }
        >
          Оформить возврат
        </Button>
      </div>
    </Modal>
  );
}
