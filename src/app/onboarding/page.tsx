"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { SelectField } from "@/components/ui/select-field";
import { Logo } from "@/components/ui/logo";
import { FullScreenLoader } from "@/components/ui/full-screen-loader";
import { useData } from "@/lib/data/data-context";
import { hasReturnAddress, US_STATES } from "@/lib/profile";

interface FormState {
  return_name: string;
  company_name: string;
  return_line1: string;
  return_line2: string;
  return_city: string;
  return_state: string;
  return_zip: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

export default function OnboardingPage() {
  const router = useRouter();
  const { session, loading, db, refresh, signOut } = useData();

  const [form, setForm] = useState<FormState>({
    return_name: "",
    company_name: "",
    return_line1: "",
    return_line2: "",
    return_city: "",
    return_state: "",
    return_zip: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  // Route guards + prefill from the current profile.
  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (hasReturnAddress(session.profile)) {
      router.replace("/dashboard");
      return;
    }
    const p = session.profile;
    setForm((prev) => ({
      ...prev,
      return_name: p.return_name ?? p.full_name ?? "",
      company_name: p.company_name ?? "",
    }));
  }, [loading, session, router]);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const next: Errors = {};
    if (!form.return_name.trim()) next.return_name = "Required.";
    if (!form.return_line1.trim()) next.return_line1 = "Required.";
    if (!form.return_city.trim()) next.return_city = "Required.";
    if (!form.return_state) next.return_state = "Required.";
    if (!/^\d{5}(-\d{4})?$/.test(form.return_zip.trim()))
      next.return_zip = "Enter a valid ZIP code.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await db.updateProfile({
        return_name: form.return_name.trim(),
        company_name: form.company_name.trim() || null,
        return_line1: form.return_line1.trim(),
        return_line2: form.return_line2.trim() || null,
        return_city: form.return_city.trim(),
        return_state: form.return_state,
        return_zip: form.return_zip.trim(),
      });
      await refresh();
      router.replace("/dashboard");
    } catch {
      setSubmitting(false);
    }
  }

  if (loading || !session || hasReturnAddress(session.profile)) {
    return <FullScreenLoader />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <Logo />
        <Button variant="ghost" size="sm" onClick={() => signOut()}>
          Sign out
        </Button>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        {/* Step indicator */}
        <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
          Step 1 of 1 · Onboarding
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
          Set your return address
        </h1>
        <p className="mt-1 max-w-xl text-sm text-zinc-500">
          This prints on the back of every postcard you send and is required
          before your first campaign. You can change it later in settings.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <TextField
              label="Return name"
              placeholder="Jordan Avery"
              value={form.return_name}
              onChange={(e) => set("return_name", e.target.value)}
              error={errors.return_name}
            />
            <TextField
              label="Company name (optional)"
              placeholder="Avery Realty Group"
              value={form.company_name}
              onChange={(e) => set("company_name", e.target.value)}
            />
            <TextField
              label="Address line 1"
              placeholder="120 Market St"
              value={form.return_line1}
              onChange={(e) => set("return_line1", e.target.value)}
              error={errors.return_line1}
            />
            <TextField
              label="Address line 2 (optional)"
              placeholder="Suite 300"
              value={form.return_line2}
              onChange={(e) => set("return_line2", e.target.value)}
            />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-[1fr_8rem_8rem]">
              <TextField
                label="City"
                placeholder="Austin"
                value={form.return_city}
                onChange={(e) => set("return_city", e.target.value)}
                error={errors.return_city}
              />
              <SelectField
                label="State"
                placeholder="State"
                options={US_STATES.map((s) => ({
                  value: s.code,
                  label: s.code,
                }))}
                value={form.return_state}
                onChange={(e) => set("return_state", e.target.value)}
                error={errors.return_state}
              />
              <TextField
                label="ZIP"
                placeholder="78701"
                inputMode="numeric"
                value={form.return_zip}
                onChange={(e) => set("return_zip", e.target.value)}
                error={errors.return_zip}
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" loading={submitting} size="lg">
                Save and continue
              </Button>
            </div>
          </form>

          {/* Live preview */}
          <div className="lg:pt-1">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
              Preview
            </p>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              {/* Mini postcard back */}
              <div className="aspect-[3/2] rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3">
                <div className="text-[10px] leading-tight text-zinc-600">
                  <div className="font-semibold text-zinc-800">
                    {form.return_name || "Your name"}
                  </div>
                  {form.company_name && <div>{form.company_name}</div>}
                  <div>{form.return_line1 || "Address line 1"}</div>
                  {form.return_line2 && <div>{form.return_line2}</div>}
                  <div>
                    {(form.return_city || "City") +
                      ", " +
                      (form.return_state || "ST") +
                      " " +
                      (form.return_zip || "ZIP")}
                  </div>
                </div>
                <div className="mt-2 flex justify-end">
                  <div className="size-8 rounded border border-zinc-300 bg-white text-center text-[7px] leading-8 text-zinc-400">
                    QR
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                Your return block (top-left) and the tracking QR appear on the
                postcard back.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
