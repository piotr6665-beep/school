import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Users, Loader2, Calendar as CalendarIcon, LayoutGrid, List as ListIcon, ChevronLeft, ChevronRight, Sparkles, CheckCircle2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { parseClassName } from "@/utils/classBadges";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from 'react-i18next';
import { format, startOfWeek, addDays, addWeeks, isWithinInterval, differenceInCalendarWeeks } from "date-fns";
import { pl, enUS } from "date-fns/locale";
import WeeklyTimetable from "@/components/WeeklyTimetable";
import BookingDialog from "@/components/BookingDialog";
import ScheduleFiltersBar from "@/components/schedule/ScheduleFiltersBar";
import OccupancyBar from "@/components/schedule/OccupancyBar";
import WaitlistButton from "@/components/schedule/WaitlistButton";
import { matchesFilters, type ScheduleFilters } from "@/utils/scheduleFilters";
import { isClassInPast } from "@/utils/isPastClass";

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
  max_spots: number;
  date?: string | null;
  badge?: string | null;
}

interface DaySchedule {
  day: string;
  classes: ClassSchedule[];
}

const Schedule = () => {
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassSchedule | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState<'week' | 'list'>('week');
  const [filters, setFilters] = useState<ScheduleFilters>({ search: '', age: 'all', level: 'all', type: 'all' });
  // Set of "<class_schedule_id>|<yyyy-MM-dd>" the current user has booked.
  const [myBookings, setMyBookings] = useState<Set<string>>(new Set());

  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const dateLocale = i18n.language === 'pl' ? pl : enUS;
  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  useEffect(() => {
    fetchSchedules();
  }, []);

  useEffect(() => {
    if (!user) {
      setMyBookings(new Set());
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('class_schedule_id, booking_date')
        .eq('user_id', user.id)
        .eq('status', 'active');
      if (error) return;
      setMyBookings(new Set((data || []).map(b => `${b.class_schedule_id}|${b.booking_date}`)));
    })();
  }, [user]);

  const fetchSchedules = async () => {
    try {
      // Keep one-off classes from the start of the current week onwards,
      // so users can still see (greyed-out) what happened earlier this week.
      const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const cutoff = format(currentWeekStart, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('class_schedules')
        .select('*')
        .order('location', { ascending: true })
        .order('day', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;
      const filteredData = (data || []).filter(schedule => {
        if (!schedule.date) return true;
        return schedule.date >= cutoff;
      });
      setSchedules(filteredData as ClassSchedule[]);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast({ title: t('common.error'), description: t('schedule.bookingErrorDesc'), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Apply text/level/age/type filters
  const filteredSchedules = useMemo(
    () => schedules.filter(s => matchesFilters(s, filters)),
    [schedules, filters]
  );

  const groupSchedulesByLocation = (location: string): DaySchedule[] => {
    const locationSchedules = filteredSchedules.filter(s => s.location === location);
    const dayIndexMap: Record<string, number> = {
      'Poniedziałek': 0, 'Wtorek': 1, 'Środa': 2, 'Czwartek': 3,
      'Piątek': 4, 'Sobota': 5, 'Niedziela': 6,
      'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3,
      'Friday': 4, 'Saturday': 5, 'Sunday': 6,
    };

    const grouped: Record<string, ClassSchedule[]> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const schedule of locationSchedules) {
      let dateObj: Date | null = null;
      if (schedule.date) {
        const d = new Date(schedule.date);
        if (isWithinInterval(d, { start: weekStart, end: weekEnd })) {
          dateObj = d;
        }
      } else {
        const idx = dayIndexMap[schedule.day];
        if (idx !== undefined) {
          const candidate = addDays(weekStart, idx);
          if (weekOffset > 0 || candidate >= today) {
            dateObj = candidate;
          }
        }
      }
      if (!dateObj) continue;
      const key = format(dateObj, 'yyyy-MM-dd');
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(schedule);
    }

    return Object.entries(grouped)
      .map(([key, classes]) => ({
        day: key,
        classes: [...classes].sort((a, b) => a.time.localeCompare(b.time)),
      }))
      .sort((a, b) => a.day.localeCompare(b.day));
  };

  const openBookingDialog = (classItem: ClassSchedule, dateOverride?: string) => {
    if (!user) {
      toast({ title: t('schedule.loginRequired'), description: t('schedule.loginRequiredDesc'), variant: "destructive" });
      navigate('/auth');
      return;
    }
    if (classItem.available_spots <= 0) return;

    const targetDate = dateOverride ?? classItem.date ?? null;
    if (targetDate && isClassInPast(targetDate, classItem.time)) {
      toast({
        title: t('bookings.pastClassTitle'),
        description: t('bookings.pastClassDesc'),
        variant: "destructive",
      });
      return;
    }

    setSelectedClass(classItem);
    setSelectedDate(targetDate);
    setBookingDialogOpen(true);
  };

  const handleBooking = async (quantity: number) => {
    if (!user || !selectedClass) return;
    setBookingLoading(selectedClass.id);
    try {
      const bookingDate = selectedDate || selectedClass.date || new Date().toISOString().split('T')[0];

      // Server-side correctness: re-check past class right before insert.
      if (isClassInPast(bookingDate, selectedClass.time)) {
        throw new Error(t('bookings.pastClassDesc'));
      }

      const { data: newBooking, error } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          class_schedule_id: selectedClass.id,
          booking_date: bookingDate,
          status: 'active',
          quantity,
        })
        .select('id')
        .single();
      if (error) throw error;

      // Fire-and-forget admin notification.
      if (newBooking?.id) {
        supabase.functions
          .invoke('notify-admin-booking', {
            body: { booking_id: newBooking.id, action: 'created' },
          })
          .then(({ error: notifyErr }) => {
            if (notifyErr) console.warn('notify-admin-booking failed:', notifyErr.message);
          });
      }

      toast({
        title: t('schedule.booked'),
        description: t('schedule.bookedDesc', { name: selectedClass.name }) + (quantity > 1 ? ` (${quantity} ${t('bookings.bookingDialog.people')})` : ''),
      });
      setBookingDialogOpen(false);
      setSelectedClass(null);
      setSelectedDate(null);
      setMyBookings(prev => new Set(prev).add(`${selectedClass.id}|${bookingDate}`));
      fetchSchedules();
    } catch (error: any) {
      console.error('Booking error:', error);
      toast({ title: t('schedule.bookingError'), description: error.message || t('schedule.bookingErrorDesc'), variant: "destructive" });
    } finally {
      setBookingLoading(null);
    }
  };

  const funkaSchedule = groupSchedulesByLocation('funka');
  const baltyckaSchedule = groupSchedulesByLocation('baltycka');

  const formatDayTitle = (daySchedule: DaySchedule) => {
    const date = new Date(daySchedule.day);
    const dayName = format(date, "EEEE", { locale: dateLocale });
    const formattedDate = format(date, "d MMMM yyyy", { locale: dateLocale });
    return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${formattedDate}`;
  };

  const renderListSchedule = (schedule: DaySchedule[]) => {
    if (schedule.length === 0) {
      return (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {t('schedule.noClassesWeek')}
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="space-y-6">
        {schedule.map((daySchedule, idx) => (
          <Card key={idx} className="hover:shadow-elegant transition-shadow border-l-4 border-l-primary/60">
            <CardHeader>
              <CardTitle className="text-xl text-primary flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {formatDayTitle(daySchedule)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {daySchedule.classes.map((classItem) => {
                const full = classItem.available_spots <= 0;
                const meta = parseClassName(classItem.name, classItem.badge);
                const isNew = meta.badges.includes('new');
                const isRecommended = meta.badges.includes('recommended');
                const isMine = myBookings.has(`${classItem.id}|${daySchedule.day}`);
                return (
                  <div
                    key={classItem.id}
                    id={`class-${classItem.id}`}
                    className={cn(
                      "p-4 rounded-lg bg-secondary/30 border border-border transition-all duration-200 ease-out",
                      "hover:bg-secondary/50 hover:-translate-y-0.5 hover:shadow-md",
                      isMine && "ring-2 ring-emerald-500 ring-offset-2 ring-offset-background"
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start flex-wrap gap-2">
                          <h4 className="font-semibold text-lg">{meta.cleanName}</h4>
                          {isNew && (
                            <Badge className="bg-amber-500 hover:bg-amber-500 text-white border-0">
                              <Sparkles className="h-3 w-3 mr-1" />
                              {t('schedule.badgeNew')}
                            </Badge>
                          )}
                          {isRecommended && (
                            <Badge className="bg-fuchsia-500 hover:bg-fuchsia-500 text-white border-0">
                              <Sparkles className="h-3 w-3 mr-1" />
                              {t('schedule.badgeRecommended')}
                            </Badge>
                          )}
                          {isMine && (
                            <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white border-0">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {t('schedule.myBooking')}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
                          <Clock className="h-4 w-4" />
                          <span>{classItem.time}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="secondary"><Users className="h-3 w-3 mr-1" />{classItem.age}</Badge>
                          <Badge variant="outline">{classItem.level}</Badge>
                        </div>
                        <OccupancyBar
                          available={classItem.available_spots}
                          max={classItem.max_spots || classItem.available_spots}
                          className="mt-3 max-w-xs"
                        />
                      </div>
                      <div className="flex flex-col sm:items-end gap-2 shrink-0">
                        {full ? (
                          <WaitlistButton classScheduleId={classItem.id} classDate={daySchedule.day} />
                        ) : (
                          <Button
                            onClick={() => openBookingDialog(classItem, daySchedule.day)}
                            disabled={bookingLoading === classItem.id}
                          >
                            {bookingLoading === classItem.id ? (
                              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('schedule.booking')}</>
                            ) : (
                              t('schedule.bookButton')
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const handleTimetableClassClick = (cls: ClassSchedule, dateStr: string) => {
    if (cls.available_spots <= 0) {
      // Open list view scrolled to it so user can see waitlist button
      setView('list');
      setTimeout(() => {
        const el = document.getElementById(`class-${cls.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
          setTimeout(() => el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2'), 2000);
        }
      }, 50);
      return;
    }
    openBookingDialog(cls, dateStr);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 animate-fade-in">
      <BookingDialog
        isOpen={bookingDialogOpen}
        onClose={() => { setBookingDialogOpen(false); setSelectedClass(null); setSelectedDate(null); }}
        onConfirm={handleBooking}
        className={selectedClass?.name || ''}
        availableSpots={selectedClass?.available_spots || 0}
        isLoading={bookingLoading === selectedClass?.id}
      />
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-primary">{t('schedule.title')}</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">{t('schedule.subtitle')}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center text-left">
            <Card className="flex-1 max-w-sm">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <p className="font-semibold">{t('schedule.locationFunka')}</p>
                    <p className="text-sm text-muted-foreground">{t('schedule.addressFunka')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="flex-1 max-w-sm">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <p className="font-semibold">{t('schedule.locationBaltycka')}</p>
                    <p className="text-sm text-muted-foreground">{t('schedule.addressBaltycka')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="sticky top-16 z-30 -mx-4 px-4 py-3 mb-6 bg-background/85 backdrop-blur-md border-b border-border/60 shadow-sm">
          <ScheduleFiltersBar filters={filters} onChange={setFilters} />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset - 1)} aria-label={t('schedule.previousWeek') as string}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[220px] justify-center text-sm font-medium">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {format(weekStart, 'd MMM', { locale: dateLocale })} – {format(weekEnd, 'd MMM yyyy', { locale: dateLocale })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={weekStart}
                    onSelect={(date) => {
                      if (!date) return;
                      const target = startOfWeek(date, { weekStartsOn: 1 });
                      const offset = differenceInCalendarWeeks(target, startOfWeek(new Date(), { weekStartsOn: 1 }), { weekStartsOn: 1 });
                      setWeekOffset(offset);
                    }}
                    weekStartsOn={1}
                    locale={dateLocale}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset + 1)} aria-label={t('schedule.nextWeek') as string}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              {weekOffset !== 0 && (
                <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>
                  {t('schedule.today')}
                </Button>
              )}
            </div>

            <Tabs value={view} onValueChange={(v) => setView(v as 'week' | 'list')}>
              <TabsList>
                <TabsTrigger value="week"><LayoutGrid className="h-4 w-4 mr-2" />{t('schedule.viewWeek')}</TabsTrigger>
                <TabsTrigger value="list"><ListIcon className="h-4 w-4 mr-2" />{t('schedule.viewList')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <Tabs defaultValue="funka" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="funka">ul. Funka 11</TabsTrigger>
            <TabsTrigger value="baltycka">ul. Bałtycka 15</TabsTrigger>
          </TabsList>

          <TabsContent value="funka">
            {view === 'week' ? (
              <WeeklyTimetable
                schedules={filteredSchedules}
                location="funka"
                weekOffset={weekOffset}
                onWeekOffsetChange={setWeekOffset}
                onClassClick={handleTimetableClassClick}
                myBookings={myBookings}
              />
            ) : (
              renderListSchedule(funkaSchedule)
            )}
          </TabsContent>

          <TabsContent value="baltycka">
            {view === 'week' ? (
              <WeeklyTimetable
                schedules={filteredSchedules}
                location="baltycka"
                weekOffset={weekOffset}
                onWeekOffsetChange={setWeekOffset}
                onClassClick={handleTimetableClassClick}
                myBookings={myBookings}
              />
            ) : (
              renderListSchedule(baltyckaSchedule)
            )}
          </TabsContent>
        </Tabs>

        <Card className="mt-12 bg-gradient-hero border-none">
          <CardHeader>
            <CardTitle className="text-center">{t('schedule.info.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-card p-4 rounded-lg">
              <p className="text-muted-foreground">
                <strong className="text-foreground">{t('schedule.info.trial.title')}</strong> {t('schedule.info.trial.description')}
              </p>
            </div>
            <div className="bg-card p-4 rounded-lg">
              <p className="text-muted-foreground">
                <strong className="text-foreground">{t('schedule.info.registration.title')}</strong> {t('schedule.info.registration.description')}
              </p>
            </div>
            <div className="bg-card p-4 rounded-lg">
              <p className="text-muted-foreground">
                <strong className="text-foreground">{t('schedule.info.changes.title')}</strong> {t('schedule.info.changes.description')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Schedule;
