"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, logout, requestPasswordReset, resetPassword } from "./actions";

const forms = {
  login: { action: login, submit: "Masuk", pending: "Sedang masuk…" },
  forgot: { action: requestPasswordReset, submit: "Kirim tautan reset", pending: "Sedang mengirim…" },
  reset: { action: resetPassword, submit: "Simpan kata sandi baru", pending: "Sedang menyimpan…" },
};

export function AuthForm({ mode }: { mode: keyof typeof forms }) {
  const { action, submit, pending } = forms[mode];
  const [state, submitForm, isPending] = useActionState(action, {});

  return (
    <form action={submitForm} className="grid gap-5" aria-busy={isPending}>
      {mode !== "reset" && (
        <label className="form-label" htmlFor="email">
          Alamat email
          <input id="email" name="email" type="email" autoComplete="email" maxLength={254} required />
        </label>
      )}
      {mode !== "forgot" && (
        <label className="form-label" htmlFor="password">
          {mode === "reset" ? "Kata sandi baru" : "Kata sandi"}
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "reset" ? "new-password" : "current-password"}
            minLength={mode === "reset" ? 12 : undefined}
            maxLength={mode === "reset" ? 72 : 1024}
            aria-describedby={mode === "reset" ? "password-hint" : undefined}
            required
          />
          {mode === "reset" && <span id="password-hint" className="text-xs font-medium text-slate-600">Minimal 12 karakter.</span>}
        </label>
      )}
      {mode === "reset" && (
        <label className="form-label" htmlFor="confirm-password">
          Konfirmasi kata sandi baru
          <input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={72} required />
        </label>
      )}
      {mode === "login" && <Link href="/forgot-password" className="justify-self-end text-sm font-bold text-action">Lupa kata sandi?</Link>}
      {state.error && <p role="alert" className="form-error">{state.error}</p>}
      {state.success && <p role="status" className="form-success">{state.success}</p>}
      <button className="primary-button" disabled={isPending}>{isPending ? pending : submit}</button>
    </form>
  );
}

export function LogoutForm() {
  const [state, submitForm, isPending] = useActionState(logout, {});
  return (
    <form action={submitForm} className="shrink-0">
      <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-navy hover:bg-slate-100 disabled:opacity-60" disabled={isPending}>
        {isPending ? "Sedang keluar…" : "Keluar"}
      </button>
      {state.error && <p className="form-error mt-2" role="alert">{state.error}</p>}
    </form>
  );
}
