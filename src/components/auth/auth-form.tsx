"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/providers/toast-provider";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const body =
      mode === "register"
        ? {
            email: String(formData.get("email") || ""),
            password: String(formData.get("password") || ""),
            name: String(formData.get("name") || "")
          }
        : {
            email: String(formData.get("email") || ""),
            password: String(formData.get("password") || "")
          };

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Не удалось выполнить действие.");
        return;
      }
      toast({ title: mode === "login" ? "Вход выполнен" : "Аккаунт создан" });
      router.push("/decks");
      router.refresh();
    } catch {
      setError("Нет соединения с сервером.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{mode === "login" ? "Вход" : "Регистрация"}</CardTitle>
        <CardDescription>
          {mode === "login"
            ? "Войдите, чтобы продолжить повторения."
            : "Создайте аккаунт для своих наборов и прогресса."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={submit}>
          {mode === "register" ? (
            <div className="space-y-2">
              <Label htmlFor="name">Имя</Label>
              <Input id="name" name="name" autoComplete="name" maxLength={120} />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required maxLength={320} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={8}
                maxLength={128}
                className="pr-11"
              />
              <button
                type="button"
                className="focus-ring absolute right-1 top-1 rounded-md p-2 text-muted-foreground"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error ? (
            <div className="rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <Button className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === "login" ? "Войти" : "Создать аккаунт"}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              Нет аккаунта?{" "}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Зарегистрироваться
              </Link>
            </>
          ) : (
            <>
              Уже есть аккаунт?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Войти
              </Link>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
