import { useState } from "react";
import { useCreateReserve, useReserveMovement, useReserves } from "@/api/hooks";
import type { Reserve } from "@/api/types";
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
} from "@/components/ui";
import { formatMoney } from "@/lib/format";

const KIND_COLOR: Record<string, "blue" | "yellow" | "gray"> = {
  tax: "blue",
  monthly: "yellow",
  other: "gray",
};

export default function ReservesPage() {
  const { data, isLoading } = useReserves();
  const [open, setOpen] = useState(false);
  const [moveReserve, setMoveReserve] = useState<Reserve | null>(null);

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Резервы (конверты)</h1>
        <Button onClick={() => setOpen(true)}>+ Резерв</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.results.map((r) => (
          <Card key={r.id}>
            <CardHeader
              title={
                <span>
                  {r.name} <Badge color={KIND_COLOR[r.kind]}>{r.kind_display}</Badge>
                </span>
              }
            />
            <CardBody className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-gray-500">Отложено</span>
                <span className="text-xl font-semibold">{formatMoney(r.balance)}</span>
              </div>
              {r.target_amount && (
                <div className="text-xs text-gray-400">Цель: {formatMoney(r.target_amount)}</div>
              )}
              <Button variant="secondary" className="w-full" onClick={() => setMoveReserve(r)}>
                Отложить / снять
              </Button>
            </CardBody>
          </Card>
        ))}
        {data?.results.length === 0 && <div className="text-gray-400">Резервов нет</div>}
      </div>

      <CreateModal open={open} onClose={() => setOpen(false)} />
      <MoveModal reserve={moveReserve} onClose={() => setMoveReserve(null)} />
    </div>
  );
}

function CreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateReserve();
  const [f, setF] = useState({ name: "", kind: "tax", target_amount: "", comment: "" });
  return (
    <Modal open={open} onClose={onClose} title="Новый резерв">
      <div className="space-y-3">
        <Field label="Название">
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label="Тип">
          <Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
            <option value="tax">На налоги</option>
            <option value="monthly">На ежемесячные расходы</option>
            <option value="other">Прочее</option>
          </Select>
        </Field>
        <Field label="Цель (опц.)">
          <Input
            type="number"
            value={f.target_amount}
            onChange={(e) => setF({ ...f, target_amount: e.target.value })}
          />
        </Field>
        <Button
          className="w-full"
          disabled={!f.name}
          onClick={async () => {
            await create.mutateAsync({
              name: f.name,
              kind: f.kind as Reserve["kind"],
              target_amount: f.target_amount || null,
              comment: f.comment,
            });
            onClose();
          }}
        >
          Создать
        </Button>
      </div>
    </Modal>
  );
}

function MoveModal({ reserve, onClose }: { reserve: Reserve | null; onClose: () => void }) {
  const move = useReserveMovement(reserve?.id ?? 0);
  const [direction, setDirection] = useState("set_aside");
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  if (!reserve) return null;

  return (
    <Modal open onClose={onClose} title={`Движение: ${reserve.name}`}>
      <div className="space-y-3">
        <Field label="Действие">
          <Select value={direction} onChange={(e) => setDirection(e.target.value)}>
            <option value="set_aside">Отложить</option>
            <option value="release">Снять</option>
          </Select>
        </Field>
        <Field label="Сумма (₸)">
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Дата">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Комментарий">
          <Input value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
        <Button
          className="w-full"
          disabled={!amount}
          onClick={async () => {
            await move.mutateAsync({ direction, amount, comment, moved_at: date });
            onClose();
          }}
        >
          Сохранить
        </Button>
      </div>
    </Modal>
  );
}
