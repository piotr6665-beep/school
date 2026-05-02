import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Edit, Trash2, Calendar, Users, Minus, Plus, Loader2 } from "lucide-react";
import { ClassSchedule } from "./ScheduleManager";
import { format } from "date-fns";
import { pl, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ScheduleListProps {
  schedules: ClassSchedule[];
  onEdit: (schedule: ClassSchedule) => void;
  onDelete: (id: string) => void;
  onRefresh?: () => void;
}

const ScheduleList = ({ schedules, onEdit, onDelete, onRefresh }: ScheduleListProps) => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'pl' ? pl : enUS;
  const { toast } = useToast();
  const [updatingSpots, setUpdatingSpots] = useState<string | null>(null);

  const handleUpdateSpots = async (scheduleId: string, newSpots: number, maxSpots: number) => {
    const clampedSpots = Math.max(0, Math.min(newSpots, maxSpots));
    setUpdatingSpots(scheduleId);
    
    try {
      const { error } = await supabase
        .from('class_schedules')
        .update({ available_spots: clampedSpots })
        .eq('id', scheduleId);

      if (error) throw error;

      toast({
        title: t('admin.schedule.spotsUpdated'),
        description: t('admin.schedule.spotsUpdatedDesc', { spots: clampedSpots }),
      });
      
      onRefresh?.();
    } catch (error) {
      console.error('Error updating spots:', error);
      toast({
        title: t('admin.schedule.error'),
        description: t('admin.schedule.errorUpdateSpots'),
        variant: "destructive",
      });
    } finally {
      setUpdatingSpots(null);
    }
  };

  const groupedByDay = schedules.reduce((acc, schedule) => {
    if (!acc[schedule.day]) {
      acc[schedule.day] = [];
    }
    acc[schedule.day].push(schedule);
    return acc;
  }, {} as Record<string, ClassSchedule[]>);

  return (
    <div className="space-y-6 mt-6">
      {Object.entries(groupedByDay).map(([day, daySchedules]) => (
        <Card key={day}>
          <CardContent className="pt-6">
            <h3 className="font-semibold text-lg mb-4 text-primary">{day}</h3>
            <div className="space-y-3">
              {daySchedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between p-4 bg-secondary/30 rounded-lg border border-border gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2 flex-wrap">
                      <span className="font-semibold">{schedule.time}</span>
                      <span className="font-medium">{schedule.name}</span>
                      {schedule.date && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(schedule.date), "d MMM yyyy", { locale: dateLocale })}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-x-4">
                      <span>{schedule.age}</span>
                      <span>•</span>
                      <span>{schedule.level}</span>
                    </div>
                  </div>

                  {/* Spots management */}
                  <div className="flex items-center gap-4">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="gap-2"
                        >
                          <Users className="h-4 w-4" />
                          <span className="font-semibold">
                            {schedule.available_spots}/{schedule.max_spots}
                          </span>
                          {t('admin.schedule.spotsLabel')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72" align="end">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <h4 className="font-medium">{t('admin.schedule.manageSpots')}</h4>
                            <p className="text-sm text-muted-foreground">
                              {t('admin.schedule.manageSpotsDesc')}
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-center gap-3">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleUpdateSpots(schedule.id, schedule.available_spots - 1, schedule.max_spots)}
                              disabled={schedule.available_spots <= 0 || updatingSpots === schedule.id}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                max={schedule.max_spots}
                                value={schedule.available_spots}
                                onChange={(e) => handleUpdateSpots(schedule.id, parseInt(e.target.value) || 0, schedule.max_spots)}
                                className="w-16 text-center"
                                disabled={updatingSpots === schedule.id}
                              />
                              <span className="text-muted-foreground">/ {schedule.max_spots}</span>
                            </div>
                            
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleUpdateSpots(schedule.id, schedule.available_spots + 1, schedule.max_spots)}
                              disabled={schedule.available_spots >= schedule.max_spots || updatingSpots === schedule.id}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>

                          {updatingSpots === schedule.id && (
                            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {t('admin.schedule.updating')}
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleUpdateSpots(schedule.id, 0, schedule.max_spots)}
                              disabled={updatingSpots === schedule.id}
                            >
                              {t('admin.schedule.blockAll')}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleUpdateSpots(schedule.id, schedule.max_spots, schedule.max_spots)}
                              disabled={updatingSpots === schedule.id}
                            >
                              {t('admin.schedule.resetSpots')}
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(schedule)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(schedule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ScheduleList;
