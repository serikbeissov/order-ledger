import { useEffect, useState } from "react";
import {
  useCreateGroup,
  useDeleteGroup,
  useGroups,
  usePermissionsCatalog,
  useUpdateGroup,
} from "@/api/hooks";
import type { Group, PermissionCatalogEntry } from "@/api/types";
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

export default function RolesPage() {
  const { data: groups, isLoading } = useGroups();
  const { data: catalog } = usePermissionsCatalog();
  const [createOpen, setCreateOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const roles = groups?.results ?? [];

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Роли и права</h1>
        <Button onClick={() => setCreateOpen(true)}>+ Роль</Button>
      </div>
      <p className="text-sm text-gray-500">
        Отметьте, что роль <b>видит</b> (Просмотр) и что может <b>делать</b>
        (Создание / Изменение / Удаление). Назначение ролей пользователям — в
        разделе «Пользователи».
      </p>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Роль</Th>
              <Th>Прав выдано</Th>
              <Th>Пользователей</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <Td className="font-medium">{r.name}</Td>
                <Td>{r.permissions.length}</Td>
                <Td>{r.user_count}</Td>
                <Td>
                  <Button variant="ghost" onClick={() => setEditGroup(r)}>
                    Настроить права
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <CreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
      {editGroup && catalog && (
        <EditModal group={editGroup} catalog={catalog} onClose={() => setEditGroup(null)} />
      )}
    </div>
  );
}

function CreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateGroup();
  const [name, setName] = useState("");
  return (
    <Modal open={open} onClose={onClose} title="Новая роль">
      <div className="space-y-3">
        <Field label="Название роли">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <p className="text-xs text-gray-400">
          После создания нажмите «Настроить права», чтобы отметить доступы.
        </p>
        <Button
          className="w-full"
          disabled={!name || create.isPending}
          onClick={async () => {
            await create.mutateAsync({ name });
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

function EditModal({
  group,
  catalog,
  onClose,
}: {
  group: Group;
  catalog: PermissionCatalogEntry[];
  onClose: () => void;
}) {
  const update = useUpdateGroup();
  const remove = useDeleteGroup();
  const [name, setName] = useState(group.name);
  const [permIds, setPermIds] = useState<number[]>(group.current_permission_ids);

  useEffect(() => {
    setPermIds(group.current_permission_ids);
    setName(group.name);
  }, [group]);

  function toggle(id: number) {
    setPermIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  /** Включить/выключить все права сущности разом. */
  function toggleRow(entry: PermissionCatalogEntry, on: boolean) {
    const ids = entry.permissions.map((p) => p.id);
    setPermIds((s) =>
      on ? Array.from(new Set([...s, ...ids])) : s.filter((x) => !ids.includes(x)),
    );
  }

  async function save() {
    await update.mutateAsync({ id: group.id, name, permission_ids: permIds });
    onClose();
  }

  async function handleDelete() {
    if (!confirm(`Удалить роль «${group.name}»? Пользователи потеряют её права.`)) return;
    await remove.mutateAsync(group.id);
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={`Права роли: ${group.name}`}>
      <div className="space-y-4">
        <Field label="Название роли">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <Th>Раздел</Th>
                <Th>Все</Th>
                <Th>Просмотр</Th>
                <Th>Создание</Th>
                <Th>Изменение</Th>
                <Th>Удаление</Th>
              </tr>
            </thead>
            <tbody>
              {catalog.map((entry) => {
                const ids = entry.permissions.map((p) => p.id);
                const allOn = ids.every((id) => permIds.includes(id));
                const cell = (action: string) => {
                  const p = entry.permissions.find((x) => x.action === action);
                  if (!p) return <Td className="text-gray-300">—</Td>;
                  return (
                    <Td>
                      <input
                        type="checkbox"
                        checked={permIds.includes(p.id)}
                        onChange={() => toggle(p.id)}
                      />
                    </Td>
                  );
                };
                return (
                  <tr key={`${entry.app_label}.${entry.model}`}>
                    <Td className="font-medium">{entry.model_label}</Td>
                    <Td>
                      <input
                        type="checkbox"
                        checked={allOn}
                        onChange={(e) => toggleRow(entry, e.target.checked)}
                      />
                    </Td>
                    {cell("view")}
                    {cell("add")}
                    {cell("change")}
                    {cell("delete")}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex gap-2">
          <Button variant="danger" onClick={handleDelete} disabled={remove.isPending}>
            Удалить роль
          </Button>
          <Button className="flex-1" onClick={save} disabled={update.isPending}>
            Сохранить права
          </Button>
        </div>
      </div>
    </Modal>
  );
}
