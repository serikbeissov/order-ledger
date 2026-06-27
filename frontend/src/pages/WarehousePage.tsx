import { useState } from "react";
import {
  useCreateWarehouseItem,
  useUpdateWarehouseItem,
  useWarehouse,
} from "@/api/hooks";
import type { WarehouseItem } from "@/api/types";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Field,
  Input,
  Modal,
  MoneyInput,
  Select,
  Spinner,
  Table,
  Td,
  Textarea,
  Th,
} from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { useAuth } from "@/api/auth";
import { hasPerm } from "@/lib/permissions";

const STATUS_COLOR: Record<string, "green" | "yellow" | "gray"> = {
  in_stock: "green",
  reserved: "yellow",
  sold: "gray",
};

export default function WarehousePage() {
  const { data, isLoading } = useWarehouse();
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<WarehouseItem | null>(null);
  const frozen = (data as { frozen_capital?: string })?.frozen_capital;
  const { user } = useAuth();
  const canCreate = hasPerm(user, "warehouse.add_warehouseitem");
  const canEdit = hasPerm(user, "warehouse.change_warehouseitem");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Склад</h1>
        {canCreate && <Button onClick={() => setOpen(true)}>+ Товар</Button>}
      </div>

      <Card>
        <CardBody className="flex items-center justify-between">
          <span className="text-gray-600">Замороженный капитал (в наличии + резерв)</span>
          <span className="text-xl font-semibold text-brand-accent">{formatMoney(frozen)}</span>
        </CardBody>
      </Card>

      <Card>
        {isLoading ? (
          <Spinner />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Наименование</Th>
                <Th>Кол-во</Th>
                <Th>Себес</Th>
                <Th>Плановая цена</Th>
                <Th>Полная затрата</Th>
                <Th>Статус</Th>
                <Th>Заметка</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {data?.results.map((w) => (
                <tr key={w.id}>
                  <Td>{w.name}</Td>
                  <Td>{w.qty}</Td>
                  <Td>{formatMoney(w.cost_kzt)}</Td>
                  <Td>{formatMoney(w.planned_price)}</Td>
                  <Td>{formatMoney(w.full_cost)}</Td>
                  <Td>
                    <Badge color={STATUS_COLOR[w.status]}>{w.status_display}</Badge>
                  </Td>
                  <Td className="max-w-48 truncate text-gray-500" >
                    {w.notes || "—"}
                  </Td>
                  <Td>
                    {canEdit && (
                      <Button variant="ghost" onClick={() => setEditItem(w)}>
                        Изменить
                      </Button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <CreateModal open={open} onClose={() => setOpen(false)} />
      {editItem && <EditModal item={editItem} onClose={() => setEditItem(null)} />}
    </div>
  );
}

function EditModal({ item, onClose }: { item: WarehouseItem; onClose: () => void }) {
  const update = useUpdateWarehouseItem();
  const [f, setF] = useState({
    name: item.name,
    country: item.country,
    cost_kzt: item.cost_kzt,
    qty: String(item.qty),
    delivery_cost: item.delivery_cost,
    other_costs: item.other_costs,
    planned_price: item.planned_price,
    status: item.status,
    notes: item.notes,
  });
  const set = (k: string, v: string) => setF({ ...f, [k]: v });

  async function save() {
    await update.mutateAsync({ id: item.id, ...f, qty: Number(f.qty) });
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={`Товар: ${item.name}`}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Наименование">
            <Input value={f.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
        </div>
        <Field label="Страна">
          <Input value={f.country} onChange={(e) => set("country", e.target.value)} />
        </Field>
        <Field label="Количество">
          <Input type="number" value={f.qty} onChange={(e) => set("qty", e.target.value)} />
        </Field>
        <Field label="Себестоимость (₸)">
          <MoneyInput value={f.cost_kzt} onChange={(v) => set("cost_kzt", v)} />
        </Field>
        <Field label="Плановая цена">
          <MoneyInput value={f.planned_price} onChange={(v) => set("planned_price", v)} />
        </Field>
        <Field label="Доставка (всего)">
          <MoneyInput value={f.delivery_cost} onChange={(v) => set("delivery_cost", v)} />
        </Field>
        <Field label="Прочие затраты">
          <MoneyInput value={f.other_costs} onChange={(v) => set("other_costs", v)} />
        </Field>
        <Field label="Статус">
          <Select value={f.status} onChange={(e) => set("status", e.target.value)}>
            <option value="in_stock">В наличии</option>
            <option value="reserved">Зарезервирован</option>
            <option value="sold">Продан</option>
          </Select>
        </Field>
        <div className="col-span-2">
          <Field label="Заметка">
            <Textarea rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>
      </div>
      <Button className="mt-4 w-full" disabled={!f.name || update.isPending} onClick={save}>
        Сохранить
      </Button>
    </Modal>
  );
}

function CreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateWarehouseItem();
  const [f, setF] = useState({
    name: "",
    country: "",
    cost_kzt: "",
    qty: "1",
    delivery_cost: "0",
    other_costs: "0",
    planned_price: "0",
    status: "in_stock",
    notes: "",
  });
  const set = (k: string, v: string) => setF({ ...f, [k]: v });

  async function submit() {
    await create.mutateAsync({ ...f, qty: Number(f.qty) } as never);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Новый складской товар">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Наименование">
            <Input value={f.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
        </div>
        <Field label="Страна">
          <Input value={f.country} onChange={(e) => set("country", e.target.value)} />
        </Field>
        <Field label="Количество">
          <Input type="number" value={f.qty} onChange={(e) => set("qty", e.target.value)} />
        </Field>
        <Field label="Себестоимость (₸)">
          <MoneyInput value={f.cost_kzt} onChange={(v) => set("cost_kzt", v)} />
        </Field>
        <Field label="Плановая цена">
          <MoneyInput value={f.planned_price} onChange={(v) => set("planned_price", v)} />
        </Field>
        <Field label="Доставка (всего)">
          <MoneyInput value={f.delivery_cost} onChange={(v) => set("delivery_cost", v)} />
        </Field>
        <Field label="Прочие затраты">
          <MoneyInput value={f.other_costs} onChange={(v) => set("other_costs", v)} />
        </Field>
        <Field label="Статус">
          <Select value={f.status} onChange={(e) => set("status", e.target.value)}>
            <option value="in_stock">В наличии</option>
            <option value="reserved">Зарезервирован</option>
            <option value="sold">Продан</option>
          </Select>
        </Field>
        <div className="col-span-2">
          <Field label="Заметка">
            <Textarea rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>
      </div>
      <Button className="mt-4 w-full" disabled={!f.name || !f.cost_kzt} onClick={submit}>
        Создать
      </Button>
    </Modal>
  );
}
