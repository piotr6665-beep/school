import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { format, addDays, startOfWeek, isSameDay, eachDayOfInterval, addMonths } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';
import { Loader2, MapPin, Clock, Users, Calendar as CalendarIcon, CheckCircle2, Sparkles } from 'lucide-react';
import AddToCalendarButton from '@/components/AddToCalendarButton';
import BookingDialog from '@/components/BookingDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { isClassInPast } from '@/utils/isPastClass';
interface ClassSchedule {
  id: string;
  location: string;
  day: string;
  time: string;
  name: string;
  age: string;
  level: string;
  available_spots: number;
  max_spots: number;
  date?: string | null;
}

interface Booking {
  id: string;
  class_schedule_id: string;
  booking_date: string;
  status: string;
  quantity: number;
}

interface WaitlistEntry {
  id: string;
  class_schedule_id: string;
  waitlist_date: string;
}

interface EventBookingRow {
  id: string;
  event_id: string;
  selected_option: string | null;
  quantity: number;
  notes: string | null;
  status: string;
  created_at: string;
  event?: {
    id: string;
    title: string;
    price: string | null;
    location: string | null;
    category: string;
  } | null;
}

const Bookings = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [eventBookings, setEventBookings] = useState<EventBookingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ClassSchedule | null>(null);
  const [isBookingLoading, setIsBookingLoading] = useState(false);
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  
  const currentLocale = i18n.language === 'pl' ? pl : enUS;

  const dayNameMap: Record<string, string> = {
    'Poniedziałek': 'Monday',
    'Wtorek': 'Tuesday',
    'Środa': 'Wednesday',
    'Czwartek': 'Thursday',
    'Piątek': 'Friday',
    'Sobota': 'Saturday',
    'Niedziela': 'Sunday'
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [schedulesRes, bookingsRes, waitlistRes, eventBookingsRes] = await Promise.all([
        supabase.from('class_schedules').select('*').order('time'),
        supabase.from('bookings').select('*').eq('user_id', user?.id).eq('status', 'active'),
        supabase.from('waitlist').select('*').eq('user_id', user?.id),
        supabase
          .from('event_bookings')
          .select('*, event:events(id, title, price, location, category)')
          .eq('user_id', user?.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
      ]);

      if (schedulesRes.error) throw schedulesRes.error;
      if (bookingsRes.error) throw bookingsRes.error;
      if (waitlistRes.error) throw waitlistRes.error;
      if (eventBookingsRes.error) throw eventBookingsRes.error;

      setSchedules(schedulesRes.data || []);
      setBookings(bookingsRes.data || []);
      setWaitlist(waitlistRes.data || []);
      setEventBookings((eventBookingsRes.data as EventBookingRow[]) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: t('bookings.error'),
        description: t('common.error'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEventBooking = async (id: string) => {
    const { error } = await supabase
      .from('event_bookings')
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (error) {
      toast({ title: t('eventBooking.error'), description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: t('eventBooking.cancelled'), description: t('eventBooking.cancelledDesc') });
    fetchData();
  };

  const handleJoinWaitlist = async (schedule: ClassSchedule) => {
    const waitlistDate = schedule.date 
      ? schedule.date 
      : format(getNextDateForDay(schedule.day, selectedDate), 'yyyy-MM-dd');

    try {
      const { error } = await supabase.from('waitlist').insert({
        user_id: user?.id,
        class_schedule_id: schedule.id,
        waitlist_date: waitlistDate,
      });

      if (error) throw error;

      toast({
        title: t('bookings.waitlistAdded'),
        description: t('bookings.waitlistAddedDesc'),
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const isOnWaitlist = (scheduleId: string, date: string) => {
    return waitlist.some(w => w.class_schedule_id === scheduleId && w.waitlist_date === date);
  };

  const getNextDateForDay = (dayName: string, fromDate: Date = new Date()): Date => {
    const targetDay = dayNameMap[dayName];
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDayIndex = daysOfWeek.indexOf(targetDay);
    const currentDayIndex = fromDate.getDay();
    
    let daysToAdd = targetDayIndex - currentDayIndex;
    if (daysToAdd < 0) {
      daysToAdd += 7;
    }
    
    return addDays(fromDate, daysToAdd);
  };

  const getClassesForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayName = format(date, 'EEEE', { locale: currentLocale });
    const polishDayName = Object.keys(dayNameMap).find(key => dayNameMap[key] === dayName);
    
    return schedules.filter(schedule => {
      // If schedule has a specific date, check if it matches
      if (schedule.date) {
        return schedule.date === dateStr;
      }
      // Otherwise, check if it's a recurring class for this day of week
      return schedule.day === polishDayName;
    });
  };

  // Calculate dates with available classes for the next 3 months
  const datesWithClasses = useMemo(() => {
    const today = new Date();
    const endDate = addMonths(today, 3);
    const allDays = eachDayOfInterval({ start: today, end: endDate });
    
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return allDays.filter(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayName = daysOfWeek[date.getDay()];
      const polishDayName = Object.keys(dayNameMap).find(key => dayNameMap[key] === dayName);
      
      return schedules.some(schedule => {
        if (schedule.date) {
          return schedule.date === dateStr && schedule.available_spots > 0;
        }
        return schedule.day === polishDayName && schedule.available_spots > 0;
      });
    });
  }, [schedules]);

  const isBooked = (scheduleId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.some(b => b.class_schedule_id === scheduleId && b.booking_date === dateStr);
  };

  const openBookingDialog = (schedule: ClassSchedule) => {
    if (schedule.available_spots <= 0) {
      toast({
        title: t('bookings.noSpots'),
        description: t('bookings.noSpotsDesc'),
        variant: "destructive",
      });
      return;
    }

    const bookingDate = schedule.date 
      ? schedule.date 
      : format(getNextDateForDay(schedule.day, selectedDate), 'yyyy-MM-dd');

    if (isClassInPast(bookingDate, schedule.time)) {
      toast({
        title: t('bookings.pastClassTitle'),
        description: t('bookings.pastClassDesc'),
        variant: "destructive",
      });
      return;
    }

    if (bookings.some(b => b.class_schedule_id === schedule.id && b.booking_date === bookingDate)) {
      toast({
        title: t('bookings.alreadyBookedTitle'),
        description: t('bookings.alreadyBookedDesc'),
        variant: "destructive",
      });
      return;
    }

    setSelectedSchedule(schedule);
    setBookingDialogOpen(true);
  };

  const handleBookingConfirm = async (quantity: number) => {
    if (!selectedSchedule) return;

    setIsBookingLoading(true);

    const bookingDate = selectedSchedule.date 
      ? selectedSchedule.date 
      : format(getNextDateForDay(selectedSchedule.day, selectedDate), 'yyyy-MM-dd');

    try {
      if (isClassInPast(bookingDate, selectedSchedule.time)) {
        throw new Error(t('bookings.pastClassDesc'));
      }

      const { data: newBooking, error } = await supabase
        .from('bookings')
        .insert({
          user_id: user?.id,
          class_schedule_id: selectedSchedule.id,
          booking_date: bookingDate,
          status: 'active',
          quantity: quantity,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Fire-and-forget admin notification
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
        title: t('bookings.bookedSuccess'),
        description: t('bookings.bookedSuccessDesc', { 
          name: selectedSchedule.name, 
          date: format(new Date(bookingDate), 'dd MMMM yyyy', { locale: currentLocale }),
          quantity: quantity
        }),
      });

      setBookingDialogOpen(false);
      setSelectedSchedule(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: t('bookings.error'),
        description: error.message || t('common.error'),
        variant: "destructive",
      });
    } finally {
      setIsBookingLoading(false);
    }
  };

  const handleCancelBooking = async (
    bookingId: string,
    classScheduleId?: string,
    bookingDate?: string,
  ) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: t('bookings.cancelledSuccess'),
        description: t('bookings.cancelledSuccessDesc'),
      });

      // Fire-and-forget admin notification about cancellation
      supabase.functions
        .invoke('notify-admin-booking', {
          body: { booking_id: bookingId, action: 'cancelled' },
        })
        .then(({ error: notifyErr }) => {
          if (notifyErr) console.warn('notify-admin-booking failed:', notifyErr.message);
        });

      // Fire-and-forget notify next person on waitlist (server confirms there's a free spot)
      if (classScheduleId && bookingDate) {
        supabase.functions
          .invoke('notify-waitlist', {
            body: { class_schedule_id: classScheduleId, waitlist_date: bookingDate },
          })
          .then(({ error: notifyErr }) => {
            if (notifyErr) console.warn('notify-waitlist failed:', notifyErr.message);
          });
      }

      fetchData();
    } catch (error: any) {
      toast({
        title: t('bookings.error'),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const myBookingsWithDetails = bookings.map(booking => {
    const schedule = schedules.find(s => s.id === booking.class_schedule_id);
    return { ...booking, schedule };
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 animate-fade-in">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2">{t('bookings.title')}</h1>
            <p className="text-muted-foreground">{t('bookings.welcome')}, {user?.email}</p>
          </div>
          <Button variant="outline" onClick={signOut}>{t('bookings.logout')}</Button>
        </div>

        <Tabs defaultValue="book" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="book">{t('bookings.tabs.book')}</TabsTrigger>
            <TabsTrigger value="my-bookings">{t('bookings.tabs.myBookings')}</TabsTrigger>
          </TabsList>

          <TabsContent value="book" className="space-y-6">
            <div className="grid md:grid-cols-[300px_1fr] gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    {t('bookings.selectDay')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    locale={currentLocale}
                    disabled={(date) => date < new Date()}
                    modifiers={{
                      hasClasses: datesWithClasses,
                    }}
                    modifiersClassNames={{
                      hasClasses: "has-classes",
                    }}
                    className="rounded-md border pointer-events-auto"
                  />
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {t('bookings.availableClasses')} - {format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: currentLocale })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     {getClassesForDate(selectedDate).length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        {t('bookings.noClasses')}
                      </p>
                     ) : (
                      getClassesForDate(selectedDate).map((schedule) => {
                        // For specific date classes, use that date
                        // For recurring classes, calculate next occurrence
                        const classDate = schedule.date 
                          ? new Date(schedule.date) 
                          : getNextDateForDay(schedule.day, selectedDate);
                        const claseDateStr = format(classDate, 'yyyy-MM-dd');
                        const alreadyBooked = bookings.some(
                          b => b.class_schedule_id === schedule.id && b.booking_date === claseDateStr
                        );
                        
                        return (
                          <Card key={schedule.id} className="border-border/50">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-lg">{schedule.name}</h4>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                    <CalendarIcon className="h-4 w-4" />
                                    <span className="font-medium">{format(classDate, 'dd MMMM yyyy', { locale: currentLocale })}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                    <Clock className="h-4 w-4" />
                                    <span>{schedule.time}</span>
                                    <MapPin className="h-4 w-4 ml-2" />
                                    <span>{schedule.location === 'funka' ? 'ul. Funka 11' : 'ul. Bałtycka 15'}</span>
                                  </div>
                                </div>
                                <Badge variant={schedule.available_spots > 0 ? "default" : "destructive"}>
                                  {schedule.available_spots}/{schedule.max_spots} {t('bookings.spots')}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-2 mb-3">
                                <Badge variant="secondary">
                                  <Users className="h-3 w-3 mr-1" />
                                  {schedule.age}
                                </Badge>
                                <Badge variant="outline">{schedule.level}</Badge>
                              </div>
                              <Button
                                onClick={() => openBookingDialog(schedule)}
                                disabled={schedule.available_spots <= 0 || alreadyBooked}
                                className="w-full"
                              >
                                {alreadyBooked ? (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    {t('bookings.alreadyBooked')}
                                  </>
                                ) : schedule.available_spots <= 0 ? (
                                  t('bookings.noAvailableSpots')
                                ) : (
                                  t('bookings.book')
                                )}
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="my-bookings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('bookings.upcomingBookings')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {myBookingsWithDetails.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    {t('bookings.noBookings')}
                  </p>
                ) : (
                  myBookingsWithDetails.map((booking) => (
                    <Card key={booking.id} className="border-border/50">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg">
                              {booking.schedule?.name}
                              {booking.quantity > 1 && (
                                <Badge variant="secondary" className="ml-2">
                                  <Users className="h-3 w-3 mr-1" />
                                  {booking.quantity} {t('bookings.people')}
                                </Badge>
                              )}
                            </h4>
                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
                              <div className="flex items-center gap-1">
                                <CalendarIcon className="h-4 w-4" />
                                {format(new Date(booking.booking_date), 'dd MMMM yyyy', { locale: currentLocale })}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {booking.schedule?.time}
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {booking.schedule?.location === 'funka' ? 'ul. Funka 11' : 'ul. Bałtycka 15'}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {booking.schedule && (
                              <AddToCalendarButton
                                classSchedule={booking.schedule}
                                bookingDate={booking.booking_date}
                              />
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleCancelBooking(booking.id, booking.class_schedule_id, booking.booking_date)}
                            >
                              {t('bookings.cancel')}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  {t('eventBooking.myBookings')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {eventBookings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    {t('eventBooking.noBookings')}
                  </p>
                ) : (
                  eventBookings.map((eb) => (
                    <Card key={eb.id} className="border-border/50">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row justify-between gap-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg">
                              {eb.event?.title}
                              {eb.quantity > 1 && (
                                <Badge variant="secondary" className="ml-2">
                                  <Users className="h-3 w-3 mr-1" />
                                  {eb.quantity} {t('bookings.people')}
                                </Badge>
                              )}
                            </h4>
                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
                              {eb.event?.category && (
                                <Badge variant="outline" className="capitalize">{eb.event.category}</Badge>
                              )}
                              {eb.selected_option && (
                                <div className="flex items-center gap-1">
                                  <CalendarIcon className="h-4 w-4" />
                                  {eb.selected_option}
                                </div>
                              )}
                              {eb.event?.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {eb.event.location}
                                </div>
                              )}
                              {eb.event?.price && (
                                <span className="font-semibold text-primary">{eb.event.price}</span>
                              )}
                            </div>
                            {eb.notes && (
                              <p className="text-sm text-muted-foreground mt-2 italic">
                                „{eb.notes}"
                              </p>
                            )}
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancelEventBooking(eb.id)}
                            className="self-start"
                          >
                            {t('eventBooking.cancel')}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <BookingDialog
          isOpen={bookingDialogOpen}
          onClose={() => {
            setBookingDialogOpen(false);
            setSelectedSchedule(null);
          }}
          onConfirm={handleBookingConfirm}
          className={selectedSchedule?.name || ''}
          availableSpots={selectedSchedule?.available_spots || 0}
          isLoading={isBookingLoading}
        />
      </div>
    </div>
  );
};

export default Bookings;