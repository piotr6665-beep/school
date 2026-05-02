import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays, Calendar as CalendarIcon, Sparkles, CheckCircle2 } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { format, startOfWeek, addDays, addWeeks, isSameDay, isSameWeek, differenceInCalendarWeeks } from "date-fns";
import { pl, enUS } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { parseClassName } from "@/utils/classBadges";

interface ClassSchedule {
  id: string;
  location: string;
  day: string;
  time: string;
  name: string;
  age: string;
  level: string;
  spots: string;
  available_spots: number;
  max_spots?: number;
  date?: string | null;
  badge?: string | null;
}

interface WeeklyTimetableProps {
  schedules: ClassSchedule[];
  location: string;
  weekOffset?: number;
  onWeekOffsetChange?: (offset: number) => void;
  onClassClick?: (cls: ClassSchedule, dateStr: string) => void;
  /** Set of "<class_schedule_id>|<yyyy-MM-dd>" the current user has actively booked. */
  myBookings?: Set<string>;
}

const WeeklyTimetable = ({ schedules, location, weekOffset: weekOffsetProp, onWeekOffsetChange, onClassClick, myBookings }: WeeklyTimetableProps) => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'pl' ? pl : enUS;

  const polishDays = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
  const displayDays = i18n.language === 'pl'
    ? ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela']
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const shortDays = i18n.language === 'pl'
    ? ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const [internalOffset, setInternalOffset] = useState(0);
  const weekOffset = weekOffsetProp ?? internalOffset;
  const setWeekOffset = (updater: number | ((w: number) => number)) => {
    const next = typeof updater === 'function' ? (updater as (w: number) => number)(weekOffset) : updater;
    if (onWeekOffsetChange) onWeekOffsetChange(next);
    else setInternalOffset(next);
  };

  const weekStart = useMemo(
    () => startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }),
    [weekOffset]
  );
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const locationSchedules = schedules.filter(s => s.location === location);
  const recurring = locationSchedules.filter(s => !s.date);
  const oneOffsThisWeek = locationSchedules.filter(s => {
    if (!s.date) return false;
    const d = new Date(s.date);
    return isSameWeek(d, weekStart, { weekStartsOn: 1 });
  });

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const isCurrentWeek = weekOffset === 0;

  const getClassForDayTime = (dayIndex: number, time: string): ClassSchedule | undefined => {
    const dayDate = weekDates[dayIndex];
    const polishDay = polishDays[dayIndex];

    const oneOff = oneOffsThisWeek.find(
      s => s.date && isSameDay(new Date(s.date), dayDate) && s.time === time
    );
    if (oneOff) return oneOff;

    const rec = recurring.find(s => s.day === polishDay && s.time === time);
    if (!rec) return undefined;
    if (isCurrentWeek && dayDate < todayMidnight) return undefined;
    return rec;
  };

  const visibleSchedules: ClassSchedule[] = [...recurring, ...oneOffsThisWeek];
  const times = [...new Set(visibleSchedules.map(s => s.time))].sort((a, b) => {
    return a.split('-')[0].localeCompare(b.split('-')[0]);
  });

  const handleCellClick = (cls: ClassSchedule, dayIdx: number) => {
    const dateStr = format(weekDates[dayIdx], 'yyyy-MM-dd');
    if (onClassClick) {
      onClassClick(cls, dateStr);
    } else {
      // fallback: scroll to corresponding tile
      const el = document.getElementById(`class-${cls.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
        setTimeout(() => el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2'), 2000);
      }
    }
  };

  const weekRangeLabel = `${format(weekStart, 'd MMM', { locale: dateLocale })} – ${format(weekEnd, 'd MMM yyyy', { locale: dateLocale })}`;

  const handleJumpToDate = (date?: Date) => {
    if (!date) return;
    const targetWeekStart = startOfWeek(date, { weekStartsOn: 1 });
    const offset = differenceInCalendarWeeks(targetWeekStart, startOfWeek(new Date(), { weekStartsOn: 1 }), { weekStartsOn: 1 });
    setWeekOffset(offset);
  };


  return (
    <Card className="mb-8 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base sm:text-lg text-primary flex items-center gap-2">
            <CalendarDays className="h-5 w-5 flex-shrink-0" />
            <span className="truncate">{t('schedule.weeklyView')}</span>
          </CardTitle>
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center sm:justify-end">
            <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => setWeekOffset(w => w - 1)} aria-label="Previous week">
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="min-w-0 sm:min-w-[180px] justify-center text-xs sm:text-sm font-medium px-2 sm:px-3">
                  <CalendarIcon className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
                  <span className="truncate">{weekRangeLabel}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={weekStart}
                  onSelect={handleJumpToDate}
                  weekStartsOn={1}
                  locale={dateLocale}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => setWeekOffset(w => w + 1)} aria-label="Next week">
              <ChevronRight className="h-4 w-4" />
            </Button>

            {weekOffset !== 0 && (
              <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>
                {t('schedule.today')}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {times.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {t('schedule.noClassesWeek')}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse table-fixed min-w-[640px]">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-1 sm:p-2 text-center text-xs sm:text-sm font-semibold text-muted-foreground border-b border-r border-border w-12 sm:w-20 bg-muted/60">
                    {t('schedule.time')}
                  </th>
                  {displayDays.map((day, idx) => {
                    const dDate = weekDates[idx];
                    const isToday = isSameDay(dDate, today);
                    return (
                      <th
                        key={day}
                        className={cn(
                          "p-1 sm:p-2 text-center text-xs sm:text-sm font-medium border-b border-border",
                          isToday ? 'text-primary bg-primary/5' : 'text-muted-foreground'
                        )}
                      >
                        <div className="hidden md:block">{day}</div>
                        <div className="md:hidden">{shortDays[idx]}</div>
                        <div className={cn("text-[10px] sm:text-xs mt-0.5", isToday ? 'font-bold text-primary' : 'text-muted-foreground/70')}>
                          {format(dDate, 'd.MM')}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {times.map((time) => (
                  <tr key={time} className="border-b border-border last:border-b-0">
                    <td className="p-1 sm:p-2 text-center text-[10px] sm:text-xs font-semibold text-muted-foreground whitespace-nowrap bg-muted/40 border-r border-border tabular-nums">
                      {time}
                    </td>
                    {displayDays.map((day, idx) => {
                      const classItem = getClassForDayTime(idx, time);
                      const full = classItem && classItem.available_spots <= 0;
                      const dDate = weekDates[idx];
                      const isToday = isSameDay(dDate, today);
                      return (
                        <td
                          key={`${day}-${time}`}
                          className={cn(
                            "p-0.5 sm:p-1 text-center align-top h-20 sm:h-24",
                            isToday && "bg-primary/5"
                          )}
                        >
                          {classItem ? (() => {
                            const max = classItem.max_spots || classItem.available_spots || 0;
                            const taken = Math.max(0, max - classItem.available_spots);
                            const pct = max > 0 ? Math.min(100, Math.round((taken / max) * 100)) : 0;
                            let barColor = "bg-emerald-500";
                            if (pct >= 100) barColor = "bg-destructive";
                            else if (pct >= 80) barColor = "bg-amber-500";
                            else if (pct >= 50) barColor = "bg-yellow-500";

                            const meta = parseClassName(classItem.name, classItem.badge);
                            const isNew = meta.badges.includes('new');
                            const isRecommended = meta.badges.includes('recommended');
                            const dateStr = format(dDate, 'yyyy-MM-dd');
                            const isMine = !!myBookings?.has(`${classItem.id}|${dateStr}`);

                            return (
                              <button
                                onClick={() => handleCellClick(classItem, idx)}
                                className={cn(
                                  "relative w-full h-full rounded-md px-1.5 py-1 sm:px-2 sm:py-1.5 text-left flex flex-col gap-0.5 cursor-pointer border",
                                  "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md",
                                  full
                                    ? "bg-destructive/10 hover:bg-destructive/20 border-destructive/30"
                                    : "bg-primary/10 hover:bg-primary/20 border-primary/20",
                                  isMine && "ring-2 ring-emerald-500 ring-offset-1 ring-offset-background"
                                )}
                                title={classItem.name}
                              >
                                {isNew && (
                                  <span className="absolute -top-1.5 -right-1.5 z-10 inline-flex items-center gap-0.5 rounded-full bg-amber-500 text-white text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 shadow-sm">
                                    <Sparkles className="h-2 w-2" />
                                    {t('schedule.badgeNew')}
                                  </span>
                                )}
                                {isRecommended && !isNew && (
                                  <span className="absolute -top-1.5 -right-1.5 z-10 inline-flex items-center gap-0.5 rounded-full bg-fuchsia-500 text-white text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 shadow-sm">
                                    <Sparkles className="h-2 w-2" />
                                    {t('schedule.badgeRecommended')}
                                  </span>
                                )}
                                {isMine && (
                                  <span className="absolute -top-1.5 -left-1.5 z-10 inline-flex items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm" title={t('schedule.myBooking') as string}>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  </span>
                                )}
                                <div className={cn("font-semibold leading-tight text-[11px] sm:text-sm line-clamp-2", full ? "text-destructive" : "text-primary")}>
                                  {meta.cleanName}
                                </div>
                                <div className="flex items-center gap-1 text-[9px] sm:text-[11px] text-muted-foreground leading-tight truncate">
                                  <span className="truncate">{classItem.age}</span>
                                  <span className="opacity-50">•</span>
                                  <span className="truncate">{classItem.level}</span>
                                </div>
                                <div className="mt-auto flex flex-col gap-0.5 w-full">
                                  <div className="flex items-center justify-between text-[9px] sm:text-[10px] leading-tight">
                                    <span className={cn("font-medium tabular-nums", full ? "text-destructive" : "text-foreground/80")}>
                                      {taken}/{max}
                                    </span>
                                    {!full && (
                                      <span className="text-muted-foreground hidden md:inline">
                                        {classItem.available_spots} {t('schedule.spots')}
                                      </span>
                                    )}
                                    {full && (
                                      <span className="text-destructive font-medium hidden sm:inline">
                                        {t('schedule.noSpots')}
                                      </span>
                                    )}
                                  </div>
                                  <div className="h-1 w-full bg-secondary border border-border rounded-full overflow-hidden">
                                    <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              </button>
                            );
                          })() : (
                            <div className="w-full h-full rounded-md border border-dashed border-border/40 bg-muted/10" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WeeklyTimetable;
