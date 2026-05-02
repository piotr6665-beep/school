import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Download, ExternalLink } from "lucide-react";
import { ClassSchedule } from "./ScheduleManager";
import {
  generateGoogleCalendarUrl,
  generateICSContent,
  downloadICS,
  parseTimeRange,
  createDateTime,
  getLocationAddress,
  getNextWeekday,
} from "@/utils/googleCalendar";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface CalendarExportProps {
  schedules: ClassSchedule[];
}

const CalendarExport = ({ schedules }: CalendarExportProps) => {
  const { toast } = useToast();
  const { t } = useTranslation();

  const createCalendarEvents = () => {
    return schedules.map((schedule) => {
      const { startTime, endTime } = parseTimeRange(schedule.time);
      
      let eventDate: Date;
      if (schedule.date) {
        eventDate = new Date(schedule.date);
      } else {
        eventDate = getNextWeekday(schedule.day);
      }

      const startDate = createDateTime(eventDate.toISOString().split('T')[0], startTime);
      const endDate = createDateTime(eventDate.toISOString().split('T')[0], endTime);
      const location = getLocationAddress(schedule.location);

      const description = [
        `${t('admin.schedule.calendar.levelLabel')}: ${schedule.level}`,
        `${t('admin.schedule.calendar.ageLabel')}: ${schedule.age}`,
        `${t('admin.schedule.calendar.availableSpotsLabel')}: ${schedule.available_spots}/${schedule.max_spots}`,
        'Aerial Dance Studio',
      ].join('\n');

      return {
        title: schedule.name,
        description,
        location,
        startDate,
        endDate,
      };
    });
  };

  const handleExportICS = () => {
    const events = createCalendarEvents();
    const icsContent = generateICSContent(events);
    downloadICS(icsContent, 'aerial-dance-schedule.ics');
    
    toast({
      title: t('admin.schedule.calendar.exportDone'),
      description: t('admin.schedule.calendar.exportDoneDesc'),
    });
  };

  const handleOpenGoogleCalendar = (schedule: ClassSchedule) => {
    const { startTime, endTime } = parseTimeRange(schedule.time);
    
    let eventDate: Date;
    if (schedule.date) {
      eventDate = new Date(schedule.date);
    } else {
      eventDate = getNextWeekday(schedule.day);
    }

    const startDate = createDateTime(eventDate.toISOString().split('T')[0], startTime);
    const endDate = createDateTime(eventDate.toISOString().split('T')[0], endTime);
    const location = getLocationAddress(schedule.location);

    const description = [
      `${t('admin.schedule.calendar.levelLabel')}: ${schedule.level}`,
      `${t('admin.schedule.calendar.ageLabel')}: ${schedule.age}`,
      'Aerial Dance Studio',
    ].join('\n');

    const url = generateGoogleCalendarUrl({
      title: schedule.name,
      description,
      location,
      startDate,
      endDate,
    });

    window.open(url, '_blank');
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {t('admin.schedule.calendar.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          {t('admin.schedule.calendar.description')}
        </p>
        
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleExportICS} variant="default">
            <Download className="h-4 w-4 mr-2" />
            {t('admin.schedule.calendar.downloadICS')}
          </Button>
        </div>

        <div className="border-t pt-4 mt-4">
          <h4 className="font-medium mb-3">{t('admin.schedule.calendar.quickAdd')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {schedules.slice(0, 6).map((schedule) => (
              <Button
                key={schedule.id}
                variant="outline"
                size="sm"
                onClick={() => handleOpenGoogleCalendar(schedule)}
                className="justify-start"
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                <span className="truncate">
                  {schedule.name} - {schedule.day}
                </span>
              </Button>
            ))}
          </div>
          {schedules.length > 6 && (
            <p className="text-xs text-muted-foreground mt-2">
              {t('admin.schedule.calendar.andMore', { count: schedules.length - 6 })}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CalendarExport;
