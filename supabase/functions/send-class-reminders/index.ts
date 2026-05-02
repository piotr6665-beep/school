import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  processBookingReminder,
  type BookingRow,
  type ProfileRow,
  type ReminderDeps,
} from "./reminder-logic.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ====== Location data ======
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

const escapeHtml = (str: string): string =>
  str.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[char] as string));

// ====== Email templates ======
type Lang = "pl" | "en";

interface ReminderData {
  fullName: string;
  className: string;
  classTime: string;
  classDay: string;
  bookingDate: string; // YYYY-MM-DD
  quantity: number;
  locationKey: string;
  bookingsUrl: string;
}

const formatDate = (dateStr: string, lang: Lang): string => {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(lang === "pl" ? "pl-PL" : "en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
};

const buildSubject = (data: ReminderData, lang: Lang): string => {
  if (lang === "en") {
    return `Reminder: ${data.className} in 6 hours at Aerial Paradise`;
  }
  return `Przypomnienie: ${data.className} za 6 godzin w Aerial Paradise`;
};

const buildHtml = (data: ReminderData, lang: Lang): string => {
  const loc = LOCATIONS[data.locationKey] ?? {
    name: data.locationKey,
    address: data.locationKey,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.locationKey)}`,
  };

  const safe = {
    fullName: escapeHtml(data.fullName),
    className: escapeHtml(data.className),
    classTime: escapeHtml(data.classTime),
    bookingDate: escapeHtml(formatDate(data.bookingDate, lang)),
    locationName: escapeHtml(loc.name),
    address: escapeHtml(loc.address),
    quantity: String(data.quantity),
  };

  const t = lang === "en" ? {
    title: `See you in 6 hours, ${safe.fullName}!`,
    intro: `This is a friendly reminder about your upcoming class at <strong>Aerial Paradise</strong>.`,
    classLabel: "Class",
    dateLabel: "Date",
    timeLabel: "Time",
    locationLabel: "Location",
    spotsLabel: "Booked spots",
    mapsLink: "Open in Google Maps →",
    practicalTitle: "Practical reminders",
    practical: [
      "Wear comfortable, fitted sportswear (avoid zippers and rough seams).",
      "Bring a water bottle and a small towel.",
      "Arrive 5–10 minutes before the class starts.",
      "Avoid heavy meals 2 hours before class.",
    ],
    cancelText: `Can't make it? Please cancel your booking so someone on the waitlist can take your spot:`,
    cancelButton: "Manage my bookings",
    footer: "See you on the mat — Aerial Paradise team 🤸",
  } : {
    title: `Do zobaczenia za 6 godzin, ${safe.fullName}!`,
    intro: `Przypominamy o Twoich nadchodzących zajęciach w <strong>Aerial Paradise</strong>.`,
    classLabel: "Zajęcia",
    dateLabel: "Data",
    timeLabel: "Godzina",
    locationLabel: "Lokalizacja",
    spotsLabel: "Zarezerwowane miejsca",
    mapsLink: "Otwórz w Google Maps →",
    practicalTitle: "Pamiętaj",
    practical: [
      "Wygodny, dopasowany strój sportowy (bez zamków i ostrych szwów).",
      "Bidon z wodą i mały ręcznik.",
      "Przyjdź 5–10 minut przed rozpoczęciem.",
      "Unikaj ciężkich posiłków 2h przed zajęciami.",
    ],
    cancelText: `Nie możesz przyjść? Anuluj rezerwację, żeby ktoś z listy oczekujących mógł zająć Twoje miejsce:`,
    cancelButton: "Moje rezerwacje",
    footer: "Do zobaczenia na sali — zespół Aerial Paradise 🤸",
  };

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;padding:0;">
    <div style="background:linear-gradient(135deg,#0891b2,#06b6d4);padding:32px 24px;text-align:center;color:#ffffff;">
      <h1 style="margin:0;font-size:26px;font-weight:600;">${t.title}</h1>
    </div>

    <div style="padding:32px 24px;color:#333;line-height:1.6;">
      <p style="margin:0 0 24px;font-size:16px;">${t.intro}</p>

      <table style="width:100%;border-collapse:collapse;background-color:#f9fafb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
        <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;width:40%;color:#6b7280;font-size:14px;">${t.classLabel}</td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-weight:600;">${safe.className}</td></tr>
        <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;">${t.dateLabel}</td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-weight:600;">${safe.bookingDate}</td></tr>
        <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;">${t.timeLabel}</td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-weight:600;">${safe.classTime}</td></tr>
        <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;">${t.locationLabel}</td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;"><div style="font-weight:600;">${safe.locationName}</div><div style="font-size:14px;color:#6b7280;margin-top:2px;">${safe.address}</div><a href="${loc.mapsUrl}" style="color:#0891b2;font-size:14px;text-decoration:none;display:inline-block;margin-top:6px;">${t.mapsLink}</a></td></tr>
        <tr><td style="padding:12px 16px;color:#6b7280;font-size:14px;">${t.spotsLabel}</td><td style="padding:12px 16px;font-weight:600;">${safe.quantity}</td></tr>
      </table>

      <div style="background-color:#ecfeff;border-left:4px solid #0891b2;padding:16px 20px;border-radius:4px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-weight:600;color:#164e63;">${t.practicalTitle}</p>
        <ul style="margin:0;padding-left:20px;color:#374151;font-size:14px;">
          ${t.practical.map(item => `<li style="margin-bottom:4px;">${escapeHtml(item)}</li>`).join("")}
        </ul>
      </div>

      <p style="margin:24px 0 12px;font-size:14px;color:#6b7280;">${t.cancelText}</p>
      <div style="text-align:center;margin:16px 0 32px;">
        <a href="${data.bookingsUrl}" style="display:inline-block;background-color:#0891b2;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">${t.cancelButton}</a>
      </div>

      <p style="margin:32px 0 0;text-align:center;color:#6b7280;font-size:14px;">${t.footer}</p>
    </div>
  </div>
</body>
</html>`;
};

// ====== Main handler ======
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("send-class-reminders triggered at", new Date().toISOString());

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // We want to find bookings whose class starts in 5h45min – 6h15min from now.
    // Cron runs every 15 min, so each booking gets exactly one chance.
    const now = new Date();
    const windowStart = new Date(now.getTime() + (6 * 60 - 15) * 60 * 1000);
    const windowEnd = new Date(now.getTime() + (6 * 60 + 15) * 60 * 1000);

    // Pull active bookings without reminder + class schedule (FK exists)
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(`
        id,
        booking_date,
        quantity,
        user_id,
        reminder_sent_at,
        class_schedules!inner (
          name, time, day, location
        )
      `)
      .eq("status", "active")
      .is("reminder_sent_at", null)
      .gte("booking_date", windowStart.toISOString().split("T")[0])
      .lte("booking_date", windowEnd.toISOString().split("T")[0]);

    if (bookingsError) throw bookingsError;

    // Fetch matching profiles in a single query (no FK between bookings and profiles)
    const userIds = Array.from(new Set((bookings ?? []).map((b: any) => b.user_id)));
    const profileMap = new Map<string, { full_name: string; email: string | null; preferred_language: string }>();

    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, preferred_language")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      for (const p of profiles ?? []) {
        profileMap.set(p.id, {
          full_name: p.full_name,
          email: p.email,
          preferred_language: p.preferred_language,
        });
      }
    }

    console.log(`Found ${bookings?.length ?? 0} candidate bookings`);

    const bookingsBaseUrl = "https://aerialparadise.lovable.app/bookings";

    // ====== Build deps for processBookingReminder ======
    const deps: ReminderDeps = {
      // Atomic claim: conditional UPDATE acts as a per-row mutex.
      // Returns the timestamp written iff this caller actually flipped
      // reminder_sent_at from NULL -> now(), null otherwise.
      claimReminder: async (bookingId: string) => {
        const claimedAt = new Date().toISOString();
        const { data, error } = await supabase
          .from("bookings")
          .update({ reminder_sent_at: claimedAt })
          .eq("id", bookingId)
          .is("reminder_sent_at", null)
          .select("id")
          .maybeSingle();
        if (error) {
          console.error(`claimReminder error for ${bookingId}:`, error);
          return null;
        }
        return data ? claimedAt : null;
      },
      // Conditional rollback so we never wipe a successful concurrent send.
      releaseClaim: async (bookingId: string, claimedAt: string) => {
        const { error } = await supabase
          .from("bookings")
          .update({ reminder_sent_at: null })
          .eq("id", bookingId)
          .eq("reminder_sent_at", claimedAt);
        if (error) {
          console.error(`releaseClaim error for ${bookingId}:`, error);
        }
      },
      sendEmail: async ({ to, subject, html }) => {
        try {
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "Aerial Paradise <onboarding@resend.dev>",
              to: [to],
              subject,
              html,
            }),
          });
          const json = await emailRes.json();
          if (!emailRes.ok) {
            return { ok: false, error: JSON.stringify(json) };
          }
          return { ok: true };
        } catch (err: any) {
          return { ok: false, error: err?.message ?? "fetch failed" };
        }
      },
      buildSubject,
      buildHtml,
      log: (...a) => console.log(...a),
      warn: (...a) => console.warn(...a),
      error: (...a) => console.error(...a),
    };

    const results: Array<{ bookingId: string; status: string; error?: string }> = [];

    for (const booking of (bookings ?? []) as BookingRow[]) {
      const profile: ProfileRow | undefined = profileMap.get(booking.user_id);
      const r = await processBookingReminder(
        deps,
        booking,
        profile,
        now,
        bookingsBaseUrl,
      );
      results.push(r);
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: now.toISOString(),
        candidates: bookings?.length ?? 0,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Fatal error in send-class-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
