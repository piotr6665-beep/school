import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';

interface Pass {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  popular: boolean;
}

interface TranslatedPass extends Pass {
  translatedName?: string;
  translatedDescription?: string;
  translatedFeatures?: string[];
}

const Pricing = () => {
  const [pricingPlans, setPricingPlans] = useState<Pass[]>([]);
  const [translatedPlans, setTranslatedPlans] = useState<TranslatedPass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const { translateTexts, needsTranslation } = useAutoTranslate();

  useEffect(() => {
    fetchPasses();
  }, []);

  // Translate plans when language changes or plans are loaded
  useEffect(() => {
    const translatePlans = async () => {
      if (!pricingPlans.length) return;
      
      if (!needsTranslation) {
        setTranslatedPlans(pricingPlans.map(plan => ({
          ...plan,
          translatedName: plan.name,
          translatedDescription: plan.description,
          translatedFeatures: plan.features
        })));
        return;
      }

      setIsTranslating(true);
      try {
        // Collect all texts to translate
        const allTexts: string[] = [];
        pricingPlans.forEach(plan => {
          allTexts.push(plan.name);
          allTexts.push(plan.description);
          allTexts.push(...plan.features);
        });

        const translations = await translateTexts(allTexts);

        // Map translations back to plans
        let index = 0;
        const translated = pricingPlans.map(plan => {
          const translatedName = translations[index++];
          const translatedDescription = translations[index++];
          const translatedFeatures = plan.features.map(() => translations[index++]);
          
          return {
            ...plan,
            translatedName,
            translatedDescription,
            translatedFeatures
          };
        });

        setTranslatedPlans(translated);
      } catch (error) {
        console.error('Translation error:', error);
        // Fallback to original texts
        setTranslatedPlans(pricingPlans.map(plan => ({
          ...plan,
          translatedName: plan.name,
          translatedDescription: plan.description,
          translatedFeatures: plan.features
        })));
      } finally {
        setIsTranslating(false);
      }
    };

    translatePlans();
  }, [pricingPlans, needsTranslation, i18n.language]);

  const fetchPasses = async () => {
    try {
      const { data, error } = await supabase
        .from('passes')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPricingPlans(data || []);
    } catch (error) {
      console.error('Error fetching passes:', error);
      toast({
        title: t('pricing.error'),
        description: t('pricing.errorDesc'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const additionalOptions = [
    {
      name: t('pricing.additional.trial.name'),
      price: t('pricing.additional.trial.price'),
      description: t('pricing.additional.trial.description'),
    },
    {
      name: t('pricing.additional.semester.name'),
      price: t('pricing.additional.semester.price'),
      description: t('pricing.additional.semester.description'),
    },
    {
      name: t('pricing.additional.individual.name'),
      price: t('pricing.additional.individual.price'),
      description: t('pricing.additional.individual.description'),
    },
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayPlans = translatedPlans.length > 0 ? translatedPlans : pricingPlans;

  return (
    <div className="container mx-auto px-4 py-12 animate-fade-in">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-primary">
            {t('pricing.title')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('pricing.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {displayPlans.map((plan, index) => (
            <Card
              key={plan.id}
              className={`relative hover:shadow-elegant transition-all ${
                plan.popular ? "border-primary shadow-elegant scale-105" : ""
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary">
                  {t('pricing.popular')}
                </Badge>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-2xl mb-2">
                  {isTranslating ? (
                    <span className="opacity-50">{plan.name}</span>
                  ) : (
                    (plan as TranslatedPass).translatedName || plan.name
                  )}
                </CardTitle>
                <CardDescription>
                  {isTranslating ? (
                    <span className="opacity-50">{plan.description}</span>
                  ) : (
                    (plan as TranslatedPass).translatedDescription || plan.description
                  )}
                </CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-primary">{plan.price}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {((plan as TranslatedPass).translatedFeatures || plan.features).map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span className={`text-sm text-muted-foreground ${isTranslating ? 'opacity-50' : ''}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link to="/harmonogram">
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {t('pricing.viewSchedule')}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl text-center">{t('pricing.additional.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              {additionalOptions.map((option, index) => (
                <div
                  key={index}
                  className="p-6 rounded-lg bg-secondary/30 border border-border hover:bg-secondary/50 transition-colors"
                >
                  <h3 className="font-semibold text-lg mb-2">{option.name}</h3>
                  <p className="text-2xl font-bold text-primary mb-2">{option.price}</p>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-hero border-none">
          <CardHeader>
            <CardTitle className="text-2xl text-center">{t('pricing.discounts.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-card p-6 rounded-lg">
              <h3 className="font-semibold text-lg mb-2 text-primary">{t('pricing.discounts.family.title')}</h3>
              <p className="text-muted-foreground">
                {t('pricing.discounts.family.description')}
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg">
              <h3 className="font-semibold text-lg mb-2 text-primary">{t('pricing.discounts.referral.title')}</h3>
              <p className="text-muted-foreground">
                {t('pricing.discounts.referral.description')}
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg">
              <h3 className="font-semibold text-lg mb-2 text-primary">{t('pricing.discounts.student.title')}</h3>
              <p className="text-muted-foreground">
                {t('pricing.discounts.student.description')}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            {t('pricing.questions')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <a href="mailto:kontakt@aerialparadise.pl">
                {t('pricing.writeUs')}
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="tel:+48123456789">
                {t('pricing.callUs')}
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
