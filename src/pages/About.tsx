import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Target, Award } from "lucide-react";
import { useTranslation } from 'react-i18next';
import Instructors from "@/components/Instructors";
import FAQ from "@/components/FAQ";

const About = () => {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-12 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 text-primary text-center">
          {t('about.title')}
        </h1>
        
        <div className="prose prose-lg max-w-none mb-12">
          <p className="text-muted-foreground text-center text-xl mb-12">
            {t('about.description')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="text-center hover:shadow-elegant hover:scale-[1.04] hover:-translate-y-1 hover:z-10 transition-all duration-300 relative">
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <CardTitle>{t('about.mission.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t('about.mission.description')}
              </p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-elegant hover:scale-[1.04] hover:-translate-y-1 hover:z-10 transition-all duration-300 relative">
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="h-8 w-8 text-white" />
              </div>
              <CardTitle>{t('about.approach.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t('about.approach.description')}
              </p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-elegant hover:scale-[1.04] hover:-translate-y-1 hover:z-10 transition-all duration-300 relative">
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8 text-white" />
              </div>
              <CardTitle>{t('about.values.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t('about.values.description')}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gradient-hero border-none">
          <CardHeader>
            <CardTitle className="text-2xl text-center">{t('about.why.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-card p-6 rounded-lg">
              <h3 className="font-semibold text-lg mb-2 text-primary">{t('about.why.locations.title')}</h3>
              <p className="text-muted-foreground">
                {t('about.why.locations.description')}
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg">
              <h3 className="font-semibold text-lg mb-2 text-primary">{t('about.why.certified.title')}</h3>
              <p className="text-muted-foreground">
                {t('about.why.certified.description')}
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg">
              <h3 className="font-semibold text-lg mb-2 text-primary">{t('about.why.offer.title')}</h3>
              <p className="text-muted-foreground">
                {t('about.why.offer.description')}
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg">
              <h3 className="font-semibold text-lg mb-2 text-primary">{t('about.why.atmosphere.title')}</h3>
              <p className="text-muted-foreground">
                {t('about.why.atmosphere.description')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Instructors />
        <FAQ />
      </div>
    </div>
  );
};

export default About;