import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2, Users, Calendar as CalendarIcon, MapPin, Mail } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

interface EventBookingRow {
  id: string;
  user_id: string;
  event_id: string;
  selected_option: string | null;
  quantity: number;
  notes: string | null;
  status: string;
  created_at: string;
  event?: {
    id: string;
    title: string;
    category: string;
    price: string | null;
    location: string | null;
  } | null;
  profile?: {
    full_name: string;
    phone: string | null;
  } | null;
  email?: string | null;
}

const STATUS_OPTIONS = [
  { value: "active", label: "Aktywna" },
  { value: "confirmed", label: "Potwierdzona" },
  { value: "cancelled", label: "Anulowana" },
];

const EventBookingsManager = () => {
  const [bookings, setBookings] = useState<EventBookingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterEvent, setFilterEvent] = useState<string>("all");
  const [eventList, setEventList] = useState<{ id: string; title: string }[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchBookings = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("event_bookings")
      .select("*, event:events(id, title, category, price, location)")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
      setIsLoading(false);
      return;
    }

    // Pobierz profile dla user_id
    const userIds = [...new Set((data || []).map((b: any) => b.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, phone")
      .in("id", userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    const enriched: EventBookingRow[] = (data || []).map((b: any) => ({
      ...b,
      profile: profileMap.get(b.user_id) || null,
    }));

    setBookings(enriched);

    // Lista wydarzeń do filtra
    const uniqueEvents = new Map<string, string>();
    enriched.forEach((b) => {
      if (b.event) uniqueEvents.set(b.event.id, b.event.title);
    });
    setEventList(Array.from(uniqueEvents, ([id, title]) => ({ id, title })));
    setIsLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("event_bookings").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Zaktualizowano", description: `Status: ${status}` });
    fetchBookings();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("event_bookings").delete().eq("id", deleteId);
    setDeleteId(null);
    if (error) {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Usunięto", description: "Rezerwacja została usunięta" });
    fetchBookings();
  };

  const filtered = bookings.filter(
    (b) =>
      (filterStatus === "all" || b.status === filterStatus) &&
      (filterEvent === "all" || b.event_id === filterEvent)
  );

  const statusBadge = (status: string) => {
    const variant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      confirmed: "default",
      cancelled: "secondary",
    };
    const label = STATUS_OPTIONS.find((s) => s.value === status)?.label || status;
    return <Badge variant={variant[status] || "outline"}>{label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Rezerwacje wydarzeń</h2>
          <p className="text-sm text-muted-foreground">
            Zarządzaj zgłoszeniami na urodziny, kolonie, warsztaty
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={filterEvent} onValueChange={setFilterEvent}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Wszystkie wydarzenia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie wydarzenia</SelectItem>
              {eventList.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie statusy</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Wszystkie</p>
            <p className="text-2xl font-bold">{bookings.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Aktywne</p>
            <p className="text-2xl font-bold text-primary">
              {bookings.filter((b) => b.status === "active").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Anulowane</p>
            <p className="text-2xl font-bold text-muted-foreground">
              {bookings.filter((b) => b.status === "cancelled").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Brak rezerwacji pasujących do filtrów
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((b) => (
            <Card key={b.id} className={b.status === "cancelled" ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {statusBadge(b.status)}
                      {b.event?.category && (
                        <Badge variant="outline" className="capitalize">
                          {b.event.category}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(b.created_at), "dd MMM yyyy, HH:mm", { locale: pl })}
                      </span>
                    </div>
                    <CardTitle className="text-lg">{b.event?.title || "—"}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Select value={b.status} onValueChange={(v) => updateStatus(b.id, v)}>
                      <SelectTrigger className="w-[140px] h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(b.id)}
                      title="Usuń"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <div className="grid sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="font-medium">
                      {b.profile?.full_name || "—"}
                    </span>
                    <Badge variant="secondary" className="ml-auto sm:ml-0">
                      {b.quantity} {b.quantity === 1 ? "osoba" : "osób"}
                    </Badge>
                  </div>
                  {b.profile?.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <a href={`tel:${b.profile.phone}`} className="hover:text-primary">
                        {b.profile.phone}
                      </a>
                    </div>
                  )}
                  {b.selected_option && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarIcon className="h-4 w-4" />
                      <span>{b.selected_option}</span>
                    </div>
                  )}
                  {b.event?.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{b.event.location}</span>
                    </div>
                  )}
                  {b.event?.price && (
                    <div className="text-primary font-semibold">{b.event.price}</div>
                  )}
                </div>
                {b.notes && (
                  <div className="border-t border-border pt-2 mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Uwagi od klienta:</p>
                    <p className="text-sm italic">„{b.notes}"</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć rezerwację?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta akcja jest nieodwracalna. Rezerwacja zostanie trwale usunięta z bazy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Usuń</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EventBookingsManager;
