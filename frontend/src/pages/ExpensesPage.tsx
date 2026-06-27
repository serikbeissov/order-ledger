import { useState } from "react";
import {
  useCreateExpense,
  useExpenseCategories,
  useExpenses,
} from "@/api/hooks";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  Select,
  Spinner,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";

export default function ExpensesPage() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const { data, isLoading } = useExpenses(category ? { category } : undefined);
  const { data: cats } = useExpenseCategories();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Постоянные расходы</h1>
        <Button onClick={() => setOpen(true)}>+ Расход</Button>
      </div>

      <Select value={category} onChange={(e) => setCategory(e.target.value)} >
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
                <Th>Дата</Th>
                <Th>Категория</Th>
                <Th>Комментарий</Th>
                <Th>Ежемесячный</Th>
                <Th className="text-right">Сумма</Th>
              </tr>
            </thead>
            <tbody>
              {data?.results.map((e) => (
                <tr key={e.id}>
                  <Td>{formatDate(e.expense_date)}</Td>
                  <Td>{e.category_name}</Td>
                  <Td className="text-gray-500">{e.comment}</Td>
                  <Td>{e.is_recurring && <Badge color="blue">ежемес.</Badge>}</Td>
                  <Td className="text-right">{formatMoney(e.amount)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <CreateModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function CreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateExpense();
  const { data: cats } = useExpenseCategories();
  const [f, setF] = useState({
    category: "",
    amount: "",
    comment: "",
    expense_date: new Date().toISOString().slice(0, 10),
    is_recurring: false,
  });

  async function submit() {
    await create.mutateAsync({
      category: Number(f.category),
      amount: f.amount,
      comment: f.comment,
      expense_date: f.expense_date,
      is_recurring: f.is_recurring,
    } as never);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Новый расход">
      <div className="space-y-3">
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
          <Input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        </Field>
        <Field label="Дата">
          <Input
            type="date"
            value={f.expense_date}
            onChange={(e) => setF({ ...f, expense_date: e.target.value })}
          />
        </Field>
        <Field label="Комментарий">
          <Input value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={f.is_recurring}
            onChange={(e) => setF({ ...f, is_recurring: e.target.checked })}
          />
          Ежемесячный расход
        </label>
        <Button className="w-full" disabled={!f.category || !f.amount} onClick={submit}>
          Добавить
        </Button>
      </div>
    </Modal>
  );
}
