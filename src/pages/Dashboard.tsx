import { Helmet } from "react-helmet-async";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { analyzeText } from "@/lib/localDetector";
import { toast } from "@/components/ui/use-toast";

const Dashboard = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [pasted, setPasted] = useState("");

  const onFile = async (file?: File | null) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "txt") {
      toast({ title: "Format non supporté", description: "Veuillez importer un fichier .txt pour l'analyse locale." });
      return;
    }
    const content = await file.text();
    setPasted(content);
  };
  // Protect route: redirect to login if not authenticated
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate('/login');
    };
    check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate('/login');
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

const onAnalyze = (e: React.FormEvent) => {
  e.preventDefault();
  const text = pasted.trim();
  if (!text) {
    toast({ title: "Texte requis", description: "Collez un texte ou importez un .txt pour une analyse locale 100% hors ligne." });
    return;
  }
  const report = analyzeText(text);
  navigate('/report', { state: { report: { ...report, copyleaks: { matches: 0 } }, text } });
};

  return (
    <AppLayout>
      <Helmet>
        <title>AcadCheck | {t('nav.dashboard')}</title>
        <meta name="description" content="Upload and analyze documents" />
      </Helmet>
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <section className="p-6 rounded-lg border bg-card shadow-sm">
          <h1 className="text-2xl font-bold mb-1">{t('dashboard.title')}</h1>
          <p className="text-sm text-muted-foreground mb-4">{t('dashboard.subtitle')}</p>
          <form onSubmit={onAnalyze} className="space-y-4">
            <div className="flex items-center gap-2">
              <Input type="file" accept=".txt" aria-label={t('dashboard.upload')} onChange={(e) => e.target.files && onFile(e.target.files[0])} />
              <span className="text-muted-foreground text-sm">{t('dashboard.or')}</span>
              <Button type="submit" variant="hero">{t('dashboard.analyze')}</Button>
            </div>
            <Textarea value={pasted} onChange={e => setPasted(e.target.value)} rows={8} placeholder={t('dashboard.paste')} />
          </form>
        </section>
        <section className="p-6 rounded-lg border bg-card shadow-sm">
          <h2 className="font-semibold mb-2">Aide</h2>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>Les fichiers seront envoyés à une fonction Edge pour Copyleaks / GPTZero.</li>
            <li>Le texte collé déclenche une analyse locale 100% hors ligne.</li>
            <li>Historique et rôles à connecter via Supabase.</li>
          </ul>
        </section>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
