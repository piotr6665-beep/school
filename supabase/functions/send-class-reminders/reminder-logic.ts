// Pure logic for the reminder processor — extracted so it can be unit-tested
// without Deno-only APIs (serve, std/http) and without hitting Resend.
//
// The single most important guarantee here is exactly-once delivery per
// booking: each booking row gets at most one reminder email, even when:
//   - the cron job overlaps with a previous still-running invocation,
//   - the function is invoked manually while cron also fires,
//   - Postgres / Supabase momentarily returns the same row twice.
//
// We achieve this via a CLAIM-THEN-SEND pattern: an atomic conditional
// UPDATE acts as a per-row mutex. Only the invocation that flips
// reminder_sent_at from NULL -> now() is allowed to send. If the email
// send subsequently fails, we roll the timestamp back conditionally
// (only if it still matches the value we wrote), so a retry can happen
// on the next tick without ever risking a duplicate send.

export type Lang = "pl" | "en";

export interface BookingRow {
  id: string;
  booking_date: string;
  quantity: number;
  user_id: string;
  reminder_sent_at: string | null;
  class_schedules:
    | { name: string; time: string; day: string; location: string }
    | { name: string; time: string; day: string; location: string }[]
    | null;
}

export interface ProfileRow {
  full_name: string;
  email: string | null;
  preferred_language: string;
}

export interface ProcessResult {
  bookingId: string;
  status:
    | "sent"
    | "skipped_no_profile"
    | "skipped_bad_time"
    | "skipped_outside_window"
    | "skipped_lost_claim"
    | "failed_email"
    | "error";
  error?: string;
}

export interface ReminderDeps {
  // Atomically tries to mark this booking as reminded.
  // MUST be implemented as: UPDATE bookings
  //   SET reminder_sent_at = :ts
  //   WHERE id = :id AND reminder_sent_at IS NULL
  //   RETURNING id
  // Returns the timestamp that was written iff this caller won the claim,
  // or null if another concurrent invocation already claimed it.
  claimReminder: (bookingId: string) => Promise<string | null>;

  // Conditionally rolls the claim back: UPDATE ... SET reminder_sent_at=NULL
  //   WHERE id=:id AND reminder_sent_at=:ts
  // The :ts predicate is critical so we never wipe a successful concurrent
  // send.
  releaseClaim: (bookingId: string, claimedAt: string) => Promise<void>;

  sendEmail: (args: {
    to: string;
    subject: string;
    html: string;
  }) => Promise<{ ok: boolean; error?: string }>;

  buildSubject: (data: ReminderData, lang: Lang) => string;
  buildHtml: (data: ReminderData, lang: Lang) => string;

  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export interface ReminderData {
  fullName: string;
  className: string;
  classTime: string;
  classDay: string;
  bookingDate: string;
  quantity: number;
  locationKey: string;
  bookingsUrl: string;
}

const WINDOW_MIN_LO = 5 * 60 + 45;
const WINDOW_MIN_HI = 6 * 60 + 15;

export const isInsideReminderWindow = (
  bookingDate: string,
  scheduleTime: string,
  now: Date,
  tzOffset = "+01:00",
): { ok: true; diffMin: number } | { ok: false; reason: "bad_time" | "outside_window"; diffMin?: number } => {
  const timeMatch = String(scheduleTime).match(/(\d{1,2}):(\d{2})/);
  if (!timeMatch) return { ok: false, reason: "bad_time" };

  const [, hh, mm] = timeMatch;
  const classDateTime = new Date(
    `${bookingDate}T${hh.padStart(2, "0")}:${mm}:00${tzOffset}`,
  );
  const diffMin = (classDateTime.getTime() - now.getTime()) / (60 * 1000);
  if (diffMin < WINDOW_MIN_LO || diffMin > WINDOW_MIN_HI) {
    return { ok: false, reason: "outside_window", diffMin };
  }
  return { ok: true, diffMin };
};

export const processBookingReminder = async (
  deps: ReminderDeps,
  booking: BookingRow,
  profile: ProfileRow | undefined,
  now: Date,
  bookingsUrl: string,
): Promise<ProcessResult> => {
  const scheduleRaw = booking.class_schedules;
  const schedule = Array.isArray(scheduleRaw) ? scheduleRaw[0] : scheduleRaw;

  if (!schedule || !profile?.email) {
    deps.warn(`Skipping booking ${booking.id} — missing schedule or email`);
    return { bookingId: booking.id, status: "skipped_no_profile" };
  }

  const win = isInsideReminderWindow(
    booking.booking_date,
    schedule.time,
    now,
  );
  if (win.ok === false) {
    if (win.reason === "bad_time") {
      deps.warn(
        `Skipping booking ${booking.id} — invalid time format: ${schedule.time}`,
      );
      return { bookingId: booking.id, status: "skipped_bad_time" };
    }
    deps.log(
      `Booking ${booking.id} outside window (${win.diffMin?.toFixed(0)}min) — skipping`,
    );
    return { bookingId: booking.id, status: "skipped_outside_window" };
  }

  // === ATOMIC CLAIM ===
  // From here on, only one concurrent invocation will proceed for this row.
  const claimedAt = await deps.claimReminder(booking.id);
  if (!claimedAt) {
    deps.log(
      `Booking ${booking.id} already claimed by another invocation — skipping`,
    );
    return { bookingId: booking.id, status: "skipped_lost_claim" };
  }

  const lang: Lang = profile.preferred_language === "en" ? "en" : "pl";
  const reminderData: ReminderData = {
    fullName: profile.full_name || (lang === "en" ? "Friend" : "Cześć"),
    className: schedule.name,
    classTime: schedule.time,
    classDay: schedule.day,
    bookingDate: booking.booking_date,
    quantity: booking.quantity,
    locationKey: schedule.location,
    bookingsUrl,
  };

  try {
    const result = await deps.sendEmail({
      to: profile.email,
      subject: deps.buildSubject(reminderData, lang),
      html: deps.buildHtml(reminderData, lang),
    });

    if (!result.ok) {
      // Roll back the claim so the next tick can retry.
      // Conditional release means we will NEVER undo a different
      // invocation's successful send.
      await deps.releaseClaim(booking.id, claimedAt);
      deps.error(`Email failed for booking ${booking.id}:`, result.error);
      return {
        bookingId: booking.id,
        status: "failed_email",
        error: result.error,
      };
    }

    deps.log(`✓ Reminder sent for booking ${booking.id} to ${profile.email}`);
    return { bookingId: booking.id, status: "sent" };
  } catch (err: any) {
    await deps.releaseClaim(booking.id, claimedAt);
    deps.error(`Error sending reminder for booking ${booking.id}:`, err);
    return { bookingId: booking.id, status: "error", error: err?.message };
  }
};
