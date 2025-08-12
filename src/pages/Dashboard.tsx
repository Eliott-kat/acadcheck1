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
import { fileToText } from "@/lib/fileToText";
import { DocumentPreview } from "@/components/DocumentPreview";
import { getAllDocuments } from "@/lib/corpusDB";

const Dashboard = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [pasted, setPasted] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onFile = async (file?: File | null) => {
    if (!file) return;
    setSelectedFile(file);
    try {
      const content = await fileToText(file);
      setPasted(content);
      toast({ title: "Fichier importé", description: `Texte extrait de ${file.name}` });
    } catch (e) {
      console.error(e);
      toast({ title: "Format non supporté", description: "Importez un .pdf, .docx ou .txt.", variant: "destructive" });
    }
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

const onAnalyze = async (e: React.FormEvent) => {
  e.preventDefault();
  const text = pasted.trim();
  if (!text) {
    toast({ title: "Texte requis", description: "Collez un texte ou importez un .pdf, .docx ou .txt pour une analyse locale 100% hors ligne." });
    return;
  }
  const docs = await getAllDocuments();
  const report = analyzeText(text, { corpus: docs.map(d => ({ name: d.name, text: d.text })) });
  // Enregistrer un résumé de l'analyse pour l'historique (RLS: user_id = auth.uid())
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (uid) {
      await supabase.from('analyses').insert({
        user_id: uid,
        text_length: text.length,
        ai_score: Math.round(report.aiScore ?? 0),
        plagiarism_score: Math.round(report.plagiarism ?? 0),
        document_name: selectedFile?.name ?? null,
        language: 'fr',
        status: 'completed'
      });
    }
  } catch (err) {
    console.error('Erreur lors de la sauvegarde de l\'analyse', err);
  }
  navigate('/report', { state: { report: { ...report, copyleaks: { matches: 0 } }, text, file: selectedFile } });
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
              <Input type="file" accept=".pdf,.docx,.txt" aria-label={t('dashboard.upload')} onChange={(e) => e.target.files && onFile(e.target.files[0])} />
              <span className="text-muted-foreground text-sm">{t('dashboard.or')}</span>
              <Button type="submit" variant="hero">{t('dashboard.analyze')}</Button>
            </div>
            {selectedFile && (
              <div className="mt-2">
                <h3 className="text-sm font-medium mb-2">Aperçu du document</h3>
                <div className="border rounded-md bg-card overflow-hidden">
                  <DocumentPreview file={selectedFile} />
                </div>
              </div>
            )}
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
