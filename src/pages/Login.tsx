import { Helmet } from "react-helmet-async";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const Login = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Redirect if already logged in
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate('/dashboard');
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard');
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: t('auth.login'), description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: t('auth.login'), description: t('auth.success') });
    navigate('/dashboard');
  };

  return (
    <AppLayout>
      <Helmet>
        <title>AcadCheck | {t('auth.login')}</title>
        <meta name="description" content="Login to AcadCheck" />
      </Helmet>
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-6">{t('auth.login')}</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" variant="hero" className="w-full" disabled={loading}>
            {loading ? t('common.loading') : t('auth.login')}
          </Button>
        </form>
        <p className="text-sm text-muted-foreground mt-4">
          {t('auth.noAccount')} <Link to="/register" className="underline">{t('auth.register')}</Link>
        </p>
      </div>
    </AppLayout>
  );
};

export default Login;
