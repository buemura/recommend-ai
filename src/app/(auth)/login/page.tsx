"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isRegister) {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }

      // Auto login after register
      await signIn("credentials", {
        email: form.email,
        password: form.password,
        callbackUrl: "/",
      });
    } else {
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email ou senha incorretos.");
        setLoading(false);
        return;
      }

      router.push("/");
    }

    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      {/* Decorative elements */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="animate-float absolute left-[10%] top-[15%] text-6xl opacity-20">
          🎬
        </div>
        <div
          className="animate-float absolute right-[15%] top-[25%] text-5xl opacity-20"
          style={{ animationDelay: "1s" }}
        >
          🎵
        </div>
        <div
          className="animate-float absolute left-[20%] bottom-[20%] text-5xl opacity-20"
          style={{ animationDelay: "2s" }}
        >
          🎮
        </div>
        <div
          className="animate-float absolute right-[10%] bottom-[30%] text-6xl opacity-20"
          style={{ animationDelay: "0.5s" }}
        >
          📺
        </div>
        <div className="animate-spin-slow absolute left-[5%] top-[50%] h-16 w-16 rounded-full border-4 border-dashed border-brutal-pink opacity-20" />
        <div
          className="animate-spin-slow absolute right-[8%] top-[10%] h-12 w-12 rounded-lg border-4 border-dashed border-brutal-sky opacity-20"
          style={{ animationDirection: "reverse" }}
        />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-3 text-6xl">🎲</div>
          <h1 className="font-display text-4xl text-black">RecommendAI</h1>
          <p className="mt-2 text-lg font-medium text-black/70">
            Descubra o que curtir hoje!
          </p>
        </div>

        {/* Card */}
        <div className="neo-card-static animate-pop-in bg-white p-8">
          <h2 className="mb-6 font-display text-2xl text-black">
            {isRegister ? "Criar Conta" : "Entrar"}
          </h2>

          {error && (
            <div className="neo-card-static mb-4 bg-brutal-red/20 p-3 text-sm font-semibold text-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="mb-1 block text-sm font-bold text-black">
                  Nome
                </label>
                <input
                  type="text"
                  className="neo-input"
                  placeholder="Seu nome"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-bold text-black">
                Email
              </label>
              <input
                type="email"
                className="neo-input"
                placeholder="seu@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-black">
                Senha
              </label>
              <input
                type="password"
                className="neo-input"
                placeholder="••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="neo-btn w-full bg-brutal-yellow text-lg text-black"
            >
              {loading
                ? "Carregando..."
                : isRegister
                  ? "Criar Conta"
                  : "Entrar"}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-0.5 flex-1 bg-black/20" />
            <span className="text-sm font-bold text-black/50">ou</span>
            <div className="h-0.5 flex-1 bg-black/20" />
          </div>

          {/* Google */}
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="neo-btn flex w-full items-center justify-center gap-3 bg-white text-black"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Entrar com Google
          </button>

          {/* Toggle */}
          <p className="mt-6 text-center text-sm text-black/70">
            {isRegister ? "Já tem conta?" : "Não tem conta?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
                setForm({ name: "", email: "", password: "" });
              }}
              className="font-bold text-black underline decoration-brutal-pink decoration-2 underline-offset-2 hover:text-brutal-pink"
            >
              {isRegister ? "Fazer login" : "Criar conta"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
