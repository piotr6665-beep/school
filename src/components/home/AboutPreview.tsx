import { Button } from "@/components/ui/button";
import { ArrowRight, Heart, Shield, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const AboutPreview = () => {
  const { t } = useTranslation();

  const values = [
    {
      icon: Heart,
      titleKey: "home.aboutPreview.passion.title",
      descKey: "home.aboutPreview.passion.desc",
    },
    {
      icon: Shield,
      titleKey: "home.aboutPreview.safety.title",
      descKey: "home.aboutPreview.safety.desc",
    },
    {
      icon: Sparkles,
      titleKey: "home.aboutPreview.magic.title",
      descKey: "home.aboutPreview.magic.desc",
    },
  ];

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Creative background blob */}
      <div className="absolute top-0 right-0 w-96 h-96 creative-blob rounded-full opacity-60 -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-80 h-80 creative-blob rounded-full opacity-40 translate-y-1/2 -translate-x-1/2" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Asymmetric Image Collage */}
          <div className="relative">
            <div className="relative h-[500px]">
              {/* Main large image */}
              <div className="absolute top-0 left-0 w-3/4 h-3/4 rounded-2xl overflow-hidden shadow-elegant hover-lift">
                <img 
                  src="/gallery/silk-hands.jpg" 
                  alt="Aerial Paradise" 
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Floating smaller image */}
              <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-2xl overflow-hidden shadow-elegant hover-lift animate-float">
                <img 
                  src="/gallery/studio-group.jpg" 
                  alt="Aerial Paradise Studio" 
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Decorative element */}
              <div className="absolute -bottom-4 left-1/4 w-24 h-24 bg-gradient-primary rounded-full opacity-80 blur-sm" />
            </div>
          </div>

          {/* Right - Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <span className="text-primary font-medium tracking-wider uppercase text-sm">
                {t('home.aboutPreview.label')}
              </span>
              <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                <span className="text-gradient">{t('home.aboutPreview.titleHighlight')}</span>
                <br />
                {t('home.aboutPreview.titleRest')}
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {t('home.aboutPreview.description')}
              </p>
            </div>

            {/* Values Grid */}
            <div className="grid gap-4">
              {values.map((value, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-4 p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors animate-slide-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0">
                    <value.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{t(value.titleKey)}</h4>
                    <p className="text-sm text-muted-foreground">{t(value.descKey)}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link to="/o-nas">
              <Button size="lg" className="group mt-4">
                {t('home.aboutPreview.learnMore')}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutPreview;
