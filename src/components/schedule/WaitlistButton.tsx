import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, BellPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface Props {
  classScheduleId: string;
  classDate: string; // YYYY-MM-DD
  size?: "sm" | "default";
}

const WaitlistButton = ({ classScheduleId, classDate, size = "default" }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({ title: t('schedule.loginRequired'), description: t('schedule.loginRequiredDesc'), variant: 'destructive' });
      navigate('/auth');
      return;
    }
    setLoading(true);
    try {
      // Check existing
      const { data: existing } = await supabase
        .from('waitlist')
        .select('id')
        .eq('user_id', user.id)
        .eq('class_schedule_id', classScheduleId)
        .eq('waitlist_date', classDate)
        .maybeSingle();

      if (existing) {
        toast({ title: t('schedule.waitlistAlready') });
        return;
      }

      const { error } = await supabase.from('waitlist').insert({
        user_id: user.id,
        class_schedule_id: classScheduleId,
        waitlist_date: classDate,
      });
      if (error) throw error;
      toast({ title: t('schedule.waitlistAdded'), description: t('schedule.waitlistAddedDesc') });
    } catch (err: any) {
      console.error('waitlist error', err);
      toast({ title: t('schedule.waitlistError'), description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size={size} onClick={handleClick} disabled={loading} className="shrink-0">
      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BellPlus className="h-4 w-4 mr-2" />}
      {t('schedule.joinWaitlist')}
    </Button>
  );
};

export default WaitlistButton;
