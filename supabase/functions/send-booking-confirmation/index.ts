// Sends a booking confirmation email to the user. Triggered manually by admin
// from the BookingsManager panel.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const escapeHtml = (str: string): string =>
  str.replace(/[&<>"']/g, (char) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[char] as string),
  );

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const body = (await req.json()) as { bookingId?: string };
    const bookingId = String(body.bookingId || "").trim();

    if (!bookingId || !/^[0-9a-f-]{36}$/i.test(bookingId)) {
      throw new Error("Invalid bookingId");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select(
        "id, booking_date, quantity, status, user_id, class_schedules(name, day, time, location)",
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingErr) throw bookingErr;
    if (!booking) throw new Error("Booking not found");

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, preferred_language")
      .eq("id", booking.user_id)
      .maybeSingle();

    if (!profile?.email) throw new Error("User email not found");

    const schedule = Array.isArray(booking.class_schedules)
      ? booking.class_schedules[0]
      : booking.class_schedules;

    const isEn = profile.preferred_language === "en";
    const subject = isEn
      ? `Booking confirmation: ${schedule?.name ?? ""} (${booking.booking_date})`
      : `Potwierdzenie rezerwacji: ${schedule?.name ?? ""} (${booking.booking_date})`;

    const headerLabel = isEn
      ? "Your booking is confirmed"
      : "Twoja rezerwacja jest potwierdzona";
    const greeting = isEn ? "Hi" : "Cześć";
    const intro = isEn
      ? "We're confirming your booking at Aerial Paradise. Details below:"
      : "Potwierdzamy Twoją rezerwację w Aerial Paradise. Szczegóły poniżej:";
    const labels = isEn
      ? { name: "Class", date: "Date", when: "Day / Time", loc: "Location", spots: "Spots" }
      : { name: "Zajęcia", date: "Data", when: "Dzień / Godzina", loc: "Lokalizacja", spots: "Liczba miejsc" };
    const footer = isEn
      ? "See you at the studio! 🤸"
      : "Do zobaczenia na zajęciach! 🤸";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
        <h1 style="color: #0891b2; margin-bottom: 8px;">${headerLabel}</h1>
        <p>${greeting} ${escapeHtml(profile.full_name ?? "")},</p>
        <p>${intro}</p>

        <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 8px; overflow: hidden; margin-top: 12px;">
          <tbody>
            <tr><td style="padding: 8px 12px; font-weight: 600;">${labels.name}</td><td style="padding: 8px 12px;">${escapeHtml(schedule?.name ?? "—")}</td></tr>
            <tr><td style="padding: 8px 12px; font-weight: 600;">${labels.date}</td><td style="padding: 8px 12px;">${escapeHtml(booking.booking_date)}</td></tr>
            <tr><td style="padding: 8px 12px; font-weight: 600;">${labels.when}</td><td style="padding: 8px 12px;">${escapeHtml(schedule?.day ?? "—")} • ${escapeHtml(schedule?.time ?? "—")}</td></tr>
            <tr><td style="padding: 8px 12px; font-weight: 600;">${labels.loc}</td><td style="padding: 8px 12px;">${escapeHtml(schedule?.location ?? "—")}</td></tr>
            <tr><td style="padding: 8px 12px; font-weight: 600;">${labels.spots}</td><td style="padding: 8px 12px;">${booking.quantity}</td></tr>
          </tbody>
        </table>

        <p style="margin-top: 24px;">${footer}</p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">Aerial Paradise</p>
      </div>
    `;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Aerial Paradise <onboarding@resend.dev>",
        to: [profile.email],
        subject,
        html,
      }),
    });

    const result = await resp.json();
    if (!resp.ok) {
      console.error("Resend error:", result);
      throw new Error(result.message || "Failed to send confirmation email");
    }

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("send-booking-confirmation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
