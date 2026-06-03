type State = "yes" | "partial" | "no";
type Cell = { s: State; note?: string };

const COLUMNS = [
  { name: "Radiate", sub: "Built for real-estate farming", brand: true },
  { name: "Click2Mail", sub: "Mail infrastructure / API" },
  { name: "PostcardMania", sub: "Full-service agency" },
  { name: "Vistaprint", sub: "General print & mail" },
];

type Row = { feature: string; cells: [Cell, Cell, Cell, Cell] };
type Group = { title: string; rows: Row[] };

const y = (note?: string): Cell => ({ s: "yes", note });
const p = (note?: string): Cell => ({ s: "partial", note });
const n = (note?: string): Cell => ({ s: "no", note });

const GROUPS: Group[] = [
  {
    title: "Built for real estate",
    rows: [
      {
        feature: "Purpose-built for farming (radius & listing-driven)",
        cells: [
          y("Radius & listing-driven by design"),
          n("General-purpose mail platform"),
          p("“Everywhere Real Estate” = mail + digital-ad campaign, not self-serve radius farming"),
          n("Not real-estate specific"),
        ],
      },
      {
        feature: "Self-serve, agent-facing platform",
        cells: [
          y("Purpose-built CMS — easy for non-technical agents, no design skills"),
          p("Ops / developer & API-oriented"),
          p("Consultant-led setup"),
          p("Generic editor — not a real-estate CMS built for agents"),
        ],
      },
      {
        feature: "White-label client / campaign portal",
        cells: [
          y("Design → print → sent visibility"),
          n("Account dashboard, not client-facing"),
          p("MyPostcardMania (account only)"),
          n("Not offered"),
        ],
      },
    ],
  },
  {
    title: "Quality & delivery",
    rows: [
      {
        feature: "CASS + NCOA address verification",
        cells: [
          y("CASS-certified + NCOA on every address"),
          y("Automatic CASS + NCOA"),
          p("USPS clearing; full CASS+NCOA cleansing not confirmed"),
          p("Basic validation only — not CASS+NCOA list cleansing"),
        ],
      },
      {
        feature: "First-Class + UV gloss as standard",
        cells: [
          y("First Class, 1-side UV, 100–120# cover"),
          y("First Class + UV (quoted)"),
          n("Standard class, no UV (quoted)"),
          p("Varies by order"),
        ],
      },
      {
        feature: "Per-piece USPS delivery tracking (IMb)",
        cells: [
          y("Surfaced in the portal"),
          y("IMb tracking included"),
          y("In dashboard"),
          p("Via “Everywhere” add-on"),
        ],
      },
      {
        feature: "QR scan tracking",
        cells: [
          y("Scan-count engagement"),
          n("Not advertised"),
          y("Per-recipient (who scanned)"),
          p("QR in editor; scan tracking only via paid add-on"),
        ],
      },
      {
        feature: "Undeliverables handled, not lost",
        cells: [
          y("First Class + verified addresses"),
          y("First Class behavior"),
          n("Standard — not returned to you"),
          p("Depends on class chosen"),
        ],
      },
    ],
  },
  {
    title: "Lists",
    rows: [
      {
        feature: "Done-for-you list building (radius / demographic)",
        cells: [
          y("We build your target area"),
          n("Bring your own / via API"),
          y("Sources or builds lists"),
          y("Buy a local address list"),
        ],
      },
      {
        feature: "Reuse a list we built — no repeat per-address fee",
        cells: [
          y("Pay once per radius, re-send at base rate"),
          n("Not applicable / not confirmed"),
          n("Not confirmed"),
          n("Lists sold per campaign"),
        ],
      },
    ],
  },
  {
    title: "Automation",
    rows: [
      {
        feature: "Scheduled & repeat sends",
        cells: [
          y("Built into campaigns"),
          p("Via API / CRM Hub — requires integration setup"),
          y("Scheduled drops"),
          n("Not a standard feature"),
        ],
      },
      {
        feature: "CRM-triggered automation",
        cells: [
          y("Fires on listing status"),
          y("CRM Hub: Salesforce, Follow Up Boss…"),
          p("API / Zapier; MLS trigger not confirmed"),
          n("Not offered"),
        ],
      },
    ],
  },
  {
    title: "Pricing & support",
    rows: [
      {
        feature: "Monthly plans + rollover credits that never expire",
        cells: [
          y("Unused credits stay in your wallet"),
          n("No subscription / no credits"),
          p("Subscriptions, no rollover"),
          n("Per-order only"),
        ],
      },
      {
        feature: "Transparent, self-serve pricing",
        cells: [
          y("Flat per-credit, postage included"),
          y("Transparent, no minimums"),
          p("Quote-based; postage fee + QR add-on"),
          p("Service & postage fees added on"),
        ],
      },
      {
        feature: "US-based support (chat, phone, email)",
        cells: [
          y("24/7"),
          p("Support available; hours not confirmed"),
          p("US-based; hours not confirmed"),
          p("Phone; hours not confirmed"),
        ],
      },
    ],
  },
];

function Mark({ s, brand }: { s: State; brand?: boolean }) {
  if (s === "yes")
    return (
      <svg
        className={`size-5 ${brand ? "text-brand-600" : "text-emerald-600"}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-label="Offered"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  if (s === "partial")
    return (
      <svg
        className="size-5 text-amber-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        aria-label="Partial or qualified"
      >
        <path d="M5 12h14" />
      </svg>
    );
  return (
    <svg
      className="size-4 text-zinc-300"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      aria-label="Not offered or not confirmed"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function Entry({ cell, brand }: { cell: Cell; brand?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <Mark s={cell.s} brand={brand} />
      {cell.note && (
        <span
          className={`text-[13px] leading-snug ${
            brand ? "font-medium text-zinc-700" : "text-zinc-500"
          }`}
        >
          {cell.note}
        </span>
      )}
    </div>
  );
}

export function CompareTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] border-collapse">
        <thead>
          <tr className="border-b border-zinc-200">
            <th className="w-[28%] px-5 py-5 text-left align-bottom text-xs font-semibold uppercase tracking-wide text-zinc-400">
              How Radiate compares
            </th>
            {COLUMNS.map((c) => (
              <th
                key={c.name}
                className={`w-[18%] px-3 py-5 align-bottom ${
                  c.brand ? "bg-brand-50/60" : ""
                }`}
              >
                {c.brand ? (
                  <span className="bg-radiate inline-block rounded-full px-4 py-1.5 text-base font-bold text-white shadow-sm">
                    Radiate
                  </span>
                ) : (
                  <span className="text-lg font-bold text-zinc-800">{c.name}</span>
                )}
                <span
                  className={`mt-1.5 block text-xs font-medium ${
                    c.brand ? "text-brand-700" : "text-zinc-400"
                  }`}
                >
                  {c.sub}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {GROUPS.map((group) => (
            <GroupRows key={group.title} group={group} />
          ))}
        </tbody>
      </table>
      <Legend />
    </div>
  );
}

function GroupRows({ group }: { group: Group }) {
  return (
    <>
      <tr>
        <td
          colSpan={5}
          className="bg-zinc-50 px-5 pb-2 pt-5 text-sm font-bold uppercase tracking-wide text-zinc-500"
        >
          {group.title}
        </td>
      </tr>
      {group.rows.map((row) => (
        <tr key={row.feature} className="border-b border-zinc-100 align-top">
          <td className="px-5 py-4 text-left text-[15px] font-semibold text-zinc-800">
            {row.feature}
          </td>
          {row.cells.map((cell, j) => (
            <td
              key={j}
              className={`px-3 py-4 ${j === 0 ? "bg-brand-50/40" : ""}`}
            >
              <Entry cell={cell} brand={j === 0} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-zinc-200 px-5 py-4 text-sm text-zinc-500">
      <span className="inline-flex items-center gap-1.5">
        <Mark s="yes" /> Offered
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Mark s="partial" /> Partial / qualified
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Mark s="no" /> Not offered / not confirmed
      </span>
    </div>
  );
}
