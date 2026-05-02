import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Star, TrendingUp, ArrowDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import heroImage from "@/assets/hero-aerial.jpg";
import HeroCarousel from "@/components/home/HeroCarousel";
import AboutPreview from "@/components/home/AboutPreview";
import UpcomingClasses from "@/components/home/UpcomingClasses";

const Home = () => {
  const { t } = useTranslation();

  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight - 100,
      behavior: 'smooth'
    });
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section - Full Screen with Carousel */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Carousel */}
        <HeroCarousel className="absolute inset-0" />
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/40 to-background/90 z-[1]" />
        
        {/* Decorative blobs */}
        <div className="absolute top-1/4 left-10 w-64 h-64 creative-blob rounded-full opacity-30 z-[2] animate-float" />
        <div className="absolute bottom-1/4 right-10 w-48 h-48 creative-blob rounded-full opacity-20 z-[2] animate-float" style={{ animationDelay: '1s' }} />
        
        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Animated badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 opacity-0 animate-fade-in">
              <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              <span className="text-white/90 text-sm font-medium">
                {t('home.hero.badge')}
              </span>
            </div>

            {/* Title with gradient */}
            <h1 className="text-6xl md:text-8xl font-bold text-white drop-shadow-lg opacity-0 animate-fade-in stagger-1">
              <span className="block">{t('home.hero.title')}</span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-white/95 max-w-2xl mx-auto drop-shadow-md opacity-0 animate-fade-in stagger-2">
              {t('home.hero.subtitle')}
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center opacity-0 animate-fade-in stagger-3">
              <Link to="/harmonogram">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-elegant text-lg px-8 py-6 group relative overflow-hidden">
                  <span className="relative z-10">{t('home.hero.scheduleButton')}</span>
                  <div className="absolute inset-0 shimmer-bg animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              </Link>
              <Link to="/o-nas">
                <Button size="lg" variant="outline" className="bg-white/10 text-white border-white/30 hover:bg-white hover:text-primary backdrop-blur-sm text-lg px-8 py-6">
                  {t('home.hero.aboutButton')}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <button 
          onClick={scrollToContent}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-white/80 hover:text-white transition-colors animate-bounce"
        >
          <ArrowDown className="h-8 w-8" />
        </button>
      </section>

      {/* About Preview Section */}
      <AboutPreview />

      {/* Upcoming Classes Section */}
      <UpcomingClasses />

      {/* Features Section */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <span className="text-primary font-medium tracking-wider uppercase text-sm">
            {t('home.features.label')}
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
            {t('home.features.title')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Users, titleKey: 'home.features.ageGroups.title', descKey: 'home.features.ageGroups.description' },
            { icon: Star, titleKey: 'home.features.instructors.title', descKey: 'home.features.instructors.description' },
            { icon: Calendar, titleKey: 'home.features.schedule.title', descKey: 'home.features.schedule.description' },
            { icon: TrendingUp, titleKey: 'home.features.skills.title', descKey: 'home.features.skills.description' },
          ].map((feature, index) => (
            <Card 
              key={index} 
              className="text-center hover-lift border-0 shadow-lg animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader>
                <div className="w-14 h-14 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3 hover:rotate-0 transition-transform">
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-xl">{t(feature.titleKey)}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {t(feature.descKey)}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden">
        {/* Background with asymmetric design */}
        <div className="absolute inset-0 bg-gradient-hero diagonal-section" />
        <div className="absolute top-0 right-0 w-1/2 h-full">
          <img 
            src="/gallery/trapeze-performance.jpg" 
            alt="Performance" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-background" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl">
            <span className="text-primary font-medium tracking-wider uppercase text-sm">
              {t('home.cta.label')}
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6 text-foreground">
              {t('home.cta.title')}
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              {t('home.cta.description')}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/cennik">
                <Button size="lg" className="shadow-elegant text-lg px-8">
                  {t('home.cta.button')}
                </Button>
              </Link>
              <Link to="/kontakt">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  {t('home.cta.contactButton')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
