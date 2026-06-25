/** Help / troubleshooting articles shown in the in-app Support center and
 *  surfaced by the chat widget before it offers a ticket or a live agent. */

export interface HelpArticle {
  slug: string;
  title: string;
  category: string;
  summary: string;
  /** Body paragraphs (rendered as text blocks; "- " lines become bullets). */
  body: string[];
}

export const HELP_CATEGORIES = [
  "Designs",
  "Contacts",
  "Campaigns",
  "Tracking",
  "Billing",
  "Account",
];

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: "postcard-sizes",
    title: "Choosing a postcard size (4×6 vs 6×9)",
    category: "Designs",
    summary: "Pick the right size and export your art at the exact dimensions.",
    body: [
      "Radiate prints standard 4×6 and larger 6×9 / 6×11 postcards. Templates are 4×6; when you upload your own art you choose the size.",
      "Sizes include a small print bleed, so export at the exact pixel dimensions shown in the uploader:",
      "- 4×6 → 1875 × 1275 px (landscape)",
      "- 6×9 → 2775 × 1875 px (landscape)",
      "- 6×11 → 3375 × 1875 px (landscape)",
      "Always design landscape (wider than tall) and at 300 DPI. If your file is smaller than the size's minimum, the print service will reject it.",
    ],
  },
  {
    slug: "design-looks-cropped",
    title: "Why my design looks cropped (bleed & safe zone)",
    category: "Designs",
    summary: "Keep important text away from the edges so nothing gets trimmed.",
    body: [
      "Every printed postcard is trimmed by about 0.125\" on each edge (the \"bleed\"). Anything within ~0.25\" of the edge can get cut off.",
      "Keep headlines, logos, and contact info inside a ~0.25\" safe margin. Let only backgrounds and photos run all the way to the edge.",
      "When you upload art, we auto-fit it to the exact print size without cropping your design — but Lob's physical trim still applies, so mind that safe margin.",
    ],
  },
  {
    slug: "upload-your-own-design",
    title: "Uploading your own design",
    category: "Designs",
    summary: "Use finished artwork from Canva or a designer.",
    body: [
      "Go to Designs → Upload your own. Pick the size, then drop in a front and a back image (PNG or JPG).",
      "Export a high-resolution, landscape image — we automatically fit it to the exact print dimensions, so you don't have to hit a pixel target perfectly.",
      "Set your client's \"From\" return address and an optional QR link right on the upload screen. Then it's ready to use in a campaign.",
    ],
  },
  {
    slug: "headshot-and-logo",
    title: "Adding your headshot and brokerage logo",
    category: "Designs",
    summary: "Compliance-friendly templates with your photo and logo.",
    body: [
      "Open any premium template in the editor. The headshot and logo uploaders appear for layouts that support them (most do).",
      "Your headshot renders as a circle next to your name; your logo appears in the header or brand bar depending on the layout.",
      "Real-estate templates also include the Equal Housing and (optionally) REALTOR® marks on the back. Non-real-estate templates hide those automatically.",
    ],
  },
  {
    slug: "personalize-a-template",
    title: "Personalizing a template",
    category: "Designs",
    summary: "Swap in your copy, photos, colors, and fonts.",
    body: [
      "From Designs → New design, filter by industry, pick a template, and click Personalize.",
      "Edit the headline, message, price/details, and contact info. Replace the photo, headshot, and logo. Choose an accent color and font.",
      "The live preview shows exactly what will print — what you see is what mails.",
    ],
  },
  {
    slug: "upload-or-paste-contacts",
    title: "Uploading or pasting a contact list",
    category: "Contacts",
    summary: "CSV columns and the paste-from-spreadsheet option.",
    body: [
      "Go to Contacts → Upload CSV. Your file needs these columns: full_name, address_line1, address_line2 (optional), city, state, zip.",
      "No file? Switch to the Paste tab and paste rows straight from a spreadsheet — we detect tab- or comma-separated automatically. Include a header row.",
      "Download the sample CSV from the upload window if you want a template to start from.",
    ],
  },
  {
    slug: "address-verification",
    title: "Address verification: verified vs undeliverable",
    category: "Contacts",
    summary: "Only deliverable addresses are mailed and charged.",
    body: [
      "After a list uploads, each address is checked. Verified addresses are mailable; undeliverable ones are flagged and skipped — you're never charged for them.",
      "If a whole list looks off, open it and click Re-verify.",
      "A list's total can be higher than the campaign's piece count because only verified addresses are sent.",
    ],
  },
  {
    slug: "campaign-failed",
    title: "My campaign shows “Failed” or 0 pieces",
    category: "Campaigns",
    summary: "The most common causes and how to fix them.",
    body: [
      "A few things can cause this:",
      "- No deliverable addresses: open the list and Re-verify so addresses are marked verified.",
      "- No return address: add yours in Settings (or on the design) before sending.",
      "- Design too small / wrong size: uploaded art must meet the size's exact dimensions. Re-upload at the right size and we auto-fit it.",
      "- Not enough credits: top up on the Billing page.",
      "If it still fails after checking these, submit a ticket and we'll look at the exact reason.",
    ],
  },
  {
    slug: "tracking-statuses",
    title: "Understanding tracking statuses",
    category: "Tracking",
    summary: "Printing → In transit → Delivered, and how to refresh.",
    body: [
      "Each postcard moves through: Printing (created and being produced) → In transit (mailed and moving) → Delivered. Returned means it came back as undeliverable.",
      "Statuses update automatically as the mail moves. To force a refresh, open the campaign and click “Sync for print.”",
      "Brand-new sends start at Printing; it can take a day or two before the first In transit update appears.",
    ],
  },
  {
    slug: "qr-and-utm",
    title: "QR codes and UTM tracking",
    category: "Tracking",
    summary: "Point the QR at your site and measure the visits.",
    body: [
      "Every postcard prints with a unique QR code. Set where it points in the design's QR section (your website or a specific page).",
      "Add UTM tags (source, medium, campaign) and your website analytics (e.g. Google Analytics) will attribute visits to that postcard campaign.",
      "Radiate also counts every scan on your dashboard, so you see both scans and the resulting site visits.",
    ],
  },
  {
    slug: "share-tracking-with-client",
    title: "Sharing a tracking link with a client",
    category: "Tracking",
    summary: "Give clients a read-only view — no login needed.",
    body: [
      "Open a campaign from the Dashboard and click “Share with client.” The private link copies to your clipboard.",
      "Send it to your client. They'll see live delivery status and scan counts with no account or password.",
      "The link is unguessable and read-only.",
    ],
  },
  {
    slug: "credits-and-pricing",
    title: "How credits and pricing work",
    category: "Billing",
    summary: "One credit sends one postcard.",
    body: [
      "One credit sends one postcard. Subscribe monthly for the best per-credit rate with credits that roll over, or buy one-time packs any time.",
      "Print and postage are included — what you see is what you send, no minimums and no markup.",
      "Credits are debited when a campaign sends.",
    ],
  },
  {
    slug: "redeem-promo-code",
    title: "Redeeming a promo code",
    category: "Billing",
    summary: "Apply a code for bonus credits.",
    body: [
      "Go to Billing → “Have a promo code?”, enter your code, and click Apply. Eligible codes add credits to your wallet instantly.",
      "Promo codes are one redemption per customer (and one per return address).",
      "If a code won't apply, make sure your return address is set in Settings and that you haven't already redeemed it.",
    ],
  },
  {
    slug: "schedule-a-campaign",
    title: "Scheduling a campaign for later",
    category: "Campaigns",
    summary: "Set it once and it sends on time.",
    body: [
      "On the New campaign screen, choose “Schedule for later” and pick a future date and time.",
      "Credits are reserved when you schedule and charged when it actually sends.",
      "You can leave it — it goes out automatically at the scheduled time.",
    ],
  },
  {
    slug: "sending-for-clients",
    title: "Sending on behalf of clients (From address)",
    category: "Campaigns",
    summary: "Set each client's return address per design.",
    body: [
      "When you upload or personalize a design, set the client's “From” (return) address in that design. It prints as the sender on every card for that campaign.",
      "Since you typically use one design per client, this gives you a different sender per campaign.",
      "Leave it blank to fall back to your own profile's return address.",
    ],
  },
  {
    slug: "delete-a-campaign",
    title: "Deleting a campaign",
    category: "Campaigns",
    summary: "Clear out tests and drafts.",
    body: [
      "Open the campaign from the Dashboard and click Delete. It's removed from your dashboard along with its tracking rows.",
      "Postcards that have already been mailed are unaffected, and spent credits aren't refunded.",
    ],
  },
  {
    slug: "account-and-return-address",
    title: "Your account and return address",
    category: "Account",
    summary: "Update your profile and default sender info.",
    body: [
      "Go to Settings to edit your name, company, and return address. Your return address is required before you can send.",
      "Use the payment portal button in Settings to manage cards and invoices.",
    ],
  },
];

export function findArticle(slug: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((a) => a.slug === slug);
}

/** Lightweight keyword search for the chat widget + support search box. */
export function searchArticles(query: string): HelpArticle[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const terms = q.split(/\s+/);
  return HELP_ARTICLES.map((a) => {
    const hay = `${a.title} ${a.summary} ${a.category} ${a.body.join(" ")}`.toLowerCase();
    const score = terms.reduce((s, t) => s + (hay.includes(t) ? 1 : 0), 0);
    return { a, score };
  })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .map((x) => x.a);
}
