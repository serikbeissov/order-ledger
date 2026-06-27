import { useState } from "react";
import { useCreateUser, useUsers } from "@/api/hooks";
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

interface UserRow {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  role: string | null;
}

export default function UsersPage() {
  const { data, isLoading } = useUsers();
  const [open, setOpen] = useState(false);
  const users = (data?.results as UserRow[] | undefined) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Пользователи</h1>
        <Button onClick={() => setOpen(true)}>+ Пользователь</Button>
      </div>
      <Card>
        {isLoading ? (
          <Spinner />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Логин</Th>
                <Th>Имя</Th>
                <Th>Роль</Th>
                <Th>Активен</Th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <Td>{u.username}</Td>
                  <Td>
                    {u.first_name} {u.last_name}
                  </Td>
                  <Td>
                    <Badge color="blue">{u.role ?? "—"}</Badge>
                  </Td>
                  <Td>{u.is_active ? "да" : "нет"}</Td>
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
  const create = useCreateUser();
  const [f, setF] = useState({
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    role_code: "staff",
  });

  return (
    <Modal open={open} onClose={onClose} title="Новый пользователь">
      <div className="space-y-3">
        <Field label="Логин">
          <Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
        </Field>
        <Field label="Пароль">
          <Input
            type="password"
            value={f.password}
            onChange={(e) => setF({ ...f, password: e.target.value })}
          />
        </Field>
        <Field label="Имя">
          <Input value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} />
        </Field>
        <Field label="Фамилия">
          <Input value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} />
        </Field>
        <Field label="Роль">
          <Select value={f.role_code} onChange={(e) => setF({ ...f, role_code: e.target.value })}>
            <option value="admin">Администратор</option>
            <option value="manager">Менеджер</option>
            <option value="staff">Сотрудник</option>
          </Select>
        </Field>
        <Button
          className="w-full"
          disabled={!f.username || !f.password}
          onClick={async () => {
            await create.mutateAsync(f);
            onClose();
          }}
        >
          Создать
        </Button>
      </div>
    </Modal>
  );
}
