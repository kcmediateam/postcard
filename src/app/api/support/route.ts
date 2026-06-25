export const runtime = "nodejs";

const TO = "info@kcmediateam.me";

/**
 * Support ticket / "talk to a person" request → emails the team.
 * Uses Resend when RESEND_API_KEY is set; otherwise returns {fallback:true}
 * and the client opens a pre-filled mailto instead.
 */
export async function POST(req: Request) {
  const { name, email, subject, message, kind } = await req
    .json()
    .catch(() => ({}));

  if (!email || !message) {
    return Response.json({ error: "missing_fields" }, { status: 400 });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return Response.json({ sent: false, fallback: true });
  }

  const from = process.env.RESEND_FROM || "Radiate Support <onboarding@resend.dev>";
  const label = kind === "agent" ? "Live chat request" : "Support ticket";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [TO],
        reply_to: email,
        subject: `[Radiate] ${label}: ${subject || "New request"}`,
        text:
          `${label}\n` +
          `From: ${name || "(no name)"} <${email}>\n\n` +
          `${message}\n`,
      }),
    });
    if (!res.ok) {
      return Response.json({ sent: false, fallback: true });
    }
    return Response.json({ sent: true });
  } catch {
    return Response.json({ sent: false, fallback: true });
  }
}
