"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Logo } from "@/components/ui/logo";
import { useData } from "@/lib/data/data-context";
import { AuthError } from "@/lib/data";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const { session, loading, signIn, signUp } = useData();

  const [mode, setMode] = useState<Mode>(() =>
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("mode") === "signup"
      ? "signup"
      : "signin"
  );
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in? Send them into the app.
  useEffect(() => {
    if (!loading && session) router.replace("/dashboard");
  }, [loading, session, router]);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        await signUp({ email, password, full_name: fullName });
      } else {
        await signIn(email, password);
      }
      router.replace("/dashboard");
    } catch (err) {
      setError(
        err instanceof AuthError
          ? err.message
          : "Something went wrong. Please try again."
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1">
      {/* Brand / marketing panel */}
      <aside className="bg-radiate relative hidden w-1/2 flex-col justify-between p-12 text-white lg:flex">
        <Logo variant="light" />
        <div className="max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Targeted direct mail, done for you.
          </h1>
          <p className="mt-4 text-brand-100">
            Design it, upload your list, and send tracked postcards in minutes.
            Every piece gets a unique QR code so you can watch sends,
            deliveries, and scans land on your dashboard.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-brand-100">
            {[
              "Per-piece credits or a monthly plan with rollover",
              "Address verification before anything mails",
              "QR scan tracking on every postcard",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand-300" />
                {line}
              </li>
            ))}
          </ul>
        </div>
        <a href="/" className="text-xs text-white/70 hover:text-white">
          ← Back to radiate.app
        </a>
      </aside>

      {/* Form panel */}
      <main className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="lg:hidden">
            <Logo />
          </div>

          <div className="mt-8 lg:mt-0">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {mode === "signin"
                ? "Sign in to manage your postcard campaigns."
                : "Start sending tracked postcard campaigns."}
            </p>
          </div>

          {/* mode toggle */}
          <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1 text-sm font-medium">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`h-9 rounded-md transition-colors ${
                  mode === m
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <TextField
                label="Full name"
                type="text"
                autoComplete="name"
                placeholder="Jordan Avery"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            )}
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@brokerage.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label="Password"
              type="password"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint={
                mode === "signup" ? "At least 8 characters." : undefined
              }
            />

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" fullWidth loading={submitting} size="lg">
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-zinc-400">
            <a href="/" className="hover:text-zinc-600">
              ← Back to home
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
