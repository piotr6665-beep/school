import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_JWKS = Deno.env.get("SUPABASE_JWKS");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOCATIONS: Record<string, { name: string; address: string; mapsUrl: string }> = {
  funka: {
    name: "Aerial Paradise Funka",
    address: "ul. Kazimierza Funka 11, Wrocław",
    mapsUrl: "https://maps.app.goo.gl/Z3acLQvNUPgiayb29",
  },
  baltycka: {
    name: "Aerial Paradise Bałtycka",
    address: "ul. Bałtycka 15, Wrocław",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=ul.+Bałtycka+15,+Wrocław",
  },
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

type Lang = "pl" | "en";

const formatDate = (dateStr: string, lang: Lang) => {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(lang === "pl" ? "pl-PL" : "en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
};

const buildSubject = (className: string, lang: Lang) =>
  lang === "en"
    ? `A spot just opened: ${className} — Aerial Paradise`
    : `Zwolniło się miejsce: ${className} — Aerial Paradise`;

const buildHtml = (params: {
  fullName: string;
  className: string;
  classTime: string;
  bookingDate: string;
  locationKey: string;
  bookingsUrl: string;
  lang: Lang;
}) => {
  const { fullName, className, classTime, bookingDate, locationKey, bookingsUrl, lang } = params;
  const loc = LOCATIONS[locationKey] ?? {
    name: locationKey,
    address: locationKey,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationKey)}`,
  };
  const safe = {
    fullName: escapeHtml(fullName),
    className: escapeHtml(className),
    classTime: escapeHtml(classTime),
    bookingDate: escapeHtml(formatDate(bookingDate, lang)),
    locationName: escapeHtml(loc.name),
    address: escapeHtml(loc.address),
  };
  const t = lang === "en" ? {
    title: `Good news, ${safe.fullName}! 🎉`,
    intro: `A spot just opened up on a class you signed up for on the waitlist. <strong>Be quick — spots go fast!</strong>`,
    classLabel: "Class",
    dateLabel: "Date",
    timeLabel: "Time",
    locationLabel: "Location",
    mapsLink: "Open in Google Maps →",
    cta: "Book my spot now",
    note: `If you're no longer interested, you don't need to do anything — your waitlist entry has been cleared.`,
    footer: "See you on the mat — Aerial Paradise team 🤸",
  } : {
    title: `Świetna wiadomość, ${safe.fullName}! 🎉`,
    intro: `Zwolniło się miejsce na zajęciach, na które zapisałaś/eś się na listę oczekujących. <strong>Pospiesz się — miejsca znikają szybko!</strong>`,
    classLabel: "Zajęcia",
    dateLabel: "Data",
    timeLabel: "Godzina",
    locationLabel: "Lokalizacja",
    mapsLink: "Otwórz w Google Maps →",
    cta: "Zarezerwuj miejsce",
    note: `Jeśli nie jesteś już zainteresowana/y, nie musisz nic robić — Twój wpis z listy oczekujących został usunięty.`,
    footer: "Do zobaczenia na sali — zespół Aerial Paradise 🤸",
  };

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <div style="background:linear-gradient(135deg,#0891b2,#06b6d4);padding:32px 24px;text-align:center;color:#ffffff;">
      <h1 style="margin:0;font-size:26px;font-weight:600;">${t.title}</h1>
    </div>
    <div style="padding:32px 24px;color:#333;line-height:1.6;">
      <p style="margin:0 0 24px;font-size:16px;">${t.intro}</p>
      <table style="width:100%;border-collapse:collapse;background-color:#f9fafb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
        <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;width:40%;color:#6b7280;font-size:14px;">${t.classLabel}</td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-weight:600;">${safe.className}</td></tr>
        <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;">${t.dateLabel}</td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-weight:600;">${safe.bookingDate}</td></tr>
        <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;">${t.timeLabel}</td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-weight:600;">${safe.classTime}</td></tr>
        <tr><td style="padding:12px 16px;color:#6b7280;font-size:14px;">${t.locationLabel}</td><td style="padding:12px 16px;"><div style="font-weight:600;">${safe.locationName}</div><div style="font-size:14px;color:#6b7280;margin-top:2px;">${safe.address}</div><a href="${loc.mapsUrl}" style="color:#0891b2;font-size:14px;text-decoration:none;display:inline-block;margin-top:6px;">${t.mapsLink}</a></td></tr>
      </table>
      <div style="text-align:center;margin:32px 0;">
        <a href="${bookingsUrl}" style="display:inline-block;background:linear-gradient(135deg,#0891b2,#06b6d4);color:#ffffff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">${t.cta}</a>
      </div>
      <p style="margin:24px 0 0;font-size:13px;color:#6b7280;text-align:center;">${t.note}</p>
      <p style="margin:32px 0 0;text-align:center;color:#6b7280;font-size:14px;">${t.footer}</p>
    </div>
  </div>
</body></html>`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const classScheduleId: string | undefined = body?.class_schedule_id;
    const waitlistDate: string | undefined = body?.waitlist_date;

    if (!classScheduleId || !waitlistDate) {
      return new Response(JSON.stringify({ error: "class_schedule_id and waitlist_date required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Confirm there's actually a free spot
    const { data: schedule, error: schedErr } = await supabase
      .from("class_schedules")
      .select("id, name, time, location, available_spots")
      .eq("id", classScheduleId)
      .maybeSingle();

    if (schedErr) throw schedErr;
    if (!schedule) {
      return new Response(JSON.stringify({ error: "Schedule not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if ((schedule.available_spots ?? 0) <= 0) {
      console.log(`No free spots on ${classScheduleId} — skipping waitlist notify`);
      return new Response(JSON.stringify({ success: true, notified: 0, reason: "no_free_spots" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find next person on waitlist (oldest first, not yet notified)
    const { data: waiters, error: waitErr } = await supabase
      .from("waitlist")
      .select("id, user_id, created_at")
      .eq("class_schedule_id", classScheduleId)
      .eq("waitlist_date", waitlistDate)
      .eq("notified", false)
      .order("created_at", { ascending: true })
      .limit(1);

    if (waitErr) throw waitErr;
    if (!waiters || waiters.length === 0) {
      console.log("No one on waitlist for this slot");
      return new Response(JSON.stringify({ success: true, notified: 0, reason: "empty_waitlist" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const waiter = waiters[0];

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("full_name, email, preferred_language")
      .eq("id", waiter.user_id)
      .maybeSingle();

    if (profErr) throw profErr;
    if (!profile?.email) {
      console.warn(`Waitlist entry ${waiter.id} has no email — skipping`);
      return new Response(JSON.stringify({ success: true, notified: 0, reason: "no_email" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lang: Lang = profile.preferred_language === "en" ? "en" : "pl";
    const bookingsUrl = "https://aerialparadise.lovable.app/bookings";

    const html = buildHtml({
      fullName: profile.full_name || (lang === "en" ? "Friend" : "Cześć"),
      className: schedule.name,
      classTime: schedule.time,
      bookingDate: waitlistDate,
      locationKey: schedule.location,
      bookingsUrl,
      lang,
    });

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Aerial Paradise <onboarding@resend.dev>",
        to: [profile.email],
        subject: buildSubject(schedule.name, lang),
        html,
      }),
    });

    const emailJson = await emailRes.json();
    if (!emailRes.ok) {
      console.error("Resend error:", emailJson);
      return new Response(JSON.stringify({ error: "Email send failed", details: emailJson }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as notified + remove the waitlist entry (they've been told; no need to re-notify)
    const { error: updErr } = await supabase
      .from("waitlist")
      .update({ notified: true })
      .eq("id", waiter.id);
    if (updErr) console.error("Failed to mark waitlist as notified:", updErr);

    console.log(`✓ Waitlist notify sent to ${profile.email} for class ${classScheduleId} on ${waitlistDate}`);

    return new Response(
      JSON.stringify({ success: true, notified: 1, recipient: profile.email }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("notify-waitlist error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
