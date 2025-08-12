import { Helmet } from "react-helmet-async";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function analyzeMock(text: string) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const results = sentences.map((s, i) => ({
    sentence: s,
    plagiarism: Math.round(((i * 17) % 100)),
    ai: Math.round(((i * 29 + 13) % 100)),
    source: i % 3 === 0 ? `https://source.example.com/doc/${i}` : null,
  }));
  const plagiarism = Math.round(results.reduce((a, r) => a + r.plagiarism, 0) / (results.length || 1));
  const aiScore = Math.round(results.reduce((a, r) => a + r.ai, 0) / (results.length || 1));
  return { sentences: results, plagiarism, aiScore, copyleaks: { matches: results.filter(r => r.source).length } };
}

const Dashboard = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [pasted, setPasted] = useState("");

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
    const demoText = pasted.trim() || "This is a demo sentence. Another sentence that might be flagged. AI-like phrasing occurs here.";
    const report = analyzeMock(demoText);
    navigate('/report', { state: { report, text: demoText } });
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
              <Input type="file" accept=".pdf,.docx,.txt" aria-label={t('dashboard.upload')} />
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
            <li>Le texte collé permet un essai rapide (simulation locale).</li>
            <li>Historique et rôles à connecter via Supabase.</li>
          </ul>
        </section>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
