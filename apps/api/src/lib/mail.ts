import { Sentry } from "../instrument.js";

export async function sendWelcomeEmail(to: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  if (to.endsWith("@browser-rpg.local")) return;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? "Browser RPG <onboarding@resend.dev>",
        to,
        subject: "Benvenuto su Browser RPG",
        text: "Account creato. Puoi creare e pubblicare avventure dal hub.",
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      Sentry.captureMessage(`Resend ${res.status}: ${body.slice(0, 200)}`);
    }
  } catch (err) {
    Sentry.captureException(err);
  }
}
