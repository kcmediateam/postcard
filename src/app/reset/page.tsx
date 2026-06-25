"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Logo } from "@/components/ui/logo";
import { useData } from "@/lib/data/data-context";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { db } = useData();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      await db.updatePassword(password);
      setDone(true);
      setTimeout(() => router.replace("/dashboard"), 1600);
    } catch {
      setError(
        "This reset link is invalid or has expired. Request a new one from the sign-in page."
      );
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-paper px-6">
      <div className="w-full max-w-sm">
        <Logo />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-zinc-900">
          Set a new password
        </h1>
        {done ? (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Password updated — signing you in…
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <TextField
              label="New password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint="At least 8 characters."
            />
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <Button type="submit" fullWidth loading={busy} size="lg">
              Update password
            </Button>
            <a
              href="/login"
              className="block text-center text-sm font-medium text-zinc-500 hover:text-zinc-700"
            >
              ← Back to sign in
            </a>
          </form>
        )}
      </div>
    </div>
  );
}
