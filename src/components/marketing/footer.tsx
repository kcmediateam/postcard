import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-zinc-500">
            Tracked postcard campaigns for real estate agents — design, mail, and
            measure in one place.
          </p>
        </div>
        <FooterCol
          title="Product"
          links={[
            { label: "Services", href: "/services" },
            { label: "Products", href: "/products" },
            { label: "Pricing", href: "/pricing" },
          ]}
        />
        <FooterCol
          title="Company"
          links={[
            { label: "Contact", href: "/contact" },
            { label: "Log in", href: "/login" },
            { label: "Get started", href: "/login?mode=signup" },
          ]}
        />
        <FooterCol
          title="Get started"
          links={[
            { label: "Create an account", href: "/login?mode=signup" },
            { label: "See pricing", href: "/pricing" },
          ]}
        />
      </div>
      <div className="border-t border-zinc-100">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-6 py-5 text-xs text-zinc-400 sm:flex-row">
          <span>© {new Date().getFullYear()} Postcard. All rights reserved.</span>
          <span>Built for agents who farm neighborhoods.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <div className="text-sm font-semibold text-zinc-900">{title}</div>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="text-sm text-zinc-500 hover:text-zinc-900">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
