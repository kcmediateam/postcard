"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// Auto-pop after this much mouse/keyboard inactivity (once per session).
const IDLE_MS = 20000;

type TipSet = { title: string; tips: string[] };

const DEFAULT_TIPS: TipSet = {
  title: "Welcome to Radiate 👋",
  tips: [
    "Three steps to mail: add a Design, upload your Contacts, then create a Campaign.",
    "Stuck on anything? This helper has quick tips on every screen.",
  ],
};

function tipsFor(pathname: string): TipSet {
  if (pathname.startsWith("/designs"))
    return {
      title: "Designs",
      tips: [
        "Upload a front + back — we auto-fit your art to the exact print size, no cropping.",
        "Set the client's “From” address and a QR link (with UTM tracking) right on the upload.",
      ],
    };
  if (pathname.startsWith("/contacts"))
    return {
      title: "Contacts",
      tips: [
        "Upload a CSV, or switch to “Paste” and drop rows straight from a spreadsheet.",
        "We verify every address before mailing — undeliverable ones are skipped and never charged.",
      ],
    };
  if (pathname.startsWith("/campaigns"))
    return {
      title: "New campaign",
      tips: [
        "Pick a design + a list, then send now or schedule for later.",
        "Want different UTMs on a reused design? Use the optional per-campaign QR override.",
      ],
    };
  if (pathname.startsWith("/billing"))
    return {
      title: "Billing",
      tips: [
        "Buy a credit pack or subscribe to a monthly plan — credits are spent when postcards send.",
        "Have a promo code? Enter it on the Stripe checkout screen.",
      ],
    };
  if (pathname.startsWith("/dashboard"))
    return {
      title: "Tracking",
      tips: [
        "Click a campaign to see per-recipient status and QR scans.",
        "“Share with client” gives them a read-only tracking link — no login needed.",
        "“Sync for print” refreshes delivery statuses anytime.",
      ],
    };
  return DEFAULT_TIPS;
}

export function HelpBot() {
  const pathname = usePathname() || "";
  const [open, setOpen] = useState(false);
  const autoOpened = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem("helpbot-auto") === "1";
    } catch {}

    function arm() {
      if (timer.current) clearTimeout(timer.current);
      if (dismissed || autoOpened.current) return;
      timer.current = setTimeout(() => {
        autoOpened.current = true;
        setOpen(true);
      }, IDLE_MS);
    }

    const evts = ["mousemove", "keydown", "scroll", "touchstart", "click"];
    evts.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    arm();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      evts.forEach((e) => window.removeEventListener(e, arm));
    };
  }, []);

  function dismiss() {
    setOpen(false);
    try {
      sessionStorage.setItem("helpbot-auto", "1");
    } catch {}
  }

  const t = tipsFor(pathname);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-72 origin-bottom-right rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl sm:w-80">
          <div className="flex items-start gap-2.5">
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-600 text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-zinc-900">
                {t.title}
              </div>
              <div className="text-xs text-zinc-500">Need a hand?</div>
            </div>
            <button
              onClick={dismiss}
              aria-label="Close help"
              className="-mr-1 -mt-1 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <ul className="mt-3 space-y-2">
            {t.tips.map((tip, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed text-zinc-600">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-400" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close help" : "Open help"}
        className="grid size-12 place-items-center rounded-full bg-brand-600 text-white shadow-lg transition-transform hover:scale-105"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        )}
      </button>
    </div>
  );
}
