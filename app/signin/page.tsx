"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignInPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "Elevate CRM User");
    const result =
      mode === "signup"
        ? await authClient.signUp.email({ email, password, name })
        : await authClient.signIn.email({ email, password });
    setBusy(false);
    if (result.error) return setError(result.error.message ?? "Authentication failed");
    router.push("/product");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <form onSubmit={submit} className="mx-auto max-w-sm space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-400">Elevate Commerce</p>
        <h1 className="text-2xl font-bold">{mode === "signin" ? "Sign in to CRM" : "Create CRM account"}</h1>
        {mode === "signup" && <Input name="name" placeholder="Your name" required />}
        <Input name="email" type="email" placeholder="Email address" required />
        <Input name="password" type="password" placeholder="Password" minLength={8} required />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button className="w-full bg-orange-600 hover:bg-orange-500" disabled={busy}>
          {busy ? "Working..." : mode === "signin" ? "Sign in" : "Create account"}
        </Button>
        <button className="w-full text-sm text-slate-400 hover:text-white" type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? "Create your first account" : "Already have an account? Sign in"}
        </button>
      </form>
    </main>
  );
}
