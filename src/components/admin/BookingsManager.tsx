import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, Mail, Users, CheckCircle2, Circle } from "lucide-react";
import { format } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";

interface Booking {
  id: string;
  booking_date: string;
  status: string;
  created_at: string;
  class_schedule_id: string;
  quantity: number;
  paid: boolean;
  paid_at: string | null;
  class_schedule: {
    name: string;
    day: string;
    time: string;
    location: string;
  } | null;
  user_id: string;
}

const BookingsManager = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [schedules, setSchedules] = useState<any[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  const dateLocale = i18n.language === 'pl' ? pl : enUS;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [bookingsRes, schedulesRes, profilesRes] = await Promise.all([
        supabase
          .from('bookings')
          .select(`
            *,
            class_schedule:class_schedules(name, day, time, location)
          `)
          .eq('status', 'active')
          .order('booking_date', { ascending: true }),
        supabase.from('class_schedules').select('*').order('name'),
        supabase.from('profiles').select('id, full_name')
      ]);

      if (bookingsRes.error) throw bookingsRes.error;
      if (schedulesRes.error) throw schedulesRes.error;
      if (profilesRes.error) throw profilesRes.error;

      setBookings(bookingsRes.data || []);
      setSchedules(schedulesRes.data || []);
      
      const profilesMap: Record<string, string> = {};
      (profilesRes.data || []).forEach((profile: any) => {
        profilesMap[profile.id] = profile.full_name;
      });
      setProfiles(profilesMap);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: t('admin.bookings.error'),
        description: t('admin.bookings.errorFetch'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelBooking = async (
    bookingId: string,
    classScheduleId?: string,
    bookingDate?: string,
  ) => {
    if (!confirm(t('admin.bookings.confirmCancel'))) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: t('admin.bookings.cancelled'),
        description: t('admin.bookings.cancelledDesc'),
      });

      // Notify next person on waitlist (server checks free spot exists)
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
        title: t('admin.bookings.error'),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSendConfirmation = async (booking: Booking) => {
    try {
      const { error } = await supabase.functions.invoke('send-booking-confirmation', {
        body: {
          bookingId: booking.id,
        },
      });

      if (error) throw error;

      toast({
        title: t('admin.bookings.emailSent'),
        description: t('admin.bookings.emailSentDesc'),
      });
    } catch (error: any) {
      toast({
        title: t('admin.bookings.error'),
        description: error.message || t('admin.bookings.errorEmail'),
        variant: "destructive",
      });
    }
  };

  const handleTogglePaid = async (booking: Booking) => {
    const newPaid = !booking.paid;
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          paid: newPaid,
          paid_at: newPaid ? new Date().toISOString() : null,
        })
        .eq('id', booking.id);

      if (error) throw error;

      setBookings(prev =>
        prev.map(b =>
          b.id === booking.id
            ? { ...b, paid: newPaid, paid_at: newPaid ? new Date().toISOString() : null }
            : b
        )
      );

      toast({
        title: newPaid ? t('admin.bookings.markedPaid') : t('admin.bookings.markedUnpaid'),
      });
    } catch (error: any) {
      toast({
        title: t('admin.bookings.error'),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredBookings = selectedSchedule === "all" 
    ? bookings 
    : bookings.filter(b => b.class_schedule_id === selectedSchedule);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t('admin.bookings.title')}</h2>
        <Select value={selectedSchedule} onValueChange={setSelectedSchedule}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder={t('admin.bookings.filterClasses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.bookings.allClasses')}</SelectItem>
            {schedules.map((schedule) => (
              <SelectItem key={schedule.id} value={schedule.id}>
                {schedule.name} - {schedule.day} {schedule.time}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.bookings.activeBookings')} ({filteredBookings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredBookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t('admin.bookings.noBookings')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.bookings.fullName')}</TableHead>
                  <TableHead>{t('admin.bookings.class')}</TableHead>
                  <TableHead>{t('admin.bookings.spots')}</TableHead>
                  <TableHead>{t('admin.bookings.classDate')}</TableHead>
                  <TableHead>{t('admin.bookings.location')}</TableHead>
                  <TableHead>{t('admin.bookings.bookingDate')}</TableHead>
                  <TableHead>{t('admin.bookings.payment')}</TableHead>
                  <TableHead className="text-right">{t('admin.bookings.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      {profiles[booking.user_id] || t('admin.bookings.noData')}
                    </TableCell>
                    <TableCell>
                      {booking.class_schedule?.name}
                      <div className="text-sm text-muted-foreground">
                        {booking.class_schedule?.day} {booking.class_schedule?.time}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {booking.quantity || 1}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(booking.booking_date), 'dd MMMM yyyy', { locale: dateLocale })}
                    </TableCell>
                    <TableCell>
                      {booking.class_schedule?.location === 'funka' 
                        ? t('admin.schedule.funkaLocation') 
                        : t('admin.schedule.baltyckaLocation')}
                    </TableCell>
                    <TableCell>
                      {format(new Date(booking.created_at), 'dd.MM.yyyy HH:mm', { locale: dateLocale })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant={booking.paid ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleTogglePaid(booking)}
                        className={booking.paid ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                        title={booking.paid && booking.paid_at
                          ? `${t('admin.bookings.paidOn')} ${format(new Date(booking.paid_at), 'dd.MM.yyyy HH:mm', { locale: dateLocale })}`
                          : t('admin.bookings.markAsPaid')}
                      >
                        {booking.paid ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            {t('admin.bookings.paid')}
                          </>
                        ) : (
                          <>
                            <Circle className="h-4 w-4 mr-1" />
                            {t('admin.bookings.unpaid')}
                          </>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendConfirmation(booking)}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancelBooking(booking.id, booking.class_schedule_id, booking.booking_date)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingsManager;
