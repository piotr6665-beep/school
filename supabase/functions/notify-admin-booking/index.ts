// Sends an email to the admin whenever a user books a class or cancels a booking.
// Called fire-and-forget from the client right after the booking insert/update succeeds.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ADMIN_EMAIL = "piotr6665@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotifyAdminBookingRequest {
  booking_id: string;
  action: "created" | "cancelled";
}

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

    const body = (await req.json()) as NotifyAdminBookingRequest;
    const bookingId = String(body.booking_id || "").trim();
    const action = body.action;

    if (!bookingId || !/^[0-9a-f-]{36}$/i.test(bookingId)) {
      throw new Error("Invalid booking_id");
    }
    if (action !== "created" && action !== "cancelled") {
      throw new Error("Invalid action");
    }

    // Use service role to read booking + related data regardless of RLS.
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select(
        "id, booking_date, quantity, status, user_id, class_schedule_id, class_schedules(name, day, time, location)",
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingErr) throw bookingErr;
    if (!booking) throw new Error("Booking not found");

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", booking.user_id)
      .maybeSingle();

    const schedule = Array.isArray(booking.class_schedules)
      ? booking.class_schedules[0]
      : booking.class_schedules;

    const isCancel = action === "cancelled";
    const subject = isCancel
      ? `❌ Anulowano rezerwację: ${schedule?.name ?? ""} (${booking.booking_date})`
      : `✅ Nowa rezerwacja: ${schedule?.name ?? ""} (${booking.booking_date})`;

    const headerColor = isCancel ? "#dc2626" : "#0891b2";
    const headerLabel = isCancel
      ? "Anulowano rezerwację"
      : "Nowa rezerwacja zajęć";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
        <h1 style="color: ${headerColor}; margin-bottom: 8px;">${headerLabel}</h1>
        <p style="color: #6b7280; margin-top: 0;">Powiadomienie administracyjne — Aerial Paradise</p>

        <h3 style="margin-bottom: 4px;">Zajęcia</h3>
        <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 8px; overflow: hidden;">
          <tbody>
            <tr><td style="padding: 8px 12px; font-weight: 600;">Nazwa</td><td style="padding: 8px 12px;">${escapeHtml(schedule?.name ?? "—")}</td></tr>
            <tr><td style="padding: 8px 12px; font-weight: 600;">Data</td><td style="padding: 8px 12px;">${escapeHtml(booking.booking_date)}</td></tr>
            <tr><td style="padding: 8px 12px; font-weight: 600;">Dzień / Godzina</td><td style="padding: 8px 12px;">${escapeHtml(schedule?.day ?? "—")} • ${escapeHtml(schedule?.time ?? "—")}</td></tr>
            <tr><td style="padding: 8px 12px; font-weight: 600;">Lokalizacja</td><td style="padding: 8px 12px;">${escapeHtml(schedule?.location ?? "—")}</td></tr>
            <tr><td style="padding: 8px 12px; font-weight: 600;">Liczba miejsc</td><td style="padding: 8px 12px;">${booking.quantity}</td></tr>
          </tbody>
        </table>

        <h3 style="margin-bottom: 4px; margin-top: 24px;">Użytkownik</h3>
        <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 8px; overflow: hidden;">
          <tbody>
            <tr><td style="padding: 8px 12px; font-weight: 600;">Imię i nazwisko</td><td style="padding: 8px 12px;">${escapeHtml(profile?.full_name ?? "—")}</td></tr>
            <tr><td style="padding: 8px 12px; font-weight: 600;">Email</td><td style="padding: 8px 12px;">${escapeHtml(profile?.email ?? "—")}</td></tr>
            <tr><td style="padding: 8px 12px; font-weight: 600;">Telefon</td><td style="padding: 8px 12px;">${escapeHtml(profile?.phone ?? "—")}</td></tr>
          </tbody>
        </table>

        <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">ID rezerwacji: ${booking.id}</p>
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
        to: [ADMIN_EMAIL],
        subject,
        html,
      }),
    });

    const result = await resp.json();
    if (!resp.ok) {
      console.error("Resend error:", result);
      throw new Error(result.message || "Failed to send admin notification");
    }

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("notify-admin-booking error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
