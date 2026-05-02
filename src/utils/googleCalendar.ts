// Utility functions for Google Calendar integration

interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Generates a Google Calendar URL that opens with pre-filled event data
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatDate(event.startDate)}/${formatDate(event.endDate)}`,
  });

  if (event.description) {
    params.append('details', event.description);
  }

  if (event.location) {
    params.append('location', event.location);
  }

  return `https://www.google.com/calendar/render?${params.toString()}`;
}

/**
 * Parses time string (e.g., "17:15-18:45") into start and end times
 */
export function parseTimeRange(timeString: string): { startTime: string; endTime: string } {
  const [startTime, endTime] = timeString.split('-');
  return { startTime: startTime.trim(), endTime: endTime.trim() };
}

/**
 * Creates a Date object from a date string and time string
 */
export function createDateTime(dateString: string, timeString: string): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date(dateString);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Gets the location address based on location key
 */
export function getLocationAddress(location: string): string {
  const addresses: Record<string, string> = {
    funka: 'ul. Funka 11, Gdańsk, Poland',
    baltycka: 'ul. Bałtycka 15, Gdańsk, Poland',
  };
  return addresses[location] || location;
}

/**
 * Generates ICS file content for calendar export
 */
export function generateICSContent(events: CalendarEvent[]): string {
  const formatICSDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '').slice(0, -1);
  };

  const escapeText = (text: string): string => {
    return text.replace(/[\\;,]/g, (match) => '\\' + match).replace(/\n/g, '\\n');
  };

  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Aerial Dance Studio//Schedule//PL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  events.forEach((event, index) => {
    icsContent.push(
      'BEGIN:VEVENT',
      `UID:${Date.now()}-${index}@aerialdance.studio`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `DTSTART:${formatICSDate(event.startDate)}`,
      `DTEND:${formatICSDate(event.endDate)}`,
      `SUMMARY:${escapeText(event.title)}`,
      event.description ? `DESCRIPTION:${escapeText(event.description)}` : '',
      event.location ? `LOCATION:${escapeText(event.location)}` : '',
      'END:VEVENT'
    );
  });

  icsContent.push('END:VCALENDAR');

  return icsContent.filter(Boolean).join('\r\n');
}

/**
 * Downloads ICS file
 */
export function downloadICS(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Gets the next occurrence of a weekday from today
 */
export function getNextWeekday(dayName: string, fromDate: Date = new Date()): Date {
  const daysOfWeek: Record<string, number> = {
    'Niedziela': 0,
    'Poniedziałek': 1,
    'Wtorek': 2,
    'Środa': 3,
    'Czwartek': 4,
    'Piątek': 5,
    'Sobota': 6,
  };

  const targetDay = daysOfWeek[dayName];
  if (targetDay === undefined) return fromDate;

  const result = new Date(fromDate);
  result.setHours(0, 0, 0, 0);
  
  const currentDay = result.getDay();
  let daysUntilTarget = targetDay - currentDay;
  
  if (daysUntilTarget <= 0) {
    daysUntilTarget += 7;
  }
  
  result.setDate(result.getDate() + daysUntilTarget);
  return result;
}
