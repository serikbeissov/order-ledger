import { useState } from "react";
import { useCreateWarehouseItem, useWarehouse } from "@/api/hooks";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Field,
  Input,
  Modal,
  Select,
  Spinner,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { formatMoney } from "@/lib/format";

const STATUS_COLOR: Record<string, "green" | "yellow" | "gray"> = {
  in_stock: "green",
  reserved: "yellow",
  sold: "gray",
};

export default function WarehousePage() {
  const { data, isLoading } = useWarehouse();
  const [open, setOpen] = useState(false);
  const frozen = (data as { frozen_capital?: string })?.frozen_capital;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Склад</h1>
        <Button onClick={() => setOpen(true)}>+ Товар</Button>
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
          <Input type="number" value={f.cost_kzt} onChange={(e) => set("cost_kzt", e.target.value)} />
        </Field>
        <Field label="Плановая цена">
          <Input type="number" value={f.planned_price} onChange={(e) => set("planned_price", e.target.value)} />
        </Field>
        <Field label="Доставка (всего)">
          <Input type="number" value={f.delivery_cost} onChange={(e) => set("delivery_cost", e.target.value)} />
        </Field>
        <Field label="Прочие затраты">
          <Input type="number" value={f.other_costs} onChange={(e) => set("other_costs", e.target.value)} />
        </Field>
        <Field label="Статус">
          <Select value={f.status} onChange={(e) => set("status", e.target.value)}>
            <option value="in_stock">В наличии</option>
            <option value="reserved">Зарезервирован</option>
            <option value="sold">Продан</option>
          </Select>
        </Field>
      </div>
      <Button className="mt-4 w-full" disabled={!f.name || !f.cost_kzt} onClick={submit}>
        Создать
      </Button>
    </Modal>
  );
}
