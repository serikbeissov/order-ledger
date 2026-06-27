import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClients, useCreateClient } from "@/api/hooks";
import {
  Button,
  Card,
  Field,
  Input,
  Modal,
  Spinner,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { balanceColor, formatMoney } from "@/lib/format";
import { useAuth } from "@/api/auth";
import { hasPerm } from "@/lib/permissions";

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useClients(search);
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreate = hasPerm(user, "clients.add_client");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Клиенты</h1>
        <div className="flex gap-2">
          <a
            href="/api/clients/export/"
            className="inline-flex items-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200"
          >
            Экспорт CSV
          </a>
          {canCreate && <Button onClick={() => setOpen(true)}>+ Клиент</Button>}
        </div>
      </div>
      <Input
        placeholder="Поиск по имени или телефону…"
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
                <Th>Имя</Th>
                <Th>Телефон</Th>
                <Th className="text-right">Баланс</Th>
              </tr>
            </thead>
            <tbody>
              {data?.results.map((c) => (
                <tr
                  key={c.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/clients/${c.id}`)}
                >
                  <Td>{c.full_name}</Td>
                  <Td>{c.phone || "—"}</Td>
                  <Td className={`text-right font-medium ${balanceColor(c.balance)}`}>
                    {formatMoney(c.balance)}
                  </Td>
                </tr>
              ))}
              {data?.results.length === 0 && (
                <tr>
                  <Td className="text-gray-400">Ничего не найдено</Td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </Card>
      <CreateClientModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function CreateClientModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateClient();
  const [form, setForm] = useState({ full_name: "", phone: "", birth_date: "", notes: "" });

  async function submit() {
    await create.mutateAsync({
      full_name: form.full_name,
      phone: form.phone,
      birth_date: form.birth_date || null,
      notes: form.notes,
    });
    onClose();
    setForm({ full_name: "", phone: "", birth_date: "", notes: "" });
  }

  return (
    <Modal open={open} onClose={onClose} title="Новый клиент">
      <div className="space-y-3">
        <Field label="ФИО">
          <Input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
        </Field>
        <Field label="Телефон">
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="87011234567"
          />
        </Field>
        <Field label="Дата рождения">
          <Input
            type="date"
            value={form.birth_date}
            onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
          />
        </Field>
        <Field label="Заметки">
          <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        <Button onClick={submit} disabled={!form.full_name || create.isPending} className="w-full">
          Создать
        </Button>
      </div>
    </Modal>
  );
}
