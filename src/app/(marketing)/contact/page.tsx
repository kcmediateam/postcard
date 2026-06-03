"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

// Change this to your real support inbox.
const SUPPORT_EMAIL = "hello@postcard.app";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`Radiate inquiry from ${name || "a visitor"}`);
    const body = encodeURIComponent(`${message}\n\n— ${name}\n${email}`);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    setSent(true);
  }

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
          Get in touch
        </h1>
        <p className="mt-4 text-lg text-zinc-600">
          Questions about campaigns, pricing, or full-service list building?
          Send us a note and we&rsquo;ll get back to you.
        </p>

        <div className="mt-8 space-y-4 text-sm">
          <div>
            <div className="font-semibold text-zinc-900">Email</div>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-600 hover:text-brand-700">
              {SUPPORT_EMAIL}
            </a>
          </div>
          <div>
            <div className="font-semibold text-zinc-900">Already a customer?</div>
            <Link href="/login" className="text-brand-600 hover:text-brand-700">
              Log in to your dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 p-6 sm:p-8">
        {sent ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="grid size-12 place-items-center rounded-full bg-green-100 text-green-700">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-zinc-900">
              Your email client is opening
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              If it didn&rsquo;t, email us directly at {SUPPORT_EMAIL}.
            </p>
            <Button className="mt-5" variant="secondary" onClick={() => setSent(false)}>
              Send another
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Jordan Avery"
            />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@brokerage.com"
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                Message
              </label>
              <textarea
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                placeholder="Tell us what you're looking to send…"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
            <Button type="submit" fullWidth size="lg">
              Send message
            </Button>
            <p className="text-center text-xs text-zinc-400">
              Opens your email app to send to {SUPPORT_EMAIL}.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
