import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  useCreateExpense,
  useCreateRecurring,
  useDeleteRecurring,
  useExpenseCategories,
  useExpenses,
  useRecurringExpenses,
  useUpdateRecurring,
} from "@/api/hooks";
import type { RecurringExpense } from "@/api/types";
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

const METHOD_LABEL: Record<string, string> = {
  cash: "Наличные",
  card: "Карта",
  terminal: "Терминал",
};

/** «2026-06-01» → «июнь 2026». */
function formatMonth(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

export default function ExpensesPage() {
  const [openExpense, setOpenExpense] = useState(false);
  const [prefill, setPrefill] = useState<RecurringExpense | null>(null);
  const [category, setCategory] = useState("");
  const { data, isLoading } = useExpenses(category ? { category } : undefined);
  const { data: cats } = useExpenseCategories();
  const { user } = useAuth();
  const canCreate = hasPerm(user, "expenses.add_expense");
  const location = useLocation();

  // Открыть форму записи факта сразу, если пришли по кнопке «Записать».
  useEffect(() => {
    const state = location.state as { openCreate?: boolean } | null;
    if (state?.openCreate && canCreate) setOpenExpense(true);
  }, [location.state, canCreate]);

  function recordFor(tmpl: RecurringExpense) {
    setPrefill(tmpl);
    setOpenExpense(true);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Расходы</h1>

      {/* Секция 1 — ежемесячные напоминания (создаём сами) */}
      <RecurringSection canManage={canCreate} onRecord={recordFor} />

      {/* Секция 2 — фактические расходы */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Расходы (факт)</h2>
          <div className="flex gap-2">
            <a
              href="/api/expenses/export/"
              className="inline-flex items-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200"
            >
              Экспорт CSV
            </a>
            {canCreate && (
              <Button
                onClick={() => {
                  setPrefill(null);
                  setOpenExpense(true);
                }}
              >
                + Записать расход
              </Button>
            )}
          </div>
        </div>

        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mb-3 max-w-xs"
        >
          <option value="">Все категории</option>
          {cats?.results.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <Card>
          {isLoading ? (
            <Spinner />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Выдано</Th>
                  <Th>За месяц</Th>
                  <Th>Категория</Th>
                  <Th>Способ</Th>
                  <Th>Комментарий</Th>
                  <Th className="text-right">Сумма</Th>
                </tr>
              </thead>
              <tbody>
                {data?.results.map((e) => (
                  <tr key={e.id}>
                    <Td>{formatDate(e.expense_date)}</Td>
                    <Td>{formatMonth(e.period)}</Td>
                    <Td>
                      {e.category_name}
                      {e.recurring_name && (
                        <span className="ml-1 text-xs text-gray-400">
                          ({e.recurring_name})
                        </span>
                      )}
                    </Td>
                    <Td>{METHOD_LABEL[e.method] ?? e.method}</Td>
                    <Td className="text-gray-500">{e.comment}</Td>
                    <Td className="text-right">{formatMoney(e.amount)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      {openExpense && (
        <ExpenseModal
          prefill={prefill}
          onClose={() => {
            setOpenExpense(false);
            setPrefill(null);
          }}
        />
      )}
    </div>
  );
}

// --- Секция ежемесячных напоминаний ----------------------------------------
function RecurringSection({
  canManage,
  onRecord,
}: {
  canManage: boolean;
  onRecord: (tmpl: RecurringExpense) => void;
}) {
  const { data, isLoading } = useRecurringExpenses();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<RecurringExpense | null>(null);
  const items = data?.results ?? [];

  return (
    <Card>
      <CardHeader
        title="Ежемесячные напоминания"
        action={
          canManage ? <Button onClick={() => setOpen(true)}>+ Напоминание</Button> : null
        }
      />
      <CardBody>
        <p className="mb-3 text-sm text-gray-500">
          Заведите, что платите каждый месяц (аренда, зарплата, СММ…). Это
          напоминалка — деньги выдаёте по факту кнопкой «Выдать», тогда пункт за
          месяц гаснет.
        </p>
        {isLoading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-400">Напоминаний пока нет</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Название</Th>
                <Th>Категория</Th>
                <Th>Ориентир</Th>
                <Th>Способ</Th>
                <Th>Активно</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className={r.is_active ? "" : "opacity-50"}>
                  <Td className="font-medium">{r.name}</Td>
                  <Td>{r.category_name}</Td>
                  <Td>{r.planned_amount ? formatMoney(r.planned_amount) : "—"}</Td>
                  <Td>{METHOD_LABEL[r.method] ?? r.method}</Td>
                  <Td>
                    {r.is_active ? (
                      <Badge color="green">да</Badge>
                    ) : (
                      <Badge color="gray">нет</Badge>
                    )}
                  </Td>
                  <Td>
                    <div className="flex gap-1">
                      {canManage && r.is_active && (
                        <Button variant="ghost" onClick={() => onRecord(r)}>
                          Выдать
                        </Button>
                      )}
                      {canManage && (
                        <Button variant="ghost" onClick={() => setEdit(r)}>
                          Изменить
                        </Button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </CardBody>
      {open && <RecurringModal onClose={() => setOpen(false)} />}
      {edit && <RecurringModal item={edit} onClose={() => setEdit(null)} />}
    </Card>
  );
}

function RecurringModal({
  item,
  onClose,
}: {
  item?: RecurringExpense;
  onClose: () => void;
}) {
  const create = useCreateRecurring();
  const update = useUpdateRecurring();
  const remove = useDeleteRecurring();
  const { data: cats } = useExpenseCategories();
  const [f, setF] = useState({
    name: item?.name ?? "",
    category: item ? String(item.category) : "",
    planned_amount: item?.planned_amount ?? "",
    method: item?.method ?? "cash",
    is_active: item?.is_active ?? true,
    notes: item?.notes ?? "",
  });

  async function save() {
    const body = {
      name: f.name,
      category: Number(f.category),
      planned_amount: f.planned_amount || null,
      method: f.method,
      is_active: f.is_active,
      notes: f.notes,
    };
    if (item) await update.mutateAsync({ id: item.id, ...body });
    else await create.mutateAsync(body as never);
    onClose();
  }

  async function handleDelete() {
    if (!item) return;
    if (!confirm(`Удалить напоминание «${item.name}»?`)) return;
    await remove.mutateAsync(item.id);
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={item ? "Напоминание" : "Новое напоминание"}>
      <div className="space-y-3">
        <Field label="Название (напр. «Аренда офиса», «Зарплата СММ»)">
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label="Категория">
          <Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            <option value="">— выберите —</option>
            {cats?.results.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ориентир суммы (₸, опц.)">
          <MoneyInput
            value={String(f.planned_amount ?? "")}
            onChange={(v) => setF({ ...f, planned_amount: v })}
          />
        </Field>
        <Field label="Способ (обычно)">
          <Select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value as RecurringExpense["method"] })}>
            <option value="cash">Наличные</option>
            <option value="card">Карта</option>
            <option value="terminal">Терминал</option>
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={f.is_active}
            onChange={(e) => setF({ ...f, is_active: e.target.checked })}
          />
          Активно (напоминать каждый месяц)
        </label>
        <div className="flex gap-2">
          {item && (
            <Button variant="danger" onClick={handleDelete}>
              Удалить
            </Button>
          )}
          <Button className="flex-1" disabled={!f.name || !f.category} onClick={save}>
            Сохранить
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// --- Запись фактического расхода --------------------------------------------
function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function ExpenseModal({
  prefill,
  onClose,
}: {
  prefill: RecurringExpense | null;
  onClose: () => void;
}) {
  const create = useCreateExpense();
  const { data: cats } = useExpenseCategories();
  const { data: recurring } = useRecurringExpenses();
  const [f, setF] = useState({
    category: prefill ? String(prefill.category) : "",
    recurring: prefill ? String(prefill.id) : "",
    amount: prefill?.planned_amount ?? "",
    method: prefill?.method ?? "cash",
    comment: "",
    expense_date: new Date().toISOString().slice(0, 10),
    month: currentMonth(),
  });

  /** При выборе напоминания — префилл категории/суммы/способа. */
  function pickRecurring(idStr: string) {
    const r = recurring?.results.find((x) => String(x.id) === idStr);
    setF((prev) => ({
      ...prev,
      recurring: idStr,
      category: r ? String(r.category) : prev.category,
      amount: r?.planned_amount ?? prev.amount,
      method: r ? r.method : prev.method,
    }));
  }

  async function submit() {
    await create.mutateAsync({
      category: Number(f.category),
      recurring: f.recurring ? Number(f.recurring) : null,
      amount: f.amount,
      method: f.method,
      comment: f.comment,
      expense_date: f.expense_date,
      period: f.month ? `${f.month}-01` : null,
    } as never);
    onClose();
  }

  return (
    <Modal open onClose={onClose} title="Записать расход / выдачу">
      <div className="space-y-3">
        <Field label="Погашает напоминание (опц.)">
          <Select value={f.recurring} onChange={(e) => pickRecurring(e.target.value)}>
            <option value="">— разовый расход —</option>
            {recurring?.results
              .filter((r) => r.is_active)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Категория">
          <Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            <option value="">— выберите —</option>
            {cats?.results.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Сумма (₸)">
          <MoneyInput value={String(f.amount ?? "")} onChange={(v) => setF({ ...f, amount: v })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="За какой месяц">
            <Input
              type="month"
              value={f.month}
              onChange={(e) => setF({ ...f, month: e.target.value })}
            />
          </Field>
          <Field label="Когда выдали">
            <Input
              type="date"
              value={f.expense_date}
              onChange={(e) => setF({ ...f, expense_date: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Способ">
          <Select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value as RecurringExpense["method"] })}>
            <option value="cash">Наличные</option>
            <option value="card">Карта</option>
            <option value="terminal">Терминал</option>
          </Select>
        </Field>
        <Field label="Комментарий">
          <Input value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} />
        </Field>
        <Button className="w-full" disabled={!f.category || !f.amount} onClick={submit}>
          Записать
        </Button>
      </div>
    </Modal>
  );
}
