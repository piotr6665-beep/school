import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';

interface AboutSection {
  id: string;
  section_key: string;
  title: string;
  description: string;
  display_order: number;
}

const sectionLabels: Record<string, { pl: string; en: string }> = {
  header: { pl: 'Nagłówek strony', en: 'Page header' },
  mission: { pl: 'Misja', en: 'Mission' },
  approach: { pl: 'Podejście', en: 'Approach' },
  values: { pl: 'Wartości', en: 'Values' },
  why_locations: { pl: 'Dlaczego my - Lokalizacje', en: 'Why us - Locations' },
  why_certified: { pl: 'Dlaczego my - Certyfikacja', en: 'Why us - Certification' },
  why_offer: { pl: 'Dlaczego my - Oferta', en: 'Why us - Offer' },
  why_atmosphere: { pl: 'Dlaczego my - Atmosfera', en: 'Why us - Atmosphere' },
};

export default function AboutManager() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [sections, setSections] = useState<AboutSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingSection, setEditingSection] = useState<AboutSection | null>(null);

  const fetchSections = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('about_content')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error('Error fetching about sections:', error);
      toast({
        title: t('common.error'),
        description: t('admin.about.fetchError'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const handleEdit = (section: AboutSection) => {
    setEditingSection({ ...section });
  };

  const handleSave = async () => {
    if (!editingSection) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('about_content')
        .update({
          title: editingSection.title,
          description: editingSection.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingSection.id);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('admin.about.saveSuccess'),
      });

      setEditingSection(null);
      fetchSections();
    } catch (error) {
      console.error('Error saving about section:', error);
      toast({
        title: t('common.error'),
        description: t('admin.about.saveError'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getSectionLabel = (sectionKey: string) => {
    const lang = i18n.language as 'pl' | 'en';
    return sectionLabels[sectionKey]?.[lang] || sectionKey;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t('admin.about.title')}</h2>

      <div className="grid gap-4">
        {sections.map((section) => (
          <Card key={section.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {getSectionLabel(section.section_key)}
                  </p>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleEdit(section)}>
                  {t('common.edit')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm line-clamp-3">
                {section.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      {editingSection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{t('admin.about.editTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t('admin.about.sectionLabel')}
                </label>
                <p className="text-sm text-muted-foreground">
                  {getSectionLabel(editingSection.section_key)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t('admin.about.titleLabel')}
                </label>
                <Input
                  value={editingSection.title}
                  onChange={(e) =>
                    setEditingSection({ ...editingSection, title: e.target.value })
                  }
                  placeholder={t('admin.about.titlePlaceholder')}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t('admin.about.descriptionLabel')}
                </label>
                <Textarea
                  value={editingSection.description}
                  onChange={(e) =>
                    setEditingSection({ ...editingSection, description: e.target.value })
                  }
                  placeholder={t('admin.about.descriptionPlaceholder')}
                  rows={6}
                />
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-6 border-t">
              <Button variant="outline" onClick={() => setEditingSection(null)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {t('common.save')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
