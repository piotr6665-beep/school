import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import logo from "@/assets/logo.jpg";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { t } = useTranslation();

  const links = [
    { to: "/", label: t('nav.home') },
    { to: "/o-nas", label: t('nav.about') },
    { to: "/harmonogram", label: t('nav.schedule') },
    { to: "/cennik", label: t('nav.pricing') },
    { to: "/galeria", label: t('nav.gallery') },
    { to: "/wydarzenia", label: t('nav.events') },
    { to: "/kontakt", label: t('nav.contact') },
  ];

  if (user) {
    links.push({ to: "/rezerwacje", label: t('nav.bookings') });
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20 gap-2">
          <Link to="/" className="flex items-center gap-3 group min-w-0">
            <img 
              src={logo} 
              alt="Aerial Paradise" 
              className="h-12 w-12 sm:h-14 sm:w-14 object-contain transition-transform group-hover:scale-105 flex-shrink-0"
            />
            <div className="hidden sm:block lg:block min-w-0">
              <span className="text-lg lg:text-xl font-bold text-primary truncate">Aerial Paradise</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {links.map((link) => (
              <Link key={link.to} to={link.to}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`transition-colors ${
                    isActive(link.to)
                      ? "bg-secondary text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground"
                      : "text-foreground hover:bg-secondary/60 hover:text-secondary-foreground"
                  }`}
                >
                  {link.label}
                </Button>
              </Link>
            ))}
            <LanguageSwitcher />
            {isAdmin && (
              <Link to="/admin">
                <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                  <Shield className="h-4 w-4 mr-2" />
                  {t('nav.adminPanel')}
                </Button>
              </Link>
            )}
            {user ? (
              <Link to="/profil">
                <Button variant="default" size="sm">
                  <User className="h-4 w-4 mr-2" />
                  {t('nav.profile')}
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button variant="default" size="sm">{t('auth.login.button')}</Button>
              </Link>
            )}
          </div>

          {/* Mobile/Tablet menu controls */}
          <div className="flex items-center gap-1 lg:hidden">
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Menu"
            >
              {isOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="lg:hidden py-4 border-t border-border">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsOpen(false)}
              >
                <Button
                  variant="ghost"
                  className={`w-full justify-start ${
                    isActive(link.to)
                      ? "bg-secondary text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground"
                      : "text-foreground hover:bg-secondary/60 hover:text-secondary-foreground"
                  }`}
                >
                  {link.label}
                </Button>
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin" onClick={() => setIsOpen(false)}>
                <Button variant="outline" className="w-full mt-2 border-primary text-primary">
                  <Shield className="h-4 w-4 mr-2" />
                  {t('nav.adminPanel')}
                </Button>
              </Link>
            )}
            {user ? (
              <Link to="/profil" onClick={() => setIsOpen(false)}>
                <Button variant="default" className="w-full mt-2">
                  <User className="h-4 w-4 mr-2" />
                  {t('nav.profile')}
                </Button>
              </Link>
            ) : (
              <Link to="/auth" onClick={() => setIsOpen(false)}>
                <Button variant="default" className="w-full mt-2">{t('auth.login.button')}</Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
