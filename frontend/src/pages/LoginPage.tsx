import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/api/auth";
import { Button, Card, CardBody, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(username, password);
      navigate("/");
    } catch {
      setError("Неверный логин или пароль.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-sm">
        <CardBody className="space-y-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-brand">Maison</div>
            <div className="text-xs text-gray-400">order-ledger · вход</div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Field label="Логин">
              <Input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
            </Field>
            <Field label="Пароль">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Вход…" : "Войти"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
