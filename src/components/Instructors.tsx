import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Loader2, Users } from "lucide-react";

interface Instructor {
  id: string;
  name: string;
  title: string;
  bio: string;
  specializations: string[];
  image_url: string | null;
}

const Instructors = () => {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    fetchInstructors();
  }, []);

  const fetchInstructors = async () => {
    try {
      const { data, error } = await supabase
        .from('instructors')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setInstructors(data || []);
    } catch (error) {
      console.error('Error fetching instructors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (instructors.length === 0) return null;

  return (
    <section className="mt-16">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-primary mb-4 flex items-center justify-center gap-2">
          <Users className="h-8 w-8" />
          {t('instructors.title')}
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {t('instructors.subtitle')}
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {instructors.map((instructor) => (
          <Card
            key={instructor.id}
            className="hover:shadow-elegant hover:scale-[1.04] hover:z-10 hover:-translate-y-1 transition-all duration-300 overflow-hidden group relative"
          >
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 mb-4 ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all">
                  <AvatarImage src={instructor.image_url || undefined} alt={instructor.name} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {getInitials(instructor.name)}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-semibold mb-1">{instructor.name}</h3>
                <p className="text-sm text-primary font-medium mb-3">{instructor.title}</p>
                <p className="text-muted-foreground text-sm mb-4 line-clamp-3 group-hover:line-clamp-none transition-all">
                  {instructor.bio}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {instructor.specializations.map((spec, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {spec}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default Instructors;
