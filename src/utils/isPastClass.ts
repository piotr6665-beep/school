// Returns true if the given class date+time is already in the past.
// `bookingDate` is "yyyy-MM-dd" (in local Europe/Warsaw context) and
// `time` is "HH:mm" (or contains it). If the time can't be parsed,
// we conservatively only treat the date as past after midnight.
export const isClassInPast = (
  bookingDate: string,
  time: string,
  now: Date = new Date(),
): boolean => {
  if (!bookingDate) return false;

  const timeMatch = String(time || "").match(/(\d{1,2}):(\d{2})/);
  if (!timeMatch) {
    // No time → treat as past once the date itself has passed (end of day).
    const endOfDay = new Date(`${bookingDate}T23:59:59`);
    return endOfDay.getTime() < now.getTime();
  }

  const [, hh, mm] = timeMatch;
  const classDateTime = new Date(
    `${bookingDate}T${hh.padStart(2, "0")}:${mm}:00`,
  );
  return classDateTime.getTime() < now.getTime();
};
