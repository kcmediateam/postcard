"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { TextField } from "@/components/ui/text-field";
import { useData } from "@/lib/data/data-context";
import {
  HELP_ARTICLES,
  HELP_CATEGORIES,
  searchArticles,
  type HelpArticle,
} from "@/lib/help-articles";

const SUPPORT_EMAIL = "info@kcmediateam.me";

function ArticleBody({ body }: { body: string[] }) {
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = (key: string) => {
    if (bullets.length) {
      blocks.push(
        <ul key={key} className="my-1 list-disc space-y-1 pl-5">
          {bullets.map((b, i) => (
            <li key={i}>{b.replace(/^- /, "")}</li>
          ))}
        </ul>
      );
      bullets = [];
    }
  };
  body.forEach((line, i) => {
    if (line.startsWith("- ")) bullets.push(line);
    else {
      flush(`u${i}`);
      blocks.push(<p key={i}>{line}</p>);
    }
  });
  flush("uend");
  return <div className="space-y-2 text-sm leading-relaxed text-zinc-600">{blocks}</div>;
}

export default function SupportPage() {
  const { session } = useData();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");
  const [open, setOpen] = useState<string | null>(null);

  const results = useMemo(() => {
    if (query.trim()) return searchArticles(query);
    return cat === "All"
      ? HELP_ARTICLES
      : HELP_ARTICLES.filter((a) => a.category === cat);
  }, [query, cat]);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <PageHeader
        title="Help & support"
        description="Search the guides below, or send us a ticket — we usually reply within a business day."
      />

      <div className="mt-6">
        <TextField
          label=""
          placeholder="Search help articles…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {!query.trim() && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {["All", ...HELP_CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                cat === c
                  ? "bg-brand-600 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 space-y-2">
        {results.length === 0 ? (
          <Card className="p-5 text-sm text-zinc-500">
            No articles matched. Try different words, or send a ticket below.
          </Card>
        ) : (
          results.map((a: HelpArticle) => {
            const isOpen = open === a.slug;
            return (
              <Card key={a.slug} className="overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? null : a.slug)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left"
                >
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">
                      {a.title}
                    </div>
                    <div className="text-xs text-zinc-500">{a.summary}</div>
                  </div>
                  <span
                    className={`text-brand-600 transition-transform ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-zinc-100 px-5 py-4">
                    <ArticleBody body={a.body} />
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      <TicketForm
        defaultName={session?.profile.full_name ?? ""}
        defaultEmail={session?.profile.email ?? ""}
      />
    </div>
  );
}

function TicketForm({
  defaultName,
  defaultEmail,
}: {
  defaultName: string;
  defaultEmail: string;
}) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!email.trim() || !message.trim()) {
      setError("Add your email and a message.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message, kind: "ticket" }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.fallback) {
        // No email service configured — open the user's mail app instead.
        const body = encodeURIComponent(
          `Name: ${name}\nEmail: ${email}\n\n${message}`
        );
        window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
          subject || "Radiate support"
        )}&body=${body}`;
        return;
      }
      if (!res.ok || !json.sent) throw new Error("send_failed");
      setDone(true);
      setSubject("");
      setMessage("");
    } catch {
      setError("Couldn't send right now. Email us at " + SUPPORT_EMAIL + ".");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-8 p-5">
      <h2 className="text-base font-semibold text-zinc-900">
        Still need help? Submit a ticket
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        It goes straight to our team and we&rsquo;ll reply to your email.
      </p>
      {done ? (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Thanks — your ticket is in. We&rsquo;ll be in touch shortly. 🎉
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <TextField
            label="Subject"
            placeholder="What's going on?"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">
              Message
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what you need help with…"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <Button onClick={submit} loading={busy}>
            Send ticket
          </Button>
        </div>
      )}
    </Card>
  );
}
