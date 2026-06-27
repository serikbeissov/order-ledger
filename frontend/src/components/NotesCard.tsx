import { useEffect, useState } from "react";
import { Button, Card, CardBody, CardHeader, Textarea } from "./ui";

/**
 * Карточка заметки: показывает текст и позволяет редактировать (CLAUDE.md §5).
 * Используется для заметок клиента, заказа, складского товара.
 */
export default function NotesCard({
  title,
  value,
  canEdit,
  onSave,
}: {
  title: string;
  value: string;
  canEdit: boolean;
  onSave: (notes: string) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const [busy, setBusy] = useState(false);

  useEffect(() => setText(value), [value]);

  async function save() {
    setBusy(true);
    try {
      await onSave(text);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title={title}
        action={
          canEdit && !editing ? (
            <Button variant="ghost" onClick={() => setEditing(true)}>
              {value ? "Редактировать" : "Добавить"}
            </Button>
          ) : null
        }
      />
      <CardBody>
        {editing ? (
          <div className="space-y-2">
            <Textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Текст заметки…"
            />
            <div className="flex gap-2">
              <Button onClick={save} disabled={busy}>
                Сохранить
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setText(value);
                  setEditing(false);
                }}
              >
                Отмена
              </Button>
            </div>
          </div>
        ) : value ? (
          <p className="whitespace-pre-wrap text-sm text-gray-700">{value}</p>
        ) : (
          <p className="text-sm text-gray-400">Заметки нет</p>
        )}
      </CardBody>
    </Card>
  );
}
