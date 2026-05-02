import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Users, ArrowRight, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const UpcomingClasses = () => {
  const { t } = useTranslation();

  const { data: classes = [] } = useQuery({
    queryKey: ['upcoming-classes-home'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('class_schedules')
        .select('*')
        .gt('available_spots', 0)
        .order('date', { ascending: true, nullsFirst: false })
        .order('time');

      if (error) throw error;

      // Prefer concrete dated classes that are still in the future.
      // Fall back to recurring templates only if we don't have enough.
      const dated = (data || []).filter(s => s.date && s.date >= today);
      const recurring = (data || []).filter(s => !s.date);

      // Deduplicate by class name + day to ensure visual variety.
      const seen = new Set<string>();
      const dedupe = (list: typeof dated) =>
        list.filter((cls) => {
          const key = `${cls.name.trim().toLowerCase()}|${cls.day}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

      const result = [...dedupe(dated), ...dedupe(recurring)];
      return result.slice(0, 4);
    },
  });

  const dayColors: Record<string, string> = {
    'Poniedziałek': 'from-rose-500 to-pink-500',
    'Wtorek': 'from-amber-500 to-orange-500',
    'Środa': 'from-emerald-500 to-teal-500',
    'Czwartek': 'from-blue-500 to-cyan-500',
    'Piątek': 'from-violet-500 to-purple-500',
    'Sobota': 'from-fuchsia-500 to-pink-500',
    'Niedziela': 'from-indigo-500 to-blue-500',
  };

  const getDayTranslation = (day: string) => {
    const dayMap: Record<string, string> = {
      'Poniedziałek': t('schedule.monday'),
      'Wtorek': t('schedule.tuesday'),
      'Środa': t('schedule.wednesday'),
      'Czwartek': t('schedule.thursday'),
      'Piątek': t('schedule.friday'),
      'Sobota': t('schedule.saturday'),
      'Niedziela': t('schedule.sunday'),
    };
    return dayMap[day] || day;
  };

  if (classes.length === 0) return null;

  return (
    <section className="py-24 relative overflow-hidden diagonal-section bg-secondary/30">
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-32 h-32 creative-blob rounded-full opacity-30" />
      <div className="absolute bottom-20 right-10 w-48 h-48 creative-blob rounded-full opacity-20" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <span className="text-primary font-medium tracking-wider uppercase text-sm">
            {t('home.upcomingClasses.label')}
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
            {t('home.upcomingClasses.title')}
          </h2>
          <p className="text-muted-foreground text-lg">
            {t('home.upcomingClasses.description')}
          </p>
        </div>

        {/* Classes Grid - Asymmetric */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {classes.map((cls, index) => (
            <Link 
              key={cls.id}
              to="/harmonogram"
              className={cn(
                index === 0 && "md:col-span-2 lg:col-span-2 lg:row-span-2"
              )}
            >
              <Card 
                className={cn(
                  "group relative overflow-hidden border-0 shadow-lg hover-lift animate-scale-in h-full cursor-pointer"
                )}
                style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'both' }}
              >
                {/* Gradient top bar */}
                <div className={cn(
                  "h-2 bg-gradient-to-r",
                  dayColors[cls.day] || 'from-primary to-accent'
                )} />
                
                <CardContent className={cn(
                  "p-6",
                  index === 0 && "lg:p-8"
                )}>
                  {/* Day badge */}
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "mb-4 bg-gradient-to-r text-white border-0",
                      dayColors[cls.day] || 'from-primary to-accent'
                    )}
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    {getDayTranslation(cls.day)}
                  </Badge>

                  {/* Class name */}
                  <h3 className={cn(
                    "font-bold mb-3 text-foreground group-hover:text-primary transition-colors",
                    index === 0 ? "text-2xl lg:text-3xl" : "text-xl"
                  )}>
                    {cls.name}
                  </h3>

                  {/* Details */}
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>{cls.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>{cls.location === 'funka' ? 'ul. Funka 11' : 'ul. Bałtycka 15'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span>{cls.available_spots} {t('schedule.spots')}</span>
                    </div>
                  </div>

                  {/* Age & Level */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Badge variant="outline" className="text-xs">
                      {cls.age}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {cls.level}
                    </Badge>
                  </div>

                  {/* Hover arrow */}
                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <ArrowRight className="h-4 w-4 text-primary-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link to="/harmonogram">
            <Button size="lg" className="group shadow-elegant">
              {t('home.upcomingClasses.viewAll')}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default UpcomingClasses;
