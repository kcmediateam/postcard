type Cell = true | false | string;

const COLUMNS = ["ProspectPLUS!", "Wise Pelican", "Three Click Postcard"];

// [feature, radiate, [ProspectPLUS!, Wise Pelican, Three Click]]
const ROWS: { feature: string; radiate: Cell; others: [Cell, Cell, Cell] }[] = [
  { feature: "Modern online postcard builder", radiate: true, others: ["Dated", "Generic & clunky", false] },
  { feature: "Personalize templates (photo, headshot, listing)", radiate: true, others: ["Limited", "Generic templates", false] },
  { feature: "100% address verification", radiate: true, others: ["Generic lists", "—", "Not 100% verified"] },
  { feature: "Postcard mail tracking + QR scans", radiate: true, others: [false, false, "No tracking"] },
  { feature: "Client dashboard", radiate: true, others: [false, false, false] },
  { feature: "Monthly plans with volume price breaks", radiate: true, others: [false, "Pay-as-you-go only", false] },
  { feature: "Rollover on unused monthly credits", radiate: true, others: [false, false, false] },
  { feature: "Reusable lists — pay once per radius", radiate: true, others: ["Pay every time", "Pay per list, every time", "Pay per address"] },
  { feature: "Done-for-you list building", radiate: true, others: ["Generic lists", false, false] },
  { feature: "Scheduled & repeat sends", radiate: true, others: ["—", "—", "—"] },
  { feature: "CRM-triggered automation (listing status)", radiate: true, others: [false, false, false] },
  { feature: "Transparent pricing — no hidden fees", radiate: true, others: ["Hidden fees, scope creep", "—", "—"] },
  { feature: "US-based 24/7 support (chat, phone, email)", radiate: true, others: ["—", "—", "—"] },
];

function Check() {
  return (
    <svg className="mx-auto size-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
function Cross() {
  return (
    <svg className="mx-auto size-4 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
function Cell({ v }: { v: Cell }) {
  if (v === true) return <Check />;
  if (v === false) return <Cross />;
  return <span className="text-sm leading-tight text-zinc-400">{v}</span>;
}

export function CompareTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-base">
        <thead>
          <tr>
            <th className="w-[34%] px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
              How Radiate compares
            </th>
            <th className="w-[16.5%] px-3 py-3">
              <span className="bg-radiate inline-block rounded-full px-3 py-1 text-sm font-semibold text-white shadow-sm">
                Radiate
              </span>
            </th>
            {COLUMNS.map((c) => (
              <th key={c} className="w-[16.5%] px-3 py-4 text-sm font-semibold text-zinc-500">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, i) => (
            <tr
              key={row.feature}
              className={i % 2 === 1 ? "bg-zinc-50/60" : ""}
            >
              <td className="px-4 py-3 text-left font-medium text-zinc-800">
                {row.feature}
              </td>
              <td className="bg-brand-50/70 px-3 py-3 text-center align-middle">
                <Cell v={row.radiate} />
              </td>
              {row.others.map((v, j) => (
                <td key={j} className="px-3 py-3 text-center align-middle">
                  <Cell v={v} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
