import { useState } from "react";
import { useParams } from "react-router-dom";
import { useOrder, useOrderAction } from "@/api/hooks";
import type { OrderItem } from "@/api/types";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Modal,
  Select,
  Spinner,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { balanceColor, formatMoney } from "@/lib/format";

export default function OrderDetailPage() {
  const { id } = useParams();
  const orderId = Number(id);
  const { data: order, isLoading } = useOrder(orderId);
  const actions = useOrderAction(orderId);
  const [addItem, setAddItem] = useState(false);
  const [addExpense, setAddExpense] = useState(false);
  const [issueItem, setIssueItem] = useState<OrderItem | null>(null);
  const [returnItem, setReturnItem] = useState<OrderItem | null>(null);

  if (isLoading || !order) return <Spinner />;
  const c = order.calculation;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Заказ №{order.id}</h1>
          <div className="text-sm text-gray-500">{order.client_name}</div>
        </div>
        <Badge color={order.status.completed ? "green" : "gray"}>{order.status.label}</Badge>
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
        <CardBody className="flex items-center justify-between">
          <span className="text-gray-600">Баланс клиента</span>
          <span className={`text-lg font-semibold ${balanceColor(order.client_balance)}`}>
            {formatMoney(order.client_balance)}
          </span>
        </CardBody>
      </Card>

      {/* Позиции */}
      <Card>
        <CardHeader
          title="Позиции"
          action={<Button onClick={() => setAddItem(true)}>+ Позиция</Button>}
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
                    {it.track_number && (
                      <span className="ml-1 text-xs text-gray-400">({it.track_number})</span>
                    )}
                    {it.returned_qty > 0 && (
                      <Badge color="yellow">возврат {it.returned_qty}</Badge>
                    )}
                  </Td>
                  <Td>{it.qty}</Td>
                  <Td>
                    {it.issued_qty}/{it.qty}
                  </Td>
                  <Td>{formatMoney(it.cost_kzt)}</Td>
                  <Td>{formatMoney(it.sale_price)}</Td>
                  <Td>
                    <Badge color={it.status === "issued" ? "green" : "blue"}>
                      {it.status_display}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex gap-1">
                      <Button variant="ghost" onClick={() => setIssueItem(it)}>
                        Выдать
                      </Button>
                      <Button variant="ghost" onClick={() => setReturnItem(it)}>
                        Возврат
                      </Button>
                    </div>
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
          action={<Button onClick={() => setAddExpense(true)}>+ Расход</Button>}
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
      <ReturnModal
        item={returnItem}
        onClose={() => setReturnItem(null)}
        onSubmit={(body) =>
          actions.addReturn
            .mutateAsync({ iid: returnItem!.id, ...body })
            .then(() => setReturnItem(null))
        }
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
  const set = (k: string, v: string) => setF({ ...f, [k]: v });

  return (
    <Modal open={open} onClose={onClose} title="Новая позиция">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Наименование">
            <Input value={f.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
        </div>
        <Field label="Себестоимость (₸)">
          <Input type="number" value={f.cost_kzt} onChange={(e) => set("cost_kzt", e.target.value)} />
        </Field>
        <Field label="Себес (валюта)">
          <Input type="number" value={f.cost_foreign} onChange={(e) => set("cost_foreign", e.target.value)} />
        </Field>
        <Field label="Валюта">
          <Input value={f.currency} onChange={(e) => set("currency", e.target.value)} placeholder="USD" />
        </Field>
        <Field label="Количество">
          <Input type="number" value={f.qty} onChange={(e) => set("qty", e.target.value)} />
        </Field>
        <Field label="Цена продажи (за ед.)">
          <Input type="number" value={f.sale_price} onChange={(e) => set("sale_price", e.target.value)} />
        </Field>
        <Field label="Доставка (за ед.)">
          <Input type="number" value={f.delivery_price} onChange={(e) => set("delivery_price", e.target.value)} />
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
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
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
  if (!item) return null;
  const maxQty = item.qty - item.returned_qty;

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
          <Input type="number" value={refund} onChange={(e) => setRefund(e.target.value)} />
        </Field>
        <Field label="Дата возврата">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Комментарий">
          <Input value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
        <Button
          className="w-full"
          disabled={!qty || Number(qty) < 1 || Number(qty) > maxQty}
          onClick={() =>
            onSubmit({
              qty: Number(qty),
              disposition,
              refund_amount: refund || undefined,
              return_date: date,
              comment,
            })
          }
        >
          Оформить возврат
        </Button>
      </div>
    </Modal>
  );
}
