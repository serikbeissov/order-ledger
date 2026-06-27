import { useState } from "react";
import {
  useCreateUser,
  useGroups,
  usePermissionsCatalog,
  useUpdateUser,
  useUsers,
} from "@/api/hooks";
import type { Group, PermissionCatalogEntry, UserAccount } from "@/api/types";
import {
  Badge,
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

export default function UsersPage() {
  const { data, isLoading } = useUsers();
  const { data: groups } = useGroups();
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserAccount | null>(null);
  const users = data?.results ?? [];
  const roles = groups?.results ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Пользователи</h1>
        <Button onClick={() => setCreateOpen(true)}>+ Пользователь</Button>
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
                <Th>Роли</Th>
                <Th>Активен</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <Td>{u.username}</Td>
                  <Td>
                    {u.first_name} {u.last_name}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {u.is_superuser && <Badge color="red">суперпользователь</Badge>}
                      {u.groups.map((g) => (
                        <Badge key={g.id} color="blue">
                          {g.name}
                        </Badge>
                      ))}
                      {!u.is_superuser && u.groups.length === 0 && (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </Td>
                  <Td>{u.is_active ? "да" : "нет"}</Td>
                  <Td>
                    <Button variant="ghost" onClick={() => setEditUser(u)}>
                      Изменить
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <CreateModal open={createOpen} onClose={() => setCreateOpen(false)} roles={roles} />
      {editUser && (
        <EditModal user={editUser} roles={roles} onClose={() => setEditUser(null)} />
      )}
    </div>
  );
}

function RoleCheckboxes({
  roles,
  selected,
  onToggle,
}: {
  roles: Group[];
  selected: number[];
  onToggle: (id: number) => void;
}) {
  return (
    <div className="space-y-1">
      {roles.map((r) => (
        <label key={r.id} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={selected.includes(r.id)}
            onChange={() => onToggle(r.id)}
          />
          {r.name}
        </label>
      ))}
    </div>
  );
}

function CreateModal({
  open,
  onClose,
  roles,
}: {
  open: boolean;
  onClose: () => void;
  roles: Group[];
}) {
  const create = useCreateUser();
  const [f, setF] = useState({
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    email: "",
  });
  const [groupIds, setGroupIds] = useState<number[]>([]);

  function toggle(id: number) {
    setGroupIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Имя">
            <Input value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} />
          </Field>
          <Field label="Фамилия">
            <Input value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} />
          </Field>
        </div>
        <Field label="Email">
          <Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </Field>
        <div>
          <div className="mb-1 text-xs font-medium text-gray-600">Роли</div>
          <RoleCheckboxes roles={roles} selected={groupIds} onToggle={toggle} />
        </div>
        <Button
          className="w-full"
          disabled={!f.username || !f.password || create.isPending}
          onClick={async () => {
            await create.mutateAsync({ ...f, group_ids: groupIds });
            onClose();
          }}
        >
          Создать
        </Button>
      </div>
    </Modal>
  );
}

function EditModal({
  user,
  roles,
  onClose,
}: {
  user: UserAccount;
  roles: Group[];
  onClose: () => void;
}) {
  const update = useUpdateUser();
  const { data: catalog } = usePermissionsCatalog();
  const [f, setF] = useState({
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    is_active: user.is_active,
    password: "",
  });
  const [groupIds, setGroupIds] = useState<number[]>(user.group_id_list);
  const [permIds, setPermIds] = useState<number[]>(user.own_permission_ids);
  const [showPerms, setShowPerms] = useState(false);

  function toggleGroup(id: number) {
    setGroupIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }
  function togglePerm(id: number) {
    setPermIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function save() {
    const body: Record<string, unknown> = {
      id: user.id,
      first_name: f.first_name,
      last_name: f.last_name,
      email: f.email,
      is_active: f.is_active,
      group_ids: groupIds,
      user_permission_ids: permIds,
    };
    if (f.password) body.password = f.password;
    await update.mutateAsync(body as { id: number });
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={`Пользователь: ${user.username}`}>
      <div className="space-y-3">
        {user.is_superuser && (
          <Badge color="red">Суперпользователь — имеет все права</Badge>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Имя">
            <Input value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} />
          </Field>
          <Field label="Фамилия">
            <Input value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} />
          </Field>
        </div>
        <Field label="Email">
          <Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={f.is_active}
            onChange={(e) => setF({ ...f, is_active: e.target.checked })}
          />
          Активен
        </label>
        <Field label="Новый пароль (оставьте пустым, чтобы не менять)">
          <Input
            type="password"
            value={f.password}
            onChange={(e) => setF({ ...f, password: e.target.value })}
          />
        </Field>

        <div>
          <div className="mb-1 text-xs font-medium text-gray-600">Роли</div>
          <RoleCheckboxes roles={roles} selected={groupIds} onToggle={toggleGroup} />
        </div>

        <div>
          <button
            className="text-sm text-brand-accent underline"
            onClick={() => setShowPerms((v) => !v)}
          >
            {showPerms ? "Скрыть" : "Показать"} индивидуальные права (поверх ролей)
          </button>
          {showPerms && catalog && (
            <PermMatrix
              catalog={catalog}
              selected={permIds}
              onToggle={togglePerm}
            />
          )}
        </div>

        <Button className="w-full" disabled={update.isPending} onClick={save}>
          Сохранить
        </Button>
      </div>
    </Modal>
  );
}

function PermMatrix({
  catalog,
  selected,
  onToggle,
}: {
  catalog: PermissionCatalogEntry[];
  selected: number[];
  onToggle: (id: number) => void;
}) {
  return (
    <div className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
      {catalog.map((entry) => (
        <div key={`${entry.app_label}.${entry.model}`}>
          <div className="text-xs font-semibold text-gray-700">{entry.model_label}</div>
          <div className="flex flex-wrap gap-3">
            {entry.permissions.map((p) => (
              <label key={p.id} className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={selected.includes(p.id)}
                  onChange={() => onToggle(p.id)}
                />
                {p.action_label}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
