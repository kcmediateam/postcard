"use client";

import { useEffect, useRef, useState } from "react";

const SUPPORT_EMAIL = "info@kcmediateam.me";
const IDLE_MS = 35000;

type Msg = { from: "bot" | "user"; text: string };

const FAQ: { q: string; a: string }[] = [
  {
    q: "Pricing",
    a: "Credit-based — 1 credit sends 1 postcard, with volume discounts as you scale. Try the calculator on this page, or open the Pricing page for plans + packs.",
  },
  {
    q: "How it works",
    a: "Design a postcard, pick your list (or let us build it), send now or schedule, then watch deliveries and QR scans on your dashboard.",
  },
  {
    q: "Done-for-you lists",
    a: "Pick “Automation + lead gen” and we source the audience for your target radius — pay once per radius, then re-send to it any time.",
  },
  {
    q: "Talk to a human",
    a: `We're US-based with 24/7 support — chat, phone, and email. Email ${SUPPORT_EMAIL} and a real person will jump in.`,
  },
];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { from: "bot", text: "Hi! 👋 Questions about Radiate? Pick a topic or ask away." },
  ]);
  const [input, setInput] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);

  // Auto-open once after the visitor goes idle.
  useEffect(() => {
    if (autoOpened || dismissed) return;
    let timer: number;
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        setOpen(true);
        setAutoOpened(true);
      }, IDLE_MS);
    };
    const events = ["mousemove", "keydown", "scroll", "touchstart", "click"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [autoOpened, dismissed]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [messages, open]);

  function ask(q: string, a: string) {
    setMessages((m) => [...m, { from: "user", text: q }, { from: "bot", text: a }]);
  }
  function send() {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [
      ...m,
      { from: "user", text },
      {
        from: "bot",
        text: `Thanks! For a detailed answer fastest, email ${SUPPORT_EMAIL} — or pick a topic above.`,
      },
    ]);
    setInput("");
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {open && (
        <div className="mb-3 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
          {/* header */}
          <div className="bg-radiate flex items-center justify-between px-4 py-3 text-white">
            <div>
              <div className="text-sm font-semibold">Radiate support</div>
              <div className="text-xs text-white/80">US-based · 24/7</div>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                setDismissed(true);
              }}
              className="rounded-md p-1 text-white/90 hover:bg-white/20"
              aria-label="Close chat"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          {/* messages */}
          <div ref={bodyRef} className="flex-1 space-y-2 overflow-y-auto bg-zinc-50 p-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.from === "bot"
                    ? "bg-white text-zinc-700 shadow-sm"
                    : "ml-auto bg-brand-600 text-white"
                }`}
              >
                {m.text}
              </div>
            ))}
            {/* quick replies */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {FAQ.map((f) => (
                <button
                  key={f.q}
                  onClick={() => ask(f.q, f.a)}
                  className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:border-brand-300 hover:text-brand-700"
                >
                  {f.q}
                </button>
              ))}
            </div>
          </div>

          {/* input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2 border-t border-zinc-200 p-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
              className="h-9 flex-1 rounded-lg border border-zinc-300 px-3 text-sm focus:border-brand-500 focus:outline-none"
            />
            <button
              type="submit"
              className="bg-radiate grid size-9 place-items-center rounded-lg text-white"
              aria-label="Send"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* launcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="bg-radiate grid size-14 place-items-center rounded-full text-white shadow-xl transition-transform hover:scale-105"
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 0 1-.9-3.8A8.38 8.38 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5Z" />
          </svg>
        )}
      </button>
    </div>
  );
}
