import { describe, it, expect, vi } from "vitest";
import {
  processBookingReminder,
  isInsideReminderWindow,
  type BookingRow,
  type ProfileRow,
  type ReminderDeps,
} from "../../supabase/functions/send-class-reminders/reminder-logic";

// ----- Helpers -----

const baseProfile: ProfileRow = {
  full_name: "Anna Kowalska",
  email: "anna@example.com",
  preferred_language: "pl",
};

const makeBooking = (overrides: Partial<BookingRow> = {}): BookingRow => ({
  id: "b-1",
  booking_date: "2030-01-15",
  quantity: 1,
  user_id: "u-1",
  reminder_sent_at: null,
  class_schedules: {
    name: "Aerial Silks",
    time: "18:00",
    day: "monday",
    location: "funka",
  },
  ...overrides,
});

// "now" 6 hours before the class starts, in the same +01:00 zone the
// reminder logic uses.
const sixHoursBeforeClass = (): Date =>
  new Date("2030-01-15T12:00:00+01:00");

const makeDeps = (overrides: Partial<ReminderDeps> = {}): ReminderDeps => ({
  claimReminder: vi.fn(async () => new Date().toISOString()),
  releaseClaim: vi.fn(async () => {}),
  sendEmail: vi.fn(async () => ({ ok: true })),
  buildSubject: vi.fn(() => "Subject"),
  buildHtml: vi.fn(() => "<p>html</p>"),
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  ...overrides,
});

// ----- Window helper -----

describe("isInsideReminderWindow", () => {
  it("accepts a class exactly 6h ahead", () => {
    const r = isInsideReminderWindow(
      "2030-01-15",
      "18:00",
      sixHoursBeforeClass(),
    );
    expect(r.ok).toBe(true);
  });

  it("rejects a class only 4h ahead", () => {
    const fourHoursBefore = new Date("2030-01-15T14:00:00+01:00");
    const r = isInsideReminderWindow("2030-01-15", "18:00", fourHoursBefore);
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.reason).toBe("outside_window");
  });

  it("rejects malformed time", () => {
    const r = isInsideReminderWindow(
      "2030-01-15",
      "no-time",
      sixHoursBeforeClass(),
    );
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.reason).toBe("bad_time");
  });
});

// ----- Single-reminder guarantee -----

describe("processBookingReminder — exactly-once delivery", () => {
  it("sends exactly one email when called once and claim wins", async () => {
    const deps = makeDeps();
    const result = await processBookingReminder(
      deps,
      makeBooking(),
      baseProfile,
      sixHoursBeforeClass(),
      "https://x.test/bookings",
    );

    expect(result.status).toBe("sent");
    expect(deps.claimReminder).toHaveBeenCalledTimes(1);
    expect(deps.sendEmail).toHaveBeenCalledTimes(1);
    expect(deps.releaseClaim).not.toHaveBeenCalled();
  });

  it("skips sending when claim is lost (concurrent invocation already claimed)", async () => {
    // Simulate the conditional UPDATE matching zero rows because another
    // worker already flipped reminder_sent_at to non-null.
    const deps = makeDeps({
      claimReminder: vi.fn(async () => null),
    });

    const result = await processBookingReminder(
      deps,
      makeBooking(),
      baseProfile,
      sixHoursBeforeClass(),
      "https://x.test/bookings",
    );

    expect(result.status).toBe("skipped_lost_claim");
    expect(deps.sendEmail).not.toHaveBeenCalled();
    expect(deps.releaseClaim).not.toHaveBeenCalled();
  });

  it("two concurrent invocations result in exactly one email", async () => {
    // Shared mutable state simulating a single DB row's reminder_sent_at.
    let reminderSentAt: string | null = null;

    const deps: ReminderDeps = makeDeps({
      claimReminder: vi.fn(async () => {
        // Atomic conditional UPDATE: only the FIRST caller wins.
        if (reminderSentAt !== null) return null;
        const ts = new Date().toISOString();
        reminderSentAt = ts;
        return ts;
      }),
    });

    const booking = makeBooking();
    const now = sixHoursBeforeClass();

    // Fire two invocations "in parallel".
    const [r1, r2] = await Promise.all([
      processBookingReminder(deps, booking, baseProfile, now, "u"),
      processBookingReminder(deps, booking, baseProfile, now, "u"),
    ]);

    const sent = [r1, r2].filter((r) => r.status === "sent");
    const lost = [r1, r2].filter((r) => r.status === "skipped_lost_claim");
    expect(sent).toHaveLength(1);
    expect(lost).toHaveLength(1);
    expect(deps.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("rolls back the claim when email send fails so the next tick can retry — but never sends twice within one race", async () => {
    let reminderSentAt: string | null = null;

    const deps: ReminderDeps = makeDeps({
      claimReminder: vi.fn(async () => {
        if (reminderSentAt !== null) return null;
        const ts = new Date().toISOString();
        reminderSentAt = ts;
        return ts;
      }),
      releaseClaim: vi.fn(async (_id, claimedAt) => {
        // Conditional release: only undo if it still matches.
        if (reminderSentAt === claimedAt) reminderSentAt = null;
      }),
      sendEmail: vi.fn(async () => ({ ok: false, error: "smtp down" })),
    });

    const result = await processBookingReminder(
      deps,
      makeBooking(),
      baseProfile,
      sixHoursBeforeClass(),
      "u",
    );

    expect(result.status).toBe("failed_email");
    expect(deps.releaseClaim).toHaveBeenCalledTimes(1);
    expect(reminderSentAt).toBeNull(); // ready for retry on next tick
  });

  it("releaseClaim does NOT undo a successful concurrent send (timestamp guard)", async () => {
    // Models the worst case: invocation A claims, then sendEmail throws,
    // and meanwhile invocation B has somehow re-claimed (e.g. after a
    // separate later cycle). The conditional release must NOT clear
    // B's timestamp.
    let reminderSentAt: string | null = "2025-01-01T00:00:00.000Z"; // B already sent
    const aClaim = "1999-01-01T00:00:00.000Z"; // stale value A "thinks" it has

    const deps: ReminderDeps = makeDeps({
      claimReminder: vi.fn(async () => aClaim), // pretend A won (just for the test)
      sendEmail: vi.fn(async () => {
        throw new Error("network exploded");
      }),
      releaseClaim: vi.fn(async (_id, claimedAt) => {
        if (reminderSentAt === claimedAt) reminderSentAt = null;
      }),
    });

    // Manually overwrite reminderSentAt before send to simulate the race
    const result = await processBookingReminder(
      deps,
      makeBooking(),
      baseProfile,
      sixHoursBeforeClass(),
      "u",
    );

    expect(result.status).toBe("error");
    expect(deps.releaseClaim).toHaveBeenCalledWith("b-1", aClaim);
    // Critical: B's successful timestamp survived A's rollback attempt.
    expect(reminderSentAt).toBe("2025-01-01T00:00:00.000Z");
  });

  it("does not even attempt to claim when class is outside the 6h window", async () => {
    const deps = makeDeps();
    // 'now' is only 1h before class
    const oneHourBefore = new Date("2030-01-15T17:00:00+01:00");

    const result = await processBookingReminder(
      deps,
      makeBooking(),
      baseProfile,
      oneHourBefore,
      "u",
    );

    expect(result.status).toBe("skipped_outside_window");
    expect(deps.claimReminder).not.toHaveBeenCalled();
    expect(deps.sendEmail).not.toHaveBeenCalled();
  });

  it("skips when the user has no email — without claiming the row", async () => {
    const deps = makeDeps();
    const result = await processBookingReminder(
      deps,
      makeBooking(),
      { ...baseProfile, email: null },
      sixHoursBeforeClass(),
      "u",
    );

    expect(result.status).toBe("skipped_no_profile");
    expect(deps.claimReminder).not.toHaveBeenCalled();
  });
});
