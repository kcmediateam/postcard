// Sliding strip of US brokerage names. Pure CSS marquee (see globals.css) —
// no client JS. The list is rendered twice inside one track so the -50% slide
// loops seamlessly.

const BROKERAGES = [
  "Keller Williams",
  "RE/MAX",
  "Coldwell Banker",
  "Century 21",
  "Compass",
  "eXp Realty",
  "Berkshire Hathaway HomeServices",
  "Sotheby's International Realty",
  "Realty ONE Group",
  "Better Homes & Gardens",
  "Howard Hanna",
  "Weichert",
  "@properties",
  "Douglas Elliman",
];

function Item({ name }: { name: string }) {
  return (
    <li className="flex shrink-0 items-center gap-8 px-8">
      <span className="whitespace-nowrap text-lg font-semibold tracking-tight text-zinc-400">
        {name}
      </span>
      <span className="size-1.5 rounded-full bg-zinc-300" />
    </li>
  );
}

export function LogoMarquee() {
  // Two copies of the list in one track → seamless -50% loop.
  const items = [...BROKERAGES, ...BROKERAGES];
  return (
    <section className="border-y border-zinc-100 bg-white py-10">
      <p className="mb-6 text-center text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
        Built for agents at every brokerage
      </p>
      <div className="marquee-mask relative w-full overflow-hidden">
        <ul className="marquee-track items-center">
          {items.map((name, i) => (
            <Item key={`${name}-${i}`} name={name} />
          ))}
        </ul>
      </div>
    </section>
  );
}
