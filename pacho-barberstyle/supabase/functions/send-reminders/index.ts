/**
 * Queues a reminder for every confirmed appointment starting in the next
 * 24–25 hours that has not been reminded yet.
 *
 * Deploy:   supabase functions deploy send-reminders
 * Schedule: hourly. The one-hour window plus `reminder_sent_at` means an
 *           appointment is reminded exactly once even if a run is missed or
 *           repeated.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = Date.now();
  const from = new Date(now + 24 * 3_600_000).toISOString();
  const to = new Date(now + 25 * 3_600_000).toISOString();

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("id, customer_email")
    .eq("status", "confirmed")
    .is("reminder_sent_at", null)
    .gte("starts_at", from)
    .lt("starts_at", to);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let queued = 0;
  for (const booking of bookings ?? []) {
    const { error: insertError } = await supabase.from("email_outbox").insert({
      booking_id: booking.id,
      kind: "reminder",
      to_email: booking.customer_email,
    });
    if (insertError) continue;

    await supabase
      .from("bookings")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", booking.id);
    queued += 1;
  }

  return new Response(JSON.stringify({ queued }), {
    headers: { "Content-Type": "application/json" },
  });
});
