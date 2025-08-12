import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive ? "bg-secondary text-foreground" : "text-foreground/80 hover:text-foreground"
  }`;

const Navbar = () => {
  const { t, lang, toggleLanguage } = useI18n();
  const [isAuthed, setIsAuthed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session);
    });
    supabase.auth.getSession().then(({ data: { session } }) => setIsAuthed(!!session));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="font-semibold text-lg tracking-tight">
            AcadCheck
          </Link>
          <div className="hidden md:flex items-center gap-1">
            <NavLink to="/dashboard" className={navLinkClass}>{t("nav.dashboard")}</NavLink>
            <NavLink to="/history" className={navLinkClass}>Historique</NavLink>
            <NavLink to="/admin" className={navLinkClass}>{t("nav.admin")}</NavLink>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAuthed ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleLogout}>{t('auth.logout') || 'Logout'}</Button>
            </>
          ) : (
            <>
              <NavLink to="/login">
                <Button variant="ghost" size="sm">{t("auth.login")}</Button>
              </NavLink>
              <NavLink to="/register">
                <Button variant="hero" size="sm">{t("auth.register")}</Button>
              </NavLink>
            </>
          )}
          <Button variant="outline" size="sm" aria-label="language" onClick={toggleLanguage}>
            {lang.toUpperCase()}
          </Button>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
