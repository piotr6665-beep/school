import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ScheduleList from "./ScheduleList";
import ScheduleForm from "./ScheduleForm";
import CalendarExport from "./CalendarExport";
import CloneScheduleDialog from "./CloneScheduleDialog";
import { useTranslation } from "react-i18next";

export interface ClassSchedule {
  id: string;
  location: string;
  day: string;
  time: string;
  name: string;
  age: string;
  level: string;
  spots: string;
  max_spots: number;
  available_spots: number;
  date?: string | null;
  badge?: string | null;
}

const ScheduleManager = () => {
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('class_schedules')
        .select('*')
        .order('location', { ascending: true })
        .order('day', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast({
        title: t('admin.schedule.error'),
        description: t('admin.schedule.errorFetch'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.schedule.confirmDelete'))) return;

    try {
      const { error } = await supabase
        .from('class_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSchedules(schedules.filter(s => s.id !== id));
      toast({
        title: t('admin.schedule.deleted'),
        description: t('admin.schedule.deletedDesc'),
      });
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast({
        title: t('admin.schedule.error'),
        description: t('admin.schedule.errorDelete'),
        variant: "destructive",
      });
    }
  };

  const handleEdit = (schedule: ClassSchedule) => {
    console.log('Edit clicked for schedule:', schedule.id);
    setEditingSchedule(schedule);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    console.log('Add new clicked');
    setEditingSchedule(null);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingSchedule(null);
    fetchSchedules();
  };

  const funkaSchedules = schedules.filter(s => s.location === 'funka');
  const baltyckaSchedules = schedules.filter(s => s.location === 'baltycka');

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-2xl font-bold">{t('admin.schedule.title')}</h2>
        <div className="flex gap-2 flex-wrap">
          <CloneScheduleDialog schedules={schedules} onCloned={fetchSchedules} />
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            {t('admin.schedule.addClass')}
          </Button>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? t('admin.schedule.editClass') : t('admin.schedule.addNewClass')}
            </DialogTitle>
          </DialogHeader>
          <ScheduleForm
            schedule={editingSchedule}
            onClose={handleFormClose}
          />
        </DialogContent>
      </Dialog>

      <CalendarExport schedules={schedules} />

      <Tabs defaultValue="funka">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="funka">{t('admin.schedule.funkaLocation')}</TabsTrigger>
          <TabsTrigger value="baltycka">{t('admin.schedule.baltyckaLocation')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="funka">
          <ScheduleList
            schedules={funkaSchedules}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onRefresh={fetchSchedules}
          />
        </TabsContent>
        
        <TabsContent value="baltycka">
          <ScheduleList
            schedules={baltyckaSchedules}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onRefresh={fetchSchedules}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ScheduleManager;
