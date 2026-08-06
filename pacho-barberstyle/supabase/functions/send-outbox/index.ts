/**
 * Drains `email_outbox` and sends each queued message through Resend.
 *
 * Deploy:  supabase functions deploy send-outbox
 * Secrets: RESEND_API_KEY, RESEND_FROM
 * Schedule: every minute (see README — pg_cron or Supabase scheduled function)
 */

import { createClient } from "jsr:@supabase/supabase-js@2";
import { render, type BookingRow, type BusinessInfo, type ServiceRow } from "../_shared/emails.ts";

const BATCH = 20;
const MAX_ATTEMPTS = 4;

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM") ?? "Pacho Barberstyle <onboarding@resend.dev>";
  if (!resendKey) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY missing" }), { status: 500 });
  }

  const { data: settings } = await supabase.from("settings").select("*").limit(1).maybeSingle();
  if (!settings) {
    return new Response(JSON.stringify({ error: "settings row missing" }), { status: 500 });
  }

  const business: BusinessInfo = {
    name: "Pacho Barberstyle",
    street: "Rue du Pré-Jérôme 12",
    postalCode: "1205",
    city: "Genève",
    phone: "+41765440320",
    phoneDisplay: "+41 76 544 03 20",
    timezone: settings.timezone,
    siteUrl: settings.site_url,
  };

  const { data: queued, error } = await supabase
    .from("email_outbox")
    .select("*")
    .eq("status", "queued")
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at")
    .limit(BATCH);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const item of queued ?? []) {
    try {
      const { data: booking } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", item.booking_id)
        .single();
      if (!booking) throw new Error("booking not found");

      const { data: service } = await supabase
        .from("services")
        .select("*")
        .eq("id", booking.service_id)
        .single();
      if (!service) throw new Error("service not found");

      const { subject, html } = render(
        item.kind,
        booking as BookingRow,
        service as ServiceRow,
        business,
        settings.cancel_window_hours,
      );

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [item.to_email],
          subject,
          html,
          reply_to: settings.barber_email,
        }),
      });

      if (!response.ok) throw new Error(`resend ${response.status}: ${await response.text()}`);

      await supabase
        .from("email_outbox")
        .update({
          status: "sent",
          subject,
          html,
          sent_at: new Date().toISOString(),
          attempts: item.attempts + 1,
        })
        .eq("id", item.id);
      sent += 1;
    } catch (err) {
      const attempts = item.attempts + 1;
      await supabase
        .from("email_outbox")
        .update({
          // Give up after MAX_ATTEMPTS so a bad address cannot loop forever.
          status: attempts >= MAX_ATTEMPTS ? "failed" : "queued",
          attempts,
          last_error: String(err),
        })
        .eq("id", item.id);
      failed += 1;
    }
  }

  return new Response(JSON.stringify({ processed: queued?.length ?? 0, sent, failed }), {
    headers: { "Content-Type": "application/json" },
  });
});
