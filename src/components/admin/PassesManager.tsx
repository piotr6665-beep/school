import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Pass {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  popular: boolean;
}

const PassesManager = () => {
  const [passes, setPasses] = useState<Pass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    fetchPasses();
  }, []);

  const fetchPasses = async () => {
    try {
      const { data, error } = await supabase
        .from('passes')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPasses(data || []);
    } catch (error) {
      console.error('Error fetching passes:', error);
      toast({
        title: t('admin.passes.error'),
        description: t('admin.passes.errorFetch'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (id: string, field: keyof Pass, value: string | boolean | string[]) => {
    setPasses(passes.map(pass => 
      pass.id === id ? { ...pass, [field]: value } : pass
    ));
  };

  const handleFeaturesChange = (id: string, featuresText: string) => {
    const featuresArray = featuresText.split('\n').filter(f => f.trim() !== '');
    handleFieldChange(id, 'features', featuresArray);
  };

  const handleSave = async (passId: string) => {
    setIsSaving(passId);
    try {
      const passToUpdate = passes.find(p => p.id === passId);
      if (!passToUpdate) return;

      const { error } = await supabase
        .from('passes')
        .update({
          name: passToUpdate.name,
          price: passToUpdate.price,
          description: passToUpdate.description,
          features: passToUpdate.features,
          popular: passToUpdate.popular
        })
        .eq('id', passId);

      if (error) throw error;

      toast({
        title: t('admin.passes.saved'),
        description: t('admin.passes.savedDesc'),
      });
    } catch (error) {
      console.error('Error updating pass:', error);
      toast({
        title: t('admin.passes.error'),
        description: t('admin.passes.errorSave'),
        variant: "destructive",
      });
    } finally {
      setIsSaving(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {passes.map((pass) => (
        <Card key={pass.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t('admin.passes.editPass')}</span>
              {pass.popular && (
                <span className="text-sm font-normal bg-primary/10 text-primary px-3 py-1 rounded-full">
                  {t('admin.passes.mostPopular')}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor={`name-${pass.id}`}>{t('admin.passes.passName')}</Label>
                <Input
                  id={`name-${pass.id}`}
                  value={pass.name}
                  onChange={(e) => handleFieldChange(pass.id, 'name', e.target.value)}
                  placeholder={t('admin.passes.passNamePlaceholder')}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor={`price-${pass.id}`}>{t('admin.passes.price')}</Label>
                <Input
                  id={`price-${pass.id}`}
                  value={pass.price}
                  onChange={(e) => handleFieldChange(pass.id, 'price', e.target.value)}
                  placeholder={t('admin.passes.pricePlaceholder')}
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <Label htmlFor={`description-${pass.id}`}>{t('admin.passes.description')}</Label>
              <Input
                id={`description-${pass.id}`}
                value={pass.description}
                onChange={(e) => handleFieldChange(pass.id, 'description', e.target.value)}
                placeholder={t('admin.passes.descriptionPlaceholder')}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor={`features-${pass.id}`}>{t('admin.passes.features')}</Label>
              <Textarea
                id={`features-${pass.id}`}
                value={pass.features.join('\n')}
                onChange={(e) => handleFeaturesChange(pass.id, e.target.value)}
                placeholder={t('admin.passes.featuresPlaceholder')}
                className="mt-2 min-h-[120px]"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id={`popular-${pass.id}`}
                checked={pass.popular}
                onCheckedChange={(checked) => handleFieldChange(pass.id, 'popular', checked)}
              />
              <Label htmlFor={`popular-${pass.id}`}>{t('admin.passes.markPopular')}</Label>
            </div>

            <Button 
              onClick={() => handleSave(pass.id)}
              disabled={isSaving === pass.id}
              className="w-full"
            >
              {isSaving === pass.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('admin.passes.saving')}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t('admin.passes.saveChanges')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PassesManager;
