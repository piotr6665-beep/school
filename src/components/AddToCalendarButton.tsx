import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import {
  generateGoogleCalendarUrl,
  parseTimeRange,
  createDateTime,
  getLocationAddress,
  getNextWeekday,
} from "@/utils/googleCalendar";
import { useTranslation } from "react-i18next";

interface AddToCalendarButtonProps {
  className?: string;
  classSchedule: {
    name: string;
    day: string;
    time: string;
    location: string;
    date?: string | null;
    level?: string;
    age?: string;
  };
  bookingDate?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const AddToCalendarButton = ({
  className,
  classSchedule,
  bookingDate,
  variant = "outline",
  size = "sm",
}: AddToCalendarButtonProps) => {
  const { t } = useTranslation();

  const handleAddToCalendar = () => {
    const { startTime, endTime } = parseTimeRange(classSchedule.time);
    
    // Use booking date, class date, or calculate from day name
    let eventDate: Date;
    if (bookingDate) {
      eventDate = new Date(bookingDate);
    } else if (classSchedule.date) {
      eventDate = new Date(classSchedule.date);
    } else {
      eventDate = getNextWeekday(classSchedule.day);
    }

    const startDate = createDateTime(eventDate.toISOString().split('T')[0], startTime);
    const endDate = createDateTime(eventDate.toISOString().split('T')[0], endTime);
    const location = getLocationAddress(classSchedule.location);

    const description = [
      classSchedule.level && `Poziom: ${classSchedule.level}`,
      classSchedule.age && `Wiek: ${classSchedule.age}`,
      'Aerial Dance Studio',
    ].filter(Boolean).join('\n');

    const calendarUrl = generateGoogleCalendarUrl({
      title: classSchedule.name,
      description,
      location,
      startDate,
      endDate,
    });

    window.open(calendarUrl, '_blank');
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleAddToCalendar}
      className={className}
    >
      <Calendar className="h-4 w-4 mr-2" />
      {t('calendar.addToGoogle')}
    </Button>
  );
};

export default AddToCalendarButton;
