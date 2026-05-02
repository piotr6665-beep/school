import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from 'react-i18next';
import PassesManager from "@/components/admin/PassesManager";
import ScheduleManager from "@/components/admin/ScheduleManager";
import BookingsManager from "@/components/admin/BookingsManager";
import UsersManager from "@/components/admin/UsersManager";
import MessagesManager from "@/components/admin/MessagesManager";
import GalleryManager from "@/components/admin/GalleryManager";
import InstructorsManager from "@/components/admin/InstructorsManager";
import FAQManager from "@/components/admin/FAQManager";
import EventsManager from "@/components/admin/EventsManager";
import EventBookingsManager from "@/components/admin/EventBookingsManager";
import AboutManager from "@/components/admin/AboutManager";

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signOut } = useAuth();
  const { t } = useTranslation();

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: t('admin.loggedOut'),
        description: t('admin.loggedOutDesc'),
      });
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: t('admin.logoutError'),
        description: t('admin.logoutErrorDesc'),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">{t('admin.title')}</h1>
            <p className="text-sm sm:text-base text-muted-foreground">{t('admin.subtitle')}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              {t('admin.homeButton')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              {t('admin.logoutButton')}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="passes" className="w-full">
          <div className="mb-8 -mx-4 px-4 overflow-x-auto">
            <TabsList className="inline-flex w-auto min-w-full lg:w-full lg:grid lg:grid-cols-11 h-auto p-1 gap-1">
              <TabsTrigger value="passes" className="whitespace-nowrap">{t('admin.tabs.passes')}</TabsTrigger>
              <TabsTrigger value="schedule" className="whitespace-nowrap">{t('admin.tabs.schedule')}</TabsTrigger>
              <TabsTrigger value="bookings" className="whitespace-nowrap">{t('admin.tabs.bookings')}</TabsTrigger>
              <TabsTrigger value="users" className="whitespace-nowrap">{t('admin.tabs.users')}</TabsTrigger>
              <TabsTrigger value="messages" className="whitespace-nowrap">{t('admin.tabs.messages')}</TabsTrigger>
              <TabsTrigger value="gallery" className="whitespace-nowrap">{t('admin.tabs.gallery')}</TabsTrigger>
              <TabsTrigger value="instructors" className="whitespace-nowrap">{t('admin.tabs.instructors')}</TabsTrigger>
              <TabsTrigger value="faq" className="whitespace-nowrap">{t('admin.tabs.faq')}</TabsTrigger>
              <TabsTrigger value="events" className="whitespace-nowrap">{t('admin.tabs.events')}</TabsTrigger>
              <TabsTrigger value="event-bookings" className="whitespace-nowrap">{t('admin.tabs.eventBookings')}</TabsTrigger>
              <TabsTrigger value="about" className="whitespace-nowrap">{t('admin.tabs.about')}</TabsTrigger>
            </TabsList>
          </div>

          
          <TabsContent value="passes">
            <PassesManager />
          </TabsContent>
          
          <TabsContent value="schedule">
            <ScheduleManager />
          </TabsContent>

          <TabsContent value="bookings">
            <BookingsManager />
          </TabsContent>

          <TabsContent value="users">
            <UsersManager />
          </TabsContent>

          <TabsContent value="messages">
            <MessagesManager />
          </TabsContent>

          <TabsContent value="gallery">
            <GalleryManager />
          </TabsContent>

          <TabsContent value="instructors">
            <InstructorsManager />
          </TabsContent>

          <TabsContent value="faq">
            <FAQManager />
          </TabsContent>

          <TabsContent value="events">
            <EventsManager />
          </TabsContent>

          <TabsContent value="event-bookings">
            <EventBookingsManager />
          </TabsContent>

          <TabsContent value="about">
            <AboutManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
