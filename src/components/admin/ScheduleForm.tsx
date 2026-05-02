import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Loader2 } from "lucide-react";
import { ClassSchedule } from "./ScheduleManager";
import { format } from "date-fns";
import { pl, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface ScheduleFormProps {
  schedule: ClassSchedule | null;
  onClose: () => void;
}

const ScheduleForm = ({ schedule, onClose }: ScheduleFormProps) => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'pl' ? pl : enUS;
  
  const days = [
    { key: 'monday', pl: 'Poniedziałek' },
    { key: 'tuesday', pl: 'Wtorek' },
    { key: 'wednesday', pl: 'Środa' },
    { key: 'thursday', pl: 'Czwartek' },
    { key: 'friday', pl: 'Piątek' },
    { key: 'saturday', pl: 'Sobota' },
    { key: 'sunday', pl: 'Niedziela' }
  ];

  const locations = [
    { value: "funka", labelKey: "admin.schedule.funkaLocation" },
    { value: "baltycka", labelKey: "admin.schedule.baltyckaLocation" }
  ];

  const [formData, setFormData] = useState({
    location: schedule?.location || "funka",
    day: schedule?.day || "",
    time: schedule?.time || "",
    name: schedule?.name || "",
    age: schedule?.age || "",
    level: schedule?.level || "",
    spots: schedule?.spots || "",
    max_spots: schedule?.max_spots || 10,
    available_spots: schedule?.available_spots || 10,
    badge: schedule?.badge ?? "none",
  });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    schedule?.date ? new Date(schedule.date) : undefined
  );
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const dataToSave = {
        ...formData,
        badge: formData.badge === "none" ? null : formData.badge,
        date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
      };

      if (schedule) {
        const { error } = await supabase
          .from('class_schedules')
          .update(dataToSave)
          .eq('id', schedule.id);

        if (error) throw error;

        toast({
          title: t('admin.schedule.updated'),
          description: t('admin.schedule.updatedDesc'),
        });
      } else {
        const { error } = await supabase
          .from('class_schedules')
          .insert([dataToSave]);

        if (error) throw error;

        toast({
          title: t('admin.schedule.added'),
          description: t('admin.schedule.addedDesc'),
        });
      }

      onClose();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast({
        title: t('admin.schedule.error'),
        description: t('admin.schedule.errorSave'),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="location">{t('admin.schedule.location')}</Label>
          <Select
            value={formData.location}
            onValueChange={(value) => setFormData({ ...formData, location: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.value} value={loc.value}>
                  {t(loc.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="day">{t('admin.schedule.dayOfWeek')}</Label>
          <Select
            value={formData.day}
            onValueChange={(value) => setFormData({ ...formData, day: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('admin.schedule.selectDay')} />
            </SelectTrigger>
            <SelectContent>
              {days.map((day) => (
                <SelectItem key={day.key} value={day.pl}>
                  {t(`admin.schedule.days.${day.key}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="date">{t('admin.schedule.specificDate')}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP", { locale: dateLocale }) : t('admin.schedule.selectDate')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground mt-1">
            {t('admin.schedule.dateHint')}
          </p>
        </div>

        <div>
          <Label htmlFor="time">{t('admin.schedule.time')}</Label>
          <Input
            id="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            placeholder={t('admin.schedule.timePlaceholder')}
            required
          />
        </div>

        <div>
          <Label htmlFor="name">{t('admin.schedule.className')}</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={t('admin.schedule.classNamePlaceholder')}
            required
          />
        </div>

        <div>
          <Label htmlFor="age">{t('admin.schedule.ageGroup')}</Label>
          <Input
            id="age"
            value={formData.age}
            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
            placeholder={t('admin.schedule.ageGroupPlaceholder')}
            required
          />
        </div>

        <div>
          <Label htmlFor="level">{t('admin.schedule.level')}</Label>
          <Input
            id="level"
            value={formData.level}
            onChange={(e) => setFormData({ ...formData, level: e.target.value })}
            placeholder={t('admin.schedule.levelPlaceholder')}
            required
          />
        </div>

        <div>
          <Label htmlFor="badge">{t('admin.schedule.badge')}</Label>
          <Select
            value={formData.badge}
            onValueChange={(value) => setFormData({ ...formData, badge: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('admin.schedule.badgeNone')}</SelectItem>
              <SelectItem value="new">{t('admin.schedule.badgeNew')}</SelectItem>
              <SelectItem value="recommended">{t('admin.schedule.badgeRecommended')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="spots">{t('admin.schedule.spotsDescription')}</Label>
          <Input
            id="spots"
            value={formData.spots}
            onChange={(e) => setFormData({ ...formData, spots: e.target.value })}
            placeholder={t('admin.schedule.spotsDescriptionPlaceholder')}
            required
          />
        </div>

        <div>
          <Label htmlFor="max_spots">{t('admin.schedule.maxSpots')}</Label>
          <Input
            id="max_spots"
            type="number"
            min="1"
            value={formData.max_spots}
            onChange={(e) => setFormData({ ...formData, max_spots: parseInt(e.target.value) })}
            required
          />
        </div>

        <div>
          <Label htmlFor="available_spots">{t('admin.schedule.availableSpots')}</Label>
          <Input
            id="available_spots"
            type="number"
            min="0"
            max={formData.max_spots}
            value={formData.available_spots}
            onChange={(e) => setFormData({ ...formData, available_spots: parseInt(e.target.value) })}
            required
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onClose}>
          {t('admin.schedule.cancel')}
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('admin.schedule.saving')}
            </>
          ) : (
            t('admin.schedule.save')
          )}
        </Button>
      </div>
    </form>
  );
};

export default ScheduleForm;
