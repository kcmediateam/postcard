"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/data/data-context";

const NAV = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Products", href: "/products" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
];

export function MarketingHeader() {
  const pathname = usePathname();
  const { session, loading } = useData();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" aria-label="Postcard home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "text-brand-700"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {!loading && session ? (
            <Link href="/dashboard">
              <Button size="sm">Go to dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/login?mode=signup">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>

        {/* mobile toggle */}
        <button
          className="rounded-md p-2 text-zinc-600 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-zinc-200 bg-white md:hidden">
          <nav className="mx-auto flex w-full max-w-6xl flex-col px-4 py-2">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2 px-3 pb-2">
              {!loading && session ? (
                <Link href="/dashboard" className="flex-1">
                  <Button fullWidth size="sm">Go to dashboard</Button>
                </Link>
              ) : (
                <>
                  <Link href="/login" className="flex-1">
                    <Button variant="secondary" fullWidth size="sm">Log in</Button>
                  </Link>
                  <Link href="/login?mode=signup" className="flex-1">
                    <Button fullWidth size="sm">Get started</Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
