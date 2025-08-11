import { Helmet } from "react-helmet-async";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";

const Register = () => {
  const { t } = useI18n();
  const { toast } = useToast();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Auth", description: "Inscription à implémenter (Supabase)." });
  };

  return (
    <AppLayout>
      <Helmet>
        <title>AcadCheck | {t('auth.register')}</title>
        <meta name="description" content="Register to AcadCheck" />
      </Helmet>
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-6">{t('auth.register')}</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input type="text" placeholder="Nom" required />
          <Input type="email" placeholder="Email" required />
          <Input type="password" placeholder="••••••••" required />
          <Button type="submit" variant="hero" className="w-full">{t('auth.register')}</Button>
        </form>
      </div>
    </AppLayout>
  );
};

export default Register;
