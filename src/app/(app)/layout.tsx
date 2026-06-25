"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { FullScreenLoader } from "@/components/ui/full-screen-loader";
import { HelpBot } from "@/components/help-bot";
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
  {
    label: "Integrations",
    href: "/integrations",
    enabled: true,
    icon: icon(
      <>
        <rect x="9" y="2" width="6" height="6" rx="1" />
        <path d="M12 8v4M7 22v-5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v5" />
      </>
    ),
  },
  {
    label: "Support",
    href: "/support",
    enabled: true,
    icon: icon(
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <path d="M12 17h.01" />
      </>
    ),
  },
  {
    label: "Settings",
    href: "/settings",
    enabled: true,
    icon: icon(
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </>
    ),
  },
];

const ADMIN_ITEM: NavItem = {
  label: "Admin",
  href: "/admin",
  enabled: true,
  icon: icon(
    <>
      <path d="M12 3 4 6v6c0 4 3.4 6.9 8 9 4.6-2.1 8-5 8-9V6l-8-3Z" />
    </>
  ),
};

function NavLinks({
  pathname,
  isAdmin,
}: {
  pathname: string;
  isAdmin: boolean;
}) {
  const items = isAdmin ? [...NAV, ADMIN_ITEM] : NAV;
  return (
    <>
      {items.map((item) => {
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
      className="block rounded-xl bg-ink p-3 text-white transition-opacity hover:opacity-90"
    >
      <div className="text-xs text-white/60">Credit balance</div>
      <div className="mt-0.5 text-xl font-semibold tabular-nums text-white">
        {balance.toLocaleString()}
        <span className="ml-1 text-sm font-normal text-white/55">credits</span>
      </div>
      <div className="mt-1 text-xs font-medium text-gold">Buy more →</div>
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
          <NavLinks pathname={pathname} isAdmin={session.profile.is_admin} />
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
            <NavLinks pathname={pathname} isAdmin={session.profile.is_admin} />
          </nav>
        </header>

        <main className="flex-1">{children}</main>
      </div>

      <HelpBot />
    </div>
  );
}
