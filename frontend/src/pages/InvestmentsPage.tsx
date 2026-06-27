import { useState } from "react";
import {
  useCreateInvestment,
  useCreateInvestor,
  useInvestments,
  useInvestors,
} from "@/api/hooks";
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
  Th,
} from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { useAuth } from "@/api/auth";
import { hasPerm } from "@/lib/permissions";

export default function InvestmentsPage() {
  const { data, isLoading } = useInvestments();
  const { data: investors } = useInvestors();
  const [openInv, setOpenInv] = useState(false);
  const [openInvestor, setOpenInvestor] = useState(false);
  const pool = (data as { pool?: string })?.pool;
  const { user } = useAuth();
  const canInvestor = hasPerm(user, "finance.add_investor");
  const canInvestment = hasPerm(user, "finance.add_investment");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Инвестиции</h1>
        <div className="flex gap-2">
          {canInvestor && (
            <Button variant="secondary" onClick={() => setOpenInvestor(true)}>
              + Инвестор
            </Button>
          )}
          {canInvestment && (
            <Button onClick={() => setOpenInv(true)}>+ Вложение / возврат</Button>
          )}
        </div>
      </div>

      <Card>
        <CardBody className="flex items-center justify-between">
          <span className="text-gray-600">Текущий пул инвестиций (невозвращённые вложения)</span>
          <span className="text-xl font-semibold text-brand-accent">{formatMoney(pool)}</span>
        </CardBody>
      </Card>

      <Card>
        {isLoading ? (
          <Spinner />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Дата</Th>
                <Th>Инвестор</Th>
                <Th>Тип</Th>
                <Th>Способ</Th>
                <Th>Комментарий</Th>
                <Th className="text-right">Сумма</Th>
              </tr>
            </thead>
            <tbody>
              {data?.results.map((i) => (
                <tr key={i.id}>
                  <Td>{formatDate(i.moved_at)}</Td>
                  <Td>{i.investor_name}</Td>
                  <Td>
                    <Badge color={i.direction === "in" ? "green" : "red"}>
                      {i.direction_display}
                    </Badge>
                  </Td>
                  <Td>{i.method}</Td>
                  <Td className="text-gray-500">{i.comment || "—"}</Td>
                  <Td className="text-right">{formatMoney(i.amount)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <InvestorModal open={openInvestor} onClose={() => setOpenInvestor(false)} />
      <InvestmentModal
        open={openInv}
        onClose={() => setOpenInv(false)}
        investors={investors?.results ?? []}
      />
    </div>
  );
}

function InvestorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateInvestor();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <Modal open={open} onClose={onClose} title="Новый инвестор">
      <div className="space-y-3">
        <Field label="Имя">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Заметки">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Button
          className="w-full"
          disabled={!name}
          onClick={async () => {
            await create.mutateAsync({ name, notes });
            onClose();
            setName("");
          }}
        >
          Создать
        </Button>
      </div>
    </Modal>
  );
}

function InvestmentModal({
  open,
  onClose,
  investors,
}: {
  open: boolean;
  onClose: () => void;
  investors: { id: number; name: string }[];
}) {
  const create = useCreateInvestment();
  const [f, setF] = useState({
    investor: "",
    direction: "in",
    amount: "",
    method: "cash",
    comment: "",
    moved_at: new Date().toISOString().slice(0, 10),
  });

  return (
    <Modal open={open} onClose={onClose} title="Вложение / возврат">
      <div className="space-y-3">
        <Field label="Инвестор">
          <Select value={f.investor} onChange={(e) => setF({ ...f, investor: e.target.value })}>
            <option value="">— выберите —</option>
            {investors.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Направление">
          <Select value={f.direction} onChange={(e) => setF({ ...f, direction: e.target.value })}>
            <option value="in">Вложение</option>
            <option value="return">Возврат инвестору</option>
          </Select>
        </Field>
        <Field label="Сумма (₸)">
          <MoneyInput value={f.amount} onChange={(v) => setF({ ...f, amount: v })} />
        </Field>
        <Field label="Способ">
          <Select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>
            <option value="cash">Наличные</option>
            <option value="card">Карта</option>
            <option value="terminal">Терминал</option>
          </Select>
        </Field>
        <Field label="Дата">
          <Input type="date" value={f.moved_at} onChange={(e) => setF({ ...f, moved_at: e.target.value })} />
        </Field>
        <Button
          className="w-full"
          disabled={!f.investor || !f.amount}
          onClick={async () => {
            await create.mutateAsync({ ...f, investor: Number(f.investor) } as never);
            onClose();
          }}
        >
          Сохранить
        </Button>
      </div>
    </Modal>
  );
}
