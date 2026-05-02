import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { pl, enUS } from "date-fns/locale";
import { Loader2, User, Calendar, Clock, MapPin, History, Settings, Users, Sparkles, X } from "lucide-react";
import AddToCalendarButton from "@/components/AddToCalendarButton";

interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
}

interface BookingWithSchedule {
  id: string;
  booking_date: string;
  status: string;
  quantity: number;
  created_at: string;
  class_schedule: {
    name: string;
    day: string;
    time: string;
    location: string;
    level: string;
    age: string;
  } | null;
}

interface EventBookingWithEvent {
  id: string;
  status: string;
  quantity: number;
  selected_option: string | null;
  notes: string | null;
  created_at: string;
  event: {
    title: string;
    location: string | null;
    price: string | null;
    duration: string | null;
    category: string;
  } | null;
}

const Profile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bookings, setBookings] = useState<BookingWithSchedule[]>([]);
  const [eventBookings, setEventBookings] = useState<EventBookingWithEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState("");
  const [editedPhone, setEditedPhone] = useState("");
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const dateLocale = i18n.language === 'pl' ? pl : enUS;

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const [profileRes, bookingsRes, eventBookingsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('bookings')
          .select(`
            *,
            class_schedule:class_schedules(name, day, time, location, level, age)
          `)
          .eq('user_id', user.id)
          .order('booking_date', { ascending: false }),
        supabase
          .from('event_bookings')
          .select(`
            *,
            event:events(title, location, price, duration, category)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      if (profileRes.error && profileRes.error.code !== 'PGRST116') throw profileRes.error;
      if (bookingsRes.error) throw bookingsRes.error;
      if (eventBookingsRes.error) throw eventBookingsRes.error;

      if (profileRes.data) {
        setProfile(profileRes.data);
        setEditedName(profileRes.data.full_name);
        setEditedPhone(profileRes.data.phone || "");
      }
      setBookings(bookingsRes.data || []);
      setEventBookings((eventBookingsRes.data || []) as EventBookingWithEvent[]);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: t('common.error'),
        description: t('profile.fetchError'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editedName,
          phone: editedPhone || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, full_name: editedName, phone: editedPhone || null } : null);
      toast({
        title: t('profile.saved'),
        description: t('profile.savedDesc'),
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelBooking = async (id: string) => {
    setCancellingId(id);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));

      // Fire-and-forget admin notification about cancellation
      supabase.functions
        .invoke('notify-admin-booking', {
          body: { booking_id: id, action: 'cancelled' },
        })
        .then(({ error: notifyErr }) => {
          if (notifyErr) console.warn('notify-admin-booking failed:', notifyErr.message);
        });

      toast({ title: t('profile.cancelSuccess'), description: t('profile.cancelSuccessDesc') });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    } finally {
      setCancellingId(null);
    }
  };

  const handleCancelEventBooking = async (id: string) => {
    setCancellingId(id);
    try {
      const { error } = await supabase
        .from('event_bookings')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
      setEventBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
      toast({ title: t('profile.cancelSuccess'), description: t('profile.cancelSuccessDesc') });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    } finally {
      setCancellingId(null);
    }
  };

  const activeBookings = bookings.filter(b => b.status === 'active' && new Date(b.booking_date) >= new Date());
  const pastBookings = bookings.filter(b => b.status !== 'active' || new Date(b.booking_date) < new Date());
  const activeEventBookings = eventBookings.filter(b => b.status === 'active');
  const pastEventBookings = eventBookings.filter(b => b.status !== 'active');

  const totalActive = activeBookings.length + activeEventBookings.length;
  const totalAll = bookings.length + eventBookings.length;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2">{t('profile.title')}</h1>
            <p className="text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="outline" onClick={signOut}>{t('profile.logout')}</Button>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">
              <Settings className="h-4 w-4 mr-2" />
              {t('profile.tabs.settings')}
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              <Calendar className="h-4 w-4 mr-2" />
              {t('profile.tabs.upcoming')}
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              {t('profile.tabs.history')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t('profile.personalData')}
                </CardTitle>
                <CardDescription>{t('profile.personalDataDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('profile.fullName')}</Label>
                    <Input
                      id="name"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('profile.phone')}</Label>
                    <Input
                      id="phone"
                      value={editedPhone}
                      onChange={(e) => setEditedPhone(e.target.value)}
                      placeholder="+48 ..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email || ""} disabled />
                  <p className="text-xs text-muted-foreground">{t('profile.emailReadonly')}</p>
                </div>
                <Button onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('profile.saving')}
                    </>
                  ) : (
                    t('profile.save')
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('profile.stats')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-secondary/30 rounded-lg">
                    <p className="text-3xl font-bold text-primary">{totalActive}</p>
                    <p className="text-sm text-muted-foreground">{t('profile.activeBookings')}</p>
                  </div>
                  <div className="p-4 bg-secondary/30 rounded-lg">
                    <p className="text-3xl font-bold text-primary">{pastBookings.filter(b => b.status === 'active').length}</p>
                    <p className="text-sm text-muted-foreground">{t('profile.completedClasses')}</p>
                  </div>
                  <div className="p-4 bg-secondary/30 rounded-lg">
                    <p className="text-3xl font-bold text-primary">{totalAll}</p>
                    <p className="text-sm text-muted-foreground">{t('profile.totalBookings')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('profile.upcomingBookings')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeBookings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t('profile.noUpcoming')}</p>
                    <Button variant="link" onClick={() => navigate('/rezerwacje')}>
                      {t('profile.bookNow')}
                    </Button>
                  </div>
                ) : (
                  activeBookings.map((booking) => (
                    <Card key={booking.id} className="border-border/50">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-3 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-lg flex items-center gap-2 flex-wrap">
                              {booking.class_schedule?.name}
                              {booking.quantity > 1 && (
                                <Badge variant="secondary">
                                  <Users className="h-3 w-3 mr-1" />
                                  {booking.quantity}
                                </Badge>
                              )}
                            </h4>
                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {format(new Date(booking.booking_date), 'EEEE, dd MMMM yyyy', { locale: dateLocale })}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {booking.class_schedule?.time}
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {booking.class_schedule?.location === 'funka' ? 'ul. Funka 11' : 'ul. Bałtycka 15'}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 items-center">
                            {booking.class_schedule && (
                              <AddToCalendarButton
                                classSchedule={booking.class_schedule}
                                bookingDate={booking.booking_date}
                              />
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" disabled={cancellingId === booking.id}>
                                  {cancellingId === booking.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <><X className="h-4 w-4 mr-1" /> {t('profile.cancel')}</>
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('profile.cancelConfirmTitle')}</AlertDialogTitle>
                                  <AlertDialogDescription>{t('profile.cancelConfirmDesc')}</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('common.no') || 'Nie'}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleCancelBooking(booking.id)}>
                                    {t('profile.cancelConfirm')}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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
                  {t('profile.upcomingEvents')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeEventBookings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t('profile.noUpcomingEvents')}</p>
                    <Button variant="link" onClick={() => navigate('/wydarzenia')}>
                      {t('profile.viewEvents')}
                    </Button>
                  </div>
                ) : (
                  activeEventBookings.map((booking) => (
                    <Card key={booking.id} className="border-border/50">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-3 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-lg flex items-center gap-2 flex-wrap">
                              {booking.event?.title}
                              {booking.quantity > 1 && (
                                <Badge variant="secondary">
                                  <Users className="h-3 w-3 mr-1" />
                                  {booking.quantity}
                                </Badge>
                              )}
                            </h4>
                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
                              {booking.selected_option && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {booking.selected_option}
                                </div>
                              )}
                              {booking.event?.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {booking.event.location}
                                </div>
                              )}
                              {booking.event?.price && (
                                <Badge variant="outline">{booking.event.price}</Badge>
                              )}
                            </div>
                            {booking.notes && (
                              <p className="text-xs text-muted-foreground mt-2 italic">
                                {t('profile.notes')}: {booking.notes}
                              </p>
                            )}
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" disabled={cancellingId === booking.id}>
                                {cancellingId === booking.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <><X className="h-4 w-4 mr-1" /> {t('profile.cancel')}</>
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('profile.cancelConfirmTitle')}</AlertDialogTitle>
                                <AlertDialogDescription>{t('profile.cancelConfirmDesc')}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('common.no') || 'Nie'}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleCancelEventBooking(booking.id)}>
                                  {t('profile.cancelConfirm')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('profile.bookingHistory')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pastBookings.length === 0 && pastEventBookings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t('profile.noHistory')}</p>
                  </div>
                ) : (
                  <>
                    {pastBookings.map((booking) => (
                      <div key={booking.id} className="flex justify-between items-center p-4 bg-secondary/20 rounded-lg gap-3">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{booking.class_schedule?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(booking.booking_date), 'dd MMMM yyyy', { locale: dateLocale })}
                            {booking.quantity > 1 && ` • ${booking.quantity} osób`}
                          </p>
                        </div>
                        <Badge variant={booking.status === 'active' ? 'secondary' : 'outline'}>
                          {booking.status === 'cancelled' ? t('profile.cancelled') : t('profile.completed')}
                        </Badge>
                      </div>
                    ))}
                    {pastEventBookings.map((booking) => (
                      <div key={booking.id} className="flex justify-between items-center p-4 bg-secondary/20 rounded-lg gap-3">
                        <div className="min-w-0">
                          <p className="font-medium truncate flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary shrink-0" />
                            {booking.event?.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {booking.selected_option || booking.event?.duration}
                            {booking.quantity > 1 && ` • ${booking.quantity} osób`}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {t('profile.cancelled')}
                        </Badge>
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
