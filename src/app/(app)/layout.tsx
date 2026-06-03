"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { FullScreenLoader } from "@/components/ui/full-screen-loader";
import { useData } from "@/lib/data/data-context";
import { hasReturnAddress } from "@/lib/profile";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  enabled: boolean;
}

const icon = (path: React.ReactNode) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {path}
  </svg>
);

// Items flip to enabled as each screen lands.
const NAV: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    enabled: true,
    icon: icon(
      <>
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </>
    ),
  },
  {
    label: "Billing",
    href: "/billing",
    enabled: true,
    icon: icon(
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </>
    ),
  },
  {
    label: "Designs",
    href: "/designs",
    enabled: true,
    icon: icon(
      <>
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <circle cx="8.5" cy="9" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </>
    ),
  },
  {
    label: "Contacts",
    href: "/contacts",
    enabled: true,
    icon: icon(
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  },
  {
    label: "New campaign",
    href: "/campaigns/new",
    enabled: true,
    icon: icon(
      <>
        <path d="m3 11 18-5v12L3 14v-3Z" />
        <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
      </>
    ),
  },
];

function NavLinks({ pathname }: { pathname: string }) {
  return (
    <>
      {NAV.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        if (!item.enabled) {
          return (
            <span
              key={item.href}
              className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400"
              title="Coming in a later screen"
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                soon
              </span>
            </span>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-brand-50 text-brand-700"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

function BalanceWidget({ balance }: { balance: number }) {
  return (
    <Link
      href="/billing"
      className="block rounded-xl border border-zinc-200 bg-white p-3 transition-colors hover:border-brand-300"
    >
      <div className="text-xs text-zinc-500">Credit balance</div>
      <div className="mt-0.5 text-xl font-semibold tabular-nums text-zinc-900">
        {balance.toLocaleString()}
        <span className="ml-1 text-sm font-normal text-zinc-400">credits</span>
      </div>
      <div className="mt-1 text-xs font-medium text-brand-600">
        Buy more →
      </div>
    </Link>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, loading, wallet, signOut } = useData();

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace("/login");
    else if (!hasReturnAddress(session.profile)) router.replace("/onboarding");
  }, [loading, session, router]);

  if (loading || !session || !hasReturnAddress(session.profile)) {
    return <FullScreenLoader />;
  }

  const balance = wallet?.balance ?? 0;

  return (
    <div className="flex min-h-full flex-1">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-200 bg-white p-4 lg:flex">
        <div className="px-2 py-2">
          <Logo />
        </div>
        <nav className="mt-4 flex-1 space-y-1">
          <NavLinks pathname={pathname} />
        </nav>
        <div className="space-y-3">
          <BalanceWidget balance={balance} />
          <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-zinc-800">
                {session.profile.full_name ?? "Agent"}
              </div>
              <div className="truncate text-xs text-zinc-500">
                {session.profile.email}
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="border-b border-zinc-200 bg-white lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Logo />
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium tabular-nums text-zinc-700">
                {balance.toLocaleString()} cr
              </span>
              <button
                onClick={() => signOut()}
                className="rounded-md px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100"
              >
                Sign out
              </button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
            <NavLinks pathname={pathname} />
          </nav>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
