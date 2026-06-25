"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { SelectField } from "@/components/ui/select-field";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { useData } from "@/lib/data/data-context";
import { US_STATES } from "@/lib/profile";

export default function SettingsPage() {
  const { session, db, refresh } = useData();
  const p = session?.profile;

  const [form, setForm] = useState({
    full_name: p?.full_name ?? "",
    company_name: p?.company_name ?? "",
    return_name: p?.return_name ?? "",
    return_line1: p?.return_line1 ?? "",
    return_line2: p?.return_line2 ?? "",
    return_city: p?.return_city ?? "",
    return_state: p?.return_state ?? "",
    return_zip: p?.return_zip ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwFlash, setPwFlash] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  async function changePassword() {
    setPwError(null);
    setPwFlash(null);
    if (newPassword.length < 8) {
      setPwError("Use at least 8 characters.");
      return;
    }
    setPwBusy(true);
    try {
      await db.updatePassword(newPassword);
      setNewPassword("");
      setPwFlash("Password updated.");
    } catch {
      setPwError("Couldn't update your password. Please try again.");
    } finally {
      setPwBusy(false);
    }
  }

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    if (!form.return_name.trim() || !form.return_line1.trim() || !form.return_city.trim() || !form.return_state || !/^\d{5}(-\d{4})?$/.test(form.return_zip.trim())) {
      setError("Please complete the return address (name, street, city, state, valid ZIP).");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await db.updateProfile({
        full_name: form.full_name.trim() || null,
        company_name: form.company_name.trim() || null,
        return_name: form.return_name.trim(),
        return_line1: form.return_line1.trim(),
        return_line2: form.return_line2.trim() || null,
        return_city: form.return_city.trim(),
        return_state: form.return_state,
        return_zip: form.return_zip.trim(),
      });
      await refresh();
      setFlash("Saved.");
      window.setTimeout(() => setFlash(null), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function openPortal() {
    setPortalBusy(true);
    try {
      await db.openBillingPortal();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open the billing portal.");
      setPortalBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <PageHeader
        title="Settings"
        description="Your name, brokerage, and the return address printed on every postcard."
      />

      {flash && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800">
          {flash}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="mt-6">
        <CardHeader title="Profile" description="Used across your account and as the default sender." />
        <div className="space-y-4 px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Your name"
              placeholder="Jordan Avery"
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
            />
            <TextField
              label="Company / brokerage"
              placeholder="Avery Realty Group"
              value={form.company_name}
              onChange={(e) => set("company_name", e.target.value)}
            />
          </div>
          <TextField label="Account email" value={p?.email ?? ""} disabled hint="Contact support to change your login email." />
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Return address" description="Prints on the back of every postcard (the FROM block)." />
        <div className="space-y-4 px-5 py-5">
          <TextField
            label="Return name"
            placeholder="Jordan Avery"
            value={form.return_name}
            onChange={(e) => set("return_name", e.target.value)}
          />
          <TextField
            label="Address line 1"
            placeholder="120 Market St"
            value={form.return_line1}
            onChange={(e) => set("return_line1", e.target.value)}
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
            />
            <SelectField
              label="State"
              placeholder="State"
              options={US_STATES.map((s) => ({ value: s.code, label: s.code }))}
              value={form.return_state}
              onChange={(e) => set("return_state", e.target.value)}
            />
            <TextField
              label="ZIP"
              placeholder="78701"
              inputMode="numeric"
              value={form.return_zip}
              onChange={(e) => set("return_zip", e.target.value)}
            />
          </div>
        </div>
      </Card>

      <div className="mt-6 flex justify-end">
        <Button size="lg" loading={saving} onClick={save}>
          Save changes
        </Button>
      </div>

      <Card className="mt-8">
        <CardHeader
          title="Payments & invoices"
          description="Manage your saved payment methods, download invoices, and update or cancel your subscription — handled securely by Stripe."
        />
        <div className="px-5 py-5">
          <Button variant="secondary" loading={portalBusy} onClick={openPortal}>
            Open payment portal
          </Button>
          <p className="mt-2 text-xs text-zinc-400">
            (This is the &ldquo;customer portal&rdquo; — your billing details, not your profile.)
          </p>
        </div>
      </Card>

      <Card className="mt-8">
        <CardHeader
          title="Password"
          description="Set a new password for signing in to Radiate."
        />
        <div className="space-y-3 px-5 py-5">
          <div className="max-w-sm">
            <TextField
              label="New password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              hint="At least 8 characters."
            />
          </div>
          {pwError && <div className="text-sm text-red-600">{pwError}</div>}
          {pwFlash && <div className="text-sm text-green-700">{pwFlash}</div>}
          <Button variant="secondary" loading={pwBusy} onClick={changePassword}>
            Update password
          </Button>
        </div>
      </Card>
    </div>
  );
}
