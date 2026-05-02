import { Facebook, Instagram, Mail, Phone, MapPin } from "lucide-react";
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-secondary/30 border-t border-border mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">{t('footer.contact')}</h3>
            <div className="space-y-3 text-muted-foreground">
              <a href="mailto:kontakt@aerialparadise.pl" className="flex items-center gap-2 hover:text-primary transition-colors">
                <Mail className="h-4 w-4" />
                <span>kontakt@aerialparadise.pl</span>
              </a>
              <a href="tel:+48123456789" className="flex items-center gap-2 hover:text-primary transition-colors">
                <Phone className="h-4 w-4" />
                <span>+48 123 456 789</span>
              </a>
            </div>
          </div>

          {/* Locations */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">{t('footer.locations')}</h3>
            <div className="space-y-3 text-muted-foreground">
              <a href="https://maps.app.goo.gl/Z3acLQvNUPgiayb29" target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 hover:text-primary transition-colors">
                <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                <span>ul. Kazimierza Funka 11, Wrocław</span>
              </a>
              <a href="https://www.google.com/maps/search/?api=1&query=ul.+Bałtycka+15,+Wrocław" target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 hover:text-primary transition-colors">
                <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                <span>ul. Bałtycka 15, Wrocław</span>
              </a>
            </div>
          </div>

          {/* Social Media */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">{t('footer.findUs')}</h3>
            <div className="flex gap-4">
              <a
                href="https://facebook.com/aerialparadise"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://instagram.com/aerialparadise"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} Aerial Paradise. {t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;