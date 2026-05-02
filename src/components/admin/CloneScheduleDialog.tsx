import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ClassSchedule } from "./ScheduleManager";

interface CloneScheduleDialogProps {
  schedules: ClassSchedule[];
  onCloned: () => void;
}

// Polish weekday name -> JS getDay() index (Sunday = 0)
const DAY_TO_INDEX: Record<string, number> = {
  Niedziela: 0,
  Poniedziałek: 1,
  Wtorek: 2,
  Środa: 3,
  Czwartek: 4,
  Piątek: 5,
  Sobota: 6,
};

const MONTH_NAMES_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

interface PreparedRow {
  // Insert payload
  payload: Omit<ClassSchedule, "id"> & { date: string };
  // Conflict info (matching existing row)
  conflict: ClassSchedule | null;
  // Source row (for display)
  sourceName: string;
  sourceDay: string;
  sourceTime: string;
  sourceLocation: string;
}

// Build current and next 12 month options
const buildMonthOptions = () => {
  const now = new Date();
  const opts: { value: string; label: string }[] = [];
  for (let offset = -1; offset <= 12; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    opts.push({ value, label: `${MONTH_NAMES_PL[d.getMonth()]} ${d.getFullYear()}` });
  }
  return opts;
};

const formatYmd = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const CloneScheduleDialog = ({ schedules, onCloned }: CloneScheduleDialogProps) => {
  const monthOptions = useMemo(buildMonthOptions, []);
  const now = new Date();
  const defaultSource = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const defaultTarget = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;

  const [open, setOpen] = useState(false);
  const [sourceMonth, setSourceMonth] = useState(defaultSource);
  const [targetMonth, setTargetMonth] = useState(defaultTarget);
  const [prepared, setPrepared] = useState<PreparedRow[] | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const { toast } = useToast();

  const reset = () => {
    setPrepared(null);
  };

  const prepare = async () => {
    setIsPreparing(true);
    setPrepared(null);
    try {
      const [sy, sm] = sourceMonth.split("-").map(Number);
      const [ty, tm] = targetMonth.split("-").map(Number);

      // 1. All recurring templates (date IS NULL) -> materialize for every matching weekday in target month
      const recurring = schedules.filter((s) => !s.date);

      // 2. One-off entries with a date in source month
      const sourceMonthStart = new Date(sy, sm - 1, 1);
      const sourceMonthEnd = new Date(sy, sm, 0);
      const oneOffs = schedules.filter((s) => {
        if (!s.date) return false;
        const d = new Date(s.date);
        return d >= sourceMonthStart && d <= sourceMonthEnd;
      });

      // Target month dates
      const daysInTarget = new Date(ty, tm, 0).getDate();
      const targetDates: Date[] = [];
      for (let day = 1; day <= daysInTarget; day++) {
        targetDates.push(new Date(ty, tm - 1, day));
      }

      // Fetch existing rows in target month for conflict detection
      const targetStart = formatYmd(new Date(ty, tm - 1, 1));
      const targetEnd = formatYmd(new Date(ty, tm, 0));
      const { data: existingRows, error: existingErr } = await supabase
        .from("class_schedules")
        .select("*")
        .gte("date", targetStart)
        .lte("date", targetEnd);
      if (existingErr) throw existingErr;
      const existing = (existingRows || []) as ClassSchedule[];

      const findConflict = (location: string, date: string, time: string) =>
        existing.find(
          (e) => e.location === location && e.date === date && e.time === time,
        ) || null;

      const rows: PreparedRow[] = [];

      // Materialize recurring
      for (const tpl of recurring) {
        const weekday = DAY_TO_INDEX[tpl.day];
        if (weekday === undefined) continue;
        for (const d of targetDates) {
          if (d.getDay() !== weekday) continue;
          const dateStr = formatYmd(d);
          rows.push({
            payload: {
              name: tpl.name,
              location: tpl.location,
              day: tpl.day,
              time: tpl.time,
              age: tpl.age,
              level: tpl.level,
              spots: tpl.spots,
              max_spots: tpl.max_spots,
              available_spots: tpl.max_spots, // reset capacity
              date: dateStr,
            },
            conflict: findConflict(tpl.location, dateStr, tpl.time),
            sourceName: tpl.name,
            sourceDay: tpl.day,
            sourceTime: tpl.time,
            sourceLocation: tpl.location,
          });
        }
      }

      // Copy one-offs (shift to same day-of-month-offset in target month)
      for (const o of oneOffs) {
        const orig = new Date(o.date as string);
        // Map day number to target month, clamp to last day if month shorter
        const targetDay = Math.min(orig.getDate(), daysInTarget);
        const newDate = new Date(ty, tm - 1, targetDay);
        const dateStr = formatYmd(newDate);
        rows.push({
          payload: {
            name: o.name,
            location: o.location,
            day: o.day,
            time: o.time,
            age: o.age,
            level: o.level,
            spots: o.spots,
            max_spots: o.max_spots,
            available_spots: o.max_spots,
            date: dateStr,
          },
          conflict: findConflict(o.location, dateStr, o.time),
          sourceName: o.name,
          sourceDay: o.day,
          sourceTime: o.time,
          sourceLocation: o.location,
        });
      }

      // Sort: by date, then time
      rows.sort((a, b) =>
        a.payload.date.localeCompare(b.payload.date) ||
        a.payload.time.localeCompare(b.payload.time),
      );

      setPrepared(rows);
    } catch (err: any) {
      toast({
        title: "Błąd",
        description: err.message || "Nie udało się przygotować klonowania.",
        variant: "destructive",
      });
    } finally {
      setIsPreparing(false);
    }
  };

  const conflicts = prepared?.filter((r) => r.conflict) || [];
  const toInsert = prepared?.filter((r) => !r.conflict) || [];

  const executeClone = async () => {
    if (!prepared) return;
    setIsCloning(true);
    try {
      if (toInsert.length === 0) {
        toast({
          title: "Brak nowych zajęć",
          description: "Wszystkie pozycje w miesiącu docelowym już istnieją.",
        });
        setOpen(false);
        return;
      }
      const { error } = await supabase
        .from("class_schedules")
        .insert(toInsert.map((r) => r.payload));
      if (error) throw error;
      toast({
        title: "Grafik sklonowany",
        description: `Dodano ${toInsert.length} zajęć${conflicts.length ? ` (pominięto ${conflicts.length} konfliktów)` : ""}.`,
      });
      onCloned();
      setOpen(false);
      reset();
    } catch (err: any) {
      toast({
        title: "Błąd klonowania",
        description: err.message || "Nie udało się dodać zajęć.",
        variant: "destructive",
      });
    } finally {
      setIsCloning(false);
    }
  };

  const targetLabel = monthOptions.find((m) => m.value === targetMonth)?.label;
  const sourceLabel = monthOptions.find((m) => m.value === sourceMonth)?.label;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Copy className="h-4 w-4 mr-2" />
          Klonuj grafik miesięczny
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Klonuj grafik z jednego miesiąca na drugi</DialogTitle>
          <DialogDescription>
            Materializuje cykliczne zajęcia (te bez przypisanej daty) jako konkretne wpisy
            na każdy pasujący dzień tygodnia w wybranym miesiącu, oraz kopiuje istniejące
            zajęcia jednorazowe z miesiąca źródłowego.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Miesiąc źródłowy (jednorazowe wpisy)</Label>
            <Select value={sourceMonth} onValueChange={(v) => { setSourceMonth(v); reset(); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {monthOptions.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Miesiąc docelowy</Label>
            <Select value={targetMonth} onValueChange={(v) => { setTargetMonth(v); reset(); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {monthOptions.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!prepared && (
          <Alert>
            <AlertTitle>Jak to działa?</AlertTitle>
            <AlertDescription className="text-sm">
              Z miesiąca <strong>{sourceLabel}</strong> skopiowane zostaną wszystkie zajęcia jednorazowe
              (z konkretną datą). Dodatkowo wszystkie cykliczne zajęcia tygodniowe zostaną
              wygenerowane jako konkretne wpisy na każdy pasujący dzień
              w <strong>{targetLabel}</strong>. Po wygenerowaniu zobaczysz listę kolizji z istniejącymi
              wpisami i będziesz mógł zatwierdzić dodanie tylko brakujących pozycji.
            </AlertDescription>
          </Alert>
        )}

        {prepared && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="default" className="text-sm">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Do dodania: {toInsert.length}
              </Badge>
              {conflicts.length > 0 && (
                <Badge variant="destructive" className="text-sm">
                  <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                  Konflikty (pominięte): {conflicts.length}
                </Badge>
              )}
              <Badge variant="secondary" className="text-sm">
                Razem: {prepared.length}
              </Badge>
            </div>

            {conflicts.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Wykryto konflikty</AlertTitle>
                <AlertDescription>
                  Poniższe zajęcia już istnieją w miesiącu docelowym (ta sama lokalizacja, data i godzina)
                  i zostaną pominięte:
                </AlertDescription>
              </Alert>
            )}

            <ScrollArea className="h-[300px] border rounded-md p-3">
              <div className="space-y-1">
                {prepared.map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 text-sm py-1.5 px-2 rounded ${
                      r.conflict ? "bg-destructive/10 text-destructive line-through" : "hover:bg-muted"
                    }`}
                  >
                    {r.conflict ? (
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                    )}
                    <span className="font-mono text-xs w-24">{r.payload.date}</span>
                    <span className="font-mono text-xs w-24">{r.payload.time}</span>
                    <span className="text-xs uppercase w-20 text-muted-foreground">
                      {r.payload.location}
                    </span>
                    <span className="flex-1 truncate">{r.payload.name}</span>
                  </div>
                ))}
                {prepared.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Brak zajęć do skopiowania (źródłowy miesiąc nie ma jednorazowych wpisów,
                    a w bazie nie ma cyklicznych szablonów).
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Anuluj
          </Button>
          {!prepared ? (
            <Button onClick={prepare} disabled={isPreparing || sourceMonth === targetMonth}>
              {isPreparing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Podgląd zmian
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={reset}>Zmień ustawienia</Button>
              <Button onClick={executeClone} disabled={isCloning || toInsert.length === 0}>
                {isCloning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Dodaj {toInsert.length} zajęć
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CloneScheduleDialog;
