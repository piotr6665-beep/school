import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ScheduleFilters, AgeBucket, LevelBucket, TypeBucket } from "@/utils/scheduleFilters";

interface Props {
  filters: ScheduleFilters;
  onChange: (next: ScheduleFilters) => void;
}

const ScheduleFiltersBar = ({ filters, onChange }: Props) => {
  const { t } = useTranslation();
  const hasActive = filters.search || filters.age !== 'all' || filters.level !== 'all' || filters.type !== 'all';

  return (
    <div className="mb-6 flex flex-col lg:flex-row gap-3 lg:items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder={t('schedule.search')}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-3 gap-2 lg:w-auto lg:grid-cols-3">
        <Select value={filters.age} onValueChange={(v) => onChange({ ...filters, age: v as AgeBucket })}>
          <SelectTrigger className="min-w-[130px]"><SelectValue placeholder={t('schedule.filterAge')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('schedule.filterAge')}: {t('schedule.filterAll')}</SelectItem>
            <SelectItem value="kids">{t('schedule.ageKids')}</SelectItem>
            <SelectItem value="teens">{t('schedule.ageTeens')}</SelectItem>
            <SelectItem value="adults">{t('schedule.ageAdults')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.level} onValueChange={(v) => onChange({ ...filters, level: v as LevelBucket })}>
          <SelectTrigger className="min-w-[140px]"><SelectValue placeholder={t('schedule.filterLevel')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('schedule.filterLevel')}: {t('schedule.filterAll')}</SelectItem>
            <SelectItem value="Początkujący">Początkujący</SelectItem>
            <SelectItem value="Średniozaawansowany">Średniozaawansowany</SelectItem>
            <SelectItem value="Zaawansowany">Zaawansowany</SelectItem>
            <SelectItem value="Kontynuacja">Kontynuacja</SelectItem>
            <SelectItem value="Wszystkie poziomy">Wszystkie poziomy</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.type} onValueChange={(v) => onChange({ ...filters, type: v as TypeBucket })}>
          <SelectTrigger className="min-w-[130px]"><SelectValue placeholder={t('schedule.filterType')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('schedule.filterType')}: {t('schedule.filterAll')}</SelectItem>
            <SelectItem value="hoop">{t('schedule.typeHoop')}</SelectItem>
            <SelectItem value="silk">{t('schedule.typeSilk')}</SelectItem>
            <SelectItem value="acro">{t('schedule.typeAcro')}</SelectItem>
            <SelectItem value="stretch">{t('schedule.typeStretch')}</SelectItem>
            <SelectItem value="handstand">{t('schedule.typeHandstand')}</SelectItem>
            <SelectItem value="other">{t('schedule.typeOther')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasActive && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({ search: '', age: 'all', level: 'all', type: 'all' })}
        >
          <X className="h-4 w-4 mr-1" /> {t('common.cancel')}
        </Button>
      )}
    </div>
  );
};

export default ScheduleFiltersBar;
