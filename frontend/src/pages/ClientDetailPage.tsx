import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAddMovement, useClient, useOrders, useUpdateClient } from "@/api/hooks";
import NotesCard from "@/components/NotesCard";
import { statusColor } from "@/lib/status";
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
import { balanceColor, formatDate, formatMoney } from "@/lib/format";
import { useAuth } from "@/api/auth";
import { hasPerm } from "@/lib/permissions";

export default function ClientDetailPage() {
  const { id } = useParams();
  const clientId = Number(id);
  const { data: client, isLoading } = useClient(clientId);
  const { data: orders } = useOrders({ client: clientId });
  const [modal, setModal] = useState<null | "deposit" | "refund">(null);
  const { user } = useAuth();
  const canPay = hasPerm(user, "clients.add_client");
  const canEdit = hasPerm(user, "clients.change_client");
  const updateClient = useUpdateClient();

  if (isLoading || !client) return <Spinner />;

  const birthdaySoon = isBirthdaySoon(client.birth_date);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{client.full_name}</h1>
          <div className="text-sm text-gray-500">{client.phone || "телефон не указан"}</div>
        </div>
        {canPay && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setModal("deposit")}>
              Пополнить
            </Button>
            <Button variant="secondary" onClick={() => setModal("refund")}>
              Вернуть деньги
            </Button>
          </div>
        )}
      </div>

      {birthdaySoon && <Badge color="yellow">🎂 Скоро день рождения: {formatDate(client.birth_date)}</Badge>}

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Баланс" value={formatMoney(client.balance)} color={balanceColor(client.balance)} />
        <Stat label="Пополнено" value={formatMoney(client.deposits)} />
        <Stat label="Возвращено" value={formatMoney(client.refunds)} />
        <Stat label="К оплате" value={formatMoney(client.due)} />
      </div>

      <NotesCard
        title="Заметка о клиенте"
        value={client.notes}
        canEdit={canEdit}
        onSave={(notes) => updateClient.mutateAsync({ id: clientId, notes })}
      />

      <Card>
        <CardHeader title="Заказы" />
        <CardBody>
          <Table>
            <thead>
              <tr>
                <Th>№</Th>
                <Th>Статус</Th>
                <Th className="text-right">Прибыль</Th>
              </tr>
            </thead>
            <tbody>
              {orders?.results.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <Td>
                    <Link to={`/orders/${o.id}`} className="text-brand-accent hover:underline">
                      Заказ №{o.id}
                    </Link>
                  </Td>
                  <Td>
                    <Badge color={statusColor(o.status.code)}>{o.status.label}</Badge>
                  </Td>
                  <Td className="text-right">{formatMoney(o.profit)}</Td>
                </tr>
              ))}
              {(!orders || orders.results.length === 0) && (
                <tr>
                  <Td className="text-gray-400">Заказов нет</Td>
                </tr>
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="История движений" />
        <CardBody>
          <Table>
            <thead>
              <tr>
                <Th>Дата</Th>
                <Th>Тип</Th>
                <Th>Способ</Th>
                <Th>Комментарий</Th>
                <Th className="text-right">Сумма</Th>
              </tr>
            </thead>
            <tbody>
              {client.movements.map((mv) => (
                <tr key={mv.id}>
                  <Td>{formatDate(mv.paid_at)}</Td>
                  <Td>
                    <Badge color={mv.direction === "deposit" ? "green" : "red"}>
                      {mv.direction_display}
                    </Badge>
                  </Td>
                  <Td>{mv.method_display}</Td>
                  <Td className="text-gray-500">{mv.comment}</Td>
                  <Td className="text-right">{formatMoney(mv.amount)}</Td>
                </tr>
              ))}
              {client.movements.length === 0 && (
                <tr>
                  <Td className="text-gray-400">Движений нет</Td>
                </tr>
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      <MovementModal
        clientId={clientId}
        direction={modal}
        onClose={() => setModal(null)}
      />
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Card>
      <CardBody>
        <div className="text-xs uppercase tracking-wide text-gray-400">{label}</div>
        <div className={`mt-1 text-lg font-semibold ${color ?? ""}`}>{value}</div>
      </CardBody>
    </Card>
  );
}

function MovementModal({
  clientId,
  direction,
  onClose,
}: {
  clientId: number;
  direction: "deposit" | "refund" | null;
  onClose: () => void;
}) {
  const add = useAddMovement(clientId);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [comment, setComment] = useState("");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));

  async function submit() {
    if (!direction) return;
    await add.mutateAsync({ direction, amount, method, comment, paid_at: paidAt });
    onClose();
    setAmount("");
    setComment("");
  }

  return (
    <Modal
      open={direction !== null}
      onClose={onClose}
      title={direction === "deposit" ? "Пополнение баланса" : "Возврат денег клиенту"}
    >
      <div className="space-y-3">
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
        <Field label="Комментарий">
          <Input value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
        <Button onClick={submit} disabled={!amount || add.isPending} className="w-full">
          Сохранить
        </Button>
      </div>
    </Modal>
  );
}

function isBirthdaySoon(birthDate: string | null): boolean {
  if (!birthDate) return false;
  const now = new Date();
  const bd = new Date(birthDate);
  const next = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
  const diff = (next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 14;
}
