import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Tag,
  Users,
  CircleDollarSign,
  ImageIcon,
  ListChecks,
  FileText,
  Phone,
  Search,
  ArrowUp,
  ArrowDown,
  Upload,
  X,
} from "lucide-react";

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

const CATEGORY_OPTIONS = [
  { value: "urodziny", label: "🎂 Urodziny" },
  { value: "kolonie", label: "⛺ Kolonie / półkolonie" },
  { value: "warsztaty", label: "🎓 Warsztaty" },
  { value: "pokazy", label: "🎭 Pokazy" },
  { value: "event", label: "✨ Inne wydarzenie" },
];

const emptyForm = {
  title: "",
  short_description: "",
  description: "",
  category: "urodziny",
  price: "",
  duration: "",
  location: "",
  age_range: "",
  max_participants: "",
  available_times: "",
  features: "",
  image_url: "",
  contact_info: "",
  display_order: "0",
  active: true,
};

const EventsManager = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [activeTab, setActiveTab] = useState("basic");
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Nieprawidłowy plik",
        description: "Wybierz plik obrazu (JPG, PNG, WEBP).",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Plik za duży",
        description: "Maksymalny rozmiar zdjęcia to 5 MB.",
        variant: "destructive",
      });
      return;
    }
    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("events")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("events").getPublicUrl(fileName);
      setForm((f) => ({ ...f, image_url: data.publicUrl }));
      toast({ title: "Zdjęcie przesłane", description: "Możesz teraz zapisać wydarzenie." });
    } catch (err: any) {
      toast({
        title: "Błąd przesyłania",
        description: err.message || "Nie udało się przesłać zdjęcia.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };


  const fetchEvents = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Błąd", description: "Nie udało się pobrać wydarzeń", variant: "destructive" });
    } else {
      setEvents(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setActiveTab("basic");
    setDialogOpen(true);
  };

  const openEdit = (e: EventItem) => {
    setEditingId(e.id);
    setForm({
      title: e.title,
      short_description: e.short_description,
      description: e.description,
      category: e.category,
      price: e.price || "",
      duration: e.duration || "",
      location: e.location || "",
      age_range: e.age_range || "",
      max_participants: e.max_participants?.toString() || "",
      available_times: (e.available_times || []).join("\n"),
      features: (e.features || []).join("\n"),
      image_url: e.image_url || "",
      contact_info: e.contact_info || "",
      display_order: e.display_order?.toString() || "0",
      active: e.active,
    });
    setActiveTab("basic");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.short_description.trim() || !form.description.trim()) {
      toast({
        title: "Brak wymaganych pól",
        description: "Wypełnij tytuł, krótki opis i pełny opis (zakładka „Podstawowe”).",
        variant: "destructive",
      });
      setActiveTab("basic");
      return;
    }
    setIsSaving(true);
    const payload = {
      title: form.title.trim(),
      short_description: form.short_description.trim(),
      description: form.description.trim(),
      category: form.category.trim() || "event",
      price: form.price.trim() || null,
      duration: form.duration.trim() || null,
      location: form.location.trim() || null,
      age_range: form.age_range.trim() || null,
      max_participants: form.max_participants ? parseInt(form.max_participants, 10) : null,
      available_times: form.available_times.split("\n").map((s) => s.trim()).filter(Boolean),
      features: form.features.split("\n").map((s) => s.trim()).filter(Boolean),
      image_url: form.image_url.trim() || null,
      contact_info: form.contact_info.trim() || null,
      display_order: parseInt(form.display_order, 10) || 0,
      active: form.active,
    };

    const { error } = editingId
      ? await supabase.from("events").update(payload).eq("id", editingId)
      : await supabase.from("events").insert(payload);

    setIsSaving(false);
    if (error) {
      toast({ title: "Błąd zapisu", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: editingId ? "Zaktualizowano" : "Dodano",
      description: editingId ? "Zmiany zostały zapisane." : "Nowe wydarzenie zostało dodane.",
    });
    setDialogOpen(false);
    fetchEvents();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("events").delete().eq("id", deleteId);
    setDeleteId(null);
    if (error) {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Usunięto", description: "Wydarzenie zostało usunięte." });
    fetchEvents();
  };

  const toggleActive = async (e: EventItem) => {
    const { error } = await supabase.from("events").update({ active: !e.active }).eq("id", e.id);
    if (error) {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: e.active ? "Ukryto" : "Opublikowano",
      description: e.active ? "Wydarzenie nie jest już widoczne publicznie." : "Wydarzenie jest teraz widoczne na stronie.",
    });
    fetchEvents();
  };

  const moveOrder = async (e: EventItem, dir: -1 | 1) => {
    const newOrder = (e.display_order ?? 0) + dir;
    const { error } = await supabase.from("events").update({ display_order: newOrder }).eq("id", e.id);
    if (error) {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
      return;
    }
    fetchEvents();
  };

  const filtered = events.filter(
    (e) =>
      !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase())
  );

  const categoryLabel = (val: string) =>
    CATEGORY_OPTIONS.find((c) => c.value === val)?.label || val;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Wydarzenia</h2>
          <p className="text-sm text-muted-foreground">
            Zarządzaj ofertami specjalnymi: urodziny, kolonie, warsztaty, pokazy
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj wydarzeń..."
              value={search}
              onChange={(ev) => setSearch(ev.target.value)}
              className="pl-9"
            />
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="h-4 w-4 mr-2" />
                Dodaj
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {editingId ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                  {editingId ? "Edytuj wydarzenie" : "Nowe wydarzenie"}
                </DialogTitle>
                <DialogDescription>
                  Wypełnij sekcje poniżej. Pola oznaczone <span className="text-destructive">*</span> są wymagane.
                </DialogDescription>
              </DialogHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">
                    <FileText className="h-4 w-4 mr-1.5" />
                    Podstawowe
                  </TabsTrigger>
                  <TabsTrigger value="details">
                    <CalendarIcon className="h-4 w-4 mr-1.5" />
                    Szczegóły
                  </TabsTrigger>
                  <TabsTrigger value="program">
                    <ListChecks className="h-4 w-4 mr-1.5" />
                    Program
                  </TabsTrigger>
                  <TabsTrigger value="media">
                    <ImageIcon className="h-4 w-4 mr-1.5" />
                    Media
                  </TabsTrigger>
                </TabsList>

                {/* PODSTAWOWE */}
                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="grid sm:grid-cols-[1fr_220px] gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="title">
                        Tytuł <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="title"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="np. Akrobatyczne urodziny"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Kategoria</Label>
                      <Select
                        value={form.category}
                        onValueChange={(v) => setForm({ ...form, category: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="short">
                      Krótki opis <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="short"
                      rows={2}
                      value={form.short_description}
                      onChange={(e) => setForm({ ...form, short_description: e.target.value })}
                      placeholder="Jedno zdanie zachęcające — pojawi się jako podtytuł karty"
                    />
                    <p className="text-xs text-muted-foreground">
                      {form.short_description.length} znaków
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="description">
                      Pełny opis <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="description"
                      rows={8}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Pełna treść ogłoszenia. Możesz używać kilku akapitów — zachowane będą nowe linie."
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                    <div>
                      <Label htmlFor="active" className="text-base">
                        {form.active ? "🟢 Opublikowane" : "⚪ Ukryte (szkic)"}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {form.active
                          ? "Wydarzenie widoczne dla wszystkich na stronie /wydarzenia"
                          : "Tylko Ty widzisz to wydarzenie w panelu"}
                      </p>
                    </div>
                    <Switch
                      id="active"
                      checked={form.active}
                      onCheckedChange={(v) => setForm({ ...form, active: v })}
                    />
                  </div>
                </TabsContent>

                {/* SZCZEGÓŁY */}
                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5">
                        <CircleDollarSign className="h-4 w-4 text-primary" />
                        Cena
                      </Label>
                      <Input
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                        placeholder="np. 700 zł"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-primary" />
                        Czas trwania
                      </Label>
                      <Input
                        value={form.duration}
                        onChange={(e) => setForm({ ...form, duration: e.target.value })}
                        placeholder="np. 2 godziny"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-primary" />
                        Lokalizacja
                      </Label>
                      <Input
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                        placeholder="np. ul. Kazimierza Funka 1 (tylko soboty)"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5">
                        <Tag className="h-4 w-4 text-primary" />
                        Grupa wiekowa
                      </Label>
                      <Input
                        value={form.age_range}
                        onChange={(e) => setForm({ ...form, age_range: e.target.value })}
                        placeholder="np. dzieci 6–12"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-primary" />
                        Maks. liczba uczestników
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        value={form.max_participants}
                        onChange={(e) => setForm({ ...form, max_participants: e.target.value })}
                        placeholder="np. 12"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <Phone className="h-4 w-4 text-primary" />
                      Informacja o zapisach
                    </Label>
                    <Input
                      value={form.contact_info}
                      onChange={(e) => setForm({ ...form, contact_info: e.target.value })}
                      placeholder="np. Zapisy w wiadomości prywatnej"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Kolejność wyświetlania</Label>
                    <Input
                      type="number"
                      value={form.display_order}
                      onChange={(e) => setForm({ ...form, display_order: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Niższe liczby pojawiają się wcześniej (0 = na początku listy)
                    </p>
                  </div>
                </TabsContent>

                {/* PROGRAM */}
                <TabsContent value="program" className="space-y-4 mt-4">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-primary" />
                      Dostępne godziny
                    </Label>
                    <Textarea
                      rows={4}
                      value={form.available_times}
                      onChange={(e) => setForm({ ...form, available_times: e.target.value })}
                      placeholder={"14:00–16:00\n16:30–18:30"}
                    />
                    <p className="text-xs text-muted-foreground">Każda godzina w nowej linii</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <ListChecks className="h-4 w-4 text-primary" />
                      Co zawiera oferta
                    </Label>
                    <Textarea
                      rows={8}
                      value={form.features}
                      onChange={(e) => setForm({ ...form, features: e.target.value })}
                      placeholder={"ok. 1,5 h zajęć na szarfach lub kołach\nGry i zabawy integracyjne\nDrobny prezent dla solenizanta\nWystrój sali w stylu hawajskim"}
                    />
                    <p className="text-xs text-muted-foreground">
                      Każdy punkt programu w nowej linii — pojawi się jako lista z ✓
                    </p>
                  </div>
                </TabsContent>

                {/* MEDIA */}
                <TabsContent value="media" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Upload className="h-4 w-4 text-primary" />
                      Prześlij zdjęcie z komputera
                    </Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        disabled={isUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file);
                          e.target.value = "";
                        }}
                        className="cursor-pointer file:cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground file:text-sm hover:file:bg-primary/90"
                      />
                      {isUploading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Przesyłanie...
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Maks. 5 MB. Zalecane proporcje 16:9 (np. 1280×720 px).
                    </p>
                  </div>

                  <div className="relative flex items-center gap-3">
                    <div className="flex-1 border-t border-border" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">lub</span>
                    <div className="flex-1 border-t border-border" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      Wklej URL zdjęcia
                    </Label>
                    <Input
                      value={form.image_url}
                      onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>

                  {form.image_url ? (
                    <div
                      className={`rounded-lg border-2 overflow-hidden bg-muted relative group transition-colors ${
                        isDragging ? "border-primary border-dashed bg-primary/10" : "border-transparent"
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <img
                        src={form.image_url}
                        alt="Podgląd"
                        className="w-full aspect-video object-cover pointer-events-none"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setForm({ ...form, image_url: "" })}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Usuń zdjęcie
                      </Button>
                      {isDragging && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/80 pointer-events-none">
                          <p className="text-sm font-medium text-primary">Upuść, aby zastąpić zdjęcie</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`rounded-lg border-2 border-dashed aspect-video flex flex-col items-center justify-center text-muted-foreground transition-colors cursor-pointer ${
                        isDragging
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/30 hover:bg-muted/50"
                      }`}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-10 w-10 mb-2 animate-spin" />
                          <p className="text-sm">Przesyłanie...</p>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="h-12 w-12 mb-2 opacity-40" />
                          <p className="text-sm font-medium">
                            {isDragging ? "Upuść zdjęcie tutaj" : "Przeciągnij i upuść zdjęcie"}
                          </p>
                          <p className="text-xs mt-1 opacity-70">lub użyj pola powyżej / wklej URL</p>
                        </>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <DialogFooter className="gap-2 mt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Anuluj
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingId ? "Zapisz zmiany" : "Dodaj wydarzenie"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Wszystkie</p>
            <p className="text-2xl font-bold">{events.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Opublikowane</p>
            <p className="text-2xl font-bold text-primary">
              {events.filter((e) => e.active).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Ukryte</p>
            <p className="text-2xl font-bold text-muted-foreground">
              {events.filter((e) => !e.active).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">
              {search ? "Brak wydarzeń pasujących do wyszukiwania" : "Brak wydarzeń. Dodaj pierwsze!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((e) => (
            <Card key={e.id} className={!e.active ? "opacity-60" : ""}>
              <div className="flex flex-col sm:flex-row">
                {e.image_url && (
                  <div className="sm:w-48 sm:flex-shrink-0 aspect-video sm:aspect-square bg-muted overflow-hidden relative">
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-cover bg-center scale-110 blur-2xl opacity-50"
                      style={{ backgroundImage: `url(${e.image_url})` }}
                    />
                    <img
                      src={e.image_url}
                      alt={e.title}
                      className="relative w-full h-full object-contain"
                      onError={(ev) => {
                        (ev.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
                <div className="flex-1">
                  <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge variant="outline">{categoryLabel(e.category)}</Badge>
                        {e.active ? (
                          <Badge variant="default">Opublikowane</Badge>
                        ) : (
                          <Badge variant="secondary">Ukryte</Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg leading-tight">{e.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {e.short_description}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-1">
                      <div className="flex flex-col">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => moveOrder(e, -1)}
                          title="W górę"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => moveOrder(e, 1)}
                          title="W dół"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex sm:flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleActive(e)}
                          title={e.active ? "Ukryj" : "Opublikuj"}
                        >
                          {e.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(e)} title="Edytuj">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(e.id)}
                          title="Usuń"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-4">
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                      {e.price && (
                        <span className="flex items-center gap-1.5 font-semibold text-primary">
                          <CircleDollarSign className="h-4 w-4" />
                          {e.price}
                        </span>
                      )}
                      {e.duration && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          {e.duration}
                        </span>
                      )}
                      {e.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" />
                          {e.location}
                        </span>
                      )}
                      {e.max_participants && (
                        <span className="flex items-center gap-1.5">
                          <Users className="h-4 w-4" />
                          max {e.max_participants}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć wydarzenie?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta akcja jest nieodwracalna. Wydarzenie zostanie trwale usunięte.
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

export default EventsManager;
