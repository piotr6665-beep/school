import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useAutoTranslate } from "@/hooks/useAutoTranslate";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Loader2,
  MapPin,
  Clock,
  Users,
  Check,
  CalendarCheck,
  CheckCircle2,
  Search,
  Cake,
  Sun,
  GraduationCap,
  User as UserIcon,
  Sparkles,
} from "lucide-react";
import EventBookingDialog, { EventBookingPayload } from "@/components/EventBookingDialog";

const CATEGORY_ICONS: Record<string, typeof Sparkles> = {
  urodziny: Cake,
  birthday: Cake,
  polkolonie: Sun,
  kolonie: Sun,
  warsztaty: GraduationCap,
  warsztat: GraduationCap,
  "zajecia-indywidualne": UserIcon,
  indywidualne: UserIcon,
};

const getCategoryIcon = (category?: string | null) => {
  if (!category) return Sparkles;
  return CATEGORY_ICONS[category.toLowerCase()] || Sparkles;
};

interface EventItem {
  id: string;
  title: string;
  short_description: string;
  description: string;
  category: string;
  price: string | null;
  duration: string | null;
  location: string | null;
  age_range: string | null;
  max_participants: number | null;
  available_times: string[] | null;
  features: string[] | null;
  image_url: string | null;
  contact_info: string | null;
  display_order: number | null;
  active: boolean;
}

interface TranslatedEvent extends EventItem {
  tTitle?: string;
  tShort?: string;
  tDescription?: string;
  tFeatures?: string[];
  tCategory?: string;
}

const Events = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [translated, setTranslated] = useState<TranslatedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);
  const [bookedEventIds, setBookedEventIds] = useState<Set<string>>(new Set());
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [lightboxImage, setLightboxImage] = useState<{ url: string; alt: string } | null>(null);
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const { translateTexts, needsTranslation } = useAutoTranslate();
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchMyBookings = async () => {
    if (!user) {
      setBookedEventIds(new Set());
      return;
    }
    const { data } = await supabase
      .from("event_bookings")
      .select("event_id")
      .eq("user_id", user.id)
      .eq("status", "active");
    setBookedEventIds(new Set((data || []).map((b) => b.event_id)));
  };

  useEffect(() => {
    fetchMyBookings();
  }, [user]);

  const openBooking = (e: EventItem) => {
    if (!user) {
      toast({
        title: t("eventBooking.loginRequired"),
        description: t("eventBooking.loginRequiredDesc"),
      });
      navigate("/auth");
      return;
    }
    setSelectedEvent(e);
    setBookingDialogOpen(true);
  };

  const handleBookingConfirm = async (payload: EventBookingPayload) => {
    if (!selectedEvent || !user) return;
    setIsBooking(true);
    try {
      const { error } = await supabase.from("event_bookings").insert({
        user_id: user.id,
        event_id: selectedEvent.id,
        selected_option: payload.selected_option,
        quantity: payload.quantity,
        notes: payload.notes,
        status: "active",
      });
      if (error) throw error;
      toast({
        title: t("eventBooking.success"),
        description: t("eventBooking.successDesc", { name: selectedEvent.title }),
      });
      setBookingDialogOpen(false);
      setSelectedEvent(null);
      fetchMyBookings();
    } catch (err: any) {
      toast({
        title: t("eventBooking.error"),
        description: err.message || t("eventBooking.errorDesc"),
        variant: "destructive",
      });
    } finally {
      setIsBooking(false);
    }
  };


  useEffect(() => {
    document.title = `${t("events.title")} | Aerial Paradise`;
  }, [t, i18n.language]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("active", true)
          .order("display_order", { ascending: true });
        if (error) throw error;
        setEvents(data || []);
      } catch (err) {
        console.error("Error fetching events:", err);
        toast({
          title: t("events.error"),
          description: t("events.errorDesc"),
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvents();
  }, [toast, t]);

  useEffect(() => {
    const run = async () => {
      if (!events.length) return;
      if (!needsTranslation) {
        setTranslated(
          events.map((e) => ({
            ...e,
            tTitle: e.title,
            tShort: e.short_description,
            tDescription: e.description,
            tFeatures: e.features || [],
            tCategory: e.category,
          }))
        );
        return;
      }
      setIsTranslating(true);
      try {
        const texts: string[] = [];
        events.forEach((e) => {
          texts.push(e.title);
          texts.push(e.short_description);
          texts.push(e.description);
          texts.push(e.category);
          (e.features || []).forEach((f) => texts.push(f));
        });
        const out = await translateTexts(texts);
        let i = 0;
        setTranslated(
          events.map((e) => {
            const tTitle = out[i++];
            const tShort = out[i++];
            const tDescription = out[i++];
            const tCategory = out[i++];
            const tFeatures = (e.features || []).map(() => out[i++]);
            return { ...e, tTitle, tShort, tDescription, tCategory, tFeatures };
          })
        );
      } catch (err) {
        console.error("Translation error:", err);
        setTranslated(
          events.map((e) => ({
            ...e,
            tTitle: e.title,
            tShort: e.short_description,
            tDescription: e.description,
            tFeatures: e.features || [],
            tCategory: e.category,
          }))
        );
      } finally {
        setIsTranslating(false);
      }
    };
    run();
  }, [events, needsTranslation, i18n.language, translateTexts]);

  const list = translated.length ? translated : events;

  // Unique categories from raw events (always Polish keys from DB)
  const categories = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set);
  }, [events]);

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return list.filter((e) => {
      const te = e as TranslatedEvent;
      const matchesCategory =
        activeCategory === "all" || e.category === activeCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      const haystack = [te.tTitle || e.title, te.tShort || e.short_description, e.location || ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [list, searchQuery, activeCategory]);

  const getCategoryLabel = (cat: string) => {
    const key = `events.categories.${cat.toLowerCase()}`;
    const value = t(key);
    return value === key ? cat : value;
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
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-primary">
            {t("events.title")}
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t("events.subtitle")}
          </p>
        </header>

        {events.length > 0 && (
          <div className="mb-8 space-y-4">
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t("events.searchPlaceholder")}
                value={searchQuery}
                onChange={(ev) => setSearchQuery(ev.target.value)}
                className="pl-9"
              />
            </div>
            {categories.length > 1 && (
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  size="sm"
                  variant={activeCategory === "all" ? "default" : "outline"}
                  onClick={() => setActiveCategory("all")}
                >
                  {t("events.filterAll")}
                  <span className="ml-2 text-xs opacity-70">({events.length})</span>
                </Button>
                {categories.map((cat) => {
                  const Icon = getCategoryIcon(cat);
                  const count = events.filter((e) => e.category === cat).length;
                  return (
                    <Button
                      key={cat}
                      size="sm"
                      variant={activeCategory === cat ? "default" : "outline"}
                      onClick={() => setActiveCategory(cat)}
                    >
                      <Icon className="h-3.5 w-3.5 mr-1.5" />
                      {getCategoryLabel(cat)}
                      <span className="ml-2 text-xs opacity-70">({count})</span>
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {events.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {t("events.empty")}
            </CardContent>
          </Card>
        ) : filteredList.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {t("events.noResults")}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredList.map((e) => {
              const te = e as TranslatedEvent;
              const title = te.tTitle || e.title;
              const short = te.tShort || e.short_description;
              const description = te.tDescription || e.description;
              const features = te.tFeatures || e.features || [];
              const category = te.tCategory || e.category;

              return (
                <Card
                  key={e.id}
                  className="overflow-hidden hover:shadow-elegant transition-all flex flex-col group"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-muted relative">
                    {e.image_url ? (
                      <>
                        {/* Blurred backdrop fills the tile so the full poster stays visible on top */}
                        <div
                          aria-hidden
                          className="absolute inset-0 bg-cover bg-center scale-110 blur-2xl opacity-50"
                          style={{ backgroundImage: `url(${e.image_url})` }}
                        />
                        <button
                          type="button"
                          onClick={() => setLightboxImage({ url: e.image_url!, alt: title })}
                          className="relative w-full h-full block cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={t("events.viewFullImage", { defaultValue: "Zobacz pełny obraz" })}
                        >
                          <img
                            src={e.image_url}
                            alt={title}
                            loading="lazy"
                            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                          />
                        </button>
                      </>
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ background: "var(--gradient-primary)" }}
                      >
                        {(() => {
                          const Icon = getCategoryIcon(e.category);
                          return <Icon className="h-16 w-16 text-primary-foreground/80" strokeWidth={1.5} />;
                        })()}
                      </div>
                    )}
                    {category && (
                      <Badge
                        variant="secondary"
                        className="absolute top-3 right-3 shadow-md backdrop-blur-sm bg-background/90"
                      >
                        {(() => {
                          const Icon = getCategoryIcon(e.category);
                          return <Icon className="h-3 w-3 mr-1" />;
                        })()}
                        {getCategoryLabel(e.category)}
                      </Badge>
                    )}
                    {e.price && (
                      <div className="absolute bottom-3 left-3 bg-background/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-md">
                        <span className="font-bold text-primary">{e.price}</span>
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <CardTitle className="text-2xl">
                      {isTranslating ? <span className="opacity-50">{e.title}</span> : title}
                    </CardTitle>
                    <CardDescription>
                      {isTranslating ? (
                        <span className="opacity-50">{e.short_description}</span>
                      ) : (
                        short
                      )}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {e.duration && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4 text-primary shrink-0" />
                          <span>{e.duration}</span>
                        </div>
                      )}
                      {e.location && (
                        <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                          <MapPin className="h-4 w-4 text-primary shrink-0" />
                          <span>{e.location}</span>
                        </div>
                      )}
                      {e.max_participants && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4 text-primary shrink-0" />
                          <span>
                            {t("events.maxParticipants", { count: e.max_participants })}
                          </span>
                        </div>
                      )}
                      {e.age_range && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="text-xs uppercase tracking-wide">
                            {t("events.ageRange")}: {e.age_range}
                          </span>
                        </div>
                      )}
                    </div>

                    {e.available_times && e.available_times.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold mb-2">{t("events.availableTimes")}</p>
                        <div className="flex flex-wrap gap-2">
                          {e.available_times.map((time, i) => (
                            <Badge key={i} variant="outline">
                              {time}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {features.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold mb-2">{t("events.includes")}</p>
                        <ul className="space-y-1.5">
                          {features.map((f, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                                <Check className="h-3 w-3 text-primary" />
                              </div>
                              <span className={isTranslating ? "opacity-50" : ""}>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {description && (
                      <details className="text-sm text-muted-foreground border-t border-border pt-3">
                        <summary className="cursor-pointer font-medium text-foreground hover:text-primary transition-colors">
                          {t("events.fullDescription")}
                        </summary>
                        <p className="mt-2 whitespace-pre-line">
                          {isTranslating ? (
                            <span className="opacity-50">{e.description}</span>
                          ) : (
                            description
                          )}
                        </p>
                      </details>
                    )}

                    {e.contact_info && (
                      <p className="text-sm text-muted-foreground italic border-t border-border pt-3">
                        {e.contact_info}
                      </p>
                    )}

                    <div className="mt-auto pt-3">
                      {bookedEventIds.has(e.id) ? (
                        <Button disabled className="w-full" variant="secondary">
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          {t("eventBooking.alreadyBooked")}
                        </Button>
                      ) : (
                        <Button onClick={() => openBooking(e)} className="w-full">
                          <CalendarCheck className="h-4 w-4 mr-2" />
                          {t("events.bookNow")}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {selectedEvent && (
        <EventBookingDialog
          isOpen={bookingDialogOpen}
          onClose={() => {
            setBookingDialogOpen(false);
            setSelectedEvent(null);
          }}
          onConfirm={handleBookingConfirm}
          eventTitle={selectedEvent.title}
          options={selectedEvent.available_times || []}
          maxParticipants={selectedEvent.max_participants}
          isLoading={isBooking}
        />
      )}

      <Dialog open={!!lightboxImage} onOpenChange={(open) => !open && setLightboxImage(null)}>
        <DialogContent className="max-w-[95vw] w-auto p-0 bg-transparent border-0 shadow-none flex items-center justify-center">
          {lightboxImage && (
            <img
              src={lightboxImage.url}
              alt={lightboxImage.alt}
              className="max-w-[95vw] max-h-[90vh] w-auto h-auto object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Events;
