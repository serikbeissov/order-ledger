import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClients, useCreateOrder, useOrders } from "@/api/hooks";
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
import { statusColor } from "@/lib/status";
import { useAuth } from "@/api/auth";
import { hasPerm } from "@/lib/permissions";

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useOrders({ search });
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreate = hasPerm(user, "orders.add_order");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Заказы</h1>
        <div className="flex gap-2">
          <a
            href="/api/orders/export/"
            className="inline-flex items-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200"
          >
            Экспорт CSV
          </a>
          {canCreate && <Button onClick={() => setOpen(true)}>+ Заказ</Button>}
        </div>
      </div>
      <Input
        placeholder="Поиск по клиенту…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <Card>
        {isLoading ? (
          <Spinner />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>№</Th>
                <Th>Клиент</Th>
                <Th>Создан</Th>
                <Th>Статус</Th>
                <Th className="text-right">Прибыль</Th>
              </tr>
            </thead>
            <tbody>
              {data?.results.map((o) => (
                <tr
                  key={o.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/orders/${o.id}`)}
                >
                  <Td>№{o.id}</Td>
                  <Td>{o.client_name}</Td>
                  <Td>{formatDate(o.created_at)}</Td>
                  <Td>
                    <Badge color={statusColor(o.status.code)}>{o.status.label}</Badge>
                  </Td>
                  <Td className="text-right font-medium">{formatMoney(o.profit)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <CreateOrderModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function CreateOrderModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: clients } = useClients();
  const create = useCreateOrder();
  const navigate = useNavigate();
  const [clientId, setClientId] = useState<number | "">("");
  const [notes, setNotes] = useState("");

  async function submit() {
    if (!clientId) return;
    const order = await create.mutateAsync({ client: Number(clientId), notes });
    onClose();
    navigate(`/orders/${order.id}`);
  }

  return (
    <Modal open={open} onClose={onClose} title="Новый заказ">
      <div className="space-y-3">
        <Field label="Клиент">
          <Select value={clientId} onChange={(e) => setClientId(Number(e.target.value))}>
            <option value="">— выберите клиента —</option>
            {clients?.results.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Заметки">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Button onClick={submit} disabled={!clientId || create.isPending} className="w-full">
          Создать и добавить позиции
        </Button>
      </div>
    </Modal>
  );
}
